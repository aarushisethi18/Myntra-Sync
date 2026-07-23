"""API and service-layer schemas for proactive notifications."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class NotificationType(str, Enum):
    WEATHER = "weather"
    FESTIVAL = "festival"
    CALENDAR = "calendar"
    WISHLIST = "wishlist"
    SALE = "sale"
    STYLE = "style"
    WARDROBE = "wardrobe"
    BUDGET = "budget"
    SYSTEM = "system"


class NotificationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class NotificationAction(BaseModel):
    label: str
    deep_link: str | None = None
    cta_type: Literal["navigate", "external", "none"] = "navigate"


class RecommendationContext(BaseModel):
    occasion: str | None = None
    weather: str | None = None
    category: str | None = None
    reason: str | None = None


class Notification(BaseModel):
    id: str
    title: str
    message: str
    type: NotificationType
    priority: NotificationPriority
    icon: str
    source: str
    action: NotificationAction | None = None
    created_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)
    recommendation_context: RecommendationContext | None = None
    read: bool = False


class NotificationListResponse(BaseModel):
    count: int
    total: int
    notifications: list[Notification]
