"""Configurable intent weights for the behavior and Time Analytics engines."""
from __future__ import annotations
import json, os
DEFAULT_EVENT_WEIGHTS: dict[str, float] = {"PRODUCT_VIEW": 5, "WISHLIST_ADD": 30, "WISHLIST_REMOVE": -8, "BAG_ADD": 40, "BAG_REMOVE": -15, "ADD_TO_CART": 40, "REMOVE_FROM_CART": -15, "PURCHASE": 50, "SEARCH": 1, "CATEGORY_VIEW": 10, "BRAND_VIEW": 10, "PRODUCT_CLICK": 3, "PRODUCT_DWELL": 0, "RECOMMENDATION_CLICK": 10, "RECOMMENDATION_IGNORE": -2, "REPEAT_PURCHASE": 50}
def event_weight(event_type: str, metadata: dict[str, object]) -> float:
    weights = DEFAULT_EVENT_WEIGHTS
    try:
        configured = json.loads(os.getenv("BEHAVIOR_EVENT_WEIGHTS", "{}")); weights = {**weights, **({key: float(value) for key, value in configured.items()} if isinstance(configured, dict) else {})}
    except (TypeError, ValueError, json.JSONDecodeError): pass
    score = weights.get(event_type, 0.0)
    duration = float(metadata.get("durationSeconds", metadata.get("duration_seconds", 0)) or 0)
    if event_type == "PRODUCT_VIEW": score += 30 if duration > 120 else 20 if duration > 60 else 10 if duration > 30 else 5 if duration > 10 else 0
    return score