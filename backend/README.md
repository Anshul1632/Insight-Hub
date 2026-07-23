# InsightHub — Backend

FastAPI backend for InsightHub: upload a CSV/Excel file and get automated
data profiling, cleaning, exploratory data analysis, and dashboard-ready
KPIs and chart suggestions.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # optional, defaults work out of the box
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs

## Project structure

```
backend/
  app/
    main.py            # FastAPI app, CORS, router registration
    config.py           # paths, env vars, constants
    database.py          # SQLAlchemy engine/session
    models.py            # Dataset, CleaningAction ORM models
    schemas.py            # Pydantic request/response models
    routers/
      datasets.py         # upload, list, profile, download, delete
      cleaning.py          # missing values, duplicates, dtype fixes
      eda.py                 # descriptive stats, correlations, queries, table
      dashboard.py            # KPIs + chart suggestions
    services/
      data_io.py            # read/write CSV & Excel consistently
      profiling.py            # automated column-by-column profiling
      cleaning.py              # cleaning transformations (pure functions)
      stats.py                  # descriptive stats, grouping, KPIs, chart picks
  storage/
    uploads/                    # raw uploaded files
    cleaned/                     # cleaned output files
  requirements.txt
```

Uploaded data is stored as files on disk (not in the DB) — SQLite only
holds metadata (filename, row/column counts, cleaning history). This
keeps the database small and fast regardless of dataset size.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/datasets/upload` | Upload a CSV/XLSX file, get an instant profile |
| GET | `/api/datasets` | List all uploaded datasets |
| GET | `/api/datasets/{id}` | Get dataset metadata |
| GET | `/api/datasets/{id}/profile` | Full profiling report (current version) |
| GET | `/api/datasets/{id}/download` | Download the current file |
| DELETE | `/api/datasets/{id}` | Delete a dataset and its files |
| POST | `/api/datasets/{id}/clean` | Apply missing-value / duplicate / dtype cleaning |
| GET | `/api/datasets/{id}/history` | Cleaning audit trail |
| POST | `/api/datasets/{id}/reset` | Revert to the originally uploaded file |
| GET | `/api/datasets/{id}/eda` | Descriptive stats, correlations, frequencies |
| POST | `/api/datasets/{id}/query` | Ad-hoc filter/group/aggregate/sort |
| GET | `/api/datasets/{id}/table` | Paginated raw data table |
| GET | `/api/datasets/{id}/dashboard` | Auto-generated KPIs + chart suggestions |

### Example: upload + clean + dashboard flow

```bash
# 1. Upload
curl -F "file=@sales.csv" http://localhost:8000/api/datasets/upload

# 2. Clean (fill missing Sales with mean, drop duplicates)
curl -X POST http://localhost:8000/api/datasets/<id>/clean \
  -H "Content-Type: application/json" \
  -d '{
        "drop_duplicates": true,
        "auto_fix_dtypes": true,
        "missing_value_strategies": [
          {"column": "Sales", "strategy": "mean"}
        ]
      }'

# 3. Get dashboard data
curl http://localhost:8000/api/datasets/<id>/dashboard
```

## Notes

- `requirements.txt` pins `pandas==2.2.2`; if you're on a newer pandas
  (3.x), the dtype-detection logic in `services/cleaning.py` and
  `services/profiling.py` was written to work across both, but pin the
  version above for the most predictable behavior.
- Cleaned files are always written back out as CSV for consistency,
  regardless of whether the original upload was Excel.
