"""Invite lifecycle, live Blend results, shared closet, outfit voting, twin looks."""
from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import get_engine
from app.dependencies.auth import get_current_user
from app.schemas.blend import (
    BlendResult,
    BlendSessionSummary,
    CreateBlendResponse,
    JoinBlendResponse,
    OutfitVote,
    SaveClosetRequest,
    SharedClosetItem,
    SharedWishlistItem,
    TwinLookResponse,
    VoteRequest,
    MoreLooksRequest,
)
from app.services.auth_service import AuthenticatedUser
from app.services.blend_engine import BlendEngine

router = APIRouter(prefix="/blend", tags=["blend"])


class GenerateRequest(BaseModel):
    occasion: str | None = None
    mood: str | None = None
    budget: str | None = None
    weather: str | None = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _session(code: str) -> dict:
    engine = get_engine()
    if not engine:
        raise HTTPException(503, "Blend is unavailable until Context storage is configured.")
    with engine.connect() as conn:
        row = conn.execute(
            text("""
                SELECT s.id, s.created_by, s.joined_by, s.status, s.created_at,
                       s.blend_name, s.blend_description, s.compatibility_score,
                       s.last_opened_at, s.last_computed_at,
                       u.full_name AS host_name
                FROM blend_sessions s
                LEFT JOIN users u ON u.id = s.created_by
                WHERE s.invite_code = :code
            """),
            {"code": code},
        ).mappings().first()
    if not row:
        raise HTTPException(404, "This Blend invite is invalid or has expired.")
    return dict(row)


def _assert_member(row: dict, user: AuthenticatedUser) -> None:
    if str(user.id) not in {str(row["created_by"]), str(row.get("joined_by", ""))}:
        raise HTTPException(403, "Only Blend members can access this resource.")


# ─── Session management ───────────────────────────────────────────────────────

