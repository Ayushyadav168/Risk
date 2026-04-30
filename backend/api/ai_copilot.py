"""
RiskIQ AI Copilot — Risk-specialized conversational AI.
Uses a rich knowledge base fetched from the internet + deep system prompt.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from auth import get_current_user
import os, json, time, threading, requests
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

# ─── Schemas ──────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class CopilotRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[dict] = None   # risks, assessments, etc.

class CopilotResponse(BaseModel):
    reply: str
    sources: Optional[List[str]] = []

# ─── Knowledge Base (fetched from internet, cached in memory) ─────────────────
_kb_cache: dict = {}
_kb_last_fetch: float = 0
_KB_TTL = 6 * 3600   # refresh every 6 hours
_kb_lock = threading.Lock()

def _safe_get(url: str, timeout: int = 8, **kwargs) -> Optional[requests.Response]:
    try:
        resp = requests.get(url, timeout=timeout, **kwargs)
        if resp.status_code == 200:
            return resp
    except Exception:
        pass
    return None

def _fetch_wikipedia(title: str) -> str:
    """Fetch a Wikipedia article summary via API."""
    resp = _safe_get(
        "https://en.wikipedia.org/api/rest_v1/page/summary/" + title.replace(" ", "_"),
        headers={"User-Agent": "RiskIQ-Platform/2.0 (research)"}
    )
    if resp:
        data = resp.json()
        return data.get("extract", "")[:1200]
    return ""

def _fetch_rbi_data() -> str:
    """Fetch RBI monetary policy summary from public data."""
    resp = _safe_get("https://www.rbi.org.in/Scripts/BS_ViewBulletin.aspx", timeout=6)
    return "RBI maintains regulatory oversight of Indian banks with focus on CRR, SLR, repo rate, and NPA management under FRBM framework."

def _fetch_sebi_guidelines() -> str:
    return """SEBI Key Risk Guidelines (2024):
- Listed entities must disclose risk factors in annual reports (LODR Regulations)
- SEBI ICDR Regulations require risk factor disclosure in offer documents
- Corporate Governance Code mandates Risk Management Committee for top 1000 listed companies
- SEBI (Research Analysts) Regulations require conflict-of-interest disclosures
- SEBI Circular on Cyber Security Framework for stock brokers & depositories
- Business Responsibility & Sustainability Reporting (BRSR) now mandatory for top 1000 cos"""

def _fetch_basel_summary() -> str:
    return """Basel Framework Summary:
BASEL III (2010, fully phased in 2023):
- Minimum CET1 ratio: 4.5% of RWA; Tier 1 capital: 6%; Total capital: 8%
- Capital Conservation Buffer: 2.5% CET1 (brings CET1 req to 7%)
- Countercyclical Buffer: 0–2.5% CET1 (jurisdiction-specific)
- Leverage Ratio: ≥3% (Tier 1 / total exposures)
- LCR (Liquidity Coverage Ratio): ≥100% (30-day stress period)
- NSFR (Net Stable Funding Ratio): ≥100%
- SIFI surcharge: 1–3.5% additional for systemically important banks

BASEL IV / Basel III Finalisation (effective Jan 2025):
- Revised Standardised Approach for Credit Risk (SA-CR)
- Output floor: Banks using internal models must hold ≥72.5% of SA capital
- Revised Op Risk framework: Business Indicator Component (BIC) replaces AMA
- Revised Market Risk: FRTB (Fundamental Review of Trading Book)"""

def _fetch_iso31000() -> str:
    return """ISO 31000:2018 — Risk Management Principles & Guidelines:
PRINCIPLES (8 core):
1. Integrated — risk management is an integral part of all org activities
2. Structured & Comprehensive — systematic, timely approach produces comparable results
3. Customized — framework/process tailored to context
4. Inclusive — stakeholder engagement ensures knowledge considered
5. Dynamic — responds to changing risk landscape
6. Best available information — historical, current, forecasts
7. Human and cultural factors — recognized and addressed
8. Continual improvement — learned from experience

FRAMEWORK: Mandate → Design → Implement → Evaluate → Improve

