"""
Admin API — full control panel for RiskIQ.
Protected by email + password login → returns a session token.
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models
import os
import json
import secrets
import hashlib
from auth import hash_password
from datetime import datetime
from pydantic import BaseModel

router = APIRouter()

ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL",      "safehorizonadvisory@gmail.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD",   "Ayush@6860")
ADMIN_KEY      = os.getenv("ADMIN_SECRET_KEY", "riskiq-admin-2025-secure")

# In-memory session store (resets on server restart — fine for single-admin use)
_sessions: set = set()

def _make_token(email: str, password: str) -> str:
    raw = f"{email}:{password}:{ADMIN_KEY}"
    return hashlib.sha256(raw.encode()).hexdigest()

# ── Login schema ──────────────────────────────────────────────────────────────
class AdminLogin(BaseModel):
    email: str
    password: str

# ── Login endpoint ────────────────────────────────────────────────────────────
@router.post("/login")
def admin_login(body: AdminLogin):
    if body.email.lower().strip() != ADMIN_EMAIL.lower().strip() or body.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    token = _make_token(body.email, body.password)
    _sessions.add(token)
    return {"token": token, "email": ADMIN_EMAIL}

# ── Auth guard (accepts both token header AND legacy key header) ───────────────
def require_admin(
    x_admin_token: Optional[str] = Header(None),
    x_admin_key:   Optional[str] = Header(None),
):
    # New: token from login
    if x_admin_token:
        expected = _make_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if x_admin_token == expected:
            return True
    # Legacy: raw secret key
    if x_admin_key and x_admin_key == ADMIN_KEY:
        return True
    raise HTTPException(status_code=403, detail="Admin authentication required")

# ── Pydantic schemas ──────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    role: str = "member"

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class RiskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    probability: Optional[str] = None
    impact: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    score: Optional[float] = None
    severity: Optional[str] = None

class ExpertCreate(BaseModel):
    name: str
    title: str
    industry: str
    bio: Optional[str] = None
    avatar_initials: Optional[str] = None
    avatar_color: Optional[str] = "#6366F1"
    years_experience: Optional[int] = 0
    is_verified: bool = False
    is_global: bool = True
    industries: Optional[list] = []
    expertise_areas: Optional[list] = []

class ExpertUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    industry: Optional[str] = None
    bio: Optional[str] = None
    is_verified: Optional[bool] = None
    years_experience: Optional[int] = None

class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    industry: str
    risk_categories: Optional[list] = []
    default_risks: Optional[list] = []

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None

# ─────────────────────────────────────────────────────────────────────────────
# Dashboard Stats
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/stats")
def admin_stats(db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    return {
        "users":       db.query(models.User).count(),
        "orgs":        db.query(models.Organization).count(),
        "assessments": db.query(models.Assessment).count(),
        "risks":       db.query(models.Risk).count(),
        "reports":     db.query(models.Report).count(),
        "experts":     db.query(models.Expert).count(),
        "templates":   db.query(models.Template).count(),
        "news":        db.query(models.NewsArticle).count() if hasattr(models, 'NewsArticle') else 0,
        "audit_logs":  db.query(models.AuditLog).count(),
    }

# ─────────────────────────────────────────────────────────────────────────────
# Users
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/users")
def list_users(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin)
):
    q = db.query(models.User)
    if search:
        q = q.filter(
            models.User.email.ilike(f"%{search}%") |
            models.User.full_name.ilike(f"%{search}%")
        )
    users = q.order_by(models.User.id.desc()).all()
    result = []
    for u in users:
        org = db.query(models.Organization).filter(
            models.Organization.id == u.organization_id
        ).first() if u.organization_id else None
        result.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "organization_id": u.organization_id,
            "organization_name": org.name if org else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return result

@router.post("/users")
def create_user(body: UserCreate, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(400, "Email already in use")
    # Create or reuse a default org
    org = db.query(models.Organization).first()
    user = models.User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
        organization_id=org.id if org else None,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "role": user.role}

@router.patch("/users/{user_id}")
def update_user(user_id: int, body: UserUpdate, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if body.email:      user.email      = body.email
    if body.full_name:  user.full_name  = body.full_name
    if body.role:       user.role       = body.role
    if body.password:   user.hashed_password = hash_password(body.password)
    if body.is_active is not None: user.is_active = body.is_active
    db.commit()
    return {"ok": True, "id": user.id}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    db.delete(user)
    db.commit()
    return {"ok": True}

# ─────────────────────────────────────────────────────────────────────────────
# Risks (Risk Register)
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/risks")
def list_all_risks(
    search: Optional[str] = None,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin)
):
    q = db.query(models.Risk)
    if search:
        q = q.filter(models.Risk.name.ilike(f"%{search}%"))
    if category:
        q = q.filter(models.Risk.category == category)
    if severity:
        q = q.filter(models.Risk.severity == severity)
    total = q.count()
    risks = q.order_by(models.Risk.score.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "risks": [
            {
                "id": r.id, "name": r.name, "description": r.description,
                "category": r.category, "probability": r.probability,
                "impact": r.impact, "score": r.score, "severity": r.severity,
                "status": r.status, "owner": r.owner,
                "assessment_id": r.assessment_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in risks
        ]
    }

@router.patch("/risks/{risk_id}")
def update_risk(risk_id: int, body: RiskUpdate, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    risk = db.query(models.Risk).filter(models.Risk.id == risk_id).first()
    if not risk:
        raise HTTPException(404, "Risk not found")
    for field, val in body.dict(exclude_none=True).items():
        setattr(risk, field, val)
    db.commit()
    return {"ok": True}

@router.delete("/risks/{risk_id}")
def delete_risk(risk_id: int, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    risk = db.query(models.Risk).filter(models.Risk.id == risk_id).first()
    if not risk:
        raise HTTPException(404, "Risk not found")
    db.delete(risk)
    db.commit()
    return {"ok": True}

# ─────────────────────────────────────────────────────────────────────────────
# Assessments
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/assessments")
def list_all_assessments(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin)
):
    q = db.query(models.Assessment)
    if search:
        q = q.filter(models.Assessment.title.ilike(f"%{search}%"))
    assessments = q.order_by(models.Assessment.created_at.desc()).all()
    return [
        {
            "id": a.id, "title": a.title, "industry": a.industry,
            "status": a.status, "overall_score": a.overall_score,
            "organization_id": a.organization_id,
            "risk_count": db.query(models.Risk).filter(models.Risk.assessment_id == a.id).count(),
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in assessments
    ]

@router.delete("/assessments/{assessment_id}")
def delete_assessment(assessment_id: int, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    a = db.query(models.Assessment).filter(models.Assessment.id == assessment_id).first()
    if not a:
        raise HTTPException(404, "Assessment not found")
    db.query(models.Risk).filter(models.Risk.assessment_id == assessment_id).delete()
    db.delete(a)
    db.commit()
    return {"ok": True}

# ─────────────────────────────────────────────────────────────────────────────
# Reports
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/reports")
def list_all_reports(db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    reports = db.query(models.Report).order_by(models.Report.created_at.desc()).all()
    return [
        {
            "id": r.id, "title": r.title, "report_type": r.report_type,
            "status": r.status, "assessment_id": r.assessment_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reports
    ]

@router.delete("/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    r = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not r:
        raise HTTPException(404, "Report not found")
    # Delete file if exists
    if r.file_path and os.path.exists(r.file_path):
        os.remove(r.file_path)
    db.delete(r)
    db.commit()
    return {"ok": True}

# ─────────────────────────────────────────────────────────────────────────────
# Templates
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/templates")
def list_all_templates(db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    templates = db.query(models.Template).all()
    return [
        {
            "id": t.id, "name": t.name, "description": t.description,
            "industry": t.industry,
            "risk_categories": json.loads(t.risk_categories) if t.risk_categories else [],
            "default_risks": json.loads(t.default_risks) if t.default_risks else [],
        }
        for t in templates
    ]

@router.post("/templates")
def create_template(body: TemplateCreate, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    t = models.Template(
        name=body.name,
        description=body.description,
        industry=body.industry,
        risk_categories=json.dumps(body.risk_categories or []),
        default_risks=json.dumps(body.default_risks or []),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"id": t.id, "name": t.name}

@router.patch("/templates/{template_id}")
def update_template(template_id: int, body: TemplateUpdate, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    t = db.query(models.Template).filter(models.Template.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    for field, val in body.dict(exclude_none=True).items():
        setattr(t, field, val)
    db.commit()
    return {"ok": True}

@router.delete("/templates/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    t = db.query(models.Template).filter(models.Template.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    db.delete(t)
    db.commit()
    return {"ok": True}

# ─────────────────────────────────────────────────────────────────────────────
# Experts
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/experts")
def list_all_experts(db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    experts = db.query(models.Expert).order_by(models.Expert.id.desc()).all()
    return [
        {
            "id": e.id, "name": e.name, "title": e.title,
            "industry": e.industry, "is_verified": e.is_verified,
            "years_experience": e.years_experience, "is_global": e.is_global,
            "opinions_count": db.query(models.ExpertOpinion).filter(models.ExpertOpinion.expert_id == e.id).count(),
        }
        for e in experts
    ]

@router.post("/experts")
def create_expert(body: ExpertCreate, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    e = models.Expert(
        name=body.name, title=body.title, industry=body.industry,
        bio=body.bio or "",
        avatar_initials=body.avatar_initials or body.name[:2].upper(),
        avatar_color=body.avatar_color,
        years_experience=body.years_experience,
        is_verified=body.is_verified, is_global=body.is_global,
        industries=json.dumps(body.industries or [body.industry]),
        expertise_areas=json.dumps(body.expertise_areas or []),
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return {"id": e.id, "name": e.name}

@router.patch("/experts/{expert_id}")
def update_expert(expert_id: int, body: ExpertUpdate, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    e = db.query(models.Expert).filter(models.Expert.id == expert_id).first()
    if not e:
        raise HTTPException(404, "Expert not found")
    for field, val in body.dict(exclude_none=True).items():
        setattr(e, field, val)
    db.commit()
    return {"ok": True}

@router.delete("/experts/{expert_id}")
def delete_expert(expert_id: int, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    e = db.query(models.Expert).filter(models.Expert.id == expert_id).first()
    if not e:
        raise HTTPException(404, "Expert not found")
    db.query(models.ExpertOpinion).filter(models.ExpertOpinion.expert_id == expert_id).delete()
    db.delete(e)
    db.commit()
    return {"ok": True}

# ─────────────────────────────────────────────────────────────────────────────
# Heatmap data
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/heatmap")
def heatmap_data(db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    risks = db.query(models.Risk).all()
    cells = {}
    for r in risks:
        key = f"{r.probability}_{r.impact}"
        if key not in cells:
            cells[key] = {"probability": r.probability, "impact": r.impact, "count": 0, "risks": []}
        cells[key]["count"] += 1
        cells[key]["risks"].append({"id": r.id, "name": r.name, "score": r.score, "severity": r.severity})

    severity_breakdown = {
        "critical": db.query(models.Risk).filter(models.Risk.severity == "critical").count(),
        "high":     db.query(models.Risk).filter(models.Risk.severity == "high").count(),
        "medium":   db.query(models.Risk).filter(models.Risk.severity == "medium").count(),
        "low":      db.query(models.Risk).filter(models.Risk.severity == "low").count(),
    }
    return {"cells": list(cells.values()), "severity_breakdown": severity_breakdown, "total": len(risks)}

# ─────────────────────────────────────────────────────────────────────────────
# Audit log
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    _: bool = Depends(require_admin)
):
    logs = db.query(models.AuditLog).order_by(models.AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id, "action": l.action, "entity_type": l.entity_type,
            "entity_name": l.entity_name, "user_id": l.user_id,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]
