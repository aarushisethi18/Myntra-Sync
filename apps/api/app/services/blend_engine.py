"""AI-powered Blend engine — uses real behavioral, wishlist, and catalog signals."""
from __future__ import annotations

import random
from collections import Counter
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text

from app.services.analytics_service import AnalyticsService


# ─── Identity name generation ────────────────────────────────────────────────
# Deterministic mapping: (top shared style, top shared color) → Blend name.
_BLEND_NAMES: dict[tuple[str, str], str] = {
    ("casual", "black"): "Quiet Rebels",
    ("casual", "white"): "Clean Slate Duo",
    ("casual", "blue"): "Cool Minimalists",
    ("casual", "beige"): "Off-Duty Aesthetes",
    ("casual", "brown"): "Earthy Explorers",
    ("festive", "pink"): "Celebration Souls",
    ("festive", "red"): "Grand Entrance",
    ("festive", "gold"): "Golden Chapter",
    ("formal", "black"): "Power Dressers",
    ("formal", "white"): "Crisp Romantics",
    ("formal", "blue"): "Boardroom Icons",
    ("sports", "black"): "Peak Performers",
    ("sports", "white"): "Fresh Starters",
    ("minimal", "white"): "Soft Modernists",
    ("minimal", "beige"): "Understated Duo",
    ("party", "black"): "Night Signatures",
    ("party", "pink"): "Neon Dreamers",
    ("ethnic", "pink"): "Heritage Bloom",
    ("ethnic", "gold"): "Cultural Icons",
}
_BLEND_NAME_FALLBACKS = [
    "Sync + Style", "The Shared Edit", "Mutual Muses",
    "Style Frequency", "Parallel Wardrobes", "Fashion Soulmates",
]
_BLEND_DESC_TEMPLATES = [
    "Your combined wardrobe signals land somewhere between {style1} and {style2} — a frequency only you two create.",
    "Together, you orbit {color} tones and {style1} silhouettes. This is your shared fashion story.",
    "Two distinct wardrobes, one unmistakable aesthetic: {style1} energy with a {color} palette.",
]

# Genuine fashion style descriptors — anything NOT in this set is an occasion/context/weather label.
_STYLE_ALLOWLIST: set[str] = {
    "casual", "formal", "ethnic", "festive", "party", "minimal", "minimalist",
    "sports", "athleisure", "western", "indo-western", "boho", "bohemian",
    "streetwear", "street", "vintage", "retro", "preppy", "classic", "elegant",
    "chic", "edgy", "smart casual", "business casual", "resort", "beach",
    "activewear", "loungewear", "workwear", "office", "evening", "cocktail",
    "bridal", "fusion", "contemporary", "traditional", "relaxed", "laid-back",
    "monochrome", "printed", "floral", "abstract", "geometric", "solid",
    "denim", "linen", "silk", "velvet", "cotton",
}


