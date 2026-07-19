"""Server-side Supabase Auth lookup for bearer access tokens."""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass

from supabase import create_client

logger = logging.getLogger(__name__)


class AuthConfigurationError(RuntimeError):
    """Raised when the Supabase server client cannot be configured."""


class TokenValidationError(ValueError):
    """Raised when Supabase Auth rejects a bearer access token."""


@dataclass(frozen=True, slots=True)
class AuthenticatedUser:
    """Minimal trusted identity returned by Supabase Auth."""

    id: str
    email: str | None


class AuthService:
    """Resolve the authenticated user through the official Supabase client."""

    def __init__(self, *, supabase_url: str | None = None, service_role_key: str | None = None) -> None:
        self._supabase_url = (supabase_url or os.getenv("SUPABASE_URL") or "").rstrip("/")
        self._service_role_key = service_role_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""

    def get_user(self, access_token: str) -> AuthenticatedUser:
        if not self._supabase_url or not self._service_role_key:
            raise AuthConfigurationError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.")
        if not access_token or not access_token.strip():
            raise TokenValidationError("Token is missing.")
        try:
            response = create_client(self._supabase_url, self._service_role_key).auth.get_user(access_token)
        except Exception as error:
            # Supabase validates the token at Auth; this service never decodes
            # tokens or verifies JWT signatures itself.
            logger.info("Supabase rejected the supplied access token")
            raise TokenValidationError("Invalid or expired access token.") from error

        user = getattr(response, "user", None)
        user_id = getattr(user, "id", None)
        if not isinstance(user_id, str) or not user_id:
            raise TokenValidationError("Invalid or expired access token.")
        email = getattr(user, "email", None)
        return AuthenticatedUser(id=user_id, email=email if isinstance(email, str) else None)