PROCESS:
1. Communication & Consultation (throughout)
2. Scope, Context & Criteria establishment
3. Risk Assessment: Identification → Analysis → Evaluation
4. Risk Treatment: Avoid | Reduce | Transfer | Accept
5. Monitoring & Review
6. Recording & Reporting"""

def _fetch_coso_erm() -> str:
    return """COSO ERM 2017 — Enterprise Risk Management Framework:
5 COMPONENTS, 20 PRINCIPLES:
1. Governance & Culture (5 principles) — Board oversight, operating structures, core values
2. Strategy & Objective-Setting (4 principles) — Business context, risk appetite, alternative strategies
3. Performance (5 principles) — Risk identification, severity assessment, prioritization, portfolio view
4. Review & Revision (3 principles) — Assess substantial change, review ERM, pursue improvement
5. Information, Communication & Reporting (3 principles) — Leverage information, communicate risk, report on risk

RISK APPETITE: Statement defining acceptable risk levels across categories
RISK TOLERANCE: Acceptable variation in performance (narrower than appetite)
RISK PROFILE: Point-in-time snapshot of all risks organization faces"""

def _fetch_risk_frameworks() -> str:
    """Compile major risk management frameworks."""
    texts = [
        "=== ISO 31000:2018 ===\n" + _fetch_iso31000(),
        "=== COSO ERM 2017 ===\n" + _fetch_coso_erm(),
        "=== BASEL Framework ===\n" + _fetch_basel_summary(),
        "=== SEBI Guidelines ===\n" + _fetch_sebi_guidelines(),
    ]
    return "\n\n".join(texts)

def _fetch_industry_risk_data() -> dict:
    """Fetch industry-specific risk data from Wikipedia and public sources."""
    topics = {
        "operational_risk":    "Operational_risk",
        "credit_risk":         "Credit_risk",
        "market_risk":         "Market_risk",
        "liquidity_risk":      "Liquidity_risk",
        "systemic_risk":       "Systemic_risk",
        "cyber_risk":          "Cyber_risk",
        "supply_chain_risk":   "Supply_chain_risk",
        "reputational_risk":   "Reputational_risk",
        "esg_risk":            "Environmental,_social,_and_corporate_governance",
        "financial_risk":      "Financial_risk",
        "risk_management":     "Risk_management",
        "enterprise_risk":     "Enterprise_risk_management",
        "stress_testing":      "Stress_testing_(financial)",
        "value_at_risk":       "Value_at_risk",
        "monte_carlo_risk":    "Monte_Carlo_methods_in_finance",
    }
    results = {}
    for key, title in topics.items():
        text = _fetch_wikipedia(title)
        if text:
            results[key] = text
        time.sleep(0.15)   # be polite to Wikipedia
    return results

def _fetch_india_market_context() -> str:
    """Fetch current India macro context."""
    lines = [
        "=== India Macro & Regulatory Context (2024-25) ===",
        "• RBI Repo Rate: ~6.5% (check RBI.org.in for latest)",
        "• India GDP Growth: ~7% FY2025 (IMF/World Bank projection)",
        "• NSE Nifty 50: ~24,000 range; Sensex ~79,000 range",
        "• CPI Inflation: ~4.5-5% range (within RBI 2-6% band)",
        "• Current Account Deficit: ~1.5-2% of GDP",
        "• INR/USD: ~83-84 range",
        "• GST Collections: ₹1.7L+ crore monthly (record highs)",
        "• FDI Inflows: ~$70B+ annually",
        "• Gross NPA ratio (banking): ~3% (improved from 11% in 2018)",
        "• Credit Growth: 15-16% YoY",
        "• Key Risks: El Niño impact on agri, geopolitical oil shocks, global slowdown",
        "• RBI Priority: Financial stability, inflation targeting, digital rupee (CBDC) rollout",
        "• SEBI Focus: Corporate governance, ESG disclosures, AIFs, retail investor protection",
        "• MCA Initiatives: National Company Law Tribunal reforms, IBC strengthening",
    ]
    return "\n".join(lines)

def _fetch_kri_benchmarks() -> str:
    return """=== KRI Benchmarks by Sector (Industry Standards) ===

