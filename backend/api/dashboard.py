from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models, schemas
from auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Get all risks for the user
    risks = db.query(models.Risk).join(models.Assessment).filter(
        models.Assessment.created_by_id == current_user.id
    ).all()
    
    total_risks = len(risks)
    high_risk_count = len([r for r in risks if r.severity in ["high", "critical"]])
    open_actions = len([r for r in risks if r.status == "open"])
    
    # Overall score average
    if risks:
        overall_score = round(sum(r.score for r in risks) / len(risks), 2)
    else:
        overall_score = 0.0
    
    # Risk by category
    risk_by_category = {}
    for risk in risks:
        cat = risk.category or "other"
        risk_by_category[cat] = risk_by_category.get(cat, 0) + 1
    
    # Risk by severity
    risk_by_severity = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for risk in risks:
        sev = risk.severity or "low"
        risk_by_severity[sev] = risk_by_severity.get(sev, 0) + 1
    
    # Recent risks
    recent = sorted(risks, key=lambda r: r.created_at, reverse=True)[:5]
    recent_risks = [
        {
            "id": r.id,
            "name": r.name,
            "category": r.category,
            "score": r.score,
            "severity": r.severity,
            "status": r.status
        }
        for r in recent
    ]
    
    # Monthly trend (last 6 months)
    monthly_trend = []
    now = datetime.utcnow()
    for i in range(5, -1, -1):
        month_start = now - timedelta(days=30 * i)
        month_end = now - timedelta(days=30 * (i - 1))
        month_risks = [r for r in risks if r.created_at and month_start <= r.created_at.replace(tzinfo=None) <= month_end]
        avg_score = round(sum(r.score for r in month_risks) / len(month_risks), 2) if month_risks else 0
        monthly_trend.append({
            "month": month_start.strftime("%b %Y"),
            "risk_count": len(month_risks),
            "avg_score": avg_score
        })
    
    return schemas.DashboardStats(
        total_risks=total_risks,
        high_risk_count=high_risk_count,
        open_actions=open_actions,
        overall_score=overall_score,
        risk_by_category=risk_by_category,
        risk_by_severity=risk_by_severity,
        recent_risks=recent_risks,
        monthly_trend=monthly_trend
    )
