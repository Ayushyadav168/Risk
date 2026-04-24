from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import os, json, hmac, hashlib

from database import get_db
import models
from auth import get_current_user

router = APIRouter()

# ── Razorpay Plans (amounts in paise: 1 INR = 100 paise) ─────────────────────
PLANS = {
    "free": {
        "name": "Free",
        "price_monthly": 0,
        "price_yearly": 0,
        "currency": "INR",
        "features": [
            "1 assessment per month",
            "Basic risk scoring",
            "3 risk categories",
            "Community support",
        ],
        "limits": {
            "assessments_per_month": 1,
            "risks_per_assessment": 10,
            "reports_per_month": 0,
            "ai_analysis": False,
            "financial_tools": False,
            "team_members": 1,
        },
    },
    "pro": {
        "name": "Pro",
        "price_monthly": 349900,   # ₹3,499 / month
        "price_yearly": 3499900,   # ₹34,999 / year (~17% off)
        "currency": "INR",
        "features": [
            "Unlimited assessments",
            "AI-powered risk analysis",
            "All 8 risk categories",
            "PDF + Excel reports",
            "Financial tools (DCF, Loan)",
            "Industry templates",
            "5 team members",
            "Priority support",
        ],
        "limits": {
            "assessments_per_month": -1,   # unlimited
            "risks_per_assessment": -1,
            "reports_per_month": 20,
            "ai_analysis": True,
            "financial_tools": True,
            "team_members": 5,
        },
    },
    "enterprise": {
        "name": "Enterprise",
        "price_monthly": 999900,   # ₹9,999 / month
        "price_yearly": 9999900,   # ₹99,999 / year
        "currency": "INR",
        "features": [
            "Everything in Pro",
            "Unlimited team members",
            "API access",
            "White-label reports",
            "Dedicated account manager",
            "Custom integrations",
            "SLA guarantee",
            "Audit logs",
        ],
        "limits": {
            "assessments_per_month": -1,
            "risks_per_assessment": -1,
            "reports_per_month": -1,
            "ai_analysis": True,
            "financial_tools": True,
            "team_members": -1,
            "api_access": True,
            "white_label": True,
        },
    },
}

def get_razorpay_client():
    key_id = os.getenv("RAZORPAY_KEY_ID", "")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
    if not key_id or not key_secret:
        return None
    try:
        import razorpay
        return razorpay.Client(auth=(key_id, key_secret))
    except Exception:
        return None

# ── Schemas ───────────────────────────────────────────────────────────────────
class CreateOrderRequest(BaseModel):
    plan: str
    billing_cycle: str = "monthly"  # monthly | yearly

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str
    billing_cycle: str = "monthly"

class SubscriptionResponse(BaseModel):
    id: int
    plan: str
    status: str
    amount: float
    currency: str
    billing_cycle: str
    started_at: datetime
    expires_at: Optional[datetime]

# ── Helpers ───────────────────────────────────────────────────────────────────
def get_org_plan(org: models.Organization) -> str:
    if org.plan_expires_at and org.plan_expires_at < datetime.utcnow():
        return "free"  # expired
    return org.plan or "free"

def check_usage_limit(org: models.Organization, limit_key: str, db: Session) -> bool:
    """Returns True if within limits, False if limit exceeded."""
    plan = get_org_plan(org)
    limits = PLANS.get(plan, PLANS["free"])["limits"]
    limit = limits.get(limit_key, 0)
    if limit == -1:
        return True  # unlimited
    if limit_key == "assessments_per_month":
        # Reset counter if new month
        now = datetime.utcnow()
        if not org.assessment_month_reset or org.assessment_month_reset.month != now.month:
            org.assessment_count_month = 0
            org.assessment_month_reset = now
            db.commit()
        return org.assessment_count_month < limit
    return True

