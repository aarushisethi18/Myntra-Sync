"""Thin authenticated controller for order-history intelligence."""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.database import get_engine
from app.dependencies.auth import get_current_user
from app.repositories.order_history_repository import OrderHistoryRepository
from app.schemas.order_history import OrderHistoryResponse
from app.services.auth_service import AuthenticatedUser
from app.services.order_history_service import OrderHistoryService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["order-history"])


@router.get("/order-history/intelligence", response_model=OrderHistoryResponse)
def get_order_history_intelligence(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    recommendation_id: str | None = Query(default=None),
):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="Database unavailable.")
    try:
        return OrderHistoryService(OrderHistoryRepository(engine)).intelligence(current_user.id, recommendation_id)
    except Exception as error:
        logger.exception("Failed to derive order-history intelligence")
        raise HTTPException(status_code=500, detail="Could not retrieve order-history intelligence.") from error
