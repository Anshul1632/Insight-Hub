"""
Data cleaning operations: missing value handling, duplicate removal,
and automatic dtype correction (numeric strings -> numbers, date
strings -> datetime).
"""

from typing import Any

import pandas as pd

from app.schemas import MissingValueStrategy


def remove_duplicates(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    before = len(df)
    cleaned = df.drop_duplicates().reset_index(drop=True)
    return cleaned, before - len(cleaned)


def apply_missing_value_strategies(
    df: pd.DataFrame, strategies: list[MissingValueStrategy]
) -> tuple[pd.DataFrame, list[str]]:
    """
    Apply a per-column missing-value strategy. Supported strategies:
    drop (drop rows where this column is null), mean, median, mode,
    constant (fill with a user-supplied value).
    """
    df = df.copy()
    affected: list[str] = []

    for s in strategies:
        if s.column not in df.columns:
            continue
        col = df[s.column]

        if s.strategy == "drop":
            df = df[col.notna()].reset_index(drop=True)
        elif s.strategy == "mean":
            numeric = pd.to_numeric(col, errors="coerce")
            df[s.column] = col.fillna(numeric.mean())
        elif s.strategy == "median":
            numeric = pd.to_numeric(col, errors="coerce")
            df[s.column] = col.fillna(numeric.median())
        elif s.strategy == "mode":
            mode_vals = col.mode(dropna=True)
            if not mode_vals.empty:
                df[s.column] = col.fillna(mode_vals.iloc[0])
        elif s.strategy == "constant":
            df[s.column] = col.fillna(s.constant_value)
        else:
            continue

        affected.append(s.column)

    return df, affected


def drop_rows_with_any_missing(df: pd.DataFrame) -> pd.DataFrame:
    return df.dropna(axis=0, how="any").reset_index(drop=True)


def auto_fix_dtypes(df: pd.DataFrame) -> pd.DataFrame:
    """
    Attempt to convert object columns to a more precise dtype:
    numeric if it parses cleanly, otherwise datetime if it parses
    cleanly, otherwise leave as-is (text/categorical).
    """
    df = df.copy()
    for col in df.columns:
        # Skip columns that are already a precise type. Checked this way
        # (rather than `dtype == object`) so it works whether pandas is
        # storing text as legacy "object" dtype or the newer "str" dtype.
        if pd.api.types.is_numeric_dtype(df[col]) or pd.api.types.is_datetime64_any_dtype(df[col]) or pd.api.types.is_bool_dtype(df[col]):
            continue

        non_null = df[col].dropna()
        if non_null.empty:
            continue

        numeric_attempt = pd.to_numeric(df[col], errors="coerce")
        if numeric_attempt.notna().sum() >= int(len(non_null) * 0.95):
            df[col] = numeric_attempt
            continue

        datetime_attempt = pd.to_datetime(df[col], errors="coerce", format="mixed")
        if datetime_attempt.notna().sum() >= int(len(non_null) * 0.95):
            df[col] = datetime_attempt
            continue

    return df
