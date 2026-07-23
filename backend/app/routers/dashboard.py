"""
Endpoint powering the dashboard module: auto-generated KPI cards
and suggested chart configurations based on the dataset's columns.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import UPLOAD_DIR, CLEANED_DIR
from app.database import get_db
from app.services import stats as stats_service
from app.services.data_io import read_dataframe, dataset_file_path

router = APIRouter(prefix="/api/datasets", tags=["dashboard"])


def _get_dataset_or_404(db: Session, dataset_id: str) -> models.Dataset:
    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.get("/{dataset_id}/dashboard", response_model=schemas.DashboardData)
def get_dashboard(dataset_id: str, db: Session = Depends(get_db)):
    dataset = _get_dataset_or_404(db, dataset_id)
    path = dataset_file_path(dataset, UPLOAD_DIR, CLEANED_DIR)
    df = read_dataframe(path)

    return {
        "dataset_id": dataset.id,
        "kpis": stats_service.generate_kpis(df),
        "chart_suggestions": stats_service.suggest_charts(df),
    }
