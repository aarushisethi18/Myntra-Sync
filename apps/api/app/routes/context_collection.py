"""Authenticated API for automatic context signal collection."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.database import get_engine
from app.dependencies.auth import get_current_user
from app.services.auth_service import AuthenticatedUser
from app.services.context_collection_service import ContextCollectionService

router = APIRouter(tags=["live-context"])


class LocationInput(BaseModel):
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    city: str = "Delhi"
    state: str = "Delhi"
    country: str = "IN"
    timezone: str | None = None
    fallback: bool = False


@router.post("/context/live", summary="Collect and store the caller's live context")
def collect_live_context(location: LocationInput, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    location_fallback = location.fallback or location.latitude is None or location.longitude is None
    latitude = location.latitude if location.latitude is not None else 28.6139
    longitude = location.longitude if location.longitude is not None else 77.2090
    values = location.model_dump(exclude={"latitude", "longitude", "fallback"})
    if location_fallback:
        values.update({"city": values.get("city") or "Delhi", "state": values.get("state") or "Delhi", "country": values.get("country") or "IN"})
    return ContextCollectionService(get_engine()).collect(current_user.id, latitude, longitude, values, location_fallback)


@router.get("/context/live", summary="Return the caller's most recently stored live context")
def get_live_context(current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    return ContextCollectionService(get_engine()).cached(current_user.id) or {
        "location": {"city": "Delhi", "state": "Delhi", "country": "IN", "latitude": 28.6139, "longitude": 77.209, "locationFallback": True},
        "weather": {"temperature": None, "feelsLike": None, "humidity": None, "condition": "Unavailable", "icon": "", "rainProbability": None, "windSpeed": None},
        "calendar": {"events": []},
        "festival": None,
        "time": {},
    }
