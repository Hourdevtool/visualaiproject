"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "../../../../../providers/LanguageProvider";
import { UploadCloud, FolderOpen, Image as ImageIcon, Loader2, Trash2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface DatasetTabProps {
  project: any;
}

export default function DatasetTab({ project }: DatasetTabProps) {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  const [folderName, setFolderName] = useState("train");
  const [isNewFolder, setIsNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const [existingFolders, setExistingFolders] = useState<string[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [totalImages, setTotalImages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (token) {
      fetchFolders();
      fetchImages(1);
    }
  }, [token, project.id]);

  const fetchFolders = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/projects/${project.id}/dataset/folders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setExistingFolders(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchImages = async (page: number) => {
    try {
      setLoadingData(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/projects/${project.id}/dataset/images?page=${page}&limit=${ITEMS_PER_PAGE}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setImages(data.images);
        setTotalImages(data.total);
        setCurrentPage(data.page);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleFiles = (files: FileList | File[]) => {
    const validFiles: File[] = Array.from(files).filter(f => f.type.startsWith("image/") || f.name.endsWith(".zip"));
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleUpload = async () => {
    if (!token || selectedFiles.length === 0) return;
    const finalFolder = isNewFolder ? newFolderName : folderName;
    if (!finalFolder.trim()) {
      toast.error("Please specify a folder name");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    selectedFiles.forEach(f => formData.append("files", f));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/projects/${project.id}/dataset/${finalFolder}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error("Upload failed");
      
      toast.success("Upload successful");
      setSelectedFiles([]);
      setNewFolderName("");
      setIsNewFolder(false);
      fetchFolders();
      fetchImages(1);
      setActiveTab("all");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (img: any) => {
    toast(`Delete image ${img.name}?`, {
      action: {
        label: "Confirm Delete",
        onClick: () => deleteImage(img.category, img.name)
      },
      cancel: {
        label: "Cancel",
        onClick: () => console.log("Deletion cancelled")
      },
    });
  };

  const deleteImage = async (category: string, filename: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/projects/${project.id}/dataset/${category}/${filename}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success("Image removed");
        fetchImages(currentPage);
        fetchFolders();
      } else {
        toast.error("Failed to delete");
      }
    } catch (err) {
      toast.error("Error occurred");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full font-sans">
      {/* Left: Sidebar & Controls */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
        {/* Navigation */}
        <div className="bg-[var(--surface-container)] rounded-2xl border border-[var(--outline-variant)] p-4">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 px-2">Data Explorer</h3>
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all ${
                activeTab === "all" ? "bg-[var(--primary)] text-white" : "text-gray-400 hover:bg-white/5"
              }`}
            >
              <FolderOpen size={16} className="mr-3" />
              <span className="text-sm font-medium">All Assets</span>
            </button>
            <button
              onClick={() => setActiveTab("__upload__")}
              className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all ${
                activeTab === "__upload__" ? "bg-white text-black" : "text-gray-400 hover:bg-white/5"
              }`}
            >
              <UploadCloud size={16} className="mr-3" />
              <span className="text-sm font-medium">Upload New</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-[var(--surface-container)] rounded-2xl border border-[var(--outline-variant)] p-6">
           <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Total Dataset Volume</p>
           <p className="text-3xl font-extrabold text-white">{totalImages}</p>
           <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Across {existingFolders.length} Categories</p>
        </div>
      </div>

      {/* Right: Content */}
      <div className="flex-1 min-h-[600px] flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === "__upload__" ? (
            <motion.div 
              key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-[var(--surface-container)] border border-[var(--outline-variant)] rounded-2xl p-8 flex-1"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">Ingest Training Data</h2>
                <button onClick={() => setActiveTab("all")} className="text-xs text-gray-500 hover:text-white uppercase tracking-widest font-bold">Cancel</button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                {/* Left: Configuration */}
                <div className="xl:col-span-3 space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Target Folder</label>
                    {isNewFolder ? (
                      <div className="flex gap-2">
                        <input 
                          type="text" autoFocus placeholder="Enter new category name..."
                          value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                          className="flex-1 bg-[var(--surface-container-high)] border border-[var(--outline-variant)] rounded-xl p-4 text-white focus:border-[var(--primary)] outline-none"
                        />
                        <button onClick={() => setIsNewFolder(false)} className="p-4 bg-gray-800 rounded-xl text-gray-400"><Plus className="rotate-45" /></button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <select 
                          value={folderName} onChange={(e) => setFolderName(e.target.value)}
                          className="flex-1 bg-[var(--surface-container-high)] border border-[var(--outline-variant)] rounded-xl p-4 text-white appearance-none outline-none focus:border-[var(--primary)] cursor-pointer"
                        >
                          {existingFolders
                            .filter(f => !['train', 'val', 'test', 'yolo_dataset'].includes(f) && !f.toLowerCase().startsWith('run_'))
                            .map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))
                          }
                        </select>
                        <button onClick={() => setIsNewFolder(true)} className="p-4 bg-gray-800 rounded-xl text-[var(--primary)] hover:bg-rose-500/10 transition"><Plus /></button>
                      </div>
                    )}
                  </div>

                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }}
                    className={`border-2 border-dashed rounded-2xl p-12 min-h-[300px] flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isDragging ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--outline-variant)] hover:bg-white/5"
                    }`}
                  >
                    <input type="file" ref={fileInputRef} multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
                    <UploadCloud size={48} className={`mb-4 ${isDragging ? "text-[var(--primary)]" : "text-gray-600"}`} />
                    <p className="text-sm font-bold text-white mb-1">Click or drag images</p>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">JPG, PNG, WEBP, ZIP</p>
                  </div>
                </div>

                {/* Right: Queue Area */}
                <div className="xl:col-span-2 flex flex-col bg-[var(--surface-container-high)] rounded-2xl border border-[var(--outline-variant)] overflow-hidden min-h-[450px]">
                   <div className="p-4 border-b border-[var(--outline-variant)] bg-black/20 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Queue ({selectedFiles.length})</span>
                      <button onClick={() => setSelectedFiles([])} className="text-[9px] text-rose-500 font-bold uppercase hover:underline">Clear</button>
                   </div>
                   <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar max-h-[400px]">
                      {selectedFiles.length > 0 ? (
                        selectedFiles.map((f, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-[var(--surface-container)] rounded-xl border border-[var(--outline-variant)]">
                            <span className="text-xs text-gray-300 truncate pr-4">{f.name}</span>
                            <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-600 hover:text-rose-500"><Trash2 size={14} /></button>
                          </div>
                        ))
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50 space-y-2">
                           <Plus size={24} />
                           <span className="text-[10px] uppercase font-bold tracking-widest">Waiting for Assets</span>
                        </div>
                      )}
                   </div>
                   <div className="p-4 mt-auto">
                      <button 
                        onClick={handleUpload} disabled={uploading || selectedFiles.length === 0}
                        className="w-full py-4 bg-[var(--primary)] text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-rose-500 shadow-xl shadow-rose-950/20 transition-all disabled:opacity-50"
                      >
                        {uploading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Initialize Pipeline"}
                      </button>
                   </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="explorer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col"
            >
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">Repository Overview</h2>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => fetchImages(currentPage - 1)} disabled={currentPage === 1 || loadingData}
                      className="p-2 bg-[var(--surface-container)] rounded-lg border border-[var(--outline-variant)] disabled:opacity-30"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mx-2">Page {currentPage} of {Math.ceil(totalImages / ITEMS_PER_PAGE)}</span>
                    <button 
                      onClick={() => fetchImages(currentPage + 1)} disabled={currentPage * ITEMS_PER_PAGE >= totalImages || loadingData}
                      className="p-2 bg-[var(--surface-container)] rounded-lg border border-[var(--outline-variant)] disabled:opacity-30"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
               </div>

               <div className="bg-[var(--surface-container)] border border-[var(--outline-variant)] rounded-2xl p-6 flex-1 overflow-y-auto custom-scrollbar">
                  {loadingData ? (
                    <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[var(--primary)]" size={32} /></div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                      {images.map((img, i) => (
                        <div key={i} className="aspect-square bg-[var(--surface-container-high)] rounded-xl border border-[var(--outline-variant)] overflow-hidden relative group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${img.url}`} alt={img.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                             <span className="bg-[var(--primary)] text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded self-start tracking-widest">{img.category}</span>
                             <button onClick={() => confirmDelete(img)} className="w-full py-2 bg-rose-500 text-white text-[9px] font-bold uppercase tracking-widest rounded-lg transition-transform hover:scale-105 active:scale-95">Purge Asset</button>
                          </div>
                        </div>
                      ))}
                      {images.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-600">
                          <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
                          <p className="text-xs uppercase tracking-widest font-bold">No images found in this segment</p>
                        </div>
                      )}
                    </div>
                  )}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
