import React from "react";
import { Wand2 } from "lucide-react";
import { TypeTag, MiniBar, SummaryStat, PrimaryButton, LoadingBlock, ErrorBlock } from "./ui/Shared.jsx";

export default function ProfilePanel({ profile, isCleaned, onGoClean, loading, error }) {
  if (loading) return <LoadingBlock label="Fetching profile from the backend…" />;
  if (error) return <ErrorBlock message={error} />;
  if (!profile) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-xl">Data profile</h2>
          <p className="text-xs mt-0.5 text-inkSoft">
            {isCleaned ? "Showing the cleaned version of your dataset." : "Automated scan of every column, before any cleaning."}
          </p>
        </div>
        <PrimaryButton onClick={onGoClean} className="text-sm px-4 py-2 flex items-center gap-2">
          <Wand2 size={14} /> Go to cleaning
        </PrimaryButton>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryStat label="Rows" value={profile.n_rows.toLocaleString()} />
        <SummaryStat label="Columns" value={profile.n_columns} />
        <SummaryStat label="Duplicate rows" value={profile.duplicate_rows.toLocaleString()} warn={profile.duplicate_rows > 0} />
        <SummaryStat label="Missing cells" value={`${profile.total_missing_pct.toFixed(1)}%`} warn={profile.total_missing_pct > 5} />
      </div>

      <div className="bg-panel border border-line rounded-lg divide-y divide-line">
        {profile.columns.map((col, i) => (
          <div
            key={col.name}
            className="animate-scan-in flex items-center gap-4 px-5 py-3.5"
            style={{ animationDelay: `${i * 55}ms` }}
          >
            <div className="w-40 shrink-0">
              <div className="font-mono text-sm font-medium truncate">{col.name}</div>
              <TypeTag type={col.inferred_type} />
            </div>
            <div className="w-28 shrink-0 font-mono text-xs text-inkSoft">
              {col.unique_count.toLocaleString()} unique
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono text-inkFaint">missing</span>
                <span className={`text-[11px] font-mono ${col.missing_pct > 0 ? "text-brick" : "text-inkFaint"}`}>
                  {col.missing_count} ({col.missing_pct.toFixed(1)}%)
                </span>
              </div>
              <MiniBar pct={col.missing_pct} tone={col.missing_pct > 15 ? "brick" : "amber"} />
            </div>
            {col.stats && Object.keys(col.stats).length > 0 ? (
              <div className="w-56 shrink-0 font-mono text-[11px] text-right text-inkSoft">
                mean {col.stats.mean?.toFixed(1)} · min {col.stats.min?.toFixed(1)} · max {col.stats.max?.toFixed(1)}
              </div>
            ) : (
              <div className="w-56 shrink-0 font-mono text-[11px] text-right truncate text-inkFaint">
                {col.sample_values.join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
