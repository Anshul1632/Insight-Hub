import React from "react";
import { Loader2, AlertCircle } from "lucide-react";

export const TYPE_META = {
  numeric: { label: "numeric", text: "text-pineDark", bg: "bg-pineSoft" },
  categorical: { label: "categorical", text: "text-amber", bg: "bg-amberSoft" },
  datetime: { label: "datetime", text: "text-slate", bg: "bg-slateSoft" },
  boolean: { label: "boolean", text: "text-violet", bg: "bg-violetSoft" },
  text: { label: "text", text: "text-inkFaint", bg: "bg-line" },
};

export function TypeTag({ type }) {
  const meta = TYPE_META[type] || TYPE_META.text;
  return (
    <span className={`font-mono text-[10.5px] tracking-wide uppercase font-semibold px-1.5 py-0.5 rounded ${meta.text} ${meta.bg}`}>
      {meta.label}
    </span>
  );
}

export function MiniBar({ pct, tone = "amber" }) {
  const color = tone === "brick" ? "bg-brick" : tone === "pine" ? "bg-pine" : "bg-amber";
  return (
    <div className="w-full h-[5px] bg-line rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export function SummaryStat({ label, value, warn }) {
  return (
    <div className="bg-panel border border-line rounded-lg px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-wide text-inkFaint">{label}</div>
      <div className={`font-display font-bold text-2xl mt-0.5 ${warn ? "text-brick" : "text-ink"}`}>{value}</div>
    </div>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={`bg-pine hover:bg-pineDark disabled:opacity-40 disabled:cursor-not-allowed text-paper font-semibold border border-pineDark rounded-lg transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...props }) {
  return (
    <button
      className={`text-inkSoft hover:bg-pineSoft hover:border-pine hover:text-pineDark border border-lineStrong font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function LoadingBlock({ label = "Loading…" }) {
  return (
    <div className="flex items-center gap-2 text-sm text-inkSoft py-10 justify-center">
      <Loader2 size={16} className="animate-spin" /> {label}
    </div>
  );
}

export function ErrorBlock({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-lg bg-brickSoft text-brick">
      <AlertCircle size={15} /> {message}
    </div>
  );
}

export const PIE_COLORS = ["#1F5C50", "#C08A2E", "#55697A", "#6B5B95", "#A6503F", "#2E8B77", "#8A9A96"];

export function formatKPIValue(kpi) {
  if (kpi.value === null || kpi.value === undefined || Number.isNaN(kpi.value)) return "—";
  if (kpi.format === "currency") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(kpi.value);
  }
  if (kpi.format === "percent") {
    return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(kpi.value / 100);
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(kpi.value);
}
