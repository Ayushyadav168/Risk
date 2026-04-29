"""
Notifications API — aggregates recent activity into user-facing alerts.
Sources: audit log, new news, overdue risks.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from database import get_db
import models
from auth import get_current_user

router = APIRouter()

_ICON_MAP = {
    "risk_created":     ("shield",      "blue"),
    "risk_updated":     ("shield-check","amber"),
    "risk_deleted":     ("shield-off",  "red"),
    "assessment_created": ("clipboard", "blue"),
    "assessment_completed": ("check-circle", "green"),
    "news":             ("newspaper",   "sky"),
    "mitigation_added": ("zap",         "green"),
    "user_login":       ("user",        "slate"),
    "report_created":   ("file-text",   "purple"),
    "overdue":          ("alert-triangle", "red"),
}

def _icon_for(action: str):
    for key, val in _ICON_MAP.items():
        if key in action.lower():
            return val
    return ("bell", "slate")


@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return up to 30 recent notifications for the current user."""
    now = datetime.now(timezone.utc)
    notifications = []

    # ── 1. Recent audit log events (last 7 days) ─────────────────────────────
    since = datetime.utcnow() - timedelta(days=7)
    logs = (
        db.query(models.AuditLog)
        .filter(
            models.AuditLog.organization_id == current_user.organization_id,
            models.AuditLog.created_at >= since,
        )
        .order_by(models.AuditLog.created_at.desc())
        .limit(20)
        .all()
    )
    for log in logs:
        icon, color = _icon_for(log.action)
        name = log.entity_name or log.entity_type or "item"
        action_label = log.action.replace("_", " ").title()
        notifications.append({
            "id":       f"audit-{log.id}",
            "type":     "activity",
            "icon":     icon,
            "color":    color,
            "title":    f"{action_label}: {name}",
            "message":  f"{log.entity_type or 'Record'} — {name}",
            "time":     log.created_at.isoformat() if log.created_at else None,
            "read":     False,
        })

    # ── 2. Critical / High risks via org's assessments ───────────────────────
    try:
        org_assessments = db.query(models.Assessment.id).filter(
            models.Assessment.organization_id == current_user.organization_id
        ).subquery()

        critical_risks = (
            db.query(models.Risk)
            .filter(
                models.Risk.assessment_id.in_(org_assessments),
                models.Risk.severity.in_(["critical", "high"]),
            )
            .limit(5)
            .all()
        )
        for risk in critical_risks:
            notifications.append({
                "id":       f"risk-{risk.id}",
                "type":     "alert",
                "icon":     "alert-triangle",
                "color":    "red" if risk.severity == "critical" else "amber",
                "title":    f"{risk.severity.upper()} Risk: {risk.name}",
                "message":  f"Severity: {risk.severity} · Probability: {risk.probability} · Impact: {risk.impact}",
                "time":     risk.created_at.isoformat() if risk.created_at else None,
                "read":     False,
            })
    except Exception:
        pass

    # ── 3. New news articles today ────────────────────────────────────────────
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    new_news_count = (
        db.query(models.NewsArticle)
        .filter(models.NewsArticle.fetched_at >= today_start)
        .count()
    )
    if new_news_count > 0:
        # Get a couple of the latest to show
        latest_news = (
            db.query(models.NewsArticle)
            .filter(models.NewsArticle.fetched_at >= today_start)
            .order_by(models.NewsArticle.published_at.desc())
            .limit(3)
            .all()
        )
        for article in latest_news:
            notifications.append({
                "id":       f"news-{article.id}",
                "type":     "news",
                "icon":     "newspaper",
                "color":    "sky",
                "title":    article.title[:80] + ("…" if len(article.title) > 80 else ""),
                "message":  f"{article.source} · {article.category}",
                "time":     article.published_at.isoformat() if article.published_at else None,
                "read":     False,
                "url":      article.url,
                "news_id":  article.id,
            })

    # Sort by time desc, deduplicate by id
    seen = set()
    unique = []
    for n in notifications:
        if n["id"] not in seen:
            seen.add(n["id"])
            unique.append(n)

    unique.sort(key=lambda x: x.get("time") or "", reverse=True)

    return {
        "notifications": unique[:30],
        "unread_count":  len([n for n in unique if not n["read"]]),
    }
