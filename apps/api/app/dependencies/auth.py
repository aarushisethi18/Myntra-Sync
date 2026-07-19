"""FastAPI dependency for retrieving the authenticated Supabase user."""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.auth_service import (
    AuthConfigurationError,
    AuthService,
    AuthenticatedUser,
    TokenValidationError,
)

_bearer_scheme = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
) -> AuthenticatedUser:
    """Return the Supabase-authenticated user for a protected endpoint.

    Add ``current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]``
    to future endpoints rather than reimplementing authorization parsing.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A Bearer access token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return AuthService().get_user(credentials.credentials)
    except AuthConfigurationError as error:
        logger.error("Supabase authentication client is not configured")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication could not be validated.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error
    except TokenValidationError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error
