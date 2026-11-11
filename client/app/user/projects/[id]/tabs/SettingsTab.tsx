"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "../../../../../providers/LanguageProvider";
import { Save, Shield, Globe, Lock, Loader2, Download, Share2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface SettingsTabProps {
  project: any;
  refreshProject: () => void;
}

export default function SettingsTab({ project, refreshProject }: SettingsTabProps) {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  const [settings, setSettings] = useState({
    threshold: project.settings?.threshold || 0.5,
    processing_mode: project.settings?.processing_mode || "standard",
    is_public: project.settings?.is_public || false,
    encryption_enabled: project.settings?.encryption_enabled || false,
    share_allow: project.settings?.share_allow || false,
    download_allow: project.settings?.download_allow || false,
  });

  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    if (!token) return;
    try {
      setLogsLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/projects/${project.id}/logs?limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    try {
      setSaving(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/projects/${project.id}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (!res.ok) {
        throw new Error("Failed to save settings");
      }

      toast.success("Settings saved successfully");
      refreshProject();
      fetchLogs();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || confirmName !== project.project_name) return;
    try {
      setDeleting(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/projects/${project.id}`, {
        method: "DELETE",
        body: JSON.stringify({ confirm_project_name: confirmName }),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Project deleted successfully");
        router.push("/user");
      } else {
        throw new Error("Failed to delete project");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="mb-8 border-b border-[var(--outline-variant)] pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">PERMISSIONS</h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            LATENT PRECISION SECURITY LAYER
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-[var(--primary)] text-[var(--on-primary)] text-xs font-bold uppercase tracking-widest rounded-md hover:bg-[var(--primary-container)] transition flex items-center"
        >
          {saving ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Permissions */}
        <div className="lg:col-span-2 space-y-6">

          {/* Project Visibility */}
          <div className="bg-[var(--surface-container)] rounded-xl border border-[var(--outline-variant)] p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Project Visibility</h2>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">DEFINE WHO CAN DISCOVER THIS PROJECT</p>
              </div>
              <span className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--outline-variant)] rounded-full text-[10px] font-bold tracking-widest uppercase">
                SYSTEM ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => setSettings({ ...settings, is_public: false })}
                className={`p-5 rounded-xl border cursor-pointer transition ${!settings.is_public ? 'border-[var(--primary)] bg-[var(--primary)]/20' : 'border-[var(--outline-variant)] hover:border-gray-500 bg-[var(--surface-container-high)]'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <Lock size={20} className={!settings.is_public ? 'text-[var(--primary)]' : 'text-gray-500'} />
                  <div className={`w-4 h-4 rounded-full border-2 ${!settings.is_public ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-gray-600'}`}></div>
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Private Access</h3>
                <p className="text-xs text-gray-400 leading-relaxed">Only explicitly invited team members can view or edit this project repository.</p>
              </div>

              <div
                onClick={() => setSettings({ ...settings, is_public: true })}
                className={`p-5 rounded-xl border cursor-pointer transition ${settings.is_public ? 'border-[var(--primary)] bg-[var(--primary)]/20' : 'border-[var(--outline-variant)] hover:border-gray-500 bg-[var(--surface-container-high)]'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <Globe size={20} className={settings.is_public ? 'text-[var(--primary)]' : 'text-gray-500'} />
                  <div className={`w-4 h-4 rounded-full border-2 ${settings.is_public ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-gray-600'}`}></div>
                </div>
                <h3 className="text-sm font-bold text-white mb-2">Public Organization</h3>
                <p className="text-xs text-gray-400 leading-relaxed">Anyone within the Latent Precision organization can discover and read this data.</p>
              </div>
            </div>
          </div>

          {/* Action Permissions */}
          <div className="bg-[var(--surface-container)] rounded-xl border border-[var(--outline-variant)] p-6">
            <h2 className="text-lg font-bold text-white mb-6">Action Permissions</h2>

            <div className="space-y-6">
              <div className={`flex justify-between items-center ${!settings.is_public ? 'opacity-50' : ''}`}>
                <div className="flex gap-4 items-center">
                  <Download className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-300 font-bold">Download RAW Assets</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">HIGH-RESOLUTION UNCOMPRESSED EXPORT</p>
                  </div>
                </div>
                <div
                  onClick={() => settings.is_public && setSettings({ ...settings, download_allow: !settings.download_allow })}
                  className={`w-12 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors ${settings.download_allow ? 'bg-[var(--primary)]' : 'bg-gray-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.download_allow ? 'translate-x-6' : ''}`}></div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <Shield className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-300 font-bold">Modify Metadata</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">EDIT EXIF, LABELS, AND TAGS</p>
                  </div>
                </div>
                <div
                  className={`w-12 h-6 bg-gray-700 rounded-full flex items-center px-1 cursor-not-allowed`}
                >
                  <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                </div>
              </div>

              <div className={`flex justify-between items-center ${!settings.is_public ? 'opacity-50' : ''}`}>
                <div className="flex gap-4 items-center">
                  <Share2 className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-300 font-bold">External Link Sharing</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">GENERATE PUBLIC PREVIEW URLS</p>
                  </div>
                </div>
                <div
                  onClick={() => settings.is_public && setSettings({ ...settings, share_allow: !settings.share_allow })}
                  className={`w-12 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors ${settings.share_allow ? 'bg-[var(--primary)]' : 'bg-gray-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.share_allow ? 'translate-x-6' : ''}`}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Security Logs */}
        <div className="bg-[var(--surface-container)] rounded-xl border border-[var(--outline-variant)] p-6 flex flex-col h-full min-h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-widest">SECURITY LOGS</h2>
            <Loader2 size={14} className={`text-gray-500 ${logsLoading ? 'animate-spin' : 'opacity-0'}`} />
          </div>

          <div className="flex-1 space-y-6">
            {!logsLoading && logs.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-8">No security logs found.</p>
            )}

            {logs.map((log, index) => (
              <div key={log.id || index} className="relative pl-6 border-l border-[var(--outline-variant)] pb-4 last:border-0 last:pb-0">
                <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
                <p className="text-sm text-white font-medium mb-1 leading-snug">{log.action}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                  {new Date(log.createdat).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}
                </p>
              </div>
            ))}
          </div>

          <button className="mt-8 w-full py-3 bg-[var(--surface-container-high)] hover:bg-gray-800 text-xs font-bold text-gray-300 uppercase tracking-widest rounded-lg border border-blue-900/30 transition">
            VIEW ALL LOGS
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-12 pt-8 border-t border-rose-500/20">
        <div className="bg-rose-500/5 rounded-xl border border-rose-500/20 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 text-rose-500 mb-1">
                <Shield size={16} />
                <h2 className="text-lg font-bold uppercase tracking-tight">Danger Zone</h2>
              </div>
              <p className="text-xs text-gray-400">Irreversible action. Deleting this project will wipe all datasets, logs, and trained models.</p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-6 py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
            >
              Delete Project
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#0a0a0a] border border-rose-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold text-white mb-2">Are you absolutely sure?</h2>
              <p className="text-sm text-gray-400 mb-6">
                This action cannot be undone. This will permanently delete the
                <span className="text-white font-bold mx-1">{project.project_name}</span>
                project and all its data.
              </p>

              <div className="space-y-4">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                  Please type <span className="text-rose-500">{project.project_name}</span> to confirm.
                </p>
                <input
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-rose-500 outline-none transition"
                  placeholder="Type project name..."
                />

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={confirmName !== project.project_name || deleting}
                    className="flex-[2] py-3 bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-rose-600 disabled:opacity-20 disabled:grayscale transition shadow-lg shadow-rose-500/20"
                  >
                    {deleting ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Confirm Deletion"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
