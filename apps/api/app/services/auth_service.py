"""Supabase access-token verification for API dependencies.

Supabase Auth issues HMAC-SHA256 access tokens when a project is configured
with its JWT secret.  Keeping verification here gives every protected route a
single, consistent trust boundary.
"""
from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse
from uuid import UUID

from dotenv import load_dotenv

load_dotenv()


class AuthConfigurationError(RuntimeError):
    """Raised when the API cannot verify tokens safely."""


class TokenValidationError(ValueError):
    """Raised when a supplied bearer token is not a valid Supabase JWT."""


@dataclass(frozen=True, slots=True)
class AuthenticatedUser:
    """The stable identity shape shared by future authenticated endpoints."""

    id: str
    email: str | None
    claims: dict[str, Any]


class AuthService:
    """Validate Supabase HS256 access tokens and return their user identity."""

    _expected_audience = "authenticated"

    def __init__(self, *, supabase_url: str | None = None, jwt_secret: str | None = None) -> None:
        self._supabase_url = (supabase_url or os.getenv("SUPABASE_URL") or "").rstrip("/")
        self._jwt_secret = jwt_secret or os.getenv("SUPABASE_JWT_SECRET") or ""

    def verify_token(self, token: str) -> AuthenticatedUser:
        """Verify a bearer token's signature and required Supabase claims."""
        if not self._supabase_url or not self._jwt_secret:
            raise AuthConfigurationError(
                "SUPABASE_URL and SUPABASE_JWT_SECRET must be configured to verify access tokens."
            )
        if not isinstance(token, str) or not token.strip():
            raise TokenValidationError("Token is missing.")

        parts = token.split(".")
        if len(parts) != 3 or any(not part for part in parts):
            raise TokenValidationError("Token must be a three-part JWT.")

        encoded_header, encoded_payload, encoded_signature = parts
        header = self._decode_json_segment(encoded_header, "header")
        claims = self._decode_json_segment(encoded_payload, "payload")
        if header.get("alg") != "HS256":
            raise TokenValidationError("Unsupported JWT signing algorithm.")

        signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
        expected_signature = hmac.new(
            self._jwt_secret.encode("utf-8"), signing_input, hashlib.sha256
        ).digest()
        supplied_signature = self._decode_base64url(encoded_signature, "signature")
        if not hmac.compare_digest(expected_signature, supplied_signature):
            raise TokenValidationError("JWT signature is invalid.")

        self._validate_claims(claims)
        subject = claims["sub"]
        email = claims.get("email")
        return AuthenticatedUser(
            id=subject,
            email=email if isinstance(email, str) else None,
            claims=claims,
        )

    @staticmethod
    def _decode_base64url(value: str, segment_name: str) -> bytes:
        try:
            padding = "=" * (-len(value) % 4)
            return base64.b64decode(value + padding, altchars=b"-_", validate=True)
        except (ValueError, binascii.Error) as error:
            raise TokenValidationError(f"JWT {segment_name} is malformed.") from error

    def _decode_json_segment(self, value: str, segment_name: str) -> dict[str, Any]:
        try:
            decoded = self._decode_base64url(value, segment_name).decode("utf-8")
            parsed = json.loads(decoded)
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise TokenValidationError(f"JWT {segment_name} is malformed.") from error
        if not isinstance(parsed, dict):
            raise TokenValidationError(f"JWT {segment_name} must be an object.")
        return parsed

    def _validate_claims(self, claims: dict[str, Any]) -> None:
        expected_issuer = f"{self._supabase_url}/auth/v1"
        if claims.get("iss") != expected_issuer:
            raise TokenValidationError("JWT issuer is invalid.")
        if claims.get("aud") != self._expected_audience:
            raise TokenValidationError("JWT audience is invalid.")

        subject = claims.get("sub")
        if not isinstance(subject, str):
            raise TokenValidationError("JWT subject is missing.")
        try:
            UUID(subject)
        except (TypeError, ValueError) as error:
            raise TokenValidationError("JWT subject must be a UUID.") from error

        now = time.time()
        expiration = self._numeric_claim(claims, "exp", required=True)
        if now >= expiration:
            raise TokenValidationError("JWT has expired.")

        not_before = self._numeric_claim(claims, "nbf", required=False)
        if not_before is not None and now < not_before:
            raise TokenValidationError("JWT is not active yet.")

        issued_at = self._numeric_claim(claims, "iat", required=False)
        if issued_at is not None and issued_at > now + 60:
            raise TokenValidationError("JWT issued-at time is invalid.")

    @staticmethod
    def _numeric_claim(claims: dict[str, Any], name: str, *, required: bool) -> float | None:
        value = claims.get(name)
        if value is None:
            if required:
                raise TokenValidationError(f"JWT {name} claim is missing.")
            return None
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise TokenValidationError(f"JWT {name} claim must be numeric.")
        return float(value)
