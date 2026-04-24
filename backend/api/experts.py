from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
import json

from database import get_db
import models
from auth import get_current_user

router = APIRouter()

class ExpertCreate(BaseModel):
    name: str
    title: Optional[str] = None
    industry: Optional[str] = None
    industries: Optional[List[str]] = None
    expertise_areas: Optional[List[str]] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None
    years_experience: Optional[int] = None

class OpinionCreate(BaseModel):
    title: str
    content: str
    industry: Optional[str] = None
    company_id: Optional[int] = None
    sentiment: str = "neutral"
    tags: Optional[List[str]] = None
    source_url: Optional[str] = None

def _expert_dict(e: models.Expert, include_opinions: bool = False) -> dict:
    d = {
        "id": e.id,
        "name": e.name,
        "title": e.title,
        "industry": e.industry,
        "industries": json.loads(e.industries) if e.industries else [],
        "expertise_areas": json.loads(e.expertise_areas) if e.expertise_areas else [],
        "bio": e.bio,
        "linkedin_url": e.linkedin_url,
        "twitter_url": e.twitter_url,
        "avatar_initials": e.avatar_initials or (e.name[:2].upper() if e.name else "EX"),
        "avatar_color": e.avatar_color or "#6366F1",
        "years_experience": e.years_experience,
        "is_verified": e.is_verified,
        "is_global": e.is_global,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }
    if include_opinions:
        d["opinions"] = [_opinion_dict(o) for o in (e.opinions or [])]
    return d

def _opinion_dict(o: models.ExpertOpinion) -> dict:
    return {
        "id": o.id,
        "expert_id": o.expert_id,
        "company_id": o.company_id,
        "industry": o.industry,
        "title": o.title,
        "content": o.content,
        "sentiment": o.sentiment,
        "tags": json.loads(o.tags) if o.tags else [],
        "source_url": o.source_url,
        "published_at": o.published_at.isoformat() if o.published_at else None,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "expert_name": o.expert.name if o.expert else None,
        "expert_title": o.expert.title if o.expert else None,
    }

@router.get("/")
def list_experts(
    industry: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Expert).filter(
        (models.Expert.is_global == True) |
        (models.Expert.organization_id == current_user.organization_id)
    )
    if industry:
        query = query.filter(
            (models.Expert.industry == industry) |
            models.Expert.industries.contains(industry)
        )
    experts = query.order_by(models.Expert.is_verified.desc(), models.Expert.created_at.desc()).all()
    return [_expert_dict(e) for e in experts]

@router.post("/")
def create_expert(
    req: ExpertCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    initials = ''.join([w[0].upper() for w in req.name.split()[:2]])
    colors = ["#6366F1", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#14B8A6"]
    color = colors[hash(req.name) % len(colors)]

    expert = models.Expert(
        organization_id=current_user.organization_id,
        name=req.name,
        title=req.title,
        industry=req.industry,
        industries=json.dumps(req.industries or []),
        expertise_areas=json.dumps(req.expertise_areas or []),
        bio=req.bio,
        linkedin_url=req.linkedin_url,
        twitter_url=req.twitter_url,
        avatar_initials=initials,
        avatar_color=color,
        years_experience=req.years_experience,
        is_global=False,
        is_verified=False,
        added_by_id=current_user.id,
    )
    db.add(expert)
    db.commit()
    db.refresh(expert)
    return _expert_dict(expert)

@router.put("/{expert_id}")
def update_expert(
    expert_id: int,
    req: ExpertCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    expert = db.query(models.Expert).filter(
        models.Expert.id == expert_id,
        models.Expert.organization_id == current_user.organization_id,
    ).first()
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found")

    for field, value in req.dict(exclude_none=True).items():
        if field in ('industries', 'expertise_areas') and isinstance(value, list):
            setattr(expert, field, json.dumps(value))
        else:
            setattr(expert, field, value)

    db.commit()
    db.refresh(expert)
    return _expert_dict(expert)

@router.delete("/{expert_id}")
def delete_expert(
    expert_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    expert = db.query(models.Expert).filter(
        models.Expert.id == expert_id,
        models.Expert.organization_id == current_user.organization_id,
        models.Expert.is_global == False,
    ).first()
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found or cannot delete system expert")
    db.delete(expert)
    db.commit()
    return {"success": True}

@router.get("/{expert_id}/opinions")
def get_expert_opinions(
    expert_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    opinions = db.query(models.ExpertOpinion).filter(
        models.ExpertOpinion.expert_id == expert_id
    ).order_by(models.ExpertOpinion.created_at.desc()).all()
    return [_opinion_dict(o) for o in opinions]

@router.post("/{expert_id}/opinions")
def add_opinion(
    expert_id: int,
    req: OpinionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    expert = db.query(models.Expert).filter(models.Expert.id == expert_id).first()
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found")

    opinion = models.ExpertOpinion(
        expert_id=expert_id,
        company_id=req.company_id,
        organization_id=current_user.organization_id,
        industry=req.industry or expert.industry,
        title=req.title,
        content=req.content,
        sentiment=req.sentiment,
        tags=json.dumps(req.tags or []),
        source_url=req.source_url,
        published_at=datetime.utcnow(),
    )
    db.add(opinion)
    db.commit()
    db.refresh(opinion)
    return _opinion_dict(opinion)

@router.delete("/{expert_id}/opinions/{opinion_id}")
def delete_opinion(
    expert_id: int,
    opinion_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    opinion = db.query(models.ExpertOpinion).filter(
        models.ExpertOpinion.id == opinion_id,
        models.ExpertOpinion.expert_id == expert_id,
    ).first()
    if not opinion:
        raise HTTPException(status_code=404, detail="Opinion not found")
    db.delete(opinion)
    db.commit()
    return {"success": True}

@router.get("/opinions/industry/{industry}")
def get_industry_opinions(
    industry: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    opinions = db.query(models.ExpertOpinion).filter(
        models.ExpertOpinion.industry == industry
    ).order_by(models.ExpertOpinion.created_at.desc()).limit(20).all()
    return [_opinion_dict(o) for o in opinions]
