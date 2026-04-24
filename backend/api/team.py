from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import secrets, os

from database import get_db
import models
from auth import get_current_user, hash_password

router = APIRouter()

ROLE_PERMISSIONS = {
    "owner": ["read", "write", "delete", "invite", "billing"],
    "admin": ["read", "write", "delete", "invite"],
    "member": ["read", "write"],
    "viewer": ["read"],
}

class InviteRequest(BaseModel):
    email: str
    role: str = "member"

class UpdateRoleRequest(BaseModel):
    role: str

class AcceptInviteRequest(BaseModel):
    token: str
    full_name: str
    password: str

# ── GET /team ─────────────────────────────────────────────────────────────────
@router.get("/")
def get_team(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    members = db.query(models.TeamMember).filter(
        models.TeamMember.organization_id == current_user.organization_id
    ).all()

    result = []
    for m in members:
        user = db.query(models.User).filter(models.User.id == m.user_id).first() if m.user_id else None
        result.append({
            "id": m.id,
            "email": m.email,
            "role": m.role,
            "status": m.status,
            "full_name": user.full_name if user else None,
            "invited_at": m.invited_at.isoformat() if m.invited_at else None,
            "joined_at": m.joined_at.isoformat() if m.joined_at else None,
        })

    # Also add current user if not in team list
    current_in_list = any(m["email"] == current_user.email for m in result)
    if not current_in_list:
        result.insert(0, {
            "id": 0,
            "email": current_user.email,
            "role": current_user.role,
            "status": "active",
            "full_name": current_user.full_name,
            "invited_at": None,
            "joined_at": current_user.created_at.isoformat() if current_user.created_at else None,
        })

    return result

# ── POST /team/invite ─────────────────────────────────────────────────────────
@router.post("/invite")
def invite_member(
    req: InviteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can invite members")

    if req.role not in ROLE_PERMISSIONS:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Check team limit by plan
    org = db.query(models.Organization).filter(models.Organization.id == current_user.organization_id).first()
    existing = db.query(models.TeamMember).filter(
        models.TeamMember.organization_id == current_user.organization_id,
        models.TeamMember.status != "removed",
    ).count()

    from api.billing import PLANS, get_org_plan
    plan = get_org_plan(org)
    limit = PLANS[plan]["limits"].get("team_members", 1)
    if limit != -1 and existing >= limit:
        raise HTTPException(
            status_code=403,
            detail=f"Team member limit ({limit}) reached for {plan} plan. Upgrade to add more."
        )

    # Check not already invited
    existing_member = db.query(models.TeamMember).filter(
        models.TeamMember.organization_id == current_user.organization_id,
        models.TeamMember.email == req.email,
        models.TeamMember.status != "removed",
    ).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="Member already invited or active")

    token = secrets.token_urlsafe(32)
    member = models.TeamMember(
        organization_id=current_user.organization_id,
        email=req.email,
        role=req.role,
        status="pending",
        invite_token=token,
        invited_by_id=current_user.id,
    )
    db.add(member)
    db.commit()

    invite_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/accept-invite?token={token}"

    return {
        "success": True,
        "message": f"Invitation sent to {req.email}",
        "invite_url": invite_url,
        "invite_token": token,  # In production, only send via email
    }

# ── POST /team/accept-invite ──────────────────────────────────────────────────
@router.post("/accept-invite")
def accept_invite(
    req: AcceptInviteRequest,
    db: Session = Depends(get_db),
):
    member = db.query(models.TeamMember).filter(
        models.TeamMember.invite_token == req.token,
        models.TeamMember.status == "pending",
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Invalid or expired invite token")

    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == member.email).first()
    if existing_user:
        member.user_id = existing_user.id
        existing_user.organization_id = member.organization_id
        existing_user.role = member.role
    else:
        new_user = models.User(
            email=member.email,
            hashed_password=hash_password(req.password),
            full_name=req.full_name,
            role=member.role,
            organization_id=member.organization_id,
        )
        db.add(new_user)
        db.flush()
        member.user_id = new_user.id

    member.status = "active"
    member.joined_at = datetime.utcnow()
    member.invite_token = None
    db.commit()

    return {"success": True, "message": "You've joined the team!", "role": member.role}

# ── PUT /team/{member_id}/role ────────────────────────────────────────────────
@router.put("/{member_id}/role")
def update_member_role(
    member_id: int,
    req: UpdateRoleRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owners can change roles")

    member = db.query(models.TeamMember).filter(
        models.TeamMember.id == member_id,
        models.TeamMember.organization_id == current_user.organization_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.role = req.role
    if member.user_id:
        user = db.query(models.User).filter(models.User.id == member.user_id).first()
        if user:
            user.role = req.role
    db.commit()

    return {"success": True, "message": f"Role updated to {req.role}"}

# ── DELETE /team/{member_id} ──────────────────────────────────────────────────
@router.delete("/{member_id}")
def remove_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    member = db.query(models.TeamMember).filter(
        models.TeamMember.id == member_id,
        models.TeamMember.organization_id == current_user.organization_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.status = "removed"
    db.commit()
    return {"success": True, "message": "Member removed"}
