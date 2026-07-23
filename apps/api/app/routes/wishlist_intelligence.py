"""Thin authenticated controller for wishlist intelligence."""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import get_engine
from app.dependencies.auth import get_current_user
from app.repositories.wishlist_repository import WishlistRepository
from app.schemas.wishlist_intelligence import WishlistIntelligenceResponse
from app.services.auth_service import AuthenticatedUser
from app.services.wishlist_intelligence_service import WishlistIntelligenceService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["wishlist"])


@router.get("/wishlist/intelligence", response_model=WishlistIntelligenceResponse)
def get_wishlist_intelligence(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    engine = get_engine()
    if engine is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable.",
        )
    try:
        return WishlistIntelligenceService(WishlistRepository(engine)).intelligence(current_user.id)
    except Exception as error:
        logger.exception("Failed to derive wishlist intelligence")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve wishlist intelligence.",
        ) from error
