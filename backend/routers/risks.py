from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from auth_utils import get_current_user
import models
import schemas
from services.scoring import compute_risk_score, get_risk_level

router = APIRouter(prefix="/api/risks", tags=["risks"])


@router.get("")
def list_risks(
    assessment_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = (
        db.query(models.Risk)
        .join(models.Assessment)
        .options(joinedload(models.Risk.mitigations))
        .filter(models.Assessment.organization_id == current_user.organization_id)
    )
    if assessment_id:
        query = query.filter(models.Risk.assessment_id == assessment_id)
    return query.order_by(models.Risk.score.desc()).all()


@router.post("")
def create_risk(
    data: schemas.RiskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Verify assessment belongs to user's org
    assessment = db.query(models.Assessment).filter(
        models.Assessment.id == data.assessment_id,
        models.Assessment.organization_id == current_user.organization_id,
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    score = compute_risk_score(data.probability, data.impact)
    severity = get_risk_level(score).lower()

    risk = models.Risk(
        name=data.name,
        description=data.description,
        category=data.category,
        probability=data.probability,
        impact=data.impact,
        score=score,
        severity=severity,
        status="open",
        owner=data.owner,
        assessment_id=data.assessment_id,
    )
    db.add(risk)
    db.commit()
    db.refresh(risk)
    return risk


@router.get("/{risk_id}")
def get_risk(
    risk_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    risk = (
        db.query(models.Risk)
        .join(models.Assessment)
        .options(joinedload(models.Risk.mitigations))
        .filter(
            models.Risk.id == risk_id,
            models.Assessment.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    return risk


@router.put("/{risk_id}")
def update_risk(
    risk_id: int,
    data: schemas.RiskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    risk = (
        db.query(models.Risk)
        .join(models.Assessment)
        .filter(
            models.Risk.id == risk_id,
            models.Assessment.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(risk, field, value)

    if data.probability or data.impact:
        prob = data.probability or risk.probability
        imp = data.impact or risk.impact
        risk.score = compute_risk_score(prob, imp)
        risk.severity = get_risk_level(risk.score).lower()

    db.commit()
    db.refresh(risk)
    return risk


@router.delete("/{risk_id}")
def delete_risk(
    risk_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    risk = (
        db.query(models.Risk)
        .join(models.Assessment)
        .filter(
            models.Risk.id == risk_id,
            models.Assessment.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    db.delete(risk)
    db.commit()
    return {"message": "Deleted"}


# Mitigations
@router.post("/{risk_id}/mitigations")
def add_mitigation(
    risk_id: int,
    data: schemas.MitigationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    risk = (
        db.query(models.Risk)
        .join(models.Assessment)
        .filter(
            models.Risk.id == risk_id,
            models.Assessment.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")

    mitigation = models.Mitigation(
        title=data.title,
        description=data.description,
        action_type=data.action_type,
        priority=data.priority,
        estimated_cost=data.estimated_cost,
        expected_reduction=data.expected_reduction,
        assigned_to=data.assigned_to,
        risk_id=risk_id,
    )
    db.add(mitigation)
    db.commit()
    db.refresh(mitigation)
    return mitigation


@router.put("/{risk_id}/mitigations/{mitigation_id}")
def update_mitigation(
    risk_id: int,
    mitigation_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    mitigation = db.query(models.Mitigation).filter(
        models.Mitigation.id == mitigation_id,
        models.Mitigation.risk_id == risk_id,
    ).first()
    if not mitigation:
        raise HTTPException(status_code=404, detail="Mitigation not found")
    for field, value in data.items():
        if hasattr(mitigation, field):
            setattr(mitigation, field, value)
    db.commit()
    db.refresh(mitigation)
    return mitigation
