from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import get_current_user
import os, json

router = APIRouter()

# ── Per-category default risks (fallback) ─────────────────────────────────────
DEFAULT_RISKS = {
    "financial": [
        {"name": "Cash Flow Shortage", "probability": "medium", "impact": "high",
         "description": "Insufficient working capital to meet operational and debt obligations."},
        {"name": "Revenue Concentration", "probability": "medium", "impact": "high",
         "description": "Over-reliance on a small number of clients or revenue streams."},
    ],
    "credit": [
        {"name": "Borrower Default Risk", "probability": "medium", "impact": "high",
         "description": "Credit exposure from potential borrower or counterparty defaults."},
        {"name": "Credit Concentration", "probability": "high", "impact": "high",
         "description": "Excessive exposure to a single borrower, sector, or geography."},
    ],
    "operational": [
        {"name": "Process Failure", "probability": "medium", "impact": "medium",
         "description": "Critical business process breakdowns affecting service delivery."},
        {"name": "Key Person Dependency", "probability": "medium", "impact": "high",
         "description": "Business continuity risk from loss of critical team members."},
    ],
    "market": [
        {"name": "Market Volatility", "probability": "high", "impact": "medium",
         "description": "Revenue and valuation risk from market price fluctuations."},
        {"name": "Competitive Disruption", "probability": "medium", "impact": "high",
         "description": "Emerging competitors or substitutes eroding market share."},
    ],
    "legal": [
        {"name": "Regulatory Non-Compliance", "probability": "low", "impact": "high",
         "description": "Failure to meet applicable regulatory requirements causing fines or shutdowns."},
        {"name": "Contract Breach Risk", "probability": "low", "impact": "medium",
         "description": "Financial and reputational exposure from contractual violations."},
    ],
    "technology": [
        {"name": "Cybersecurity Breach", "probability": "medium", "impact": "high",
         "description": "Unauthorized access to systems, data, or customer information."},
        {"name": "System Downtime", "probability": "low", "impact": "high",
         "description": "Critical infrastructure or application outage disrupting operations."},
    ],
    "reputational": [
        {"name": "Brand Damage", "probability": "low", "impact": "high",
         "description": "Negative publicity or PR incidents affecting customer trust."},
    ],
    "strategic": [
        {"name": "Strategic Misalignment", "probability": "medium", "impact": "medium",
         "description": "Business strategy not aligned with market realities or capabilities."},
    ],
}

DEFAULT_MITIGATIONS = {
    "financial": ["Maintain 3–6 months operating cash reserve",
                  "Diversify revenue streams across multiple client segments",
                  "Implement rolling 13-week cash flow forecast"],
    "credit": ["Enforce borrower concentration limit of 15% per client",
               "Conduct quarterly credit quality reviews",
               "Require collateral or guarantees for exposures > 10% of portfolio"],
    "operational": ["Document and automate critical business processes",
                    "Implement succession planning for key roles",
                    "Conduct quarterly BCP/DR drills"],
    "market": ["Hedge currency and commodity exposures using financial instruments",
               "Monitor competitive intelligence quarterly",
               "Diversify into adjacent markets to reduce concentration"],
    "legal": ["Conduct semi-annual compliance audits",
              "Engage dedicated compliance officer or fractional counsel",
              "Implement contract management software with renewal alerts"],
    "technology": ["Deploy zero-trust security architecture",
                   "Conduct annual penetration testing",
                   "Implement 3-2-1 backup strategy with regular restore tests"],
    "reputational": ["Establish crisis communication protocol",
                     "Monitor brand mentions with social listening tools",
                     "Build proactive media and stakeholder relationships"],
    "strategic": ["Conduct annual strategy review with board",
                  "Track OKRs quarterly against strategic plan",
                  "Establish innovation/R&D budget (10%+ of revenue)"],
}

INDUSTRY_CONTEXT = {
    "banking": "Focus on Basel compliance, stress testing, and credit quality metrics.",
    "nbfc": "Pay special attention to NPA ratios, ALM gaps, and RBI regulatory requirements.",
    "technology": "Prioritize data security (SOC 2, ISO 27001), uptime SLAs, and GDPR compliance.",
    "manufacturing": "Emphasize supply chain resilience, equipment redundancy, and EHS compliance.",
    "ecommerce": "Focus on payment fraud, logistics reliability, and inventory optimization.",
    "healthcare": "HIPAA, patient safety, clinical liability, and drug supply chain are key.",
    "logistics": "Route redundancy, fuel hedging, customs compliance, and fleet maintenance.",
}