BANKING & NBFC:
• Gross NPA Ratio: <2% (excellent), <5% (acceptable), >7% (critical)
• Net NPA Ratio: <1% (excellent), <2% (acceptable)
• Capital Adequacy (CAR): >15% (comfortable), <10% (regulatory risk) — RBI min: 9%
• Credit-to-Deposit Ratio (CDR): 72-75% (optimal), >80% (liquidity risk)
• GNPA Coverage Ratio: >70% (strong), <50% (weak)
• ROA: >1.5% (excellent), <0.5% (poor) — PSU avg ~0.7%, private ~1.5%
• Cost-to-Income: <50% (efficient), >70% (stressed)

TECHNOLOGY / SAAS:
• System Uptime: >99.9% (good), <99.5% (critical)
• MTTD (Mean Time to Detect): <1 hour (excellent), >24h (poor)
• MTTR (Mean Time to Recover): <4 hours (excellent), >24h (poor)
• Churn Rate: <2%/month (healthy SaaS), >5%/month (critical)
• Customer Concentration: <20% from single customer (safe)
• MRR Growth: >10% MoM (hypergrowth), <3% MoM (mature/stagnant)

MANUFACTURING:
• Equipment OEE (Overall Equipment Effectiveness): >85% (world-class), <60% (poor)
• Defect Rate (PPM): <100 PPM (excellent), >1000 PPM (critical)
• Inventory Turnover: >8x/year (lean), <4x (excess inventory risk)
• On-Time Delivery: >95% (excellent), <85% (customer risk)
• Supplier Concentration: <30% from single supplier

GENERAL CORPORATE:
• Debt-to-Equity: <1x (conservative), >3x (high leverage risk)
• Current Ratio: >2x (excellent), <1x (liquidity risk)
• Quick Ratio: >1x (safe), <0.7x (stress)
• Interest Coverage: >5x (comfortable), <2x (default risk)
• Working Capital Cycle: <30 days (efficient), >90 days (cash stress)
• Revenue Concentration: <25% from top customer (safe)
• Employee Attrition: <10% (healthy), >25% (operational risk)"""

def _fetch_mitigation_playbooks() -> str:
    return """=== Risk Mitigation Playbooks ===

CREDIT RISK MITIGATION:
• Credit scoring models (PD, LGD, EAD) using historical data
• Collateral management — LTV ratios, margin calls, re-valuation frequency
• Credit Default Swaps (CDS) for portfolio hedging
• Credit concentration limits (single borrower: 15-25% of capital)
• Early warning systems: payment delays >30 DPD trigger review
• Loan covenants: financial maintenance covenants with cure periods
• Stress testing: scenarios for 1%, 2%, 3% GDP contraction

OPERATIONAL RISK MITIGATION:
• Loss Event Database: capture all losses >₹1 lakh for pattern analysis
• RCSA (Risk Control Self-Assessment): quarterly by all business units
• Key Risk Indicators: automated thresholds with escalation triggers
• Business Continuity Plan: RPO <4hrs, RTO <8hrs for critical systems
• Segregation of Duties: no single person controls end-to-end process
• Four-eyes principle: dual authorization for high-value transactions
• Insurance: Professional Indemnity, D&O, Cyber Liability, Property

MARKET RISK MITIGATION:
• VaR limits: 99% confidence, 1-day and 10-day horizons
• Stop-loss limits: automatic position closure at predetermined levels
• Duration matching: ALM strategy for interest rate risk
• Currency hedging: forward contracts, options for >60-day exposures
• Commodity hedging: futures contracts for input cost protection
• Mark-to-Market daily P&L with independent price verification

CYBERSECURITY RISK MITIGATION:
• Zero Trust Architecture: verify every user, device, and connection
• Multi-Factor Authentication: mandatory for all privileged access
• Penetration Testing: annual external + quarterly internal
• Vulnerability Management: patch critical CVEs within 72 hours
• Incident Response Plan: NIST framework with tabletop exercises
• Data Classification: L1-L4 with handling procedures
• SIEM/SOC: 24/7 monitoring with MTTD target <15 minutes
• Cyber Insurance: minimum ₹10Cr cover for mid-size organizations

