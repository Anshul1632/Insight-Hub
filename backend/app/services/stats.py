"""
Exploratory data analysis: descriptive statistics, correlation matrix,
categorical frequency distributions, flexible group/filter/aggregate
queries, and automatic KPI generation for the dashboard.
"""

import math
from typing import Any

import numpy as np
import pandas as pd


def _safe_float(value) -> float | None:
    try:
        f = float(value)
        return None if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return None


def numeric_columns(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]


def categorical_columns(df: pd.DataFrame, max_unique: int = 50) -> list[str]:
    cols = []
    for c in df.columns:
        if pd.api.types.is_numeric_dtype(df[c]) or pd.api.types.is_datetime64_any_dtype(df[c]):
            continue
        if df[c].nunique(dropna=True) <= max_unique:
            cols.append(c)
    return cols


def descriptive_stats(df: pd.DataFrame) -> list[dict[str, Any]]:
    results = []
    for col in numeric_columns(df):
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if series.empty:
            continue
        mode_vals = series.mode()
        results.append({
            "column": col,
            "mean": _safe_float(series.mean()),
            "median": _safe_float(series.median()),
            "mode": _safe_float(mode_vals.iloc[0]) if not mode_vals.empty else None,
            "std": _safe_float(series.std()),
            "variance": _safe_float(series.var()),
            "min": _safe_float(series.min()),
            "max": _safe_float(series.max()),
            "q1": _safe_float(series.quantile(0.25)),
            "q3": _safe_float(series.quantile(0.75)),
        })
    return results


def correlation_matrix(df: pd.DataFrame) -> dict[str, dict[str, float]]:
    num_cols = numeric_columns(df)
    if len(num_cols) < 2:
        return {}
    corr = df[num_cols].corr(numeric_only=True)
    return {
        row: {col: _safe_float(corr.loc[row, col]) for col in corr.columns}
        for row in corr.index
    }


def categorical_frequencies(df: pd.DataFrame, top_n: int = 10) -> dict[str, dict[str, int]]:
    result = {}
    for col in categorical_columns(df):
        counts = df[col].value_counts(dropna=True).head(top_n)
        result[col] = {str(k): int(v) for k, v in counts.items()}
    return result


def run_query(
    df: pd.DataFrame,
    filters: dict[str, Any],
    group_by: list[str] | None,
    aggregations: dict[str, str] | None,
    sort_by: str | None,
    sort_desc: bool,
    limit: int | None,
) -> list[dict[str, Any]]:
    """
    Generic filter -> group -> aggregate -> sort -> limit pipeline,
    driven entirely by the request body so the frontend can build
    ad-hoc reports without new backend endpoints.
    """
    result = df.copy()

    for column, value in (filters or {}).items():
        if column in result.columns:
            result = result[result[column] == value]

    if group_by:
        valid_group_cols = [c for c in group_by if c in result.columns]
        if valid_group_cols:
            agg_map = {
                col: func for col, func in (aggregations or {}).items()
                if col in result.columns
            }
            if agg_map:
                result = result.groupby(valid_group_cols, dropna=False).agg(agg_map).reset_index()
            else:
                result = result.groupby(valid_group_cols, dropna=False).size().reset_index(name="count")

    if sort_by and sort_by in result.columns:
        result = result.sort_values(by=sort_by, ascending=not sort_desc)

    if limit:
        result = result.head(limit)

    # Replace NaN/inf with None so it serializes cleanly to JSON
    result = result.replace([np.inf, -np.inf], np.nan)
    return result.where(pd.notna(result), None).to_dict(orient="records")


def generate_kpis(df: pd.DataFrame) -> list[dict[str, Any]]:
    """
    Heuristic auto-KPI generation: total row count, plus sum/average
    of numeric columns whose names hint at business metrics, falling
    back to the first couple of numeric columns if no keyword match.
    """
    kpis = [{"label": "Total Records", "value": int(len(df)), "format": "number"}]

    keyword_map = {
        "sales": "sum", "revenue": "sum", "profit": "sum", "amount": "sum",
        "total": "sum", "price": "mean", "quantity": "sum", "orders": "sum",
    }

    num_cols = numeric_columns(df)
    matched = set()

    for col in num_cols:
        lower = col.lower()
        for keyword, agg in keyword_map.items():
            if keyword in lower:
                value = df[col].sum() if agg == "sum" else df[col].mean()
                kpis.append({
                    "label": f"{'Total' if agg == 'sum' else 'Average'} {col}",
                    "value": _safe_float(value),
                    "format": "currency" if any(k in lower for k in ("sales", "revenue", "profit", "price", "amount")) else "number",
                })
                matched.add(col)
                break

    # Fallback: if nothing matched by keyword, surface up to 3 numeric columns
    if not matched:
        for col in num_cols[:3]:
            kpis.append({
                "label": f"Average {col}",
                "value": _safe_float(df[col].mean()),
                "format": "number",
            })

    # Categorical "count of distinct X" KPIs (e.g. customer count, product count)
    for col in categorical_columns(df, max_unique=10000):
        lower = col.lower()
        if any(k in lower for k in ("customer", "product", "region", "department", "category")):
            kpis.append({
                "label": f"Distinct {col}",
                "value": int(df[col].nunique(dropna=True)),
                "format": "number",
            })

    return kpis[:8]  # cap so the dashboard doesn't get overcrowded


def suggest_charts(df: pd.DataFrame) -> list[dict[str, Any]]:
    """
    Suggest a reasonable default set of charts based on column types,
    so the dashboard has sensible visuals immediately after upload.
    """
    suggestions = []
    num_cols = numeric_columns(df)
    cat_cols = categorical_columns(df)
    date_cols = [c for c in df.columns if pd.api.types.is_datetime64_any_dtype(df[c])]

    if date_cols and num_cols:
        suggestions.append({
            "type": "line", "x": date_cols[0], "y": num_cols[0],
            "title": f"{num_cols[0]} over time"
        })
    if cat_cols and num_cols:
        suggestions.append({
            "type": "bar", "x": cat_cols[0], "y": num_cols[0],
            "title": f"{num_cols[0]} by {cat_cols[0]}"
        })
    if len(num_cols) >= 2:
        suggestions.append({
            "type": "scatter", "x": num_cols[0], "y": num_cols[1],
            "title": f"{num_cols[0]} vs {num_cols[1]}"
        })
    if cat_cols:
        suggestions.append({
            "type": "pie", "column": cat_cols[0],
            "title": f"Distribution of {cat_cols[0]}"
        })
    if num_cols:
        suggestions.append({
            "type": "histogram", "column": num_cols[0],
            "title": f"Distribution of {num_cols[0]}"
        })

    return suggestions