def build_mock_response(request: schemas.AIAnalysisRequest) -> schemas.AIAnalysisResponse:
    """Build a rich mock AI response when no API key is present."""
    categories = request.risk_categories or ["financial", "operational"]
    industry = (request.industry or "general").lower()
    ctx = INDUSTRY_CONTEXT.get(industry, "Focus on comprehensive risk management across all categories.")

    # Generate risks for each selected category
    risks = []
    for cat in categories:
        defaults = DEFAULT_RISKS.get(cat, [])
        for r in defaults:
            risks.append({
                "name": r["name"],
                "category": cat,
                "probability": r["probability"],
                "impact": r["impact"],
                "description": r["description"],
                "owner": "",
            })

    analysis = f"""## AI Risk Assessment Analysis

### Executive Summary
Based on the analysis of your {industry} business profile, our AI model has identified **{len(risks)} key risks** across {len(categories)} risk categories. The overall risk environment is moderate-to-high, requiring structured mitigation actions.

### Key Risk Areas
{chr(10).join([f'- **{cat.title()} Risk**: {len(DEFAULT_RISKS.get(cat, []))} risks identified requiring attention.' for cat in categories])}

### Industry Context
{ctx}

### Recommended Priority Actions
1. Establish a formal Risk Management Committee with quarterly reviews
2. Implement risk monitoring dashboards with real-time alerts
3. Conduct stress testing across top 3 identified risk scenarios
4. Build a Business Continuity Plan covering critical processes
5. Assign risk owners and mitigation deadlines for all high-severity risks"""

    recommendations = [
        "Conduct a full risk inventory workshop with department heads",
        "Implement a risk register reviewed monthly by senior management",
        "Assign risk owners and mitigation deadlines to all identified risks",
        "Develop scenario plans for your top 3 high-impact risks",
        "Establish KRIs (Key Risk Indicators) with automated alerting",
        "Schedule annual third-party risk assessment",
    ]

    return schemas.AIAnalysisResponse(
        analysis=analysis,
        recommendations=recommendations,
        risk_summary={
            "total_identified": len(risks),
            "critical": sum(1 for r in risks if r["probability"] == "high" and r["impact"] == "high"),
            "high": sum(1 for r in risks if r["impact"] == "high"),
            "medium": sum(1 for r in risks if r["impact"] == "medium"),
            "low": sum(1 for r in risks if r["impact"] == "low"),
            "top_risk": risks[0]["name"] if risks else "N/A",
            "risk_score": 6.5,
        },
        overall_score=6.5,
        risks=risks,
        mitigations=[{"description": m, "category": cat, "action_type": "reduce", "priority": "high"}
                     for cat in categories for m in DEFAULT_MITIGATIONS.get(cat, [])[:2]],
        assessment_updates={"overall_score": 6.5, "status": "completed"},
    )

def build_mitigations_only(request: schemas.AIAnalysisRequest) -> schemas.AIAnalysisResponse:
    """Build mitigation suggestions for a single risk."""
    cat = request.category or "operational"
    risk_name = request.risk_name or "identified risk"
    prob = request.probability or "medium"
    impact = request.impact or "medium"

    mits = DEFAULT_MITIGATIONS.get(cat, ["Implement preventive controls", "Assign a risk owner", "Monitor with KPIs"])

    mitigations = [
        {
            "title": m,
            "description": f"Mitigation for '{risk_name}': {m}",
            "action_type": "reduce",
            "priority": "high" if impact == "high" else "medium",
        }
        for m in mits[:3]
    ]

    return schemas.AIAnalysisResponse(
        analysis=f"Mitigation strategies for {risk_name}.",
        mitigations=mitigations,
        risks=[],
        recommendations=[m["title"] for m in mitigations],
        overall_score=None,
    )

