"""Graph-backed outfit requirements. This module never selects products."""

from __future__ import annotations

from typing import Any

from app.services.fashion_graph import FashionGraph


class OutfitPlanner:
    def __init__(self, graph: FashionGraph | None = None) -> None:
        self.graph = graph or FashionGraph()

    def plan(self, event: dict[str, Any] | None) -> dict[str, list[str]]:
        title = (event or {}).get("title", "")
        # Event labels can be natural language; matching is intentionally deterministic.
        matching_occasion = self.graph.occasion_for_event(title)
        components = self.graph.required_components(matching_occasion)
        return {
            "required_components": components,
            "required_item_titles": [self.graph.component_title(component) for component in components],
        }
