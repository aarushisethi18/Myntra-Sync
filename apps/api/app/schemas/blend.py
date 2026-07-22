"""Contracts for the Blend collaboration experience."""
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
    people: list[dict[str, Any]]
    score: int
    breakdown: list[dict[str, Any]]
    reasons: list[str]
    styleDna: list[dict[str, Any]]
    sharedDna: list[dict[str, Any]]
    palette: list[dict[str, str]]
    moodboard: dict[str, Any]
    outfits: list[dict[str, Any]]
    insights: list[dict[str, str]]
