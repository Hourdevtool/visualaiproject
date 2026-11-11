/**
 * Admin — Projects Management Page
 * ==================================
 * Features:
 *  - Paginated, searchable list of ALL projects across all users
 *  - Toggle public/private visibility (no password)
 *  - Delete with mandatory reason → action password modal → email sent to owner via Resend
 *  - Auto-refresh every 30 s
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  Search,
  Trash2,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Mail,
  ShieldAlert,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const PAGE_SIZE = 20;
const REFRESH_MS = 30_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectOwner {
  id: string;
  username: string;
  email: string;
  profile: string | null;
}

interface AdminProject {
  id: string;
  project_name: string;
  description: string | null;
  category: string | null;
  status: string;
  createdat: string;
  owner: ProjectOwner;
  is_public?: boolean;
}

interface ProjectsResponse {
  total: number;
  page: number;
  page_size: number;
  projects: AdminProject[];
}

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
    const id = setTimeout(onClose, 5000);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl ghost-border glass-panel max-w-sm ${kind === "success" ? "border-green-500/30" : "border-red-500/30"}`}>
      {kind === "success"
        ? <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
        : <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
      }
      <span className="body-md text-base text-white">{message}</span>
      <button onClick={onClose} className="ml-auto text-[#9a9a9a] hover:text-white cursor-pointer"><X size={18} /></button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete modal — password + reason
// ---------------------------------------------------------------------------

function DeleteModal({
  project,
  onConfirm,
  onCancel,
}: {
  project: AdminProject;
  onConfirm: (password: string, reason: string) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [reason,   setReason]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { reasonRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !reason.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onConfirm(password, reason.trim());
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-panel ghost-border rounded-2xl shadow-ambient w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--outline-variant)]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-red-400" />
            <h2 className="text-lg font-bold text-white">
              {t("admin.projects.deleteTitle")}
            </h2>
          </div>
          <button onClick={onCancel} className="text-[#9a9a9a] hover:text-white cursor-pointer transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Project info */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <p className="text-sm text-[#9a9a9a]">
              {t("admin.projects.deleteConfirmText")}{" "}
              <strong className="text-white">"{project.project_name}"</strong>
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Mail size={12} className="text-[#6a6a6a]" />
              <p className="text-xs text-[#9a9a9a]">
                {t("admin.projects.emailWillBeSentTo")}{" "}
              <span className="text-[var(--primary)] font-bold">{project.owner.email}</span>
              </p>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="label-sm text-xs text-[#9a9a9a] uppercase tracking-widest">
              {t("admin.projects.reasonLabel")} <span className="text-red-400">*</span>
            </label>
            <textarea
              ref={reasonRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("admin.projects.reasonPlaceholder")}
              rows={3}
              className="input-field w-full resize-none text-base p-4"
              required
            />
          </div>

          {/* Action password */}
          <div className="space-y-1">
            <label className="label-sm text-xs text-[#9a9a9a] uppercase tracking-widest">
              {t("admin.users.passwordLabel")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("admin.users.passwordPlaceholder")}
              className="input-field w-full"
              required
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} disabled={loading} className="btn btn-secondary flex-1">
              {t("admin.users.btnCancel")}
            </button>
            <button
              type="submit"
              disabled={loading || !password || !reason.trim()}
              className="btn bg-red-600 hover:bg-red-500 text-white flex-1 disabled:opacity-50 rounded-xl px-4 py-3 text-base font-bold cursor-pointer transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("admin.projects.btnDeleting")}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Trash2 size={14} />
                  {t("admin.projects.btnDelete")}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending:    "bg-yellow-500/10 text-yellow-400",
    processing: "bg-blue-500/10 text-blue-400",
    completed:  "bg-green-500/10 text-green-400",
    failed:     "bg-red-500/10 text-red-400",
    waiting:    "bg-orange-500/10 text-orange-400",
  };
  const cls = colorMap[status.toLowerCase()] ?? "bg-[var(--surface-container-highest)] text-[#9a9a9a]";
  return (
    <span className={`chip text-[11px] font-bold px-2.5 py-1 ${cls}`}>{status}</span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminProjectsPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const [response, setResponse] = useState<ProjectsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [deleteTarget, setDeleteTarget] = useState<AdminProject | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);

  // Debounce
  useEffect(() => {
    const id = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(id);
  }, [search]);

  // Fetch
  const fetchProjects = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:      String(page),
        page_size: String(PAGE_SIZE),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res = await fetch(`${API_BASE}/api/admin/projects?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setResponse(await res.json());
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch]);

  useEffect(() => {
    fetchProjects();
    const id = setInterval(fetchProjects, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchProjects]);

  // Visibility toggle
  const toggleVisibility = async (project: AdminProject, isPublic: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/projects/${project.id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_public: isPublic }),
      });
      if (res.ok) {
        setToast({ message: t("admin.projects.successVisibility"), kind: "success" });
        fetchProjects();
      } else {
        const d = await res.json();
        setToast({ message: d.detail ?? "Error", kind: "error" });
      }
    } catch {
      setToast({ message: "Network error", kind: "error" });
    }
  };

  // Delete
  const handleDelete = async (password: string, reason: string) => {
    if (!deleteTarget || !token) return;
    const res = await fetch(`${API_BASE}/api/admin/projects/${deleteTarget.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action_password: password, reason }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.detail === "Invalid action password" ? t("admin.users.errorWrong") : d.detail);
    }
    setToast({ message: t("admin.projects.successDelete"), kind: "success" });
    setDeleteTarget(null);
    fetchProjects();
  };

  const totalPages = response ? Math.ceil(response.total / PAGE_SIZE) : 1;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">{t("admin.projects.title")}</h1>
          <p className="text-lg text-[#9a9a9a] mt-2">{t("admin.projects.subtitle")}</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.projects.searchPlaceholder")}
            className="input-field w-full pl-10 py-3 text-base"
          />
        </div>

        {/* Table */}
        <div className="glass-panel ghost-border rounded-2xl overflow-hidden shadow-ambient">
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-[var(--outline-variant)]">
                  {[
                    t("admin.projects.colName"),
                    t("admin.projects.colOwner"),
                    t("admin.projects.colCategory"),
                    t("admin.projects.colStatus"),
                    t("admin.projects.colCreated"),
                    t("admin.projects.colActions"),
                  ].map((col) => (
                    <th key={col} className="text-left px-5 py-4 label-sm text-[#6a6a6a] text-xs uppercase tracking-widest font-bold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-[var(--outline-variant)]/50">
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-4 rounded bg-[var(--surface-container-highest)] animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : response?.projects.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16">
                        <FolderKanban size={32} className="mx-auto mb-3 text-[#6a6a6a] opacity-30" />
                        <p className="text-[#6a6a6a] text-sm">{t("admin.projects.noProjects")}</p>
                      </td>
                    </tr>
                  )
                  : response?.projects.map((proj) => (
                      <tr
                        key={proj.id}
                        className="border-b border-[var(--outline-variant)]/50 hover:bg-[var(--surface-container)]/40 transition-colors duration-150"
                      >
                        {/* Project name */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <FolderKanban size={14} className="text-[var(--primary)] flex-shrink-0" />
                            <span className="text-white font-bold text-base truncate max-w-[200px]">
                              {proj.project_name}
                            </span>
                          </div>
                          {proj.description && (
                            <p className="text-[#6a6a6a] text-sm mt-1 truncate max-w-[200px]">
                              {proj.description}
                            </p>
                          )}
                        </td>
                        {/* Owner */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {proj.owner.profile ? (
                              <img
                                src={proj.owner.profile.startsWith('/') ? `${API_BASE}${proj.owner.profile}` : proj.owner.profile}
                                alt={proj.owner.username}
                                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-[var(--surface-container-highest)] flex items-center justify-center flex-shrink-0">
                                <span className="text-xs text-[#9a9a9a] font-bold uppercase">
                                  {proj.owner.username[0]}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-white text-sm font-bold truncate">{proj.owner.username}</p>
                              <p className="text-[#6a6a6a] text-xs truncate">{proj.owner.email}</p>
                            </div>
                          </div>
                        </td>
                        {/* Category */}
                        <td className="px-5 py-5 text-[#9a9a9a] text-sm">{proj.category ?? "—"}</td>
                        {/* Status */}
                        <td className="px-5 py-4"><StatusBadge status={proj.status} /></td>
                        {/* Created */}
                        <td className="px-5 py-5 text-[#6a6a6a] text-sm font-mono whitespace-nowrap">
                          {new Date(proj.createdat).toLocaleDateString()}
                        </td>
                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Visibility toggle */}
                            <button
                              onClick={() => toggleVisibility(proj, !proj.is_public)}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border border-[var(--outline-variant)] text-[#9a9a9a] hover:text-white hover:border-white/30 transition-all duration-200 cursor-pointer"
                            >
                              {proj.is_public
                                ? <><EyeOff size={15} /> {t("admin.projects.btnMakePrivate")}</>
                                : <><Eye    size={15} /> {t("admin.projects.btnMakePublic")}</>
                              }
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => setDeleteTarget(proj)}
                              title={t("admin.projects.btnDelete")}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
                            >
                              <Trash2 size={15} />
                              {t("admin.projects.btnDelete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {response && response.total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--outline-variant)]">
              <span className="text-xs text-[#6a6a6a]">{response.total} total</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-container)] disabled:opacity-30 transition-colors cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-white px-2">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-container)] disabled:opacity-30 transition-colors cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal
          project={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} kind={toast.kind} onClose={() => setToast(null)} />
      )}
    </>
  );
}
