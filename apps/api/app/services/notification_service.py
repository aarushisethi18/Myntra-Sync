"""Orchestrates rule execution without knowing about persistence implementation."""
from __future__ import annotations

import logging
from collections.abc import Callable

from app.schemas.context import ContextSnapshot
from app.schemas.notification import Notification, NotificationPriority
from app.services.notification_config import NotificationRuleConfig
from app.services.notification_rules import DEFAULT_RULES, RuleFn

logger = logging.getLogger(__name__)
_PRIORITY_RANK = {NotificationPriority.CRITICAL: 0, NotificationPriority.HIGH: 1, NotificationPriority.MEDIUM: 2, NotificationPriority.LOW: 3}


def notification_sort_key(notification: Notification) -> tuple[int, float]:
    """Sort urgent notifications first, then newest notifications."""
    return (_PRIORITY_RANK[notification.priority], -notification.created_at.timestamp())


class NotificationService:
    def __init__(self, rules: list[RuleFn] | None = None, repository: object | None = None) -> None:
        self.rules = rules or DEFAULT_RULES
        self.repository = repository

    def generate_notifications(self, context: ContextSnapshot) -> list[Notification]:
        generated: list[Notification] = []
        for rule in self.rules:
            rule_name = getattr(rule, "__name__", type(rule).__name__)
            try:
                produced = rule(context)
                logger.info("notification rule completed", extra={"rule": rule_name, "produced": len(produced)})
                generated.extend(produced)
            except Exception:
                logger.exception("notification rule failed", extra={"rule": rule_name})
        deduplicated = {notification.id: notification for notification in generated}
        # Dict assignment retains the most recently created version of an ID.
        for notification in generated:
            existing = deduplicated.get(notification.id)
            if existing is None or notification.created_at > existing.created_at:
                deduplicated[notification.id] = notification
        ordered = sorted(deduplicated.values(), key=notification_sort_key)
        result = ordered[:NotificationRuleConfig.MAX_NOTIFICATIONS]
        logger.info("notification generation completed", extra={"total": len(generated), "after_dedup": len(deduplicated), "returned": len(result)})
        return result
