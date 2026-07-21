"""Festival lookup backed by a versioned local data set."""
from __future__ import annotations

import json
import logging
import os
from datetime import date
from importlib.metadata import version
from pathlib import Path

from google import genai

logger = logging.getLogger(__name__)

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
_GEMINI_MODEL = "gemini-flash-latest"
logger.info(
    "Gemini configuration: api_key_prefix=%s sdk_version=%s model=%s",
    (_GEMINI_API_KEY or "")[:8],
    version("google-genai"),
    _GEMINI_MODEL,
)

client = genai.Client(
    api_key=_GEMINI_API_KEY
)


class FestivalService:
    def __init__(self, dataset_path: Path | None = None) -> None:
        path = dataset_path or Path(__file__).with_name("festival_data.json")

        self._festivals: list[dict[str, object]] = json.loads(
            path.read_text(encoding="utf-8")
        )

    def _get_ai_festivals(
        self,
        city: str | None,
        district: str | None,
        state: str | None,
        country: str,
        current_date: date,
    ) -> dict[str, object] | None:
        logger.info("Inside _get_ai_festivals()")
        try:
            country_name = "India" if country.upper() == "IN" else country

            prompt = f"""
You are an expert on festivals, public holidays, cultural celebrations and regional events.

Today's date: {current_date.isoformat()}

User Location:
City: {city or "Unknown"}
District: {district or city or "Unknown"}
State: {state or "Unknown"}
Country: {country_name}

Return ONLY valid JSON.

Schema:
{{
  "name": "",
  "daysRemaining": 0,
  "priority": 100
}}

Rules:
- Consider national festivals.
- Consider state festivals.
- Consider district festivals.
- Consider city festivals.
- Consider major cultural events happening today or soon.
- If multiple events exist, choose the most important one.
- Return ONLY JSON.
"""

            logger.info("Before Gemini generate_content(): model=%s", _GEMINI_MODEL)

            response = client.models.generate_content(
                model=_GEMINI_MODEL,
                contents=prompt,
            )

            logger.info("After Gemini generate_content()")

            print("=" * 60)
            print("GEMINI RESPONSE")
            print(response.text)
            print("=" * 60)

            text = response.text.strip()

            # Remove markdown code fences if Gemini returns them
            if text.startswith("```"):
                text = text.split("\n", 1)[1]
                text = text.rsplit("```", 1)[0]

                if text.startswith("json"):
                    text = text[4:].strip()

            return json.loads(text)

        except Exception as e:
            logger.exception("Gemini festival lookup failed")

            print("=" * 60)
            print("GEMINI ERROR")
            print(type(e).__name__)
            print(str(e))
            print("=" * 60)

            return None

    def upcoming(
        self,
        city: str | None,
        district: str | None,
        state: str | None,
        country: str,
        current_date: date,
    ) -> dict[str, object] | None:
        logger.info("Inside FestivalService.upcoming()")

        # Try Gemini first
        ai_result = self._get_ai_festivals(
            city=city,
            district=district,
            state=state,
            country=country,
            current_date=current_date,
        )

        if ai_result:
            logger.info("Using Gemini festival response")
            return ai_result

        logger.warning("Fallback JSON is used: falling back to local festival JSON")

        # Local JSON fallback
        try:
            matches = [
                item
                for item in self._festivals
                if item["country"] == country
                and item["state"] in {"*", state or ""}
            ]

            candidates: list[tuple[date, dict[str, object]]] = []

            for item in matches:
                scheduled = date(
                    current_date.year,
                    int(item["month"]),
                    int(item["day"]),
                )

                if scheduled < current_date:
                    scheduled = scheduled.replace(year=current_date.year + 1)

                candidates.append((scheduled, item))

        except Exception:
            logger.exception("Festival collector failed")
            return None

        if not candidates:
            return None

        scheduled, festival = min(candidates, key=lambda item: item[0])

        return {
            "name": festival["name"],
            "daysRemaining": (scheduled - current_date).days,
            "priority": festival["priority"],
        }
