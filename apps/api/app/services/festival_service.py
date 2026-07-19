"""Festival lookup backed by a versioned local data set."""
from __future__ import annotations

import json
import logging
from datetime import date
from pathlib import Path

logger = logging.getLogger(__name__)


class FestivalService:
    def __init__(self, dataset_path: Path | None = None) -> None:
        path = dataset_path or Path(__file__).with_name("festival_data.json")
        self._festivals: list[dict[str, object]] = json.loads(path.read_text(encoding="utf-8"))

    def upcoming(self, country: str, state: str | None, current_date: date) -> dict[str, object] | None:
        try:
            matches = [item for item in self._festivals if item["country"] == country and item["state"] in {"*", state or ""}]
            candidates: list[tuple[date, dict[str, object]]] = []
            for item in matches:
                scheduled = date(current_date.year, int(item["month"]), int(item["day"]))
                if scheduled < current_date:
                    scheduled = scheduled.replace(year=current_date.year + 1)
                candidates.append((scheduled, item))
        except Exception:
            logger.exception("Festival collector failed")
            return None
        if not candidates:
            return None
        scheduled, festival = min(candidates, key=lambda candidate: candidate[0])
        return {"name": festival["name"], "daysRemaining": (scheduled - current_date).days, "priority": festival["priority"]}
