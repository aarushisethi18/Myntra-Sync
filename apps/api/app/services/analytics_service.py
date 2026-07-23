"""SQL-backed, on-demand aggregates for Time Analytics."""
from __future__ import annotations
from typing import Any
from sqlalchemy import text
from app.services.behavior_engine import BehaviorEngine
class AnalyticsService:
    def __init__(self, engine: Any) -> None: self.engine = engine
    def record(self, user_id: str, event: dict[str, Any]) -> None:
        BehaviorEngine(self.engine).ingest(user_id, {**event, "event_type": event["event_type"].upper(), "metadata": {**event.get("metadata", {}), "durationSeconds": event.get("duration_seconds", 0)}})
    def summary(self, user_id: str) -> dict[str, Any]:
        with self.engine.connect() as conn:
            categories = conn.execute(text("""SELECT category AS name, COALESCE(SUM(duration_seconds), 0)::integer AS value FROM behavior_events WHERE user_id = :user_id AND category IS NOT NULL AND event_type IN ('PRODUCT_VIEW', 'CATEGORY_VIEW') GROUP BY category ORDER BY value DESC, category ASC LIMIT 5"""), {"user_id": user_id}).mappings().all()
            brands = conn.execute(text("""SELECT brand AS name, COUNT(*)::integer AS value FROM behavior_events WHERE user_id = :user_id AND brand IS NOT NULL AND event_type IN ('PRODUCT_VIEW', 'BRAND_VIEW') GROUP BY brand ORDER BY value DESC, brand ASC LIMIT 5"""), {"user_id": user_id}).mappings().all()
            hour = conn.execute(text("SELECT EXTRACT(HOUR FROM created_at)::integer AS hour FROM behavior_events WHERE user_id = :user_id GROUP BY hour ORDER BY COUNT(*) DESC, hour ASC LIMIT 1"), {"user_id": user_id}).scalar()
            total = conn.execute(text("SELECT COALESCE(SUM(duration_seconds), 0)::integer FROM behavior_events WHERE user_id = :user_id AND event_type IN ('PRODUCT_VIEW', 'CATEGORY_VIEW')"), {"user_id": user_id}).scalar() or 0
            weekend = conn.execute(text("SELECT COUNT(*) FROM behavior_events WHERE user_id = :user_id AND EXTRACT(ISODOW FROM created_at) IN (6, 7)"), {"user_id": user_id}).scalar() or 0
            events = conn.execute(text("SELECT COUNT(*) FROM behavior_events WHERE user_id = :user_id"), {"user_id": user_id}).scalar() or 0
        values, brand_values = [dict(row) for row in categories], [dict(row) for row in brands]
        return {"topCategories": values, "favoriteBrands": brand_values, "peakShoppingHour": self._hour_label(hour), "shoppingStyle": self._style(values, hour, weekend, events), "totalBrowsingTime": int(total)}
    @staticmethod
    def _hour_label(hour: int | None) -> str: return "Still learning" if hour is None else f"{hour % 12 or 12} {'AM' if hour < 12 else 'PM'}"
    @staticmethod
    def _style(categories: list[dict[str, Any]], hour: int | None, weekend: int, events: int) -> str:
        top = str(categories[0]["name"]).lower() if categories else ""
        if "sneaker" in top or "sport" in top: return "Sneaker Lover"
        if hour is not None and (hour >= 21 or hour < 5): return "Night Browser"
        if events >= 3 and weekend * 2 >= events: return "Weekend Explorer"
        return "Casual Shopper"