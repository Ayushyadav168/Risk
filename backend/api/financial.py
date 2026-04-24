from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional, List
from database import get_db
import models, schemas
from auth import get_current_user
import math

router = APIRouter()

# ── IRR via Newton-Raphson ────────────────────────────────────────────────────
def calculate_irr(cash_flows: list, max_iterations: int = 1000) -> Optional[float]:
    try:
        rate = 0.1
        for _ in range(max_iterations):
            npv = sum(cf / (1 + rate) ** i for i, cf in enumerate(cash_flows))
            dnpv = sum(-i * cf / (1 + rate) ** (i + 1) for i, cf in enumerate(cash_flows))
            if abs(dnpv) < 1e-10:
                break
            rate = rate - npv / dnpv
            if rate <= -1:
                return None
        return round(rate * 100, 2) if -1 < rate < 10 else None
    except Exception:
        return None

# ── DCF ───────────────────────────────────────────────────────────────────────
@router.post("/dcf", response_model=schemas.DCFResponse)
def calculate_dcf(request: schemas.DCFRequest, current_user: models.User = Depends(get_current_user)):
    cash_flows = request.cash_flows
    r = request.discount_rate / 100
    g = request.terminal_growth_rate / 100
    initial_investment = request.initial_investment or 0.0

    # PV of each year's cash flow
    yearly_data = []
    pv_flows = 0.0
    for i, cf in enumerate(cash_flows):
        discounted = cf / (1 + r) ** (i + 1)
        pv_flows += discounted
        yearly_data.append({
            "year": f"Year {i + 1}",
            "cash_flow": round(cf, 2),
            "discounted": round(discounted, 2),
        })

    # Terminal value (Gordon Growth Model)
    last_cf = cash_flows[-1] if cash_flows else 0
    terminal_cf_input = request.terminal_cash_flow or last_cf
    if r > g:
        terminal_value = terminal_cf_input * (1 + g) / (r - g)
    else:
        terminal_value = terminal_cf_input * 20  # fallback cap
    pv_terminal = terminal_value / (1 + r) ** len(cash_flows)

    npv = round(pv_flows + pv_terminal - initial_investment, 2)

    # IRR — use initial investment as negative flow[0]
    irr_flows = [-initial_investment] + cash_flows if initial_investment > 0 else [-(sum(cash_flows) * 0.5)] + cash_flows
    irr = calculate_irr(irr_flows)

    # Payback period
    payback_period = None
    cumulative = -initial_investment if initial_investment > 0 else -sum(cash_flows) * 0.5
    for i, cf in enumerate(cash_flows):
        cumulative += cf
        if cumulative >= 0:
            payback_period = round(i + 1 - (cumulative - cf) / cf, 1) if cf != 0 else i + 1
            break

    # Risk flags
    risk_flags = []
    negative_years = [i + 1 for i, cf in enumerate(cash_flows) if cf < 0]
    if negative_years:
        risk_flags.append({"severity": "medium", "message": f"Negative cash flow in year(s): {', '.join(map(str, negative_years))}"})
    if npv < 0:
        risk_flags.append({"severity": "high", "message": f"Negative NPV (${npv:,.0f}) — project destroys value at this discount rate"})
    if r - g < 0.02:
        risk_flags.append({"severity": "medium", "message": "Terminal growth rate nearly equals discount rate — terminal value is highly sensitive"})
    if len(cash_flows) > 1:
        volatility = (max(cash_flows) - min(cash_flows)) / (abs(sum(cash_flows) / len(cash_flows)) + 1)
        if volatility > 1.5:
            risk_flags.append({"severity": "low", "message": "High cash flow volatility — consider scenario/sensitivity analysis"})

    recommendation = None
    if npv > 0 and irr and irr > request.discount_rate:
        recommendation = f"Project appears value-accretive. NPV of ${npv:,.0f} exceeds initial investment with IRR {irr:.1f}% > WACC {request.discount_rate}%."
    elif npv < 0:
        recommendation = f"Project destroys value at the current discount rate. Consider renegotiating terms or increasing projected cash flows before proceeding."
    else:
        recommendation = f"Project is marginal. Review assumptions and consider stress-testing at higher discount rates."

    return schemas.DCFResponse(
        npv=npv,
        irr=irr,
        terminal_value=round(pv_terminal, 2),
        payback_period=payback_period,
        yearly_data=yearly_data,
        risk_flags=risk_flags,
        recommendation=recommendation,
    )

