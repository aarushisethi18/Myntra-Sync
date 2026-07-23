"""Persistence access for wishlist intelligence."""
from __future__ import annotations

from typing import Any

from sqlalchemy import Engine, text


class WishlistRepository:
    """Read real wishlisted products without changing wishlist mutations."""

    def __init__(self, engine: Engine) -> None:
        self._engine = engine

    def wishlist_products(self, user_id: str) -> list[dict[str, Any]]:
        query = text("""
            SELECT w.id, w.created_at,
                   p.id AS product_id, p.brand, p.category, p.color, p.style, p.price
            FROM public.wishlist w
            JOIN public.products p ON p.id = w.product_id
            WHERE w.user_id = :user_id
            ORDER BY w.created_at ASC
        """)
        with self._engine.connect() as connection:
            return [
                dict(row)
                for row in connection.execute(query, {"user_id": user_id}).mappings().all()
            ]

    def catalog_price_quartiles(self) -> tuple[float | None, float | None]:
        query = text("""
            SELECT percentile_cont(0.25) WITHIN GROUP (ORDER BY price) AS lower_quartile,
                   percentile_cont(0.75) WITHIN GROUP (ORDER BY price) AS upper_quartile
            FROM public.products
            WHERE price IS NOT NULL
        """)
        with self._engine.connect() as connection:
            row = connection.execute(query).mappings().one()
        return row["lower_quartile"], row["upper_quartile"]
