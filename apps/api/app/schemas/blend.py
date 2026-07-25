"""Pydantic contracts for the Blend collaboration experience."""
from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class CreateBlendResponse(BaseModel):
    id: str
    inviteCode: str
    inviteUrl: str
    status: str


class JoinBlendResponse(BaseModel):
    id: str
    status: str


class BlendResult(BaseModel):
    sessionId: str
    score: int
    blendName: str = ""
    blendDescription: str = ""
    people: list[dict[str, Any]]
    breakdown: list[dict[str, Any]]
    reasons: list[str]
    whyYouMatch: list[str] = Field(default_factory=list)
    styleDna: list[dict[str, Any]]
    sharedDna: list[dict[str, Any]]
    palette: list[dict[str, str]]
    moodboard: dict[str, Any]
    outfits: list[dict[str, Any]]
    insights: list[dict[str, str]]
    sharedWishlist: list[dict[str, Any]] = Field(default_factory=list)
    updatedAt: str = ""


class BlendSessionSummary(BaseModel):
    id: str
    inviteCode: str
    status: str
    blendName: str | None = None
    blendDescription: str | None = None
    compatibilityScore: int | None = None
    partnerName: str | None = None
    createdAt: str
    lastOpenedAt: str | None = None
    lastComputedAt: str | None = None


class SharedClosetItem(BaseModel):
    id: str
    sessionId: str
    productId: str | None = None
    productSnapshot: dict[str, Any]
    occasion: str | None = None
    occasionType: str | None = None
    occasionLabel: str | None = None
    notes: str | None = None
    savedBy: str
    savedByName: str | None = None
    createdAt: str


class SaveClosetRequest(BaseModel):
    productId: str | None = None
    productSnapshot: dict[str, Any] = Field(default_factory=dict)
    occasion: str | None = None
    occasionType: str | None = None
    occasionLabel: str | None = None
    notes: str | None = None


class MoreLooksRequest(BaseModel):
    excludeProductIds: list[str] = Field(default_factory=list)
    occasion: str | None = None


class OutfitVote(BaseModel):
    id: str
    sessionId: str
    outfitKey: str
    userId: str
    userName: str | None = None
    vote: str
    createdAt: str
    updatedAt: str


class VoteRequest(BaseModel):
    outfitKey: str
    vote: str  # 'love' | 'wear_soon' | 'skip'


class SharedWishlistItem(BaseModel):
    id: str
    sessionId: str
    productId: str | None = None
    productSnapshot: dict[str, Any]
    aiReason: str | None = None
    createdAt: str


class TwinLookResponse(BaseModel):
    outfitKey: str
    lookA: dict[str, Any]
    lookB: dict[str, Any]
