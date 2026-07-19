"""Transactional affinity-score updates with bounded normalization."""
from __future__ import annotations

from sqlalchemy import Connection, text


class AffinityCalculator:
    def apply(self, connection: Connection, user_id: str, signals: list[tuple[str, str]], weight: float) -> None:
        if not signals or weight == 0:
            return
        statement = text("""
            INSERT INTO fashion_affinity_scores (user_id, dimension, value, score, last_updated)
            VALUES (:user_id, :dimension, :value, :score, NOW())
            ON CONFLICT (user_id, dimension, value) DO UPDATE SET
                score = LEAST(100.0, GREATEST(-100.0, fashion_affinity_scores.score + EXCLUDED.score)),
                last_updated = NOW()
        """)
        connection.execute(statement, [
            {"user_id": user_id, "dimension": dimension, "value": value, "score": weight}
            for dimension, value in signals
        ])