@router.post("/sessions", response_model=CreateBlendResponse, status_code=status.HTTP_201_CREATED)
def create_blend(current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    engine = get_engine()
    if not engine:
        raise HTTPException(503, "Blend is unavailable until Context storage is configured.")
    for _ in range(3):
        code = secrets.token_urlsafe(8).replace("-", "").replace("_", "")[:12]
        try:
            with engine.begin() as conn:
                row = conn.execute(
                    text("INSERT INTO blend_sessions (invite_code, created_by, status) VALUES (:code, :user_id, 'pending') RETURNING id"),
                    {"code": code, "user_id": current_user.id},
                ).mappings().one()
            return CreateBlendResponse(id=str(row["id"]), inviteCode=code, inviteUrl=f"/blend/invite/{code}", status="pending")
        except SQLAlchemyError:
            continue
    raise HTTPException(500, "Unable to create a unique Blend invite. Please try again.")


@router.get("/invites/{invite_code}")
def inspect_invite(invite_code: str):
    row = _session(invite_code)
    return {
        "inviteCode": invite_code,
        "status": row["status"],
        "createdAt": str(row["created_at"]),
        "hostName": row.get("host_name") or "A fashion partner",
    }


@router.post("/invites/{invite_code}/accept", response_model=JoinBlendResponse)
def accept_invite(invite_code: str, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    row = _session(invite_code)
    if row["status"] == "expired":
        raise HTTPException(410, "This Blend invite has expired.")
    if str(row["created_by"]) == str(current_user.id):
        raise HTTPException(400, "You cannot join your own Blend invite.")
    if row["joined_by"] and str(row["joined_by"]) != str(current_user.id):
        raise HTTPException(409, "This Blend already has two members.")
    with get_engine().begin() as conn:
        conn.execute(
            text("UPDATE blend_sessions SET joined_by=:user_id, status='joined' WHERE id=:id"),
            {"user_id": current_user.id, "id": row["id"]},
        )
    return JoinBlendResponse(id=str(row["id"]), status="joined")


# ─── My Blends ───────────────────────────────────────────────────────────────

@router.get("/my-blends", response_model=list[BlendSessionSummary])
def my_blends(current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    """List all Blend sessions the current user has created or joined."""
    engine = get_engine()
    if not engine:
        raise HTTPException(503, "Blend is unavailable until Context storage is configured.")
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT s.id, s.invite_code, s.status, s.blend_name, s.blend_description,
                       s.compatibility_score, s.created_at, s.last_opened_at, s.last_computed_at,
                       CASE
                           WHEN s.created_by = :uid THEN u2.full_name
                           ELSE u1.full_name
                       END AS partner_name
                FROM blend_sessions s
                LEFT JOIN users u1 ON u1.id = s.created_by
                LEFT JOIN users u2 ON u2.id = s.joined_by
                WHERE (s.created_by = :uid OR s.joined_by = :uid)
                  AND s.status = 'joined'
                ORDER BY COALESCE(s.last_opened_at, s.created_at) DESC
                LIMIT 20
            """),
            {"uid": current_user.id},
        ).mappings().all()
        # Update last_opened_at for current user implicitly
        conn.execute(
            text("UPDATE blend_sessions SET last_opened_at = NOW() WHERE (created_by = :uid OR joined_by = :uid) AND status = 'joined'"),
            {"uid": current_user.id},
        )
    return [
        BlendSessionSummary(
            id=str(row["id"]),
            inviteCode=row["invite_code"],
            status=row["status"],
            blendName=row.get("blend_name"),
            blendDescription=row.get("blend_description"),
            compatibilityScore=row.get("compatibility_score"),
            partnerName=row.get("partner_name"),
            createdAt=str(row["created_at"]),
            lastOpenedAt=str(row["last_opened_at"]) if row.get("last_opened_at") else None,
            lastComputedAt=str(row["last_computed_at"]) if row.get("last_computed_at") else None,
        )
        for row in rows
    ]


# ─── Result ───────────────────────────────────────────────────────────────────

def _result(invite_code: str, user: AuthenticatedUser, controls: dict | None = None):
    row = _session(invite_code)
    if row["status"] != "joined" or not row["joined_by"]:
        raise HTTPException(409, "Your friend has not joined this Blend yet.")
    _assert_member(row, user)
    # Touch last_opened_at
    try:
        with get_engine().begin() as conn:
            conn.execute(
                text("UPDATE blend_sessions SET last_opened_at = NOW() WHERE id = :id"),
                {"id": row["id"]},
            )
    except Exception:
        pass
    try:
        return BlendEngine(get_engine()).generate(str(row["id"]), str(row["created_by"]), str(row["joined_by"]), controls)
    except ValueError as error:
        raise HTTPException(422, str(error)) from error


@router.get("/sessions/{invite_code}/result", response_model=BlendResult)
def get_result(invite_code: str, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    return _result(invite_code, current_user)


@router.post("/sessions/{invite_code}/regenerate", response_model=BlendResult)
def regenerate(invite_code: str, request: GenerateRequest, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    return _result(invite_code, current_user, request.model_dump(exclude_none=True))


# ─── Shared Closet ───────────────────────────────────────────────────────────

@router.get("/sessions/{invite_code}/shared-closet", response_model=list[SharedClosetItem])
def get_shared_closet(invite_code: str, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    row = _session(invite_code)
    _assert_member(row, current_user)
    engine = get_engine()
    with engine.connect() as conn:
        items = conn.execute(
            text("""
                SELECT sc.id, sc.session_id, sc.product_id, sc.product_snapshot,
                       sc.occasion, sc.saved_by, sc.created_at,
                       sc.occasion_type, sc.occasion_label, sc.notes,
                       u.full_name AS saved_by_name
                FROM blend_shared_closet sc
                LEFT JOIN users u ON u.id = sc.saved_by
                WHERE sc.session_id = :session_id
                ORDER BY sc.created_at DESC
            """),
            {"session_id": row["id"]},
        ).mappings().all()
    return [
        SharedClosetItem(
            id=str(item["id"]),
            sessionId=str(item["session_id"]),
            productId=str(item["product_id"]) if item.get("product_id") else None,
            productSnapshot=dict(item["product_snapshot"]) if item.get("product_snapshot") else {},
            occasion=item.get("occasion"),
            occasionType=item.get("occasion_type"),
            occasionLabel=item.get("occasion_label"),
            notes=item.get("notes"),
            savedBy=str(item["saved_by"]),
            savedByName=item.get("saved_by_name"),
            createdAt=str(item["created_at"]),
        )
        for item in items
    ]


@router.post("/sessions/{invite_code}/shared-closet", response_model=SharedClosetItem, status_code=status.HTTP_201_CREATED)
def save_to_closet(
    invite_code: str,
    body: SaveClosetRequest,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    row = _session(invite_code)
    _assert_member(row, current_user)
    engine = get_engine()
    with engine.begin() as conn:
        inserted = conn.execute(
            text("""
                INSERT INTO blend_shared_closet (session_id, product_id, product_snapshot, occasion, occasion_type, occasion_label, notes, saved_by)
                VALUES (:session_id, :product_id, :snapshot, :occasion, :occasion_type, :occasion_label, :notes, :saved_by)
                ON CONFLICT (session_id, product_id) DO UPDATE
                    SET occasion = EXCLUDED.occasion,
                        occasion_type = EXCLUDED.occasion_type,
                        occasion_label = EXCLUDED.occasion_label,
                        notes = EXCLUDED.notes,
                        product_snapshot = EXCLUDED.product_snapshot
                RETURNING id, session_id, product_id, product_snapshot, occasion, occasion_type, occasion_label, notes, saved_by, created_at
            """),
            {
                "session_id": row["id"],
                "product_id": body.productId,
                "snapshot": __import__("json").dumps(body.productSnapshot),
                "occasion": body.occasion,
                "occasion_type": body.occasionType,
                "occasion_label": body.occasionLabel,
                "notes": body.notes,
                "saved_by": current_user.id,
            },
        ).mappings().one()
        user_name = conn.execute(text("SELECT full_name FROM users WHERE id = :id"), {"id": current_user.id}).scalar()
    return SharedClosetItem(
        id=str(inserted["id"]),
        sessionId=str(inserted["session_id"]),
        productId=str(inserted["product_id"]) if inserted.get("product_id") else None,
        productSnapshot=dict(inserted["product_snapshot"]) if inserted.get("product_snapshot") else {},
        occasion=inserted.get("occasion"),
        occasionType=inserted.get("occasion_type"),
        occasionLabel=inserted.get("occasion_label"),
        notes=inserted.get("notes"),
        savedBy=str(inserted["saved_by"]),
        savedByName=user_name,
        createdAt=str(inserted["created_at"]),
    )


@router.delete("/sessions/{invite_code}/shared-closet/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_closet(
    invite_code: str,
    item_id: str,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    row = _session(invite_code)
    _assert_member(row, current_user)
    with get_engine().begin() as conn:
        result = conn.execute(
            text("DELETE FROM blend_shared_closet WHERE id = :item_id AND saved_by = :user_id RETURNING id"),
            {"item_id": item_id, "user_id": current_user.id},
        )
        if result.rowcount == 0:
            raise HTTPException(404, "Item not found or you did not save this item.")


@router.post("/sessions/{invite_code}/more-looks", response_model=list[dict])
def get_more_looks(
    invite_code: str,
    body: MoreLooksRequest,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    row = _session(invite_code)
    if row["status"] != "joined" or not row.get("joined_by"):
        raise HTTPException(409, "Blend is not yet active.")
    _assert_member(row, current_user)
    try:
        engine = get_engine()
        results = BlendEngine(engine).generate_more_looks(
            str(row["id"]),
            str(row["created_by"]),
            str(row["joined_by"]),
            body.excludeProductIds,
            body.occasion,
        )
        return results
    except Exception as err:
        raise HTTPException(503, f"Could not generate more looks: {str(err)}")



# ─── Outfit Voting ────────────────────────────────────────────────────────────

@router.get("/sessions/{invite_code}/votes", response_model=list[OutfitVote])
def get_votes(invite_code: str, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    row = _session(invite_code)
    _assert_member(row, current_user)
    engine = get_engine()
    with engine.connect() as conn:
        votes = conn.execute(
            text("""
                SELECT v.id, v.session_id, v.outfit_key, v.user_id, v.vote,
                       v.created_at, v.updated_at, u.full_name AS user_name
                FROM blend_outfit_votes v
                LEFT JOIN users u ON u.id = v.user_id
                WHERE v.session_id = :session_id
                ORDER BY v.outfit_key, v.created_at
            """),
            {"session_id": row["id"]},
        ).mappings().all()
    return [
        OutfitVote(
            id=str(v["id"]), sessionId=str(v["session_id"]),
            outfitKey=v["outfit_key"], userId=str(v["user_id"]),
            userName=v.get("user_name"), vote=v["vote"],
            createdAt=str(v["created_at"]), updatedAt=str(v["updated_at"]),
        )
        for v in votes
    ]


@router.post("/sessions/{invite_code}/votes", response_model=OutfitVote)
def submit_vote(
    invite_code: str,
    body: VoteRequest,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    if body.vote not in {"love", "wear_soon", "skip"}:
        raise HTTPException(400, "Vote must be one of: love, wear_soon, skip")
    row = _session(invite_code)
    _assert_member(row, current_user)
    engine = get_engine()
    with engine.begin() as conn:
        upserted = conn.execute(
            text("""
                INSERT INTO blend_outfit_votes (session_id, outfit_key, user_id, vote)
                VALUES (:session_id, :outfit_key, :user_id, :vote)
                ON CONFLICT (session_id, outfit_key, user_id)
                DO UPDATE SET vote = EXCLUDED.vote, updated_at = NOW()
                RETURNING id, session_id, outfit_key, user_id, vote, created_at, updated_at
            """),
            {
                "session_id": row["id"],
                "outfit_key": body.outfitKey,
                "user_id": current_user.id,
                "vote": body.vote,
            },
        ).mappings().one()
        user_name = conn.execute(text("SELECT full_name FROM users WHERE id = :id"), {"id": current_user.id}).scalar()
    return OutfitVote(
        id=str(upserted["id"]), sessionId=str(upserted["session_id"]),
        outfitKey=upserted["outfit_key"], userId=str(upserted["user_id"]),
        userName=user_name, vote=upserted["vote"],
        createdAt=str(upserted["created_at"]), updatedAt=str(upserted["updated_at"]),
    )


# ─── Shared Wishlist ──────────────────────────────────────────────────────────

@router.get("/sessions/{invite_code}/shared-wishlist", response_model=list[dict])
def get_shared_wishlist(invite_code: str, current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]):
    """Returns AI-recommended products for both Blend members (from engine result)."""
    row = _session(invite_code)
    if row["status"] != "joined" or not row.get("joined_by"):
        raise HTTPException(409, "Blend is not yet active.")
    _assert_member(row, current_user)
    try:
        result = BlendEngine(get_engine()).generate(str(row["id"]), str(row["created_by"]), str(row["joined_by"]))
        return result.get("sharedWishlist", [])
    except Exception as err:
        raise HTTPException(503, "Could not generate shared wishlist.") from err


# ─── Twin Looks ───────────────────────────────────────────────────────────────

@router.post("/sessions/{invite_code}/twin/{outfit_key}", response_model=TwinLookResponse)
def get_twin_looks(
    invite_code: str,
    outfit_key: str,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Generate two complementary looks (one per member) for a given outfit."""
    row = _session(invite_code)
    if row["status"] != "joined" or not row.get("joined_by"):
        raise HTTPException(409, "Blend is not yet active.")
    _assert_member(row, current_user)
    try:
        result = BlendEngine(get_engine()).get_twin_looks(
            str(row["id"]), outfit_key, str(row["created_by"]), str(row["joined_by"])
        )
        return TwinLookResponse(**result)
    except Exception as err:
        raise HTTPException(503, "Could not generate twin looks.") from err


# ─── More Looks ──────────────────────────────────────────────────────────────

@router.post("/sessions/{invite_code}/more-looks", response_model=list[dict])
def get_more_looks(
    invite_code: str,
    body: MoreLooksRequest,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Return a fresh batch of coordinated outfits without regenerating the full Blend.

    The caller passes ``excludeProductIds`` so we never return items already
    shown in the current session.  Only the outfits list is affected — Blend
    identity, score, wishlist, and closet are left unchanged.
    """
    row = _session(invite_code)
    if row["status"] != "joined" or not row.get("joined_by"):
        raise HTTPException(409, "Blend is not yet active.")
    _assert_member(row, current_user)
    try:
        new_looks = BlendEngine(get_engine()).generate_more_looks(
            session_id=str(row["id"]),
            first_id=str(row["created_by"]),
            second_id=str(row["joined_by"]),
            exclude_product_ids=body.excludeProductIds,
            occasion=body.occasion,
        )
        return new_looks
    except Exception as err:
        raise HTTPException(503, "Could not generate more looks right now.") from err

