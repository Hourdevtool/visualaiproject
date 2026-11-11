

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  Settings2,
  ListFilter,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  User,
  Globe,
  Activity,
  Lock,
  ShieldCheck,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SystemLog {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  createdat: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const PAGE_SIZE = 50;
const REFRESH_MS = 30_000;

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({
  message,
  kind,
  onClose,
}: {
  message: string;
  kind: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const id = setTimeout(onClose, 4000);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl ghost-border glass-panel max-w-sm ${kind === "success" ? "border-green-500/30" : "border-red-500/30"}`}>
      {kind === "success"
        ? <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
        : <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
      }
      <span className="body-md text-sm text-white">{message}</span>
      <button onClick={onClose} className="ml-auto text-[#9a9a9a] hover:text-white cursor-pointer"><X size={16} /></button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HTTP status colour
// ---------------------------------------------------------------------------

function statusColor(code: unknown): string {
  const n = Number(code);
  if (n >= 500) return "text-red-400";
  if (n >= 400) return "text-orange-400";
  if (n >= 300) return "text-yellow-400";
  if (n >= 200) return "text-green-400";
  return "text-[#9a9a9a]";
}

// ---------------------------------------------------------------------------
// Single log row
// ---------------------------------------------------------------------------

function LogRow({ log }: { log: SystemLog }) {
  const [expanded, setExpanded] = useState(false);
  const statusCode = log.details?.status_code as number | undefined;
  const parts = log.action.split(" ");
  const method = parts[0];
  const path = parts.slice(1).join(" ");

  const methodColor: Record<string, string> = {
    GET: "text-blue-400",
    POST: "text-green-400",
    PATCH: "text-yellow-400",
    PUT: "text-yellow-400",
    DELETE: "text-red-400",
  };

  return (
    <div className="border-b border-[var(--outline-variant)]/40 last:border-0 hover:bg-[var(--surface-container)]/30 transition-colors duration-150">
      <button
        className="w-full flex items-center gap-4 px-5 py-3 text-left cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {/* Time */}
        <span className="text-[#6a6a6a] text-xs font-mono whitespace-nowrap w-28 flex-shrink-0">
          {new Date(log.createdat).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
        {/* Method + Path */}
        <span className="flex-1 text-sm font-mono truncate min-w-0">
          <span className={`font-bold mr-2 ${methodColor[method] ?? "text-white"}`}>{method}</span>
          <span className="text-[#c2c2c2]">{path}</span>
        </span>
        {/* User */}
        <span className="w-24 text-xs text-[#9a9a9a] truncate flex-shrink-0 hidden md:block">
          {log.user_id ? log.user_id.slice(0, 8) + "…" : "—"}
        </span>
        {/* IP */}
        <span className="w-28 text-xs text-[#9a9a9a] font-mono truncate flex-shrink-0 hidden lg:block">
          {log.ip_address ?? "—"}
        </span>
        {/* Status */}
        <span className={`w-12 text-xs font-bold flex-shrink-0 ${statusColor(statusCode)}`}>
          {statusCode ?? "—"}
        </span>
        <ChevronDown
          size={14}
          className={`text-[#6a6a6a] flex-shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="px-5 pb-4">
          <pre className="text-xs text-[#9a9a9a] bg-[var(--surface-container-lowest)] rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(log.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3 border-b border-[var(--outline-variant)]/40">
      <div className="h-3 w-24 rounded bg-[var(--surface-container-highest)] animate-pulse flex-shrink-0" />
      <div className="h-3 flex-1 rounded bg-[var(--surface-container-highest)] animate-pulse" />
      <div className="h-3 w-20 rounded bg-[var(--surface-container-highest)] animate-pulse flex-shrink-0" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminLogsPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  // ── Retention ─────────────────────────────────────────────────────────────
  const [retentionDays, setRetentionDays] = useState(90);
  const [inputDays, setInputDays] = useState("90");
  const [savingRetention, setSavingRetention] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);

  // ── Logs ──────────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ── Password Gate ─────────────────────────────────────────────────────────
  const [isVerified, setIsVerified] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [passError, setPassError] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !passInput) return;
    setVerifying(true);
    setPassError(false);
    try {
      const res = await fetch(`${API_BASE}/api/admin/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: passInput }),
      });
      if (res.ok) {
        setIsVerified(true);
      } else {
        setPassError(true);
      }
    } catch {
      setPassError(true);
    } finally {
      setVerifying(false);
    }
  };

  // ── Fetch retention ────────────────────────────────────────────────────────

  const fetchRetention = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/logs/retention`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRetentionDays(data.log_retention_days);
        setInputDays(String(data.log_retention_days));
      }
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => { 
    if (isVerified) fetchRetention(); 
  }, [fetchRetention, isVerified]);

  // ── Save retention ─────────────────────────────────────────────────────────

  const saveRetention = async (e: React.FormEvent) => {
    e.preventDefault();
    const days = parseInt(inputDays, 10);
    if (isNaN(days) || days < 1 || !token) return;
    setSavingRetention(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/logs/retention`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ days }),
      });
      if (res.ok) {
        setRetentionDays(days);
        setToast({ message: t("admin.logConfig.savedSuccess"), kind: "success" });
      } else {
        const data = await res.json();
        setToast({ message: data.detail ?? "Error", kind: "error" });
      }
    } finally {
      setSavingRetention(false);
    }
  };

  // ── Fetch logs (full replace on every call — simpler and correct) ──────────

  const fetchLogs = useCallback(async (p: number) => {
    if (!token) return;
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        page_size: String(PAGE_SIZE),
        ...(filter ? { action_filter: filter } : {}),
      });
      const res = await fetch(`${API_BASE}/api/admin/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTotal(data.total ?? 0);
        // When loading page 1 replace; when loading more, append
        setLogs((prev) => (p === 1 ? data.logs ?? [] : [...prev, ...(data.logs ?? [])]));
        setLastUpdated(new Date());
      }
    } catch { /* silent */ }
    finally {
      setLogsLoading(false);
    }
  }, [token, filter, isVerified]);

  // Reset and reload when filter, token, or verification status changes
  useEffect(() => {
    if (!isVerified) return;
    setPage(1);
    setLogs([]);
    fetchLogs(1);
    const id = setInterval(() => fetchLogs(1), REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchLogs, isVerified]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchLogs(next);
  };

  const hasMore = logs.length > 0 && logs.length < total;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!isVerified) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-panel ghost-border rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-[var(--primary)]/20">
            <ShieldCheck size={32} className="text-black" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Restricted Area</h2>
            <p className="text-sm text-[#9a9a9a]">
              Please enter the administrator action password to access the system logs.
            </p>
          </div>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                placeholder="Action Password"
                autoFocus
                className={`input-field w-full pl-6 py-4 ${passError ? "border-red-500/50 ring-red-500/10" : ""}`}
              />
            </div>
            {passError && (
              <p className="text-xs text-red-400 font-medium">Invalid password. Please try again.</p>
            )}
            <button
              disabled={verifying || !passInput}
              className="w-full py-4 bg-[var(--primary)] text-black font-bold tracking-widest text-sm rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {verifying ? "VERIFYING..." : "GRANT ACCESS"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="headline-lg text-white">{t("admin.logConfig.title")}</h1>
          <p className="body-md text-[#9a9a9a] mt-1">{t("admin.logConfig.subtitle")}</p>
        </div>

        {/* ── Retention card ── */}
        <div className="glass-panel ghost-border rounded-2xl p-6 shadow-ambient">
          <div className="flex items-center gap-2 mb-5">
            <Settings2 size={18} className="text-[var(--primary)]" />
            <h2 className="label-md text-white font-semibold">{t("admin.logConfig.retentionLabel")}</h2>
          </div>

          <form onSubmit={saveRetention} className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1 flex-1 min-w-[160px] max-w-xs">
              <label className="label-sm text-xs text-[#9a9a9a] uppercase tracking-widest">
                {t("admin.logConfig.retentionLabel")} ({t("admin.logConfig.retentionUnit")})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={inputDays}
                  onChange={(e) => setInputDays(e.target.value)}
                  className="input-field w-24 text-center text-lg font-bold"
                  required
                />
                <span className="text-[#9a9a9a] text-sm">{t("admin.logConfig.retentionUnit")}</span>
              </div>
              <p className="text-xs text-[#6a6a6a]">{t("admin.logConfig.retentionHint")}</p>
            </div>
            <button
              type="submit"
              disabled={savingRetention || parseInt(inputDays) === retentionDays}
              className="btn btn-primary disabled:opacity-50"
            >
              {savingRetention ? t("admin.logConfig.btnSaving") : t("admin.logConfig.btnSave")}
            </button>
          </form>

          {/* Quick presets */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {[7, 14, 30, 60, 90, 180, 365].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setInputDays(String(d))}
                className={`chip cursor-pointer transition-all duration-200 hover:bg-[var(--surface-container-highest)] ${parseInt(inputDays) === d ? "bg-[var(--primary)]/20 text-[var(--primary)]" : ""
                  }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* ── Logs viewer ── */}
        <div className="glass-panel ghost-border rounded-2xl overflow-hidden shadow-ambient">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[var(--outline-variant)] flex-wrap">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-[var(--primary)]" />
              <h2 className="label-md text-white font-semibold">{t("admin.logConfig.logsTitle")}</h2>
              <span className="chip text-xs ml-1">{total.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <ListFilter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder={t("admin.logConfig.filterPlaceholder")}
                  className="input-field pl-8 py-2 text-sm w-48"
                />
              </div>
              {lastUpdated && (
                <span className="flex items-center gap-1 text-[#6a6a6a] text-xs">
                  <RefreshCw size={11} />
                  {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Column labels */}
          <div className="flex items-center gap-4 px-5 py-2 bg-[var(--surface-container-lowest)] border-b border-[var(--outline-variant)]/50">
            <div className="w-28 flex-shrink-0 flex items-center gap-1 label-sm text-[#6a6a6a] text-[10px] uppercase tracking-widest">
              <Clock size={10} /> {t("admin.logConfig.colTime")}
            </div>
            <div className="flex-1 flex items-center gap-1 label-sm text-[#6a6a6a] text-[10px] uppercase tracking-widest">
              <Activity size={10} /> {t("admin.logConfig.colAction")}
            </div>
            <div className="w-24 flex-shrink-0 hidden md:flex items-center gap-1 label-sm text-[#6a6a6a] text-[10px] uppercase tracking-widest">
              <User size={10} /> {t("admin.logConfig.colUser")}
            </div>
            <div className="w-28 flex-shrink-0 hidden lg:flex items-center gap-1 label-sm text-[#6a6a6a] text-[10px] uppercase tracking-widest">
              <Globe size={10} /> {t("admin.logConfig.colIP")}
            </div>
            <div className="w-12 flex-shrink-0 label-sm text-[#6a6a6a] text-[10px] uppercase tracking-widest">
              {t("admin.logConfig.colStatus")}
            </div>
            <div className="w-4 flex-shrink-0" />
          </div>

          {/* Rows */}
          {logsLoading && logs.length === 0 ? (
            Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#6a6a6a]">
              <Activity size={32} className="mb-3 opacity-30" />
              <p className="text-sm">{t("admin.logConfig.noLogs")}</p>
            </div>
          ) : (
            <>
              {logs.map((log) => <LogRow key={log.id} log={log} />)}

              {hasMore && (
                <div className="flex justify-center p-4 border-t border-[var(--outline-variant)]">
                  <button
                    onClick={loadMore}
                    disabled={logsLoading}
                    className="btn btn-secondary flex items-center gap-2 py-2 px-5 text-sm disabled:opacity-50"
                  >
                    <ChevronDown size={16} />
                    {t("admin.logConfig.loadMore")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} kind={toast.kind} onClose={() => setToast(null)} />
      )}
    </>
  );
}
