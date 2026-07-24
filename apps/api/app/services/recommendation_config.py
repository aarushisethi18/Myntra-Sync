"""Data configuration for context-aware product recommendation scoring.

Every signal is normalised to 0..1 before its weight is applied.  Product
metadata is matched case-insensitively against these terms; no catalog data is
manufactured when a term has no matching product.
"""
from __future__ import annotations

from typing import Final

RECOMMENDATION_WEIGHTS: Final[dict[str, float]] = {
    "weather": 0.25,
    "festival": 0.25,
    "event": 0.20,
    "fashionDna": 0.15,
    "wishlistAffinity": 0.10,
    "orderHistoryAffinity": 0.05,
}

WEATHER_TAGS: Final[dict[str, tuple[str, ...]]] = {
    "rain": ("rain", "raincoat", "umbrella", "waterproof", "quick-dry", "water-resistant"),
    "hot": ("cotton", "linen", "lightweight", "breathable", "short", "sunglass", "cap"),
    "cold": ("hoodie", "jacket", "sweater", "thermal", "boot", "winter"),
    "windy": ("windcheater", "wind", "light jacket"),
}

FESTIVAL_TAGS: Final[dict[str, tuple[str, ...]]] = {
    "independence day": ("saffron", "white", "green", "tricolor", "patriotic", "ethnic", "kurta", "cotton"),
    "diwali": ("ethnic", "kurta", "saree", "lehenga", "festive", "footwear"),
    "holi": ("white", "t-shirt", "kurta", "casual"),
    "guru purnima": ("yellow", "mustard", "traditional", "ethnic", "kurta"),
    "raksha bandhan": ("festive", "ethnic", "kurta", "saree", "lehenga"),
    "christmas": ("red", "white", "winter", "jacket", "sweater"),
}

EVENT_TAGS: Final[dict[str, tuple[str, ...]]] = {
    "wedding": ("sherwani", "kurta", "ethnic", "saree", "lehenga"),
    "interview": ("formal", "shirt", "trouser", "blazer", "formal shoe"),
    "gym": ("activewear", "sports", "sport shoe", "training"),
    "vacation": ("travel", "short", "sunglass", "outdoor"),
    "party": ("western", "dress", "premium", "party"),
}

BIRTHDAY_TAGS: Final[dict[str, tuple[str, ...]]] = {
    "male": ("casual shirt", "polo", "jean", "chino", "sneaker"),
    "female": ("dress", "top", "skirt", "heel", "handbag"),
    # The neutral set is concrete catalog metadata, not a placeholder product.
    "neutral": ("accessories", "footwear", "t-shirt", "sneaker", "bag"),
}
