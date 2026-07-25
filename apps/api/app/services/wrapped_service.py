"""Real-data aggregation for the Fashion Wrapped experience."""
from __future__ import annotations

from collections import Counter
from typing import Any
from sqlalchemy import text
from app.services.analytics_service import AnalyticsService


class WrappedService:
    def __init__(self, engine: Any) -> None:
        self.engine = engine

    def generate(self, user_id: str, fallback_name: str | None = None) -> dict[str, Any]:
        with self.engine.connect() as conn:
            profile = conn.execute(text("SELECT full_name, preferred_style, preferred_colors, favorite_brands FROM users WHERE id = :id"), {"id": user_id}).mappings().first()
            orders = conn.execute(text("SELECT o.quantity, o.price, o.created_at, p.brand, p.category, p.color, p.style FROM orders o JOIN products p ON p.id = o.product_id WHERE o.user_id = :id"), {"id": user_id}).mappings().all()
            wishlist = conn.execute(text("SELECT w.created_at, p.brand, p.category, p.color, p.style FROM wishlist w JOIN products p ON p.id = w.product_id WHERE w.user_id = :id"), {"id": user_id}).mappings().all()
            events = conn.execute(text("SELECT event_type, brand, category, color, style, created_at FROM behavior_events WHERE user_id = :id"), {"id": user_id}).mappings().all()
            blends = conn.execute(text("SELECT id FROM blend_sessions WHERE created_by = :id OR joined_by = :id"), {"id": user_id}).mappings().all()
        try:
            analytics = AnalyticsService(self.engine).summary(user_id)
        except Exception:
            analytics = {"topCategories": [], "favoriteBrands": [], "peakShoppingHour": "Still learning", "shoppingStyle": "Casual Shopper", "totalBrowsingTime": 0}
        profile = dict(profile or {})
        name = profile.get("full_name") or fallback_name or "Style lover"
        styles = self._values(profile.get("preferred_style")) + self._column(orders, "style") + self._column(wishlist, "style") + self._column(events, "style")
        colors = self._values(profile.get("preferred_colors")) + self._column(orders, "color") + self._column(wishlist, "color") + self._column(events, "color")
        brands = self._values(profile.get("favorite_brands")) + self._column(orders, "brand") + self._column(wishlist, "brand") + self._column(events, "brand")
        categories = self._column(orders, "category") + self._column(wishlist, "category") + self._column(events, "category")
        total_orders = sum(int(row["quantity"] or 1) for row in orders)
        spend = sum(float(row["price"] or 0) * int(row["quantity"] or 1) for row in orders)
        months = Counter(str(row["created_at"])[5:7] for row in orders)
        month_names = {"01":"January", "02":"February", "03":"March", "04":"April", "05":"May", "06":"June", "07":"July", "08":"August", "09":"September", "10":"October", "11":"November", "12":"December"}
        top_style = self._top(styles, 1)[0] if styles else "personal"
        return {"name": name, "hasEnoughData": bool(orders or wishlist or events), "personality": self._personality(styles, categories, total_orders), "personalityExplanation": f"Your {top_style.title()} signals shape a wardrobe that feels considered, expressive, and unmistakably yours.", "evolution": self._evolution(styles), "palette": [{"name": color.title(), "hex": self._hex(color)} for color in self._top(colors, 5)], "brands": [{"name": brand.title(), "count": count} for brand, count in Counter(brands).most_common(4)], "statistics": {"orders": total_orders, "wishlist": len(wishlist), "categories": len(set(categories)), "averageSpend": round(spend / total_orders) if total_orders else 0, "peakMonth": month_names.get(months.most_common(1)[0][0], "Still collecting") if months else "Still collecting"}, "categories": [{"name": item.title(), "value": count} for item, count in Counter(categories).most_common(5)], "blend": {"count": len(blends), "headline": "Your shared style moments" if blends else "Your first Blend is waiting", "dna": self._top(styles, 2)}, "coach": self._coach(top_style, colors), "forecast": self._forecast(top_style, colors), "achievements": self._achievements(total_orders, len(wishlist), colors, events), "analytics": analytics, "shoppingInsight": self._shopping_insight(analytics)}
    @staticmethod
    def _shopping_insight(analytics: dict[str, Any]) -> str:
        if not analytics:
            return "We're still learning your shopping habits."

        top_categories = analytics.get("topCategories", [])
        favorite_brands = analytics.get("favoriteBrands", [])
        shopping_style = analytics.get("shoppingStyle")
        peak_hour = analytics.get("peakShoppingHour")

        if top_categories:
            category = (
                top_categories[0]["name"]
                if isinstance(top_categories[0], dict)
                else str(top_categories[0])
            )
            return f"You spend most of your time exploring {category.lower()}."

        if favorite_brands:
            brand = (
                favorite_brands[0]["name"]
                if isinstance(favorite_brands[0], dict)
                else str(favorite_brands[0])
            )
            return f"{brand} keeps catching your attention."

        if shopping_style:
            return f"Your shopping style is {shopping_style.lower()}."

        if peak_hour:
            return f"You're most active around {peak_hour}."

        return "Every browse helps us personalize your fashion journey."
    @staticmethod
    def _values(value: Any) -> list[str]:
        if isinstance(value, list): return [str(item).lower() for item in value if item]
        return [item.strip().lower() for item in str(value or "").split(",") if item.strip()]
    @staticmethod
    def _column(rows: Any, field: str) -> list[str]: return [str(row[field]).lower() for row in rows if row.get(field)]
    @staticmethod
    def _top(values: list[str], limit: int) -> list[str]: return [item for item, _ in Counter(values).most_common(limit)]
    @staticmethod
    def _hex(color: str) -> str:
        _MAP = {
            # Neutrals
            "black": "#24242d", "white": "#f7f2eb", "grey": "#9e9e9e", "gray": "#9e9e9e",
            "charcoal": "#454545", "cream": "#fffdd0", "ivory": "#fffff0", "beige": "#d9c29a",
            "off-white": "#f5f0e8",
            # Warm
            "brown": "#8a5a44", "tan": "#d2b48c", "camel": "#c19a6b", "gold": "#d4a843",
            "mustard": "#e1ad01", "orange": "#e07a3a", "coral": "#f4846b", "red": "#d84f58",
            "maroon": "#800000", "rust": "#b7410e",
            # Cool
            "blue": "#7197d5", "navy": "#1f305e", "teal": "#3b9a8f", "mint": "#a8d8bb",
            "green": "#71977e", "olive": "#6b7a3a", "sage": "#9caf88",
            # Feminine / festive
            "pink": "#ee8fa8", "rose": "#f4a0a0", "blush": "#f7b8c2", "mauve": "#c78da0",
            "lavender": "#c5b3e6", "violet": "#7f5af0", "purple": "#9b59b6",
        }
        return _MAP.get(color.lower().strip(), "#b596e8")
    @staticmethod
    def _personality(styles: list[str], categories: list[str], orders: int) -> str:
        joined = " ".join(styles + categories).lower()
        if "street" in joined or "sneaker" in joined: return "Streetwear Explorer"
        if "luxury" in joined or "designer" in joined: return "Luxury Lover"
        if "ethnic" in joined or "kurta" in joined or "saree" in joined or "lehenga" in joined: return "Ethnic Enthusiast"
        if "festive" in joined or "party" in joined or "cocktail" in joined: return "Festive Dresser"
        if "formal" in joined or "workwear" in joined or "office" in joined: return "Sharp Professional"
        if orders >= 8: return "Trend Chaser"
        if "minimal" in joined or "classic" in joined or "capsule" in joined: return "Capsule Curator"
        if "casual" in joined or "lounge" in joined or "athleisure" in joined: return "Effortless Casual"
        return "Minimal Muse"
    @staticmethod
    def _evolution(styles: list[str]) -> list[dict[str, str]]:
        signal = WrappedService._top(styles, 3) or ["your signature"]
        return [{"month":"January", "label":signal[0].title()}, {"month":"April", "label":(signal[1] if len(signal) > 1 else signal[0]).title()}, {"month":"August", "label":(signal[2] if len(signal) > 2 else signal[0]).title()}, {"month":"December", "label":"Your next chapter"}]
    @staticmethod
    def _coach(style: str, colors: list[str]) -> str:
        color = WrappedService._top(colors, 1)[0] if colors else "new"
        return f"You’ve built a {style} point of view with {color} as a recurring signature. Your next best move: introduce one unexpected texture to keep the story evolving."
    @staticmethod
    def _forecast(style: str, colors: list[str]) -> str:
        color = WrappedService._top(colors, 1)[0] if colors else "earthy"
        return f"Expect your {style} instinct to move toward elevated {color} layers, softer tailoring, and pieces that work harder across occasions."
    @staticmethod
    def _achievements(orders: int, wishlist: int, colors: list[str], events: Any) -> list[str]:
        badges = []
        if wishlist: badges.append("Wishlist Wizard")
        if orders: badges.append("Style Collector")
        if colors and Counter(colors).most_common(1)[0][0] in {"black", "white", "beige", "brown"}: badges.append("Neutral Icon")
        if any("night" in str(item.get("event_type", "")).lower() for item in events): badges.append("Night Owl Shopper")
        return badges or ["Style Story Begins"]
