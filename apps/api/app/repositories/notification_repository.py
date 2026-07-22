"""Postgres-backed notification storage behind a small application protocol."""
from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Protocol

from sqlalchemy import Engine, text

from app.schemas.notification import Notification, NotificationPriority, NotificationType


class NotificationRepository(Protocol):
    def save_many(self, notifications: list[Notification]) -> None: ...
    def get_for_user(self, user_id: str, *, type: NotificationType | None = None, priority: NotificationPriority | None = None, unread_only: bool = False, limit: int = 20, offset: int = 0) -> list[Notification]: ...
    def count_for_user(self, user_id: str, *, type: NotificationType | None = None, priority: NotificationPriority | None = None, unread_only: bool = False) -> int: ...
    def mark_as_read(self, notification_id: str, user_id: str) -> None: ...
    def delete_expired(self) -> int: ...


class SqlAlchemyNotificationRepository:
    """Repository whose constructor binds write operations to one authenticated user."""
    def __init__(self, engine: Engine | None, user_id: str | None = None) -> None:
        self._engine = engine
        self._user_id = user_id

    def save_many(self, notifications: list[Notification]) -> None:
        if not notifications or self._engine is None or self._user_id is None:
            return
        statement = text("""INSERT INTO notifications
            (id, user_id, title, message, type, priority, icon, source, action_json, metadata_json, read, created_at, updated_at)
            VALUES (:id, :user_id, :title, :message, :type, :priority, :icon, :source, CAST(:action_json AS jsonb), CAST(:metadata_json AS jsonb), :read, :created_at, NOW())
            ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, message=EXCLUDED.message, type=EXCLUDED.type,
                priority=EXCLUDED.priority, icon=EXCLUDED.icon, source=EXCLUDED.source, action_json=EXCLUDED.action_json,
                metadata_json=EXCLUDED.metadata_json, created_at=EXCLUDED.created_at, updated_at=NOW()
            WHERE notifications.user_id = EXCLUDED.user_id""")
        params = []
        for item in notifications:
            metadata = dict(item.metadata)
            if item.recommendation_context is not None:
                metadata["recommendation_context"] = item.recommendation_context.model_dump()
            params.append({"id": item.id, "user_id": self._user_id, "title": item.title, "message": item.message, "type": item.type.value, "priority": item.priority.value, "icon": item.icon, "source": item.source, "action_json": json.dumps(item.action.model_dump() if item.action else None), "metadata_json": json.dumps(metadata), "read": item.read, "created_at": item.created_at})
        with self._engine.begin() as connection:
            connection.execute(statement, params)

    def get_for_user(self, user_id: str, **filters: object) -> list[Notification]:
        if self._engine is None:
            return []
        clause, params = self._where(user_id, **filters)
        params.update({"limit": int(filters.get("limit", 20)), "offset": int(filters.get("offset", 0))})
        query = text(f"""SELECT * FROM notifications {clause}
            ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC
            LIMIT :limit OFFSET :offset""")
        with self._engine.connect() as connection:
            rows = connection.execute(query, params).mappings().all()
        return [self._to_notification(row) for row in rows]

    def count_for_user(self, user_id: str, **filters: object) -> int:
        if self._engine is None:
            return 0
        clause, params = self._where(user_id, **filters)
        with self._engine.connect() as connection:
            return int(connection.execute(text(f"SELECT count(*) FROM notifications {clause}"), params).scalar_one())

    def mark_as_read(self, notification_id: str, user_id: str) -> None:
        if self._engine is None:
            return
        with self._engine.begin() as connection:
            connection.execute(text("UPDATE notifications SET read=TRUE, updated_at=NOW() WHERE id=:id AND user_id=:user_id"), {"id": notification_id, "user_id": user_id})

    def delete_expired(self) -> int:
        if self._engine is None:
            return 0
        with self._engine.begin() as connection:
            return int(connection.execute(text("DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < :now"), {"now": datetime.now(UTC)}).rowcount or 0)

    @staticmethod
    def _where(user_id: str, **filters: object) -> tuple[str, dict[str, object]]:
        terms = ["user_id = :user_id"]
        params: dict[str, object] = {"user_id": user_id}
        if filters.get("type") is not None:
            terms.append("type = :type")
            value = filters["type"]
            params["type"] = value.value if isinstance(value, NotificationType) else value
        if filters.get("priority") is not None:
            terms.append("priority = :priority")
            value = filters["priority"]
            params["priority"] = value.value if isinstance(value, NotificationPriority) else value
        if filters.get("unread_only"):
            terms.append("read = FALSE")
        return "WHERE " + " AND ".join(terms), params

    @staticmethod
    def _to_notification(row: object) -> Notification:
        values = dict(row)
        metadata = values.get("metadata_json") or {}
        recommendation_context = metadata.pop("recommendation_context", None)
        return Notification(id=values["id"], title=values["title"], message=values["message"], type=values["type"], priority=values["priority"], icon=values["icon"], source=values["source"], action=values.get("action_json"), metadata=metadata, recommendation_context=recommendation_context, read=values["read"], created_at=values["created_at"])
