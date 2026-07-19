"""Request and response contracts for implicit behavior learning."""
from __future__ import annotations

from decimal import Decimal
from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, Field

BehaviorEventType = Literal[
    "PRODUCT_VIEW", "PRODUCT_CLICK", "PRODUCT_DWELL", "WISHLIST_ADD", "WISHLIST_REMOVE",
    "ADD_TO_CART", "REMOVE_FROM_CART", "PURCHASE", "SEARCH", "CATEGORY_OPEN", "BRAND_OPEN",
    "COLOR_FILTER", "STYLE_FILTER", "FABRIC_FILTER", "HOME_SECTION_CLICK", "RECOMMENDATION_CLICK",
    "RECOMMENDATION_IGNORE",
]


class BehaviorEventInput(BaseModel):
    # Accept the public camelCase contract while handing services canonical
    # snake_case fields.  This keeps persistence code independent of HTTP.
    event_type: BehaviorEventType = Field(validation_alias=AliasChoices("eventType", "event_type"))
    event_id: str | None = Field(default=None, max_length=128, validation_alias=AliasChoices("eventId", "event_id"))
    product_id: str | None = Field(default=None, max_length=128, validation_alias=AliasChoices("productId", "product_id"))
    brand: str | None = Field(default=None, max_length=120)
    category: str | None = Field(default=None, max_length=120)
    color: str | None = Field(default=None, max_length=80)
    fabric: str | None = Field(default=None, max_length=80)
    fit: str | None = Field(default=None, max_length=80)
    style: str | None = Field(default=None, max_length=120)
    occasion: str | None = Field(default=None, max_length=120)
    price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    metadata: dict[str, Any] = Field(default_factory=dict)


class FashionDnaResponse(BaseModel):
    brandAffinity: list[dict[str, Any]] = Field(default_factory=list)
    categoryAffinity: list[dict[str, Any]] = Field(default_factory=list)
    colorAffinity: list[dict[str, Any]] = Field(default_factory=list)
    fabricAffinity: list[dict[str, Any]] = Field(default_factory=list)
    fitAffinity: list[dict[str, Any]] = Field(default_factory=list)
    styleAffinity: list[dict[str, Any]] = Field(default_factory=list)
    occasionAffinity: list[dict[str, Any]] = Field(default_factory=list)
    budgetRange: dict[str, float | None] = Field(default_factory=lambda: {"min": None, "max": None})
    trendScore: float = 0
    experimentationScore: float = 0
    preferredSeason: str | None = None
