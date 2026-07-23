import React, { useRef, useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { ErrorBlock } from "./ui/Shared.jsx";

export default function UploadPanel({ onUpload, isUploading, error }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div className="max-w-2xl mx-auto pt-10">
      <div className="text-center mb-8">
        <h1 className="font-display font-bold text-3xl mb-2">Turn a spreadsheet into insight</h1>
        <p className="text-sm text-inkSoft">
          Upload a CSV or Excel file. InsightHub profiles it, helps you clean it, and builds a dashboard
          automatically — no formulas required.
        </p>
      </div>

      <div
        className={`ih-dropzone ${dragActive ? "drag-active" : ""} flex flex-col items-center justify-center py-16 px-6 cursor-pointer`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex items-center justify-center rounded-full mb-4 w-[52px] h-[52px] bg-pineSoft">
          <Upload size={22} className="text-pineDark" />
        </div>
        <div className="font-semibold text-sm mb-1">
          {isUploading ? "Uploading and profiling…" : "Drop a file here, or click to browse"}
        </div>
        <div className="font-mono text-[11px] text-inkFaint">.csv · .xlsx · .xls</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
        />
      </div>

      <div className="mt-4">
        <ErrorBlock message={error} />
      </div>

      <div className="grid grid-cols-3 gap-4 mt-10">
        {[
          { title: "Auto-profile", desc: "Row/column counts, types, missing values, and duplicates — instantly." },
          { title: "Guided cleaning", desc: "Fix missing values and dtypes per column, with a full audit trail." },
          { title: "Live dashboard", desc: "KPI cards and charts generated from what's actually in your data." },
        ].map((f) => (
          <div key={f.title} className="bg-panel border border-line rounded-lg p-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold mb-1">
              <FileSpreadsheet size={13} className="text-pine" /> {f.title}
            </div>
            <div className="text-xs leading-relaxed text-inkSoft">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
