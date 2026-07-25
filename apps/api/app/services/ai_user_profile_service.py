"""Shared AI User Profile built from every confirmed-available signal.

This is the single source of truth about a user for Gemini.  Every
recommendation engine consumes one profile instead of independently
querying and assembling context.  Only signals confirmed by the Step 0
audit are used.  Gender is NOT inferred (no field in users table).
The fashion_profile table is intentionally ignored (never populated by
any service as of the audit).
"""
from __future__ import annotations

import logging
from collections import Counter, defaultdict
from typing import Any

from sqlalchemy import Engine, text

logger = logging.getLogger(__name__)

# Categories that, when absent from the wardrobe, are flagged as gaps.
# Derived from real catalog categories, NOT invented.
_WARDROBE_ESSENTIAL_CATEGORIES = {
    "tops": ("shirt", "t-shirt", "top", "polo", "blouse", "kurta", "tunic"),
    "bottoms": ("jeans", "trousers", "pants", "skirt", "leggings", "shorts", "chinos"),
    "footwear": ("footwear", "shoes", "sneakers", "boots", "sandals", "flats", "heels"),
    "outerwear": ("jacket", "blazer", "coat", "hoodie", "sweater", "cardigan", "shrug"),
    "ethnic": ("kurta", "saree", "lehenga", "ethnic", "sherwani", "salwar"),
    "accessories": ("accessories", "bag", "belt", "watch", "sunglasses", "wallet"),
}

_STYLE_CLUSTER_MAP: dict[tuple[str, ...], str] = {
    ("ethnic", "kurta", "saree", "traditional"): "Ethnic & Traditional",
    ("sports", "activewear", "gym", "athletic"): "Active & Sporty",
    ("formal", "blazer", "shirt", "trouser"): "Smart Formal",
    ("casual", "denim", "t-shirt", "sneakers"): "Casual Everyday",
    ("minimal", "neutral", "clean"): "Minimalist Neutral",
    ("party", "premium", "western", "dress"): "Contemporary Western",
}


def _infer_style_cluster(styles: list[str], categories: list[str]) -> str:
    """Infer a named style cluster from dominant style/category signals."""
    combined = " ".join(s.lower() for s in styles + categories)
    for keywords, label in _STYLE_CLUSTER_MAP.items():
        if any(kw in combined for kw in keywords):
            return label
    return "Eclectic Mix"


def _budget_band(minimum: float | None, maximum: float | None) -> str:
    """Return a human-readable budget band."""
    if minimum is None and maximum is None:
        return "Flexible budget"
    lo = int(minimum or 0)
    hi = int(maximum or lo * 2 or 5000)
    return f"₹{lo:,}–₹{hi:,}"


