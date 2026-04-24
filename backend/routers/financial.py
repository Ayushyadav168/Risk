from fastapi import APIRouter, Depends
from auth_utils import get_current_user
import models
import schemas

router = APIRouter(prefix="/api/financial", tags=["financial"])


def _npv(cash_flows: list, discount_rate: float) -> float:
    npv = 0.0
    for t, cf in enumerate(cash_flows, start=1):
        npv += cf / ((1 + discount_rate) ** t)
    return round(npv, 2)


def _irr_approx(cash_flows: list, initial_investment: float) -> float:
    """Simple IRR approximation using bisection."""
    try:
        low, high = 0.001, 5.0
        for _ in range(100):
            mid = (low + high) / 2
            npv_mid = -initial_investment + sum(cf / ((1 + mid) ** (t + 1)) for t, cf in enumerate(cash_flows))
            if abs(npv_mid) < 0.01:
                return round(mid * 100, 2)
            if npv_mid > 0:
                low = mid
            else:
                high = mid
        return round(mid * 100, 2)
    except Exception:
        return 0.0


@router.post("/dcf")
def dcf_analysis(
    data: schemas.DCFRequest,
    current_user: models.User = Depends(get_current_user),
):
    cash_flows = data.cash_flows
    r = data.discount_rate / 100
    g = data.terminal_growth_rate / 100

    npv = _npv(cash_flows, r)
    terminal_value = (data.terminal_cash_flow * (1 + g)) / (r - g) if r > g else 0
    terminal_pv = terminal_value / ((1 + r) ** len(cash_flows))
    total_value = round(npv + terminal_pv, 2)

    irr = _irr_approx(cash_flows[1:], abs(cash_flows[0])) if len(cash_flows) > 1 else 0

    risk_flags = []
    if r <= g:
        risk_flags.append("Discount rate must exceed growth rate for a valid terminal value.")
    if npv < 0:
        risk_flags.append("Negative NPV — investment does not generate returns at this discount rate.")
    if any(cf < 0 for cf in cash_flows[1:]):
        risk_flags.append("Negative future cash flows detected — review operating cost assumptions.")
    if irr and irr < data.discount_rate:
        risk_flags.append(f"IRR ({irr:.1f}%) is below discount rate ({data.discount_rate:.1f}%) — destroys value.")

    return {
        "npv": npv,
        "terminal_value": round(terminal_pv, 2),
        "total_value": total_value,
        "irr": irr,
        "risk_flags": risk_flags,
        "interpretation": (
            "Value-creating investment" if total_value > 0 else "Value-destroying — reconsider assumptions"
        ),
    }


@router.post("/cashflow")
def cashflow_risk(
    data: schemas.CashFlowRequest,
    current_user: models.User = Depends(get_current_user),
):
    flows = data.monthly_flows
    if not flows:
        return {"error": "No cash flows provided"}

    avg = round(sum(flows) / len(flows), 2)
    negative_months = [i for i, f in enumerate(flows) if f < 0]
    trend = "improving" if flows[-1] > flows[0] else "deteriorating" if flows[-1] < flows[0] else "stable"

    # Burn rate (if mostly negative)
    negative_flows = [f for f in flows if f < 0]
    burn_rate = round(sum(negative_flows) / len(negative_flows), 2) if negative_flows else 0

    # Simple projection (linear trend)
    if len(flows) >= 2:
        slope = (flows[-1] - flows[0]) / len(flows)
        projected = [round(flows[-1] + slope * (i + 1), 2) for i in range(data.projection_months)]
    else:
        projected = [flows[-1]] * data.projection_months

    risk_score = 0.0
    risk_flags = []

    if len(negative_months) / len(flows) > 0.3:
        risk_flags.append(f"{len(negative_months)} of {len(flows)} months had negative cash flow.")
        risk_score += 3.0
    if avg < 0:
        risk_flags.append("Average monthly cash flow is negative — immediate review required.")
        risk_score += 3.0
    if trend == "deteriorating":
        risk_flags.append("Cash flow trend is deteriorating — evaluate cost reduction measures.")
        risk_score += 2.0
    if burn_rate < -50000:
        risk_flags.append(f"High burn rate detected: ₹{abs(burn_rate):,.0f}/month average outflow.")
        risk_score += 2.0
    if projected and projected[-1] < 0:
        risk_flags.append("Projected cash flow turns negative — consider financing options.")
        risk_score += 1.5

    return {
        "average_flow": avg,
        "trend": trend,
        "burn_rate": burn_rate,
        "negative_months": len(negative_months),
        "risk_score": min(round(risk_score, 1), 10.0),
        "risk_level": "HIGH" if risk_score > 6 else "MEDIUM" if risk_score > 3 else "LOW",
        "risk_flags": risk_flags,
        "projected_flows": projected,
    }


@router.post("/loan-default")
def loan_default_probability(
    data: schemas.LoanDefaultRequest,
    current_user: models.User = Depends(get_current_user),
):
    score = 0.0
    factors = []
    recommendations = []

    # Credit score factor
    if data.credit_score >= 750:
        score += 1.0
        factors.append("Strong credit score (750+) — low default indicator.")
    elif data.credit_score >= 650:
        score += 3.0
        factors.append("Average credit score (650–750) — moderate risk.")
    else:
        score += 6.0
        factors.append(f"Weak credit score ({data.credit_score}) — high default risk.")
        recommendations.append("Require additional collateral or co-guarantor.")

    # LTV ratio
    if data.ltv_ratio <= 0.6:
        score += 1.0
    elif data.ltv_ratio <= 0.8:
        score += 2.5
        factors.append(f"LTV ratio {data.ltv_ratio:.0%} — moderate collateral cushion.")
    else:
        score += 4.0
        factors.append(f"High LTV {data.ltv_ratio:.0%} — limited collateral protection.")
        recommendations.append("Reduce LTV to below 70% or secure additional collateral.")

    # DSCR
    if data.dscr >= 1.5:
        score += 0.5
        factors.append(f"Strong DSCR {data.dscr:.2f} — borrower can comfortably service debt.")
    elif data.dscr >= 1.0:
        score += 2.0
        factors.append(f"Marginal DSCR {data.dscr:.2f} — limited debt service buffer.")
        recommendations.append("Monitor monthly repayments closely.")
    else:
        score += 5.0
        factors.append(f"DSCR below 1.0 ({data.dscr:.2f}) — borrower cannot service debt from cash flow.")
        recommendations.append("Do not disburse until DSCR improves above 1.25.")

    # Sector risk premium
    high_risk_sectors = ["hospitality", "retail", "construction", "restaurant"]
    if data.sector.lower() in high_risk_sectors:
        score += 1.5
        factors.append(f"{data.sector} sector carries elevated cyclical risk.")

    probability = min(round(score / 12.0 * 100, 1), 99.0)
    level = "HIGH" if probability > 60 else "MEDIUM" if probability > 30 else "LOW"

    if not recommendations:
        recommendations.append("Maintain standard monitoring with quarterly reviews.")

    return {
        "default_probability": probability,
        "risk_level": level,
        "risk_score": round(score, 1),
        "key_factors": factors,
        "recommendations": recommendations,
    }
