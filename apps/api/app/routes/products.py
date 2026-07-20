from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text

from app.core.database import get_engine
from app.dependencies.auth import get_current_user
from app.services.auth_service import AuthenticatedUser

logger = logging.getLogger(__name__)
router = APIRouter(tags=["products"])

@router.get("/products")
def get_products(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
    search: str | None = None,
    category: str | None = None,
    festival: str | None = None,
    weather: str | None = None,
    occasion: str | None = None,
    sort: str | None = None,
):
    engine = get_engine()
    if engine is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is unavailable."
        )
    try:
        with engine.connect() as conn:
            # Omitting `page` intentionally keeps the legacy array response intact.
            # Catalog screens opt into the bounded, metadata-rich response below.
            filters: list[str] = []
            params: dict[str, Any] = {}
            if search:
                filters.append("(name ILIKE :search OR brand ILIKE :search OR category ILIKE :search)")
                params["search"] = f"%{search.strip()}%"
            if category:
                filters.append("category ILIKE :category")
                params["category"] = category
            if festival:
                filters.append("EXISTS (SELECT 1 FROM unnest(COALESCE(festival_suitability, ARRAY[]::text[])) value WHERE value ILIKE :festival)")
                params["festival"] = festival
            if weather:
                filters.append("EXISTS (SELECT 1 FROM unnest(COALESCE(weather_suitability, ARRAY[]::text[])) value WHERE value ILIKE :weather)")
                params["weather"] = weather
            if occasion:
                filters.append("(style ILIKE :occasion OR EXISTS (SELECT 1 FROM unnest(COALESCE(occasions, ARRAY[]::text[])) value WHERE value ILIKE :occasion))")
                params["occasion"] = occasion

            where_clause = f" WHERE {' AND '.join(filters)}" if filters else ""
            order_clause = {
                "price_asc": "price ASC NULLS LAST, name ASC",
                "price_desc": "price DESC NULLS LAST, name ASC",
                "rating_desc": "rating DESC NULLS LAST, name ASC",
                "rating_asc": "rating ASC NULLS LAST, name ASC",
            }.get(sort or "", "name ASC")
            base_query = """
                SELECT id, name, category, brand, color, price, style, image_url,
                       original_price, rating, reviews, sizes, description, badge,
                       colors, occasions, fabrics, weather_suitability, festival_suitability, trend_tags
                FROM public.products
            """
            if page is not None:
                total = conn.execute(text(f"SELECT COUNT(*) FROM public.products{where_clause}"), params).scalar_one()
                params.update({"limit": page_size, "offset": (page - 1) * page_size})
                rows = conn.execute(text(f"{base_query}{where_clause} ORDER BY {order_clause} LIMIT :limit OFFSET :offset"), params).mappings().all()
            else:
                rows = conn.execute(text(f"{base_query}{where_clause} ORDER BY {order_clause}"), params).mappings().all()
            
            products = []
            for row in rows:
                products.append({
                    "id": str(row["id"]),
                    "brand": row["brand"] or "Myntra",
                    "title": row["name"] or "Untitled product", # Frontend title matches DB name
                    "category": row["category"] or "Accessories",
                    "color": row["color"] or "",
                    "style": row["style"] or "",
                    "price": float(row["price"] or 0),
                    "originalPrice": float(row["original_price"] or row["price"] or 0),
                    "rating": float(row["rating"]) if row["rating"] is not None else None,
                    "reviews": row["reviews"] or 0,
                    "image": row["image_url"] or "",
                    "sizes": row["sizes"] or ["One Size"],
                    "description": row["description"] or "Product details are being updated.",
                    "badge": row["badge"],
                    "colors": row["colors"] or [row["color"]],
                    "occasions": row["occasions"] or [row["style"]],
                    "fabrics": row["fabrics"] or [],
                    "weatherSuitability": row["weather_suitability"] or [],
                    "festivalSuitability": row["festival_suitability"] or [],
                    "trendTags": row["trend_tags"] or []
                })
            if page is not None:
                return {"items": products, "page": page, "pageSize": page_size, "total": total}
            return products
    except Exception as error:
        logger.exception("Failed to fetch product catalog")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Product catalog could not be retrieved."
        ) from error
