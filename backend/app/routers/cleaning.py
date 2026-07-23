"""
Endpoints for cleaning a dataset: handling missing values, removing
duplicates, and auto-fixing data types. Every run writes a new
"cleaned" file and logs an audit entry in CleaningAction.
"""

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import UPLOAD_DIR, CLEANED_DIR
from app.database import get_db
from app.services import cleaning as cleaning_service
from app.services.data_io import read_dataframe, write_dataframe, dataset_file_path

router = APIRouter(prefix="/api/datasets", tags=["cleaning"])


def _get_dataset_or_404(db: Session, dataset_id: str) -> models.Dataset:
    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.post("/{dataset_id}/clean", response_model=schemas.CleaningResult)
def clean_dataset(dataset_id: str, request: schemas.CleaningRequest, db: Session = Depends(get_db)):
    dataset = _get_dataset_or_404(db, dataset_id)

    # Clean starting from the current best version (previously cleaned, or raw)
    source_path = dataset_file_path(dataset, UPLOAD_DIR, CLEANED_DIR)
    df = read_dataframe(source_path)
    n_rows_before = len(df)

    affected_columns: set[str] = set()
    duplicates_removed = 0

    if request.auto_fix_dtypes:
        df = cleaning_service.auto_fix_dtypes(df)

    if request.missing_value_strategies:
        df, cols = cleaning_service.apply_missing_value_strategies(
            df, request.missing_value_strategies
        )
        affected_columns.update(cols)

    if request.drop_rows_with_any_missing:
        df = cleaning_service.drop_rows_with_any_missing(df)

    if request.drop_duplicates:
        df, duplicates_removed = cleaning_service.remove_duplicates(df)

    # Persist the cleaned file (always CSV for consistency/simplicity)
    cleaned_filename = f"{dataset.id}_cleaned.csv"
    cleaned_path = CLEANED_DIR / cleaned_filename
    write_dataframe(df, cleaned_path)

    dataset.cleaned_filename = cleaned_filename
    dataset.is_cleaned = True
    dataset.n_rows = len(df)
    dataset.n_columns = df.shape[1]

    action = models.CleaningAction(
        dataset_id=dataset.id,
        action_type="clean",
        details=json.dumps({
            "drop_duplicates": request.drop_duplicates,
            "auto_fix_dtypes": request.auto_fix_dtypes,
            "drop_rows_with_any_missing": request.drop_rows_with_any_missing,
            "missing_value_strategies": [s.model_dump() for s in request.missing_value_strategies],
            "duplicates_removed": duplicates_removed,
            "n_rows_before": n_rows_before,
            "n_rows_after": len(df),
        }),
    )
    db.add(action)
    db.commit()

    return {
        "dataset_id": dataset.id,
        "n_rows_before": n_rows_before,
        "n_rows_after": len(df),
        "duplicates_removed": duplicates_removed,
        "columns_affected": sorted(affected_columns),
        "is_cleaned": True,
    }


@router.get("/{dataset_id}/history")
def get_cleaning_history(dataset_id: str, db: Session = Depends(get_db)):
    dataset = _get_dataset_or_404(db, dataset_id)
    return [
        {
            "id": h.id,
            "action_type": h.action_type,
            "details": json.loads(h.details) if h.details else {},
            "created_at": h.created_at,
        }
        for h in sorted(dataset.history, key=lambda h: h.created_at)
    ]


@router.post("/{dataset_id}/reset")
def reset_to_raw(dataset_id: str, db: Session = Depends(get_db)):
    """Discard cleaning and revert to the originally uploaded file."""
    dataset = _get_dataset_or_404(db, dataset_id)
    if dataset.cleaned_filename:
        (CLEANED_DIR / dataset.cleaned_filename).unlink(missing_ok=True)
    dataset.cleaned_filename = None
    dataset.is_cleaned = False

    df = read_dataframe(UPLOAD_DIR / dataset.stored_filename)
    dataset.n_rows = len(df)
    dataset.n_columns = df.shape[1]
    db.commit()
    return {"status": "reset", "dataset_id": dataset_id}
