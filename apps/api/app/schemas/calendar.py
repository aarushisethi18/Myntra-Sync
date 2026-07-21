"""Public, non-sensitive calendar API contracts."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class CalendarEvent(BaseModel):
    title: str
    start_time: datetime
    end_time: datetime
    days_remaining: int
    event_type: Literal["wedding", "interview", "birthday", "office", "travel", "college", "date", "festival", "general"]
    importance: Literal["High", "Medium", "Low"]
    location: str | None = None
    all_day: bool = False


class CalendarStatus(BaseModel):
    connected: bool
    email: str | None = None
    next_event: CalendarEvent | None = None
    event_count: int = 0


class CalendarConnectResponse(BaseModel):
    authorization_url: str
