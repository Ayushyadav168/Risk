WEIGHTS = {"low": 1, "medium": 2, "high": 3}

RISK_LEVEL_THRESHOLDS = {
    "CRITICAL": 8.5,
    "HIGH": 6.5,
    "MEDIUM": 4.0,
    "LOW": 0,
}


def compute_risk_score(probability: str, impact: str) -> float:
    p = WEIGHTS.get(probability.lower(), 2)
    i = WEIGHTS.get(impact.lower(), 2)
    raw = (p * 0.4) + (i * 0.6)
    return round((raw / 3.0) * 10, 2)


def get_risk_level(score: float) -> str:
    if score >= RISK_LEVEL_THRESHOLDS["CRITICAL"]:
        return "CRITICAL"
    elif score >= RISK_LEVEL_THRESHOLDS["HIGH"]:
        return "HIGH"
    elif score >= RISK_LEVEL_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    return "LOW"


def compute_overall_score(scores: list[float]) -> float:
    if not scores:
        return 0.0
    # Weight higher scores more heavily (top 3 average + mean)
    sorted_scores = sorted(scores, reverse=True)
    top3_avg = sum(sorted_scores[:3]) / min(3, len(sorted_scores))
    mean = sum(scores) / len(scores)
    overall = (top3_avg * 0.6) + (mean * 0.4)
    return round(min(overall, 10.0), 2)


def build_heatmap_data(risks: list) -> list:
    """Build 5x5 heatmap grid data from risks list."""
    PROB_LABELS = ["Very Low", "Low", "Medium", "High", "Very High"]
    IMPACT_LABELS = ["Negligible", "Minor", "Moderate", "Major", "Catastrophic"]

    grid = []
    for p_idx, prob in enumerate(PROB_LABELS):
        for i_idx, imp in enumerate(IMPACT_LABELS):
            # Map to our 3-level system
            p_level = "low" if p_idx <= 1 else ("medium" if p_idx == 2 else "high")
            i_level = "low" if i_idx <= 1 else ("medium" if i_idx == 2 else "high")
            score = compute_risk_score(p_level, i_level)

            matching_risks = [
                r for r in risks
                if r.probability.lower() == p_level and r.impact.lower() == i_level
            ]

            grid.append({
                "prob_label": prob,
                "impact_label": imp,
                "prob_idx": p_idx,
                "impact_idx": i_idx,
                "score": score,
                "risk_count": len(matching_risks),
                "risks": [{"id": r.id, "title": r.title} for r in matching_risks],
            })
    return grid
