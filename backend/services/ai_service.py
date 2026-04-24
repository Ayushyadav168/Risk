import os
import json
from typing import Optional

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

MOCK_MITIGATIONS = {
    "financial": [
        {"description": "Maintain a minimum cash reserve of 3–6 months operating expenses in a liquid account.", "type": "preventive", "cost_band": "low"},
        {"description": "Diversify revenue streams to reduce dependency on a single client or product line.", "type": "preventive", "cost_band": "medium"},
        {"description": "Implement monthly cash flow forecasting with variance analysis.", "type": "detective", "cost_band": "low"},
    ],
    "credit": [
        {"description": "Enforce borrower concentration limit — no single borrower should exceed 15% of total portfolio.", "type": "preventive", "cost_band": "low"},
        {"description": "Conduct quarterly credit reviews for all borrowers above ₹10L exposure.", "type": "detective", "cost_band": "low"},
        {"description": "Require collateral or personal guarantee for loans above defined thresholds.", "type": "preventive", "cost_band": "low"},
        {"description": "Implement an early-warning system using payment delay indicators.", "type": "detective", "cost_band": "medium"},
    ],
    "operational": [
        {"description": "Document all critical processes and maintain updated SOPs accessible to at least 2 team members.", "type": "preventive", "cost_band": "low"},
        {"description": "Qualify a secondary supplier for all critical raw materials within 90 days.", "type": "preventive", "cost_band": "medium"},
        {"description": "Conduct quarterly business continuity drills for key operational scenarios.", "type": "detective", "cost_band": "low"},
        {"description": "Maintain 45-day strategic inventory buffer for critical inputs.", "type": "preventive", "cost_band": "medium"},
    ],
    "market": [
        {"description": "Conduct bi-annual competitive analysis to track market share shifts and pricing pressure.", "type": "detective", "cost_band": "low"},
        {"description": "Diversify customer segments to avoid over-reliance on one market vertical.", "type": "preventive", "cost_band": "medium"},
        {"description": "Build a 6-month product roadmap aligned with customer feedback loops.", "type": "preventive", "cost_band": "low"},
    ],
    "legal": [
        {"description": "Execute Data Processing Agreements (DPAs) with all vendors handling personal data.", "type": "preventive", "cost_band": "low"},
        {"description": "Schedule quarterly compliance reviews with legal counsel for regulatory changes.", "type": "detective", "cost_band": "medium"},
        {"description": "Implement employee compliance training program covering GDPR, DPDP Act, and sector regulations.", "type": "preventive", "cost_band": "low"},
        {"description": "Maintain an updated contract register with renewal dates and obligation tracking.", "type": "detective", "cost_band": "low"},
    ],
}

INDUSTRY_CONTEXT = {
    "finance": "financial services and lending",
    "manufacturing": "manufacturing and supply chain",
    "saas": "SaaS and software products",
    "ecommerce": "e-commerce and retail",
    "healthcare": "healthcare services",
    "it": "information technology services",
}


def get_mock_analysis(risks: list, org_context: dict) -> dict:
    """Generate intelligent mock AI analysis when OpenAI is not available."""
    industry = org_context.get("industry", "general")
    industry_label = INDUSTRY_CONTEXT.get(industry, "your industry")

    risk_results = []
    for risk in risks:
        category = risk.get("category", "operational").lower()
        mitigations = MOCK_MITIGATIONS.get(category, MOCK_MITIGATIONS["operational"])

        risk_results.append({
            "id": risk["id"],
            "ai_mitigations": mitigations[:3],
        })

    scores = [r.get("score", 5.0) for r in risks]
    avg_score = sum(scores) / len(scores) if scores else 5.0

    return {
        "risk_results": risk_results,
        "summary": (
            f"Based on your {industry_label} profile, your organization faces "
            f"{'elevated' if avg_score > 6.5 else 'moderate'} risk exposure across "
            f"{len(risks)} identified risk areas. "
            f"Priority attention is required for {'credit and financial' if industry == 'finance' else 'operational and market'} "
            f"risks. Immediate action on high-scoring risks will significantly reduce your overall risk posture."
        ),
    }


def analyze_risks_with_ai(risks: list, org_context: dict) -> dict:
    """Analyze risks using OpenAI or fall back to mock."""
    if not OPENAI_API_KEY or not OPENAI_AVAILABLE:
        return get_mock_analysis(risks, org_context)

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        industry = org_context.get("industry", "general")
        size = org_context.get("size", "SME")
        location = org_context.get("location", "")

        system_prompt = f"""You are a senior risk consultant specializing in {industry} businesses.
The company is a {size} in {location}.

For each risk provided, generate 3 specific, actionable mitigation strategies.
Return ONLY valid JSON in this exact format:
{{
  "risk_results": [
    {{
      "id": "<risk_id>",
      "ai_mitigations": [
        {{"description": "...", "type": "preventive|detective|corrective", "cost_band": "low|medium|high"}},
        {{"description": "...", "type": "...", "cost_band": "..."}},
        {{"description": "...", "type": "...", "cost_band": "..."}}
      ]
    }}
  ],
  "summary": "2-3 sentence executive summary of the overall risk posture"
}}

Be specific — reference real regulations (RBI, SEBI, GDPR, DPDP Act) where applicable.
Mitigations should be cost-effective for an SME."""

        risks_text = json.dumps([{
            "id": r["id"],
            "title": r["title"],
            "category": r["category"],
            "probability": r["probability"],
            "impact": r["impact"],
            "description": r.get("description", ""),
        } for r in risks], indent=2)

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analyze these risks:\n{risks_text}"},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )

        return json.loads(response.choices[0].message.content)

    except Exception as e:
        print(f"OpenAI error: {e}, falling back to mock")
        return get_mock_analysis(risks, org_context)


def generate_mitigations_for_risk(risk: dict, org_context: dict) -> list:
    """Generate mitigations for a single risk."""
    category = risk.get("category", "operational").lower()
    base_mitigations = MOCK_MITIGATIONS.get(category, MOCK_MITIGATIONS["operational"])

    if not OPENAI_API_KEY or not OPENAI_AVAILABLE:
        return base_mitigations[:3]

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "Generate 3 specific risk mitigation strategies. Return JSON: {\"mitigations\": [{\"description\": str, \"type\": str, \"cost_band\": str}]}"
                },
                {
                    "role": "user",
                    "content": f"Risk: {risk['title']}\nCategory: {risk['category']}\nProbability: {risk['probability']}\nImpact: {risk['impact']}"
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        data = json.loads(response.choices[0].message.content)
        return data.get("mitigations", base_mitigations[:3])
    except Exception:
        return base_mitigations[:3]
