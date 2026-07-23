"""Contracts for the deliberately small Time Analytics API."""
from __future__ import annotations
from typing import Literal
from pydantic import AliasChoices, BaseModel, Field
AnalyticsEventType = Literal["PRODUCT_VIEW", "CATEGORY_VIEW", "BRAND_VIEW", "WISHLIST_ADD", "WISHLIST_REMOVE", "BAG_ADD", "BAG_REMOVE", "SEARCH", "PURCHASE", "SESSION_START", "SESSION_END"]
class AnalyticsEventInput(BaseModel):
    event_type: AnalyticsEventType = Field(validation_alias=AliasChoices("eventType", "event_type"))
    category: str | None = Field(default=None, max_length=120)
    brand: str | None = Field(default=None, max_length=120)
    color: str | None = Field(default=None, max_length=80)
    style: str | None = Field(default=None, max_length=120)
    occasion: str | None = Field(default=None, max_length=120)
    price: float | None = Field(default=None, ge=0)
    product_id: str | None = Field(default=None, max_length=128, validation_alias=AliasChoices("productId", "product_id"))
    duration_seconds: int | None = Field(default=None, ge=0, le=86_400, validation_alias=AliasChoices("durationSeconds", "duration_seconds"))
    session_id: str | None = Field(default=None, max_length=128, validation_alias=AliasChoices("sessionId", "session_id"))
    metadata: dict[str, object] = Field(default_factory=dict)
class AnalyticsItem(BaseModel): name: str; value: int
class AnalyticsSummary(BaseModel):
    topCategories: list[AnalyticsItem] = Field(default_factory=list)
    favoriteBrands: list[AnalyticsItem] = Field(default_factory=list)
    peakShoppingHour: str = "Still learning"
    shoppingStyle: str = "Casual Shopper"
    totalBrowsingTime: int = 0