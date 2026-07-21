"""Collect, normalize, persist, and return live contextual signals only."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import Engine, inspect, text

from app.providers.calendar import CalendarProvider, GoogleCalendarProvider, ManualCalendarProvider
from app.services.festival_service import FestivalService
from app.services.weather_service import WeatherService

logger = logging.getLogger(__name__)

_WEATHER_SERVICE = WeatherService()
_FESTIVAL_SERVICE = FestivalService()


class ContextCollectionService:
    def __init__(
        self,
        engine: Engine | None,
        weather_service: WeatherService | None = None,
        festival_service: FestivalService | None = None,
        calendar_providers: list[CalendarProvider] | None = None,
    ) -> None:
        self._engine = engine
        # These services are shared by requests so weather's short-lived cache
        # remains effective across the 15-minute client refresh cadence.
        self._weather = weather_service or _WEATHER_SERVICE
        self._festivals = festival_service or _FESTIVAL_SERVICE
        self._calendar_providers = calendar_providers or [ManualCalendarProvider(engine), GoogleCalendarProvider()]

    def collect(
        self,
        user_id: str,
        latitude: float,
        longitude: float,
        location: dict[str, str],
        location_fallback: bool,
    ) -> dict[str, Any]:
        now = self._now(location.get("timezone"))
        warnings: list[str] = []

        try:
            weather = self._weather.get_current(latitude, longitude)
        except Exception:
            logger.exception("Weather collector failed")
            weather = None

        if weather is None:
            weather = self._cached_weather(user_id)

        if weather is None and not self._weather.configured:
            warnings.append("OPENWEATHER_API_KEY missing")

        resolved_location = dict(location)
        weather_location = weather.get("location", {}) if weather else {}

        # Keep provider-only geocoding metadata out of the public weather shape
        weather = (
            None
            if weather is None
            else {key: value for key, value in weather.items() if key != "location"}
        )

        if not resolved_location.get("city"):
            resolved_location["city"] = str(
                weather_location.get("city") or ("Delhi" if location_fallback else "")
            )

        if not resolved_location.get("country"):
            resolved_location["country"] = str(
                weather_location.get("country") or ("IN" if location_fallback else "")
            )

        country = location.get("country") or "IN"

        try:
            festival = self._festivals.upcoming(
                city=resolved_location.get("city"),
                district=resolved_location.get("district"),
                state=resolved_location.get("state"),
                country=resolved_location.get("country") or country,
                current_date=now.date(),
            )
        except Exception:
            logger.exception("Festival collector failed")
            festival = None

        events: list[dict[str, str]] = []

        for provider in self._calendar_providers:
            try:
                events.extend(provider.upcoming_events(user_id, now))
            except Exception:
                logger.exception(
                    "Calendar provider failed: %s",
                    type(provider).__name__,
                )

        snapshot = {
            "location": {
                **resolved_location,
                "latitude": latitude,
                "longitude": longitude,
                "locationFallback": location_fallback,
            },
            "weather": weather,
            "calendar": {"events": events},
            "festival": festival,
            "time": {
                "currentTime": now.isoformat(),
                "day": now.strftime("%A"),
                "month": now.strftime("%B"),
                "season": self._season(now.month),
            },
        }

        if warnings:
            snapshot["warning"] = warnings[0]
            snapshot["warnings"] = warnings

        self._persist(user_id, snapshot)
        return snapshot

    def cached(self, user_id: str) -> dict[str, Any] | None:
        if self._engine is None:
            return None
        try:
            with self._engine.connect() as connection:
                row = connection.execute(text("SELECT * FROM user_context WHERE user_id = :user_id"), {"user_id": user_id}).mappings().first()
            if not row:
                return None
            now = datetime.now().astimezone()
            festival = None if not row["current_festival"] else {"name": row["current_festival"], "daysRemaining": row["festival_days_remaining"]}
            return {"location": {"city": row["city"] or "Delhi", "state": row["state"] or "Delhi", "country": row["country"] or "IN", "latitude": row["latitude"], "longitude": row["longitude"], "locationFallback": False}, "weather": {"temperature": row["temperature"], "condition": row["weather_condition"] or "Unknown", "humidity": row["humidity"], "windSpeed": row["wind_speed"], "icon": ""}, "calendar": {"events": []}, "festival": festival, "time": {"currentTime": now.isoformat(), "day": now.strftime("%A"), "month": now.strftime("%B"), "season": row["current_season"] or self._season(now.month)}}
        except Exception:
            logger.exception("Cached context lookup failed")
            return None

    def _cached_weather(self, user_id: str) -> dict[str, object] | None:
        cached = self.cached(user_id)
        return cached["weather"] if cached else None

    def _persist(self, user_id: str, snapshot: dict[str, Any]) -> None:
        if self._engine is None:
            logger.warning("Database persistence skipped: database engine is unavailable")
            return
        try:
            table_exists = inspect(self._engine).has_table("user_context", schema="public")
        except Exception:
            logger.exception("Database persistence failed while checking user_context")
            return
        if not table_exists:
            logger.error("Database persistence skipped: user_context table is missing; apply database/migrations/007_user_context.sql")
            return
        location, weather, festival, time_data = snapshot["location"], snapshot["weather"] or {}, snapshot["festival"] or {}, snapshot["time"]
        statement = text("""INSERT INTO user_context (user_id, latitude, longitude, city, state, country, temperature, weather_condition, humidity, wind_speed, current_season, current_festival, festival_days_remaining, updated_at)
            VALUES (:user_id, :latitude, :longitude, :city, :state, :country, :temperature, :condition, :humidity, :wind_speed, :season, :festival, :festival_days, NOW())
            ON CONFLICT (user_id) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, city = EXCLUDED.city, state = EXCLUDED.state, country = EXCLUDED.country, temperature = EXCLUDED.temperature, weather_condition = EXCLUDED.weather_condition, humidity = EXCLUDED.humidity, wind_speed = EXCLUDED.wind_speed, current_season = EXCLUDED.current_season, current_festival = EXCLUDED.current_festival, festival_days_remaining = EXCLUDED.festival_days_remaining, updated_at = NOW()""")
        try:
            with self._engine.begin() as connection:
                connection.execute(statement, {"user_id": user_id, "latitude": location["latitude"], "longitude": location["longitude"], "city": location.get("city"), "state": location.get("state"), "country": location.get("country"), "temperature": weather.get("temperature"), "condition": weather.get("condition"), "humidity": weather.get("humidity"), "wind_speed": weather.get("windSpeed"), "season": time_data["season"], "festival": festival.get("name"), "festival_days": festival.get("daysRemaining")})
        except Exception:
            logger.exception("Database persistence failed; apply database/migrations/007_user_context.sql if user_context is missing")
            return

    @staticmethod
    def _season(month: int) -> str:
        return "Winter" if month in {12, 1, 2} else "Summer" if month in {3, 4, 5, 6} else "Monsoon" if month in {7, 8, 9} else "Autumn"

    @staticmethod
    def _now(timezone: str | None) -> datetime:
        if timezone:
            try:
                return datetime.now(ZoneInfo(timezone))
            except ZoneInfoNotFoundError:
                pass
        return datetime.now().astimezone()
