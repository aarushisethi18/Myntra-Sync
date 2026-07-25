"""AI Context Builder — assembles a compact, structured payload for Gemini.

Every recommendation engine calls this once.  It pulls together:
  • AI User Profile (from AiUserProfileService)
  • Wishlist intelligence (from WishlistIntelligenceService)
  • Order history intelligence (from OrderHistoryService)
  • Shopping analytics summary (from AnalyticsService)
  • Live context (weather, festival, calendar)
  • Compressed candidate product list

Raw DB rows are never forwarded to Gemini.  Only clean, human-readable
summaries that fit comfortably inside a prompt are included.
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import Engine

logger = logging.getLogger(__name__)

# Fields from the product dict that are sent to Gemini.
# We exclude image URLs, raw SQL scores, etc.
_CANDIDATE_FIELDS = (
    "id", "title", "name", "brand", "category", "style", "color",
    "price", "occasions", "fabrics", "weatherSuitability",
    "festivalSuitability", "trendTags", "recommendationScore",
    "recommendationReasons",
)

# Maximum number of candidates forwarded to Gemini for top-10 performance.
CANDIDATE_CAP = 10


class AiContextBuilder:
    """Assembles the structured payload that is sent to Gemini for reranking."""

    def __init__(self, engine: Engine) -> None:
        self._engine = engine

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def build(
        self,
        engine_name: str,
        user_id: str,
        candidates: list[dict[str, Any]],
        live_context: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Return a compact payload suitable for inclusion in a Gemini prompt.

        *candidates* should already be sliced to ≤ CANDIDATE_CAP items by the
        caller.  This method compresses each product to only the fields Gemini
        needs and attaches all user/context signals.
        """
        context = live_context or {}

        user_profile = self._safe("user profile", lambda: self._user_profile(user_id))
        wishlist_intel = self._safe("wishlist intel", lambda: self._wishlist(user_id))
        order_intel = self._safe("order intel", lambda: self._orders(user_id))
        analytics = self._safe("analytics", lambda: self._analytics(user_id))

        compressed = [self._compress_product(p) for p in candidates[:CANDIDATE_CAP]]

        return {
            "engine": engine_name,
            "candidate_ids": [p["id"] for p in candidates[:CANDIDATE_CAP]],
            "user_profile": user_profile,
            "context": self._build_context_block(context),
            "intelligence": {
                "wishlist": self._summarise_wishlist(wishlist_intel),
                "order_history": self._summarise_orders(order_intel),
                "shopping_style": analytics.get("shoppingStyle", ""),
                "top_browsed_categories": [
                    c["name"] for c in analytics.get("topCategories", [])[:3]
                ],
            },
            "candidates": compressed,
        }

    # ------------------------------------------------------------------
    # Signal loaders — each fails safely
    # ------------------------------------------------------------------

    def _user_profile(self, user_id: str) -> dict[str, Any]:
        from app.services.ai_user_profile_service import AiUserProfileService
        return AiUserProfileService(self._engine).build(user_id)

    def _wishlist(self, user_id: str) -> dict[str, Any]:
        from app.repositories.wishlist_repository import WishlistRepository
        from app.services.wishlist_intelligence_service import WishlistIntelligenceService
        return WishlistIntelligenceService(WishlistRepository(self._engine)).intelligence(user_id)

    def _orders(self, user_id: str) -> dict[str, Any]:
        from app.repositories.order_history_repository import OrderHistoryRepository
        from app.services.order_history_service import OrderHistoryService
        return OrderHistoryService(OrderHistoryRepository(self._engine)).intelligence(user_id, None)

    def _analytics(self, user_id: str) -> dict[str, Any]:
        from app.services.analytics_service import AnalyticsService
        return AnalyticsService(self._engine).summary(user_id)

    @staticmethod
    def _safe(label: str, fn: Any) -> dict[str, Any]:
        try:
            result = fn()
            return result if isinstance(result, dict) else {}
        except Exception:
            logger.exception("AiContextBuilder: %s signal failed", label)
            return {}

    # ------------------------------------------------------------------
    # Context block assembly
    # ------------------------------------------------------------------

    @staticmethod
    def _build_context_block(context: dict[str, Any]) -> dict[str, Any]:
        weather = context.get("weather") or {}
        festival = context.get("festival") or {}
        calendar = context.get("calendar") or {}
        time_data = context.get("time") or {}
        event = next(iter(calendar.get("events") or []), {})

        return {
            "weather_condition": weather.get("condition", ""),
            "temperature_c": weather.get("temperature"),
            "humidity": weather.get("humidity"),
            "season": time_data.get("season", ""),
            "city": (context.get("location") or {}).get("city", ""),
            "festival_name": festival.get("name", ""),
            "festival_days_remaining": festival.get("daysRemaining"),
            "calendar_event_title": event.get("title", ""),
            "calendar_event_type": event.get("type", ""),
        }

    # ------------------------------------------------------------------
    # Intelligence summarisers — keep them brief for prompt efficiency
    # ------------------------------------------------------------------

    @staticmethod
    def _summarise_wishlist(intel: dict[str, Any]) -> dict[str, Any]:
        if intel.get("status") != "ok":
            return {"status": "empty"}
        return {
            "status": "ok",
            "persona": intel.get("wishlistPersona", ""),
            "size": intel.get("wishlistSize", 0),
            "top_brands": [b["brand"] for b in intel.get("favoriteBrands", [])[:3]],
            "top_categories": [c["category"] for c in intel.get("favoriteCategories", [])[:3]],
            "top_styles": intel.get("favoriteStyles", [])[:3],
            "top_colors": intel.get("favoriteColors", [])[:3],
            "budget_min": (intel.get("preferredBudget") or {}).get("min"),
            "budget_max": (intel.get("preferredBudget") or {}).get("max"),
        }

    @staticmethod
    def _summarise_orders(intel: dict[str, Any]) -> dict[str, Any]:
        if intel.get("status") != "ok":
            return {"status": "insufficient_data"}
        return {
            "status": "ok",
            "persona": intel.get("shoppingPersona", ""),
            "top_brands": [b["brand"] for b in intel.get("favoriteBrands", [])[:3]],
            "top_categories": [c["category"] for c in intel.get("favoriteCategories", [])[:3]],
            "avg_spend": intel.get("averageSpend"),
            "budget_min": (intel.get("preferredBudget") or {}).get("min"),
            "budget_max": (intel.get("preferredBudget") or {}).get("max"),
            "return_rate": intel.get("returnRate"),
        }

    # ------------------------------------------------------------------
    # Product compression
    # ------------------------------------------------------------------

    @staticmethod
    def _compress_product(product: dict[str, Any]) -> dict[str, Any]:
        """Strip a product dict down to only what Gemini needs."""
        compressed: dict[str, Any] = {}
        for field in _CANDIDATE_FIELDS:
            val = product.get(field)
            if val is not None:
                compressed[field] = val
        # Normalise: Gemini gets 'name' even if stored as 'title'
        if "name" not in compressed and "title" in compressed:
            compressed["name"] = compressed.pop("title")
        elif "title" in compressed:
            compressed.pop("title", None)
        # Round score for readability
        if "recommendationScore" in compressed:
            compressed["deterministic_score"] = round(float(compressed.pop("recommendationScore", 0)), 4)
        return compressed
