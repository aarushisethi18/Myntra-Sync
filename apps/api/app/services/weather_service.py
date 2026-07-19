"""OpenWeather integration with safe, short-lived in-memory caching."""
from __future__ import annotations

import json
import logging
import os
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode
from urllib.request import urlopen

logger = logging.getLogger(__name__)


class WeatherService:
    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or os.getenv("OPENWEATHER_API_KEY", "")
        self._cache: dict[tuple[float, float], tuple[datetime, dict[str, object]]] = {}

    def get_current(self, latitude: float, longitude: float) -> dict[str, object] | None:
        key = (round(latitude, 2), round(longitude, 2))
        cached = self._cache.get(key)
        if cached and datetime.now(UTC) - cached[0] < timedelta(minutes=20):
            return cached[1]
        if not self._api_key:
            logger.warning("Weather collector skipped: OPENWEATHER_API_KEY missing")
            return cached[1] if cached else None
        try:
            params = urlencode({"lat": latitude, "lon": longitude, "appid": self._api_key, "units": "metric"})
            with urlopen(f"https://api.openweathermap.org/data/2.5/weather?{params}", timeout=5) as response:
                payload = json.load(response)
            weather = (payload.get("weather") or [{}])[0]
            normalized = {
                "temperature": payload.get("main", {}).get("temp"),
                "feelsLike": payload.get("main", {}).get("feels_like"),
                "humidity": payload.get("main", {}).get("humidity"),
                "condition": weather.get("main", "Unknown"),
                "icon": weather.get("icon", ""),
                "windSpeed": payload.get("wind", {}).get("speed"),
                "rainProbability": None,
                # Current Weather includes the resolved locality for the supplied
                # coordinates.  State is not reliably provided by this endpoint.
                "location": {
                    "city": payload.get("name") or "",
                    "country": payload.get("sys", {}).get("country") or "",
                },
            }
            self._cache[key] = (datetime.now(UTC), normalized)
            return normalized
        except Exception:
            logger.exception("Weather collector failed")
            return cached[1] if cached else None

    @property
    def configured(self) -> bool:
        return bool(self._api_key)
