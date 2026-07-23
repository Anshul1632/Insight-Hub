"""
Endpoints for exploratory data analysis: descriptive statistics,
correlation matrix, categorical frequency distributions, and a
generic filter/group/aggregate query endpoint for custom reports.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import UPLOAD_DIR, CLEANED_DIR
from app.database import get_db
from app.services import stats as stats_service
from app.services.data_io import read_dataframe, dataset_file_path

router = APIRouter(prefix="/api/datasets", tags=["eda"])


def _get_dataset_or_404(db: Session, dataset_id: str) -> models.Dataset:
    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


def _load_current_df(db: Session, dataset_id: str):
    dataset = _get_dataset_or_404(db, dataset_id)
    path = dataset_file_path(dataset, UPLOAD_DIR, CLEANED_DIR)
    return dataset, read_dataframe(path)


@router.get("/{dataset_id}/eda", response_model=schemas.EDAReport)
def get_eda(dataset_id: str, db: Session = Depends(get_db)):
    dataset, df = _load_current_df(db, dataset_id)
    return {
        "dataset_id": dataset.id,
        "numeric_stats": stats_service.descriptive_stats(df),
        "correlations": stats_service.correlation_matrix(df),
        "categorical_frequencies": stats_service.categorical_frequencies(df),
    }


@router.post("/{dataset_id}/query")
def query_dataset(dataset_id: str, request: schemas.QueryRequest, db: Session = Depends(get_db)):
    _, df = _load_current_df(db, dataset_id)
    rows = stats_service.run_query(
        df,
        filters=request.filters,
        group_by=request.group_by,
        aggregations=request.aggregations,
        sort_by=request.sort_by,
        sort_desc=request.sort_desc,
        limit=request.limit,
    )
    return {"dataset_id": dataset_id, "row_count": len(rows), "rows": rows}


@router.get("/{dataset_id}/table")
def get_raw_table(
    dataset_id: str,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
):
    """Paginated raw data for the 'searchable table' view in the UI."""
    _, df = _load_current_df(db, dataset_id)
    total = len(df)
    start = max(page - 1, 0) * page_size
    end = start + page_size
    page_df = df.iloc[start:end].replace({float("nan"): None})
    return {
        "dataset_id": dataset_id,
        "total_rows": total,
        "page": page,
        "page_size": page_size,
        "columns": list(df.columns.astype(str)),
        "rows": page_df.to_dict(orient="records"),
    }
