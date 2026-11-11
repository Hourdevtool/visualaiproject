"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSmartPolling } from "../../../../../hooks/useSmartPolling";
import { useLanguage } from "../../../../../providers/LanguageProvider";
import { 
  Activity, Server, ChevronLeft, ChevronRight, TrendingUp, Cpu, 
  Database, Zap, Download, Filter, BarChart3, Image as ImageIcon,
  Info, History, Maximize2, Loader2, Play
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, Legend 
} from "recharts";

interface DashboardTabProps {
  project: any;
  refreshProject: () => void;
}

const resultDescriptions: any = {
  results_url: {
    en: "Comprehensive Training Metrics: Shows loss and mAP trends across all epochs.",
    th: "กราฟสรุปผลการเทรน: แสดงแนวโน้มของค่า Loss และ mAP ในแต่ละ Epoch"
  },
  f1_curve_url: {
    en: "F1-Confidence Curve: Measures the harmonic mean of precision and recall.",
    th: "กราฟ F1-Confidence: วัดค่าเฉลี่ยฮาร์มอนิกของความแม่นยำและความระลึก"
  },
  pr_curve_url: {
    en: "Precision-Recall Curve: Illustrates the trade-off between precision and recall.",
    th: "กราฟ Precision-Recall: แสดงความสัมพันธ์ระหว่างความแม่นยำและความระลึก"
  },
  precision_curve_url: {
    en: "Precision-Confidence Curve: Accuracy of positive predictions at various thresholds.",
    th: "กราฟ Precision-Confidence: แสดงความแม่นยำในการทำนายผลบวกที่ระดับความเชื่อมั่นต่างๆ"
  },
  recall_curve_url: {
    en: "Recall-Confidence Curve: Ability of the model to find all positive instances.",
    th: "กราฟ Recall-Confidence: แสดงความสามารถในการค้นหาผลบวกทั้งหมดที่ระดับความเชื่อมั่นต่างๆ"
  },
  confusion_matrix_url: {
    en: "Confusion Matrix: Detailed breakdown of correct vs incorrect predictions per class.",
    th: "Confusion Matrix: แสดงรายละเอียดการทำนายที่ถูกต้องและผิดพลาดในแต่ละหมวดหมู่"
  }
};