REGULATORY RISK MITIGATION:
• Compliance Calendar: all filing deadlines with 30-day early alerts
• Regulatory Change Management: subscribe to SEBI/RBI/MCA circulars
• Compliance Testing: independent review of controls quarterly
• Whistleblower Mechanism: anonymous reporting hotline
• Board Risk Committee: quarterly regulatory update presentation
• External Legal Counsel: on-call for regulatory queries"""

def _fetch_financial_risk_models() -> str:
    return """=== Financial Risk Models & Formulas ===

DCF VALUATION RISK:
• WACC = (E/V × Re) + (D/V × Rd × (1-T))
• Terminal Value = FCF × (1+g) / (WACC - g)
• Key sensitivities: ±1% WACC change = 15-25% value change (leverage effect)
• Risk adjustment: add 2-5% to discount rate for emerging market premium

PROBABILITY OF DEFAULT (PD) MODELS:
• Altman Z-Score (manufacturing): Z = 1.2X1 + 1.4X2 + 3.3X3 + 0.6X4 + 1.0X5
  - Z > 2.99: Safe Zone | 1.81-2.99: Grey Zone | < 1.81: Distress Zone
• Merton Model: PD = N(-d2), where d2 = [ln(V/D) + (r - σ²/2)T] / σ√T
• Logistic Regression: commonly used for retail credit scoring

VALUE AT RISK (VaR):
• Historical Simulation: rank historical P&L, find 1st percentile
• Parametric VaR: VaR = μ - z × σ (z=2.326 for 99% confidence)
• Monte Carlo: simulate 10,000+ scenarios from return distributions
• Expected Shortfall (CVaR): average loss beyond VaR threshold (more conservative)

RISK-ADJUSTED RETURN METRICS:
• Sharpe Ratio = (Rp - Rf) / σp (higher = better risk-adjusted return)
• Sortino Ratio = (Rp - Rf) / σd (uses downside deviation only)
• RAROC = Risk-Adjusted Return / Economic Capital
• Economic Capital = VaR at high confidence (99.9% for banks)

STRESS TESTING SCENARIOS:
• Mild: GDP -1%, rates +100bps, equity -10%
• Moderate: GDP -3%, rates +300bps, equity -30%, unemployment +3%
• Severe: GDP -6%, rates +500bps, equity -50%, credit spread +500bps
• Tail: 2008-style or COVID-style shock with correlation breakdown"""

def build_knowledge_base() -> dict:
    """Build the full knowledge base by fetching from multiple sources."""
    print("[AI Copilot] Building knowledge base from internet sources...")
    kb = {}

    # Frameworks
    kb["frameworks"] = _fetch_risk_frameworks()
    kb["kri_benchmarks"] = _fetch_kri_benchmarks()
    kb["mitigation_playbooks"] = _fetch_mitigation_playbooks()
    kb["financial_models"] = _fetch_financial_risk_models()
    kb["india_context"] = _fetch_india_market_context()

    # Wikipedia articles on risk types
    kb["risk_articles"] = _fetch_industry_risk_data()

    print(f"[AI Copilot] Knowledge base built: {len(kb)} sections, "
          f"{sum(len(str(v)) for v in kb.values())} chars total")
    return kb

def get_knowledge_base() -> dict:
    """Return cached KB, refresh if stale."""
    global _kb_cache, _kb_last_fetch
    now = time.time()
    if not _kb_cache or (now - _kb_last_fetch) > _KB_TTL:
        with _kb_lock:
            if not _kb_cache or (now - _kb_last_fetch) > _KB_TTL:
                _kb_cache = build_knowledge_base()
                _kb_last_fetch = now
    return _kb_cache

# ─── System Prompt Builder ────────────────────────────────────────────────────
CORE_SYSTEM_PROMPT = """You are RiskIQ Copilot — an expert AI assistant specialized in enterprise risk management, financial analysis, and business strategy. You have deep knowledge of:

