import React, { useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { PrimaryButton, GhostButton, LoadingBlock, ErrorBlock } from "./ui/Shared.jsx";

export default function CleanPanel({ profile, onApply, onReset, isCleaned, isApplying, error }) {
  const [dropDuplicates, setDropDuplicates] = useState(false);
  const [autoFixDtypes, setAutoFixDtypes] = useState(false);
  const [dropAnyMissing, setDropAnyMissing] = useState(false);
  const [strategies, setStrategies] = useState({}); // { colName: { strategy, constant_value } }

  if (!profile) return null;

  const columnsWithMissing = profile.columns.filter((c) => c.missing_count > 0);

  const setColumnStrategy = (col, strategy, constant_value) => {
    setStrategies((prev) => ({ ...prev, [col]: { strategy, constant_value } }));
  };

  const handleApply = () => {
    const missing_value_strategies = Object.entries(strategies)
      .filter(([, v]) => v && v.strategy && v.strategy !== "none")
      .map(([column, v]) => ({ column, strategy: v.strategy, constant_value: v.constant_value ?? null }));

    onApply({
      drop_duplicates: dropDuplicates,
      auto_fix_dtypes: autoFixDtypes,
      drop_rows_with_any_missing: dropAnyMissing,
      missing_value_strategies,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-xl">Clean your data</h2>
          <p className="text-xs mt-0.5 text-inkSoft">
            Choose a strategy per column, then apply. The backend writes a new cleaned file and logs the action.
          </p>
        </div>
        <div className="flex gap-2">
          {isCleaned && (
            <GhostButton onClick={onReset} className="text-sm px-4 py-2 flex items-center gap-2">
              <RefreshCw size={13} /> Reset to raw
            </GhostButton>
          )}
          <PrimaryButton onClick={handleApply} disabled={isApplying} className="text-sm px-4 py-2 flex items-center gap-2">
            <CheckCircle2 size={14} /> {isApplying ? "Applying…" : "Apply cleaning"}
          </PrimaryButton>
        </div>
      </div>

      <div className="mb-4"><ErrorBlock message={error} /></div>

      <div className="bg-panel border border-line rounded-lg p-4 mb-5">
        <div className="text-sm font-semibold mb-3">Whole-dataset options</div>
        <div className="flex flex-wrap gap-5">
          <ToggleRow label="Remove duplicate rows" checked={dropDuplicates} onChange={setDropDuplicates} />
          <ToggleRow label="Auto-fix data types" checked={autoFixDtypes} onChange={setAutoFixDtypes} />
          <ToggleRow label="Drop rows with any missing value" checked={dropAnyMissing} onChange={setDropAnyMissing} />
        </div>
      </div>

      {columnsWithMissing.length === 0 ? (
        <div className="bg-panel border border-line rounded-lg p-5 text-sm flex items-center gap-2 text-inkSoft">
          <CheckCircle2 size={15} className="text-pine" /> No missing values found in any column.
        </div>
      ) : (
        <div className="bg-panel border border-line rounded-lg divide-y divide-line">
          {columnsWithMissing.map((col) => (
            <div key={col.name} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-40 shrink-0">
                <div className="font-mono text-sm font-medium truncate">{col.name}</div>
                <div className="text-[11px] text-brick">
                  {col.missing_count} missing ({col.missing_pct.toFixed(1)}%)
                </div>
              </div>
              <select
                className="border border-lineStrong rounded-md text-sm px-3 py-1.5 bg-panel"
                value={strategies[col.name]?.strategy || "none"}
                onChange={(e) => setColumnStrategy(col.name, e.target.value, strategies[col.name]?.constant_value)}
              >
                <option value="none">Leave as-is</option>
                <option value="drop">Drop rows</option>
                {col.inferred_type === "numeric" && <option value="mean">Fill with mean</option>}
                {col.inferred_type === "numeric" && <option value="median">Fill with median</option>}
                <option value="mode">Fill with mode</option>
                <option value="constant">Fill with custom value</option>
              </select>
              {strategies[col.name]?.strategy === "constant" && (
                <input
                  className="border border-lineStrong rounded-md text-sm px-3 py-1.5 w-40"
                  placeholder="Custom value"
                  value={strategies[col.name]?.constant_value || ""}
                  onChange={(e) => setColumnStrategy(col.name, "constant", e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {isApplying && <LoadingBlock label="Cleaning on the backend…" />}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-pine" />
      {label}
    </label>
  );
}
