"""Authenticated APIs for implicit behavior learning and Fashion DNA."""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import get_engine
from app.dependencies.auth import get_current_user
from app.schemas.behavior import BehaviorEventInput, FashionDnaResponse
from app.services.auth_service import AuthenticatedUser
from app.services.behavior_engine import BehaviorEngine
from app.services.fashion_dna_service import FashionDnaService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["behavior"])


@router.post("/behavior/event", status_code=status.HTTP_200_OK)
def record_behavior_event(event: BehaviorEventInput, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Behavior storage is unavailable.")
    try:
        # JSON mode converts Decimal prices and other JSON-native Pydantic
        # values before the event is persisted as JSONB.
        accepted = BehaviorEngine(engine).ingest(current_user.id, event.model_dump(mode="json", exclude_none=True))
    except Exception as error:
        logger.exception("Behavior event ingestion failed")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Behavior event could not be stored.") from error
    return {"accepted": accepted}


@router.get("/fashion-dna", response_model=FashionDnaResponse)
def get_fashion_dna(current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Fashion DNA storage is unavailable.")
    try:
        return FashionDnaService().get(engine, current_user.id)
    except Exception as error:
        logger.exception("Fashion DNA retrieval failed")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Fashion DNA is unavailable.") from error