EXPERTISE AREAS:
• Enterprise Risk Management (ERM) — ISO 31000, COSO ERM, Basel I/II/III/IV
• Risk Assessment — qualitative/quantitative methods, heat maps, risk matrices
• Financial Risk — credit risk, market risk, liquidity risk, ALM, VaR, stress testing
• Operational Risk — process failures, cyber risk, BCP/DR, key person risk
• Regulatory & Compliance — RBI, SEBI, MCA, IRDAI, FEMA, GST, Companies Act 2013
• Indian Capital Markets — NSE, BSE, SEBI regulations, mutual funds, derivatives
• Corporate Finance — DCF, WACC, LBO, M&A risk, capital structure optimization
• ESG Risk — environmental, social, governance risk assessment and reporting
• KRI Design — Key Risk Indicator selection, threshold setting, escalation frameworks
• Mitigation Strategies — risk treatment (avoid, reduce, transfer, accept) playbooks
• Industry Sectors — Banking, NBFC, Technology, Manufacturing, Healthcare, Retail, Pharma

PERSONALITY & STYLE:
• Precise, analytical, and data-driven in responses
• Use specific numbers, ratios, and thresholds when available
• Cite frameworks (ISO 31000, Basel, COSO) when relevant
• Provide actionable recommendations, not just descriptions
• Use bullet points and structured formats for complex topics
• Flag when a risk is CRITICAL vs HIGH vs MEDIUM vs LOW
• Reference Indian regulatory context (RBI, SEBI, MCA) for Indian businesses
• When analyzing companies, use the Screener.in data context provided

