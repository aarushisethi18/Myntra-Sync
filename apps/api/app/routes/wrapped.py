"""Authenticated Fashion Wrapped endpoint."""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_engine
from app.dependencies.auth import get_current_user
from app.services.auth_service import AuthenticatedUser
from app.services.wrapped_service import WrappedService

router = APIRouter(prefix="/wrapped", tags=["wrapped"])

@router.get("")
def get_wrapped(current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if engine is None:
        raise HTTPException(503, "Fashion Wrapped is unavailable until shopping history storage is configured.")
    return WrappedService(engine).generate(str(current_user.id), current_user.email.split("@")[0] if current_user.email else None)
