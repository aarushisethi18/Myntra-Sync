"""Persistence access for order-history intelligence."""
from __future__ import annotations

from typing import Any

from sqlalchemy import Engine, text


class OrderHistoryRepository:
    def __init__(self, engine: Engine) -> None:
        self._engine = engine

    def recent_orders(self, user_id: str) -> list[dict[str, Any]]:
        """Return actual purchases and their product attributes from the last year."""
        query = text("""
            SELECT o.id, o.size, o.quantity, o.price, o.status, o.created_at,
                   p.brand, p.category, p.name, p.style, p.occasions
            FROM public.orders o
            JOIN public.products p ON p.id = o.product_id
            WHERE o.user_id = :user_id
              AND o.created_at >= NOW() - INTERVAL '12 months'
            ORDER BY o.created_at ASC
        """)
        with self._engine.connect() as connection:
            return [dict(row) for row in connection.execute(query, {"user_id": user_id}).mappings().all()]

    def recommendation(self, user_id: str, recommendation_id: str | None) -> dict[str, Any] | None:
        """Resolve the already-rendered recommendation's product, never generate one."""
        if not recommendation_id:
            return None
        query = text("""
            SELECT id, brand, category, name, price, style, occasions
            FROM public.products
            WHERE id = :product_id
            LIMIT 1
        """)
        with self._engine.connect() as connection:
            row = connection.execute(query, {"product_id": recommendation_id}).mappings().first()
        return dict(row) if row else None