@router.post("/analyze", response_model=schemas.AIAnalysisResponse)
async def analyze_risks(
    request: schemas.AIAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Mitigations-only mode
    if request.mode == "mitigations_only":
        api_key = os.getenv("OPENAI_API_KEY", "")
        if api_key and api_key not in ("your_key_here", ""):
            try:
                from openai import OpenAI
                client = OpenAI(api_key=api_key)
                prompt = f"""You are a senior risk consultant.
Provide 3 specific mitigation strategies for the following risk:

Risk: {request.risk_name}
Category: {request.category}
Probability: {request.probability}
Impact: {request.impact}
Description: {request.description or "N/A"}

Respond with JSON: {{
  "mitigations": [
    {{"title": "short title", "description": "detailed action", "action_type": "reduce|avoid|transfer|accept", "priority": "high|medium|low"}}
  ]
}}"""
                resp = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "system", "content": "Risk management expert. Return valid JSON only."},
                              {"role": "user", "content": prompt}],
                    response_format={"type": "json_object"}, temperature=0.7,
                )
                data = json.loads(resp.choices[0].message.content)
                return schemas.AIAnalysisResponse(mitigations=data.get("mitigations", []), risks=[], recommendations=[])
            except Exception as e:
                print(f"OpenAI error (mitigations): {e}")
        return build_mitigations_only(request)

    # Full assessment analysis
    api_key = os.getenv("OPENAI_API_KEY", "")
    if api_key and api_key not in ("your_key_here", ""):
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            risks_text = "\n".join([
                f"- {r.get('name', 'Unknown')}: {r.get('category', 'general')} | prob={r.get('probability')} impact={r.get('impact')}"
                for r in (request.risks or [])
            ]) or "No specific risks provided yet — perform initial identification."

            prompt = f"""You are an expert enterprise risk management consultant.

Business Profile:
- Industry: {request.industry}
- Size: {request.organization_size}
- Revenue: ${request.annual_revenue:,.0f if request.annual_revenue else 'unknown'}
- Location: {request.location}
- Risk categories: {', '.join(request.risk_categories or [])}

Existing risks: {risks_text}

Provide:
1. Detailed risk analysis (3-4 paragraphs)
2. 6 specific actionable recommendations
3. Risk summary: total_identified, critical, high, medium, low counts, top_risk name, risk_score (1-10)
4. List of identified risks with: name, category, probability (low/medium/high), impact (low/medium/high), description
5. overall_score (1-10)

Respond ONLY with valid JSON:
{{
  "analysis": "...",
  "recommendations": ["..."],
  "risk_summary": {{"total_identified": N, "critical": N, "high": N, "medium": N, "low": N, "top_risk": "...", "risk_score": N}},
  "risks": [{{"name": "...", "category": "...", "probability": "...", "impact": "...", "description": "..."}}],
  "overall_score": N
}}"""

            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": "Enterprise risk management expert. Return valid JSON only."},
                          {"role": "user", "content": prompt}],
                response_format={"type": "json_object"}, temperature=0.7,
            )
            data = json.loads(resp.choices[0].message.content)

            # Update assessment in DB
            if request.assessment_id:
                assessment = db.query(models.Assessment).filter(
                    models.Assessment.id == request.assessment_id
                ).first()
                if assessment:
                    assessment.ai_analysis = data.get("analysis", "")
                    assessment.overall_score = float(data.get("overall_score", 6.5))
                    assessment.status = "completed"
                    db.commit()

            return schemas.AIAnalysisResponse(
                analysis=data.get("analysis", ""),
                recommendations=data.get("recommendations", []),
                risk_summary=data.get("risk_summary", {}),
                overall_score=float(data.get("overall_score", 6.5)),
                risks=data.get("risks", []),
                assessment_updates={"overall_score": float(data.get("overall_score", 6.5)), "status": "completed"},
            )
        except Exception as e:
            print(f"OpenAI error (full): {e}")

    # ── Fallback mock ──────────────────────────────────────────────────────────
    result = build_mock_response(request)

    if request.assessment_id:
        assessment = db.query(models.Assessment).filter(
            models.Assessment.id == request.assessment_id
        ).first()
        if assessment:
            assessment.ai_analysis = result.analysis
            assessment.overall_score = result.overall_score or 6.5
            assessment.status = "completed"
            db.commit()

    return result
