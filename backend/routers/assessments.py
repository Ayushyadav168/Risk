from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from auth_utils import get_current_user
import models
import schemas
import json
from datetime import datetime
from services.scoring import compute_risk_score, get_risk_level, compute_overall_score

router = APIRouter(prefix="/api/assessments", tags=["assessments"])


def _score_risk(risk: models.Risk):
    s = compute_risk_score(risk.probability, risk.impact)
    risk.score = s
    risk.severity = get_risk_level(s).lower()


@router.get("")
def list_assessments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    assessments = (
        db.query(models.Assessment)
        .options(joinedload(models.Assessment.risks))
        .filter(models.Assessment.organization_id == current_user.organization_id)
        .order_by(models.Assessment.created_at.desc())
        .all()
    )
    result = []
    for a in assessments:
        result.append({
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "industry": a.industry,
            "status": a.status,
            "overall_score": a.overall_score,
            "risk_count": len(a.risks),
            "created_at": a.created_at,
        })
    return result


@router.post("")
def create_assessment(
    data: schemas.AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    assessment = models.Assessment(
        title=data.title,
        description=data.description,
        industry=data.industry,
        organization_size=data.organization_size,
        annual_revenue=data.annual_revenue,
        location=data.location,
        risk_categories=json.dumps(data.risk_categories),
        status="draft",
        overall_score=0.0,
        organization_id=current_user.organization_id,
        created_by_id=current_user.id,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.get("/{assessment_id}")
def get_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    assessment = (
        db.query(models.Assessment)
        .options(
            joinedload(models.Assessment.risks).joinedload(models.Risk.mitigations)
        )
        .filter(
            models.Assessment.id == assessment_id,
            models.Assessment.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment


@router.put("/{assessment_id}")
def update_assessment(
    assessment_id: int,
    data: schemas.AssessmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    assessment = db.query(models.Assessment).filter(
        models.Assessment.id == assessment_id,
        models.Assessment.organization_id == current_user.organization_id,
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(assessment, field, value)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.post("/{assessment_id}/complete")
def complete_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    assessment = (
        db.query(models.Assessment)
        .options(joinedload(models.Assessment.risks))
        .filter(
            models.Assessment.id == assessment_id,
            models.Assessment.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Score all risks
    scores = []
    for risk in assessment.risks:
        _score_risk(risk)
        scores.append(risk.score)

    overall = compute_overall_score(scores)
    assessment.overall_score = overall
    assessment.status = "completed"
    db.commit()
    db.refresh(assessment)
    return {"message": "Assessment completed", "overall_score": overall}


@router.delete("/{assessment_id}")
def delete_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    assessment = db.query(models.Assessment).filter(
        models.Assessment.id == assessment_id,
        models.Assessment.organization_id == current_user.organization_id,
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    db.delete(assessment)
    db.commit()
    return {"message": "Deleted"}
