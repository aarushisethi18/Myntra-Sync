"""Authenticated Time Analytics endpoints."""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_engine
from app.dependencies.auth import get_current_user
from app.schemas.analytics import AnalyticsEventInput, AnalyticsSummary
from app.services.analytics_service import AnalyticsService
from app.services.auth_service import AuthenticatedUser

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.post("/event", status_code=status.HTTP_201_CREATED)
def record_event(event: AnalyticsEventInput, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if engine is None: raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Analytics storage is unavailable.")
    AnalyticsService(engine).record(str(current_user.id), event.model_dump())
    return {"accepted": True}

@router.get("/summary", response_model=AnalyticsSummary)
def get_summary(current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if engine is None: return AnalyticsSummary()
    try: return AnalyticsService(engine).summary(str(current_user.id))
    except Exception: return AnalyticsSummary()

@router.get("/shopping-insights")
def get_shopping_insights(current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if engine is None: raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Analytics storage is unavailable.")
    try: return AnalyticsService(engine).shopping_insights(str(current_user.id))
    except Exception as error: raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Shopping insights are unavailable.") from error