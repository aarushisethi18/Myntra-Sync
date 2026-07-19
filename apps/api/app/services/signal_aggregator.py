"""Maps one normalized event to its Fashion DNA affinity signals."""
from __future__ import annotations

from typing import Any


class SignalAggregator:
    _dimensions = {
        "brand": "BRAND", "category": "CATEGORY", "color": "COLOR", "fabric": "FABRIC",
        "fit": "FIT", "style": "STYLE", "occasion": "OCCASION",
    }

    def affinity_signals(self, event: dict[str, Any]) -> list[tuple[str, str]]:
        return [
            (dimension, str(event[field]).strip())
            for field, dimension in self._dimensions.items()
            if event.get(field) and str(event[field]).strip()
        ]
