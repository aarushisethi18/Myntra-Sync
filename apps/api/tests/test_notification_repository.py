from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

from app.repositories.notification_repository import SqlAlchemyNotificationRepository
from app.schemas.notification import Notification, NotificationPriority, NotificationType


def sample_notification() -> Notification:
    return Notification(id="deterministic", title="Title", message="Message", type=NotificationType.SYSTEM, priority=NotificationPriority.LOW, icon="bell", source="test", created_at=datetime.now(UTC))


def test_save_many_uses_deterministic_id_upsert():
    engine, connection = MagicMock(), MagicMock()
    engine.begin.return_value.__enter__.return_value = connection
    repository = SqlAlchemyNotificationRepository(engine, "00000000-0000-0000-0000-000000000001")
    repository.save_many([sample_notification()])
    statement, params = connection.execute.call_args.args
    assert "ON CONFLICT (id) DO UPDATE" in statement.text
    assert params[0]["id"] == "deterministic"


def test_mark_as_read_is_scoped_to_user_and_delete_expired_uses_expiry():
    engine, connection = MagicMock(), MagicMock()
    engine.begin.return_value.__enter__.return_value = connection
    connection.execute.return_value.rowcount = 1
    repository = SqlAlchemyNotificationRepository(engine)
    repository.mark_as_read("notice", "user-a")
    mark_statement, mark_params = connection.execute.call_args.args
    assert "id=:id AND user_id=:user_id" in mark_statement.text
    assert mark_params == {"id": "notice", "user_id": "user-a"}
    assert repository.delete_expired() == 1
    expire_statement = connection.execute.call_args.args[0]
    assert "expires_at IS NOT NULL AND expires_at <" in expire_statement.text
