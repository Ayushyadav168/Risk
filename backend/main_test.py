"""
Minimal test app — deploy this first to prove Render works,
then switch back to main:app once confirmed live.
"""
from fastapi import FastAPI
import os, sys

app = FastAPI(title="RiskIQ Health Test")

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "python": sys.version,
        "port": os.environ.get("PORT", "not-set"),
    }

@app.get("/")
def root():
    return {"message": "RiskIQ backend is running"}
