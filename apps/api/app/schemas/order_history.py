"""Contracts for explainable order-history intelligence."""
from __future__ import annotations

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


class OrderHistoryIntelligence(BaseModel):
    status: Literal["ok"]
    shoppingPersona: str
    favoriteBrands: list[BrandScore]
    favoriteCategories: list[CategoryScore]
    preferredBudget: PreferredBudget
    averageSpend: int
    shoppingFrequencyDays: int | None
    preferredSizes: dict[str, str]
    returnRate: float = Field(ge=0, le=1)
    recommendationReasons: list[str]


class InsufficientOrderHistory(BaseModel):
    status: Literal["insufficient_data"]
    ordersAnalyzed: int
    minimumRequired: int


OrderHistoryResponse = OrderHistoryIntelligence | InsufficientOrderHistory