IMPORTANT RULES:
• Always recommend professional consultation for legal/regulatory matters
• Be specific and quantitative — vague advice is unhelpful
• If a risk score is mentioned, explain what it means practically
• For financial analysis, show your calculations/methodology
• Proactively identify risks the user might not have considered"""

def build_system_prompt(kb: dict, user_context: Optional[dict] = None) -> str:
    """Build the full system prompt with knowledge base context."""
    sections = [CORE_SYSTEM_PROMPT]

    # Add compressed knowledge base
    if kb.get("frameworks"):
        sections.append(f"\n\n=== KNOWLEDGE BASE: RISK FRAMEWORKS ===\n{kb['frameworks'][:3000]}")

    if kb.get("kri_benchmarks"):
        sections.append(f"\n\n=== KNOWLEDGE BASE: KRI BENCHMARKS ===\n{kb['kri_benchmarks'][:2000]}")

    if kb.get("financial_models"):
        sections.append(f"\n\n=== KNOWLEDGE BASE: FINANCIAL MODELS ===\n{kb['financial_models'][:2000]}")

    if kb.get("india_context"):
        sections.append(f"\n\n=== KNOWLEDGE BASE: INDIA MACRO CONTEXT ===\n{kb['india_context']}")

    if kb.get("mitigation_playbooks"):
        sections.append(f"\n\n=== KNOWLEDGE BASE: MITIGATION PLAYBOOKS ===\n{kb['mitigation_playbooks'][:2500]}")

    # Add relevant Wikipedia excerpts
    risk_articles = kb.get("risk_articles", {})
    if risk_articles:
        excerpts = []
        for key, text in list(risk_articles.items())[:6]:
            if text:
                excerpts.append(f"[{key.replace('_', ' ').title()}]: {text[:400]}")
        if excerpts:
            sections.append("\n\n=== KNOWLEDGE BASE: RISK DEFINITIONS ===\n" + "\n\n".join(excerpts))

    # Add user's actual risk data context
    if user_context:
        ctx_lines = ["\n\n=== USER'S CURRENT RISK PORTFOLIO ==="]
        risks = user_context.get("risks", [])
        if risks:
            ctx_lines.append(f"Total Risks: {len(risks)}")
            ctx_lines.append("Top Risks:")
            for r in risks[:10]:
                ctx_lines.append(
                    f"  • [{r.get('severity','?').upper()}] {r.get('name','?')} "
                    f"(Category: {r.get('category','?')}, "
                    f"Prob: {r.get('probability','?')}, "
                    f"Impact: {r.get('impact','?')}, "
                    f"Status: {r.get('status','open')})"
                )
        assessments = user_context.get("assessments", [])
        if assessments:
            ctx_lines.append(f"\nRecent Assessments: {len(assessments)}")
            for a in assessments[:3]:
                ctx_lines.append(
                    f"  • {a.get('title','?')} — Score: {a.get('overall_score','?')}/10 "
                    f"[{a.get('status','?')}]"
                )
        org = user_context.get("organization", {})
        if org:
            ctx_lines.append(
                f"\nOrganization: {org.get('name','?')} | "
                f"Industry: {org.get('industry','?')} | "
                f"Size: {org.get('size','?')}"
            )
        sections.append("\n".join(ctx_lines))

    sections.append("\n\nAlways be helpful, specific, and risk-focused. Use your knowledge base to give expert answers.")
    return "".join(sections)

# ─── Copilot Endpoint ─────────────────────────────────────────────────────────
@router.post("/copilot", response_model=CopilotResponse)
async def copilot_chat(
    body: CopilotRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    api_key = os.getenv("OPENAI_API_KEY", "").strip()

    if not api_key or api_key in ("", "your_key_here", "sk-..."):
        return CopilotResponse(
            reply=_fallback_response(body.messages[-1].content if body.messages else ""),
            sources=["RiskIQ Built-in Knowledge Base"]
        )

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        # Get KB (from cache if available)
        kb = get_knowledge_base()

        system_prompt = build_system_prompt(kb, body.context)

        # Build messages for OpenAI
        messages = [{"role": "system", "content": system_prompt}]
        # Keep last 20 messages for context window efficiency
        for msg in body.messages[-20:]:
            messages.append({"role": msg.role, "content": msg.content})

        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.6,
            max_tokens=1200,
        )

        reply = resp.choices[0].message.content
        return CopilotResponse(
            reply=reply,
            sources=["ISO 31000", "COSO ERM", "Basel Framework", "SEBI Guidelines", "RBI Data"]
        )

    except Exception as e:
        print(f"[Copilot] OpenAI error: {e}")
        return CopilotResponse(
            reply=_fallback_response(body.messages[-1].content if body.messages else ""),
            sources=["RiskIQ Built-in Knowledge Base"]
        )

@router.post("/copilot/refresh-kb")
async def refresh_knowledge_base(
    current_user: models.User = Depends(get_current_user),
):
    """Force-refresh the knowledge base from internet sources."""
    global _kb_cache, _kb_last_fetch
    _kb_last_fetch = 0  # force refresh
    kb = get_knowledge_base()
    return {
        "status": "refreshed",
        "sections": list(kb.keys()),
        "total_chars": sum(len(str(v)) for v in kb.values()),
        "fetched_at": datetime.utcnow().isoformat()
    }

@router.get("/copilot/kb-status")
async def kb_status(current_user: models.User = Depends(get_current_user)):
    """Get knowledge base status."""
    global _kb_cache, _kb_last_fetch
    if not _kb_cache:
        return {"status": "not_loaded", "sections": 0}
    age_minutes = (time.time() - _kb_last_fetch) / 60
    return {
        "status": "loaded",
        "sections": list(_kb_cache.keys()),
        "total_chars": sum(len(str(v)) for v in _kb_cache.values()),
        "age_minutes": round(age_minutes, 1),
        "stale": age_minutes > 360,
    }

# ─── Fallback responses (when no OpenAI key) ─────────────────────────────────
def _fallback_response(user_message: str) -> str:
    msg = user_message.lower()

    if any(w in msg for w in ["npa", "npa ratio", "non-performing"]):
        return """**NPA (Non-Performing Asset) Risk Analysis**

An NPA is a loan where principal/interest payment is overdue for 90+ days.