class BlendEngine:
    """Builds intelligent Blend data from real user behavioral signals."""

    def __init__(self, engine: Any) -> None:
        self.engine = engine

    # ─── Public API ──────────────────────────────────────────────────────────

    def generate(
        self,
        session_id: str,
        first_id: str,
        second_id: str,
        controls: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        if self.engine is None:
            raise ValueError("Blend requires a configured data source.")

        a, b = self._profile(first_id), self._profile(second_id)
        metrics = self._metrics(a, b)
        score = round(
            sum(item["value"] * item["weight"] for item in metrics)
            / sum(item["weight"] for item in metrics)
        )
        shared_styles = self._shared(a["styles"], b["styles"]) or self._top(a["styles"] + b["styles"], 3)
        shared_colors = self._shared(a["colors"], b["colors"]) or self._top(a["colors"] + b["colors"], 5)
        occasion = (controls or {}).get("occasion") or self._occasion(a, b)
        weather = self._weather(a, b)

        blend_name, blend_desc = self._blend_identity(shared_styles, shared_colors, a, b)
        why_you_match = self._why_you_match(a, b, metrics, shared_styles, shared_colors)
        outfits = self._outfits(a, b, occasion, weather, score, session_id)
        coordinate_pids = [str(o["id"]) for o in outfits if o.get("id")]
        shared_wishlist = self._shared_wishlist(a, b, score, session_id, coordinate_pids)

        # Persist name + description + cached data to session
        self._cache_result(session_id, blend_name, blend_desc, score)

        return {
            "sessionId": session_id,
            "score": score,
            "blendName": blend_name,
            "blendDescription": blend_desc,
            "people": [self._person(a), self._person(b)],
            "breakdown": [{"name": x["name"], "value": round(x["value"]), "color": x["color"]} for x in metrics],
            "reasons": self._reasons(a, b, metrics),
            "whyYouMatch": why_you_match,
            "styleDna": self._dna(a) + self._dna(b),
            "sharedDna": [{"name": name.title(), "confidence": min(98, 65 + score // 3)} for name in shared_styles[:3]],
            "palette": [{"name": color.title(), "hex": self._color_hex(color)} for color in shared_colors[:5]],
            "moodboard": {
                "keywords": [
                    s.title() for s in (shared_styles[:3])
                    if any(allowed in s.lower() for allowed in _STYLE_ALLOWLIST)
                ],
                "visualStyle": " · ".join(x.title() for x in shared_styles[:2]) or "Personal style",
                "images": self._moodboard_images(a, b, shared_styles, shared_colors, shared_wishlist),
                "aestheticDescription": self._aesthetic_description(shared_styles, shared_colors, a, b),
                "styleSignals": self._style_signals(a, b, metrics, shared_styles, shared_colors),
                "sharedBrands": self._shared_brand_names(a, b),
            },
            "outfits": outfits,
            "insights": self._insights(a, b, metrics),
            "sharedWishlist": shared_wishlist,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }

    def get_twin_looks(self, session_id: str, outfit_key: str, first_id: str, second_id: str) -> dict[str, Any]:
        """Generate two complementary looks for the same outfit key."""
        a, b = self._profile(first_id), self._profile(second_id)
        shared_styles = self._shared(a["styles"], b["styles"]) or self._top(a["styles"] + b["styles"], 3)
        shared_colors = self._shared(a["colors"], b["colors"]) or self._top(a["colors"] + b["colors"], 4)
        catalog = self._fetch_catalog_for_twin(shared_styles, shared_colors)

        # Split catalog into two complementary looks
        mid = max(1, len(catalog) // 2)
        look_a = catalog[:mid]
        look_b = catalog[mid:mid * 2] or catalog[:mid]

        return {
            "outfitKey": outfit_key,
            "lookA": {
                "owner": a["name"],
                "pieces": [self._catalog_item(p) for p in look_a[:4]],
                "vibe": f"{a['name']}'s take",
            },
            "lookB": {
                "owner": b["name"],
                "pieces": [self._catalog_item(p) for p in look_b[:4]],
                "vibe": f"{b['name']}'s take",
            },
        }

    # ─── Profile building ────────────────────────────────────────────────────

    def _profile(self, user_id: str) -> dict[str, Any]:
        with self.engine.connect() as conn:
            user = conn.execute(
                text("SELECT id, full_name, preferred_style, preferred_colors, favorite_brands, budget_min, budget_max FROM users WHERE id = :id"),
                {"id": user_id},
            ).mappings().first()
            if not user:
                raise ValueError("A Blend member no longer has an available context.")

            wardrobe = conn.execute(
                text("SELECT product_name, category, color, brand FROM wardrobe WHERE user_id = :id"),
                {"id": user_id},
            ).mappings().all()

            wishlist = conn.execute(
                text("""
                    SELECT p.id AS product_id, p.name, p.category, p.color, p.brand,
                           p.style, p.price, p.image_url
                    FROM wishlist w JOIN products p ON p.id = w.product_id
                    WHERE w.user_id = :id
                """),
                {"id": user_id},
            ).mappings().all()

            orders = conn.execute(
                text("""
                    SELECT p.name, p.category, p.color, p.brand, p.style, p.price
                    FROM orders o JOIN products p ON p.id = o.product_id
                    WHERE o.user_id = :id
                """),
                {"id": user_id},
            ).mappings().all()

            bag = conn.execute(
                text("""
                    SELECT p.name, p.category, p.color, p.brand, p.style, p.price
                    FROM bag b JOIN products p ON p.id = b.product_id
                    WHERE b.user_id = :id
                """),
                {"id": user_id},
            ).mappings().all()

            weather = conn.execute(
                text("""
                    SELECT wc.temperature, wc.condition
                    FROM weather_context wc JOIN users u ON u.city = wc.city
                    WHERE u.id = :id ORDER BY wc.forecast_date DESC LIMIT 1
                """),
                {"id": user_id},
            ).mappings().first()

            # Behavioral signals: peak hour and wishlist product_ids
            peak_hour = conn.execute(
                text("""
                    SELECT EXTRACT(HOUR FROM created_at)::integer AS hour
                    FROM behavior_events WHERE user_id = :id
                    GROUP BY hour ORDER BY COUNT(*) DESC LIMIT 1
                """),
                {"id": user_id},
            ).scalar()

            wishlist_ids = {str(row["product_id"]) for row in wishlist if row.get("product_id")}

        try:
            analytics = AnalyticsService(self.engine).summary(user_id)
        except Exception:
            analytics = {"topCategories": [], "favoriteBrands": [], "shoppingStyle": "Casual Shopper", "peakShoppingHour": None}

        items = list(wardrobe) + list(wishlist) + list(orders)
        values = lambda key: [str(row[key]).lower() for row in items if row.get(key)]

        # Collect raw styles and filter to genuine fashion descriptors only
        raw_styles = self._values(user.get("preferred_style")) + values("style")
        clean_styles = [
            s for s in raw_styles
            if any(allowed in s for allowed in _STYLE_ALLOWLIST)
        ] or raw_styles  # fallback: use raw if nothing matches allowlist

        return {
            "id": str(user["id"]),
            "name": user["full_name"] or "Style lover",
            "styles": clean_styles,
            "colors": self._values(user.get("preferred_colors")) + values("color"),
            "brands": self._values(user.get("favorite_brands")) + values("brand"),
            "categories": values("category") + [str(item["name"]).lower() for item in analytics["topCategories"]],
            "analytics": analytics,
            "peakHour": peak_hour,
            "budget": ((user["budget_min"] or 0) + (user["budget_max"] or 0)) / 2 or self._average(items, "price"),
            "products": list(wishlist),
            "bagItems": list(bag),
            "wishlistIds": wishlist_ids,
            "weather": dict(weather or {}),
            "wishlistCount": len(list(wishlist)),
            "orderCount": len(list(orders)),
        }

    # ─── Blend Identity ──────────────────────────────────────────────────────

    def _aesthetic_description(self, shared_styles: list[str], shared_colors: list[str], a: dict, b: dict) -> str:
        """Generate a 1-sentence AI narrative describing the shared aesthetic."""
        _AESTHETIC_TEMPLATES = [
            "You both naturally gravitate toward {style1} silhouettes, {color} palettes and effortless everyday elegance.",
            "A shared love for {style1} dressing and {color} hues makes your combined wardrobe feel beautifully cohesive.",
            "Between the two of you, {style1} shapes and {color} tones tell a quiet, confident fashion story.",
            "Your wardrobes speak the same language — {style1} sensibilities, {color} shades, and an instinct for understated beauty.",
            "Together you lean toward {style1} aesthetics, anchored in {color} tones and a sense of refined simplicity.",
        ]
        style1 = shared_styles[0].lower() if shared_styles else "contemporary"
        style2 = shared_styles[1].lower() if len(shared_styles) > 1 else "everyday"
        color  = shared_colors[0].lower() if shared_colors else "neutral"
        import random  # noqa: PLC0415
        template = random.choice(_AESTHETIC_TEMPLATES)  # noqa: S311
        return template.format(style1=style1, style2=style2, color=color)

    def _moodboard_images(self, a: dict, b: dict, shared_styles: list[str], shared_colors: list[str], shared_wishlist: list[dict]) -> list[str]:
        """Collect up to 5 real catalog image URLs for the aesthetic collage."""
        images: list[str] = []

        # Priority 1: products from both users' wishlists that have images
        shared_product_ids = a["wishlistIds"] & b["wishlistIds"]
        for p in a["products"] + b["products"]:
            if str(p.get("product_id", "")) in shared_product_ids and p.get("image_url"):
                url = str(p["image_url"])
                if url not in images:
                    images.append(url)
            if len(images) >= 5:
                break

        # Priority 2: shared wishlist items already computed
        if len(images) < 5:
            for item in shared_wishlist:
                if item.get("image") and item["image"] not in images:
                    images.append(item["image"])
                if len(images) >= 5:
                    break

        # Priority 3 & 4: fetch from catalog matching shared styles/colors
        if len(images) < 5:
            try:
                style_filter = shared_styles[0] if shared_styles else None
                color_filter = shared_colors[0] if shared_colors else None
                with self.engine.connect() as conn:
                    params: dict[str, Any] = {}
                    filters: list[str] = ["image_url IS NOT NULL", "image_url != ''"]
                    if style_filter:
                        filters.append("style ILIKE :style")
                        params["style"] = f"%{style_filter}%"
                    if color_filter:
                        filters.append("color ILIKE :color")
                        params["color"] = f"%{color_filter}%"
                    where = " WHERE " + " AND ".join(filters)
                    rows = conn.execute(
                        text(f"SELECT image_url FROM products{where} ORDER BY rating DESC NULLS LAST LIMIT 10"),
                        params,
                    ).all()
                    for row in rows:
                        url = str(row[0] or "")
                        if url and url not in images:
                            images.append(url)
                        if len(images) >= 5:
                            break
            except Exception:
                pass

        # Final fallback: any catalog images at all
        if len(images) < 2:
            try:
                with self.engine.connect() as conn:
                    rows = conn.execute(
                        text("SELECT image_url FROM products WHERE image_url IS NOT NULL AND image_url != '' ORDER BY rating DESC NULLS LAST LIMIT 5"),
                    ).all()
                    for row in rows:
                        url = str(row[0] or "")
                        if url and url not in images:
                            images.append(url)
                        if len(images) >= 5:
                            break
            except Exception:
                pass

        return images[:5]

    def _shared_brand_names(self, a: dict, b: dict) -> list[str]:
        """Return up to 4 overlapping brands; empty list if fewer than 2."""
        shared = self._shared(a["brands"], b["brands"])[:4]
        return [b.title() for b in shared] if len(shared) >= 2 else []

    def _style_signals(self, a: dict, b: dict, metrics: list[dict], shared_styles: list[str], shared_colors: list[str]) -> list[str]:
        """Generate 2–3 premium behavioral insight strings."""
        signals: list[str] = []

        # Style frequency insight
        if shared_styles:
            signals.append(f"Both of you save {shared_styles[0]} outfits most often")

        # Color dominance
        if shared_colors:
            signals.append(f"{shared_colors[0].title()} shades dominate both your wardrobes")

        # Budget harmony
        budget_metric = next((m for m in metrics if "budget" in m["name"].lower()), None)
        if budget_metric:
            v = round(budget_metric["value"])
            if v >= 75:
                signals.append("Similar shopping budget — co-shopping is effortless")
            else:
                signals.append("Complementary budgets — great for finding pieces at every price")

        # Category signal
        cats_a = {c["name"].lower() for c in a["analytics"].get("topCategories", [])}
        cats_b = {c["name"].lower() for c in b["analytics"].get("topCategories", [])}
        shared_cats = cats_a & cats_b
        if shared_cats and len(signals) < 3:
            cat = next(iter(shared_cats)).title()
            signals.append(f"You both browse {cat} the most — it’s your shared territory")

        return signals[:3]

    def _blend_identity(
        self,
        shared_styles: list[str],
        shared_colors: list[str],
        a: dict,
        b: dict,
    ) -> tuple[str, str]:
        style = shared_styles[0] if shared_styles else ""
        color = shared_colors[0] if shared_colors else ""
        name = _BLEND_NAMES.get((style.lower(), color.lower()))
        if not name:
            # Try style-only match
            for (s, _c), n in _BLEND_NAMES.items():
                if s == style.lower():
                    name = n
                    break
        if not name:
            name = random.choice(_BLEND_NAME_FALLBACKS)  # noqa: S311
        style2 = shared_styles[1] if len(shared_styles) > 1 else (a["styles"][0] if a["styles"] else "everyday")
        template = random.choice(_BLEND_DESC_TEMPLATES)  # noqa: S311
        desc = template.format(
            style1=style.title() or "Casual",
            style2=style2.title(),
            color=color.title() or "neutral",
        )
        return name, desc

    # ─── Why You Match ───────────────────────────────────────────────────────

    def _why_you_match(
        self,
        a: dict,
        b: dict,
        metrics: list[dict],
        shared_styles: list[str],
        shared_colors: list[str],
    ) -> list[str]:
        insights: list[str] = []

        # Wishlist overlap
        overlap = a["wishlistIds"] & b["wishlistIds"]
        total = a["wishlistIds"] | b["wishlistIds"]
        if total:
            pct = round(100 * len(overlap) / len(total))
            if pct > 0:
                insights.append(f"{pct}% wishlist overlap — you've saved some of the same pieces.")
            elif a["wishlistCount"] and b["wishlistCount"]:
                insights.append(f"You both actively wishlist — {a['wishlistCount']} and {b['wishlistCount']} items respectively.")

        # Shared styles
        if shared_styles:
            insights.append(f"Both of you gravitate toward {shared_styles[0].title()} styles.")

        # Shared colors
        if shared_colors:
            insights.append(f"Your palettes share a love for {shared_colors[0].title()} tones.")

        # Peak shopping hours
        h_a, h_b = a.get("peakHour"), b.get("peakHour")
        if h_a is not None and h_b is not None:
            def _label(h: int) -> str:
                if h < 6:   return "late night"
                if h < 12:  return "morning"
                if h < 18:  return "afternoon"
                if h < 21:  return "evening"
                return "late night"
            if abs(h_a - h_b) <= 2:
                insights.append(f"You both browse the most during the {_label(h_a)} — parallel scrollers.")
            else:
                insights.append(f"{a['name']} browses in the {_label(h_a)}, {b['name']} in the {_label(h_b)} — different hours, same taste.")

        # Shared top category
        cats_a = {c["name"].lower() for c in a["analytics"].get("topCategories", [])}
        cats_b = {c["name"].lower() for c in b["analytics"].get("topCategories", [])}
        shared_cats = cats_a & cats_b
        if shared_cats:
            cat = next(iter(shared_cats)).title()
            insights.append(f"You both browse {cat} the most — it's your shared fashion territory.")

        # Shared brands
        shared_brands = self._shared(a["brands"], b["brands"])
        if shared_brands:
            insights.append(f"{shared_brands[0].title()} is a brand you both keep coming back to.")

        # Budget compatibility
        budget_metric = next((m for m in metrics if "budget" in m["name"].lower()), None)
        if budget_metric and budget_metric["value"] >= 75:
            insights.append("Your budgets are well-aligned — perfect for co-shopping without compromise.")

        # Order history
        if a["orderCount"] and b["orderCount"]:
            insights.append(
                f"Combined, you've ordered {a['orderCount'] + b['orderCount']} pieces — a wardrobe worth exploring together."
            )

        return insights[:6]  # Cap at 6 insights

    # ─── Catalog helpers ─────────────────────────────────────────────────────

    def _fetch_catalog_for_twin(self, styles: list[str], colors: list[str]) -> list[dict]:
        """Fetch catalog products matching shared styles/colors for twin looks."""
        style_filter = styles[0] if styles else None
        color_filter = colors[0] if colors else None
        with self.engine.connect() as conn:
            params: dict[str, Any] = {}
            filters: list[str] = []
            if style_filter:
                filters.append("style ILIKE :style")
                params["style"] = f"%{style_filter}%"
            if color_filter:
                filters.append("color ILIKE :color")
                params["color"] = f"%{color_filter}%"
            where = f" WHERE {' AND '.join(filters)}" if filters else ""
            rows = conn.execute(
                text(f"SELECT id, name, brand, category, color, style, price, image_url FROM products{where} LIMIT 12"),
                params,
            ).mappings().all()
        return [dict(r) for r in rows]

    @staticmethod
    def _catalog_item(row: dict) -> dict:
        return {
            "id": str(row.get("id", "")),
            "name": row.get("name") or "Fashion piece",
            "brand": row.get("brand") or "Myntra",
            "category": row.get("category") or "Apparel",
            "color": row.get("color") or "",
            "price": float(row.get("price") or 0),
            "image": row.get("image_url") or "",
        }

    def _shared_wishlist(self, a: dict, b: dict, score: int, session_id: str, coordinate_pids: list[str]) -> list[dict]:
        """Find catalog products both users would love, with AI reasons."""
        shared_styles = self._shared(a["styles"], b["styles"]) or self._top(a["styles"] + b["styles"], 2)
        shared_colors = self._shared(a["colors"], b["colors"]) or self._top(a["colors"] + b["colors"], 3)
        shared_brands = self._shared(a["brands"], b["brands"])

        # Fetch product IDs currently in the shared closet
        closet_pids = []
        try:
            with self.engine.connect() as conn:
                rows = conn.execute(
                    text("SELECT DISTINCT product_id::text FROM blend_shared_closet WHERE session_id = :session_id AND product_id IS NOT NULL"),
                    {"session_id": session_id}
                ).all()
                closet_pids = [row[0] for row in rows]
        except Exception:
            pass

        exclude_pids = set(closet_pids + coordinate_pids)

        with self.engine.connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT p.id, p.name, p.brand, p.category, p.color, p.style,
                           p.price, p.image_url, p.original_price, p.rating
                    FROM products p
                    WHERE p.id NOT IN (
                        SELECT product_id FROM wishlist WHERE user_id = :uid_a
                        UNION
                        SELECT product_id FROM wishlist WHERE user_id = :uid_b
                    )
                    ORDER BY p.rating DESC NULLS LAST
                    LIMIT 40
                """),
                {"uid_a": a["id"], "uid_b": b["id"]},
            ).mappings().all()

        results = []
        for row in rows:
            pid = str(row["id"])
            if pid in exclude_pids:
                continue
            row_style = str(row.get("style") or "").lower()
            row_color = str(row.get("color") or "").lower()
            row_brand = str(row.get("brand") or "").lower()
            if row_style in shared_styles or row_color in shared_colors or row_brand in shared_brands:
                reason = self._wishlist_reason(row_style, row_color, row_brand, shared_styles, shared_colors, shared_brands)
                results.append({
                    "id": pid,
                    "name": row["name"] or "Fashion piece",
                    "brand": row["brand"] or "Myntra",
                    "category": row["category"] or "Apparel",
                    "color": row["color"] or "",
                    "price": float(row["price"] or 0),
                    "originalPrice": float(row["original_price"] or row["price"] or 0),
                    "image": row["image_url"] or "",
                    "rating": float(row["rating"]) if row["rating"] else None,
                    "aiReason": reason,
                })

        # Fallback if too many excluded
        if not results:
            for row in rows:
                results.append({
                    "id": str(row["id"]),
                    "name": row["name"] or "Fashion piece",
                    "brand": row["brand"] or "Myntra",
                    "category": row["category"] or "Apparel",
                    "color": row["color"] or "",
                    "price": float(row["price"] or 0),
                    "originalPrice": float(row["original_price"] or row["price"] or 0),
                    "image": row["image_url"] or "",
                    "rating": float(row["rating"]) if row["rating"] else None,
                    "aiReason": "A popular item neither of you have saved yet.",
                })

        return results[:8]

    @staticmethod
    def _wishlist_reason(style: str, color: str, brand: str, shared_styles: list, shared_colors: list, shared_brands: list) -> str:
        if style in shared_styles:
            return f"Matches your shared love for {style.title()} styling."
        if color in shared_colors:
            return f"Falls right into your shared {color.title()} palette."
        if brand in shared_brands:
            return f"{brand.title()} is already in both of your fashion orbits."
        return "A curated pick for your combined taste profile."

    # ─── Outfit generation ───────────────────────────────────────────────────

    def _outfits(self, a: dict, b: dict, occasion: str, weather: str, score: int, session_id: str) -> list[dict]:
        catalog = a["products"] + b["products"]
        if not catalog:
            return []
        outfits = []
        styles = self._top(a["styles"] + b["styles"], 2)
        for index, product in enumerate(catalog[:4]):
            price = int(product.get("price") or 0)
            pid = str(product.get("product_id") or product.get("id") or "")
            outfits.append({
                "id": pid or str(product.get("name", index)).replace(" ", "-").lower(),
                "title": product.get("name") or "Shared edit",
                "occasion": occasion,
                "weather": weather,
                "price": f"₹{price:,}" if price else "Price on request",
                "match": max(50, score - index * 3),
                "yours": 50 + (index % 2) * 8,
                "image": product.get("image_url") or "",
                "pieces": [x.title() for x in styles] + [str(product.get("category") or "Everyday piece").title()],
                "explanation": f"Brings together your shared {', '.join(styles) or 'fashion'} signals for {occasion.lower()}.",
                "reason": "Selected from wishlist and matched to both members' style signals.",
                "brand": product.get("brand") or "",
                "category": product.get("category") or "",
            })
        return outfits

    def generate_more_looks(
        self,
        session_id: str,
        first_id: str,
        second_id: str,
        exclude_product_ids: list[str],
        occasion: str | None = None,
    ) -> list[dict]:
        a = self._profile(first_id)
        b = self._profile(second_id)
        metrics = self._metrics(a, b)
        score = round(
            sum(item["value"] * item["weight"] for item in metrics)
            / sum(item["weight"] for item in metrics)
        )
        shared_styles = self._shared(a["styles"], b["styles"]) or self._top(a["styles"] + b["styles"], 3)
        shared_colors = self._shared(a["colors"], b["colors"]) or self._top(a["colors"] + b["colors"], 5)

        occ = occasion or self._occasion(a, b)
        weather = self._weather(a, b)

        exclude_set = {str(pid) for pid in exclude_product_ids}
        wishlist_products = [
            p for p in (a["products"] + b["products"])
            if p.get("product_id") and str(p["product_id"]) not in exclude_set
        ]

        needed = 4
        chosen_products = []
        for p in wishlist_products:
            pid = str(p["product_id"])
            if pid not in exclude_set:
                chosen_products.append(p)
                exclude_set.add(pid)
                if len(chosen_products) >= needed:
                    break

        if len(chosen_products) < needed:
            style_filter = shared_styles[0] if shared_styles else None
            color_filter = shared_colors[0] if shared_colors else None
            with self.engine.connect() as conn:
                params: dict[str, Any] = {}
                filters: list[str] = []
                if style_filter:
                    filters.append("style ILIKE :style")
                    params["style"] = f"%{style_filter}%"
                if color_filter:
                    filters.append("color ILIKE :color")
                    params["color"] = f"%{color_filter}%"

                # Build NOT IN using individual named parameters (text() can't bind tuples)
                if exclude_set:
                    exclude_list = list(exclude_set)
                    placeholders = ", ".join(f":ex{i}" for i in range(len(exclude_list)))
                    filters.append(f"id::text NOT IN ({placeholders})")
                    for i, pid in enumerate(exclude_list):
                        params[f"ex{i}"] = pid

                where = f" WHERE {' AND '.join(filters)}" if filters else ""

                query = text(f"""
                    SELECT id, name, brand, category, color, style, price, image_url
                    FROM products
                    {where}
                    ORDER BY rating DESC NULLS LAST
                    LIMIT :limit
                """)
                params["limit"] = needed - len(chosen_products)

                rows = conn.execute(query, params).mappings().all()
                for row in rows:
                    chosen_products.append({
                        "product_id": str(row["id"]),
                        "name": row["name"],
                        "brand": row["brand"],
                        "category": row["category"],
                        "color": row["color"],
                        "style": row["style"],
                        "price": row["price"],
                        "image_url": row["image_url"],
                    })


        outfits = []
        styles = self._top(a["styles"] + b["styles"], 2)
        for index, product in enumerate(chosen_products):
            price = int(product.get("price") or 0)
            pid = str(product.get("product_id") or product.get("id") or "")
            outfits.append({
                "id": pid,
                "title": product.get("name") or "Curated Look",
                "occasion": occ,
                "weather": weather,
                "price": f"₹{price:,}" if price else "Price on request",
                "match": max(50, score - index * 3),
                "yours": 50 + (index % 2) * 8,
                "image": product.get("image_url") or "",
                "pieces": [x.title() for x in styles] + [str(product.get("category") or "Everyday piece").title()],
                "explanation": f"Brings together your shared {', '.join(styles) or 'fashion'} signals for {occ.lower()}.",
                "reason": "Curated based on shared style signals and catalog preferences.",
                "brand": product.get("brand") or "",
                "category": product.get("category") or "",
            })
        return outfits


    # ─── Session caching ─────────────────────────────────────────────────────

    def _cache_result(self, session_id: str, blend_name: str, blend_desc: str, score: int) -> None:
        try:
            with self.engine.begin() as conn:
                conn.execute(
                    text("""
                        UPDATE blend_sessions
                        SET blend_name = :name,
                            blend_description = :desc,
                            compatibility_score = :score,
                            last_computed_at = NOW()
                        WHERE id = :session_id
                    """),
                    {"name": blend_name, "desc": blend_desc, "score": score, "session_id": session_id},
                )
        except Exception:
            pass  # Caching failure must never break the user experience

    # ─── Utility ─────────────────────────────────────────────────────────────

    @staticmethod
    def _values(value: Any) -> list[str]:
        if isinstance(value, list):
            return [str(x).lower() for x in value if x]
        return [x.strip().lower() for x in str(value or "").split(",") if x.strip()]

    @staticmethod
    def _average(rows: list[Any], key: str) -> float:
        values = [float(row[key]) for row in rows if row.get(key) is not None]
        return sum(values) / len(values) if values else 0

    @staticmethod
    def _top(items: list[str], limit: int) -> list[str]:
        return [x for x, _ in Counter(items).most_common(limit)]

    @staticmethod
    def _shared(a: list[str], b: list[str]) -> list[str]:
        return [x for x in Counter(a + b) if x in set(a) and x in set(b)]

    @staticmethod
    def _overlap(a: list[str], b: list[str]) -> float:
        union = set(a) | set(b)
        return 50 if not union else 100 * len(set(a) & set(b)) / len(union)

    def _metrics(self, a: dict, b: dict) -> list[dict]:
        budget = (
            50 if not a["budget"] or not b["budget"]
            else max(0, 100 - abs(a["budget"] - b["budget"]) / max(a["budget"], b["budget"]) * 100)
        )
        # Wishlist overlap as a direct signal
        wl_overlap = (
            100 * len(a["wishlistIds"] & b["wishlistIds"]) / len(a["wishlistIds"] | b["wishlistIds"])
            if (a["wishlistIds"] | b["wishlistIds"])
            else 50
        )
        pairs = [
            ("Colour harmony",    self._overlap(a["colors"], b["colors"]),     "#ff5c8a", 1.2),
            ("Style similarity",  self._overlap(a["styles"], b["styles"]),     "#b18cff", 1.3),
            ("Brand affinity",    self._overlap(a["brands"], b["brands"]),     "#ffab6b", 1.0),
            ("Budget match",      budget,                                       "#77d6ba", 0.8),
            ("Category overlap",  self._overlap(a["categories"], b["categories"]), "#5f9cff", 1.0),
            ("Wishlist harmony",  max(20, wl_overlap),                         "#f9a8d4", 1.1),
        ]
        return [{"name": n, "value": max(20, v), "color": c, "weight": w} for n, v, c, w in pairs]

    def _person(self, p: dict) -> dict:
        return {"name": p["name"], "initials": "".join(x[0] for x in p["name"].split()[:2]).upper(), "labels": self._dna(p), "image": ""}

    def _dna(self, p: dict) -> list[dict]:
        # Only use genuine style tags for DNA chips, not occasion/context labels
        style_candidates = [
            s for s in (p["styles"] or [])
            if any(allowed in s for allowed in _STYLE_ALLOWLIST)
        ] or p["styles"] or p["categories"]
        return [
            {"name": x.title(), "confidence": min(97, 65 + count * 8)}
            for x, count in Counter(style_candidates).most_common(3)
        ] or [{"name": "Emerging style", "confidence": 55}]

    def _reasons(self, a: dict, b: dict, metrics: list[dict]) -> list[str]:
        reasons = []
        for profile in (a, b):
            cats = profile["analytics"].get("topCategories", [])
            if cats:
                reasons.append(f"{profile['name']} frequently browses {cats[0]['name']}, shaping the outfit suggestions below.")
                break
        if self._shared(a["colors"], b["colors"]):
            reasons.append(f"You both gravitate toward {self._shared(a['colors'], b['colors'])[0]} tones.")
        if self._shared(a["brands"], b["brands"]):
            reasons.append(f"{self._shared(a['brands'], b['brands'])[0].title()} appears in both of your fashion signals.")
        best = max(metrics, key=lambda x: x["value"])
        reasons.append(f"{best['name']} is your strongest connection at {round(best['value'])}%.")
        return reasons

    @staticmethod
    def _occasion(a: dict, b: dict) -> str:
        return "Weekend plans"

    @staticmethod
    def _weather(a: dict, b: dict) -> str:
        w = a["weather"] or b["weather"]
        return f"{w.get('condition', 'Everyday')} · {w.get('temperature', 'All-weather')}°C" if w else "All-weather"

    def _insights(self, a: dict, b: dict, metrics: list[dict]) -> list[dict]:
        return [
            {"value": f"{round(x['value'])}%", "label": x["name"].lower()}
            for x in sorted(metrics, key=lambda x: x["value"], reverse=True)[:4]
        ]

    @staticmethod
    def _color_hex(color: str) -> str:
        return {
            "black": "#24242d", "white": "#f6f2ed", "pink": "#e9b6ba",
            "brown": "#563e37", "blue": "#8fa9d6", "beige": "#d8c5a7",
            "green": "#738174", "red": "#c0504a", "gold": "#d4a847",
            "yellow": "#f2d580", "orange": "#e8935b", "purple": "#9b7cc7",
            "grey": "#a8a8b3", "gray": "#a8a8b3", "cream": "#ece5d3",
            "navy": "#3b4a73", "magenta": "#b5479a",
        }.get(color.lower(), "#b18cff")
