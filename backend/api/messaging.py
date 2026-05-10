"""Internal Messenger API — team chat + admin broadcasts."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
import models
from auth import get_current_user
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

router = APIRouter()

class SendMessage(BaseModel):
    content: str
    channel: str = "general"          # general | announcements | direct
    receiver_id: Optional[int] = None # for direct messages

class MessageOut(BaseModel):
    id: int
    content: str
    channel: str
    sender_id: int
    sender_name: str
    sender_initials: str
    receiver_id: Optional[int]
    is_read: bool
    created_at: str
    class Config: from_attributes = True

def _fmt(msg: models.Message) -> dict:
    name = (msg.sender.full_name or msg.sender.email) if msg.sender else "Unknown"
    initials = "".join(p[0].upper() for p in name.split()[:2]) or "?"
    return {
        "id": msg.id,
        "content": msg.content,
        "channel": msg.channel,
        "sender_id": msg.sender_id,
        "sender_name": name,
        "sender_initials": initials,
        "receiver_id": msg.receiver_id,
        "is_read": msg.is_read,
        "created_at": msg.created_at.isoformat() if msg.created_at else "",
    }

@router.get("/")
def get_messages(
    channel: str = Query("general"),
    limit: int = Query(50),
    before_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Message)
    if channel == "direct":
        # Show DMs sent to/from current user
        q = q.filter(
            (models.Message.receiver_id == current_user.id) |
            (models.Message.sender_id == current_user.id)
        ).filter(models.Message.channel == "direct")
    else:
        q = q.filter(models.Message.channel == channel)

    if before_id:
        q = q.filter(models.Message.id < before_id)

    msgs = q.order_by(models.Message.id.desc()).limit(limit).all()
    msgs.reverse()
    return [_fmt(m) for m in msgs]

@router.post("/")
def send_message(
    body: SendMessage,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not body.content.strip():
        raise HTTPException(400, "Message cannot be empty")
    msg = models.Message(
        sender_id=current_user.id,
        receiver_id=body.receiver_id,
        channel=body.channel,
        content=body.content.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _fmt(msg)

@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    count = db.query(models.Message).filter(
        models.Message.receiver_id == current_user.id,
        models.Message.is_read == False
    ).count()
    return {"count": count}

@router.put("/{msg_id}/read")
def mark_read(
    msg_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    msg = db.query(models.Message).filter(
        models.Message.id == msg_id,
        models.Message.receiver_id == current_user.id
    ).first()
    if msg:
        msg.is_read = True
        db.commit()
    return {"ok": True}

@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all users for DM addressing."""
    users = db.query(models.User).filter(
        models.User.is_active == True,
        models.User.id != current_user.id
    ).all()
    return [
        {
            "id": u.id,
            "name": u.full_name or u.email,
            "email": u.email,
            "role": u.role,
            "initials": "".join(p[0].upper() for p in (u.full_name or u.email).split()[:2]),
        }
        for u in users
    ]

# Admin-only broadcast
@router.post("/broadcast")
def broadcast(
    body: SendMessage,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in ("owner", "admin"):
        raise HTTPException(403, "Only admins can broadcast")
    msg = models.Message(
        sender_id=current_user.id,
        receiver_id=None,
        channel="announcements",
        content=body.content.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _fmt(msg)
