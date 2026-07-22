"""Authenticated API for automatic context signal collection."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
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


class ContextOverrideInput(BaseModel):
    city: str = "Delhi"
    state: str = "Delhi"
    country: str = "IN"
    temperature: float = 25.0
    weather_condition: str = "Sunny"
    current_season: str = "Summer"
    current_festival: str | None = None
    festival_days_remaining: int | None = None
    event_title: str | None = None
    event_type: str | None = None


@router.post("/context/live/override", summary="Override user context for demo purposes")
def override_live_context(body: ContextOverrideInput, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="Database connection is unavailable.")
    try:
        with engine.begin() as conn:
            # 1. Update user_context
            conn.execute(text("""
                INSERT INTO user_context (
                    user_id, latitude, longitude, city, state, country, 
                    temperature, weather_condition, humidity, wind_speed, 
                    current_season, current_festival, festival_days_remaining, updated_at
                ) VALUES (
                    :user_id, 28.6139, 77.2090, :city, :state, :country, 
                    :temperature, :condition, 60.0, 5.0, 
                    :season, :festival, :festival_days, NOW()
                )
                ON CONFLICT (user_id) DO UPDATE SET 
                    city = EXCLUDED.city,
                    state = EXCLUDED.state,
                    country = EXCLUDED.country,
                    temperature = EXCLUDED.temperature,
                    weather_condition = EXCLUDED.weather_condition,
                    current_season = EXCLUDED.current_season,
                    current_festival = EXCLUDED.current_festival,
                    festival_days_remaining = EXCLUDED.festival_days_remaining,
                    updated_at = NOW()
            """), {
                "user_id": current_user.id,
                "city": body.city,
                "state": body.state,
                "country": body.country,
                "temperature": body.temperature,
                "condition": body.weather_condition,
                "season": body.current_season,
                "festival": body.current_festival,
                "festival_days": body.festival_days_remaining
            })
            
            # 2. Update calendar events (delete old ones and insert new one if title is provided)
            conn.execute(text("DELETE FROM public.calendar_events WHERE user_id = :user_id"), {"user_id": current_user.id})
            if body.event_title:
                conn.execute(text("""
                    INSERT INTO public.calendar_events (user_id, title, event_type, event_date, location)
                    VALUES (:user_id, :title, :event_type, CURRENT_DATE, :location)
                """), {
                    "user_id": current_user.id,
                    "title": body.event_title,
                    "event_type": body.event_type or "Social",
                    "location": body.city
                })
        return {"status": "success"}
    except Exception as error:
        logger.exception("Failed to override context")
        raise HTTPException(status_code=500, detail="Could not override context.") from error

