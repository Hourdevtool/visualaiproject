"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Settings2, Database, ShieldCheck, UploadCloud, ArrowRight, Loader2, Check, Folder } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "../../../../providers/LanguageProvider";

export default function CreateProjectPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useLanguage();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [projectName, setProjectName] = useState("");
  const [category, setCategory] = useState("Image Recognition");
  const [description, setDescription] = useState("");
  const [processingMode, setProcessingMode] = useState("batch");
  const [threshold, setThreshold] = useState(0.5);
  const [sourceType, setSourceType] = useState("Image");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);

  const categoryOptions = [
    { id: "Security", label: t('userDashboard.categories.security') || "Security" },
    { id: "Manufacturing", label: t('userDashboard.categories.manufacturing') || "Manufacturing" },
    { id: "Agriculture", label: t('userDashboard.categories.agriculture') || "Agriculture" },
    { id: "Healthcare", label: t('userDashboard.categories.healthcare') || "Healthcare" },
    { id: "Retail", label: t('userDashboard.categories.retail') || "Retail" },
    { id: "Image Recognition", label: "Image Recognition" }
  ];

  const modeOptions = [
    { id: "batch", label: t('createProjectPage.processingModeStandard') || "Batch" },
    { id: "realtime", label: t('createProjectPage.processingModeRealtime') || "Real-time" }
  ];

  const handleNext = () => {
    if (step === 1 && !projectName.trim()) {
      toast.error(t('createProjectPage.errorNameRequired') || "Project name is required.");
      return;
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        toast.error("File size exceeds 500MB limit.");
        return;
      }
      setZipFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!session?.accessToken) return;
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      
      const projectData = {
        project_name: projectName,
        category: category,
        description: description,
        threshold: threshold,
        processing_mode: processingMode.toLowerCase().replace(' ', '_'),
        source_type: sourceType.toLowerCase(),
        is_public: isPublic,
        encryption_enabled: encryptionEnabled
      };

      formData.append("data", JSON.stringify(projectData));
      if (zipFile) {
        formData.append("zip_file", zipFile);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/projects/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        },
        body: formData
      });

      if (!res.ok) {
        throw new Error("Failed to create project");
      }

      const data = await res.json();
      toast.success("Project created successfully!");
      router.push(`/user/projects/${data.id}`);
      
    } catch (err) {
      console.error(err);
      toast.error(t('createProjectPage.errorCreation') || "Failed to initialize project.");
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: t('createProjectPage.stepIdentity') || "IDENTITY", desc: t('createProjectPage.stepIdentityDesc') || "Core details", icon: Cpu },
    { id: 2, title: t('createProjectPage.stepWorkflow') || "WORKFLOW", desc: t('createProjectPage.stepWorkflowDesc') || "Processing setup", icon: Settings2 },
    { id: 3, title: t('createProjectPage.stepSource') || "SOURCE", desc: t('createProjectPage.stepSourceDesc') || "Data origin", icon: Database },
    { id: 4, title: t('createProjectPage.stepSecurity') || "SECURITY", desc: t('createProjectPage.stepSecurityDesc') || "Access control", icon: ShieldCheck }
  ];

  return (
    <div className="min-h-screen font-sans pt-24 pb-12 px-6 flex items-center justify-center relative">

      <div className="max-w-5xl w-full bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10 min-h-[600px]">
        
        {/* Left Sidebar (Wizard Steps) */}
        <div className="w-full md:w-1/3 bg-[var(--surface-container)] p-10 border-r border-[var(--outline-variant)] flex flex-col relative overflow-hidden">
          {/* Subtle noise/texture overlay could go here */}
          
          <div className="mb-12 relative z-10">
            <h4 className="text-[10px] font-bold tracking-widest text-[var(--primary)] uppercase mb-4">Latent Precision</h4>
            <h2 className="text-2xl font-bold text-white mb-2 font-['Space_Grotesk']">{t('createProjectPage.title') || 'Initialize Project'}</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              {t('createProjectPage.subtitle') || 'Establish the core identity and namespace for your new processing pipeline.'}
            </p>
          </div>

          <div className="space-y-6 relative z-10 flex-1">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isPast = step > s.id;
              
              return (
                <div key={s.id} className="flex items-start relative group">
                  {idx !== steps.length - 1 && (
                    <div className={`absolute left-[19px] top-[40px] bottom-[-24px] w-[1px] ${isPast ? 'bg-[var(--primary)]' : 'bg-[var(--outline-variant)]'}`} />
                  )}
                  <div className={`relative flex items-center justify-center w-10 h-10 rounded-lg border transition-colors duration-300 ${isActive ? 'bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)] shadow-[0_0_15px_rgba(255,177,197,0.2)]' : isPast ? 'bg-[var(--primary)] border-[var(--primary)] text-black' : 'bg-[var(--surface-container-high)] border-[var(--outline-variant)] text-gray-500'}`}>
                    {isPast ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="ml-4 pt-1">
                    <h3 className={`text-xs font-bold tracking-widest uppercase transition-colors ${isActive ? 'text-white' : isPast ? 'text-gray-300' : 'text-gray-500'}`}>{s.title}</h3>
                    <p className={`text-xs mt-1 transition-colors ${isActive ? 'text-[var(--primary)]' : 'text-gray-500'}`}>{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="w-full md:w-2/3 p-10 flex flex-col bg-[var(--surface-container-lowest)] relative overflow-hidden">
          
          <div className="mb-8">
            <h3 className="text-lg font-medium text-white mb-1">
              {(t('createProjectPage.stepText') || 'Step {step} of 4: {name}')
                .replace('{step}', step.toString())
                .replace('{name}', steps[step - 1].title)}
            </h3>
            <div className="w-full h-1 bg-[var(--surface-variant)] rounded-full mt-4 overflow-hidden">
              <motion.div 
                className="h-full bg-[var(--primary)]"
                initial={{ width: `${((step - 1) / 4) * 100}%` }}
                animate={{ width: `${(step / 4) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <div className="flex-1 relative">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-widest text-gray-400 uppercase">{t('createProjectPage.projectName') || 'Project Name'}</label>
                    <input 
                      type="text" 
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder={t('createProjectPage.projectNamePlaceholder') || 'e.g. Project Apollo'}
                      className="w-full bg-[var(--surface-container)] border border-[var(--outline-variant)] rounded-lg p-3 text-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all outline-none"
                    />
                    <p className="text-xs text-gray-500">{t('createProjectPage.projectNameHint') || 'Must be unique within your organization.'}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-widest text-gray-400 uppercase">{t('createProjectPage.projectCategory') || 'Project Category'}</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[var(--surface-container)] border border-[var(--outline-variant)] rounded-lg p-3 text-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all outline-none appearance-none cursor-pointer"
                    >
                      {categoryOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-widest text-gray-400 uppercase">{t('createProjectPage.description') || 'Description'}</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('createProjectPage.descriptionPlaceholder') || "Provide a brief overview of the project's purpose and scope..."}
                      className="w-full bg-[var(--surface-container)] border border-[var(--outline-variant)] rounded-lg p-3 text-white focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all outline-none resize-none h-32"
                    />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <label className="text-xs font-bold tracking-widest text-gray-400 uppercase">{t('createProjectPage.processingMode') || 'Processing Mode'}</label>
                    <div className="grid grid-cols-1 gap-3">
                      {modeOptions.map(opt => (
                        <label key={opt.id} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${processingMode === opt.id ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--outline-variant)] bg-[var(--surface-container)] hover:border-gray-500'}`}>
                          <input type="radio" name="mode" value={opt.id} checked={processingMode === opt.id} onChange={() => setProcessingMode(opt.id)} className="hidden" />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-4 ${processingMode === opt.id ? 'border-[var(--primary)]' : 'border-gray-500'}`}>
                            {processingMode === opt.id && <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />}
                          </div>
                          <span className="text-sm font-medium text-white">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold tracking-widest text-gray-400 uppercase">{t('createProjectPage.threshold') || 'Confidence Threshold'}</label>
                      <span className="text-[var(--primary)] font-mono text-sm">{threshold.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                      className="w-full accent-[var(--primary)] h-1 bg-[var(--surface-variant)] rounded-full appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500">{t('createProjectPage.thresholdHint') || 'Set the minimum confidence level for the AI to flag an anomaly.'}</p>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-widest text-gray-400 uppercase">{t('createProjectPage.uploadZip') || 'Upload Archive (Optional)'}</label>
                    <div className=" h-[50vh] border-2 border-dashed border-[var(--outline-variant)] rounded-xl p-8 flex flex-col items-center justify-center text-center bg-[var(--surface-container)]/50 hover:bg-[var(--surface-container)] transition-colors relative group">
                      <input 
                        type="file" 
                        accept=".zip" 
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                      <UploadCloud className="w-10 h-10 text-gray-400 mb-4 group-hover:text-[var(--primary)] transition-colors" />
                      {zipFile ? (
                        <div>
                          <p className="text-sm text-[var(--primary)] font-medium">{zipFile.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{(zipFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-300 font-medium">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-500 mt-2">{t('createProjectPage.uploadZipDesc') || 'A .zip file (Max 500MB). Not required for initial setup.'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  <div className="p-6 border border-[var(--outline-variant)] bg-[var(--surface-container)] rounded-xl flex items-start space-x-4 cursor-pointer hover:border-gray-500 transition-colors" onClick={() => setIsPublic(!isPublic)}>
                    <div className={`w-6 h-6 rounded flex items-center justify-center mt-0.5 transition-colors ${isPublic ? 'bg-[var(--primary)] text-black' : 'border border-[var(--outline-variant)]'}`}>
                      {isPublic && <Check className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest">{t('createProjectPage.isPublic') || 'Public Marketplace'}</h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{t('createProjectPage.isPublicDesc') || 'Allow other users in the network to view and clone this project.'}</p>
                    </div>
                  </div>

                  <div className="p-6 border border-[var(--primary)]/30 bg-[var(--primary)]/5 rounded-xl flex items-start space-x-4 cursor-pointer" onClick={() => setEncryptionEnabled(!encryptionEnabled)}>
                    <div className={`w-6 h-6 rounded flex items-center justify-center mt-0.5 transition-colors ${encryptionEnabled ? 'bg-[var(--primary)] text-black' : 'border border-[var(--outline-variant)]'}`}>
                      {encryptionEnabled && <Check className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest">{t('createProjectPage.encryption') || 'End-to-End Encryption'}</h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{t('createProjectPage.encryptionDesc') || 'Encrypt all assets using Latent Precision zero-knowledge protocols.'}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--outline-variant)] flex items-center justify-between">
            <button 
              onClick={step === 1 ? () => router.push('/user') : handleBack}
              className="px-6 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              {t('createProjectPage.btnCancel') || 'Cancel'}
            </button>
            
            {step < 4 ? (
              <button 
                onClick={handleNext}
                className="px-6 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-black text-sm font-bold uppercase tracking-widest rounded-lg transition-all flex items-center hover:scale-105"
              >
                {step === 1 ? (t('createProjectPage.btnNext') || 'Continue to Workflow') : 
                 step === 2 ? (t('createProjectPage.btnNextSource') || 'Continue to Source') : 
                 (t('createProjectPage.btnNextSecurity') || 'Continue to Security')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-black text-sm font-bold uppercase tracking-widest rounded-lg transition-colors flex items-center hover:scale-105"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('createProjectPage.btnCreating') || 'Initializing...'}
                  </>
                ) : (
                  <>
                    {t('createProjectPage.btnSubmit') || 'Initialize System'}
                    <Cpu className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
