from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[schemas.AssessmentResponse])
def list_assessments(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    assessments = db.query(models.Assessment).filter(
        models.Assessment.created_by_id == current_user.id
    ).order_by(models.Assessment.created_at.desc()).all()
    return assessments

@router.post("/", response_model=schemas.AssessmentResponse)
def create_assessment(data: schemas.AssessmentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    assessment = models.Assessment(
        title=data.title,
        description=data.description,
        industry=data.industry,
        organization_size=data.organization_size,
        annual_revenue=data.annual_revenue,
        location=data.location,
        risk_categories=json.dumps(data.risk_categories),
        organization_id=current_user.organization_id,
        created_by_id=current_user.id,
        status="draft"
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment

@router.get("/{assessment_id}", response_model=schemas.AssessmentResponse)
def get_assessment(assessment_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    assessment = db.query(models.Assessment).filter(
        models.Assessment.id == assessment_id,
        models.Assessment.created_by_id == current_user.id
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment

@router.put("/{assessment_id}", response_model=schemas.AssessmentResponse)
def update_assessment(assessment_id: int, data: schemas.AssessmentUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    assessment = db.query(models.Assessment).filter(
        models.Assessment.id == assessment_id,
        models.Assessment.created_by_id == current_user.id
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(assessment, field, value)
    db.commit()
    db.refresh(assessment)
    return assessment

@router.delete("/{assessment_id}")
def delete_assessment(assessment_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    assessment = db.query(models.Assessment).filter(
        models.Assessment.id == assessment_id,
        models.Assessment.created_by_id == current_user.id
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    db.delete(assessment)
    db.commit()
    return {"message": "Assessment deleted"}
