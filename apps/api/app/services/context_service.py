"""Live context aggregation and deterministic recommendation rules."""
from __future__ import annotations

import logging
from datetime import date, datetime, time
from typing import Any

from sqlalchemy import Engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import get_engine
from app.schemas.context import ContextSnapshot, Recommendation, UpcomingEvent

logger = logging.getLogger(__name__)


class ContextService:
    def __init__(self, engine: Engine | None = None) -> None:
        self._engine = engine if engine is not None else get_engine()

    def get_snapshot(self) -> ContextSnapshot:
        if self._engine is None:
            return ContextSnapshot()
        try:
            with self._engine.connect() as conn:
                user = self._one(conn, "SELECT * FROM users ORDER BY created_at ASC LIMIT 1")
                if not user:
                    return ContextSnapshot()
                params = {"user_id": user["id"]}
                weather = self._one(conn, "SELECT * FROM weather_context WHERE city = :city ORDER BY forecast_date DESC NULLS LAST LIMIT 1", {"city": user.get("city")})
                events = self._all(conn, "SELECT * FROM calendar_events WHERE user_id = :user_id AND event_date >= CURRENT_DATE ORDER BY event_date", params)
                wardrobe = self._all(conn, "SELECT * FROM wardrobe WHERE user_id = :user_id ORDER BY created_at DESC", params)
                products = self._all(conn, "SELECT * FROM products ORDER BY name")
                notifications = self._all(conn, "SELECT * FROM notifications WHERE user_id = :user_id ORDER BY created_at DESC", params)
        except SQLAlchemyError:
            logger.exception("Failed to load context snapshot")
            return ContextSnapshot()
        return ContextSnapshot(
            user={"id": str(user["id"]), "name": user.get("full_name") or "", "email": user.get("email")},
            weather={} if not weather else {"city": weather.get("city"), "temperature": weather.get("temperature"), "condition": weather.get("condition")},
            upcomingEvents=[self._event(row) for row in events], wardrobe=[self._json(row) for row in wardrobe],
            recommendations=self._recommend(products, user, weather, events, wardrobe), notifications=[self._json(row) for row in notifications],
        )

    @staticmethod
    def _one(conn: Any, query: str, params: dict[str, Any] | None = None) -> dict[str, Any] | None:
        row = conn.execute(text(query), params or {}).mappings().first()
        return dict(row) if row else None

    @staticmethod
    def _all(conn: Any, query: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        return [dict(row) for row in conn.execute(text(query), params or {}).mappings().all()]

    @staticmethod
    def _event(row: dict[str, Any]) -> UpcomingEvent:
        event_date = row.get("event_date")
        if isinstance(event_date, datetime): event_date = event_date.date()
        start = end = ""
        if isinstance(event_date, date):
            start, end = datetime.combine(event_date, time.min).isoformat(), datetime.combine(event_date, time.max).isoformat()
        return UpcomingEvent(id=str(row["id"]), title=row.get("title"), startTime=start, endTime=end)

    @staticmethod
    def _json(row: dict[str, Any]) -> dict[str, Any]:
        return {key: value.isoformat() if isinstance(value, (date, datetime)) else str(value) if key == "id" else value for key, value in row.items()}

    def _recommend(self, products: list[dict[str, Any]], user: dict[str, Any], weather: dict[str, Any] | None, events: list[dict[str, Any]], wardrobe: list[dict[str, Any]]) -> list[Recommendation]:
        event_text = " ".join(f"{row.get('title', '')} {row.get('event_type', '')}".lower() for row in events)
        temperature = (weather or {}).get("temperature")
        rain = "rain" in str((weather or {}).get("condition") or "").lower()
        hot = isinstance(temperature, (int, float)) and temperature >= 30
        categories = {str(row.get("category") or "").lower() for row in wardrobe}
        preferred_style = str(user.get("preferred_style") or "").lower()
        results: list[tuple[int, str, dict[str, Any]]] = []
        for product in products:
            price, minimum, maximum = product.get("price"), user.get("budget_min"), user.get("budget_max")
            if price is not None and ((minimum is not None and price < minimum) or (maximum is not None and price > maximum)): continue
            category, style, name = str(product.get("category") or "").lower(), str(product.get("style") or "").lower(), str(product.get("name") or "").lower()
            score, reasons = 0, []
            if "interview" in event_text and ("formal" in style or category in {"footwear", "shirt", "pants"}): score += 50; reasons.append("suits your upcoming interview")
            if any(word in event_text for word in ("wedding", "sangeet", "mehendi")) and ("ethnic" in style or category in {"ethnic", "kurta", "saree"}): score += 50; reasons.append("fits your upcoming wedding event")
            if rain and ("waterproof" in name or category in {"footwear", "shoes"}): score += 35; reasons.append("is practical for rainy weather")
            if hot and any(word in f"{name} {style}" for word in ("cotton", "linen", "breathable")): score += 30; reasons.append("is breathable for hot weather")
            if preferred_style and preferred_style in style: score += 15; reasons.append("matches your preferred style")
            if category and category not in categories: score += 5; reasons.append("adds versatility to your wardrobe")
            if score: results.append((score, "; ".join(reasons), product))
        return [Recommendation(id=str(product["id"]), title=str(product.get("name") or "Product recommendation"), reason=reason.capitalize() + ".", confidence=round(min(.99, .55 + score / 100), 2)) for score, reason, product in sorted(results, key=lambda item: (-item[0], str(item[2].get("name") or "")))[:5]]
