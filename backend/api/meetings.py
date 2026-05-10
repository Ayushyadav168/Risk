"""Meetings API — schedule, join, manage video calls via Jitsi Meet."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
import models
from auth import get_current_user
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel
import secrets, string

router = APIRouter()

def _make_room_id(title: str) -> str:
    slug = "".join(c if c.isalnum() else "-" for c in title.lower())[:30].strip("-")
    rand = "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(6))
    return f"riskiq-{slug}-{rand}"

class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_at: str   # ISO8601
    duration_min: int = 30
    participant_emails: Optional[List[str]] = []

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[str] = None
    duration_min: Optional[int] = None
    status: Optional[str] = None

def _fmt(m: models.Meeting, db: Session) -> dict:
    creator_name = (m.creator.full_name or m.creator.email) if m.creator else "Admin"
    room_url = f"https://meet.jit.si/{m.room_id}"
    now = datetime.now(timezone.utc)
    sched = m.scheduled_at
    if sched and sched.tzinfo is None:
        sched = sched.replace(tzinfo=timezone.utc)
    mins_until = (sched - now).total_seconds() / 60 if sched else 0
    is_live = -5 <= mins_until <= m.duration_min if sched else False
    participants = db.query(models.MeetingParticipant).filter(
        models.MeetingParticipant.meeting_id == m.id
    ).all()
    return {
        "id": m.id,
        "title": m.title,
        "description": m.description,
        "scheduled_at": sched.isoformat() if sched else None,
        "duration_min": m.duration_min,
        "room_id": m.room_id,
        "room_url": room_url,
        "created_by_id": m.created_by_id,
        "creator_name": creator_name,
        "status": "live" if is_live else m.status,
        "mins_until": round(mins_until),
        "participant_count": len(participants),
        "participants": [
            {"email": p.email, "user_id": p.user_id} for p in participants
        ],
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }

@router.get("/")
def list_meetings(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Meeting).order_by(models.Meeting.scheduled_at)
    if status:
        q = q.filter(models.Meeting.status == status)
    return [_fmt(m, db) for m in q.all()]

@router.post("/")
def create_meeting(
    body: MeetingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    room_id = _make_room_id(body.title)
    try:
        sched = datetime.fromisoformat(body.scheduled_at.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(400, "Invalid scheduled_at datetime format")

    meeting = models.Meeting(
        title=body.title,
        description=body.description,
        scheduled_at=sched,
        duration_min=body.duration_min,
        room_id=room_id,
        created_by_id=current_user.id,
        organization_id=current_user.organization_id,
        status="scheduled",
    )
    db.add(meeting)
    db.flush()

    # Add creator as participant
    db.add(models.MeetingParticipant(
        meeting_id=meeting.id,
        user_id=current_user.id,
        email=current_user.email,
    ))

    # Add invited participants
    for email in (body.participant_emails or []):
        if email.strip():
            user = db.query(models.User).filter(models.User.email == email.strip()).first()
            db.add(models.MeetingParticipant(
                meeting_id=meeting.id,
                user_id=user.id if user else None,
                email=email.strip(),
            ))

            # Send notification message
            if user:
                db.add(models.Message(
                    sender_id=current_user.id,
                    receiver_id=user.id,
                    channel="direct",
                    content=f"📅 You've been invited to a meeting: **{body.title}**\n"
                            f"🕐 {sched.strftime('%d %b %Y %H:%M UTC')}\n"
                            f"🔗 Join: https://meet.jit.si/{room_id}",
                ))

    db.commit()
    db.refresh(meeting)
    return _fmt(meeting, db)

@router.get("/{meeting_id}")
def get_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    m = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not m:
        raise HTTPException(404, "Meeting not found")
    return _fmt(m, db)

@router.patch("/{meeting_id}")
def update_meeting(
    meeting_id: int,
    body: MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    m = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not m:
        raise HTTPException(404, "Meeting not found")
    if m.created_by_id != current_user.id and current_user.role not in ("owner", "admin"):
        raise HTTPException(403, "Cannot update this meeting")
    if body.title: m.title = body.title
    if body.description is not None: m.description = body.description
    if body.duration_min: m.duration_min = body.duration_min
    if body.status: m.status = body.status
    if body.scheduled_at:
        m.scheduled_at = datetime.fromisoformat(body.scheduled_at.replace("Z", "+00:00"))
    db.commit()
    return _fmt(m, db)

@router.delete("/{meeting_id}")
def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    m = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not m:
        raise HTTPException(404, "Meeting not found")
    if m.created_by_id != current_user.id and current_user.role not in ("owner", "admin"):
        raise HTTPException(403, "Cannot delete this meeting")
    db.delete(m)
    db.commit()
    return {"ok": True}

@router.post("/{meeting_id}/join")
def join_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    m = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not m:
        raise HTTPException(404, "Meeting not found")
    existing = db.query(models.MeetingParticipant).filter(
        models.MeetingParticipant.meeting_id == meeting_id,
        models.MeetingParticipant.user_id == current_user.id,
    ).first()
    if not existing:
        db.add(models.MeetingParticipant(
            meeting_id=meeting_id,
            user_id=current_user.id,
            email=current_user.email,
            joined_at=datetime.now(timezone.utc),
        ))
        db.commit()
    return {"room_url": f"https://meet.jit.si/{m.room_id}", "room_id": m.room_id}
