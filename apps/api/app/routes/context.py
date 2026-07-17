from fastapi import APIRouter

from app.schemas.context import ContextSnapshot
from app.services.context_service import ContextService

router = APIRouter()
context_service = ContextService()


@router.get("/context", response_model=ContextSnapshot)
def get_context() -> ContextSnapshot:
    return context_service.get_snapshot()
