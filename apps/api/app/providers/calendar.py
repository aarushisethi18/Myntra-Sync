"""Calendar provider boundary for the context collection layer."""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, time
from typing import Any
import logging

from sqlalchemy import Engine, text
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)


class CalendarProvider(ABC):
    @abstractmethod
    def upcoming_events(self, user_id: str, after: datetime) -> list[dict[str, str]]:
        """Return normalized events after ``after`` for one user."""


class GoogleCalendarProvider(CalendarProvider):
    """Google adapter reserved for Ticket 009 OAuth and sync implementation."""

    def upcoming_events(self, user_id: str, after: datetime) -> list[dict[str, str]]:
        # There is intentionally no network call until OAuth consent/token storage exists.
        return []


class ManualCalendarProvider(CalendarProvider):
    """Reads manually maintained application events from the existing calendar store."""

    def __init__(self, engine: Engine | None = None, events: list[dict[str, str]] | None = None) -> None:
        self._engine = engine
        self._events = events

    def upcoming_events(self, user_id: str, after: datetime) -> list[dict[str, str]]:
        if self._events is not None:
            return [event for event in self._events if event.get("userId") == user_id and event.get("start", "") >= after.isoformat()]
        if self._engine is None:
            return []
        try:
            with self._engine.connect() as connection:
                rows = connection.execute(
                    text("""SELECT id, title, event_type, event_date, location
                            FROM calendar_events
                            WHERE user_id = :user_id AND event_date >= :today
                            ORDER BY event_date ASC"""),
                    {"user_id": user_id, "today": after.date()},
                ).mappings().all()
            return [self._normalize(row, after) for row in rows]
        except SQLAlchemyError:
            logger.exception("Manual calendar provider failed")
            return []

    @staticmethod
    def _normalize(row: Any, timezone: datetime) -> dict[str, str]:
        start = datetime.combine(row["event_date"], time.min, tzinfo=timezone.tzinfo)
        return {
            "id": str(row["id"]),
            "title": str(row["title"] or "Untitled event"),
            "type": str(row["event_type"] or ""),
            "location": str(row["location"] or ""),
            "start": start.isoformat(),
        }
