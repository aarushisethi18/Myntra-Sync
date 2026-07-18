"""Live context aggregation and deterministic recommendation rules."""
from __future__ import annotations

import logging
from datetime import date, datetime, time
from typing import Any

from sqlalchemy import Engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import get_engine
from app.schemas.context import ContextSnapshot, Recommendation, UpcomingEvent
from app.services.decision_engine import Decision, DecisionEngine
from app.services.explainability_engine import ExplainabilityEngine

logger = logging.getLogger(__name__)


class ContextService:
    def __init__(self, engine: Engine | None = None, decision_engine: DecisionEngine | None = None, explainability_engine: ExplainabilityEngine | None = None) -> None:
        self._engine = engine if engine is not None else get_engine()
        self._decision_engine = decision_engine or DecisionEngine()
        self._explainability_engine = explainability_engine or ExplainabilityEngine()

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

        decision = self._decision_engine.decide(
            user=user,
            upcoming_events=events,
            weather=weather,
            wardrobe=wardrobe,
            budget=(user.get("budget_min"), user.get("budget_max")),
            preferred_style=user.get("preferred_style"),
        )
        recommendations = self._recommend(products, user, decision)
        recommendations = [
            recommendation.model_copy(update={"explanation": self._explainability_engine.generate(recommendation, decision, user, weather, events, wardrobe)})
            for recommendation in recommendations
        ]
        return ContextSnapshot(
            user={"id": str(user["id"]), "name": user.get("full_name") or "", "email": user.get("email")},
            weather={} if not weather else {"city": weather.get("city"), "temperature": weather.get("temperature"), "condition": weather.get("condition")},
            upcomingEvents=[self._event(row) for row in events],
            wardrobe=[self._json(row) for row in wardrobe],
            recommendations=recommendations,
            notifications=[self._json(row) for row in notifications],
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
        if isinstance(event_date, datetime):
            event_date = event_date.date()
        start = end = ""
        if isinstance(event_date, date):
            start = datetime.combine(event_date, time.min).isoformat()
            end = datetime.combine(event_date, time.max).isoformat()
        return UpcomingEvent(id=str(row["id"]), title=row.get("title"), startTime=start, endTime=end)

    @staticmethod
    def _json(row: dict[str, Any]) -> dict[str, Any]:
        return {
            key: value.isoformat() if isinstance(value, (date, datetime)) else str(value) if key == "id" else value
            for key, value in row.items()
        }

    def _recommend(self, products: list[dict[str, Any]], user: dict[str, Any], decision: Decision) -> list[Recommendation]:
        """Select in-budget products that fulfil the decision engine's need."""
        rules = {
            "Formal Outfit": lambda category, style, name: "formal" in style or category in {"footwear", "shirt", "pants"},
            "Ethnic Outfit": lambda category, style, name: "ethnic" in style or category in {"ethnic", "kurta", "saree"},
            "Travel Essentials": lambda category, style, name: "travel" in name or "outdoor" in style or category in {"bag", "footwear", "jacket"},
            "Rain Protection": lambda category, style, name: "waterproof" in name or category in {"footwear", "shoes"},
            "Summer Wear": lambda category, style, name: any(word in f"{name} {style}" for word in ("cotton", "linen", "breathable")),
            "Wardrobe Essentials": lambda category, style, name: True,
        }
        matches_need = rules[decision.predictedNeed]
        selected: list[dict[str, Any]] = []
        for product in products:
            price, minimum, maximum = product.get("price"), user.get("budget_min"), user.get("budget_max")
            if price is not None and ((minimum is not None and price < minimum) or (maximum is not None and price > maximum)):
                continue
            category = str(product.get("category") or "").lower()
            style = str(product.get("style") or "").lower()
            name = str(product.get("name") or "").lower()
            if matches_need(category, style, name):
                selected.append(product)
        return [
            Recommendation(
                id=str(product["id"]),
                title=str(product.get("name") or "Product recommendation"),
                reason=f"Supports your {decision.predictedNeed.lower()}.",
                confidence=decision.confidence,
                priority=decision.priority,
                reasons=decision.reasons,
            )
            for product in sorted(selected, key=lambda item: str(item.get("name") or ""))[:5]
        ]
