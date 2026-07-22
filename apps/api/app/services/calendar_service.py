"""Encrypted Google Calendar persistence, fetching, normalization, and caching."""
from __future__ import annotations

import logging
import time as clock
from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlalchemy import Engine, text

from app.schemas.calendar import CalendarEvent
from app.services.google_calendar_oauth import CALENDAR_SCOPE, GoogleCalendarOAuth, OAuthConfigurationError

logger = logging.getLogger(__name__)


class CalendarNotConnectedError(RuntimeError): pass
class CalendarUpstreamError(RuntimeError): pass
class CalendarRevokedError(RuntimeError): pass


class CalendarService:
    _cache: dict[str, tuple[float, list[CalendarEvent]]] = {}
    CACHE_SECONDS = 300

    def __init__(self, engine: Engine | None, oauth: GoogleCalendarOAuth | None = None) -> None:
        self._engine, self._oauth = engine, oauth or GoogleCalendarOAuth()

    def save_connection(self, user_id: str, access_token: str, refresh_token: str, expiry: datetime | None, email: str) -> None:
        self._db_required()
        with self._engine.begin() as conn:
            conn.execute(text("""INSERT INTO calendar_connections (user_id, google_email, access_token, refresh_token, expiry, is_active, updated_at)
                VALUES (:user_id, :email, :access, :refresh, :expiry, TRUE, NOW())
                ON CONFLICT (user_id) DO UPDATE SET google_email=EXCLUDED.google_email, access_token=EXCLUDED.access_token,
                refresh_token=EXCLUDED.refresh_token, expiry=EXCLUDED.expiry, is_active=TRUE, updated_at=NOW()"""),
                {"user_id": user_id, "email": email, "access": self._oauth.encrypt(access_token), "refresh": self._oauth.encrypt(refresh_token), "expiry": expiry})
        self._cache.pop(user_id, None)

    def connected(self, user_id: str) -> bool:
        return self._connection(user_id) is not None

    def events(self, user_id: str, now: datetime | None = None) -> list[CalendarEvent]:
        now = now or datetime.now().astimezone()
        cached = self._cache.get(user_id)
        if cached and cached[0] > clock.monotonic(): return cached[1]
        row = self._connection(user_id)
        if row is None: raise CalendarNotConnectedError("Google Calendar is not connected.")
        credentials = self._credentials(row)
        try:
            if credentials.expired or (credentials.expiry and credentials.expiry <= datetime.utcnow() + timedelta(minutes=2)):
                credentials.refresh(Request())
                self._persist_refreshed(user_id, credentials)
            service = build("calendar", "v3", credentials=credentials, cache_discovery=False)
            response = self._execute_once(lambda: service.events().list(calendarId="primary", timeMin=now.astimezone(timezone.utc).isoformat(), maxResults=20, singleEvents=True, orderBy="startTime").execute())
        except HttpError as error:
            if error.resp.status == 401:
                self.disconnect(user_id, revoke=False); raise CalendarRevokedError("Google access was revoked.") from error
            raise CalendarUpstreamError(f"Google Calendar returned HTTP {error.resp.status}.") from error
        except Exception as error:
            if "invalid_grant" in str(error):
                self.disconnect(user_id, revoke=False); raise CalendarRevokedError("Google access was revoked.") from error
            raise CalendarUpstreamError("Google Calendar could not be reached.") from error
        events = [self.normalize(item, now) for item in response.get("items", [])]
        events = [event for event in events if event.start_time >= now]
        self._cache[user_id] = (clock.monotonic() + self.CACHE_SECONDS, events)
        return events

    def status(self, user_id: str) -> tuple[dict[str, Any] | None, list[CalendarEvent]]:
        row = self._connection(user_id)
        if row is None: return None, []
        events = self.events(user_id)
        return row, events

    def disconnect(self, user_id: str, revoke: bool = True) -> None:
        row = self._connection(user_id)
        if row and revoke:
            try:
                from urllib.request import Request as UrlRequest, urlopen
                urlopen(UrlRequest("https://oauth2.googleapis.com/revoke", data=("token=" + self._oauth.decrypt(row["access_token"])).encode(), method="POST"), timeout=5)
            except Exception: logger.info("Google token revocation failed; removing local credentials")
        if self._engine:
            with self._engine.begin() as conn: conn.execute(text("DELETE FROM calendar_connections WHERE user_id=:user_id"), {"user_id": user_id})
        self._cache.pop(user_id, None)

    def primary_calendar_email(self, access_token: str, refresh_token: str, expiry: datetime | None) -> str:
        credentials = Credentials(access_token, refresh_token=refresh_token, token_uri="https://oauth2.googleapis.com/token", client_id=self._oauth.client_id, client_secret=self._oauth.client_secret, scopes=[CALENDAR_SCOPE], expiry=expiry)
        service = build("calendar", "v3", credentials=credentials, cache_discovery=False)
        return str(service.calendarList().get(calendarId="primary").execute().get("id") or "Google Calendar")

    @staticmethod
    def classify(title: str, description: str = "") -> str:
        value = f"{title} {description}".casefold()
        groups = {"wedding": ("wedding", "reception", "marriage"), "interview": ("interview", "placement", "hr round"), "birthday": ("birthday",), "office": ("office", "meeting", "conference"), "travel": ("vacation", "trip", "flight"), "college": ("hackathon", "college fest", "orientation"), "date": ("date", "dinner", "movie"), "festival": ("festival", "puja", "celebration")}
        return next((kind for kind, words in groups.items() if any(word in value for word in words)), "general")

    @staticmethod
    def importance(event_type: str) -> str:
        return "High" if event_type in {"wedding", "interview", "festival"} else "Medium" if event_type in {"birthday", "travel"} else "Low"

    @classmethod
    def normalize(cls, raw: dict[str, Any], now: datetime) -> CalendarEvent:
        start_value, end_value = raw.get("start", {}), raw.get("end", {})
        all_day = "date" in start_value
        try:
            zone = ZoneInfo(raw.get("start", {}).get("timeZone") or "UTC")
        except Exception:
            zone = now.tzinfo or timezone.utc
        if all_day:
            start = datetime.combine(date.fromisoformat(start_value["date"]), time.min, tzinfo=zone)
            end = datetime.combine(date.fromisoformat(end_value.get("date", start_value["date"])), time.min, tzinfo=zone)
        else:
            start = datetime.fromisoformat(start_value["dateTime"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(end_value.get("dateTime", start_value["dateTime"]).replace("Z", "+00:00"))
        event_type = cls.classify(str(raw.get("summary") or ""), str(raw.get("description") or ""))
        return CalendarEvent(title=str(raw.get("summary") or "Untitled event"), start_time=start, end_time=end, days_remaining=max(0, (start.astimezone(now.tzinfo).date() - now.date()).days), event_type=event_type, importance=cls.importance(event_type), location=raw.get("location"), all_day=all_day)

    def _connection(self, user_id: str) -> dict[str, Any] | None:
        if not self._engine: return None
        with self._engine.connect() as conn:
            row = conn.execute(text("SELECT * FROM calendar_connections WHERE user_id=:user_id AND is_active=TRUE"), {"user_id": user_id}).mappings().first()
        return dict(row) if row else None

    def _credentials(self, row: dict[str, Any]) -> Credentials:
        expiry = row.get("expiry")
        if expiry is not None and expiry.tzinfo is not None:
            expiry = expiry.astimezone(timezone.utc).replace(tzinfo=None)
        return Credentials(self._oauth.decrypt(row["access_token"]), refresh_token=self._oauth.decrypt(row["refresh_token"]), token_uri="https://oauth2.googleapis.com/token", client_id=self._oauth.client_id, client_secret=self._oauth.client_secret, scopes=[CALENDAR_SCOPE], expiry=expiry)

    def _persist_refreshed(self, user_id: str, credentials: Credentials) -> None:
        with self._engine.begin() as conn: conn.execute(text("UPDATE calendar_connections SET access_token=:token, expiry=:expiry, updated_at=NOW() WHERE user_id=:user_id"), {"token": self._oauth.encrypt(credentials.token), "expiry": credentials.expiry, "user_id": user_id})

    @staticmethod
    def _execute_once(operation: Any) -> Any:
        try: return operation()
        except HttpError as error:
            if error.resp.status != 429: raise
            clock.sleep(1)
            return operation()

    def _db_required(self) -> None:
        if not self._engine: raise OAuthConfigurationError("Database connection is unavailable.")
