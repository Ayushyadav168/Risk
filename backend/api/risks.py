from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter()

PROB_WEIGHTS = {'low': 1, 'medium': 2, 'high': 3}
IMPACT_WEIGHTS = {'low': 1, 'medium': 2, 'high': 3}

def compute_score(probability: str, impact: str) -> float:
    p = PROB_WEIGHTS.get(probability, 1)
    i = IMPACT_WEIGHTS.get(impact, 1)
    raw = (p * 0.4) + (i * 0.6)
    return round((raw / 3.0) * 10, 2)

def get_severity(score: float) -> str:
    if score >= 8:
        return "critical"
    elif score >= 6:
        return "high"
    elif score >= 4:
        return "medium"
    return "low"

@router.get("/", response_model=List[schemas.RiskResponse])
def list_risks(
    assessment_id: Optional[int] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Risk).join(models.Assessment).filter(
        models.Assessment.created_by_id == current_user.id
    )
    if assessment_id:
        query = query.filter(models.Risk.assessment_id == assessment_id)
    if category:
        query = query.filter(models.Risk.category == category)
    if status:
        query = query.filter(models.Risk.status == status)
    return query.order_by(models.Risk.score.desc()).all()

@router.post("/", response_model=schemas.RiskResponse)
def create_risk(data: schemas.RiskCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Verify assessment belongs to user
    assessment = db.query(models.Assessment).filter(
        models.Assessment.id == data.assessment_id,
        models.Assessment.created_by_id == current_user.id
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    score = compute_score(data.probability, data.impact)
    severity = get_severity(score)
    
    risk = models.Risk(
        name=data.name,
        description=data.description,
        category=data.category,
        probability=data.probability,
        impact=data.impact,
        score=score,
        severity=severity,
        owner=data.owner,
        assessment_id=data.assessment_id
    )
    db.add(risk)
    db.commit()
    db.refresh(risk)
    return risk

@router.get("/{risk_id}", response_model=schemas.RiskResponse)
def get_risk(risk_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    risk = db.query(models.Risk).join(models.Assessment).filter(
        models.Risk.id == risk_id,
        models.Assessment.created_by_id == current_user.id
    ).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    return risk

@router.put("/{risk_id}", response_model=schemas.RiskResponse)
def update_risk(risk_id: int, data: schemas.RiskUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    risk = db.query(models.Risk).join(models.Assessment).filter(
        models.Risk.id == risk_id,
        models.Assessment.created_by_id == current_user.id
    ).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    
    for field, value in data.dict(exclude_unset=True).items():
        setattr(risk, field, value)
    
    if data.probability or data.impact:
        risk.score = compute_score(risk.probability, risk.impact)
        risk.severity = get_severity(risk.score)
    
    db.commit()
    db.refresh(risk)
    return risk

@router.delete("/{risk_id}")
def delete_risk(risk_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    risk = db.query(models.Risk).join(models.Assessment).filter(
        models.Risk.id == risk_id,
        models.Assessment.created_by_id == current_user.id
    ).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    db.delete(risk)
    db.commit()
    return {"message": "Risk deleted"}

@router.post("/{risk_id}/mitigations", response_model=schemas.MitigationResponse)
def add_mitigation(risk_id: int, data: schemas.MitigationCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    risk = db.query(models.Risk).join(models.Assessment).filter(
        models.Risk.id == risk_id,
        models.Assessment.created_by_id == current_user.id
    ).first()
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
        risk_id=risk_id
    )
    db.add(mitigation)
    db.commit()
    db.refresh(mitigation)
    return mitigation
