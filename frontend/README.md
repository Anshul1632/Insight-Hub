# InsightHub — Frontend

A Vite + React + Tailwind app that talks directly to the InsightHub FastAPI
backend: upload, profile, clean, analyze, and visualize any CSV/Excel file.

## Setup

```bash
cd frontend
npm install
cp .env.example .env      # point VITE_API_BASE_URL at your backend
npm run dev
```

Runs at http://localhost:5173. Make sure the backend is running (see
`../backend/README.md`) — the default `.env` points to
`http://localhost:8000`, and the backend's CORS config already allows
`http://localhost:5173`.

## Project structure

```
frontend/
  src/
    main.jsx                 # React entrypoint
    App.jsx                   # stepper navigation + orchestrates all API calls
    api.js                      # thin axios wrapper around every backend endpoint
    index.css                    # Tailwind + design tokens (graph-paper background, fonts)
    components/
      UploadPanel.jsx             # drag/drop upload -> POST /upload
      ProfilePanel.jsx              # column-by-column scan report -> GET /profile
      CleanPanel.jsx                 # missing-value / duplicate / dtype controls -> POST /clean
      EDAPanel.jsx                     # stats, correlations, frequencies -> GET /eda
      DashboardPanel.jsx                # KPIs + charts -> GET /dashboard + POST /query
      TablePanel.jsx                      # paginated raw data -> GET /table
      ui/Shared.jsx                         # buttons, tags, mini-bars, formatters
  tailwind.config.js
  vite.config.js
```

## How data flows

1. **Upload** — file goes to `POST /api/datasets/upload`; the response is a
   full profiling report plus a `dataset_id` used by every later call.
2. **Profile** — re-fetched from `GET /profile` after any cleaning action, so
   it always reflects the current (raw or cleaned) version.
3. **Clean** — the UI builds a `CleaningRequest` (per-column strategies +
   whole-dataset toggles) and posts it to `/clean`. Cleaning invalidates the
   cached EDA/dashboard/table data, which are refetched lazily on next visit.
4. **Analyze** — `GET /eda` returns descriptive stats, a correlation matrix,
   and categorical frequency counts in one call.
5. **Dashboard** — `GET /dashboard` returns KPI cards and a list of suggested
   chart *configs* (type + columns), not the chart data itself. The frontend
   then calls `POST /query` once per suggested chart to get the actual
   values (grouped/aggregated for bar & line, raw sampled rows binned
   client-side for histograms, raw sampled pairs for scatter). The dashboard
   filter (top right) is applied as a `filters` object on those `/query`
   calls — note it affects the charts, not the KPI cards, since `/dashboard`
   itself doesn't accept filters.
6. **Data table** — paginated via `GET /table`, entirely server-side.

## Deployment

See the root-level `DEPLOYMENT.md` for deploying this to Vercel alongside
the backend on Render.
