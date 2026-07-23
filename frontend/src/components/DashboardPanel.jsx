import React, { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import api from "../api.js";
import { LoadingBlock, ErrorBlock, PIE_COLORS, formatKPIValue } from "./ui/Shared.jsx";

function binNumbers(values, binCount = 8) {
  if (!values.length) return [];
  const min = Math.min(...values), max = Math.max(...values);
  const width = (max - min) / binCount || 1;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    name: `${(min + i * width).toFixed(0)}–${(min + (i + 1) * width).toFixed(0)}`,
    count: 0,
  }));
  values.forEach((n) => {
    let idx = Math.floor((n - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count += 1;
  });
  return bins;
}

// Fetch the concrete data for one backend-suggested chart config via /query.
async function fetchChartData(datasetId, suggestion, filters) {
  if (suggestion.type === "bar" || suggestion.type === "line") {
    const rows = await api.queryDataset(datasetId, {
      filters,
      group_by: [suggestion.x],
      aggregations: { [suggestion.y]: "sum" },
      sort_by: suggestion.type === "bar" ? suggestion.y : suggestion.x,
      sort_desc: suggestion.type === "bar",
      limit: suggestion.type === "bar" ? 8 : 150,
    });
    return rows.rows.map((r) => ({ name: String(r[suggestion.x]), value: r[suggestion.y] }));
  }

  if (suggestion.type === "pie") {
    const rows = await api.queryDataset(datasetId, {
      filters, group_by: [suggestion.column], sort_by: "count", sort_desc: true, limit: 20,
    });
    const entries = rows.rows.map((r) => [String(r[suggestion.column]), r.count]);
    const top = entries.slice(0, 6);
    const rest = entries.slice(6).reduce((a, [, v]) => a + v, 0);
    const data = top.map(([name, value]) => ({ name, value }));
    if (rest > 0) data.push({ name: "Other", value: rest });
    return data;
  }

  if (suggestion.type === "histogram") {
    const rows = await api.queryDataset(datasetId, { filters, limit: 2000 });
    const values = rows.rows.map((r) => r[suggestion.column]).filter((v) => typeof v === "number" && !Number.isNaN(v));
    return binNumbers(values);
  }

  if (suggestion.type === "scatter") {
    const rows = await api.queryDataset(datasetId, { filters, limit: 300 });
    return rows.rows
      .map((r) => ({ x: r[suggestion.x], y: r[suggestion.y] }))
      .filter((p) => typeof p.x === "number" && typeof p.y === "number");
  }

  return [];
}

export default function DashboardPanel({ datasetId, dashboard, categoricalColumns, loading, error }) {
  const [filterCol, setFilterCol] = useState("All");
  const [filterVal, setFilterVal] = useState("All");
  const [filterOptions, setFilterOptions] = useState([]);
  const [chartData, setChartData] = useState({}); // keyed by suggestion index
  const [chartsLoading, setChartsLoading] = useState(false);
  const [chartsError, setChartsError] = useState(null);

  const suggestions = dashboard?.chart_suggestions || [];
  const filters = useMemo(
    () => (filterCol !== "All" && filterVal !== "All" ? { [filterCol]: filterVal } : {}),
    [filterCol, filterVal]
  );

  // Load distinct values for the chosen filter column.
  useEffect(() => {
    if (filterCol === "All" || !datasetId) { setFilterOptions([]); return; }
    api.queryDataset(datasetId, { group_by: [filterCol], limit: 40 })
      .then((res) => setFilterOptions(res.rows.map((r) => String(r[filterCol]))))
      .catch(() => setFilterOptions([]));
  }, [filterCol, datasetId]);

  // Load concrete chart data whenever the suggestions or filter change.
  useEffect(() => {
    if (!datasetId || suggestions.length === 0) return;
    let cancelled = false;
    setChartsLoading(true);
    setChartsError(null);

    Promise.all(suggestions.map((s) => fetchChartData(datasetId, s, filters)))
      .then((results) => {
        if (cancelled) return;
        const map = {};
        results.forEach((data, i) => { map[i] = data; });
        setChartData(map);
      })
      .catch((err) => { if (!cancelled) setChartsError(err.message); })
      .finally(() => { if (!cancelled) setChartsLoading(false); });

    return () => { cancelled = true; };
  }, [datasetId, suggestions, filters]);

  if (loading) return <LoadingBlock label="Building your dashboard…" />;
  if (error) return <ErrorBlock message={error} />;
  if (!dashboard) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-xl">Dashboard</h2>
          <p className="text-xs mt-0.5 text-inkSoft">Auto-generated from your data's columns and types.</p>
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-inkFaint" />
          <select
            className="border border-lineStrong rounded-md text-xs px-2 py-1.5 bg-panel"
            value={filterCol}
            onChange={(e) => { setFilterCol(e.target.value); setFilterVal("All"); }}
          >
            <option value="All">Filter charts: none</option>
            {categoricalColumns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {filterCol !== "All" && (
            <select
              className="border border-lineStrong rounded-md text-xs px-2 py-1.5 bg-panel"
              value={filterVal}
              onChange={(e) => setFilterVal(e.target.value)}
            >
              <option value="All">All values</option>
              {filterOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          )}
          {filterCol !== "All" && (
            <button onClick={() => { setFilterCol("All"); setFilterVal("All"); }} className="border border-lineStrong rounded-md px-2 py-1.5">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: `repeat(${Math.min(dashboard.kpis.length, 6)}, minmax(0,1fr))` }}>
        {dashboard.kpis.map((k) => (
          <div key={k.label} className="bg-panel border border-line rounded-lg px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-wide truncate text-inkFaint">{k.label}</div>
            <div className="font-display font-bold text-xl mt-0.5">{formatKPIValue(k)}</div>
          </div>
        ))}
      </div>

      {chartsError && <div className="mb-4"><ErrorBlock message={chartsError} /></div>}
      {chartsLoading && <LoadingBlock label="Loading chart data…" />}

      {!chartsLoading && suggestions.length === 0 && (
        <div className="bg-panel border border-line rounded-lg p-6 text-sm text-center text-inkFaint">
          Not enough structured columns to suggest charts for this dataset yet.
        </div>
      )}

      {!chartsLoading && suggestions.length > 0 && (
        <div className="grid grid-cols-2 gap-5">
          {suggestions.map((s, i) => (
            <ChartCard key={i} suggestion={s} data={chartData[i] || []} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChartCard({ suggestion, data }) {
  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <div className="text-sm font-semibold mb-3">{suggestion.title}</div>
      <ResponsiveContainer width="100%" height={220}>
        {suggestion.type === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid stroke="#DCE3DF" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#1F5C50" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : suggestion.type === "line" ? (
          <LineChart data={data}>
            <CartesianGrid stroke="#DCE3DF" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#1F5C50" strokeWidth={2} dot={false} />
          </LineChart>
        ) : suggestion.type === "pie" ? (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fontSize: 10 }}>
              {data.map((entry, idx) => <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        ) : suggestion.type === "histogram" ? (
          <BarChart data={data}>
            <CartesianGrid stroke="#DCE3DF" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#C08A2E" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : suggestion.type === "scatter" ? (
          <ScatterChart>
            <CartesianGrid stroke="#DCE3DF" />
            <XAxis dataKey="x" name={suggestion.x} tick={{ fontSize: 11 }} />
            <YAxis dataKey="y" name={suggestion.y} tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={data} fill="#55697A" />
          </ScatterChart>
        ) : (
          <div />
        )}
      </ResponsiveContainer>
    </div>
  );
}
