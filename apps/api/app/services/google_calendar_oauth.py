"""Google OAuth support for an already authenticated Supabase user."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from datetime import datetime, timezone
from urllib.parse import quote

from cryptography.fernet import Fernet, InvalidToken
from google_auth_oauthlib.flow import Flow

CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly"


class OAuthConfigurationError(RuntimeError):
    pass


class OAuthStateError(ValueError):
    pass


class GoogleCalendarOAuth:
    def __init__(self) -> None:
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
        self._state_secret = os.getenv("CALENDAR_OAUTH_STATE_SECRET")
        self._encryption_key = os.getenv("CALENDAR_TOKEN_ENCRYPTION_KEY")

    def _require_config(self) -> None:
        if not all((self.client_id, self.client_secret, self.redirect_uri, self._state_secret, self._encryption_key)):
            raise OAuthConfigurationError("Google Calendar OAuth is not configured.")

    def _flow(self, state: str | None = None) -> Flow:
        self._require_config()
        return Flow.from_client_config({"web": {"client_id": self.client_id, "client_secret": self.client_secret, "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token"}}, scopes=[CALENDAR_SCOPE], state=state, redirect_uri=self.redirect_uri)

    def authorization_url(self, user_id: str) -> str:
        state = self.make_state(user_id)
        url, _ = self._flow(state).authorization_url(access_type="offline", include_granted_scopes="true", prompt="consent")
        return url

    def exchange_code(self, code: str, state: str) -> tuple[str, str, datetime | None, str]:
        self.validate_state(state)
        flow = self._flow(state)
        flow.fetch_token(code=code)
        credentials = flow.credentials
        if not credentials.refresh_token:
            raise OAuthConfigurationError("Google did not return a refresh token; reconnect and grant consent.")
        expiry = credentials.expiry
        return credentials.token, credentials.refresh_token, expiry, self.user_email(credentials)

    def user_id_from_state(self, state: str) -> str:
        return self.validate_state(state)

    def make_state(self, user_id: str) -> str:
        self._require_config()
        payload = json.dumps({"uid": user_id, "exp": int(time.time()) + 600}, separators=(",", ":")).encode()
        signature = hmac.new(self._state_secret.encode(), payload, hashlib.sha256).digest()
        return base64.urlsafe_b64encode(payload + b"." + signature).decode().rstrip("=")

    def validate_state(self, state: str) -> str:
        self._require_config()
        try:
            raw = base64.urlsafe_b64decode(state + "=" * (-len(state) % 4))
            payload, signature = raw.rsplit(b".", 1)
            expected = hmac.new(self._state_secret.encode(), payload, hashlib.sha256).digest()
            data = json.loads(payload)
        except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as error:
            raise OAuthStateError("Invalid OAuth state.") from error
        if not hmac.compare_digest(signature, expected) or int(data.get("exp", 0)) < time.time() or not data.get("uid"):
            raise OAuthStateError("Expired or invalid OAuth state.")
        return str(data["uid"])

    def encrypt(self, value: str) -> str:
        self._require_config()
        return Fernet(self._encryption_key.encode()).encrypt(value.encode()).decode()

    def decrypt(self, value: str) -> str:
        self._require_config()
        try:
            return Fernet(self._encryption_key.encode()).decrypt(value.encode()).decode()
        except InvalidToken as error:
            raise OAuthConfigurationError("Stored calendar credentials cannot be decrypted.") from error

    @staticmethod
    def user_email(credentials: object) -> str:
        # The primary calendar id is retrieved by CalendarService after OAuth.
        # A neutral label avoids requesting broader profile/email scopes.
        return "Google Calendar"

    @property
    def frontend_callback_url(self) -> str:
        return os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/") + "/?calendar=connected"
