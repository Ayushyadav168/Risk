from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from database import engine, SessionLocal
import models
import os
import json
import threading
import time as _time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Create all tables
models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks AFTER the server is ready to accept connections."""
    # ── startup ──────────────────────────────────────────────────────────────
    def _startup():
        _time.sleep(2)  # Let uvicorn fully bind to port first
        try:
            seed_database()
        except Exception as e:
            print(f"[Startup] seed_database skipped: {e}")
        try:
            seed_experts()
        except Exception as e:
            print(f"[Startup] seed_experts skipped: {e}")
        try:
            from api.news import seed_sources_and_initial_fetch
            seed_sources_and_initial_fetch()
        except Exception as e:
            print(f"[Startup] news seed skipped: {e}")
        try:
            from api.market import init_nse_companies
            init_nse_companies()
        except Exception as e:
            print(f"[Startup] NSE init skipped: {e}")
        print("✅ RiskIQ startup complete")
        # Auto-refresh news every 30 min
        while True:
            _time.sleep(30 * 60)
            try:
                from api.news import refresh_all_feeds
                _db = SessionLocal()
                result = refresh_all_feeds(_db)
                _db.close()
                print(f"[AutoRefresh] +{result['total_new']} new articles")
            except Exception as _e:
                print(f"[AutoRefresh] Error: {_e}")

    threading.Thread(target=_startup, daemon=True).start()
    yield
    # ── shutdown ─────────────────────────────────────────────────────────────

app = FastAPI(title="RiskIQ Platform API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
os.makedirs("reports", exist_ok=True)
app.mount("/static/reports", StaticFiles(directory="reports"), name="reports")

# ── Routers ────────────────────────────────────────────────────────────────────
from api import auth, assessments, risks, ai_service, financial, dashboard, reports
from api import billing, team, audit, webhooks, companies, experts, news, notifications, market, admin, access_requests

app.include_router(auth.router,        prefix="/api/auth",        tags=["Authentication"])
app.include_router(assessments.router, prefix="/api/assessments", tags=["Assessments"])
app.include_router(risks.router,       prefix="/api/risks",       tags=["Risks"])
app.include_router(ai_service.router,  prefix="/api/ai",          tags=["AI Analysis"])
app.include_router(financial.router,   prefix="/api/financial",   tags=["Financial Tools"])
app.include_router(dashboard.router,   prefix="/api/dashboard",   tags=["Dashboard"])
app.include_router(reports.router,     prefix="/api/reports",     tags=["Reports"])
app.include_router(billing.router,     prefix="/api/billing",     tags=["Billing"])
app.include_router(team.router,        prefix="/api/team",        tags=["Team"])
app.include_router(audit.router,       prefix="/api/audit",       tags=["Audit Logs"])
app.include_router(webhooks.router,    prefix="/api/webhooks",    tags=["Webhooks"])
app.include_router(companies.router,   prefix="/api/companies",   tags=["Companies"])
app.include_router(experts.router,     prefix="/api/experts",     tags=["Experts"])
app.include_router(news.router,          prefix="/api/news",          tags=["News"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(market.router,        prefix="/api/market",        tags=["Indian Market"])
app.include_router(admin.router,         prefix="/api/admin",          tags=["Admin Panel"])
app.include_router(access_requests.router, prefix="/api/access",       tags=["Access Requests"])

@app.get("/api/templates")
def get_templates():
    db = SessionLocal()
    try:
        templates = db.query(models.Template).all()
        return [
            {"id": t.id, "name": t.name, "description": t.description,
             "industry": t.industry, "risk_categories": t.risk_categories, "default_risks": t.default_risks}
            for t in templates
        ]
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "RiskIQ Platform API", "version": "2.0.0", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy", "version": "2.0.0"}

# ── Database Seeding ───────────────────────────────────────────────────────────
def seed_database():
    db = SessionLocal()
    try:
        existing_user = db.query(models.User).filter(models.User.email == "demo@riskiq.com").first()
        if existing_user:
            # Ensure org has plan set
            if existing_user.organization_id:
                org = db.query(models.Organization).filter(models.Organization.id == existing_user.organization_id).first()
                if org and not org.plan:
                    org.plan = "pro"
                    org.onboarding_completed = True
                    db.commit()
            return

        from auth import hash_password

        org = models.Organization(
            name="Acme Finance Ltd",
            industry="banking",
            size="medium",
            location="New York, USA",
            plan="pro",
            onboarding_completed=True,
        )
        db.add(org)
        db.flush()

        user = models.User(
            email="demo@riskiq.com",
            hashed_password=hash_password("demo123"),
            full_name="Demo User",
            role="owner",
            organization_id=org.id,
            onboarding_step=5,
        )
        db.add(user)
        db.flush()

        assessment = models.Assessment(
            title="Q1 2024 Annual Risk Review",
            description="Comprehensive annual risk assessment for Acme Finance Ltd",
            industry="banking",
            organization_size="medium",
            annual_revenue=50000000,
            location="New York, USA",
            risk_categories=json.dumps(["financial", "operational", "market", "credit", "legal"]),
            status="completed",
            overall_score=6.8,
            ai_analysis="""## AI Risk Assessment Analysis

