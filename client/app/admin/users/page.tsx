
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  Search,
  ShieldCheck,
  ShieldBan,
  Crown,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const PAGE_SIZE = 20;
const REFRESH_MS = 30_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  permission: boolean;
  provider: string;
  profile: string | null;
  createat: string;
}

interface UsersResponse {
  total: number;
  page: number;
  page_size: number;
  users: UserRow[];
}

type ActionType = "ban" | "unban" | "promote";

interface PendingAction {
  type: ActionType;
  user: UserRow;
}

// ---------------------------------------------------------------------------
// Toast component
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
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-[100] flex items-center gap-3
        px-5 py-3.5 rounded-2xl shadow-2xl ghost-border
        glass-panel max-w-sm animate-in slide-in-from-bottom-4
        ${kind === "success" ? "border-green-500/30" : "border-red-500/30"}
      `}
    >
      {kind === "success" ? (
        <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
      ) : (
        <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
      )}
      <span className="body-md text-base text-white">{message}</span>
      <button onClick={onClose} className="ml-auto text-[#9a9a9a] hover:text-white cursor-pointer">
        <X size={16} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action password modal
// ---------------------------------------------------------------------------

function ActionModal({
  action,
  onConfirm,
  onCancel,
  t,
}: {
  action: PendingAction;
  onConfirm: (password: string) => Promise<void>;
  onCancel: () => void;
  t: (key: string) => string;
}) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      await onConfirm(password);
    } catch (err: any) {
      setError(err.message || t("admin.users.errorWrong"));
    } finally {
      setLoading(false);
    }
  };

  const actionLabelMap: Record<ActionType, string> = {
    ban:     t("admin.users.modalBan"),
    unban:   t("admin.users.modalUnban"),
    promote: t("admin.users.modalPromote"),
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-panel ghost-border rounded-2xl shadow-ambient w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--outline-variant)]">
          <h2 className="text-lg font-bold text-white">{t("admin.users.modalTitle")}</h2>
          <button onClick={onCancel} className="text-[#9a9a9a] hover:text-white cursor-pointer transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <p className="text-sm text-[#9a9a9a]">
              <span className="text-white font-semibold text-base">{actionLabelMap[action.type]}: </span>
              <span className="text-white text-base">{action.user.username}</span>
            </p>
            <p className="text-xs text-[#6a6a6a] mt-1">{t("admin.users.modalDesc")}</p>
          </div>

          {/* Password input */}
          <div className="space-y-1">
            <label className="label-sm text-xs text-[#9a9a9a] uppercase tracking-widest">
              {t("admin.users.passwordLabel")}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("admin.users.passwordPlaceholder")}
                className="input-field w-full pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9a9a] hover:text-white cursor-pointer transition-colors"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary flex-1"
              disabled={loading}
            >
              {t("admin.users.btnCancel")}
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="btn btn-primary flex-1 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  {t("admin.users.btnConfirm")}
                </span>
              ) : (
                t("admin.users.btnConfirm")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role / status badges
// ---------------------------------------------------------------------------

function RoleBadge({ role, t }: { role: string; t: (k: string) => string }) {
  return (
    <span
      className={`chip text-[11px] font-bold px-2.5 py-1 ${
        role === "admin"
          ? "bg-[var(--primary)]/20 text-[var(--primary)]"
          : "bg-[var(--surface-container-highest)] text-[#9a9a9a]"
      }`}
    >
      {role === "admin" ? t("admin.users.roleAdmin") : t("admin.users.roleUser")}
    </span>
  );
}

function StatusBadge({ active, t }: { active: boolean; t: (k: string) => string }) {
  return (
    <span
      className={`chip text-[11px] font-bold px-2.5 py-1 ${
        active
          ? "bg-green-500/10 text-green-400"
          : "bg-red-500/10 text-red-400"
      }`}
    >
      {active ? t("admin.users.statusActive") : t("admin.users.statusBanned")}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------



export default function AdminUsersPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  const [response, setResponse] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);

  // ── Debounce search ───────────────────────────────────────────────────────

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  // ── Fetch users ───────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res = await fetch(`${API_BASE}/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setResponse(await res.json());
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
    const id = setInterval(fetchUsers, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchUsers]);

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleConfirm = async (password: string) => {
    if (!pendingAction || !token) return;
    const { type, user } = pendingAction;

    let url = "";
    let body: Record<string, unknown> = { action_password: password };

    if (type === "ban")     { url = `/api/admin/users/${user.id}/permission`; body = { ...body, permission: false }; }
    if (type === "unban")   { url = `/api/admin/users/${user.id}/permission`; body = { ...body, permission: true }; }
    if (type === "promote") { url = `/api/admin/users/${user.id}/promote`; }

    const res = await fetch(`${API_BASE}${url}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail === "Invalid action password" ? t("admin.users.errorWrong") : data.detail);
    }

    const successMap: Record<ActionType, string> = {
      ban:     t("admin.users.successBan"),
      unban:   t("admin.users.successUnban"),
      promote: t("admin.users.successPromote"),
    };

    setToast({ message: successMap[type], kind: "success" });
    setPendingAction(null);
    fetchUsers();
  };

  // ── Pagination ────────────────────────────────────────────────────────────

  const totalPages = response ? Math.ceil(response.total / PAGE_SIZE) : 1;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">{t("admin.users.title")}</h1>
          <p className="text-lg text-[#9a9a9a] mt-2">{t("admin.users.subtitle")}</p>
        </div>

        {/* Search bar */}
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.users.searchPlaceholder")}
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
                    t("admin.users.colName"),
                    t("admin.users.colEmail"),
                    t("admin.users.colRole"),
                    t("admin.users.colStatus"),
                    t("admin.users.colJoined"),
                    t("admin.users.colActions"),
                  ].map((col) => (
                    <th
                      key={col}
                      className="text-left px-5 py-4 label-sm text-[#6a6a6a] text-xs uppercase tracking-widest font-bold"
                    >
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
                  : response?.users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-[var(--outline-variant)]/50 hover:bg-[var(--surface-container)]/40 transition-colors duration-150"
                      >
                        {/* Name */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {user.profile ? (
                              <img
                                src={user.profile.startsWith('/') ? `${API_BASE}${user.profile}` : user.profile}
                                alt={user.username}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[var(--surface-container-highest)] flex items-center justify-center flex-shrink-0">
                                <span className="text-sm text-[#9a9a9a] font-bold uppercase">
                                  {user.username[0]}
                                </span>
                              </div>
                            )}
                            <span className="text-white font-bold text-base truncate max-w-[150px]">{user.username}</span>
                          </div>
                        </td>
                        {/* Email */}
                        <td className="px-5 py-5 text-[#9a9a9a] text-base truncate max-w-[200px]">{user.email}</td>
                        {/* Role */}
                        <td className="px-5 py-4"><RoleBadge role={user.role} t={t} /></td>
                        {/* Status */}
                        <td className="px-5 py-4"><StatusBadge active={user.permission} t={t} /></td>
                        {/* Joined */}
                        <td className="px-5 py-5 text-[#6a6a6a] text-sm font-mono whitespace-nowrap">
                          {new Date(user.createat).toLocaleDateString()}
                        </td>
                        {/* Actions */}
                        <td className="px-5 py-4">
                          {user.role !== "admin" && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Ban / Unban */}
                              <button
                                onClick={() => setPendingAction({ type: user.permission ? "ban" : "unban", user })}
                                title={user.permission ? t("admin.users.btnBan") : t("admin.users.btnUnban")}
                                className={`
                                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold
                                  transition-all duration-200 cursor-pointer border
                                  ${user.permission
                                    ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                                    : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                                  }
                                `}
                              >
                                {user.permission ? <ShieldBan size={15} /> : <ShieldCheck size={15} />}
                                {user.permission ? t("admin.users.btnBan") : t("admin.users.btnUnban")}
                              </button>

                              {/* Promote */}
                              <button
                                onClick={() => setPendingAction({ type: "promote", user })}
                                title={t("admin.users.btnPromote")}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all duration-200 cursor-pointer"
                              >
                                <Crown size={15} />
                                {t("admin.users.btnPromote")}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {response && response.total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--outline-variant)]">
              <span className="text-xs text-[#6a6a6a]">
                {response.total} total
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-container)] disabled:opacity-30 transition-colors cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-white px-2">
                  {page} / {totalPages}
                </span>
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

      {/* Action password modal */}
      {pendingAction && (
        <ActionModal
          action={pendingAction}
          onConfirm={handleConfirm}
          onCancel={() => setPendingAction(null)}
          t={t}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          kind={toast.kind}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
