import React, { useState, useEffect } from "react";
import { ListChecks } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { LoadingBlock, ErrorBlock } from "./ui/Shared.jsx";

export default function EDAPanel({ eda, loading, error }) {
  const [edaColumn, setEdaColumn] = useState(null);

  const categoricalColumns = eda ? Object.keys(eda.categorical_frequencies || {}) : [];

  useEffect(() => {
    if (!edaColumn && categoricalColumns.length > 0) setEdaColumn(categoricalColumns[0]);
  }, [categoricalColumns, edaColumn]);

  if (loading) return <LoadingBlock label="Computing statistics on the backend…" />;
  if (error) return <ErrorBlock message={error} />;
  if (!eda) return null;

  const numericStats = eda.numeric_stats || [];
  const correlationCols = Object.keys(eda.correlations || {});
  const frequencyData = edaColumn
    ? Object.entries(eda.categorical_frequencies[edaColumn] || {})
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    : [];

  return (
    <div>
      <h2 className="font-display font-bold text-xl mb-1">Exploratory analysis</h2>
      <p className="text-xs mb-5 text-inkSoft">Descriptive statistics, correlations, and category breakdowns from the backend.</p>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-panel border border-line rounded-lg p-4">
          <div className="text-sm font-semibold mb-3 flex items-center gap-2">
            <ListChecks size={14} /> Descriptive statistics
          </div>
          {numericStats.length === 0 ? (
            <div className="text-xs text-inkFaint">No numeric columns found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ih-table w-full">
                <thead>
                  <tr>
                    <th className="text-left py-1.5 pr-3">Column</th>
                    <th className="text-right py-1.5 pr-3">Mean</th>
                    <th className="text-right py-1.5 pr-3">Median</th>
                    <th className="text-right py-1.5 pr-3">Std</th>
                    <th className="text-right py-1.5">Min / Max</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {numericStats.map((c) => (
                    <tr key={c.column}>
                      <td className="py-1.5 pr-3 font-medium">{c.column}</td>
                      <td className="py-1.5 pr-3 text-right">{c.mean?.toFixed(2) ?? "—"}</td>
                      <td className="py-1.5 pr-3 text-right">{c.median?.toFixed(2) ?? "—"}</td>
                      <td className="py-1.5 pr-3 text-right">{c.std?.toFixed(2) ?? "—"}</td>
                      <td className="py-1.5 text-right">{c.min?.toFixed(1) ?? "—"} / {c.max?.toFixed(1) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-panel border border-line rounded-lg p-4">
          <div className="text-sm font-semibold mb-3">Correlation matrix</div>
          {correlationCols.length < 2 ? (
            <div className="text-xs text-inkFaint">Need at least two numeric columns.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ih-table w-full font-mono text-[11px]">
                <thead>
                  <tr>
                    <th></th>
                    {correlationCols.map((c) => <th key={c} className="text-center py-1 px-1">{c.slice(0, 6)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {correlationCols.map((rowC) => (
                    <tr key={rowC}>
                      <td className="pr-2 font-medium">{rowC.slice(0, 8)}</td>
                      {correlationCols.map((colC) => {
                        const v = eda.correlations[rowC][colC];
                        const intensity = v === null || v === undefined ? 0 : Math.abs(v);
                        return (
                          <td key={colC} className="text-center py-1 px-1">
                            <div
                              className="rounded px-1.5 py-0.5"
                              style={{
                                background: `rgba(31,92,80,${intensity * 0.55})`,
                                color: intensity > 0.5 ? "#F5F7F6" : "#14231F",
                              }}
                            >
                              {v === null || v === undefined ? "—" : v.toFixed(2)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-panel border border-line rounded-lg p-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">Category frequency</div>
          <select
            className="border border-lineStrong rounded-md text-xs px-2 py-1 bg-panel"
            value={edaColumn || ""}
            onChange={(e) => setEdaColumn(e.target.value)}
          >
            {categoricalColumns.length === 0 && <option value="">No categorical columns</option>}
            {categoricalColumns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {edaColumn && frequencyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={frequencyData.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid stroke="#DCE3DF" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#1F5C50" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-xs text-inkFaint">No categorical columns available for this dataset.</div>
        )}
      </div>
    </div>
  );
}
