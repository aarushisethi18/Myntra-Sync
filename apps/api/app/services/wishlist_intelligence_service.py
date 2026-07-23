"""Deterministic preference signals derived from a user's real wishlist."""
from __future__ import annotations

import math
from collections import Counter
from statistics import median
from typing import Any

from app.repositories.wishlist_repository import WishlistRepository


EMPTY_WISHLIST_MESSAGE = (
    "Start adding products to your wishlist to unlock personalized wishlist insights."
)


class WishlistIntelligenceService:
    def __init__(self, repository: WishlistRepository) -> None:
        self._repository = repository

    def intelligence(self, user_id: str) -> dict[str, Any]:
        products = self._repository.wishlist_products(user_id)
        if not products:
            return {"status": "empty", "message": EMPTY_WISHLIST_MESSAGE}

        prices = [int(product["price"]) for product in products if product.get("price") is not None]
        if not prices:
            raise ValueError("Wishlisted products must have prices for intelligence analysis.")

        brands = self._rank(products, "brand")
        categories = self._rank(products, "category")
        styles = self._values(products, "style")
        colors = self._values(products, "color")
        budget = {"min": self._percentile(prices, 25), "max": self._percentile(prices, 75)}
        catalog_lower, catalog_upper = self._repository.catalog_price_quartiles()

        return {
            "status": "ok",
            "wishlistPersona": self._persona(
                products=products,
                category_count=len(categories),
                color_count=len(colors),
                median_price=median(prices),
                budget_max=budget["max"],
                catalog_lower=catalog_lower,
                catalog_upper=catalog_upper,
            ),
            "wishlistSize": len(products),
            "favoriteBrands": [{"brand": item["value"], "score": item["score"]} for item in brands],
            "favoriteCategories": [{"category": item["value"], "score": item["score"]} for item in categories],
            "preferredBudget": budget,
            "favoriteStyles": styles,
            "favoriteColors": colors,
            "wishlistActivity": {
                "firstSavedAt": products[0]["created_at"],
                "mostRecentSavedAt": products[-1]["created_at"],
            },
            "recommendationReasons": self._reasons(brands, categories, styles, colors, budget),
        }

    @staticmethod
    def _rank(products: list[dict[str, Any]], field: str) -> list[dict[str, Any]]:
        values = [str(product.get(field) or "").strip() for product in products]
        counts = Counter(value for value in values if value)
        highest = max(counts.values(), default=1)
        return [
            {"value": value, "score": round(count / highest, 2)}
            for value, count in counts.most_common(3)
        ]

    @classmethod
    def _values(cls, products: list[dict[str, Any]], field: str) -> list[str]:
        return [item["value"] for item in cls._rank(products, field)]

    @staticmethod
    def _percentile(values: list[int], percentile: int) -> int:
        ordered = sorted(values)
        position = (len(ordered) - 1) * percentile / 100
        lower, upper = math.floor(position), math.ceil(position)
        if lower == upper:
            return ordered[lower]
        return round(ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower))

    @staticmethod
    def _share(products: list[dict[str, Any]], terms: tuple[str, ...]) -> float:
        matched = sum(
            1
            for product in products
            if any(term in str(product.get("category") or "").casefold() for term in terms)
        )
        return matched / len(products)

    @classmethod
    def _persona(
        cls,
        products: list[dict[str, Any]],
        category_count: int,
        color_count: int,
        median_price: float,
        budget_max: int,
        catalog_lower: float | None,
        catalog_upper: float | None,
    ) -> str:
        if cls._share(products, ("footwear", "sneaker", "shoe")) >= 0.5:
            return "Sneaker Enthusiast"
        if cls._share(products, ("ethnic", "traditional", "kurta", "saree")) >= 0.4:
            return "Ethnic Style Lover"
        if catalog_upper is not None and median_price >= catalog_upper:
            return "Premium Fashion Explorer"
        if catalog_lower is not None and budget_max <= catalog_lower:
            return "Budget Fashion Planner"
        if len(products) <= 5 and category_count <= 2 and color_count <= 2:
            return "Minimalist Collector"

        brand_count = len({str(product.get("brand") or "").casefold() for product in products if product.get("brand")})
        if category_count >= 4 or brand_count >= 4:
            return "Trend Hunter"
        return "Trend Hunter"

    @staticmethod
    def _reasons(
        brands: list[dict[str, Any]],
        categories: list[dict[str, Any]],
        styles: list[str],
        colors: list[str],
        budget: dict[str, int],
    ) -> list[str]:
        reasons: list[str] = []
        if brands:
            reasons.append("Matches brands you've frequently saved.")
        if categories or styles:
            reasons.append("Fits your preferred wishlist aesthetic.")
        if budget["min"] <= budget["max"]:
            reasons.append("Falls within your typical wishlist budget.")
        if colors:
            reasons.append("Aligns with colors you have saved to your wishlist.")
        return reasons