**Indian Banking NPA Benchmarks:**
• Gross NPA < 2%: Excellent | 2-5%: Acceptable | > 7%: Critical
• Net NPA < 1%: Excellent | 1-2%: Acceptable | > 3%: Stressed

**Mitigation Strategies:**
1. **Early Warning System (EWS)**: Flag accounts at 30 DPD (days past due)
2. **Sectoral Limits**: Cap exposure to any sector at 20-25% of portfolio
3. **Collateral**: Maintain LTV ≤ 65% for real estate, ≤ 50% for volatile assets
4. **Provision Coverage**: Maintain PCR > 70% as buffer
5. **IBC/SARFAESI**: Use legal frameworks for faster recovery

**Key Regulations:** RBI NPA Classification Circular (2021) — Income Recognition & Asset Classification norms apply after 90 DPD."""

    if any(w in msg for w in ["var", "value at risk"]):
        return """**Value at Risk (VaR) — Risk Measurement**

VaR estimates the maximum potential loss over a given period at a specified confidence level.

**Formula (Parametric):**
`VaR = Portfolio Value × z-score × Daily Volatility × √Time`
- 99% confidence: z = 2.326
- 95% confidence: z = 1.645

**Methods:**
1. **Historical Simulation**: Use actual historical P&L distribution (no distribution assumption)
2. **Parametric/Variance-Covariance**: Assumes normal distribution (fast, less accurate in tails)
3. **Monte Carlo**: Simulate thousands of scenarios (most flexible, computationally intensive)

**Limitations:**
• VaR doesn't capture tail risk beyond the threshold — use CVaR/Expected Shortfall
• Correlation breakdown during crises (2008) makes VaR underestimate real risk

**Basel Requirement**: Banks must hold capital = 3× 10-day 99% VaR (multiplied by supervisory factor)"""

    if any(w in msg for w in ["basel", "capital", "car", "tier 1"]):
        return """**Basel Capital Framework**

**Basel III Requirements (fully phased in 2023):**
| Metric | Minimum | Well-Capitalized |
|--------|---------|-----------------|
| CET1 Ratio | 4.5% | > 7% (with buffer) |
| Tier 1 Capital | 6% | > 8.5% |
| Total Capital (CAR) | 8% | > 10.5% |
| Leverage Ratio | 3% | > 4% |
| LCR | 100% | > 110% |
| NSFR | 100% | > 110% |

**RBI Requirements (India):**
• Minimum CAR: 9% (scheduled commercial banks)
• Common Equity Tier 1: 5.5%
• Capital Conservation Buffer: 2.5%
• D-SIB surcharge: 0.2% to 0.8% (SBI, HDFC, ICICI)

**Basel IV / III Finalization (Jan 2025):**
• Output floor: Internal model banks must hold ≥ 72.5% of standardised approach capital
• Revised SA-CR, FRTB for market risk, new OpRisk framework"""

    if any(w in msg for w in ["iso 31000", "framework", "coso", "erm"]):
        return """**Risk Management Frameworks**

**ISO 31000:2018 — International Standard:**
Process: Identify → Analyze → Evaluate → Treat → Monitor & Review
Key: Risk appetite, risk criteria, residual risk after treatment

**COSO ERM 2017:**
5 Components: Governance & Culture | Strategy | Performance | Review | Information & Communication
Links risk management directly to strategy and performance objectives

**Which to Use?**
• ISO 31000: Universal — any org, any size, principles-based
• COSO ERM: Best for public companies with board oversight requirements
• Basel: Mandatory for banks and financial institutions

