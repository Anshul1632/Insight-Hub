"""
ORM models. Only metadata is stored in SQLite - actual dataset rows
live as files in storage/uploads and storage/cleaned.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True, default=_uuid)
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False)      # raw uploaded file on disk
    cleaned_filename = Column(String, nullable=True)       # set once cleaning has run
    file_type = Column(String, nullable=False)             # csv | xlsx | xls

    n_rows = Column(Integer, nullable=True)
    n_columns = Column(Integer, nullable=True)

    is_cleaned = Column(Boolean, default=False)

    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    history = relationship(
        "CleaningAction", back_populates="dataset", cascade="all, delete-orphan"
    )


class CleaningAction(Base):
    """Audit trail of every cleaning operation applied to a dataset."""

    __tablename__ = "cleaning_actions"

    id = Column(String, primary_key=True, default=_uuid)
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)

    action_type = Column(String, nullable=False)   # e.g. "fill_missing", "drop_duplicates"
    details = Column(Text, nullable=True)           # JSON-encoded params/result summary
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    dataset = relationship("Dataset", back_populates="history")
