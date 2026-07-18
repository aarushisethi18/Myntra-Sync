"""Deterministic, product-agnostic shopping-need prediction."""
from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
Priority = Literal["HIGH", "MEDIUM", "LOW"]


class Decision(BaseModel):
    predictedNeed: str
    priority: Priority
    confidence: float = Field(ge=0.0, le=1.0)
    reasons: list[str] = Field(default_factory=list)


class DecisionEngine:
    """Decides what is needed; it never selects a product."""

    def decide(
        self,
        user: dict[str, Any],
        upcoming_events: list[dict[str, Any]],
        weather: dict[str, Any] | None,
        wardrobe: list[dict[str, Any]],
        budget: tuple[int | None, int | None],
        preferred_style: str | None,
    ) -> Decision:
        event, need, event_reason = self._event_need(upcoming_events)
        weather_need, weather_reason = self._weather_need(weather)
        need = need or weather_need or "Wardrobe Essentials"
        reasons = [reason for reason in (event_reason, weather_reason) if reason]
        priority = self._event_priority(event) if event else ("MEDIUM" if weather_need else "LOW")

        missing = self._missing_essential(need, wardrobe)
        if missing:
            reasons.append(f"Wardrobe is missing {missing}")
            priority = self._raise_priority(priority)
        if preferred_style:
            reasons.append(f"Preferred style: {preferred_style}")
        if budget[1] is not None:
            reasons.append("Recommendations will stay within your budget")
        if not reasons:
            reasons.append("No time-sensitive need detected; prioritising wardrobe versatility")

        confidence = min(1.0, 0.55 + (0.25 if event else 0) + (0.10 if weather_need else 0) + (0.10 if missing else 0))
        logger.debug("Predicted need %s with %s priority for user %s", need, priority, user.get("id"))
        return Decision(predictedNeed=need, priority=priority, confidence=confidence, reasons=reasons)

    @staticmethod
    def _event_need(events: list[dict[str, Any]]) -> tuple[dict[str, Any] | None, str | None, str | None]:
        for event in events:
            text = f"{event.get('title', '')} {event.get('event_type', '')}".lower()
            if "interview" in text:
                return event, "Formal Outfit", "Upcoming interview requires a formal outfit"
            if any(term in text for term in ("wedding", "sangeet", "mehendi")):
                return event, "Ethnic Outfit", "Upcoming wedding event calls for ethnic wear"
            if any(term in text for term in ("trip", "travel", "vacation", "holiday")):
                return event, "Travel Essentials", "Upcoming trip needs travel-ready essentials"
        return None, None, None

    @staticmethod
    def _weather_need(weather: dict[str, Any] | None) -> tuple[str | None, str | None]:
        condition = str((weather or {}).get("condition") or "").lower()
        temperature = (weather or {}).get("temperature")
        if "rain" in condition:
            return "Rain Protection", "Current weather calls for rain protection"
        if isinstance(temperature, (int, float)) and temperature >= 30:
            return "Summer Wear", "Current weather is hot"
        return None, None

    @staticmethod
    def _event_priority(event: dict[str, Any] | None) -> Priority:
        event_date = (event or {}).get("event_date")
        if isinstance(event_date, datetime):
            event_date = event_date.date()
        if not isinstance(event_date, date):
            return "LOW"
        days_until = (event_date - date.today()).days
        return "HIGH" if days_until <= 7 else "MEDIUM" if days_until <= 30 else "LOW"

    @staticmethod
    def _missing_essential(need: str, wardrobe: list[dict[str, Any]]) -> str | None:
        categories = {str(item.get("category") or "").lower() for item in wardrobe}
        required = {
            "Formal Outfit": {"shirt", "pants", "footwear"},
            "Ethnic Outfit": {"ethnic", "kurta", "saree"},
            "Travel Essentials": {"footwear", "jacket", "bag"},
            "Rain Protection": {"footwear", "jacket"},
            "Summer Wear": {"shirt", "top", "dress"},
        }.get(need, set())
        missing = sorted(required - categories)
        return missing[0] if missing else None

    @staticmethod
    def _raise_priority(priority: Priority) -> Priority:
        return {"LOW": "MEDIUM", "MEDIUM": "HIGH", "HIGH": "HIGH"}[priority]
