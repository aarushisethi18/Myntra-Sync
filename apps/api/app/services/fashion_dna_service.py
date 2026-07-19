"""Persistent Fashion DNA aggregate updates and reads."""
from __future__ import annotations

from typing import Any

from sqlalchemy import Connection, Engine, text


class FashionDnaService:
    _response_dimensions = {
        "BRAND": "brandAffinity", "CATEGORY": "categoryAffinity", "COLOR": "colorAffinity",
        "FABRIC": "fabricAffinity", "FIT": "fitAffinity", "STYLE": "styleAffinity", "OCCASION": "occasionAffinity",
    }

    def update(self, connection: Connection, user_id: str, event: dict[str, Any], weight: float, experimentation_delta: float) -> None:
        price = event.get("price") if event["event_type"] in {"ADD_TO_CART", "PURCHASE"} else None
        season = event.get("metadata", {}).get("season")
        statement = text("""
            INSERT INTO fashion_dna (user_id, trend_score, experimentation_score, budget_min, budget_max, preferred_season, updated_at)
            VALUES (:user_id, :trend_delta, :experiment_delta, :price, :price, :season, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                trend_score = LEAST(100.0, GREATEST(-100.0, fashion_dna.trend_score + EXCLUDED.trend_score)),
                experimentation_score = LEAST(100.0, GREATEST(0.0, fashion_dna.experimentation_score + EXCLUDED.experimentation_score)),
                budget_min = CASE WHEN EXCLUDED.budget_min IS NULL THEN fashion_dna.budget_min ELSE LEAST(COALESCE(fashion_dna.budget_min, EXCLUDED.budget_min), EXCLUDED.budget_min) END,
                budget_max = CASE WHEN EXCLUDED.budget_max IS NULL THEN fashion_dna.budget_max ELSE GREATEST(COALESCE(fashion_dna.budget_max, EXCLUDED.budget_max), EXCLUDED.budget_max) END,
                preferred_season = COALESCE(EXCLUDED.preferred_season, fashion_dna.preferred_season),
                updated_at = NOW()
        """)
        trend_delta = weight if event["event_type"] in {"RECOMMENDATION_CLICK", "PURCHASE"} else 0
        connection.execute(statement, {"user_id": user_id, "trend_delta": trend_delta, "experiment_delta": experimentation_delta, "price": price, "season": season})

    def get(self, engine: Engine, user_id: str) -> dict[str, Any]:
        result: dict[str, Any] = {key: [] for key in self._response_dimensions.values()}
        result.update({"budgetRange": {"min": None, "max": None}, "trendScore": 0, "experimentationScore": 0, "preferredSeason": None})
        with engine.connect() as connection:
            scores = connection.execute(text("SELECT dimension, value, score FROM fashion_affinity_scores WHERE user_id = :user_id ORDER BY score DESC, last_updated DESC"), {"user_id": user_id}).mappings().all()
            dna = connection.execute(text("SELECT trend_score, experimentation_score, budget_min, budget_max, preferred_season FROM fashion_dna WHERE user_id = :user_id"), {"user_id": user_id}).mappings().first()
        for score in scores:
            key = self._response_dimensions.get(score["dimension"])
            if key:
                result[key].append({"value": score["value"], "score": float(score["score"])})
        if dna:
            result.update({"budgetRange": {"min": float(dna["budget_min"]) if dna["budget_min"] is not None else None, "max": float(dna["budget_max"]) if dna["budget_max"] is not None else None}, "trendScore": float(dna["trend_score"]), "experimentationScore": float(dna["experimentation_score"]), "preferredSeason": dna["preferred_season"]})
        return result
