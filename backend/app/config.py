"""
Central configuration for InsightHub backend.
Keeping all paths/settings in one place makes the app easy to deploy
(e.g. on Render) by just overriding environment variables.
"""

import os
from pathlib import Path

# Base directory = backend/
BASE_DIR = Path(__file__).resolve().parent.parent

# Where uploaded (raw) and cleaned datasets are stored on disk.
UPLOAD_DIR = Path(os.getenv("INSIGHTHUB_UPLOAD_DIR", BASE_DIR / "storage" / "uploads"))
CLEANED_DIR = Path(os.getenv("INSIGHTHUB_CLEANED_DIR", BASE_DIR / "storage" / "cleaned"))

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CLEANED_DIR.mkdir(parents=True, exist_ok=True)

# SQLite database URL. Switch to Postgres/MySQL later by changing this env var.
DATABASE_URL = os.getenv("INSIGHTHUB_DATABASE_URL", f"sqlite:///{BASE_DIR / 'insighthub.db'}")

# Max upload size in bytes (default 50 MB)
MAX_UPLOAD_SIZE = int(os.getenv("INSIGHTHUB_MAX_UPLOAD_SIZE", 50 * 1024 * 1024))

# Allowed file extensions for dataset uploads
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}

# CORS - the React dev server / deployed frontend origin(s)
CORS_ORIGINS = os.getenv(
    "INSIGHTHUB_CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,https://insight-hub-three-iota.vercel.app"
).split(",")
