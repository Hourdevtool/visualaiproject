"use client";

import { useLanguage } from "../../../../providers/LanguageProvider";
import { Globe, Download, Share2, Copy, FileCode, Check, Activity, Server, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function PublicView({ project }: { project: any }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!token) {
      toast.error("You must be logged in to download.");
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/ai/${project.id}/download`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error("Download failed or unauthorized");
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.project_name.replace(/\s+/g, "_").toLowerCase()}_model.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("Download started");
    } catch (err: any) {
      toast.error(err.message || "Could not download model");
    }
  };

  const analytics = project.analyze;
  const isReady = project.status === "completed" || analytics;

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 lg:px-12 relative z-10 text-gray-300">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/user" className="flex items-center text-sm text-gray-500 hover:text-[var(--primary)] transition-colors mb-4 group w-fit">
              <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
              Back to Marketplace
            </Link>
            <div className="flex items-center gap-3">
              <Globe size={28} className="text-gray-400" />
              <h1 className="text-3xl font-bold text-blue-400 font-['Space_Grotesk'] hover:underline cursor-pointer">
                {project.project_name}
              </h1>
              <span className="text-xs uppercase tracking-widest px-2 py-1 rounded-full border border-gray-600 text-gray-400 ml-2">
                Public
              </span>
            </div>
          </div>
          
          <div className="flex gap-3">
            {project.settings?.share_allow && (
              <button
                onClick={handleShare}
                className="flex items-center px-4 py-2 bg-[var(--surface-container-high)] hover:bg-gray-800 border border-[var(--outline-variant)] rounded-lg text-sm font-bold transition-colors"
              >
                {copied ? <Check size={16} className="mr-2 text-emerald-500" /> : <Share2 size={16} className="mr-2" />}
                {t('projectDetail.public.shareProject') || "Share"}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Repo Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* File List Mockup */}
            <div className="bg-[var(--surface-container)] rounded-xl border border-[var(--outline-variant)] overflow-hidden">
              <div className="bg-[var(--surface-container-high)] px-4 py-3 border-b border-[var(--outline-variant)] flex justify-between items-center">
                <span className="text-sm font-bold text-gray-300">Model Assets</span>
                {isReady && project.settings?.download_allow && (
                  <button onClick={handleDownload} className="text-xs flex items-center bg-[var(--primary)]/20 text-[var(--primary)] px-3 py-1 rounded hover:bg-[var(--primary)]/30 transition-colors">
                    <Download size={12} className="mr-1" />
                    Download
                  </button>
                )}
              </div>
              <div className="divide-y divide-[var(--outline-variant)]">
                {isReady ? (
                  <>
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-container-highest)] cursor-default transition-colors">
                      <div className="flex items-center text-sm"><FileCode size={16} className="mr-3 text-gray-500" /> model_weights.onnx</div>
                      <span className="text-xs text-gray-500">{new Date(project.updatedat || project.createdat).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-container-highest)] cursor-default transition-colors">
                      <div className="flex items-center text-sm"><FileCode size={16} className="mr-3 text-gray-500" /> labels.json</div>
                      <span className="text-xs text-gray-500">{new Date(project.updatedat || project.createdat).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-container-highest)] cursor-default transition-colors">
                      <div className="flex items-center text-sm"><FileCode size={16} className="mr-3 text-gray-500" /> model.pt</div>
                      <span className="text-xs text-gray-500">{new Date(project.updatedat || project.createdat).toLocaleDateString()}</span>
                    </div>
                  </>
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    Model is currently not available or hasn't been trained yet.
                  </div>
                )}
              </div>
            </div>

            {/* Readme / Description */}
            <div className="bg-[var(--surface-container)] rounded-xl border border-[var(--outline-variant)] p-8">
              <h2 className="text-xl font-bold text-white mb-4 border-b border-[var(--outline-variant)] pb-2">README.md</h2>
              <div className="prose prose-invert max-w-none text-sm text-gray-300">
                <p>{project.description || "No description provided for this repository."}</p>
                
                <h3 className="text-lg text-white mt-8 mb-4">Python Usage Example</h3>
                <div className="relative group mt-6">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--primary)] to-blue-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                  <pre className="relative bg-black/80 p-6 rounded-xl border border-[var(--outline-variant)] overflow-x-auto custom-scrollbar font-mono text-xs leading-relaxed">
                    <code className="text-gray-300">
                      <span className="text-purple-400">import</span> cv2{'\n'}
                      <span className="text-purple-400">from</span> ultralytics <span className="text-purple-400">import</span> YOLO{'\n\n'}
                      <span className="text-gray-500"># 1. Load the fine-tuned model downloaded from Latent Precision</span>{'\n'}
                      model = YOLO(<span className="text-emerald-400">"model.pt"</span>){'\n\n'}
                      <span className="text-gray-500"># 2. Read image using OpenCV</span>{'\n'}
                      image = cv2.imread(<span className="text-emerald-400">"sample_image.jpg"</span>){'\n\n'}
                      <span className="text-gray-500"># 3. Run inference with custom threshold</span>{'\n'}
                      results = model(image, conf=<span className="text-orange-400">{project.settings?.threshold || 0.5}</span>){'\n\n'}
                      <span className="text-gray-500"># 4. Display bounding boxes</span>{'\n'}
                      <span className="text-purple-400">for</span> r <span className="text-purple-400">in</span> results:{'\n'}
                      {'    '}im_bgr = r.plot(){'\n'}
                      {'    '}cv2.imshow(<span className="text-emerald-400">"Latent Precision - Result"</span>, im_bgr){'\n\n'}
                      cv2.waitKey(<span className="text-orange-400">0</span>)
                    </code>
                  </pre>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`import cv2\nfrom ultralytics import YOLO\n\nmodel = YOLO("model.pt")\nimage = cv2.imread("sample_image.jpg")\nresults = model(image, conf=${project.settings?.threshold || 0.5})\n\nfor r in results:\n    im_bgr = r.plot()\n    cv2.imshow("Latent Precision - Result", im_bgr)\n\ncv2.waitKey(0)`);
                      toast.success("Code copied!");
                    }}
                    className="absolute top-4 right-4 p-2 bg-[var(--surface-container-high)] border border-[var(--outline-variant)] rounded-lg opacity-0 group-hover:opacity-100 transition-all text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            <div className="bg-[var(--surface-container)] rounded-xl border border-[var(--outline-variant)] p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                <Activity size={16} className="mr-2" />
                Model Metrics
              </h3>
              
              {analytics ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Accuracy</span>
                    <div className="text-2xl font-bold text-white font-['Space_Grotesk']">
                      {(analytics.latest_accuracy * 100).toFixed(1)}<span className="text-sm text-[var(--primary)] ml-1">%</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Compute Efficiency</span>
                    <div className="text-2xl font-bold text-white font-['Space_Grotesk']">
                      {analytics.compute_efficiency_ms.toFixed(0)}<span className="text-sm text-blue-400 ml-1">ms</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Loss Variance</span>
                    <div className="text-2xl font-bold text-white font-['Space_Grotesk']">
                      {analytics.loss_variance.toFixed(4)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No metrics available.</p>
                </div>
              )}
            </div>

            <div className="bg-[var(--surface-container)] rounded-xl border border-[var(--outline-variant)] p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 rounded-full blur-[50px] pointer-events-none" />
              
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">About</h3>
              <p className="text-sm text-gray-300 mb-6">{project.description || "No description provided."}</p>
              
              <div className="flex items-center gap-3 py-4 border-t border-b border-[var(--outline-variant)] mb-4">
                {project.owner?.profile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={project.owner.profile} alt={project.owner.username} className="w-10 h-10 rounded-full object-cover border border-[var(--outline-variant)]" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-container-high)] flex items-center justify-center font-bold text-white border border-[var(--outline-variant)]">
                    {project.owner?.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Project Owner</p>
                  <p className="text-sm font-bold text-white">{project.owner?.username || "Unknown"}</p>
                </div>
              </div>

              <div className="text-xs text-gray-400 space-y-3">
                <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                  <span className="uppercase tracking-widest">Category</span>
                  <span className="text-white font-bold">{project.category}</span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                  <span className="uppercase tracking-widest">Processing Mode</span>
                  <span className="text-white font-bold capitalize">{project.settings?.processing_mode?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-2 rounded">
                  <span className="uppercase tracking-widest">Threshold</span>
                  <span className="text-[var(--primary)] font-mono font-bold">{project.settings?.threshold}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