class AiUserProfileService:
    """Builds a compact user profile suitable for inclusion in Gemini prompts.

    The result is a plain dict — no ORM objects, no SQLAlchemy rows.
    """

    def __init__(self, engine: Engine) -> None:
        self._engine = engine

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def build(self, user_id: str) -> dict[str, Any]:
        """Return a compact AI user profile for *user_id*.

        Never raises — all sub-queries are wrapped individually so a
        partial failure degrades gracefully rather than blocking the
        whole recommendation request.
        """
        user = self._user(user_id)
        wardrobe = self._wardrobe(user_id)
        dna = self._fashion_dna(user_id)
        analytics = self._analytics(user_id)

        preferred_styles = self._list_field(user, "preferred_style")
        preferred_colors = self._list_field(user, "preferred_colors")
        preferred_brands = self._list_field(user, "favorite_brands")

        # Top affinity values from fashion_affinity_scores
        dna_styles = [item["value"] for item in dna.get("styleAffinity", [])[:3]]
        dna_brands = [item["value"] for item in dna.get("brandAffinity", [])[:3]]
        dna_colors = [item["value"] for item in dna.get("colorAffinity", [])[:3]]
        dna_categories = [item["value"] for item in dna.get("categoryAffinity", [])[:3]]

        all_styles = list(dict.fromkeys(preferred_styles + dna_styles))
        all_brands = list(dict.fromkeys(preferred_brands + dna_brands))
        all_colors = list(dict.fromkeys(preferred_colors + dna_colors))

        wardrobe_composition = self._wardrobe_composition(wardrobe)
        wardrobe_gaps = self._wardrobe_gaps(wardrobe_composition)
        style_cluster = _infer_style_cluster(all_styles, dna_categories)

        return {
            # Identity
            "city": user.get("city", ""),
            # Style
            "preferred_styles": all_styles[:5],
            "preferred_colors": all_colors[:5],
            "preferred_brands": all_brands[:5],
            "style_cluster": style_cluster,
            # Budget
            "budget_band": _budget_band(user.get("budget_min"), user.get("budget_max")),
            "budget_min": user.get("budget_min"),
            "budget_max": user.get("budget_max"),
            # Wardrobe
            "wardrobe_composition": wardrobe_composition,  # {"Jeans": 3, "Shirt": 2, ...}
            "wardrobe_gaps": wardrobe_gaps,                # ["Footwear", "Formal Trousers"]
            "wardrobe_size": sum(wardrobe_composition.values()),
            # Fashion DNA meta
            "trend_score": round(float(dna.get("trendScore", 0)), 1),
            "experimentation_score": round(float(dna.get("experimentationScore", 0)), 1),
            "preferred_season": dna.get("preferredSeason"),
            # Shopping analytics
            "shopping_style": analytics.get("shoppingStyle", "Casual Shopper"),
            "top_browsed_categories": [c["name"] for c in analytics.get("topCategories", [])[:3]],
            # Gender: explicitly absent — not in schema
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _user(self, user_id: str) -> dict[str, Any]:
        try:
            with self._engine.connect() as conn:
                row = conn.execute(
                    text(
                        "SELECT full_name, city, state, budget_min, budget_max, "
                        "preferred_style, preferred_colors, favorite_brands "
                        "FROM public.users WHERE id = :id LIMIT 1"
                    ),
                    {"id": user_id},
                ).mappings().first()
            return dict(row) if row else {}
        except Exception:
            logger.exception("AiUserProfile: failed to load user row for %s", user_id)
            return {}

    def _wardrobe(self, user_id: str) -> list[dict[str, Any]]:
        try:
            with self._engine.connect() as conn:
                rows = conn.execute(
                    text(
                        "SELECT product_name, category, color, brand "
                        "FROM public.wardrobe WHERE user_id = :uid"
                    ),
                    {"uid": user_id},
                ).mappings().all()
            return [dict(r) for r in rows]
        except Exception:
            logger.exception("AiUserProfile: failed to load wardrobe for %s", user_id)
            return []

    def _fashion_dna(self, user_id: str) -> dict[str, Any]:
        try:
            from app.services.fashion_dna_service import FashionDnaService
            return FashionDnaService().get(self._engine, user_id)
        except Exception:
            logger.exception("AiUserProfile: failed to load fashion DNA for %s", user_id)
            return {}

    def _analytics(self, user_id: str) -> dict[str, Any]:
        try:
            from app.services.analytics_service import AnalyticsService
            return AnalyticsService(self._engine).summary(user_id)
        except Exception:
            logger.exception("AiUserProfile: failed to load analytics for %s", user_id)
            return {}

    @staticmethod
    def _list_field(user: dict[str, Any], key: str) -> list[str]:
        """Parse a comma-separated string or list field into a clean list."""
        value = user.get(key) or ""
        if isinstance(value, list):
            return [str(v).strip() for v in value if v]
        return [v.strip() for v in str(value).split(",") if v.strip()]

    @staticmethod
    def _wardrobe_composition(wardrobe: list[dict[str, Any]]) -> dict[str, int]:
        """Count wardrobe items per normalised category."""
        counter: Counter[str] = Counter()
        for item in wardrobe:
            raw = str(item.get("category") or item.get("product_name") or "Other").strip()
            # Title-case for readability
            label = raw.title() if raw else "Other"
            counter[label] += 1
        return dict(counter.most_common(15))

    @staticmethod
    def _wardrobe_gaps(composition: dict[str, int]) -> list[str]:
        """Identify essential category groups that are absent or very sparse."""
        owned_lower = {cat.lower() for cat in composition}
        gaps: list[str] = []
        for group_label, keywords in _WARDROBE_ESSENTIAL_CATEGORIES.items():
            has = any(kw in cat for cat in owned_lower for kw in keywords)
            if not has:
                gaps.append(group_label.replace("_", " ").title())
        return gaps
