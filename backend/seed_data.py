"""Seed the database with industry templates."""
import json
from database import SessionLocal, engine
import models

models.Base.metadata.create_all(bind=engine)

TEMPLATES = [
    {
        "name": "Banking & NBFC Risk Framework",
        "industry": "finance",
        "description": "Comprehensive risk framework for banks, NBFCs, and lending institutions.",
        "risk_categories": json.dumps(["credit", "market", "operational", "legal", "financial"]),
        "default_risks": json.dumps([
            {"name": "Borrower Concentration Risk", "category": "credit", "probability": "high", "impact": "high", "description": "Top 5 borrowers represent >40% of loan book"},
            {"name": "NPA / Loan Default", "category": "credit", "probability": "medium", "impact": "high", "description": "Non-performing assets exceeding regulatory threshold"},
            {"name": "Liquidity Mismatch", "category": "financial", "probability": "medium", "impact": "high", "description": "Asset-liability maturity mismatch causing liquidity stress"},
            {"name": "Interest Rate Risk", "category": "market", "probability": "medium", "impact": "medium", "description": "Adverse movement in interest rates affecting margins"},
            {"name": "KYC / AML Compliance", "category": "legal", "probability": "low", "impact": "high", "description": "Non-compliance with KYC/AML regulations"},
            {"name": "Fraud & Internal Theft", "category": "operational", "probability": "low", "impact": "high", "description": "Employee fraud or unauthorized transactions"},
        ]),
    },
    {
        "name": "SaaS Startup Risk Framework",
        "industry": "saas",
        "description": "Risk framework tailored for SaaS and software startup companies.",
        "risk_categories": json.dumps(["operational", "market", "legal", "financial", "technology"]),
        "default_risks": json.dumps([
            {"name": "Customer Churn Risk", "category": "market", "probability": "high", "impact": "high", "description": "Monthly churn rate exceeds sustainable threshold"},
            {"name": "Data Breach / Cybersecurity", "category": "technology", "probability": "medium", "impact": "high", "description": "Unauthorized access to customer data"},
            {"name": "Vendor / API Dependency", "category": "operational", "probability": "medium", "impact": "medium", "description": "Critical dependency on single cloud or API provider"},
            {"name": "GDPR / DPDP Compliance", "category": "legal", "probability": "low", "impact": "high", "description": "Non-compliance with data protection regulations"},
            {"name": "Runway / Cash Burn", "category": "financial", "probability": "medium", "impact": "high", "description": "Monthly burn rate exceeds 18-month runway threshold"},
            {"name": "Key Person Dependency", "category": "operational", "probability": "medium", "impact": "medium", "description": "Over-reliance on 1-2 key technical team members"},
        ]),
    },
    {
        "name": "Manufacturing Risk Framework",
        "industry": "manufacturing",
        "description": "Risk management framework for manufacturing and industrial companies.",
        "risk_categories": json.dumps(["operational", "financial", "market", "legal", "credit"]),
        "default_risks": json.dumps([
            {"name": "Single Supplier Dependency", "category": "operational", "probability": "high", "impact": "high", "description": ">70% of critical inputs from single supplier"},
            {"name": "Equipment Failure / Downtime", "category": "operational", "probability": "medium", "impact": "high", "description": "Critical machinery failure causing production halt"},
            {"name": "Raw Material Price Volatility", "category": "market", "probability": "high", "impact": "medium", "description": "Commodity price spikes affecting margins"},
            {"name": "Workforce / Labor Risk", "category": "operational", "probability": "medium", "impact": "medium", "description": "Labor strikes, turnover, or skill shortage"},
            {"name": "Environmental Compliance", "category": "legal", "probability": "low", "impact": "high", "description": "Non-compliance with environmental regulations"},
            {"name": "Export/Import Restrictions", "category": "market", "probability": "low", "impact": "medium", "description": "Trade policy changes affecting supply chain"},
        ]),
    },
    {
        "name": "E-Commerce Risk Framework",
        "industry": "ecommerce",
        "description": "Risk framework for online retail and e-commerce businesses.",
        "risk_categories": json.dumps(["operational", "financial", "market", "legal", "technology"]),
        "default_risks": json.dumps([
            {"name": "Payment Fraud & Chargebacks", "category": "financial", "probability": "high", "impact": "medium", "description": "High chargeback rates or payment fraud incidents"},
            {"name": "Logistics / Delivery Failure", "category": "operational", "probability": "medium", "impact": "high", "description": "Delivery partner failures during peak seasons"},
            {"name": "Inventory Management Risk", "category": "operational", "probability": "medium", "impact": "medium", "description": "Overstock or stockout scenarios"},
            {"name": "Platform Dependency (Amazon/Flipkart)", "category": "market", "probability": "medium", "impact": "high", "description": "Revenue concentration on marketplace platforms"},
            {"name": "Customer Data Protection", "category": "legal", "probability": "low", "impact": "high", "description": "DPDP Act / GDPR compliance for customer data"},
            {"name": "Website Downtime / DDoS", "category": "technology", "probability": "low", "impact": "high", "description": "Site outage during high-traffic sales periods"},
        ]),
    },
    {
        "name": "Healthcare Risk Framework",
        "industry": "healthcare",
        "description": "Risk management for healthcare providers, clinics, and health-tech companies.",
        "risk_categories": json.dumps(["legal", "operational", "financial", "technology", "market"]),
        "default_risks": json.dumps([
            {"name": "Medical Liability / Malpractice", "category": "legal", "probability": "medium", "impact": "high", "description": "Patient harm leading to legal action"},
            {"name": "Patient Data Privacy", "category": "legal", "probability": "medium", "impact": "high", "description": "HIPAA / health data regulation compliance"},
            {"name": "Regulatory Licensing Risk", "category": "legal", "probability": "low", "impact": "high", "description": "License suspension or regulatory action"},
            {"name": "Medical Supply Chain", "category": "operational", "probability": "medium", "impact": "high", "description": "Critical medical supply shortage"},
            {"name": "Staff Shortage / Burnout", "category": "operational", "probability": "high", "impact": "medium", "description": "Healthcare worker shortage affecting service delivery"},
            {"name": "Insurance Reimbursement Delays", "category": "financial", "probability": "medium", "impact": "medium", "description": "Delayed payments from insurance providers"},
        ]),
    },
]


def seed():
    db = SessionLocal()
    try:
        existing = db.query(models.Template).count()
        if existing > 0:
            print(f"Templates already seeded ({existing} found). Skipping.")
            return

        for t_data in TEMPLATES:
            template = models.Template(**t_data)
            db.add(template)
        db.commit()
        print(f"Seeded {len(TEMPLATES)} industry templates.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