# ── Cash Flow Risk ────────────────────────────────────────────────────────────
@router.post("/cashflow", response_model=schemas.CashFlowResponse)
def analyze_cashflow(request: schemas.CashFlowRequest, current_user: models.User = Depends(get_current_user)):
    # Support both new and legacy input
    if request.monthly_revenues and request.monthly_expenses:
        n = min(len(request.monthly_revenues), len(request.monthly_expenses))
        revenues = request.monthly_revenues[:n]
        expenses = request.monthly_expenses[:n]
        net_flows = [revenues[i] - expenses[i] for i in range(n)]
        monthly_data = [
            {"revenue": round(revenues[i], 2), "expenses": round(expenses[i], 2), "net": round(net_flows[i], 2)}
            for i in range(n)
        ]
    elif request.monthly_flows:
        net_flows = request.monthly_flows
        monthly_data = [{"revenue": f, "expenses": 0, "net": f} for f in net_flows]
    else:
        net_flows = []
        monthly_data = []

    if not net_flows:
        return schemas.CashFlowResponse(
            avg_monthly_net=0, lowest_month=0, burn_rate=None,
            risk_score=5.0, monthly_data=[], risk_flags=[],
            average_flow=0, trend="insufficient_data", projected_flows=[]
        )

    avg_net = sum(net_flows) / len(net_flows)
    lowest_month = min(net_flows)

    # Burn rate: months until cash runs out (if avg_net < 0)
    cash_balance = request.current_cash_balance or 0
    credit = request.credit_line or 0
    total_buffer = cash_balance + credit
    if avg_net < 0 and total_buffer > 0:
        burn_rate = round(total_buffer / abs(avg_net), 1)
    else:
        burn_rate = None

    # Risk score (0–100)
    negative_months = len([f for f in net_flows if f < 0])
    neg_ratio = negative_months / len(net_flows)
    volatility_range = max(net_flows) - min(net_flows)
    avg_abs = abs(avg_net) + 1
    volatility_score = min(1.0, volatility_range / avg_abs / 3)
    risk_score = round((neg_ratio * 60 + volatility_score * 40), 1)

    # Trend
    half = len(net_flows) // 2
    first_avg = sum(net_flows[:half]) / half if half else avg_net
    second_avg = sum(net_flows[half:]) / (len(net_flows) - half) if half else avg_net
    if second_avg > first_avg * 1.05:
        trend = "improving"
    elif second_avg < first_avg * 0.95:
        trend = "deteriorating"
    else:
        trend = "stable"

    # Risk flags
    risk_flags = []
    if negative_months > 0:
        risk_flags.append({"severity": "high", "message": f"{negative_months} month(s) with negative net cash flow"})
    if trend == "deteriorating":
        risk_flags.append({"severity": "high", "message": "Cash flow trend is deteriorating — review cost structure"})
    if burn_rate and burn_rate < 3:
        risk_flags.append({"severity": "critical", "message": f"Only {burn_rate} months of runway — immediate action required"})
    elif burn_rate and burn_rate < 6:
        risk_flags.append({"severity": "medium", "message": f"{burn_rate} months of runway — consider raising capital or cutting costs"})
    if volatility_score > 0.6:
        risk_flags.append({"severity": "medium", "message": "High cash flow volatility — consider revenue smoothing strategies"})

    return schemas.CashFlowResponse(
        avg_monthly_net=round(avg_net, 2),
        lowest_month=round(lowest_month, 2),
        burn_rate=burn_rate,
        risk_score=risk_score,
        monthly_data=monthly_data,
        risk_flags=risk_flags,
        average_flow=round(avg_net, 2),
        trend=trend,
        projected_flows=[],
    )

