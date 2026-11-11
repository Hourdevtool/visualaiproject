"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "../../../../../providers/LanguageProvider";
import { Camera, RefreshCw, Image as ImageIcon, Video, StopCircle, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as ort from "onnxruntime-web";

interface TestingTabProps {
  project: any;
}

export default function TestingTab({ project }: TestingTabProps) {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  const [mode, setMode] = useState<"webcam" | "api">("api");
  const [valImages, setValImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isInferenceActive, setIsInferenceActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<ort.InferenceSession | null>(null);
  const requestRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const labelsRef = useRef<string[]>([]);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  const [labels, setLabels] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState({ fps: 0, shape: "", maxScore: 0 });
  const [models, setModels] = useState<any[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  
  const modelData = models.find(m => m.id === selectedModelId) || project.analyze;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    fetchLabels();
    fetchModels();
    if (mode === "api" && modelData?.id) {
      fetchValidationImages();
    }
    return () => stopCamera();
  }, [mode, selectedModelId]);

  const fetchModels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects/${project.id}/models`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setModels(data);
        if (data.length > 0 && !selectedModelId) {
          setSelectedModelId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch models:", err);
    }
  };

  const fetchLabels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects/${project.id}/dataset/folders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((f: string) => 
          f !== "yolo_dataset" && 
          !f.startsWith("RUN_") && 
          !f.startsWith("run_")
        );
        setLabels(filtered);
        labelsRef.current = filtered;
      }
    } catch (err) {
      console.error("Failed to fetch labels:", err);
    }
  };

  const fetchValidationImages = async () => {
    if (!token || !modelData?.id) return;
    try {
      setLoadingImages(true);
      const res = await fetch(`${API_URL}/api/projects/${project.id}/models/${modelData.id}/validation-images`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setValImages(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingImages(false);
    }
  };

  const loadModel = async () => {
    if (sessionRef.current) return true;
    if (!modelData?.onnx_url) {
      toast.error("ONNX model not found. Please train with export enabled.");
      return false;
    }

    try {
      setIsModelLoading(true);
      const modelUrl = `${API_URL}${modelData.onnx_url}`;
      const session = await ort.InferenceSession.create(modelUrl, {
        executionProviders: ["webgl", "wasm"],
      });
      sessionRef.current = session;
      setIsModelLoading(false);
      return true;
    } catch (err) {
      console.error("Failed to load model:", err);
      toast.error("Failed to load AI model into browser.");
      setIsModelLoading(false);
      return false;
    }
  };

  const startCamera = async () => {
    const modelLoaded = await loadModel();
    if (!modelLoaded) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          frameRate: { ideal: 30 } 
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        isRunningRef.current = true;
        setIsCameraOn(true);
        setIsInferenceActive(true);
        
        // เริ่มลูปทันทีโดยไม่ต้องรอ Event ถ้าวิดีโอพร้อมแล้ว
        const startLoop = () => {
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth || 640;
            canvasRef.current.height = videoRef.current.videoHeight || 480;
          }
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
          requestRef.current = requestAnimationFrame(runInferenceLoop);
        };

        if (videoRef.current.readyState >= 2) {
          startLoop();
        } else {
          videoRef.current.onloadedmetadata = startLoop;
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not access camera.");
    }
  };

  const stopCamera = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    isRunningRef.current = false;
    setIsCameraOn(false);
    setIsInferenceActive(false);

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const runInferenceLoop = async () => {
    if (!isRunningRef.current || !sessionRef.current || !videoRef.current || !canvasRef.current) return;

    const startTime = performance.now();
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      if (!ctx || video.videoWidth === 0) {
        requestRef.current = requestAnimationFrame(runInferenceLoop);
        return;
      }

      // onnxruntime-web ไม่มี inputMetadata API
      // ใช้ขนาดที่รู้จากโมเดล 416 (จาก Python test) หรือลอง 640 เป็น fallback
      // วิธีที่ถูกต้องคือดึงจาก output tensor dims หลัง inference ครั้งแรก
      const inputSize = 416;
      
      // Reuse offscreen canvas แทนการสร้างใหม่ทุกเฟรม
      if (!offscreenRef.current) {
        offscreenRef.current = document.createElement("canvas");
        offscreenRef.current.width = inputSize;
        offscreenRef.current.height = inputSize;
      }
      const offscreen = offscreenRef.current;
      const oCtx = offscreen.getContext("2d", { willReadFrequently: true })!;
      oCtx.drawImage(video, 0, 0, inputSize, inputSize);
      
      const imageData = oCtx.getImageData(0, 0, inputSize, inputSize);
      const { data } = imageData;
      
      const input = new Float32Array(inputSize * inputSize * 3);
      for (let i = 0; i < inputSize * inputSize; i++) {
        input[i] = data[i * 4] / 255.0;
        input[i + inputSize * inputSize] = data[i * 4 + 1] / 255.0;
        input[i + inputSize * inputSize * 2] = data[i * 4 + 2] / 255.0;
      }
      
      const tensor = new ort.Tensor("float32", input, [1, 3, inputSize, inputSize]);
      const outputs = await sessionRef.current.run({ images: tensor });
      
      const outputTensor = outputs[Object.keys(outputs)[0]];
      const output = outputTensor.data as Float32Array; 
      const shape = outputTensor.dims;
      const numBoxes = Number(shape[2]); 
      
      const currentLabels = labelsRef.current;
      const numClasses = currentLabels.length;
      const boxes: any[] = [];
      const threshold = 0.25; 

      let globalMaxScore = 0;

      for (let i = 0; i < numBoxes; i++) {
        let maxScore = 0;
        let classId = -1;
        
        for (let j = 0; j < numClasses; j++) {
          const score = output[(4 + j) * numBoxes + i];
          if (score > maxScore) {
            maxScore = score;
            classId = j;
          }
        }

        if (maxScore > globalMaxScore) globalMaxScore = maxScore;

        if (maxScore > threshold) {
          const cx = output[0 * numBoxes + i];
          const cy = output[1 * numBoxes + i];
          const w = output[2 * numBoxes + i];
          const h = output[3 * numBoxes + i];
          
          boxes.push({
            box: [cx - w/2, cy - h/2, w, h],
            score: maxScore,
            classId
          });
        }
      }

      // Simple greedy NMS
      const finalBoxes = [];
      boxes.sort((a, b) => b.score - a.score);
      const picked = new Set();
      for (let i = 0; i < boxes.length; i++) {
        if (picked.has(i)) continue;
        finalBoxes.push(boxes[i]);
        for (let j = i + 1; j < boxes.length; j++) {
          if (calculateIoU(boxes[i].box, boxes[j].box) > 0.45) {
            picked.add(j);
          }
        }
      }

      // 4. Drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scaleX = canvas.width / inputSize;
      const scaleY = canvas.height / inputSize;

      finalBoxes.forEach(b => {
        const [x, y, w, h] = b.box;
        ctx.strokeStyle = "#c7ff00";
        ctx.lineWidth = 2;
        ctx.strokeRect(x * scaleX, y * scaleY, w * scaleX, h * scaleY);

        ctx.fillStyle = "#c7ff00";
        ctx.font = "bold 12px Inter, sans-serif";
        const labelText = `${currentLabels[b.classId] || 'unknown'} ${(b.score * 100).toFixed(0)}%`;
        const textWidth = ctx.measureText(labelText).width;
        ctx.fillRect(x * scaleX, y * scaleY - 15, textWidth + 10, 15);
        ctx.fillStyle = "black";
        ctx.fillText(labelText, x * scaleX + 5, y * scaleY - 4);
      });

      // Update Debug Info
      const endTime = performance.now();
      const fps = Math.round(1000 / (endTime - startTime));
      setDebugInfo({
        fps,
        shape: `${shape[1]}x${shape[2]}`,
        maxScore: globalMaxScore
      });

    } catch (err) {
      console.error("Inference Error:", err);
    }

    if (isRunningRef.current) {
      requestRef.current = requestAnimationFrame(runInferenceLoop);
    }
  };

  const calculateIoU = (boxA: number[], boxB: number[]) => {
    const x1 = Math.max(boxA[0], boxB[0]);
    const y1 = Math.max(boxA[1], boxB[1]);
    const x2 = Math.min(boxA[0] + boxA[2], boxB[0] + boxB[2]);
    const y2 = Math.min(boxA[1] + boxA[3], boxB[0] + boxB[3]);
    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const union = (boxA[2] * boxA[3]) + (boxB[2] * boxB[3]) - intersection;
    return intersection / union;
  };

  if (!modelData) {
    return (
      <div className="bg-[var(--surface-container)] rounded-xl border border-[var(--outline-variant)] p-12 text-center">
        <Camera className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Model Not Trained</h2>
        <p className="text-sm text-gray-400">Please train the model from the Dashboard before testing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 backdrop-blur-md">
          <button
            onClick={() => setMode("api")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black tracking-[0.2em] transition-all duration-500 ${mode === "api" ? "bg-[var(--primary)] text-black shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]" : "text-gray-500 hover:text-gray-300"
              }`}
          >
            <ImageIcon size={14} /> {t('projectDetail.testing.api')?.toUpperCase() || "VALIDATION"}
          </button>
          <button
            onClick={() => setMode("webcam")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black tracking-[0.2em] transition-all duration-500 ${mode === "webcam" ? "bg-[var(--primary)] text-black shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]" : "text-gray-500 hover:text-gray-300"
              }`}
          >
            <Video size={14} /> {t('projectDetail.testing.webcam')?.toUpperCase() || "LIVE STREAM"}
          </button>
        </div>

        {/* Model Selector Dropdown */}
        <div className="flex items-center gap-4 bg-black/40 p-1.5 px-4 rounded-xl border border-white/5 backdrop-blur-md min-w-[280px]">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Active Model</span>
            <select
              value={selectedModelId}
              onChange={(e) => {
                setSelectedModelId(e.target.value);
                sessionRef.current = null; // Clear session to reload
                if (isCameraOn) stopCamera();
              }}
              className="bg-transparent text-[var(--primary)] text-xs font-bold focus:outline-none cursor-pointer pr-4 appearance-none"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23c7ff00\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '12px' }}
            >
              {models.map((m, idx) => (
                <option key={m.id} value={m.id} className="bg-[#1a1a1a]">
                  RUN #{models.length - idx} • mAP: {(m.latest_accuracy * 100).toFixed(1)}%
                </option>
              ))}
              {models.length === 0 && <option>No Training History</option>}
            </select>
          </div>
          {modelData?.latest_accuracy > 0 && (
            <div className="ml-auto pl-4 border-l border-white/10">
              <div className="text-[14px] font-black text-white leading-none">{(modelData.latest_accuracy * 100).toFixed(1)}%</div>
              <div className="text-[8px] text-[var(--primary)] font-bold uppercase tracking-tighter">Precision</div>
            </div>
          )}
        </div>
      </div>

      {mode === "api" && (
        <div className="bg-[var(--surface-container)] rounded-xl border border-[var(--outline-variant)] p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">Validation Set Results</h2>
              <p className="text-sm text-gray-400">Historical images with server-side detection boxes.</p>
            </div>
            <button
              onClick={fetchValidationImages}
              disabled={loadingImages}
              className="p-2 bg-[var(--surface-container-high)] hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
            >
              <RefreshCw size={18} className={loadingImages ? "animate-spin" : ""} />
            </button>
          </div>

          {loadingImages ? (
            <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-[var(--primary)]" /></div>
          ) : valImages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {valImages.map((src, idx) => (
                <div key={idx} className="bg-black/50 border border-[var(--outline-variant)] rounded-xl overflow-hidden shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${API_URL}${src}`} alt={`Validation ${idx}`} className="w-full object-contain max-h-[450px]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-[var(--outline-variant)] rounded-xl">
              <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-sm text-gray-400">No validation images found for this model run.</p>
            </div>
          )}
        </div>
      )}

      {mode === "webcam" && (
        <div className="bg-[var(--surface-container)] rounded-xl border border-[var(--outline-variant)] p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">Webcam Edge Inference</h2>
              <p className="text-sm text-gray-400">Running <span className="text-[var(--primary)] font-mono">ort-web</span> directly in your browser.</p>
            </div>
            <div className="flex gap-2">
              {isModelLoading ? (
                <div className="flex items-center gap-2 px-4 py-2 text-gray-500 text-xs font-bold uppercase tracking-widest">
                  <Loader2 size={14} className="animate-spin" /> Downloading Model...
                </div>
              ) : !isCameraOn ? (
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 rounded-lg font-bold tracking-widest text-xs uppercase flex items-center transition-colors"
                >
                  <Play size={14} className="mr-2" /> {t('projectDetail.testing.startCamera') || "Initialize AI & Camera"}
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30 rounded-lg font-bold tracking-widest text-xs uppercase flex items-center transition-colors"
                >
                  <StopCircle size={14} className="mr-2" /> {t('projectDetail.testing.stopCamera') || "Release Resources"}
                </button>
              )}
            </div>
          </div>

          <div className="relative bg-[#0a0a0a] rounded-2xl border border-[var(--outline-variant)] overflow-hidden aspect-video flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] group">
            {!isCameraOn && !isModelLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700 z-10 bg-white/[0.02]">
                <div className="p-8 rounded-full bg-white/5 mb-4 border border-white/5">
                  <Camera className="w-16 h-16 opacity-20" />
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.3em] opacity-40">System Idle</p>
              </div>
            )}
            
            {isModelLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80 backdrop-blur-md">
                 <div className="relative mb-6">
                    <RefreshCw className="w-16 h-16 text-[var(--primary)] animate-spin" />
                    <div className="absolute inset-0 bg-[var(--primary)] blur-xl opacity-20 animate-pulse" />
                 </div>
                 <p className="text-sm font-black text-white uppercase tracking-[0.4em] animate-pulse">Syncing Neural Weights...</p>
                 <p className="text-[10px] text-gray-500 mt-2 uppercase font-bold tracking-widest">Optimizing for Client-Side Inference</p>
              </div>
            )}

            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-opacity duration-700 ${isCameraOn ? "opacity-100" : "opacity-0"}`} 
            />
            
            <canvas 
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-10 object-cover"
            />

            {isCameraOn && (
              <>
                <div className="absolute top-6 left-6 flex flex-col gap-2">
                  <div className="bg-black/60 text-[10px] text-[var(--primary)] px-4 py-2 rounded-full font-black tracking-widest border border-[var(--primary)]/40 backdrop-blur-md flex items-center shadow-2xl">
                    <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse mr-3 shadow-[0_0_10px_var(--primary)]" />
                    LOCAL ONNX INFERENCE ACTIVE
                  </div>
                  <div className="flex gap-2">
                    <div className="bg-black/40 text-[9px] text-white/60 px-3 py-1.5 rounded-full font-bold tracking-widest border border-white/10 backdrop-blur-md">
                      {debugInfo.shape || "WAITING..."}
                    </div>
                    <div className="bg-black/40 text-[9px] text-white/60 px-3 py-1.5 rounded-full font-bold tracking-widest border border-white/10 backdrop-blur-md">
                      {debugInfo.fps} FPS
                    </div>
                  </div>
                </div>

                {/* Debug Performance Overlay */}
                <div className="absolute bottom-6 left-6 bg-black/80 p-3 rounded-xl border border-white/10 backdrop-blur-xl z-20 min-w-[140px]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Max Confidence</span>
                    <span className={`text-xs font-mono font-bold ${debugInfo.maxScore > 0.4 ? "text-[var(--primary)]" : "text-gray-400"}`}>
                      {(debugInfo.maxScore * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-[var(--primary)] h-full transition-all duration-300"
                      style={{ width: `${debugInfo.maxScore * 100}%` }}
                    />
                  </div>
                  <p className="text-[8px] text-gray-600 mt-2 uppercase font-black tracking-widest">
                    {debugInfo.maxScore > 0.25 ? "Object Recognized" : "Scanning..."}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-[var(--outline-variant)] border-dashed">
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Detected Classes In This Model:</p>
            <div className="flex flex-wrap gap-2">
              {labels.map(l => (
                <span key={l} className="px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-bold rounded border border-[var(--primary)]/20 uppercase">
                  {l}
                </span>
              ))}
              {labels.length === 0 && <span className="text-[10px] text-gray-600 italic">No labels detected</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Helper Functions ---
function calculateIoU(box1: number[], box2: number[]): number {
  const [x1, y1, w1, h1] = box1;
  const [x2, y2, w2, h2] = box2;
  const x_overlap = Math.max(0, Math.min(x1 + w1, x2 + w2) - Math.max(x1, x2));
  const y_overlap = Math.max(0, Math.min(y1 + h1, y2 + h2) - Math.max(y1, y2));
  const intersection = x_overlap * y_overlap;
  const union = w1 * h1 + w2 * h2 - intersection;
  return intersection / union;
}