### Executive Summary
Based on the comprehensive review of Acme Finance Ltd's risk landscape for Q1 2024, our analysis indicates a moderate-to-high risk environment typical of mid-sized financial institutions. The overall risk score of 6.8/10 reflects material exposures requiring proactive management.

### Key Findings
Financial Risks present the most significant exposure, particularly credit concentration in the commercial real estate sector and liquidity risk arising from a rapidly changing interest rate environment.

Operational Risks are elevated due to legacy system dependencies and increasing cyber threat landscape. The recent surge in sophisticated phishing attacks targeting financial institutions requires enhanced employee awareness programs.

Market Risks are amplified by ongoing geopolitical uncertainties and potential recessionary pressures.

### Recommended Priority Actions
1. Implement enhanced credit stress testing for CRE portfolio
2. Accelerate core banking system modernization roadmap
3. Strengthen cybersecurity defenses with zero-trust architecture
4. Diversify funding sources to reduce liquidity concentration
5. Establish dedicated regulatory change management function""",
            organization_id=org.id,
            created_by_id=user.id,
        )
        db.add(assessment)
        db.flush()

        from api.risks import compute_score, get_severity

        demo_risks = [
            {"name": "Credit Concentration Risk", "category": "credit", "probability": "high", "impact": "high", "owner": "Chief Risk Officer", "description": "Over-exposure to commercial real estate sector exceeding internal limits"},
            {"name": "Interest Rate Risk", "category": "market", "probability": "high", "impact": "medium", "owner": "Treasury Manager", "description": "Net interest margin compression due to rate environment changes"},
            {"name": "Cybersecurity Breach", "category": "operational", "probability": "medium", "impact": "high", "owner": "CISO", "description": "Advanced persistent threat targeting financial data and customer PII"},
            {"name": "Regulatory Compliance", "category": "legal", "probability": "medium", "impact": "high", "owner": "Chief Compliance Officer", "description": "Upcoming Basel IV implementation requiring significant capital adjustments"},
            {"name": "Liquidity Stress", "category": "financial", "probability": "low", "impact": "high", "owner": "Treasurer", "description": "Potential liquidity crunch during market stress scenario"},
            {"name": "Operational Technology Failure", "category": "operational", "probability": "medium", "impact": "medium", "owner": "CTO", "description": "Legacy core banking system outage risk during peak transaction periods"},
            {"name": "Market Volatility Impact", "category": "market", "probability": "high", "impact": "medium", "owner": "Portfolio Manager", "description": "Investment portfolio mark-to-market losses during equity market downturn"},
            {"name": "Third Party Vendor Risk", "category": "operational", "probability": "low", "impact": "medium", "owner": "Procurement Director", "description": "Key vendor failure affecting payment processing infrastructure"},
        ]

        for rd in demo_risks:
            score = compute_score(rd["probability"], rd["impact"])
            risk = models.Risk(
                name=rd["name"], description=rd["description"], category=rd["category"],
                probability=rd["probability"], impact=rd["impact"],
                score=score, severity=get_severity(score), owner=rd["owner"],
                status="open", assessment_id=assessment.id,
            )
            db.add(risk)

        # Demo audit logs
        demo_logs = [
            {"action": "assessment.completed", "entity_type": "assessment", "entity_id": assessment.id, "entity_name": "Q1 2024 Annual Risk Review"},
            {"action": "risk.created", "entity_type": "risk", "entity_name": "Credit Concentration Risk"},
            {"action": "user.login", "entity_type": "user", "entity_name": "demo@riskiq.com"},
            {"action": "plan.upgraded", "entity_type": "subscription", "entity_name": "Pro Plan"},
        ]
        for ld in demo_logs:
            db.add(models.AuditLog(organization_id=org.id, user_id=user.id, **ld))

        # Demo subscription (pro plan)
        db.add(models.Subscription(
            organization_id=org.id, plan="pro", status="active",
            razorpay_order_id="demo_order_pro", razorpay_payment_id="pay_demo123",
            amount=3499.0, currency="INR", billing_cycle="monthly",
        ))

        # Templates
        templates = [
            {"name": "Banking & Financial Services", "description": "Comprehensive risk template for banks and financial institutions", "industry": "banking",
             "risk_categories": json.dumps(["financial", "credit", "market", "operational", "legal"]),
             "default_risks": json.dumps([
                {"name": "Credit Default Risk", "category": "credit", "probability": "medium", "impact": "high"},
                {"name": "Interest Rate Risk", "category": "market", "probability": "high", "impact": "medium"},
                {"name": "Liquidity Risk", "category": "financial", "probability": "low", "impact": "high"},
                {"name": "Regulatory Compliance", "category": "legal", "probability": "medium", "impact": "high"},
                {"name": "Cyber Fraud", "category": "operational", "probability": "medium", "impact": "high"},
             ])},
            {"name": "SaaS Technology Company", "description": "Risk template tailored for B2B and B2C SaaS businesses", "industry": "technology",
             "risk_categories": json.dumps(["operational", "market", "financial", "legal"]),
             "default_risks": json.dumps([
                {"name": "Data Breach", "category": "operational", "probability": "medium", "impact": "high"},
                {"name": "Customer Churn Risk", "category": "market", "probability": "medium", "impact": "high"},
                {"name": "Infrastructure Outage", "category": "operational", "probability": "low", "impact": "high"},
                {"name": "GDPR Non-Compliance", "category": "legal", "probability": "low", "impact": "high"},
                {"name": "Competitive Disruption", "category": "market", "probability": "high", "impact": "medium"},
             ])},
            {"name": "Manufacturing Operations", "description": "Risk framework for manufacturing and industrial companies", "industry": "manufacturing",
             "risk_categories": json.dumps(["operational", "financial", "market", "legal"]),
             "default_risks": json.dumps([
                {"name": "Supply Chain Disruption", "category": "operational", "probability": "medium", "impact": "high"},
                {"name": "Equipment Failure", "category": "operational", "probability": "medium", "impact": "medium"},
                {"name": "Raw Material Price Spike", "category": "market", "probability": "high", "impact": "medium"},
                {"name": "Environmental Compliance", "category": "legal", "probability": "low", "impact": "high"},
                {"name": "Labor Shortage", "category": "operational", "probability": "medium", "impact": "medium"},
             ])},
        ]
        for td in templates:
            db.add(models.Template(**td))

        db.commit()
        print("✅ Database seeded with Phase 4/5 data!")
    except Exception as e:
        print(f"Seeding error: {e}")
        import traceback; traceback.print_exc()
        db.rollback()
    finally:
        db.close()

def seed_experts():
    """Seed industry experts and opinions."""
    db = SessionLocal()
    try:
        existing = db.query(models.Expert).first()
        if existing:
            return

        import json as _json

        EXPERTS = [
            {
                "name": "Uday Kotak", "title": "Founder & MD, Kotak Mahindra Bank",
                "industry": "banking", "industries": ["banking", "financial"],
                "expertise_areas": ["credit risk", "banking", "capital markets", "NBFCs"],
                "bio": "One of India's most successful bankers, known for building Kotak Mahindra Bank from scratch. Pioneer in Indian private banking sector with deep insights into credit and risk management.",
                "avatar_initials": "UK", "avatar_color": "#6366F1", "years_experience": 35,
                "is_verified": True, "is_global": True,
                "opinions": [
                    {"title": "Credit Risk in Current Economic Climate", "content": "The Indian banking sector needs to be cautious about credit concentration risks, especially in real estate and infrastructure sectors. NPAs could rise if GDP growth slows below 6%. Banks with strong retail franchise and diversified portfolios are better positioned.", "sentiment": "cautious", "industry": "banking", "tags": ["credit risk", "NPA", "banking"]},
                    {"title": "Digital Banking Transformation", "content": "The next decade belongs to banks that can combine trust with technology. Traditional banks that embrace digital will outperform pure-play fintechs due to existing customer relationships and regulatory moats.", "sentiment": "bullish", "industry": "banking", "tags": ["fintech", "digital banking"]},
                ]
            },
            {
                "name": "Radhakishan Damani", "title": "Founder, DMart (Avenue Supermarts)",
                "industry": "retail", "industries": ["retail", "fmcg", "consumer"],
                "expertise_areas": ["value investing", "retail operations", "consumer behavior", "inventory management"],
                "bio": "Billionaire investor and founder of DMart, one of India's most profitable retail chains. Known for his value investing philosophy and deep understanding of consumer business economics.",
                "avatar_initials": "RD", "avatar_color": "#8B5CF6", "years_experience": 40,
                "is_verified": True, "is_global": True,
                "opinions": [
                    {"title": "Retail Sector Risks & Opportunities", "content": "The key risk in Indian retail is premature expansion. Every successful retail format works on getting unit economics right first. Quick commerce and online are threats but in-store experience still drives 80% of grocery purchases in India.", "sentiment": "neutral", "industry": "retail", "tags": ["retail", "consumer", "e-commerce"]},
                ]
            },
            {
                "name": "Nandan Nilekani", "title": "Co-Founder, Infosys & Architect of Aadhaar",
                "industry": "technology", "industries": ["technology", "fintech", "government"],
                "expertise_areas": ["technology strategy", "digital public infrastructure", "fintech", "startup ecosystem"],
                "bio": "Co-founder of Infosys and the principal architect of India's Aadhaar digital identity system. Deep expertise in technology-driven economic transformation and open digital infrastructure.",
                "avatar_initials": "NN", "avatar_color": "#10B981", "years_experience": 42,
                "is_verified": True, "is_global": True,
                "opinions": [
                    {"title": "Technology Risk in Digital India", "content": "As India goes digital, cybersecurity becomes a systemic risk. Organizations need to invest in zero-trust architectures. The good news: UPI and Aadhaar have demonstrated that open digital infrastructure can create resilient systems.", "sentiment": "bullish", "industry": "technology", "tags": ["cybersecurity", "digital india", "fintech"]},
                    {"title": "AI Adoption in Indian Enterprises", "content": "Indian enterprises are at an inflection point with AI. The risk of NOT adopting AI is now greater than the risk of adopting it. Companies that leverage AI for productivity will create massive competitive moats in the next 5 years.", "sentiment": "bullish", "industry": "technology", "tags": ["AI", "enterprise", "productivity"]},
                ]
            },
            {
                "name": "Ridham Desai", "title": "MD & Head of India Research, Morgan Stanley",
                "industry": "financial", "industries": ["financial", "capital markets", "equity"],
                "expertise_areas": ["equity research", "macro economics", "market strategy", "sector analysis"],
                "bio": "One of India's most respected equity strategists with over 25 years at Morgan Stanley. Known for his bullish long-term India thesis and contrarian macro calls.",
                "avatar_initials": "RD", "avatar_color": "#3B82F6", "years_experience": 28,
                "is_verified": True, "is_global": True,
                "opinions": [
                    {"title": "India's Decade: Risk-Reward Analysis", "content": "India is entering its golden decade. The risk-reward is heavily skewed in favor of long-term investors. Key risks: global recession spillover, high valuations in midcaps, and political uncertainty. But the structural story of demographics, digitization, and decarbonization remains intact.", "sentiment": "bullish", "industry": "financial", "tags": ["India", "macro", "equity markets"]},
                ]
            },
            {
                "name": "Kiran Mazumdar-Shaw", "title": "Founder & Chairperson, Biocon",
                "industry": "healthcare", "industries": ["healthcare", "pharma", "biotech"],
                "expertise_areas": ["biotech", "pharmaceutical risk", "R&D management", "regulatory compliance", "biosimilars"],
                "bio": "Pioneer of India's biotech industry and founder of Biocon, India's largest biotech company. Deep expertise in pharma risk management, regulatory strategy, and healthcare innovation.",
                "avatar_initials": "KS", "avatar_color": "#EC4899", "years_experience": 45,
                "is_verified": True, "is_global": True,
                "opinions": [
                    {"title": "Pharma Risk Management Post-COVID", "content": "The pandemic exposed critical supply chain vulnerabilities in pharma. Indian pharma companies must diversify API sourcing away from single-country dependence. Regulatory risk from USFDA remains the biggest earnings risk for export-oriented pharma companies.", "sentiment": "cautious", "industry": "healthcare", "tags": ["pharma", "supply chain", "regulatory risk"]},
                ]
            },
            {
                "name": "Mukesh Butani", "title": "Founder, BMR Legal & Tax Expert",
                "industry": "legal", "industries": ["legal", "tax", "compliance"],
                "expertise_areas": ["tax risk", "regulatory compliance", "cross-border transactions", "GST", "transfer pricing"],
                "bio": "Leading tax and regulatory expert with expertise in helping large corporations navigate India's complex tax landscape. Former Global Tax Practice leader at BMR Advisors.",
                "avatar_initials": "MB", "avatar_color": "#F59E0B", "years_experience": 30,
                "is_verified": True, "is_global": True,
                "opinions": [
                    {"title": "GST Compliance Risks for Businesses", "content": "GST audit risk is significantly underestimated by most businesses. With the GSTN now matching supplier and buyer returns, discrepancies will trigger notices. Businesses must invest in robust compliance systems and conduct regular self-audits to avoid substantial penalties.", "sentiment": "cautious", "industry": "legal", "tags": ["GST", "compliance", "tax risk"]},
                ]
            },
            {
                "name": "Anand Mahindra", "title": "Chairman, Mahindra Group",
                "industry": "manufacturing", "industries": ["manufacturing", "auto", "technology", "diversified"],
                "expertise_areas": ["manufacturing excellence", "brand strategy", "diversified conglomerates", "sustainability", "electric vehicles"],
                "bio": "Chairman of the $21 billion Mahindra Group. Pioneer in Indian manufacturing and known for transforming Mahindra into a global brand across auto, real estate, IT, and financial services.",
                "avatar_initials": "AM", "avatar_color": "#14B8A6", "years_experience": 38,
                "is_verified": True, "is_global": True,
                "opinions": [
                    {"title": "Manufacturing Risk in the EV Transition", "content": "The EV transition is both the biggest risk and opportunity for Indian auto manufacturers. Companies that delay EV investment risk obsolescence within a decade. But rushing without achieving battery cost parity creates financial risk. The sweet spot is building EV capability while milking ICE profitability.", "sentiment": "neutral", "industry": "manufacturing", "tags": ["EV", "manufacturing", "auto sector"]},
                ]
            },
        ]

        for edata in EXPERTS:
            opinions_data = edata.pop('opinions', [])
            expert = models.Expert(
                industries=_json.dumps(edata.pop('industries', [])),
                expertise_areas=_json.dumps(edata.pop('expertise_areas', [])),
                **edata
            )
            db.add(expert)
            db.flush()

            for op in opinions_data:
                tags = op.pop('tags', [])
                opinion = models.ExpertOpinion(
                    expert_id=expert.id,
                    tags=_json.dumps(tags),
                    published_at=datetime.utcnow(),
                    **op
                )
                db.add(opinion)

        db.commit()
        print("✅ Expert seeds added!")
    except Exception as e:
        print(f"Expert seeding error: {e}")
        import traceback; traceback.print_exc()
        db.rollback()
    finally:
        db.close()
