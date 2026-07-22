"""Pure, side-effect-free rules for deriving notifications from live context."""
from __future__ import annotations

import hashlib
import logging
from datetime import UTC, datetime
from typing import Callable

from app.schemas.context import ContextSnapshot
from app.schemas.notification import (
    Notification,
    NotificationPriority,
    NotificationType,
    RecommendationContext,
)
from app.services.notification_config import NotificationRuleConfig

logger = logging.getLogger(__name__)
RuleFn = Callable[[ContextSnapshot], list[Notification]]


def score_priority(days_until_event: int | None, severity: str) -> NotificationPriority:
    """Apply one consistent urgency scale across all notification domains."""
    severity = severity.lower()
    if severity == "critical" or (days_until_event is not None and days_until_event <= 0):
        return NotificationPriority.CRITICAL
    if severity == "high" or (days_until_event is not None and days_until_event <= 2):
        return NotificationPriority.HIGH
    if severity == "medium" or (days_until_event is not None and days_until_event <= 7):
        return NotificationPriority.MEDIUM
    return NotificationPriority.LOW


def _notification_id(notification_type: NotificationType, source: str, *key_fields: object) -> str:
    payload = "|".join([notification_type.value, source, *(str(value).strip().lower() for value in key_fields)])
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _make_notification(
    *, notification_type: NotificationType, source: str, key_fields: tuple[object, ...],
    title: str, message: str, priority: NotificationPriority, icon: str,
    recommendation_context: RecommendationContext | None = None,
) -> Notification:
    return Notification(
        id=_notification_id(notification_type, source, *key_fields), title=title, message=message,
        type=notification_type, priority=priority, icon=icon, source=source,
        created_at=datetime.now(UTC), recommendation_context=recommendation_context,
    )


def weather_rules(context: ContextSnapshot) -> list[Notification]:
    try:
        weather = context.weather
        if not weather:
            logger.warning("weather_rules skipped: weather is unavailable")
            return []
        result: list[Notification] = []
        condition = str(weather.get("condition", "")).lower()
        rain_probability = weather.get("rainProbability")
        is_rain = "rain" in condition or (isinstance(rain_probability, (int, float)) and rain_probability >= NotificationRuleConfig.RAIN_PROB_THRESHOLD)
        if is_rain:
            result.append(_make_notification(notification_type=NotificationType.WEATHER, source="weather_rules", key_fields=("rain", datetime.now(UTC).date()), title="Rain-ready style", message="Rain is expected today—carry a light layer and choose water-friendly footwear.", priority=score_priority(None, "medium"), icon="cloud-rain", recommendation_context=RecommendationContext(weather="rain", category="rainwear", reason="Rainy conditions")))
        temperature = weather.get("temperature")
        if isinstance(temperature, (int, float)) and temperature >= NotificationRuleConfig.HOT_TEMP_C:
            result.append(_make_notification(notification_type=NotificationType.WEATHER, source="weather_rules", key_fields=("hot", datetime.now(UTC).date()), title="Hot day ahead", message=f"It is {temperature:g}°C—opt for breathable, lightweight styles.", priority=score_priority(None, "medium"), icon="sun", recommendation_context=RecommendationContext(weather="hot", category="summer wear", reason="High temperature")))
        if isinstance(temperature, (int, float)) and temperature <= NotificationRuleConfig.COLD_TEMP_C:
            result.append(_make_notification(notification_type=NotificationType.WEATHER, source="weather_rules", key_fields=("cold", datetime.now(UTC).date()), title="Cool weather alert", message=f"It is {temperature:g}°C—layer up before heading out.", priority=score_priority(None, "medium"), icon="cloud", recommendation_context=RecommendationContext(weather="cold", category="outerwear", reason="Low temperature")))
        return result
    except Exception:
        logger.exception("weather_rules failed")
        return []


def calendar_rules(context: ContextSnapshot) -> list[Notification]:
    try:
        events = (context.calendar or {}).get("events") or []
        if not events:
            logger.info("calendar_rules skipped: no calendar events")
            return []
        result: list[Notification] = []
        for event in events:
            title = str(event.get("title", "Upcoming event"))
            event_kind = f"{title} {event.get('type', '')}".lower()
            if "birthday" in event_kind:
                window, occasion = NotificationRuleConfig.BIRTHDAY_WINDOW_DAYS, "birthday"
            elif "wedding" in event_kind:
                window, occasion = NotificationRuleConfig.WEDDING_WINDOW_DAYS, "wedding"
            else:
                continue
            days = event.get("daysRemaining")
            if not isinstance(days, int):
                continue
            if 0 <= days <= window:
                result.append(_make_notification(notification_type=NotificationType.CALENDAR, source="calendar_rules", key_fields=(event.get("id", title), occasion, days), title=f"{title} is coming up", message=f"{title} is in {days} day{'s' if days != 1 else ''}. Plan your look early.", priority=score_priority(days, "medium"), icon="calendar", recommendation_context=RecommendationContext(occasion=occasion, category="ethnic wear" if occasion == "wedding" else None, reason=f"{title} in {days} days")))
        return result
    except Exception:
        logger.exception("calendar_rules failed")
        return []


def festival_rules(context: ContextSnapshot) -> list[Notification]:
    try:
        festival = context.festival
        if not festival:
            logger.info("festival_rules skipped: no upcoming festival")
            return []
        days = festival.get("daysRemaining")
        name = str(festival.get("name", "Upcoming festival"))
        if not isinstance(days, int) or not 0 <= days <= NotificationRuleConfig.FESTIVAL_WINDOW_DAYS:
            return []
        return [_make_notification(notification_type=NotificationType.FESTIVAL, source="festival_rules", key_fields=(name, days), title=f"{name} is near", message=f"{name} is in {days} day{'s' if days != 1 else ''}. Get festive-ready.", priority=score_priority(days, "medium"), icon="sparkles", recommendation_context=RecommendationContext(occasion="festival", category="ethnic wear", reason=f"{name} in {days} days"))]
    except Exception:
        logger.exception("festival_rules failed")
        return []


def wishlist_rules(context: ContextSnapshot) -> list[Notification]:
    return []


def order_history_rules(context: ContextSnapshot) -> list[Notification]:
    return []


DEFAULT_RULES: list[RuleFn] = [weather_rules, calendar_rules, festival_rules, wishlist_rules, order_history_rules]
