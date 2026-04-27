"""
Netlify Functions handler — wraps FastAPI app with Mangum
(AWS Lambda / Netlify Functions compatible ASGI adapter).
"""
import sys
import os

# Add the functions directory itself to path so all copied source files
# (main.py, database.py, models.py, api/, etc.) are importable
sys.path.insert(0, os.path.dirname(__file__))

# Set SQLite path to /tmp which is writable in serverless environments
os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/riskiq.db")

from mangum import Mangum
from main import app

# lifespan="off" → skip the background thread (not needed in serverless)
handler = Mangum(app, lifespan="off")