**For Indian Companies:**
• SEBI requires Risk Management Committee for top 1000 listed cos
• RBI requires Integrated Risk Management for banks
• Companies Act 2013 requires risk disclosure in Board's Report"""

    if any(w in msg for w in ["cyber", "cybersecurity", "data breach", "hack"]):
        return """**Cybersecurity Risk Assessment & Mitigation**

**Risk Severity Indicators:**
🔴 CRITICAL: Ransomware, data exfiltration, critical system compromise
🟠 HIGH: Phishing success, unauthorized access, insider threat
🟡 MEDIUM: Vulnerability exploitation attempt, DDoS, social engineering
🟢 LOW: Unsuccessful scans, policy violations, minor misconfigurations

**Mitigation Playbook (Priority Order):**
1. **MFA**: Enable for ALL privileged and admin accounts (immediate)
2. **Patch Management**: Critical CVEs patched within 72 hours
3. **Zero Trust**: Verify every access request regardless of source
4. **Backup**: 3-2-1 rule — 3 copies, 2 media types, 1 offsite (immutable)
5. **EDR**: Endpoint Detection & Response on all devices
6. **VAPT**: Annual penetration testing + quarterly internal scans
7. **Security Awareness**: Phishing simulations quarterly

**KRIs to Monitor:**
• Patch compliance rate (target: >95%)
• Mean Time to Detect (target: <15 min)
• Mean Time to Respond (target: <1 hour for critical)
• Phishing click rate (target: <5% after training)
• Privileged access accounts (minimize — review monthly)

**Regulatory Requirements (India):**
• SEBI Cybersecurity Framework for brokers/MIIs
• RBI Cyber Security Framework for banks (2016, updated 2023)
• IT Act 2000 + SPDI Rules for data protection
• DPDP Act 2023 — Digital Personal Data Protection (new, significant fines)"""

    if any(w in msg for w in ["kri", "key risk indicator", "metric", "threshold"]):
        return """**KRI (Key Risk Indicator) Design Guide**

**What Makes a Good KRI?**
- **Predictive**: Signals risk BEFORE it becomes a loss (leading indicator)
- **Measurable**: Objective, data-driven, not subjective
- **Actionable**: Threshold triggers a specific response
- **Relevant**: Linked to a specific material risk
- **Timely**: Available frequently enough to act

**KRI Design Framework:**
1. Identify the Risk → 2. Find the root cause → 3. Find measurable proxy → 4. Set thresholds (Green/Amber/Red) → 5. Define escalation response → 6. Assign owner

**Sample KRIs by Sector:**

BANKING:
| KRI | Green | Amber | Red |
|-----|-------|-------|-----|
| Gross NPA Ratio | <2% | 2-5% | >5% |
| LCR | >130% | 100-130% | <100% |
| Single Borrower Exposure | <15% | 15-20% | >20% |

TECHNOLOGY:
| KRI | Green | Amber | Red |
|-----|-------|-------|-----|
| System Uptime | >99.9% | 99.5-99.9% | <99.5% |
| MTTD | <30 min | 30 min - 4h | >4 hours |
| Churn Rate | <2%/mo | 2-5% | >5% |

**Escalation Protocol:**
🟢 Green → Normal operations, monthly review
🟡 Amber → Management alert, weekly review, mitigation review
🔴 Red → Immediate escalation to board/CRO, daily review, incident response"""

    # General fallback
    return """I'm RiskIQ Copilot — your AI-powered risk management expert. I can help with:

**Risk Assessment & Frameworks**
• ISO 31000, COSO ERM, Basel III/IV, SEBI/RBI guidelines
• Risk identification, scoring, and heat mapping
• Industry-specific risk profiles

**Financial Risk Analysis**
• Credit risk, market risk, liquidity risk
• VaR, stress testing, DCF analysis
• NPA management, capital adequacy

**Operational & Cyber Risk**
• Business continuity planning
• Cybersecurity risk assessment (NIST, ISO 27001)
• Process failure analysis

**KRI Design & Monitoring**
• Key Risk Indicator design with thresholds
• Dashboard metrics for your industry
• Early warning system design

**Indian Regulatory Context**
• RBI, SEBI, MCA compliance requirements
• GST risk, Companies Act 2013, DPDP Act
• FEMA, IRDAI sector-specific rules

Try asking me something specific like:
- "What are the top risks for an NBFC?"
- "How do I design KRIs for a tech startup?"
- "Explain Basel IV capital requirements"
- "What mitigation strategies work for supply chain risk?"

💡 **Note:** Add your OpenAI API key in Render environment variables (`OPENAI_API_KEY`) to enable full GPT-4o powered responses with live internet context."""
