from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from auth_utils import get_current_user
import models
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    org_id = current_user.organization_id

    # Get all risks for org
    all_risks = (
        db.query(models.Risk)
        .join(models.Assessment)
        .filter(models.Assessment.organization_id == org_id)
        .all()
    )

    total = len(all_risks)
    high_risk = sum(1 for r in all_risks if r.severity in ("high", "critical"))
    open_count = sum(1 for r in all_risks if r.status == "open")
    mitigated_count = sum(1 for r in all_risks if r.status == "mitigated")

    # Overall score from latest completed assessment
    latest_assessment = (
        db.query(models.Assessment)
        .filter(
            models.Assessment.organization_id == org_id,
            models.Assessment.status == "completed",
        )
        .order_by(models.Assessment.created_at.desc())
        .first()
    )
    overall_score = latest_assessment.overall_score if latest_assessment else 0.0

    # Risk by category
    by_category = {}
    for r in all_risks:
        cat = r.category or "other"
        by_category[cat] = by_category.get(cat, 0) + 1

    # Risk by severity
    by_severity = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for r in all_risks:
        sev = (r.severity or "low").lower()
        by_severity[sev] = by_severity.get(sev, 0) + 1

    # Recent risks (last 5)
    recent = (
        db.query(models.Risk)
        .join(models.Assessment)
        .filter(models.Assessment.organization_id == org_id)
        .order_by(models.Risk.created_at.desc())
        .limit(5)
        .all()
    )
    recent_risks = [
        {
            "id": r.id,
            "name": r.name,
            "category": r.category,
            "severity": r.severity,
            "score": r.score,
            "status": r.status,
        }
        for r in recent
    ]

    # Monthly trend (last 6 months)
    monthly_trend = []
    for i in range(5, -1, -1):
        month_start = datetime.utcnow().replace(day=1) - timedelta(days=30 * i)
        month_end = month_start + timedelta(days=31)
        month_risks = [
            r for r in all_risks
            if r.created_at and month_start <= r.created_at < month_end
        ]
        avg_score = (
            round(sum(r.score for r in month_risks) / len(month_risks), 1)
            if month_risks else 0
        )
        monthly_trend.append({
            "month": month_start.strftime("%b %Y"),
            "risk_count": len(month_risks),
            "avg_score": avg_score,
        })

    return {
        "total_risks": total,
        "high_risk_count": high_risk,
        "open_actions": open_count,
        "mitigated_count": mitigated_count,
        "overall_score": overall_score,
        "risk_by_category": by_category,
        "risk_by_severity": by_severity,
        "recent_risks": recent_risks,
        "monthly_trend": monthly_trend,
    }


@router.get("/heatmap")
def get_heatmap(
    assessment_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = (
        db.query(models.Risk)
        .join(models.Assessment)
        .filter(models.Assessment.organization_id == current_user.organization_id)
    )
    if assessment_id:
        query = query.filter(models.Risk.assessment_id == assessment_id)
    risks = query.all()

    PROB_MAP = {"low": 0, "medium": 1, "high": 2}
    IMPACT_MAP = {"low": 0, "medium": 1, "high": 2}

    cells = {}
    for r in risks:
        p = PROB_MAP.get((r.probability or "medium").lower(), 1)
        i = IMPACT_MAP.get((r.impact or "medium").lower(), 1)
        key = f"{p},{i}"
        if key not in cells:
            cells[key] = {"prob": p, "impact": i, "risks": [], "count": 0}
        cells[key]["risks"].append({"id": r.id, "name": r.name, "score": r.score})
        cells[key]["count"] += 1

    return {"cells": list(cells.values()), "total": len(risks)}
