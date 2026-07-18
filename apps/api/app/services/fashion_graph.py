"""Read-only, in-memory access to the deterministic fashion graph."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

GRAPH_PATH = Path(__file__).resolve().parent.parent / "data" / "fashion_graph.json"


@lru_cache(maxsize=1)
def load_fashion_graph() -> dict[str, Any]:
    """Load and validate the graph once for the lifetime of the process."""
    with GRAPH_PATH.open(encoding="utf-8") as graph_file:
        graph = json.load(graph_file)
    if not isinstance(graph.get("products"), list) or not isinstance(graph.get("outfit_templates"), list):
        raise ValueError("fashion_graph.json must contain products and outfit_templates lists")
    return graph


class FashionGraph:
    def __init__(self, graph: dict[str, Any] | None = None) -> None:
        self._graph = graph or load_fashion_graph()
        self._products = self._graph["products"]

    @staticmethod
    def normalise(value: str | None) -> str:
        return "".join(character for character in (value or "").lower() if character.isalnum())

    def product_for(self, value: str | None) -> dict[str, Any] | None:
        target = self.normalise(value)
        for product in self._products:
            if target in {self.normalise(product.get("id")), self.normalise(product.get("title")), self.normalise(product.get("category"))}:
                return product
        return None

    def required_components(self, occasion: str | None) -> list[str]:
        target = self.normalise(occasion)
        for template in self._graph["outfit_templates"]:
            if self.normalise(template.get("occasion")) == target:
                return list(template.get("components", []))
        return []

    def occasion_for_event(self, event_title: str | None) -> str | None:
        normalised_title = self.normalise(event_title)
        for template in self._graph["outfit_templates"]:
            occasion = template.get("occasion")
            if self.normalise(occasion) in normalised_title:
                return occasion
        return None

    def component_title(self, component: str) -> str:
        product = self.product_for(component)
        return product["title"] if product else component.replace("_", " ").title()

    def compatible_components(self, product: dict[str, Any] | None) -> list[str]:
        return list(product.get("compatible_categories", [])) if product else []
