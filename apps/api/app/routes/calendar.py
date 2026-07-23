"""Authenticated Google Calendar secondary-account endpoints."""
from __future__ import annotations

from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse

from app.core.database import get_engine
from app.dependencies.auth import get_current_user
from app.schemas.calendar import CalendarConnectResponse, CalendarEvent, CalendarStatus
from app.services.auth_service import AuthenticatedUser
from app.services.calendar_service import CalendarNotConnectedError, CalendarRevokedError, CalendarService, CalendarUpstreamError
from app.services.google_calendar_oauth import GoogleCalendarOAuth, OAuthConfigurationError, OAuthStateError

router = APIRouter(prefix="/calendar", tags=["calendar"])


def service() -> CalendarService:
    return CalendarService(get_engine())


@router.post("/connect", response_model=CalendarConnectResponse)
def connect(current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]) -> CalendarConnectResponse:
    try:
        return CalendarConnectResponse(authorization_url=GoogleCalendarOAuth().authorization_url(current_user.id))
    except OAuthConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.get("/callback")
def callback(code: str | None = Query(default=None), state: str | None = Query(default=None), error: str | None = Query(default=None)) -> RedirectResponse:
    oauth = GoogleCalendarOAuth()
    target = oauth.frontend_callback_url
    if error or not code or not state:
        return RedirectResponse(target.replace("connected", "error") + "&reason=" + quote(error or "authorization_failed"), status_code=303)
    try:
        user_id = oauth.user_id_from_state(state)
        access_token, refresh_token, expiry, fallback_email = oauth.exchange_code(code, state)
        calendar = CalendarService(get_engine(), oauth)
        email = calendar.primary_calendar_email(access_token, refresh_token, expiry) or fallback_email
        calendar.save_connection(user_id, access_token, refresh_token, expiry, email)
    except (OAuthStateError, OAuthConfigurationError, CalendarUpstreamError) as exc:
        return RedirectResponse(target.replace("connected", "error") + "&reason=" + quote(str(exc)), status_code=303)
    return RedirectResponse(target, status_code=303)


@router.get("/status", response_model=CalendarStatus)
def calendar_status(current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]) -> CalendarStatus:
    try:
        row, events = service().status(current_user.id)
    except CalendarRevokedError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except CalendarUpstreamError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    if row is None: return CalendarStatus(connected=False)
    return CalendarStatus(connected=True, email=row["google_email"], next_event=events[0] if events else None, event_count=len(events))


@router.get("", response_model=list[CalendarEvent])
def calendar_events(current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]) -> list[CalendarEvent]:
    try:
        return service().events(current_user.id)
    except CalendarNotConnectedError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except CalendarRevokedError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except CalendarUpstreamError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.delete("/disconnect", status_code=status.HTTP_204_NO_CONTENT)
def disconnect(current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]) -> None:
    service().disconnect(current_user.id)
