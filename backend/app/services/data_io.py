"""
Helpers for reading and writing dataset files to disk.
Centralizing this means every part of the app loads/saves data
the same way, regardless of whether it's CSV or Excel.
"""

from pathlib import Path

import pandas as pd


def read_dataframe(path: Path) -> pd.DataFrame:
    """Load a CSV or Excel file into a DataFrame, inferring the format from extension."""
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return pd.read_csv(path)
    if suffix in (".xlsx", ".xls"):
        return pd.read_excel(path)
    raise ValueError(f"Unsupported file type: {suffix}")


def write_dataframe(df: pd.DataFrame, path: Path) -> None:
    """Persist a DataFrame back to disk in the same format implied by the path suffix."""
    suffix = path.suffix.lower()
    if suffix == ".csv":
        df.to_csv(path, index=False)
    elif suffix in (".xlsx", ".xls"):
        df.to_excel(path, index=False)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")


def dataset_file_path(dataset, upload_dir: Path, cleaned_dir: Path, prefer_cleaned: bool = True) -> Path:
    """
    Resolve which file on disk represents the "current" version of a dataset:
    the cleaned version if it exists and is preferred, otherwise the raw upload.
    """
    if prefer_cleaned and dataset.is_cleaned and dataset.cleaned_filename:
        return cleaned_dir / dataset.cleaned_filename
    return upload_dir / dataset.stored_filename
