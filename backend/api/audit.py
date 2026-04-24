from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
import json

from database import get_db
import models
from auth import get_current_user

router = APIRouter()

# ── Helper: log an action ─────────────────────────────────────────────────────
def log_action(
    db: Session,
    user_id: int,
    org_id: int,
    action: str,
    entity_type: str = None,
    entity_id: int = None,
    entity_name: str = None,
    details: dict = None,
    ip_address: str = None,
):
    entry = models.AuditLog(
        organization_id=org_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        details=json.dumps(details) if details else None,
        ip_address=ip_address,
    )
    db.add(entry)
    # Don't commit here — caller commits their own transaction

# ── GET /audit-logs ───────────────────────────────────────────────────────────
@router.get("/")
def get_audit_logs(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.AuditLog).filter(
        models.AuditLog.organization_id == current_user.organization_id
    )

    if action:
        query = query.filter(models.AuditLog.action.contains(action))
    if entity_type:
        query = query.filter(models.AuditLog.entity_type == entity_type)

    total = query.count()
    logs = query.order_by(models.AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    result = []
    for log in logs:
        user = db.query(models.User).filter(models.User.id == log.user_id).first() if log.user_id else None
        result.append({
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "entity_name": log.entity_name,
            "details": json.loads(log.details) if log.details else None,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "user": {
                "id": user.id if user else None,
                "email": user.email if user else "System",
                "full_name": user.full_name if user else "System",
            },
        })

    return {"logs": result, "total": total, "limit": limit, "offset": offset}

# ── GET /audit-logs/summary ───────────────────────────────────────────────────
@router.get("/summary")
def get_audit_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from sqlalchemy import func
    from datetime import datetime, timedelta

    org_id = current_user.organization_id
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    total = db.query(models.AuditLog).filter(models.AuditLog.organization_id == org_id).count()
    this_week = db.query(models.AuditLog).filter(
        models.AuditLog.organization_id == org_id,
        models.AuditLog.created_at >= week_ago,
    ).count()

    # Action counts
    actions = db.query(
        models.AuditLog.action,
        func.count(models.AuditLog.id).label("count"),
    ).filter(
        models.AuditLog.organization_id == org_id
    ).group_by(models.AuditLog.action).order_by(func.count(models.AuditLog.id).desc()).limit(10).all()

    return {
        "total_actions": total,
        "this_week": this_week,
        "top_actions": [{"action": a.action, "count": a.count} for a in actions],
    }
