from __future__ import annotations

import logging
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text

from app.core.database import get_engine
from app.dependencies.auth import get_current_user
from app.services.auth_service import AuthenticatedUser
from app.services.context_collection_service import ContextCollectionService
from app.services.context_service import ContextService

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
    recommendation_scope: Literal["homepage", "weather", "festival", "event", "fashionDna", "wishlistAffinity", "orderHistoryAffinity"] | None = None,
    override_weather: str | None = None,
    override_temperature: float | None = None,
    override_festival: str | None = None,
    override_event_title: str | None = None,
    override_event_type: str | None = None,
):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database connection is unavailable.")
    try:
        with engine.connect() as conn:
            filters: list[str] = []
            params: dict[str, Any] = {"user_id": str(current_user.id)}
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
            secondary_order = {
                "price_asc": "price ASC NULLS LAST, name ASC",
                "price_desc": "price DESC NULLS LAST, name ASC",
                "rating_desc": "rating DESC NULLS LAST, name ASC",
                "rating_asc": "rating ASC NULLS LAST, name ASC",
            }.get(sort or "", "rating DESC NULLS LAST, name ASC")
            # One recent-events aggregation powers immediate recommendations. It is
            # intentionally read-time work: no job or Fashion DNA rebuild is needed.
            ranking_ctes = """
                WITH recent_events AS (
                    SELECT product_id, brand, category, style, color, event_type, duration_seconds,
                           ROW_NUMBER() OVER (PARTITION BY product_id, event_type ORDER BY created_at) AS purchase_number
                    FROM public.behavior_events
                    WHERE user_id = :user_id AND created_at >= NOW() - INTERVAL '30 days'
                      AND event_type IN ('PRODUCT_VIEW', 'PRODUCT_DWELL', 'WISHLIST_ADD', 'BAG_ADD', 'PURCHASE', 'RECOMMENDATION_CLICK')
                ), event_scores AS (
                    SELECT product_id, brand, category, style, color,
                           CASE
                               WHEN event_type IN ('PRODUCT_VIEW', 'PRODUCT_DWELL') THEN CASE
                                   WHEN COALESCE(duration_seconds, 0) >= 30 THEN 60
                                   WHEN COALESCE(duration_seconds, 0) >= 15 THEN 35
                                   WHEN COALESCE(duration_seconds, 0) >= 10 THEN 15
                                   WHEN COALESCE(duration_seconds, 0) >= 5 THEN 5 ELSE 0 END
                               WHEN event_type = 'WISHLIST_ADD' THEN 25
                               WHEN event_type = 'BAG_ADD' THEN 40
                               WHEN event_type = 'PURCHASE' THEN 60 + CASE WHEN purchase_number > 1 THEN 40 ELSE 0 END
                               WHEN event_type = 'RECOMMENDATION_CLICK' THEN 10 ELSE 0 END::double precision AS score
                    FROM recent_events
                ), recent_signal_scores AS (
                    SELECT signal.dimension, lower(signal.value) AS value, SUM(event_scores.score) AS score
                    FROM event_scores
                    CROSS JOIN LATERAL (VALUES
                        ('PRODUCT', event_scores.product_id), ('BRAND', event_scores.brand),
                        ('CATEGORY', event_scores.category), ('STYLE', event_scores.style), ('COLOR', event_scores.color)
                    ) AS signal(dimension, value)
                    WHERE signal.value IS NOT NULL AND btrim(signal.value) <> ''
                    GROUP BY signal.dimension, lower(signal.value)
                ), fashion_scores AS (
                    SELECT p.id, COALESCE(SUM(a.score), 0)::double precision AS score
                    FROM public.products p LEFT JOIN public.fashion_affinity_scores a ON a.user_id = :user_id AND (
                         (a.dimension = 'BRAND' AND lower(a.value) = lower(COALESCE(p.brand, '')))
                      OR (a.dimension = 'CATEGORY' AND lower(a.value) = lower(COALESCE(p.category, '')))
                      OR (a.dimension = 'STYLE' AND lower(a.value) = lower(COALESCE(p.style, '')))
                      OR (a.dimension = 'COLOR' AND lower(a.value) = lower(COALESCE(p.color, '')))
                    ) GROUP BY p.id
                ), recent_scores AS (
                    SELECT p.id, COALESCE(SUM(s.score), 0)::double precision AS score
                    FROM public.products p LEFT JOIN recent_signal_scores s ON
                         (s.dimension = 'PRODUCT' AND s.value = lower(p.id::text))
                      OR (s.dimension = 'BRAND' AND s.value = lower(COALESCE(p.brand, '')))
                      OR (s.dimension = 'CATEGORY' AND s.value = lower(COALESCE(p.category, '')))
                      OR (s.dimension = 'STYLE' AND s.value = lower(COALESCE(p.style, '')))
                      OR (s.dimension = 'COLOR' AND s.value = lower(COALESCE(p.color, '')))
                    GROUP BY p.id
                ), ranked_products AS (
                    SELECT p.*, f.score AS fashion_affinity_score, r.score AS recent_behavior_score,
                           (f.score + r.score) AS final_score
                    FROM public.products p JOIN fashion_scores f ON f.id = p.id JOIN recent_scores r ON r.id = p.id
                )
            """
            base_query = """
                SELECT id, name, category, brand, color, price, style, image_url, original_price,
                       rating, reviews, sizes, description, badge, colors, occasions, fabrics,
                       weather_suitability, festival_suitability, trend_tags, fashion_affinity_score,
                       recent_behavior_score, final_score
                FROM ranked_products
            """
            if page is not None:
                total = conn.execute(text(f"SELECT COUNT(*) FROM public.products{where_clause}"), params).scalar_one()
                params.update({"limit": page_size, "offset": (page - 1) * page_size})
                query = f"{ranking_ctes}{base_query}{where_clause} ORDER BY final_score DESC, {secondary_order} LIMIT :limit OFFSET :offset"
            else:
                total = None
                query = f"{ranking_ctes}{base_query}{where_clause} ORDER BY final_score DESC, {secondary_order}"
            rows = conn.execute(text(query), params).mappings().all()
            raw_products = [{
                "id": str(row["id"]), "brand": row["brand"] or "Myntra", "title": row["name"] or "Untitled product",
                "category": row["category"] or "Accessories", "color": row["color"] or "", "style": row["style"] or "",
                "price": float(row["price"] or 0), "originalPrice": float(row["original_price"] or row["price"] or 0),
                "rating": float(row["rating"]) if row["rating"] is not None else None, "reviews": row["reviews"] or 0,
                "image": row["image_url"] or "", "sizes": row["sizes"] or ["One Size"],
                "description": row["description"] or "Product details are being updated.", "badge": row["badge"],
                "colors": row["colors"] or [row["color"]], "occasions": row["occasions"] or [row["style"]],
                "fabrics": row["fabrics"] or [], "weatherSuitability": row["weather_suitability"] or [],
                "festivalSuitability": row["festival_suitability"] or [], "trendTags": row["trend_tags"] or [],
                "fashionAffinityScore": float(row["fashion_affinity_score"] or 0),
                "recentBehaviorScore": float(row["recent_behavior_score"] or 0),
                "relevanceScore": float(row["final_score"] or 0),
            } for row in rows]
            if recommendation_scope:
                context = ContextCollectionService(engine).cached(current_user.id) or {}
                if any(value is not None for value in (override_weather, override_temperature, override_festival, override_event_title, override_event_type)):
                    context = {**context, "weather": {**(context.get("weather") or {})}, "festival": context.get("festival"), "calendar": {**(context.get("calendar") or {})}}
                    if override_weather is not None:
                        context["weather"]["condition"] = override_weather
                    if override_temperature is not None:
                        context["weather"]["temperature"] = override_temperature
                    if override_festival is not None:
                        context["festival"] = {"name": override_festival}
                    if override_event_title is not None or override_event_type is not None:
                        context["calendar"]["events"] = [{"title": override_event_title or "", "type": override_event_type or ""}]
                products = ContextService(engine).recommend_products(current_user.id, raw_products, context, recommendation_scope)
            else:
                products = raw_products
            if page is not None:
                return {"items": products, "page": page, "pageSize": page_size, "total": total}
            return products
    except Exception as error:
        logger.exception("Failed to fetch product catalog")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Product catalog could not be retrieved.") from error
