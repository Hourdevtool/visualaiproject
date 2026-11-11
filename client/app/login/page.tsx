"use client";

import { useLanguage } from "../../providers/LanguageProvider";
import { LanguageSelector } from "../../components/LanguageSelector";
import { Shield, Lock, Cpu, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { signIn, useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import { toast } from "sonner";

function LoginContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const error = searchParams.get("error");

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role) {
      if (session.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/user');
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (error) {
      toast.error(error, {
        duration: 5000,
      });
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center relative overflow-hidden font-sans text-gray-300">



      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md px-6 z-10"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold font-['Space_Grotesk'] text-white flex items-center justify-center space-x-2 mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-rose-400">Latent</span>
            <span>Precision Core</span>
          </h1>
          <p className="text-[10px] tracking-[0.2em] text-gray-500 font-bold uppercase">
            Architectural Imaging Interface V4.0
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[var(--surface-container)]/80 backdrop-blur-xl border border-[var(--outline-variant)] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary)] via-rose-400 to-[var(--primary)] opacity-50"></div>

          <h2 className="text-2xl font-bold text-white mb-2">{t('login.title')}</h2>
          <p className="text-sm text-gray-400 mb-8">{t('login.subtitle')}</p>

          <div className="flex flex-col gap-4 mb-4">
            <button onClick={() => signIn('google')} className="flex items-center justify-center py-3 px-4 bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)] border border-[var(--outline-variant)] rounded-xl transition-all group hover:border-gray-500">
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-xs font-bold tracking-widest text-gray-300 group-hover:text-white transition-colors">{t('login.google')}</span>
            </button>
            <button onClick={() => signIn('github')} className="flex items-center justify-center py-3 px-4 bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)] border border-[var(--outline-variant)] rounded-xl transition-all group hover:border-gray-500">
              <svg className="w-[18px] h-[18px] mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="text-xs font-bold tracking-widest text-gray-300 group-hover:text-white transition-colors">{t('login.github')}</span>
            </button>
          </div>

          <div className="mt-8 text-center text-xs text-gray-500">
            {t('login.warning')} <a href="#" className="text-[var(--primary)] hover:text-rose-300 ml-1 font-semibold transition-colors">{t('login.request')}</a>
          </div>
        </div>

        {/* Footer Badges */}
        <div className="mt-12 flex flex-wrap justify-center items-center gap-6 text-[10px] font-bold tracking-widest text-gray-600 uppercase">
          <div className="flex items-center">
            <Lock size={12} className="mr-2" /> {t('login.badge1')}
          </div>
          <div className="flex items-center">
            <Shield size={12} className="mr-2" /> {t('login.badge2')}
          </div>
          <div className="flex items-center">
            <Cpu size={12} className="mr-2" /> {t('login.badge3')}
          </div>
        </div>
      </motion.div>

      {/* Global Footer */}
      <div className="absolute bottom-6 w-full flex justify-center space-x-6 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
        <a href="#" className="hover:text-gray-300 transition-colors">{t('footer.privacy')}</a>
        <a href="#" className="hover:text-gray-300 transition-colors">{t('footer.terms')}</a>
        <span>{t('footer.copyright')}</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
