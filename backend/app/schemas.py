"""
Pydantic schemas for request validation and response shaping.
Kept separate from ORM models so the API contract can evolve
independently of the database structure.
"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class DatasetOut(BaseModel):
    id: str
    original_filename: str
    file_type: str
    n_rows: Optional[int]
    n_columns: Optional[int]
    is_cleaned: bool
    uploaded_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ColumnProfile(BaseModel):
    name: str
    dtype: str
    inferred_type: str          # numeric | categorical | datetime | boolean | text
    missing_count: int
    missing_pct: float
    unique_count: int
    sample_values: list[Any]
    stats: dict[str, Any] = {}   # only populated for numeric columns


class ProfileReport(BaseModel):
    dataset_id: str
    n_rows: int
    n_columns: int
    duplicate_rows: int
    total_missing_cells: int
    total_missing_pct: float
    columns: list[ColumnProfile]


class MissingValueStrategy(BaseModel):
    """Per-column strategy for handling missing values."""
    column: str
    strategy: str                # "drop" | "mean" | "median" | "mode" | "constant"
    constant_value: Optional[Any] = None


class CleaningRequest(BaseModel):
    drop_duplicates: bool = False
    missing_value_strategies: list[MissingValueStrategy] = []
    auto_fix_dtypes: bool = False
    drop_rows_with_any_missing: bool = False


class CleaningResult(BaseModel):
    dataset_id: str
    n_rows_before: int
    n_rows_after: int
    duplicates_removed: int
    columns_affected: list[str]
    is_cleaned: bool


class DescriptiveStats(BaseModel):
    column: str
    mean: Optional[float] = None
    median: Optional[float] = None
    mode: Optional[Any] = None
    std: Optional[float] = None
    variance: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    q1: Optional[float] = None
    q3: Optional[float] = None


class EDAReport(BaseModel):
    dataset_id: str
    numeric_stats: list[DescriptiveStats]
    correlations: dict[str, dict[str, float]]
    categorical_frequencies: dict[str, dict[str, int]]


class QueryRequest(BaseModel):
    filters: dict[str, Any] = {}          # {"column": value} exact-match filters
    group_by: Optional[list[str]] = None
    aggregations: Optional[dict[str, str]] = None  # {"column": "sum"|"mean"|"count"|...}
    sort_by: Optional[str] = None
    sort_desc: bool = False
    limit: Optional[int] = 100


class KPI(BaseModel):
    label: str
    value: Any
    format: str = "number"   # number | currency | percent


class DashboardData(BaseModel):
    dataset_id: str
    kpis: list[KPI]
    chart_suggestions: list[dict[str, Any]]
