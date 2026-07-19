"""Configurable defaults for implicit behavior scoring."""
from __future__ import annotations

import json
import os

DEFAULT_EVENT_WEIGHTS: dict[str, float] = {
    "PRODUCT_VIEW": 1, "PRODUCT_CLICK": 3, "PRODUCT_DWELL": 0,
    "WISHLIST_ADD": 8, "WISHLIST_REMOVE": -8, "ADD_TO_CART": 15,
    "REMOVE_FROM_CART": -15, "PURCHASE": 30, "SEARCH": 1, "CATEGORY_OPEN": 2,
    "BRAND_OPEN": 2, "COLOR_FILTER": 2, "STYLE_FILTER": 2, "FABRIC_FILTER": 2,
    "HOME_SECTION_CLICK": 1, "RECOMMENDATION_CLICK": 10, "RECOMMENDATION_IGNORE": -2,
    "REPEAT_PURCHASE": 50, "DWELL_OVER_15_SECONDS": 5,
}


def event_weight(event_type: str, metadata: dict[str, object]) -> float:
    """Resolve weights from environment configuration without duplicating rules."""
    configured = os.getenv("BEHAVIOR_EVENT_WEIGHTS")
    weights = DEFAULT_EVENT_WEIGHTS
    if configured:
        try:
            parsed = json.loads(configured)
            if isinstance(parsed, dict):
                weights = {**DEFAULT_EVENT_WEIGHTS, **{key: float(value) for key, value in parsed.items()}}
        except (TypeError, ValueError, json.JSONDecodeError):
            pass
    score = weights.get(event_type, 0.0)
    if event_type == "PRODUCT_DWELL" and float(metadata.get("durationSeconds", 0) or 0) > 15:
        score += weights["DWELL_OVER_15_SECONDS"]
    return score
