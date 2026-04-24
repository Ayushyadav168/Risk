from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class OrganizationSize(str, enum.Enum):
    small = "small"
    medium = "medium"
    large = "large"
    enterprise = "enterprise"

class RiskCategory(str, enum.Enum):
    financial = "financial"
    operational = "operational"
    market = "market"
    credit = "credit"
    legal = "legal"
    technology = "technology"
    reputational = "reputational"
    strategic = "strategic"

class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class RiskStatus(str, enum.Enum):
    open = "open"
    mitigated = "mitigated"
    accepted = "accepted"
    closed = "closed"

class AssessmentStatus(str, enum.Enum):
    draft = "draft"
    in_progress = "in_progress"
    completed = "completed"
    archived = "archived"

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    industry = Column(String(100))
    size = Column(String(50))
    location = Column(String(255))
    # Plan: free | pro | enterprise
    plan = Column(String(20), default="free")
    plan_expires_at = Column(DateTime(timezone=True), nullable=True)
    assessment_count_month = Column(Integer, default=0)
    assessment_month_reset = Column(DateTime(timezone=True), nullable=True)
    onboarding_completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    users = relationship("User", back_populates="organization")
    assessments = relationship("Assessment", back_populates="organization")
    subscriptions = relationship("Subscription", back_populates="organization")
    team_members = relationship("TeamMember", back_populates="organization")
    audit_logs = relationship("AuditLog", back_populates="organization")
    webhooks = relationship("Webhook", back_populates="organization")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(50), default="analyst")
    is_active = Column(Boolean, default=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    api_key = Column(String(64), unique=True, nullable=True, index=True)
    onboarding_step = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    organization = relationship("Organization", back_populates="users")
    assessments = relationship("Assessment", back_populates="created_by")
    audit_logs = relationship("AuditLog", back_populates="user")

class Assessment(Base):
    __tablename__ = "assessments"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    industry = Column(String(100))
    organization_size = Column(String(50))
    annual_revenue = Column(Float)
    location = Column(String(255))
    risk_categories = Column(Text)  # JSON string
    status = Column(String(50), default="draft")
    ai_analysis = Column(Text)
    overall_score = Column(Float, default=0.0)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    organization = relationship("Organization", back_populates="assessments")
    created_by = relationship("User", back_populates="assessments")
    risks = relationship("Risk", back_populates="assessment", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="assessment")

class Risk(Base):
    __tablename__ = "risks"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(50))
    probability = Column(String(20))
    impact = Column(String(20))
    score = Column(Float, default=0.0)
    severity = Column(String(20))
    status = Column(String(50), default="open")
    owner = Column(String(255))
    due_date = Column(DateTime(timezone=True))
    assessment_id = Column(Integer, ForeignKey("assessments.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    assessment = relationship("Assessment", back_populates="risks")
    mitigations = relationship("Mitigation", back_populates="risk", cascade="all, delete-orphan")

class Mitigation(Base):
    __tablename__ = "mitigations"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    action_type = Column(String(50))
    priority = Column(String(20))
    estimated_cost = Column(Float)
    expected_reduction = Column(Float)
    status = Column(String(50), default="planned")
    assigned_to = Column(String(255))
    due_date = Column(DateTime(timezone=True))
    risk_id = Column(Integer, ForeignKey("risks.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    risk = relationship("Risk", back_populates="mitigations")

class Template(Base):
    __tablename__ = "templates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    industry = Column(String(100))
    risk_categories = Column(Text)
    default_risks = Column(Text)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FinancialAnalysis(Base):
    __tablename__ = "financial_analyses"
    id = Column(Integer, primary_key=True, index=True)
    analysis_type = Column(String(50))
    input_data = Column(Text)
    result_data = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    report_type = Column(String(50))
    file_path = Column(String(500))
    status = Column(String(50), default="generating")
    assessment_id = Column(Integer, ForeignKey("assessments.id"))
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    assessment = relationship("Assessment", back_populates="reports")

# ── Phase 4: Subscriptions / Razorpay ────────────────────────────────────────
class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    plan = Column(String(20), nullable=False)           # free | pro | enterprise
    status = Column(String(20), default="active")       # active | cancelled | expired
    razorpay_order_id = Column(String(100), nullable=True)
    razorpay_payment_id = Column(String(100), nullable=True)
    razorpay_subscription_id = Column(String(100), nullable=True)
    amount = Column(Float, default=0.0)                 # in INR (paise/100)
    currency = Column(String(10), default="INR")
    billing_cycle = Column(String(20), default="monthly")  # monthly | yearly
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    organization = relationship("Organization", back_populates="subscriptions")

# ── Phase 5: Team Members ────────────────────────────────────────────────────
class TeamMember(Base):
    __tablename__ = "team_members"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    email = Column(String(255), nullable=False)
    role = Column(String(20), default="member")         # owner | admin | member | viewer
    status = Column(String(20), default="pending")      # pending | active | removed
    invite_token = Column(String(64), nullable=True)
    invited_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    joined_at = Column(DateTime(timezone=True), nullable=True)
    organization = relationship("Organization", back_populates="team_members")

# ── Phase 5: Audit Log ───────────────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)        # e.g. risk.created, assessment.deleted
    entity_type = Column(String(50))                    # risk | assessment | report | user
    entity_id = Column(Integer, nullable=True)
    entity_name = Column(String(255), nullable=True)
    details = Column(Text, nullable=True)               # JSON
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    organization = relationship("Organization", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")

# ── Phase 5: Webhooks ────────────────────────────────────────────────────────
class Webhook(Base):
    __tablename__ = "webhooks"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    name = Column(String(100), nullable=False)
    url = Column(String(500), nullable=False)
    platform = Column(String(30), default="custom")     # slack | teams | custom
    events = Column(Text, nullable=False)               # JSON array of event types
    secret = Column(String(64), nullable=True)
    is_active = Column(Boolean, default=True)
    last_triggered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    organization = relationship("Organization", back_populates="webhooks")

# ── News Articles ─────────────────────────────────────────────────────────────
class NewsArticle(Base):
    __tablename__ = "news_articles"
    id = Column(Integer, primary_key=True, index=True)
    guid = Column(String(512), unique=True, nullable=False, index=True)  # dedup key
    title = Column(String(512), nullable=False)
    summary = Column(Text, nullable=True)
    url = Column(String(1024), nullable=False)
    image_url = Column(String(1024), nullable=True)
    source = Column(String(100), nullable=False)
    source_url = Column(String(255), nullable=True)
    category = Column(String(50), default="business")  # finance|markets|risk|business|economy
    tags = Column(Text, nullable=True)                  # JSON list
    published_at = Column(DateTime(timezone=True), nullable=True)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())
    is_featured = Column(Boolean, default=False)

# ── News Source Config ────────────────────────────────────────────────────────
class NewsSource(Base):
    __tablename__ = "news_sources"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    rss_url = Column(String(512), nullable=False)
    category = Column(String(50), default="business")
    is_active = Column(Boolean, default=True)
    last_fetched_at = Column(DateTime(timezone=True), nullable=True)
    article_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# ── Company Intelligence ─────────────────────────────────────────────────────
class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    name = Column(String(255), nullable=False)
    ticker = Column(String(20), nullable=True)       # NSE/BSE ticker e.g. RELIANCE
    exchange = Column(String(10), nullable=True)     # NSE | BSE
    is_listed = Column(Boolean, default=False)
    industry = Column(String(100), nullable=True)
    sector = Column(String(100), nullable=True)
    website = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    # Key Metrics
    market_cap = Column(Float, nullable=True)        # in Cr (INR)
    current_price = Column(Float, nullable=True)
    revenue = Column(Float, nullable=True)           # in Cr
    net_profit = Column(Float, nullable=True)        # in Cr
    total_assets = Column(Float, nullable=True)
    total_liabilities = Column(Float, nullable=True)
    equity = Column(Float, nullable=True)
    # Ratios
    pe_ratio = Column(Float, nullable=True)
    pb_ratio = Column(Float, nullable=True)
    roe = Column(Float, nullable=True)
    roce = Column(Float, nullable=True)
    debt_to_equity = Column(Float, nullable=True)
    current_ratio = Column(Float, nullable=True)
    dividend_yield = Column(Float, nullable=True)
    eps = Column(Float, nullable=True)
    face_value = Column(Float, nullable=True)
    # Detailed Financial Data (JSON strings)
    balance_sheet = Column(Text, nullable=True)      # JSON: {years:[], assets:[], liabilities:[], equity:[]}
    income_statement = Column(Text, nullable=True)   # JSON: {years:[], revenue:[], profit:[], ebitda:[]}
    cash_flow_data = Column(Text, nullable=True)     # JSON
    quarterly_results = Column(Text, nullable=True)  # JSON
    # SWOT / Analysis
    strengths = Column(Text, nullable=True)          # JSON list of strings
    weaknesses = Column(Text, nullable=True)
    opportunities = Column(Text, nullable=True)
    threats = Column(Text, nullable=True)
    ai_analysis = Column(Text, nullable=True)
    risk_score = Column(Float, nullable=True)        # 1-10
    growth_score = Column(Float, nullable=True)      # 1-10
    # Source tracking
    data_source = Column(String(50), nullable=True)  # screener | tickertape | manual
    last_fetched_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    opinions = relationship("ExpertOpinion", back_populates="company", cascade="all, delete-orphan")

# ── Industry Experts ─────────────────────────────────────────────────────────
class Expert(Base):
    __tablename__ = "experts"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)  # null = global/system
    name = Column(String(255), nullable=False)
    title = Column(String(255), nullable=True)       # "CRO at HDFC Bank"
    industry = Column(String(100), nullable=True)    # primary industry
    industries = Column(Text, nullable=True)         # JSON list of industries
    expertise_areas = Column(Text, nullable=True)    # JSON list e.g. ["credit risk","fintech"]
    bio = Column(Text, nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    twitter_url = Column(String(500), nullable=True)
    avatar_initials = Column(String(5), nullable=True)
    avatar_color = Column(String(20), nullable=True) # hex color
    years_experience = Column(Integer, nullable=True)
    is_verified = Column(Boolean, default=False)
    is_global = Column(Boolean, default=True)        # system experts vs user-added
    added_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    opinions = relationship("ExpertOpinion", back_populates="expert", cascade="all, delete-orphan")

class ExpertOpinion(Base):
    __tablename__ = "expert_opinions"
    id = Column(Integer, primary_key=True, index=True)
    expert_id = Column(Integer, ForeignKey("experts.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    industry = Column(String(100), nullable=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    sentiment = Column(String(20), default="neutral") # bullish | bearish | neutral | cautious
    tags = Column(Text, nullable=True)               # JSON list
    source_url = Column(String(500), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expert = relationship("Expert", back_populates="opinions")
    company = relationship("Company", back_populates="opinions")

# ── NSE Listed Companies (Indian Market) ──────────────────────────────────────
class NSEListing(Base):
    __tablename__ = "nse_listings"
    id             = Column(Integer, primary_key=True, index=True)
    symbol         = Column(String(50), unique=True, index=True, nullable=False)
    name           = Column(String(400), index=True, nullable=False)
    series         = Column(String(10), nullable=True)
    isin           = Column(String(25), nullable=True)
    face_value     = Column(Float, nullable=True)
    date_of_listing= Column(String(30), nullable=True)
    # Quick metrics (cached from Screener.in)
    industry       = Column(String(200), nullable=True)
    sector         = Column(String(200), nullable=True)
    bse_code       = Column(String(20), nullable=True)
    market_cap     = Column(Float, nullable=True)   # ₹ Crores
    current_price  = Column(Float, nullable=True)   # ₹
    high_52w       = Column(Float, nullable=True)
    low_52w        = Column(Float, nullable=True)
    pe_ratio       = Column(Float, nullable=True)
    pb_ratio       = Column(Float, nullable=True)
    roce           = Column(Float, nullable=True)
    roe            = Column(Float, nullable=True)
    debt_equity    = Column(Float, nullable=True)
    div_yield      = Column(Float, nullable=True)
    revenue        = Column(Float, nullable=True)   # ₹ Crores TTM
    net_profit     = Column(Float, nullable=True)   # ₹ Crores TTM
    eps            = Column(Float, nullable=True)
    book_value     = Column(Float, nullable=True)
    promoter_holding = Column(Float, nullable=True) # %
    pros           = Column(Text, nullable=True)    # JSON list
    cons           = Column(Text, nullable=True)    # JSON list
    # Full scraped tables (JSON)
    income_statement_json  = Column(Text, nullable=True)
    balance_sheet_json     = Column(Text, nullable=True)
    cash_flow_json         = Column(Text, nullable=True)
    quarterly_json         = Column(Text, nullable=True)
    ratios_json            = Column(Text, nullable=True)
    # Concall cache
    concall_json   = Column(Text, nullable=True)
    concall_fetched_at = Column(DateTime, nullable=True)
    # Annual reports (JSON list of {label, url})
    annual_reports_json = Column(Text, nullable=True)
    # Metadata
    fetched_at     = Column(DateTime, nullable=True)   # when Screener was scraped
    synced_at      = Column(DateTime, server_default=func.now())
