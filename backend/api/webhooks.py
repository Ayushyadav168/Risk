from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import json, hmac, hashlib, secrets

from database import get_db
import models
from auth import get_current_user

router = APIRouter()

SUPPORTED_EVENTS = [
    "risk.created", "risk.updated", "risk.critical",
    "assessment.completed", "assessment.created",
    "report.ready", "plan.upgraded", "team.member_invited",
]

class WebhookCreate(BaseModel):
    name: str
    url: str
    platform: str = "custom"   # slack | teams | custom
    events: List[str]
    secret: Optional[str] = None

class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    events: Optional[List[str]] = None
    is_active: Optional[bool] = None

# ── GET /webhooks ─────────────────────────────────────────────────────────────
@router.get("/")
def list_webhooks(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    hooks = db.query(models.Webhook).filter(
        models.Webhook.organization_id == current_user.organization_id
    ).all()
    return [
        {
            "id": h.id,
            "name": h.name,
            "url": h.url,
            "platform": h.platform,
            "events": json.loads(h.events) if h.events else [],
            "is_active": h.is_active,
            "last_triggered_at": h.last_triggered_at.isoformat() if h.last_triggered_at else None,
            "created_at": h.created_at.isoformat() if h.created_at else None,
        }
        for h in hooks
    ]

# ── GET /webhooks/events ──────────────────────────────────────────────────────
@router.get("/events")
def list_events():
    return {
        "events": [
            {"id": "risk.created", "label": "Risk Created", "group": "Risks"},
            {"id": "risk.updated", "label": "Risk Updated", "group": "Risks"},
            {"id": "risk.critical", "label": "Critical Risk Detected", "group": "Risks"},
            {"id": "assessment.created", "label": "Assessment Created", "group": "Assessments"},
            {"id": "assessment.completed", "label": "Assessment Completed", "group": "Assessments"},
            {"id": "report.ready", "label": "Report Ready", "group": "Reports"},
            {"id": "plan.upgraded", "label": "Plan Upgraded", "group": "Billing"},
            {"id": "team.member_invited", "label": "Team Member Invited", "group": "Team"},
        ]
    }

# ── POST /webhooks ────────────────────────────────────────────────────────────
@router.post("/")
def create_webhook(
    req: WebhookCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Validate events
    invalid = [e for e in req.events if e not in SUPPORTED_EVENTS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unsupported events: {invalid}")

    secret = req.secret or secrets.token_hex(20)
    hook = models.Webhook(
        organization_id=current_user.organization_id,
        name=req.name,
        url=req.url,
        platform=req.platform,
        events=json.dumps(req.events),
        secret=secret,
        is_active=True,
    )
    db.add(hook)
    db.commit()
    db.refresh(hook)

    return {
        "id": hook.id,
        "name": hook.name,
        "url": hook.url,
        "platform": hook.platform,
        "events": req.events,
        "secret": secret,
        "is_active": hook.is_active,
    }

# ── PUT /webhooks/{id} ────────────────────────────────────────────────────────
@router.put("/{hook_id}")
def update_webhook(
    hook_id: int,
    req: WebhookUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    hook = db.query(models.Webhook).filter(
        models.Webhook.id == hook_id,
        models.Webhook.organization_id == current_user.organization_id,
    ).first()
    if not hook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    if req.name is not None: hook.name = req.name
    if req.url is not None: hook.url = req.url
    if req.events is not None: hook.events = json.dumps(req.events)
    if req.is_active is not None: hook.is_active = req.is_active

    db.commit()
    return {"success": True, "message": "Webhook updated"}

# ── DELETE /webhooks/{id} ─────────────────────────────────────────────────────
@router.delete("/{hook_id}")
def delete_webhook(
    hook_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    hook = db.query(models.Webhook).filter(
        models.Webhook.id == hook_id,
        models.Webhook.organization_id == current_user.organization_id,
    ).first()
    if not hook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    db.delete(hook)
    db.commit()
    return {"success": True}

# ── POST /webhooks/{id}/test ──────────────────────────────────────────────────
@router.post("/{hook_id}/test")
async def test_webhook(
    hook_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    hook = db.query(models.Webhook).filter(
        models.Webhook.id == hook_id,
        models.Webhook.organization_id == current_user.organization_id,
    ).first()
    if not hook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    result = await _deliver_webhook(hook, "webhook.test", {
        "message": "This is a test event from RiskIQ",
        "timestamp": datetime.utcnow().isoformat(),
    })

    return {"success": result["success"], "status_code": result.get("status_code"), "message": result.get("message")}

# ── Internal: dispatch event ──────────────────────────────────────────────────
async def dispatch_event(db: Session, org_id: int, event: str, payload: dict):
    """Called by other routes to fire webhooks for an event."""
    hooks = db.query(models.Webhook).filter(
        models.Webhook.organization_id == org_id,
        models.Webhook.is_active == True,
    ).all()

    for hook in hooks:
        events = json.loads(hook.events) if hook.events else []
        if event in events or "*" in events:
            await _deliver_webhook(hook, event, payload)
            hook.last_triggered_at = datetime.utcnow()
            db.commit()

async def _deliver_webhook(hook: models.Webhook, event: str, payload: dict) -> dict:
    import httpx
    body = json.dumps({"event": event, "data": payload, "timestamp": datetime.utcnow().isoformat()})

    headers = {"Content-Type": "application/json", "X-RiskIQ-Event": event}

    if hook.secret:
        sig = hmac.new(hook.secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        headers["X-RiskIQ-Signature"] = sig

    # Slack/Teams formatting
    if hook.platform == "slack":
        severity = payload.get("severity", "medium")
        color = "#DC2626" if severity in ("critical", "high") else "#F59E0B"
        slack_body = json.dumps({
            "attachments": [{
                "color": color,
                "title": f"🛡️ RiskIQ Alert: {event.replace('.', ' ').title()}",
                "text": payload.get("message") or payload.get("name") or str(payload),
                "footer": "RiskIQ Platform",
                "ts": int(datetime.utcnow().timestamp()),
            }]
        })
        headers["Content-Type"] = "application/json"
        body = slack_body
    elif hook.platform == "teams":
        teams_body = json.dumps({
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": "6366F1",
            "summary": f"RiskIQ: {event}",
            "sections": [{
                "activityTitle": f"🛡️ {event.replace('.', ' ').title()}",
                "activityText": payload.get("message") or str(payload),
            }]
        })
        body = teams_body

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(hook.url, content=body, headers=headers)
            return {"success": resp.status_code < 300, "status_code": resp.status_code, "message": resp.text[:100]}
    except Exception as e:
        return {"success": False, "message": str(e)}