export default function DashboardTab({ project, refreshProject }: DashboardTabProps) {
  const { t, language } = useLanguage();
  const { data: session } = useSession();
  
  const [selectedModelIdx, setSelectedModelIdx] = useState(0);
  const [trainLoading, setTrainLoading] = useState(false);
  // local state ที่ sync กับ prop — ปิดปุ่มทันทีที่กด, และ update เมื่อ parent refresh กลับมา
  const [isTraining, setIsTraining] = useState(project.is_training);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [viewMode, setViewMode] = useState<'individual' | 'compare'>('individual');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const token = (session as any)?.accessToken;
  const history = project.history || [];
  const currentModel = history[selectedModelIdx] || project.analyze;

  // Sync isTraining จาก prop — เมื่อ parent ดึงข้อมูลใหม่แล้ว is_training เปลี่ยน จะรับ state อัตโนมัติ
  useEffect(() => {
    setIsTraining(project.is_training);
  }, [project.is_training]);

  useEffect(() => {
    fetchLogs();
  }, [page, token]);

  const fetchLogs = async () => {
    if (!token) return;
    try {
      setLogsLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/projects/${project.id}/logs?limit=10&offset=${page * 10}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
        setHasMoreLogs(data.length === 10);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const startTraining = async () => {
    if (!token) return;
    try {
      setTrainLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/aiservices/${project.id}/train`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ base_model: "standard" })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to start training");
      }

      toast.success("Training started successfully");
      setIsTraining(true); // ปิดปุ่มทันที ไม่ต้องรอ refresh
      refreshProject();    // เรียก parent เพื่อ poll loop จะเริ่มทำงาน
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTrainLoading(false);
    }
  };

  // Poll อัตโนมัติเมื่อกำลัง training — ใช้ backoff เพื่อไม่ให้ server หนัก
  useSmartPolling({
    fetchFn: useCallback(async () => { refreshProject(); }, [refreshProject]),
    shouldPoll: isTraining,
    initialInterval: 5000,  // training ใช้เวลานาน → เริ่มที่ 5s
    maxInterval: 60000,     // สูงสุด 60s
    backoffMultiplier: 2,   // 5s → 10s → 20s → 40s → 60s
  });

  const downloadCSV = (url: string) => {
    const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${url}`;
    window.open(fullUrl, '_blank');
  };

  const chartData = useMemo(() => {
    if (!currentModel?.accuracy_history) return [];
    return currentModel.accuracy_history.map((val: number, i: number) => ({
      epoch: i + 1,
      accuracy: val * 100
    }));
  }, [currentModel]);

  const comparisonData = useMemo(() => {
    if (history.length < 2) return [];
    // Align epochs
    const maxEpochs = Math.max(...history.map((m: any) => m.accuracy_history?.length || 0));
    return Array.from({ length: maxEpochs }, (_, i) => {
      const entry: any = { epoch: i + 1 };
      history.forEach((m: any, idx: number) => {
        if (m.accuracy_history && m.accuracy_history[i] !== undefined) {
          entry[`Model ${history.length - idx}`] = m.accuracy_history[i] * 100;
        }
      });
      return entry;
    });
  }, [history]);

  return (
    <div className="space-y-6 font-sans pb-20">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-[var(--outline-variant)] pb-6 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Experiment Dashboard</h1>
          <div className="flex items-center gap-2">
             <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
               ID: {project.id?.split('-')[0]?.toUpperCase()} • OWNER: {project.owner?.username?.toUpperCase()}
             </p>
             <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-bold uppercase tracking-widest ${
                project.status === 'ready' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
             }`}>
                {project.status}
             </span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {history.length > 1 && (
            <div className="flex bg-[var(--surface-container-high)] rounded-md p-1 border border-[var(--outline-variant)]">
               <button 
                 onClick={() => setViewMode('individual')}
                 className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition ${viewMode === 'individual' ? 'bg-[var(--primary)] text-white' : 'text-gray-500 hover:text-white'}`}
               >
                 Individual
               </button>
               <button 
                 onClick={() => setViewMode('compare')}
                 className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition ${viewMode === 'compare' ? 'bg-[var(--primary)] text-white' : 'text-gray-500 hover:text-white'}`}
               >
                 Compare
               </button>
            </div>
          )}

          <button 
             onClick={startTraining}
             disabled={isTraining || trainLoading || project.status !== 'ready'}
             className="px-4 py-2 bg-[var(--surface-container-high)] text-white text-xs font-bold uppercase tracking-widest rounded-md border border-[var(--outline-variant)] hover:bg-gray-800 transition disabled:opacity-30 flex items-center gap-2"
          >
             {isTraining || trainLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
             {isTraining || trainLoading ? "PROCESSING..." : "RUN PIPELINE"}
          </button>
          
          {currentModel?.csv_url && (
            <button 
              onClick={() => downloadCSV(currentModel.csv_url)}
              className="px-4 py-2 bg-[var(--surface-container-high)] text-gray-400 text-xs font-bold uppercase tracking-widest rounded-md border border-[var(--outline-variant)] hover:text-white transition flex items-center gap-2"
            >
               <BarChart3 size={14} />
               {language === 'en' ? 'EXPORT CSV' : 'ส่งออกไฟล์ CSV'}
            </button>
          )}

          {(currentModel?.model_pt_url || currentModel?.onnx_url) && (
            <button 
              onClick={() => {
                const url = currentModel.model_pt_url || currentModel.onnx_url;
                const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${url}`;
                window.open(fullUrl, '_blank');
              }}
              className="px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] text-xs font-bold uppercase tracking-widest rounded-md hover:bg-rose-500 shadow-lg shadow-rose-500/20 transition flex items-center gap-2"
            >
               <Download size={14} />
               {language === 'en' ? 'DOWNLOAD MODEL' : 'ดาวน์โหลดโมเดล'}
            </button>
          )}
        </div>
      </div>

      {/* Model Selector Bar */}
      {history.length > 0 && viewMode === 'individual' && (
        <div className="flex items-center gap-4 mb-4 overflow-x-auto pb-2 scrollbar-hide">
           <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 shrink-0">
             <History size={12} /> Model History:
           </span>
           <div className="flex gap-2">
             {history.map((m: any, i: number) => (
               <button 
                 key={m.id}
                 onClick={() => setSelectedModelIdx(i)}
                 className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition shrink-0 ${
                   selectedModelIdx === i 
                     ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]' 
                     : 'bg-white/5 border-[var(--outline-variant)] text-gray-500 hover:border-gray-400'
                 }`}
               >
                 {i === 0 ? 'Latest (v'+(history.length)+')' : 'v'+(history.length - i)} • {(m.latest_accuracy * 100).toFixed(1)}%
               </button>
             ))}
           </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Analytics & Visualization */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Visualizer - Graph or Comparison */}
          <div className="bg-[var(--surface-container)] rounded-xl border border-[var(--outline-variant)] p-8 h-[400px] flex flex-col relative overflow-hidden">
             <div className="absolute inset-0 opacity-5 pointer-events-none" 
                  style={{backgroundImage: 'radial-gradient(circle at 2px 2px, var(--outline-variant) 1px, transparent 0)', backgroundSize: '32px 32px'}}></div>
             
             <div className="flex justify-between items-center mb-6 z-10">
                <div className="flex items-center gap-2">
                   <TrendingUp size={18} className="text-[var(--primary)]" />
                   <h3 className="text-sm font-extrabold text-white uppercase tracking-widest">
                     {viewMode === 'compare' ? 'Cross-Model Accuracy Comparison' : `Training Convergence (v${history.length - selectedModelIdx})`}
                   </h3>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">mAP@.50 (%)</span>
                </div>
             </div>

             <div className="flex-1 w-full z-10">
                {viewMode === 'individual' ? (
                  currentModel ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                        <XAxis dataKey="epoch" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '10px' }}
                          itemStyle={{ color: 'var(--primary)' }}
                        />
                        <Area type="monotone" dataKey="accuracy" stroke="var(--primary)" fillOpacity={1} fill="url(#colorAcc)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-30">
                       <Zap size={48} className="mb-4" />
                       <p className="text-xs font-bold uppercase tracking-widest">Awaiting First Epoch Results</p>
                    </div>
                  )
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                      <XAxis dataKey="epoch" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                         contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '10px' }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold'}} />
                      {history.map((m: any, i: number) => (
                        <Line 
                          key={m.id} 
                          type="monotone" 
                          dataKey={`Model ${history.length - i}`} 
                          stroke={i === 0 ? 'var(--primary)' : i === 1 ? '#3b82f6' : '#a855f7'} 
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
             </div>
          </div>

          {/* Training Artifacts - Individual Cards */}
          {viewMode === 'individual' && currentModel && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon size={18} className="text-[var(--primary)]" />
                  <h2 className="text-xs font-black text-white uppercase tracking-widest">Detailed Training Artifacts</h2>
                </div>
                <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                  MODEL V{history.length - selectedModelIdx}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.keys(resultDescriptions).map((key) => {
                    const url = (currentModel as any)[key];
                    if (!url) return null;
                    return (
                      <motion.div 
                        key={key} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[var(--surface-container)] rounded-2xl border border-[var(--outline-variant)] overflow-hidden group flex flex-col shadow-lg hover:shadow-[var(--primary)]/5 transition-all duration-300"
                      >
                        <div className="p-5 border-b border-[var(--outline-variant)] flex justify-between items-center bg-white/[0.03]">
                           <span className="text-[12px] font-black text-white uppercase tracking-[0.1em]">
                             {key.replace('_url', '').replace(/_/g, ' ')}
                           </span>
                           <button 
                             onClick={() => setSelectedImage(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${url}`)}
                             className="p-2 hover:bg-white/10 rounded-lg transition"
                           >
                             <Maximize2 size={14} className="text-gray-400 group-hover:text-white" />
                           </button>
                        </div>
                        <div className="aspect-[16/10] overflow-hidden relative">
                           <img 
                              src={`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${url}`} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                              alt={key} 
                           />
                        </div>
                        <div className="p-5 bg-white/[0.01] flex-1">
                           <p className="text-sm text-gray-300 leading-relaxed font-medium">
                              {language === 'en' ? resultDescriptions[key].en : resultDescriptions[key].th}
                           </p>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Recent Validations (only if individual) */}
          {viewMode === 'individual' && (
             <div className="bg-[var(--surface-container)] rounded-xl border border-[var(--outline-variant)] p-6">
               <div className="flex justify-between items-center mb-6">
                   <h2 className="text-sm font-bold text-white uppercase tracking-widest">Inference Samples</h2>
                   <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">LATEST SEGMENTS</span>
               </div>
               <div className="grid grid-cols-4 gap-4">
                   {project.recent_samples?.length > 0 ? (
                     project.recent_samples.slice(0, 4).map((img: string, i: number) => (
                       <div key={i} className="aspect-square bg-[var(--surface-container-high)] rounded-lg border border-[var(--outline-variant)] overflow-hidden group relative">
                         <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${img}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-500" alt="Sample" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[8px] font-bold text-white uppercase tracking-widest">View Image</span>
                         </div>
                       </div>
                     ))
                   ) : (
                     [1,2,3,4].map(i => (
                       <div key={i} className="aspect-square bg-white/5 rounded-lg border border-[var(--outline-variant)] border-dashed flex items-center justify-center">
                         <span className="text-[8px] text-gray-700 font-bold uppercase">Void</span>
                       </div>
                     ))
                   )}
               </div>
             </div>
          )}
        </div>

        {/* Right Column: Intelligence & Telemetry */}
        <div className="space-y-6">
           <div className="bg-[var(--surface-container)] rounded-xl border border-[var(--outline-variant)] p-8 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-8">
                 <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
                    <Activity size={20} className="text-[var(--primary)]" />
                 </div>
                 <h2 className="text-lg font-bold text-white uppercase tracking-tight">Intelligence Suite</h2>
              </div>
              
              <div className="space-y-8 flex-1">
                 {/* Precision Gauge */}
                 <div className="space-y-4">
                    <div className="flex justify-between items-end">
                       <div>
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">current accuracy</p>
                          <p className="text-3xl font-black text-white">{(currentModel?.latest_accuracy * 100 || 0).toFixed(1)}%</p>
                       </div>
                       <TrendingUp size={24} className={(currentModel?.latest_accuracy || 0) > 0.8 ? "text-emerald-500" : "text-amber-500"} />
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(currentModel?.latest_accuracy * 100 || 0)}%` }}
                          className="h-full bg-[var(--primary)]" 
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-[var(--outline-variant)] flex items-center gap-4 hover:bg-white/[0.08] transition">
                       <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Cpu size={18} /></div>
                       <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Inference Latency</p>
                          <p className="text-lg font-black text-white">{currentModel?.compute_efficiency_ms?.toFixed(2) || 0}ms</p>
                       </div>
                    </div>
                    
                    <div className="p-4 bg-white/5 rounded-2xl border border-[var(--outline-variant)] flex items-center gap-4 hover:bg-white/[0.08] transition">
                       <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Database size={18} /></div>
                       <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Dataset Volume</p>
                          <p className="text-lg font-black text-white">{project.dataset_size || 0} Assets</p>
                       </div>
                    </div>

                    <div className="p-4 bg-white/5 rounded-2xl border border-[var(--outline-variant)] flex items-center gap-4 hover:bg-white/[0.08] transition">
                       <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><BarChart3 size={18} /></div>
                       <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Loss Variance</p>
                          <p className="text-lg font-black text-white">{currentModel?.loss_variance?.toFixed(4) || 0}</p>
                       </div>
                    </div>
                 </div>

                 <div className="mt-auto pt-8 border-t border-white/5">
                    <div className="p-6 bg-white/5 rounded-xl border border-dashed border-[var(--outline-variant)]">
                       <div className="flex items-center gap-2 mb-3 text-[var(--primary)] font-bold uppercase tracking-widest text-[12px]">
                          <Info size={14} />
                          AI Insights
                       </div>
                       <p className="text-sm text-gray-300 leading-relaxed">
                          {language === 'en' 
                            ? "Neural weights are optimized for production deployment. Current mAP levels indicate high reliability for static object detection. Monitor results.csv for drift." 
                            : "ค่าน้ำหนักของโครงข่ายประสาทเทียมได้รับการปรับแต่งเพื่อการใช้งานจริง ค่า mAP ปัจจุบันบ่งชี้ถึงความน่าเชื่อถือสูงในการตรวจจับวัตถุ แนะนำให้ตรวจสอบ results.csv เพื่อดูความเสถียร"}
                       </p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Logs section */}
      <div className="bg-[var(--surface-container)] rounded-xl border border-[var(--outline-variant)] overflow-hidden">
        <div className="p-6 border-b border-[var(--outline-variant)] flex justify-between items-center bg-white/5">
          <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center">
            <Server size={14} className="mr-2 text-[var(--primary)]" />
            Runtime Telemetry
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 hover:bg-white/5 rounded disabled:opacity-20"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] font-bold self-center text-gray-500 px-2">PG {page + 1}</span>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMoreLogs}
              className="p-1 hover:bg-white/5 rounded disabled:opacity-20"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-6 py-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">Event</th>
                <th className="px-6 py-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">Metadata</th>
                <th className="px-6 py-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-gray-300">{log.action}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] text-gray-500 font-mono">
                      {typeof log.detail === 'object' ? JSON.stringify(log.detail) : log.detail}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(log.createdat).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Modal for Full View */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <img src={selectedImage} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10" alt="Full view" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-0 right-0 p-3 text-white/50 hover:text-white transition"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
