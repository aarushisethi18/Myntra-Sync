"""Explainable intelligence derived only from a user's real orders."""
from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime, timezone
from statistics import mean, median
from typing import Any

from app.repositories.order_history_repository import OrderHistoryRepository

MINIMUM_ORDERS = 3
ANALYSIS_WINDOW_MONTHS = 12


class OrderHistoryService:
    def __init__(self, repository: OrderHistoryRepository) -> None:
        self._repository = repository

    def intelligence(self, user_id: str, recommendation_id: str | None) -> dict[str, Any]:
        orders = self._repository.recent_orders(user_id)
        if len(orders) < MINIMUM_ORDERS:
            return {"status": "insufficient_data", "ordersAnalyzed": len(orders), "minimumRequired": MINIMUM_ORDERS}

        brand_scores = self._rank(orders, "brand")
        category_scores = self._rank(orders, "category")
        values = [int(order["price"]) * int(order["quantity"]) for order in orders]
        budget = {"min": self._percentile(values, 25), "max": self._percentile(values, 75)}
        sizes = self._preferred_sizes(orders)
        frequency = self._frequency_days(orders)
        returned = sum(1 for order in orders if str(order["status"]).lower() in {"returned", "return", "refunded"})
        recommendation = self._repository.recommendation(user_id, recommendation_id)
        return {
            "status": "ok",
            "shoppingPersona": self._persona(category_scores, brand_scores, round(mean(values))),
            "favoriteBrands": [{"brand": item["value"], "score": item["score"]} for item in brand_scores],
            "favoriteCategories": [{"category": item["value"], "score": item["score"]} for item in category_scores],
            "preferredBudget": budget,
            "averageSpend": round(mean(values)),
            "shoppingFrequencyDays": frequency,
            "preferredSizes": sizes,
            "returnRate": round(returned / len(orders), 2),
            "recommendationReasons": self._reasons(recommendation, brand_scores, category_scores, budget, orders),
        }

    @staticmethod
    def _rank(orders: list[dict[str, Any]], field: str) -> list[dict[str, Any]]:
        now = datetime.now(timezone.utc)
        weights: dict[str, float] = defaultdict(float)
        for order in orders:
            value = str(order.get(field) or "").strip()
            if not value:
                continue
            created = order["created_at"]
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            age_days = max((now - created).days, 0)
            weights[value] += int(order["quantity"]) * math.exp(-age_days / 180)
        top = sorted(weights.items(), key=lambda item: item[1], reverse=True)[:3]
        maximum = top[0][1] if top else 1
        return [{"value": value, "score": round(score / maximum, 2)} for value, score in top]

    @staticmethod
    def _percentile(values: list[int], percentile: int) -> int:
        ordered = sorted(values)
        position = (len(ordered) - 1) * percentile / 100
        lower, upper = math.floor(position), math.ceil(position)
        if lower == upper:
            return ordered[lower]
        return round(ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower))

    @staticmethod
    def _preferred_sizes(orders: list[dict[str, Any]]) -> dict[str, str]:
        counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        for order in orders:
            category, size = str(order.get("category") or "Other"), str(order.get("size") or "")
            if size:
                counts[category][size] += int(order["quantity"])
        return {category: max(sizes, key=sizes.get) for category, sizes in counts.items()}

    @staticmethod
    def _frequency_days(orders: list[dict[str, Any]]) -> int | None:
        dates = [order["created_at"] for order in orders]
        gaps = [(later - earlier).total_seconds() / 86_400 for earlier, later in zip(dates, dates[1:])]
        return round(median(gaps)) if gaps else None

    @staticmethod
    def _persona(categories: list[dict[str, Any]], brands: list[dict[str, Any]], average_spend: int) -> str:
        category = str(categories[0]["value"]) if categories else "Style"
        category_label = "Sportswear" if any(word in category.lower() for word in ("sport", "footwear", "athlei")) else category
        tier = "Premium" if average_spend >= 2500 else "Value-conscious" if average_spend < 1200 else "Everyday"
        return f"{tier} {category_label} Enthusiast"

    @staticmethod
    def _reasons(recommendation: dict[str, Any] | None, brands: list[dict[str, Any]], categories: list[dict[str, Any]], budget: dict[str, int], orders: list[dict[str, Any]]) -> list[str]:
        if not recommendation:
            return []
        reasons: list[str] = []
        if brands and recommendation.get("brand") == brands[0]["value"]:
            reasons.append(f"You frequently purchase {recommendation['brand']}.")
        if categories and recommendation.get("category") == categories[0]["value"]:
            reasons.append(f"{recommendation['category']} is one of your most-purchased categories.")
        if budget["min"] <= int(recommendation.get("price") or 0) <= budget["max"]:
            reasons.append(f"Its price fits your usual ₹{budget['min']:,}–₹{budget['max']:,} range.")
        occasion_values = {str(value).lower() for order in orders for value in (order.get("occasions") or [])}
        recommendation_occasions = {str(value).lower() for value in (recommendation.get("occasions") or [])}
        if occasion_values & recommendation_occasions:
            reasons.append("It suits occasions you have shopped for before.")
        return reasons
