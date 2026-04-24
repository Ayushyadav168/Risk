from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime

# Auth schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    organization_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str
    organization_id: Optional[int]
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Organization
class OrganizationResponse(BaseModel):
    id: int
    name: str
    industry: Optional[str]
    size: Optional[str]
    location: Optional[str]
    class Config:
        from_attributes = True

# Assessment schemas
class AssessmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    industry: Optional[str] = None
    organization_size: Optional[str] = None
    annual_revenue: Optional[float] = None
    location: Optional[str] = None
    risk_categories: Optional[List[str]] = []

class AssessmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    ai_analysis: Optional[str] = None
    overall_score: Optional[float] = None

class AssessmentResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    industry: Optional[str]
    organization_size: Optional[str]
    annual_revenue: Optional[float]
    location: Optional[str]
    risk_categories: Optional[str]
    status: str
    ai_analysis: Optional[str]
    overall_score: float
    created_at: datetime
    updated_at: Optional[datetime]
    class Config:
        from_attributes = True

# Risk schemas
class RiskCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    probability: str
    impact: str
    owner: Optional[str] = None
    assessment_id: int

class RiskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    probability: Optional[str] = None
    impact: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None

class MitigationResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    action_type: Optional[str]
    priority: Optional[str]
    estimated_cost: Optional[float]
    expected_reduction: Optional[float]
    status: str
    assigned_to: Optional[str]
    class Config:
        from_attributes = True

class RiskResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: str
    probability: str
    impact: str
    score: float
    severity: Optional[str]
    status: str
    owner: Optional[str]
    assessment_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    mitigations: List[MitigationResponse] = []
    class Config:
        from_attributes = True

# Mitigation
class MitigationCreate(BaseModel):
    title: str
    description: Optional[str] = None
    action_type: Optional[str] = None
    priority: Optional[str] = "medium"
    estimated_cost: Optional[float] = None
    expected_reduction: Optional[float] = None
    assigned_to: Optional[str] = None
    risk_id: Optional[int] = None

# AI Analysis
class AIAnalysisRequest(BaseModel):
    assessment_id: Optional[int] = None
    risk_id: Optional[int] = None
    risk_name: Optional[str] = None
    industry: Optional[str] = None
    organization_size: Optional[str] = None
    annual_revenue: Optional[float] = None
    location: Optional[str] = None
    risk_categories: Optional[List[str]] = []
    risks: Optional[List[dict]] = []
    category: Optional[str] = None
    probability: Optional[str] = None
    impact: Optional[str] = None
    description: Optional[str] = None
    mode: Optional[str] = None  # 'full', 'mitigations_only'

class AIAnalysisResponse(BaseModel):
    analysis: Optional[str] = None
    recommendations: Optional[List[str]] = []
    risk_summary: Optional[dict] = {}
    overall_score: Optional[float] = None
    risks: Optional[List[dict]] = []
    mitigations: Optional[List[dict]] = []
    assessment_updates: Optional[dict] = {}

# ─── Financial Tools ──────────────────────────────────────────────────────────

class DCFRequest(BaseModel):
    cash_flows: List[float]
    discount_rate: float
    terminal_growth_rate: float
    initial_investment: Optional[float] = 0.0
    # Legacy field support
    terminal_cash_flow: Optional[float] = None

class YearlyDCFData(BaseModel):
    year: str
    cash_flow: float
    discounted: float

class DCFResponse(BaseModel):
    npv: float
    irr: Optional[float]
    terminal_value: float
    payback_period: Optional[float]
    yearly_data: List[dict] = []
    risk_flags: List[Any] = []
    recommendation: Optional[str] = None

class CashFlowRequest(BaseModel):
    monthly_revenues: Optional[List[float]] = None
    monthly_expenses: Optional[List[float]] = None
    current_cash_balance: Optional[float] = 0.0
    credit_line: Optional[float] = 0.0
    # Legacy support
    monthly_flows: Optional[List[float]] = None
    projection_months: Optional[int] = 6

class MonthlyData(BaseModel):
    revenue: float
    expenses: float
    net: float

class CashFlowResponse(BaseModel):
    avg_monthly_net: float
    lowest_month: float
    burn_rate: Optional[float]
    risk_score: float
    monthly_data: List[dict] = []
    risk_flags: List[Any] = []
    # Legacy fields
    average_flow: Optional[float] = None
    trend: Optional[str] = None
    projected_flows: Optional[List[float]] = []

class LoanDefaultRequest(BaseModel):
    credit_score: int
    loan_to_value: Optional[float] = None
    debt_service_coverage: Optional[float] = None
    loan_amount: Optional[float] = None
    loan_term: Optional[int] = None
    industry: Optional[str] = None
    collateral_type: Optional[str] = None
    # Legacy fields
    ltv_ratio: Optional[float] = None
    dscr: Optional[float] = None
    sector: Optional[str] = None

class LoanDefaultResponse(BaseModel):
    default_probability: float
    risk_band: Optional[str] = None
    risk_grade: Optional[str] = None
    expected_loss: Optional[float] = None
    recommended_rate: Optional[float] = None
    factor_scores: Optional[List[dict]] = []
    risk_flags: Optional[List[Any]] = []
    # Legacy fields
    risk_level: Optional[str] = None
    key_factors: Optional[List[str]] = []
    recommendations: Optional[List[str]] = []

# Report
class ReportCreate(BaseModel):
    assessment_id: int
    report_type: str
    title: Optional[str] = None

class ReportResponse(BaseModel):
    id: int
    title: Optional[str]
    report_type: str
    status: str
    assessment_id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Template
class TemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    industry: Optional[str]
    risk_categories: Optional[str]
    default_risks: Optional[str]
    class Config:
        from_attributes = True

# Dashboard
class DashboardStats(BaseModel):
    total_risks: int
    high_risk_count: int
    open_actions: int
    overall_score: float
    risk_by_category: dict
    risk_by_severity: dict
    recent_risks: List[dict]
    monthly_trend: List[dict]
