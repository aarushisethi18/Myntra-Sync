from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class UpcomingEvent(BaseModel):
    id: str
    title: str | None = None
    startTime: str
    endTime: str


class Recommendation(BaseModel):
    id: str
    title: str
    reason: str
    confidence: float
    priority: Literal["HIGH", "MEDIUM", "LOW"]
    reasons: list[str] = Field(default_factory=list)
    explanation: str = ""


class ContextSnapshot(BaseModel):
    """The existing frontend contract for GET /context."""
    user: dict[str, Any] = Field(default_factory=dict)
    weather: dict[str, Any] = Field(default_factory=dict)
    upcomingEvents: list[UpcomingEvent] = Field(default_factory=list)
    wardrobe: list[dict[str, Any]] = Field(default_factory=list)
    recommendations: list[Recommendation] = Field(default_factory=list)
    notifications: list[dict[str, Any]] = Field(default_factory=list)
    # Live-context fields are optional here so the legacy /context response keeps
    # its existing shape while notification rules can consume a full snapshot.
    location: dict[str, Any] | None = None
    calendar: dict[str, Any] | None = None
    festival: dict[str, Any] | None = None
    time: dict[str, Any] | None = None
