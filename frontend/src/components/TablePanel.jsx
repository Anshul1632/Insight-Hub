import React from "react";
import { GhostButton, LoadingBlock, ErrorBlock } from "./ui/Shared.jsx";

export default function TablePanel({ table, page, setPage, pageSize, colTypes, loading, error }) {
  if (loading) return <LoadingBlock label="Fetching rows from the backend…" />;
  if (error) return <ErrorBlock message={error} />;
  if (!table) return null;

  const totalPages = Math.max(1, Math.ceil(table.total_rows / pageSize));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-xl">Data table</h2>
          <p className="text-xs mt-0.5 text-inkSoft">{table.total_rows.toLocaleString()} total rows.</p>
        </div>
      </div>

      <div className="bg-panel border border-line rounded-lg overflow-x-auto">
        <table className="ih-table w-full">
          <thead>
            <tr>
              {table.columns.map((c) => (
                <th key={c} className="text-left py-2 px-3 whitespace-nowrap">
                  {c} <span className="text-inkFaint font-normal">· {colTypes[c] || "text"}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i}>
                {table.columns.map((c) => (
                  <td key={c} className="py-2 px-3 whitespace-nowrap font-mono">
                    {r[c] === null || r[c] === undefined || r[c] === "" ? "—" : String(r[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="font-mono text-xs text-inkFaint">Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <GhostButton disabled={page <= 1} onClick={() => setPage(page - 1)} className="text-xs px-3 py-1.5">Previous</GhostButton>
          <GhostButton disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="text-xs px-3 py-1.5">Next</GhostButton>
        </div>
      </div>
    </div>
  );
}
