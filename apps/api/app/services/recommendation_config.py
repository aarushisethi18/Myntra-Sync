"""Data configuration for context-aware product recommendation scoring.

Every signal is normalised to 0..1 before its weight is applied.  Product
metadata is matched case-insensitively against these terms; no catalog data is
manufactured when a term has no matching product.
"""
from __future__ import annotations

from typing import Final

RECOMMENDATION_WEIGHTS: Final[dict[str, float]] = {
    "weather": 0.20,
    "festival": 0.15,
    "event": 0.15,
    "fashionDna": 0.25,
    "wishlistAffinity": 0.15,
    "orderHistoryAffinity": 0.10,
}

# Enhanced Weather Tag maps checking categories, fabrics, colors, and styles
WEATHER_TAGS: Final[dict[str, tuple[str, ...]]] = {
    "rain": ("rain", "raincoat", "umbrella", "waterproof", "quick-dry", "water-resistant", "nylon", "polyester", "short", "dark", "navy", "black", "grey"),
    "hot": ("cotton", "linen", "lightweight", "breathable", "short", "sunglass", "cap", "airy", "t-shirt", "top", "dress", "sundress", "white", "beige", "cream", "sky blue", "light grey", "pastel", "ivory"),
    "cold": ("hoodie", "jacket", "sweater", "thermal", "boot", "winter", "fleece", "wool", "overcoat", "cardigan", "sweatshirt", "layer"),
    "cloudy": ("cotton", "full sleeve", "full-sleeve", "overshirt", "lightweight jacket", "layer", "navy", "black", "olive", "grey", "dark blue"),
    "windy": ("windcheater", "wind", "light jacket", "overshirt", "full-sleeve", "cardigan", "layer", "denim jacket"),
}

# Category suitability filters per weather condition to boost appropriate apparel and penalize unsuitable items
WEATHER_CATEGORY_PREFERENCES: Final[dict[str, dict[str, tuple[str, ...]]]] = {
    "hot": {
        "preferred": ("cotton shirt", "cotton t-shirt", "linen shirt", "cotton", "linen", "t-shirt", "top", "sleeveless", "dress", "sundress", "summer dress", "short", "shorts", "kurta", "casual shirt"),
        "avoid": ("jacket", "hoodie", "sweater", "coat", "thermal", "leather", "wool", "heavy denim", "dark layer"),
    },
    "cloudy": {
        "preferred": ("cotton", "full sleeve", "full-sleeve", "overshirt", "lightweight jacket", "cardigan", "layer", "navy", "black", "olive", "grey", "dark blue"),
        "avoid": ("white", "pure white", "sundress", "shorts"),
    },
    "cold": {
        "preferred": ("jacket", "hoodie", "sweater", "coat", "thermal", "cardigan", "sweatshirt", "boots", "layered"),
        "avoid": ("sundress", "short", "shorts", "sleeveless", "crop top", "linen shirt"),
    },
    "rain": {
        "preferred": ("quick-dry", "quick dry", "waterproof", "water resistant", "jacket", "dark trouser", "shorts", "cropped", "navy", "black", "grey"),
        "avoid": ("suede", "heavy denim", "white trouser", "white pants", "long flowing", "maxi dress", "gown"),
    },
    "windy": {
        "preferred": ("jacket", "overshirt", "full sleeve", "cardigan", "windcheater", "denim jacket"),
        "avoid": ("flowy skirt", "light scarf"),
    },
}

# Outfit Completion Mapping for Order History Intelligence
OUTFIT_COMPLETION_MAP: Final[dict[str, list[str]]] = {
    "jeans": ["white shirt", "black shirt", "shirt", "t-shirt", "overshirt", "jacket", "belt", "sneakers", "casual shoes", "top", "watch"],
    "denim": ["white shirt", "black shirt", "shirt", "t-shirt", "overshirt", "jacket", "belt", "top"],
    "trouser": ["shirt", "blazer", "formal shoes", "belt", "polo", "watch"],
    "pants": ["shirt", "blazer", "polo", "t-shirt", "belt"],
    "dress": ["shrug", "heels", "clutch", "jewelry", "jacket", "handbag"],
    "kurta": ["dupatta", "palazzo", "juttis", "juttis", "ethnic jewelry", "pyjama", "ethnic jacket", "watch"],
    "ethnic": ["dupatta", "palazzo", "juttis", "accessories", "ethnic jacket"],
    "shirt": ["blue jeans", "jeans", "black trousers", "trousers", "chinos", "overshirt", "blazer", "belt", "loafers", "formal shoes", "watch"],
    "t-shirt": ["jeans", "shorts", "jacket", "overshirt", "sneakers"],
    "running shoes": ["sports tee", "gym shorts", "track pants", "sports socks", "cap"],
    "sports": ["sports tee", "gym shorts", "track pants", "sports socks"],
}

FESTIVAL_TAGS: Final[dict[str, tuple[str, ...]]] = {
    "independence day": ("orange", "white", "green", "saffron", "tricolor", "patriotic", "ethnic", "kurta", "saree", "indo-western", "cotton"),
    "diwali": ("ethnic", "kurta", "saree", "lehenga", "festive", "footwear"),
    "holi": ("white", "t-shirt", "kurta", "casual"),
    "guru purnima": ("yellow", "mustard", "traditional", "ethnic", "kurta"),
    "raksha bandhan": ("festive", "ethnic", "kurta", "saree", "lehenga"),
    "christmas": ("red", "white", "winter", "jacket", "sweater"),
}

EVENT_TAGS: Final[dict[str, tuple[str, ...]]] = {
    "wedding": ("sherwani", "kurta", "ethnic", "saree", "lehenga", "blazer", "accessories"),
    "interview": ("formal", "shirt", "trouser", "blazer", "formal shoe"),
    "gym": ("activewear", "sports", "sport shoe", "training"),
    "vacation": ("travel", "short", "sunglass", "outdoor"),
    "party": ("western", "dress", "premium", "party"),
}

BIRTHDAY_TAGS: Final[dict[str, tuple[str, ...]]] = {
    "male": ("casual shirt", "polo", "jean", "chino", "sneaker"),
    "female": ("dress", "top", "skirt", "heel", "handbag"),
    "neutral": ("accessories", "footwear", "t-shirt", "sneaker", "bag"),
}

