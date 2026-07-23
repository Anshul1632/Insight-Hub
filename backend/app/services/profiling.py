"""
Automated data profiling.

Given a raw DataFrame, produces a full report: shape, dtypes, missing
values, duplicates, unique counts, and summary statistics for numeric
columns. This is what powers the "upload and instantly understand
your data" experience.
"""

import math
from typing import Any

import numpy as np
import pandas as pd


def _infer_semantic_type(series: pd.Series) -> str:
    """Classify a column as numeric / datetime / boolean / categorical / text."""
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"

    # Try to detect date-like strings (cheap heuristic: sample a few values)
    non_null = series.dropna()
    if len(non_null) > 0:
        sample = non_null.sample(min(20, len(non_null)), random_state=0)
        try:
            parsed = pd.to_datetime(sample, errors="coerce", format="mixed")
            if parsed.notna().mean() > 0.8:
                return "datetime"
        except Exception:
            pass

    # Low cardinality relative to row count => categorical, else free text
    n_unique = series.nunique(dropna=True)
    n_total = max(len(series), 1)
    if n_unique <= max(20, int(n_total * 0.05)):
        return "categorical"
    return "text"


def _safe_float(value) -> float | None:
    if value is None:
        return None
    try:
        f = float(value)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return None


def _numeric_stats(series: pd.Series) -> dict[str, Any]:
    numeric = pd.to_numeric(series, errors="coerce")
    if numeric.dropna().empty:
        return {}
    return {
        "mean": _safe_float(numeric.mean()),
        "median": _safe_float(numeric.median()),
        "std": _safe_float(numeric.std()),
        "min": _safe_float(numeric.min()),
        "max": _safe_float(numeric.max()),
        "q1": _safe_float(numeric.quantile(0.25)),
        "q3": _safe_float(numeric.quantile(0.75)),
    }


def profile_dataframe(df: pd.DataFrame) -> dict[str, Any]:
    """Build the full profiling report used by the /profile endpoint."""
    n_rows, n_cols = df.shape
    duplicate_rows = int(df.duplicated().sum())
    total_cells = n_rows * n_cols if n_cols else 0
    total_missing = int(df.isna().sum().sum())

    columns = []
    for col in df.columns:
        series = df[col]
        missing_count = int(series.isna().sum())
        semantic_type = _infer_semantic_type(series)

        sample_values = (
            series.dropna().drop_duplicates().head(5).tolist()
        )
        # Ensure JSON-serializable sample values
        sample_values = [
            v.item() if isinstance(v, np.generic) else str(v) if isinstance(v, pd.Timestamp) else v
            for v in sample_values
        ]

        columns.append({
            "name": str(col),
            "dtype": str(series.dtype),
            "inferred_type": semantic_type,
            "missing_count": missing_count,
            "missing_pct": round((missing_count / n_rows) * 100, 2) if n_rows else 0.0,
            "unique_count": int(series.nunique(dropna=True)),
            "sample_values": sample_values,
            "stats": _numeric_stats(series) if semantic_type == "numeric" else {},
        })

    return {
        "n_rows": n_rows,
        "n_columns": n_cols,
        "duplicate_rows": duplicate_rows,
        "total_missing_cells": total_missing,
        "total_missing_pct": round((total_missing / total_cells) * 100, 2) if total_cells else 0.0,
        "columns": columns,
    }
