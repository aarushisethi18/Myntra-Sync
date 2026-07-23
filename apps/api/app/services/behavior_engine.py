"""Generic, idempotent behavior-event ingestion pipeline."""
from __future__ import annotations

import json
from typing import Any

from sqlalchemy import Engine, text

from app.services.affinity_calculator import AffinityCalculator
from app.services.behavior_weights import event_weight
from app.services.fashion_dna_service import FashionDnaService
from app.services.signal_aggregator import SignalAggregator


class BehaviorEngine:
    def __init__(self, engine: Engine, aggregator: SignalAggregator | None = None, calculator: AffinityCalculator | None = None, dna: FashionDnaService | None = None) -> None:
        self._engine = engine
        self._aggregator = aggregator or SignalAggregator()
        self._calculator = calculator or AffinityCalculator()
        self._dna = dna or FashionDnaService()

    def ingest(self, user_id: str, event: dict[str, Any]) -> bool:
        metadata = dict(event.get("metadata") or {})
        if event.get("event_id"):
            metadata["eventId"] = event["event_id"]
        event = {**event, "metadata": metadata}
        insert_parameters = {
            "user_id": user_id,
            "event_type": event["event_type"],
            "product_id": event.get("product_id"),
            "brand": event.get("brand"),
            "category": event.get("category"),
            "color": event.get("color"),
            "fabric": event.get("fabric"),
            "fit": event.get("fit"),
            "style": event.get("style"),
            "occasion": event.get("occasion"),
            "price": event.get("price"),
            "session_id": event.get("session_id"),
            "duration_seconds": event.get("duration_seconds"),
            "metadata": json.dumps(metadata),
        }
        with self._engine.begin() as connection:
            inserted = connection.execute(text("""
                INSERT INTO behavior_events (user_id, event_type, product_id, brand, category, color, fabric, fit, style, occasion, price, session_id, duration_seconds, metadata)
                VALUES (:user_id, :event_type, :product_id, :brand, :category, :color, :fabric, :fit, :style, :occasion, :price, :session_id, :duration_seconds, CAST(:metadata AS jsonb))
                ON CONFLICT DO NOTHING
                RETURNING id
            """), insert_parameters).scalar_one_or_none()
            if inserted is None:
                return False
            weight = event_weight(event["event_type"], metadata)
            if event["event_type"] == "PURCHASE" and event.get("product_id"):
                prior_purchases = connection.execute(text("SELECT count(*) FROM behavior_events WHERE user_id = :user_id AND product_id = :product_id AND event_type = 'PURCHASE'"), {"user_id": user_id, "product_id": event["product_id"]}).scalar_one()
                if prior_purchases > 1:
                    weight += event_weight("REPEAT_PURCHASE", metadata)
            signals = self._aggregator.affinity_signals(event)
            novel_signals = sum(connection.execute(text("SELECT count(*) FROM fashion_affinity_scores WHERE user_id = :user_id AND dimension = :dimension AND value = :value"), {"user_id": user_id, "dimension": dimension, "value": value}).scalar_one() == 0 for dimension, value in signals)
            self._calculator.apply(connection, user_id, signals, weight)
            self._dna.update(connection, user_id, event, weight, float(novel_signals))
        return True
