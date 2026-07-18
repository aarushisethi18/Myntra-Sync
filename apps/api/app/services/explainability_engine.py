"""Deterministic explanations for already-generated recommendations."""
from __future__ import annotations

import logging
from typing import Any

from app.schemas.context import Recommendation
from app.services.decision_engine import Decision

logger = logging.getLogger(__name__)


class ExplainabilityEngine:
    """Summarises existing decision metadata without changing recommendations."""

    def generate(
        self,
        recommendation: Recommendation,
        decision: Decision,
        user: dict[str, Any],
        weather: dict[str, Any] | None,
        events: list[dict[str, Any]],
        wardrobe: list[dict[str, Any]],
    ) -> str:
        """Return the same explanation for identical recommendation metadata."""
        del weather, events, wardrobe  # Context is accepted for safe future enrichment only.
        fragments = self._unique_fragments(decision.reasons)
        if self._has_budget(user) and not any("budget" in fragment.lower() for fragment in fragments):
            fragments.append("it fits within your preferred budget")

        if not fragments:
            explanation = f"{recommendation.title} is recommended to support your {decision.predictedNeed.lower()}."
        else:
            explanation = f"{recommendation.title} is recommended because {self._join_fragments(fragments)}."
        logger.debug("Generated explanation for recommendation %s", recommendation.id)
        return explanation
    @staticmethod
    def _has_budget(user: dict[str, Any]) -> bool:
        budget_min = user.get("budget_min")
        budget_max = user.get("budget_max")

        return (
            (budget_min is not None and budget_min > 0)
            or budget_max is not None
        )

    @staticmethod
    def _unique_fragments(reasons: list[str]) -> list[str]:
        seen: set[str] = set()
        fragments: list[str] = []
        for reason in reasons:
            normalized = reason.strip().rstrip(".")
            key = normalized.casefold()
            if normalized and key not in seen:
                seen.add(key)
                fragments.append(normalized[:1].lower() + normalized[1:])
        return fragments

    @staticmethod
    def _join_fragments(fragments: list[str]) -> str:
        if len(fragments) == 1:
            return fragments[0]
        if len(fragments) == 2:
            return f"{fragments[0]} and {fragments[1]}"
        return f"{', '.join(fragments[:-1])}, and {fragments[-1]}"