# ── GET /plans ────────────────────────────────────────────────────────────────
@router.get("/plans")
def get_plans():
    return {
        plan_id: {
            "id": plan_id,
            "name": data["name"],
            "price_monthly": data["price_monthly"],
            "price_yearly": data["price_yearly"],
            "currency": data["currency"],
            "features": data["features"],
            "limits": data["limits"],
        }
        for plan_id, data in PLANS.items()
    }

# ── GET /subscription ─────────────────────────────────────────────────────────
@router.get("/subscription")
def get_subscription(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    org = db.query(models.Organization).filter(
        models.Organization.id == current_user.organization_id
    ).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    plan = get_org_plan(org)
    sub = db.query(models.Subscription).filter(
        models.Subscription.organization_id == org.id,
        models.Subscription.status == "active",
    ).order_by(models.Subscription.started_at.desc()).first()

    return {
        "plan": plan,
        "plan_name": PLANS.get(plan, PLANS["free"])["name"],
        "status": "active",
        "expires_at": org.plan_expires_at.isoformat() if org.plan_expires_at else None,
        "features": PLANS.get(plan, PLANS["free"])["features"],
        "limits": PLANS.get(plan, PLANS["free"])["limits"],
        "subscription_id": sub.id if sub else None,
        "razorpay_key_id": os.getenv("RAZORPAY_KEY_ID", ""),
    }

# ── POST /create-order ────────────────────────────────────────────────────────
@router.post("/create-order")
def create_razorpay_order(
    req: CreateOrderRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if req.plan not in PLANS or req.plan == "free":
        raise HTTPException(status_code=400, detail="Invalid plan")

    plan_data = PLANS[req.plan]
    amount = plan_data["price_yearly"] if req.billing_cycle == "yearly" else plan_data["price_monthly"]

    client = get_razorpay_client()
    if not client:
        # Demo mode — return mock order
        return {
            "order_id": f"demo_order_{req.plan}_{req.billing_cycle}",
            "amount": amount,
            "currency": "INR",
            "key_id": "demo_key",
            "plan": req.plan,
            "billing_cycle": req.billing_cycle,
            "demo_mode": True,
            "plan_name": plan_data["name"],
            "description": f"{plan_data['name']} Plan — {req.billing_cycle.title()}",
        }

    try:
        order_data = {
            "amount": amount,
            "currency": "INR",
            "receipt": f"riskiq_{current_user.id}_{req.plan}_{int(datetime.utcnow().timestamp())}",
            "notes": {
                "user_id": str(current_user.id),
                "org_id": str(current_user.organization_id),
                "plan": req.plan,
                "billing_cycle": req.billing_cycle,
            },
        }
        order = client.order.create(data=order_data)

        # Save pending subscription
        sub = models.Subscription(
            organization_id=current_user.organization_id,
            plan=req.plan,
            status="pending",
            razorpay_order_id=order["id"],
            amount=amount / 100,
            currency="INR",
            billing_cycle=req.billing_cycle,
        )
        db.add(sub)
        db.commit()

        return {
            "order_id": order["id"],
            "amount": amount,
            "currency": "INR",
            "key_id": os.getenv("RAZORPAY_KEY_ID"),
            "plan": req.plan,
            "billing_cycle": req.billing_cycle,
            "plan_name": plan_data["name"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Razorpay error: {str(e)}")

# ── POST /verify-payment ──────────────────────────────────────────────────────
@router.post("/verify-payment")
def verify_razorpay_payment(
    req: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")

    # Demo mode — if order_id starts with "demo_", just activate plan
    if req.razorpay_order_id.startswith("demo_"):
        return _activate_plan(db, current_user, req.plan, req.billing_cycle,
                               req.razorpay_order_id, req.razorpay_payment_id, demo=True)

    # Signature verification
    if key_secret:
        body = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
        expected = hmac.new(key_secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, req.razorpay_signature):
            raise HTTPException(status_code=400, detail="Invalid payment signature")

    return _activate_plan(db, current_user, req.plan, req.billing_cycle,
                           req.razorpay_order_id, req.razorpay_payment_id)

def _activate_plan(db, user, plan, billing_cycle, order_id, payment_id, demo=False):
    org = db.query(models.Organization).filter(
        models.Organization.id == user.organization_id
    ).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Set expiry
    if billing_cycle == "yearly":
        expires = datetime.utcnow() + timedelta(days=365)
    else:
        expires = datetime.utcnow() + timedelta(days=30)

    # Update org plan
    org.plan = plan
    org.plan_expires_at = expires

    # Create / update subscription record
    sub = db.query(models.Subscription).filter(
        models.Subscription.razorpay_order_id == order_id
    ).first()
    if sub:
        sub.status = "active"
        sub.razorpay_payment_id = payment_id
        sub.expires_at = expires
    else:
        sub = models.Subscription(
            organization_id=org.id,
            plan=plan,
            status="active",
            razorpay_order_id=order_id,
            razorpay_payment_id=payment_id,
            amount=PLANS[plan]["price_monthly"] / 100 if billing_cycle == "monthly" else PLANS[plan]["price_yearly"] / 100,
            currency="INR",
            billing_cycle=billing_cycle,
            expires_at=expires,
        )
        db.add(sub)

    db.commit()
    db.refresh(org)

    return {
        "success": True,
        "plan": plan,
        "plan_name": PLANS[plan]["name"],
        "expires_at": expires.isoformat(),
        "demo_mode": demo,
        "message": f"🎉 Successfully upgraded to {PLANS[plan]['name']} plan!",
    }

# ── POST /cancel ──────────────────────────────────────────────────────────────
@router.post("/cancel")
def cancel_subscription(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    org = db.query(models.Organization).filter(
        models.Organization.id == current_user.organization_id
    ).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    sub = db.query(models.Subscription).filter(
        models.Subscription.organization_id == org.id,
        models.Subscription.status == "active",
    ).order_by(models.Subscription.started_at.desc()).first()

    if sub:
        sub.status = "cancelled"
        sub.cancelled_at = datetime.utcnow()

    # Downgrade at end of current period (don't remove immediately)
    # In production, use a webhook to actually downgrade at period end
    db.commit()

    return {"success": True, "message": "Subscription cancelled. Access continues until period end."}

# ── GET /invoices ─────────────────────────────────────────────────────────────
@router.get("/invoices")
def get_invoices(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    subs = db.query(models.Subscription).filter(
        models.Subscription.organization_id == current_user.organization_id,
        models.Subscription.status.in_(["active", "cancelled"]),
    ).order_by(models.Subscription.started_at.desc()).all()

    return [
        {
            "id": s.id,
            "plan": s.plan,
            "plan_name": PLANS.get(s.plan, {}).get("name", s.plan),
            "amount": s.amount,
            "currency": s.currency,
            "billing_cycle": s.billing_cycle,
            "status": s.status,
            "payment_id": s.razorpay_payment_id,
            "date": s.started_at.isoformat() if s.started_at else None,
        }
        for s in subs
    ]

# ── POST /razorpay-webhook ────────────────────────────────────────────────────
@router.post("/razorpay-webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

    if secret:
        expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        event = json.loads(body)
        event_type = event.get("event", "")

        if event_type == "payment.captured":
            payment = event.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = payment.get("order_id")
            payment_id = payment.get("id")
            notes = payment.get("notes", {})
            plan = notes.get("plan", "pro")
            billing_cycle = notes.get("billing_cycle", "monthly")
            org_id = notes.get("org_id")

            if org_id:
                org = db.query(models.Organization).filter(
                    models.Organization.id == int(org_id)
                ).first()
                if org:
                    expires = datetime.utcnow() + (timedelta(days=365) if billing_cycle == "yearly" else timedelta(days=30))
                    org.plan = plan
                    org.plan_expires_at = expires
                    db.commit()
    except Exception as e:
        print(f"Webhook error: {e}")

    return {"status": "ok"}
