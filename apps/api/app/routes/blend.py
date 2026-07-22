"""Invite lifecycle and live Blend results."""
from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import get_engine
from app.dependencies.auth import get_current_user
from app.schemas.blend import BlendResult, CreateBlendResponse, JoinBlendResponse
from app.services.auth_service import AuthenticatedUser
from app.services.blend_engine import BlendEngine

router = APIRouter(prefix="/blend", tags=["blend"])

class GenerateRequest(BaseModel):
    occasion: str | None = None
    mood: str | None = None
    budget: str | None = None
    weather: str | None = None

def _session(code: str):
    engine = get_engine()
    if not engine: raise HTTPException(503, "Blend is unavailable until Context storage is configured.")
    with engine.connect() as conn:
        row = conn.execute(text("SELECT s.id, s.created_by, s.joined_by, s.status, s.created_at, u.full_name AS host_name FROM blend_sessions s LEFT JOIN users u ON u.id = s.created_by WHERE s.invite_code = :code"), {"code": code}).mappings().first()
    if not row: raise HTTPException(404, "This Blend invite is invalid or has expired.")
    return dict(row)

@router.post("/sessions", response_model=CreateBlendResponse, status_code=status.HTTP_201_CREATED)
def create_blend(current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    print(">>> CREATE BLEND CALLED <<<")
    engine = get_engine()
    if not engine: raise HTTPException(503, "Blend is unavailable until Context storage is configured.")
    for _ in range(3):
        code = secrets.token_urlsafe(8).replace("-", "").replace("_", "")[:12]
        try:
            with engine.begin() as conn:
                row = conn.execute(text("INSERT INTO blend_sessions (invite_code, created_by, status) VALUES (:code, :user_id, 'pending') RETURNING id"), {"code": code, "user_id": current_user.id}).mappings().one()
            return CreateBlendResponse(id=str(row["id"]), inviteCode=code, inviteUrl=f"/blend/invite/{code}", status="pending")
        except SQLAlchemyError as e:
            print("Blend session creation failed:", e)
    raise
    raise HTTPException(500, "Unable to create a unique Blend invite. Please try again.")

@router.get("/invites/{invite_code}")
def inspect_invite(invite_code: str):
    row = _session(invite_code)
    return {"inviteCode": invite_code, "status": row["status"], "createdAt": row["created_at"], "hostName": row.get("host_name") or "A fashion partner"}

@router.post("/invites/{invite_code}/accept", response_model=JoinBlendResponse)
def accept_invite(invite_code: str, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    row = _session(invite_code)
    if row["status"] == "expired": raise HTTPException(410, "This Blend invite has expired.")
    if str(row["created_by"]) == str(current_user.id): raise HTTPException(400, "You cannot join your own Blend invite.")
    if row["joined_by"] and str(row["joined_by"]) != str(current_user.id): raise HTTPException(409, "This Blend already has two members.")
    with get_engine().begin() as conn:
        conn.execute(text("UPDATE blend_sessions SET joined_by=:user_id, status='joined' WHERE id=:id"), {"user_id": current_user.id, "id": row["id"]})
    return JoinBlendResponse(id=str(row["id"]), status="joined")

def _result(invite_code: str, user: AuthenticatedUser, controls: dict[str, str] | None = None):
    row = _session(invite_code)
    if row["status"] != "joined" or not row["joined_by"]: raise HTTPException(409, "Your friend has not joined this Blend yet.")
    if str(user.id) not in {str(row["created_by"]), str(row["joined_by"])}: raise HTTPException(403, "Only Blend members can view this result.")
    try: return BlendEngine(get_engine()).generate(str(row["id"]), str(row["created_by"]), str(row["joined_by"]), controls)
    except ValueError as error: raise HTTPException(422, str(error)) from error

@router.get("/sessions/{invite_code}/result", response_model=BlendResult)
def get_result(invite_code: str, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    return _result(invite_code, current_user)

@router.post("/sessions/{invite_code}/regenerate", response_model=BlendResult)
def regenerate(invite_code: str, request: GenerateRequest, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    return _result(invite_code, current_user, request.model_dump(exclude_none=True))
