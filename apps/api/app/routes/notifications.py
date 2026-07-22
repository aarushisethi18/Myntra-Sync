"""Authenticated read and read-state APIs for proactive notifications."""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.database import get_engine
from app.dependencies.auth import get_current_user
from app.repositories.notification_repository import SqlAlchemyNotificationRepository
from app.schemas.context import ContextSnapshot
from app.schemas.notification import NotificationListResponse, NotificationPriority, NotificationType
from app.services.auth_service import AuthenticatedUser
from app.services.context_collection_service import ContextCollectionService
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=NotificationListResponse)
def get_notifications(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    type: NotificationType | None = None,
    priority: NotificationPriority | None = None,
    unread_only: bool = False,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> NotificationListResponse:
    repository = SqlAlchemyNotificationRepository(get_engine(), current_user.id)
    try:
        existing = repository.get_for_user(current_user.id, type=type, priority=priority, unread_only=unread_only, limit=limit, offset=offset)
        total = repository.count_for_user(current_user.id, type=type, priority=priority, unread_only=unread_only)
    except Exception:
        logger.exception("Notification repository read failed")
        return NotificationListResponse(count=0, total=0, notifications=[])

    # Refresh only an empty user feed, using the stored context to avoid new
    # weather/calendar requests. Subsequent GETs preserve persisted read state.
    if total == 0:
        cached_context = ContextCollectionService(get_engine()).cached(current_user.id)
        if cached_context:
            NotificationService(repository=repository).generate_and_save(ContextSnapshot.model_validate(cached_context))
            try:
                existing = repository.get_for_user(current_user.id, type=type, priority=priority, unread_only=unread_only, limit=limit, offset=offset)
                total = repository.count_for_user(current_user.id, type=type, priority=priority, unread_only=unread_only)
            except Exception:
                logger.exception("Notification repository refresh failed")
    return NotificationListResponse(count=len(existing), total=total, notifications=existing)


@router.patch("/notifications/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_notification_read(notification_id: str, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]) -> None:
    try:
        SqlAlchemyNotificationRepository(get_engine()).mark_as_read(notification_id, current_user.id)
    except Exception as error:
        logger.exception("Notification read-state update failed")
        raise HTTPException(status_code=503, detail="Notification storage is unavailable.") from error
