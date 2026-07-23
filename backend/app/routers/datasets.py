"""
Endpoints for uploading datasets, listing them, fetching their
profiling report, and downloading the current (raw or cleaned) file.
"""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import UPLOAD_DIR, CLEANED_DIR, ALLOWED_EXTENSIONS, MAX_UPLOAD_SIZE
from app.database import get_db
from app.services.data_io import read_dataframe, dataset_file_path
from app.services.profiling import profile_dataframe

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


def _get_dataset_or_404(db: Session, dataset_id: str) -> models.Dataset:
    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.post("/upload", response_model=schemas.ProfileReport)
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds maximum upload size")

    dataset_id = uuid.uuid4().hex
    stored_filename = f"{dataset_id}{suffix}"
    stored_path = UPLOAD_DIR / stored_filename
    stored_path.write_bytes(contents)

    try:
        df = read_dataframe(stored_path)
    except Exception as exc:
        stored_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Could not parse file: {exc}")

    dataset = models.Dataset(
        id=dataset_id,
        original_filename=file.filename,
        stored_filename=stored_filename,
        file_type=suffix.lstrip("."),
        n_rows=len(df),
        n_columns=df.shape[1],
        is_cleaned=False,
    )
    db.add(dataset)
    db.commit()

    report = profile_dataframe(df)
    return {"dataset_id": dataset.id, **report}


@router.get("", response_model=list[schemas.DatasetOut])
def list_datasets(db: Session = Depends(get_db)):
    return db.query(models.Dataset).order_by(models.Dataset.uploaded_at.desc()).all()


@router.get("/{dataset_id}", response_model=schemas.DatasetOut)
def get_dataset(dataset_id: str, db: Session = Depends(get_db)):
    return _get_dataset_or_404(db, dataset_id)


@router.get("/{dataset_id}/profile", response_model=schemas.ProfileReport)
def get_profile(dataset_id: str, db: Session = Depends(get_db)):
    dataset = _get_dataset_or_404(db, dataset_id)
    path = dataset_file_path(dataset, UPLOAD_DIR, CLEANED_DIR)
    df = read_dataframe(path)
    report = profile_dataframe(df)
    return {"dataset_id": dataset.id, **report}


@router.get("/{dataset_id}/download")
def download_dataset(dataset_id: str, db: Session = Depends(get_db)):
    dataset = _get_dataset_or_404(db, dataset_id)
    path = dataset_file_path(dataset, UPLOAD_DIR, CLEANED_DIR)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(path, filename=dataset.original_filename)


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str, db: Session = Depends(get_db)):
    dataset = _get_dataset_or_404(db, dataset_id)

    (UPLOAD_DIR / dataset.stored_filename).unlink(missing_ok=True)
    if dataset.cleaned_filename:
        (CLEANED_DIR / dataset.cleaned_filename).unlink(missing_ok=True)

    db.delete(dataset)
    db.commit()
    return {"status": "deleted", "dataset_id": dataset_id}
