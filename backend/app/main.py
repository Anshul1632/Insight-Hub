"""
InsightHub backend entrypoint.

Run locally with:
    uvicorn app.main:app --reload --port 8000

Docs available at http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.database import init_db
from app.routers import datasets, cleaning, eda, dashboard

app = FastAPI(
    title="InsightHub API",
    description="Upload, clean, analyze, and visualize tabular datasets.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


app.include_router(datasets.router)
app.include_router(cleaning.router)
app.include_router(eda.router)
app.include_router(dashboard.router)
