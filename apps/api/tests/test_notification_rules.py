from datetime import UTC, datetime, timedelta

from app.schemas.context import ContextSnapshot
from app.schemas.notification import Notification, NotificationPriority, NotificationType
from app.services.notification_rules import calendar_rules, weather_rules
from app.services.notification_service import NotificationService


def context(**values):
    return ContextSnapshot.model_validate(values)


def test_weather_rules_cover_rain_hot_cold_and_missing_weather():
    rainy = weather_rules(context(weather={"condition": "Rain", "temperature": 36, "rainProbability": 0.8}))
    assert {item.recommendation_context.weather for item in rainy} == {"rain", "hot"}
    assert weather_rules(context(weather={"temperature": 12}))
    assert weather_rules(context(weather=None)) == []


def test_calendar_rule_notifies_for_birthday_inside_window_and_skips_empty_events():
    notifications = calendar_rules(context(calendar={"events": [{"id": "birthday-1", "title": "Maya's Birthday", "daysRemaining": 2}]}))
    assert len(notifications) == 1
    assert notifications[0].priority is NotificationPriority.HIGH
    assert calendar_rules(context(calendar={"events": []})) == []


def test_service_isolates_broken_rules_deduplicates_and_sorts():
    now = datetime.now(UTC)
    low = Notification(id="same", title="old", message="", type=NotificationType.SYSTEM, priority=NotificationPriority.LOW, icon="", source="test", created_at=now)
    high = Notification(id="high", title="high", message="", type=NotificationType.SYSTEM, priority=NotificationPriority.HIGH, icon="", source="test", created_at=now)
    newer_duplicate = low.model_copy(update={"title": "new", "created_at": now + timedelta(seconds=1)})

    def broken(_: ContextSnapshot):
        raise RuntimeError("broken rule")

    def notifications(_: ContextSnapshot):
        return [low, high, newer_duplicate]

    result = NotificationService(rules=[broken, notifications]).generate_notifications(context())
    assert [item.id for item in result] == ["high", "same"]
    assert result[1].title == "new"
