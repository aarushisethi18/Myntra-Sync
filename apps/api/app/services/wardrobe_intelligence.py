"""Deterministic wardrobe comparison and graph-backed explanation helpers."""

from __future__ import annotations

from typing import Any

from app.services.fashion_graph import FashionGraph
from app.services.outfit_planner import OutfitPlanner


class WardrobeIntelligence:
    def __init__(self, graph: FashionGraph | None = None, planner: OutfitPlanner | None = None) -> None:
        self.graph = graph or FashionGraph()
        self.planner = planner or OutfitPlanner(self.graph)

    def analyse(self, wardrobe: list[dict[str, Any]] | None, event: dict[str, Any] | None, decision: dict[str, Any] | None) -> dict[str, Any]:
        plan = self.planner.plan(event)
        owned_categories = {self._category(item) for item in wardrobe or []}
        owned_categories.discard("")
        required = plan["required_components"]
        owned = [component for component in required if self.graph.normalise(component) in owned_categories]
        missing = [component for component in required if component not in owned]
        completion_score = round((len(owned) / len(required)) * 100) if required else 0
        suggested_product = self.graph.product_for((decision or {}).get("title"))
        return {
            "owned_items": [self.graph.component_title(component) for component in owned],
            "missing_items": [self.graph.component_title(component) for component in missing],
            "suggested_outfit": plan["required_item_titles"],
            "completion_score": completion_score,
            "recommended_product": suggested_product,
        }

    def recommendation_reasons(self, wardrobe: list[dict[str, Any]] | None, event: dict[str, Any] | None, decision: dict[str, Any] | None) -> list[str]:
        analysis = self.analyse(wardrobe, event, decision)
        product = analysis["recommended_product"]
        reasons: list[str] = []
        event_title = (event or {}).get("title")
        if event_title and product and analysis["suggested_outfit"]:
            reasons.append(f"Completes your {event_title} outfit")
        owned_categories = {self._category(item) for item in wardrobe or []}
        for component in self.graph.compatible_components(product):
            if self.graph.normalise(component) in owned_categories:
                reasons.append(f"Pairs well with your existing {self.graph.component_title(component).lower()}")
        return reasons

    def _category(self, item: dict[str, Any]) -> str:
        value = item.get("category") or item.get("title") or item.get("name") or item.get("product_id") or ""
        product = self.graph.product_for(str(value))
        return self.graph.normalise(product.get("category") if product else str(value))
