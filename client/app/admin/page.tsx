/**
 * Admin Dashboard Page
 * ====================
 * Shows:
 *  - 3 stat cards: total users, total projects, banned accounts
 *  - A time-range selector (7 / 14 / 30 days)
 *  - A pure-CSS bar chart of daily registrations
 *
 * Data is auto-refreshed every 30 seconds without requiring a page reload.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/providers/LanguageProvider";
import { Users, FolderKanban, ShieldBan, TrendingUp, RefreshCw } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardStats {
  total_users: number;
  total_projects: number;
  banned_users: number;
}

interface DailyRegistration {
  date: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Stat card component
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  icon,
  accentColor,
  isLoading,
}: {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  accentColor: string;
  isLoading: boolean;
}) {
  return (
    <div className="glass-panel ghost-border rounded-2xl p-6 flex items-center gap-5 shadow-ambient">
      <div
        className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: accentColor + "20" }}
      >
        <span style={{ color: accentColor }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="label-sm text-[#9a9a9a] uppercase tracking-widest text-xs font-bold mb-1 truncate">{title}</p>
        {isLoading ? (
          <div className="h-8 w-20 rounded-lg bg-[var(--surface-container-highest)] animate-pulse" />
        ) : (
          <p className="text-3xl font-bold text-white font-['Space_Grotesk']">
            {(value ?? 0).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bar chart component (pure CSS — no library dependency)
// ---------------------------------------------------------------------------

function BarChart({
  data,
  isLoading,
  label,
}: {
  data: DailyRegistration[];
  isLoading: boolean;
  label: string;
}) {
  if (isLoading) {
    return (
      <div className="h-48 flex items-end gap-1.5 px-2 pb-6">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-[var(--surface-container-highest)] animate-pulse"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="relative">
      {/* Chart bars */}
      <div className="flex items-end gap-1 h-48 px-2 pb-8">
        {data.map((item, i) => {
          const heightPct = (item.count / maxCount) * 100;
          const shortDate = item.date.slice(5); // MM-DD
          return (
            <div key={item.date} className="flex-1 flex flex-col items-center gap-1 group">
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -translate-y-8 bg-[var(--inverse-surface)] text-[var(--inverse-on-surface)] text-sm font-bold rounded px-2 py-1 pointer-events-none whitespace-nowrap z-10">
                {item.count} {label}
              </div>
              {/* Bar */}
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-sm transition-all duration-500 ease-out"
                  style={{
                    height: `${heightPct}%`,
                    minHeight: item.count > 0 ? "4px" : "0",
                    background: `linear-gradient(to top, var(--primary-container), var(--primary))`,
                    opacity: 0.7 + (i / data.length) * 0.3,
                  }}
                />
              </div>
              {/* X-axis label — show every other tick to avoid crowding */}
              {i % Math.ceil(data.length / 7) === 0 && (
                <span className="text-[#6a6a6a] text-xs font-mono font-bold truncate w-full text-center">
                  {shortDate}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const REFRESH_INTERVAL_MS = 30_000;

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<DailyRegistration[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartDays, setChartDays] = useState<7 | 14 | 30>(7);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const token = (session as any)?.accessToken as string | undefined;

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStats(await res.json());
        setLastUpdated(new Date());
      }
    } catch {
      // silent — will retry next interval
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  const fetchChart = useCallback(async () => {
    if (!token) return;
    setChartLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/dashboard/registrations?days=${chartDays}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) setChartData(await res.json());
    } catch {
      // silent
    } finally {
      setChartLoading(false);
    }
  }, [token, chartDays]);

  // ── Auto-refresh ─────────────────────────────────────────────────────────

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchStats]);

  useEffect(() => {
    fetchChart();
    const id = setInterval(fetchChart, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchChart]);

  // ── Render ────────────────────────────────────────────────────────────────

  const rangOptions: { days: 7 | 14 | 30; label: string }[] = [
    { days: 7, label: t("admin.dashboard.last7days") },
    { days: 14, label: t("admin.dashboard.last14days") },
    { days: 30, label: t("admin.dashboard.last30days") },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">{t("admin.dashboard.title")}</h1>
          <p className="text-lg text-[#9a9a9a] mt-2">{t("admin.dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 text-[#6a6a6a] text-xs">
          <RefreshCw size={12} />
          {lastUpdated && (
            <span>
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={t("admin.dashboard.totalUsers")}
          value={stats?.total_users}
          icon={<Users size={22} />}
          accentColor="#ffb1c5"
          isLoading={statsLoading}
        />
        <StatCard
          title={t("admin.dashboard.totalProjects")}
          value={stats?.total_projects}
          icon={<FolderKanban size={22} />}
          accentColor="#a78bfa"
          isLoading={statsLoading}
        />
        <StatCard
          title={t("admin.dashboard.bannedUsers")}
          value={stats?.banned_users}
          icon={<ShieldBan size={22} />}
          accentColor="#f87171"
          isLoading={statsLoading}
        />
      </div>

      {/* Registration chart */}
      <div className="glass-panel ghost-border rounded-2xl p-6 shadow-ambient">
        {/* Chart header + range selector */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-[var(--primary)]" />
            <h2 className="text-lg font-bold text-white">{t("admin.dashboard.chartTitle")}</h2>
          </div>
          <div className="flex items-center gap-1 bg-[var(--surface-container)] rounded-xl p-1">
            {rangOptions.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setChartDays(opt.days)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer
                  ${chartDays === opt.days
                    ? "bg-[var(--primary-container)] text-white"
                    : "text-[#9a9a9a] hover:text-white"
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <BarChart
          data={chartData}
          isLoading={chartLoading}
          label={t("admin.dashboard.registrations")}
        />
      </div>
    </div>
  );
}
