from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from auth_utils import get_current_user
import models
import schemas
from services.ai_service import analyze_risks_with_ai, generate_mitigations_for_risk
from services.scoring import compute_risk_score, get_risk_level

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/analyze/{assessment_id}")
def analyze_assessment(
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

    if not assessment.risks:
        raise HTTPException(status_code=400, detail="No risks to analyze")

    org = db.query(models.Organization).filter(
        models.Organization.id == current_user.organization_id
    ).first()

    org_context = {
        "industry": assessment.industry or (org.industry if org else "general"),
        "size": assessment.organization_size or (org.size if org else "SME"),
        "location": assessment.location or (org.location if org else ""),
    }

    risks_data = [
        {
            "id": str(r.id),
            "title": r.name,
            "category": r.category,
            "probability": r.probability,
            "impact": r.impact,
            "description": r.description or "",
            "score": r.score,
        }
        for r in assessment.risks
    ]

    result = analyze_risks_with_ai(risks_data, org_context)

    # Store AI mitigations in DB
    risk_map = {str(r.id): r for r in assessment.risks}
    for risk_result in result.get("risk_results", []):
        risk = risk_map.get(risk_result["id"])
        if not risk:
            continue
        for mit_data in risk_result.get("ai_mitigations", []):
            mitigation = models.Mitigation(
                title=mit_data.get("description", "")[:255],
                description=mit_data.get("description", ""),
                action_type=mit_data.get("type", "preventive"),
                priority=mit_data.get("cost_band", "low"),
                status="planned",
                risk_id=risk.id,
            )
            db.add(mitigation)

    # Update assessment with AI summary
    assessment.ai_analysis = result.get("summary", "")
    assessment.status = "completed"

    # Compute overall score
    scores = [r.score for r in assessment.risks if r.score]
    if scores:
        top3 = sorted(scores, reverse=True)[:3]
        assessment.overall_score = round(
            (sum(top3) / len(top3)) * 0.6 + (sum(scores) / len(scores)) * 0.4, 2
        )

    db.commit()
    return {
        "summary": result.get("summary", ""),
        "overall_score": assessment.overall_score,
        "mitigations_added": sum(
            len(r.get("ai_mitigations", [])) for r in result.get("risk_results", [])
        ),
    }


@router.post("/suggest/{risk_id}")
def suggest_mitigations(
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

    org = db.query(models.Organization).filter(
        models.Organization.id == current_user.organization_id
    ).first()

    risk_data = {
        "id": str(risk.id),
        "title": risk.name,
        "category": risk.category,
        "probability": risk.probability,
        "impact": risk.impact,
        "description": risk.description or "",
    }
    org_context = {
        "industry": org.industry if org else "general",
        "size": org.size if org else "SME",
    }

    mitigations = generate_mitigations_for_risk(risk_data, org_context)

    # Save to DB
    saved = []
    for mit_data in mitigations:
        mitigation = models.Mitigation(
            title=mit_data.get("description", "")[:255],
            description=mit_data.get("description", ""),
            action_type=mit_data.get("type", "preventive"),
            priority=mit_data.get("cost_band", "low"),
            status="planned",
            risk_id=risk.id,
        )
        db.add(mitigation)
        saved.append(mit_data)

    db.commit()
    return {"mitigations": saved}
