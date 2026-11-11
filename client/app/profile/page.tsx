"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { User, Trash2, ShieldAlert, Loader2, Info, Pencil } from "lucide-react";
import { useLanguage } from "../../providers/LanguageProvider";

export default function ProfileSettingsPage() {
  const { data: session, update, status } = useSession({
    required: true,
    onUnauthenticated() {
      signIn();
    },
  });
  
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localImage, setLocalImage] = useState<string | null>(null);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
      </div>
    );
  }

  const displayImage = localImage || session?.user?.image;

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    const loadingToast = toast.loading("Uploading image...");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/users/me/profile-image`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.accessToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to upload image");
      }

      const data = await res.json();
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const fullUrl = data.profile_url.startsWith('http') ? data.profile_url : `${backendUrl}${data.profile_url}`;
      
      setLocalImage(fullUrl);
      await update({ image: fullUrl });

      toast.success(t('profile.uploadSuccess') || "Profile image updated successfully!", { id: loadingToast });
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteImage = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/users/me/profile-image`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session?.accessToken}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to delete image");
      }

      setLocalImage(null);
      await update({ image: null });
      toast.success(t('profile.deleteImgSuccess') || "Profile image removed.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    toast.custom((id) => (
      <div className="bg-rose-950/90 border border-rose-500/50 p-5 rounded-2xl shadow-2xl shadow-rose-900/50 flex flex-col gap-3 w-[350px] backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-rose-400" />
        <div className="flex items-start gap-3">
          <ShieldAlert className="text-rose-400 shrink-0 mt-0.5" size={24} />
          <div>
            <h3 className="text-rose-100 font-bold text-base font-['Space_Grotesk']">
              {t('profile.confirmDelete') || "Are you absolutely sure?"}
            </h3>
            <p className="text-rose-200/70 text-xs mt-1 leading-relaxed">
              {t('profile.confirmDeleteDesc') || "This action cannot be undone. All your data will be permanently removed."}
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <button 
            onClick={() => toast.dismiss(id)}
            className="px-4 py-2 rounded-lg text-xs font-bold text-rose-200 hover:bg-rose-900/50 transition-colors uppercase tracking-widest"
          >
            {t('profile.btnCancel') || "Cancel"}
          </button>
          <button 
            onClick={async () => {
              toast.dismiss(id);
              try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/users/me`, {
                  method: "DELETE",
                  headers: { "Authorization": `Bearer ${session?.accessToken}` },
                });
                if (!res.ok) {
                  const errorData = await res.json();
                  throw new Error(errorData.detail || "Failed to delete account");
                }
                toast.success(t('profile.deleteAccSuccess') || "Account deleted successfully.");
                await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/auth/logout`, { method: "POST" });
                signOut({ callbackUrl: "/login" });
              } catch (error: any) {
                toast.error(error.message);
              }
            }}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 uppercase tracking-widest flex items-center"
          >
            <Trash2 size={14} className="mr-1.5" />
            {t('profile.btnConfirm') || "Confirm Delete"}
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] text-gray-300 pt-28 pb-12 px-6 flex justify-center items-start">
      
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[10%] left-[20%] w-[30vw] h-[30vw] rounded-full bg-[var(--primary)]/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl z-10"
      >
        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white font-['Space_Grotesk'] tracking-tight mb-2">
            {t('profile.title') || "Profile Settings"}
          </h1>
          <p className="text-sm text-gray-400">
            {t('profile.subtitle') || "Manage your network identity and access credentials."}
          </p>
        </div>

        {/* Premium Combined Card */}
        <div className="bg-[var(--surface-container)]/80 backdrop-blur-2xl rounded-3xl p-8 md:p-10 border border-[var(--outline-variant)] shadow-2xl shadow-black/50 relative overflow-hidden">
          {/* Top Edge Highlight */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-50" />
          
          <div className="flex flex-col md:flex-row gap-12 items-center md:items-start">
            
            {/* Left: Avatar Column */}
            <div className="flex flex-col items-center w-full md:w-auto shrink-0 relative">
              <div 
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`relative group w-36 h-36 rounded-full p-1 bg-gradient-to-br from-[var(--outline-variant)] to-[var(--surface-container-high)] shadow-xl md:mb-0 mb-4 ${isUploading ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:shadow-2xl transition-all'}`}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-[var(--surface)] relative border-2 border-transparent">
                  {displayImage ? (
                    <img src={displayImage} alt="Profile" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <User size={56} strokeWidth={1.5} />
                    </div>
                  )}

                  {/* Dark overlay with circular pencil */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploading ? (
                      <Loader2 className="animate-spin text-white" size={32} />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <Pencil size={20} strokeWidth={2.5} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Floating Delete Button */}
              {displayImage && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteImage(); }}
                  disabled={isDeleting || isUploading}
                  title={t('profile.removeImg') || "Remove"}
                  className="absolute top-0 right-0 md:-right-2 w-10 h-10 bg-[var(--surface-container-highest)] border-4 border-[var(--surface-container)] text-rose-400 rounded-full flex items-center justify-center shadow-xl hover:bg-rose-500/20 hover:text-rose-300 hover:scale-110 transition-all disabled:opacity-50 disabled:hover:scale-100 z-10"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              )}

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg, image/png, image/webp"
                onChange={handleUploadImage}
              />
            </div>

            {/* Right: Settings Content */}
            <div className="flex-1 w-full space-y-8">
              
              {/* Account Information Section */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center border-b border-[var(--outline-variant)] pb-3">
                  <Info size={18} className="mr-2 text-[var(--primary)]" />
                  {t('profile.accountInfo') || "Account Information"}
                </h3>
                
                <div className="space-y-5">
                  <div className="bg-[var(--surface-container-high)] p-4 rounded-xl border border-[var(--outline-variant)]">
                    <label className="block text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">
                      {t('profile.emailLabel') || "Email Address"}
                    </label>
                    <div className="text-gray-300 font-medium">
                      {session?.user?.email}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2">
                      {t('profile.emailHint') || "Email cannot be changed as it is tied to your identity provider."}
                    </p>
                  </div>

                  <div className="bg-[var(--surface-container-high)] p-4 rounded-xl border border-[var(--outline-variant)] flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                      {t('profile.statusLabel') || "Account Status"}
                    </span>
                    <div className="flex items-center space-x-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-400 tracking-wide">
                        {t('profile.statusActive') || "Active & Authenticated"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone Section */}
              <div className="pt-4">
                <div className="bg-rose-500/5 p-6 rounded-xl border border-rose-500/20 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/50" />
                  <h3 className="text-lg font-bold text-rose-400 mb-2 flex items-center">
                    <ShieldAlert size={18} className="mr-2" /> 
                    {t('profile.dangerZone') || "Danger Zone"}
                  </h3>
                  <p className="text-xs text-gray-400 mb-6 leading-relaxed max-w-md">
                    {t('profile.dangerDesc') || "Permanently remove your account and all associated data from the Latent Precision servers. This action is irreversible."}
                  </p>
                  
                  <button
                    onClick={confirmDeleteAccount}
                    className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white text-xs font-bold uppercase tracking-widest rounded-lg border border-rose-500/20 transition-all shadow-lg hover:shadow-rose-500/20 flex items-center"
                  >
                    <Trash2 size={16} className="mr-2" /> 
                    {t('profile.btnDeleteAcc') || "Delete Account"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
