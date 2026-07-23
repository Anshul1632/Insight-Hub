import React, { useCallback, useMemo, useState } from "react";
import { Sparkles, FileSpreadsheet, Trash2, Table as TableIcon, ChevronRight } from "lucide-react";
import api from "./api.js";
import UploadPanel from "./components/UploadPanel.jsx";
import ProfilePanel from "./components/ProfilePanel.jsx";
import CleanPanel from "./components/CleanPanel.jsx";
import EDAPanel from "./components/EDAPanel.jsx";
import DashboardPanel from "./components/DashboardPanel.jsx";
import TablePanel from "./components/TablePanel.jsx";

const STEPS = [
  { id: "upload", num: "01", label: "Upload" },
  { id: "profile", num: "02", label: "Profile" },
  { id: "clean", num: "03", label: "Clean" },
  { id: "eda", num: "04", label: "Analyze" },
  { id: "dashboard", num: "05", label: "Dashboard" },
];

const TABLE_PAGE_SIZE = 12;

export default function App() {
  const [step, setStep] = useState("upload");
  const [dataset, setDataset] = useState(null); // { id, original_filename }
  const [profile, setProfile] = useState(null);
  const [isCleaned, setIsCleaned] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const [cleanApplying, setCleanApplying] = useState(false);
  const [cleanError, setCleanError] = useState(null);

  const [eda, setEda] = useState(null);
  const [edaLoading, setEdaLoading] = useState(false);
  const [edaError, setEdaError] = useState(null);
  const [edaFetchedFor, setEdaFetchedFor] = useState(null); // avoid refetch loops

  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);
  const [dashboardFetchedFor, setDashboardFetchedFor] = useState(null);

  const [tablePage, setTablePage] = useState(1);
  const [table, setTable] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState(null);
  const [tableFetchedKey, setTableFetchedKey] = useState(null);

  const colTypes = useMemo(() => {
    const map = {};
    (profile?.columns || []).forEach((c) => { map[c.name] = c.inferred_type; });
    return map;
  }, [profile]);

  const categoricalColumns = useMemo(
    () => (profile?.columns || []).filter((c) => c.inferred_type === "categorical").map((c) => c.name),
    [profile]
  );

  const unlockedSteps = useMemo(() => {
    const set = new Set(["upload"]);
    if (dataset) { set.add("profile"); set.add("clean"); set.add("eda"); set.add("dashboard"); }
    return set;
  }, [dataset]);

  /* ---------------- upload ---------------- */

  const handleUpload = useCallback(async (file) => {
    setUploading(true);
    setUploadError(null);
    try {
      const result = await api.uploadDataset(file);
      setDataset({ id: result.dataset_id, original_filename: file.name });
      setProfile(result); // ProfileReport already includes n_rows/n_columns/columns
      setIsCleaned(false);
      setEda(null); setEdaFetchedFor(null);
      setDashboard(null); setDashboardFetchedFor(null);
      setTable(null); setTableFetchedKey(null); setTablePage(1);
      setStep("profile");
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }, []);

  const resetAll = useCallback(async () => {
    if (dataset) {
      try { await api.deleteDataset(dataset.id); } catch { /* best effort */ }
    }
    setDataset(null); setProfile(null); setIsCleaned(false);
    setEda(null); setEdaFetchedFor(null);
    setDashboard(null); setDashboardFetchedFor(null);
    setTable(null); setTableFetchedKey(null); setTablePage(1);
    setStep("upload");
  }, [dataset]);

  /* ---------------- profile refresh ---------------- */

  const refreshProfile = useCallback(async () => {
    if (!dataset) return;
    setProfileLoading(true);
    setProfileError(null);
    try {
      const result = await api.getProfile(dataset.id);
      setProfile(result);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  }, [dataset]);

  /* ---------------- cleaning ---------------- */

  const handleApplyCleaning = useCallback(async (payload) => {
    if (!dataset) return;
    setCleanApplying(true);
    setCleanError(null);
    try {
      await api.cleanDataset(dataset.id, payload);
      setIsCleaned(true);
      await refreshProfile();
      // Cleaning changes the underlying data, so downstream analysis is stale.
      setEda(null); setEdaFetchedFor(null);
      setDashboard(null); setDashboardFetchedFor(null);
      setTable(null); setTableFetchedKey(null); setTablePage(1);
    } catch (err) {
      setCleanError(err.message);
    } finally {
      setCleanApplying(false);
    }
  }, [dataset, refreshProfile]);

  const handleResetCleaning = useCallback(async () => {
    if (!dataset) return;
    setCleanApplying(true);
    setCleanError(null);
    try {
      await api.resetDataset(dataset.id);
      setIsCleaned(false);
      await refreshProfile();
      setEda(null); setEdaFetchedFor(null);
      setDashboard(null); setDashboardFetchedFor(null);
      setTable(null); setTableFetchedKey(null); setTablePage(1);
    } catch (err) {
      setCleanError(err.message);
    } finally {
      setCleanApplying(false);
    }
  }, [dataset, refreshProfile]);

  /* ---------------- step navigation with lazy fetching ---------------- */

  const goToStep = useCallback(async (id) => {
    setStep(id);
    if (!dataset) return;

    if (id === "eda" && edaFetchedFor !== dataset.id + String(isCleaned)) {
      setEdaLoading(true); setEdaError(null);
      try {
        const result = await api.getEDA(dataset.id);
        setEda(result);
        setEdaFetchedFor(dataset.id + String(isCleaned));
      } catch (err) {
        setEdaError(err.message);
      } finally {
        setEdaLoading(false);
      }
    }

    if (id === "dashboard" && dashboardFetchedFor !== dataset.id + String(isCleaned)) {
      setDashboardLoading(true); setDashboardError(null);
      try {
        const result = await api.getDashboard(dataset.id);
        setDashboard(result);
        setDashboardFetchedFor(dataset.id + String(isCleaned));
      } catch (err) {
        setDashboardError(err.message);
      } finally {
        setDashboardLoading(false);
      }
    }

    if (id === "table") {
      await loadTablePage(1);
    }
  }, [dataset, isCleaned, edaFetchedFor, dashboardFetchedFor]);

  const loadTablePage = useCallback(async (page) => {
    if (!dataset) return;
    const key = `${dataset.id}-${isCleaned}-${page}`;
    setTablePage(page);
    setTableLoading(true); setTableError(null);
    try {
      const result = await api.getTable(dataset.id, page, TABLE_PAGE_SIZE);
      setTable(result);
      setTableFetchedKey(key);
    } catch (err) {
      setTableError(err.message);
    } finally {
      setTableLoading(false);
    }
  }, [dataset, isCleaned]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg w-[34px] h-[34px] bg-pine">
            <Sparkles size={18} className="text-paper" />
          </div>
          <div>
            <div className="font-display font-bold text-lg tracking-tight leading-none">INSIGHTHUB</div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-inkFaint">
              instant analytics, any spreadsheet
            </div>
          </div>
        </div>
        {dataset && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-full bg-pineSoft text-pineDark">
              <FileSpreadsheet size={13} />
              {dataset.original_filename}
              <span className="text-inkFaint">·</span>
              {profile?.n_rows?.toLocaleString()} rows × {profile?.n_columns}
            </div>
            <button onClick={resetAll} className="border border-lineStrong rounded-lg text-xs px-3 py-1.5 flex items-center gap-1.5 text-inkSoft hover:bg-pineSoft hover:border-pine hover:text-pineDark">
              <Trash2 size={13} /> New file
            </button>
          </div>
        )}
      </div>

      <div className="flex" style={{ minHeight: 600 }}>
        {/* Left stepper */}
        <div className="px-5 py-6 w-[190px] border-r border-line">
          {STEPS.map((s) => {
            const unlocked = unlockedSteps.has(s.id);
            const active = step === s.id;
            return (
              <button
                key={s.id}
                disabled={!unlocked}
                onClick={() => unlocked && goToStep(s.id)}
                className={`w-full text-left pl-4 py-2.5 mb-1 flex items-center gap-2 border-l-2 transition-colors ${
                  active ? "border-pine text-pineDark" : unlocked ? "border-line hover:border-pine" : "border-line text-inkFaint cursor-not-allowed"
                }`}
              >
                <span className={`font-mono text-[11px] ${active ? "text-pine" : "text-inkFaint"}`}>{s.num}</span>
                <span className="text-sm font-medium">{s.label}</span>
                {active && <ChevronRight size={13} className="ml-auto text-pine" />}
              </button>
            );
          })}
          <div className="my-4 h-px bg-line" />
          <button
            disabled={!unlockedSteps.has("profile")}
            onClick={() => goToStep("table")}
            className={`w-full text-left pl-4 py-2.5 flex items-center gap-2 border-l-2 transition-colors ${
              step === "table" ? "border-pine text-pineDark" : unlockedSteps.has("profile") ? "border-line hover:border-pine" : "border-line text-inkFaint cursor-not-allowed"
            }`}
          >
            <TableIcon size={13} className={step === "table" ? "text-pine" : "text-inkFaint"} />
            <span className="text-sm font-medium">Data table</span>
          </button>
        </div>

        {/* Main panel */}
        <div className="flex-1 px-8 py-6">
          {step === "upload" && (
            <UploadPanel onUpload={handleUpload} isUploading={uploading} error={uploadError} />
          )}

          {step === "profile" && (
            <ProfilePanel profile={profile} isCleaned={isCleaned} onGoClean={() => goToStep("clean")} loading={profileLoading} error={profileError} />
          )}

          {step === "clean" && (
            <CleanPanel
              profile={profile}
              onApply={handleApplyCleaning}
              onReset={handleResetCleaning}
              isCleaned={isCleaned}
              isApplying={cleanApplying}
              error={cleanError}
            />
          )}

          {step === "eda" && (
            <EDAPanel eda={eda} loading={edaLoading} error={edaError} />
          )}

          {step === "dashboard" && (
            <DashboardPanel
              datasetId={dataset?.id}
              dashboard={dashboard}
              categoricalColumns={categoricalColumns}
              loading={dashboardLoading}
              error={dashboardError}
            />
          )}

          {step === "table" && (
            <TablePanel
              table={table}
              page={tablePage}
              setPage={loadTablePage}
              pageSize={TABLE_PAGE_SIZE}
              colTypes={colTypes}
              loading={tableLoading}
              error={tableError}
            />
          )}
        </div>
      </div>
    </div>
  );
}
