"""Contracts for deterministic wishlist intelligence."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class BrandScore(BaseModel):
    brand: str
    score: float = Field(ge=0, le=1)


class CategoryScore(BaseModel):
    category: str
    score: float = Field(ge=0, le=1)


class PreferredBudget(BaseModel):
    min: int
    max: int


class WishlistActivity(BaseModel):
    firstSavedAt: datetime
    mostRecentSavedAt: datetime


class WishlistIntelligence(BaseModel):
    status: Literal["ok"]
    wishlistPersona: str
    wishlistSize: int = Field(gt=0)
    favoriteBrands: list[BrandScore]
    favoriteCategories: list[CategoryScore]
    preferredBudget: PreferredBudget
    favoriteStyles: list[str]
    favoriteColors: list[str]
    wishlistActivity: WishlistActivity
    recommendationReasons: list[str]


class EmptyWishlistIntelligence(BaseModel):
    status: Literal["empty"]
    message: str


WishlistIntelligenceResponse = WishlistIntelligence | EmptyWishlistIntelligence
