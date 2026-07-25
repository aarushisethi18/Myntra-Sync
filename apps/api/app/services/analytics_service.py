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
            categories = conn.execute(text("""SELECT category AS name, COALESCE(SUM(duration_seconds), 0)::integer AS value FROM behavior_events WHERE user_id = :user_id AND category IS NOT NULL AND event_type IN ('PRODUCT_VIEW', 'CATEGORY_VIEW', 'PRODUCT_DWELL') GROUP BY category ORDER BY value DESC, category ASC LIMIT 5"""), {"user_id": user_id}).mappings().all()
            brands = conn.execute(text("""SELECT brand AS name, COUNT(*)::integer AS value FROM behavior_events WHERE user_id = :user_id AND brand IS NOT NULL AND event_type IN ('PRODUCT_VIEW', 'BRAND_VIEW', 'PRODUCT_DWELL') GROUP BY brand ORDER BY value DESC, brand ASC LIMIT 5"""), {"user_id": user_id}).mappings().all()
            hour = conn.execute(text("SELECT EXTRACT(HOUR FROM created_at)::integer AS hour FROM behavior_events WHERE user_id = :user_id GROUP BY hour ORDER BY COUNT(*) DESC, hour ASC LIMIT 1"), {"user_id": user_id}).scalar()
            total = conn.execute(text("SELECT COALESCE(SUM(duration_seconds), 0)::integer FROM behavior_events WHERE user_id = :user_id AND event_type IN ('PRODUCT_VIEW', 'CATEGORY_VIEW', 'PRODUCT_DWELL')"), {"user_id": user_id}).scalar() or 0
            view_count = conn.execute(text("SELECT COUNT(*)::integer FROM behavior_events WHERE user_id = :user_id AND event_type IN ('PRODUCT_VIEW', 'CATEGORY_VIEW', 'PRODUCT_DWELL')"), {"user_id": user_id}).scalar() or 0
            weekend = conn.execute(text("SELECT COUNT(*) FROM behavior_events WHERE user_id = :user_id AND EXTRACT(ISODOW FROM created_at) IN (6, 7)"), {"user_id": user_id}).scalar() or 0
            events = conn.execute(text("SELECT COUNT(*) FROM behavior_events WHERE user_id = :user_id"), {"user_id": user_id}).scalar() or 0
        values, brand_values = [dict(row) for row in categories], [dict(row) for row in brands]
        # If duration_seconds was never populated but views exist, estimate 30s per view
        browsing_seconds = int(total) if total > 0 else (view_count * 30)
        return {"topCategories": values, "favoriteBrands": brand_values, "peakShoppingHour": self._hour_label(hour), "shoppingStyle": self._style(values, hour, weekend, events), "totalBrowsingTime": browsing_seconds}
    def shopping_insights(self, user_id: str) -> dict[str, Any]:
        # All presentation values are derived from persisted interactions and live shopping state.
        with self.engine.connect() as conn:
            metrics = conn.execute(text("""SELECT COUNT(*) FILTER (WHERE event_type='PRODUCT_VIEW')::integer AS products_viewed, COUNT(DISTINCT category) FILTER (WHERE event_type IN ('PRODUCT_VIEW','CATEGORY_VIEW','PRODUCT_DWELL') AND category IS NOT NULL)::integer AS categories_explored, COUNT(DISTINCT brand) FILTER (WHERE event_type IN ('PRODUCT_VIEW','BRAND_VIEW','PRODUCT_DWELL') AND brand IS NOT NULL)::integer AS brands_explored, COALESCE(SUM(duration_seconds) FILTER (WHERE event_type IN ('PRODUCT_VIEW','CATEGORY_VIEW','PRODUCT_DWELL')),0)::integer AS browsing_time, COUNT(*)::integer AS event_count FROM behavior_events WHERE user_id=:user_id AND (created_at AT TIME ZONE 'Asia/Kolkata')::date=(now() AT TIME ZONE 'Asia/Kolkata')::date"""), {"user_id": user_id}).mappings().one()
            state = conn.execute(text("""SELECT (SELECT COUNT(*) FROM wishlist WHERE user_id=:user_id)::integer AS wishlist_additions, (SELECT COALESCE(SUM(quantity),0) FROM bag WHERE user_id=:user_id)::integer AS bag_additions"""), {"user_id": user_id}).mappings().one()
            categories = conn.execute(text("""SELECT category AS name, COALESCE(SUM(duration_seconds),0)::integer AS seconds FROM behavior_events WHERE user_id=:user_id AND category IS NOT NULL AND event_type IN ('PRODUCT_VIEW','CATEGORY_VIEW','PRODUCT_DWELL') AND created_at >= now()-interval '7 days' GROUP BY category ORDER BY seconds DESC, category LIMIT 5"""), {"user_id": user_id}).mappings().all()
            timeline = conn.execute(text("""WITH meaningful AS (SELECT e.*, COALESCE(p.name,e.brand,e.category,e.product_id,'a product') AS subject, lag(e.event_type) OVER w AS previous_type, lag(COALESCE(e.product_id,e.category,e.brand,'')) OVER w AS previous_subject, lag(e.created_at) OVER w AS previous_at FROM behavior_events e LEFT JOIN products p ON p.id::text=e.product_id WHERE e.user_id=:user_id AND e.event_type IN ('PRODUCT_VIEW','WISHLIST_ADD','WISHLIST_REMOVE','BAG_ADD','BAG_REMOVE','CATEGORY_VIEW','BRAND_VIEW','SEARCH','ORDER_PLACED') WINDOW w AS (ORDER BY e.created_at DESC)) SELECT event_type,subject,metadata,created_at AT TIME ZONE 'Asia/Kolkata' AS local_created_at FROM meaningful WHERE previous_type IS DISTINCT FROM event_type OR previous_subject IS DISTINCT FROM COALESCE(product_id,category,brand,'') OR previous_at IS NULL OR abs(extract(epoch FROM created_at-previous_at))>2 ORDER BY created_at DESC LIMIT 10"""), {"user_id": user_id}).mappings().all()
            weekly = conn.execute(text("""SELECT EXTRACT(ISODOW FROM created_at AT TIME ZONE 'Asia/Kolkata')::integer AS day, (COUNT(*) FILTER (WHERE event_type='PRODUCT_VIEW') + COALESCE(SUM(duration_seconds) FILTER (WHERE event_type IN ('PRODUCT_VIEW','CATEGORY_VIEW','PRODUCT_DWELL')),0)/60 + COUNT(*) FILTER (WHERE event_type IN ('WISHLIST_ADD','WISHLIST_REMOVE'))*2 + COUNT(*) FILTER (WHERE event_type IN ('BAG_ADD','BAG_REMOVE'))*3 + COUNT(*) FILTER (WHERE event_type='ORDER_PLACED')*8)::integer AS value FROM behavior_events WHERE user_id=:user_id AND created_at>=now()-interval '7 days' GROUP BY day"""), {"user_id": user_id}).mappings().all()
        result = {**dict(metrics), **dict(state)}; rows = [dict(row) for row in categories]
        result["compared_to_yesterday"] = 0
        return {"summary": result, "categories": [{"name": row["name"], "seconds": int(row["seconds"])} for row in rows], "timeline": [self._timeline_item(dict(row)) for row in timeline], "personality": self._shopping_personality(rows, result), "weekly": self._weekly(weekly)}

    @staticmethod
    def _timeline_item(row: dict[str, Any]) -> dict[str, str]:
        labels = {"PRODUCT_VIEW":"Viewed {subject}","WISHLIST_ADD":"Added {subject} to Wishlist","WISHLIST_REMOVE":"Removed {subject} from Wishlist","BAG_ADD":"Added {subject} to Bag","BAG_REMOVE":"Removed {subject} from Bag","CATEGORY_VIEW":"Explored {subject}","BRAND_VIEW":"Explored {subject}","ORDER_PLACED":"Placed Order"}
        if row["event_type"] == "SEARCH": action = f'Searched "{(row.get("metadata") or {}).get("query") or "products"}"'
        else: action = labels[row["event_type"]].format(subject=row["subject"])
        return {"time": row["local_created_at"].strftime("%I:%M %p").lstrip("0"), "action": action}
    @staticmethod
    def _shopping_personality(categories: list[dict[str, Any]], metrics: dict[str, Any]) -> dict[str, str]:
        if metrics["bag_additions"] and metrics["products_viewed"] <= metrics["bag_additions"] * 4: return {"title": "Quick Decision Maker", "description": "You tend to move from discovery to your bag after only a few considered views."}
        if metrics["products_viewed"] >= 8: return {"title": "Trend Explorer", "description": f"You spend time discovering {categories[0]['name'] if categories else 'new arrivals'} before deciding what belongs in your wardrobe."}
        return {"title": "Thoughtful Browser", "description": "Your browsing rhythm is helping Myntra-Sync learn the details that make a recommendation feel right."}

    @staticmethod
    def _weekly(rows: Any) -> list[dict[str, Any]]:
        values = {int(row["day"]): int(row["value"] or 0) for row in rows}
        return [{"day": day, "label": label, "value": values.get(day, 0)} for day, label in enumerate(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], 1)]
    @staticmethod
    def _hour_label(hour: int | None) -> str: return "Still learning" if hour is None else f"{hour % 12 or 12} {'AM' if hour < 12 else 'PM'}"
    @staticmethod
    def _style(categories: list[dict[str, Any]], hour: int | None, weekend: int, events: int) -> str:
        top = str(categories[0]["name"]).lower() if categories else ""
        if "sneaker" in top or "sport" in top: return "Sneaker Lover"
        if hour is not None and (hour >= 21 or hour < 5): return "Night Browser"
        if events >= 3 and weekend * 2 >= events: return "Weekend Explorer"
        return "Casual Shopper"