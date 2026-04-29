from datetime import datetime
from email.message import EmailMessage
from pathlib import Path
from typing import Optional
import json
import os
import smtplib

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class AccessRequest(BaseModel):
    full_name: str
    email: str
    phone: str
    company_name: str
    job_title: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    website: Optional[str] = None
    message: Optional[str] = None


def _build_email(body: AccessRequest) -> EmailMessage:
    recipient = os.getenv("ACCESS_REQUEST_RECIPIENT", "safehorizonadvisory@gmail.com")
    sender = os.getenv("SMTP_FROM") or os.getenv("SMTP_USER") or recipient

    submitted_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    lines = [
        "New RiskIQ dashboard access request",
        "",
        f"Submitted at: {submitted_at}",
        f"Name: {body.full_name}",
        f"Email: {body.email}",
        f"Phone: {body.phone}",
        f"Company: {body.company_name}",
        f"Job title: {body.job_title or '-'}",
        f"Industry: {body.industry or '-'}",
        f"Company size: {body.company_size or '-'}",
        f"Website: {body.website or '-'}",
        "",
        "Message:",
        body.message or "-",
    ]

    msg = EmailMessage()
    msg["Subject"] = f"RiskIQ Dashboard Access Request - {body.company_name}"
    msg["From"] = sender
    msg["To"] = recipient
    msg["Reply-To"] = str(body.email)
    msg.set_content("\n".join(lines))
    return msg


def _smtp_configured() -> bool:
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASS", "")
    return bool(
        os.getenv("SMTP_HOST")
        and user
        and password
        and user not in ("your@email.com", "your_email@example.com")
        and password not in ("your-app-password", "your_app_password")
    )


def _send_email(msg: EmailMessage) -> None:
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASS")

    if not _smtp_configured():
        raise RuntimeError("SMTP is not configured")

    with smtplib.SMTP(host, port, timeout=15) as server:
        server.starttls()
        server.login(username, password)
        server.send_message(msg)


def _store_request(body: AccessRequest, sent: bool, error: Optional[str] = None) -> None:
    payload = body.model_dump()
    payload.update({
        "submitted_at": datetime.utcnow().isoformat() + "Z",
        "email_sent": sent,
        "error": error,
    })
    path = Path("reports/access_requests.jsonl")
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, default=str) + "\n")


@router.post("/request")
def request_dashboard_access(body: AccessRequest):
    try:
        msg = _build_email(body)
        _send_email(msg)
        _store_request(body, sent=True)
        return {"ok": True, "message": "Access request sent"}
    except Exception as exc:
        _store_request(body, sent=False, error=str(exc))
        if _smtp_configured():
            raise HTTPException(status_code=502, detail="Could not send access request email. Please try again.")
        return {
            "ok": True,
            "message": "Access request saved. Configure SMTP to receive it by email.",
        }
