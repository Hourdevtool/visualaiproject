"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter, notFound } from "next/navigation";
import { useLanguage } from "../../../../providers/LanguageProvider";
import { motion, AnimatePresence } from "framer-motion";
import Loading from "../../../loading";
import { LayoutDashboard, Database, Beaker, Settings, ChevronLeft, Globe } from "lucide-react";
import Link from "next/link";

import DashboardTab from "./tabs/DashboardTab";
import DatasetTab from "./tabs/DatasetTab";
import TestingTab from "./tabs/TestingTab";
import SettingsTab from "./tabs/SettingsTab";
import PublicView from "./PublicView";
import { useSmartPolling } from "../../../../hooks/useSmartPolling";

// สถานะที่ถือว่า "จบแล้ว" — หยุด poll โดยอัตโนมัติ
const TERMINAL_STATUSES = ["ready", "error", "failed"];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const fetchProject = useCallback(async () => {
    const token = (session as any)?.accessToken;
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403 || res.status === 404) { notFound(); return; }
      if (!res.ok) throw new Error("Failed to fetch project");

      setProject(await res.json());
    } catch (err: any) {
      console.error(err);
      setError("An error occurred while loading the project.");
    } finally {
      setLoading(false);
    }
  }, [session, id]);

  // Initial load
  useEffect(() => {
    if (status === "authenticated") fetchProject();
    else if (status === "unauthenticated") router.push("/login");
  }, [status, id, session]);

  // Smart polling: poll เมื่อ project ยังไม่ถึง terminal status
  // ใช้ exponential backoff เพื่อลด load บน server
  useSmartPolling({
    fetchFn: fetchProject,
    shouldPoll: !!project && !TERMINAL_STATUSES.includes(project?.status),
    initialInterval: 3000,  // เริ่ม 3 วิ
    maxInterval: 30000,     // สูงสุด 30 วิ
    backoffMultiplier: 1.5, // 3s → 4.5s → 6.75s → ... → 30s
  });

  if (loading || status === "loading") {
    return <Loading />;
  }

  if (error) {
    notFound();
    return null;
  }

  if (!project) return null;

  const isOwner = project.is_owner;
  const isAdmin = (session?.user as any)?.role === "admin";
  const canEdit = isOwner || isAdmin;

  // If not owner/admin, show public GitHub-like view
  if (!canEdit) {
    return <PublicView project={project} />;
  }

  const tabs = [
    { id: "dashboard", label: t('projectDetail.tabs.dashboard') || "Dashboard", icon: LayoutDashboard },
    { id: "dataset", label: t('projectDetail.tabs.dataset') || "Dataset", icon: Database },
    { id: "testing", label: t('projectDetail.tabs.testing') || "Test Model", icon: Beaker },
    { id: "settings", label: t('projectDetail.tabs.settings') || "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 lg:px-12 relative z-10 text-gray-300">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/user" className="flex items-center text-sm text-gray-500 hover:text-[var(--primary)] transition-colors mb-4 group w-fit">
              <ChevronLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
              Back to Projects
            </Link>
            <h1 className="text-3xl font-bold font-['Space_Grotesk'] text-white flex items-center gap-3">
              {project.project_name}
              {project.status === 'processing' ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border border-yellow-500/50 text-yellow-500 bg-yellow-500/10">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                  </span>
                  {project.status}
                </span>
              ) : (
                <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border ${project.status === 'error' || project.status === 'failed' ? 'border-red-500/50 text-red-500 bg-red-500/10' : 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10'}`}>
                  {project.status}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-2">{project.description || 'No description provided.'}</p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-[var(--surface-container)] px-3 py-1 rounded-full border border-[var(--outline-variant)]">
              {project.category}
            </span>
            {project.settings?.is_public && (
              <span className="text-[10px] text-blue-400 border border-blue-400/30 bg-blue-400/10 px-2 py-1 rounded flex items-center gap-1 uppercase tracking-widest">
                <Globe size={12} /> Public Repo
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-8 mb-8 border-b border-[var(--outline-variant)]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 text-sm font-bold tracking-widest uppercase transition-all relative ${
                  isActive 
                    ? 'text-[var(--primary)]' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[var(--primary)]"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "dashboard" && <DashboardTab project={project} refreshProject={fetchProject} />}
            {activeTab === "dataset" && <DatasetTab project={project} />}
            {activeTab === "testing" && <TestingTab project={project} />}
            {activeTab === "settings" && <SettingsTab project={project} refreshProject={fetchProject} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