# ── Loan Default Probability ──────────────────────────────────────────────────
@router.post("/loan-default", response_model=schemas.LoanDefaultResponse)
def assess_loan_default(request: schemas.LoanDefaultRequest, current_user: models.User = Depends(get_current_user)):
    score = request.credit_score
    # Support both naming conventions
    ltv = request.loan_to_value or request.ltv_ratio or 0.75
    dscr = request.debt_service_coverage or request.dscr or 1.2
    sector = (request.industry or request.sector or "other").lower()
    loan_amount = request.loan_amount or 500000

    # ── Credit score base probability ──────────────────────────────────────────
    if score >= 780:
        base_prob = 0.015
    elif score >= 740:
        base_prob = 0.025
    elif score >= 700:
        base_prob = 0.05
    elif score >= 660:
        base_prob = 0.09
    elif score >= 620:
        base_prob = 0.16
    elif score >= 580:
        base_prob = 0.26
    elif score >= 540:
        base_prob = 0.38
    else:
        base_prob = 0.52

    # ── LTV adjustment ─────────────────────────────────────────────────────────
    if ltv >= 95:
        ltv_factor = 1.8
    elif ltv >= 90:
        ltv_factor = 1.5
    elif ltv >= 80:
        ltv_factor = 1.25
    elif ltv >= 70:
        ltv_factor = 1.05
    else:
        ltv_factor = 0.9

    # ── DSCR adjustment ────────────────────────────────────────────────────────
    if dscr < 0.9:
        dscr_factor = 2.5
    elif dscr < 1.0:
        dscr_factor = 2.0
    elif dscr < 1.1:
        dscr_factor = 1.6
    elif dscr < 1.2:
        dscr_factor = 1.3
    elif dscr < 1.5:
        dscr_factor = 1.05
    elif dscr >= 2.0:
        dscr_factor = 0.75
    else:
        dscr_factor = 0.9

    # ── Sector risk ────────────────────────────────────────────────────────────
    sector_mult = {
        "retail": 1.3, "hospitality": 1.45, "real_estate": 1.2, "agriculture": 1.25,
        "technology": 0.85, "healthcare": 0.80, "finance": 0.95,
        "manufacturing": 1.10, "logistics": 1.15, "ecommerce": 1.2,
    }.get(sector, 1.1)

    final_prob = min(0.98, base_prob * ltv_factor * dscr_factor * sector_mult)
    final_prob_pct = round(final_prob * 100, 1)

    # ── Risk band & grade ──────────────────────────────────────────────────────
    if final_prob_pct >= 35:
        risk_band, risk_grade = "Critical Risk", "D"
    elif final_prob_pct >= 20:
        risk_band, risk_grade = "High Risk", "C"
    elif final_prob_pct >= 10:
        risk_band, risk_grade = "Moderate Risk", "B-"
    elif final_prob_pct >= 5:
        risk_band, risk_grade = "Acceptable Risk", "B"
    elif final_prob_pct >= 2:
        risk_band, risk_grade = "Low Risk", "A-"
    else:
        risk_band, risk_grade = "Very Low Risk", "A"

    # ── Expected loss ─────────────────────────────────────────────────────────
    lgd = min(1.0, ltv / 100 * 0.6)  # Loss Given Default
    expected_loss = round(loan_amount * final_prob * lgd, 2)

    # ── Recommended rate ──────────────────────────────────────────────────────
    base_rate = 6.5  # Risk-free proxy
    credit_spread = final_prob_pct * 0.3
    recommended_rate = round(base_rate + credit_spread, 2)

    # ── Factor scores (0-100, higher = riskier) ───────────────────────────────
    credit_score_risk = max(0, round((850 - score) / 5.5, 0))
    ltv_risk = round(min(100, (ltv - 50) * 2), 0) if ltv > 50 else 0
    dscr_risk = round(max(0, min(100, (1.5 - dscr) / 1.5 * 100)), 0)
    sector_risk = round((sector_mult - 0.8) / 0.7 * 100, 0)

    factor_scores = [
        {"factor": "Credit Score", "score": credit_score_risk},
        {"factor": "Loan-to-Value Ratio", "score": max(0, ltv_risk)},
        {"factor": "Debt Service Coverage", "score": max(0, dscr_risk)},
        {"factor": "Industry / Sector Risk", "score": max(0, min(100, sector_risk))},
    ]

    # ── Risk flags ────────────────────────────────────────────────────────────
    risk_flags = []
    if score < 620:
        risk_flags.append({"severity": "high", "message": f"Credit score {score} is below acceptable threshold (620)"})
    if ltv >= 80:
        risk_flags.append({"severity": "medium", "message": f"LTV of {ltv}% exceeds 80% — limited collateral buffer"})
    if dscr < 1.2:
        risk_flags.append({"severity": "high", "message": f"DSCR of {dscr:.2f} is below minimum 1.2x — cash flow coverage is insufficient"})
    if sector_mult > 1.2:
        risk_flags.append({"severity": "medium", "message": f"'{sector}' sector carries above-average default risk historically"})
    if not risk_flags:
        risk_flags.append({"severity": "low", "message": "Risk profile is within acceptable parameters for standard lending"})

    return schemas.LoanDefaultResponse(
        default_probability=final_prob_pct,
        risk_band=risk_band,
        risk_grade=risk_grade,
        expected_loss=expected_loss,
        recommended_rate=recommended_rate,
        factor_scores=factor_scores,
        risk_flags=risk_flags,
        risk_level=risk_band,
        key_factors=[f["message"] for f in risk_flags],
        recommendations=[
            "Request additional collateral or personal guarantees" if score < 700 else "Standard monitoring is appropriate",
            "Consider mortgage insurance given LTV" if ltv >= 80 else "LTV coverage is adequate",
            f"Price risk premium of {credit_spread:.1f}% into interest rate",
        ],
    )
