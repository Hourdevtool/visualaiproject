"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useRef, useEffect, Suspense } from "react";
import { LanguageSelector } from "./LanguageSelector";
import { useLanguage } from "../providers/LanguageProvider";
import { User, LogOut, Settings, Search, Loader2, FolderOpen, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchGuideOut {
  id: string;
  project_name: string;
  type: string;
}

export function Navbar() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search and Tabs state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchGuideOut[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const activeTab = searchParams.get('tab') || 'personal';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      handleLogout();
    }
  }, [session]);

  // Sync searchQuery state with URL
  useEffect(() => {
    const queryParam = searchParams.get('q');
    if (queryParam !== null) {
      setSearchQuery(queryParam);
    }
  }, [searchParams]);

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/auth/logout`, {
        method: 'POST',
      });
    } catch (e) {
      console.error(e);
    }
    signOut({ callbackUrl: '/login' });
  };

  // YouTube-style Search Effect
  useEffect(() => {
    const debounce = setTimeout(async () => {
      // Only show suggestions when typing actively, not on initial load from URL
      const currentUrlQuery = searchParams.get('q') || "";
      if (searchQuery.length >= 1 && searchQuery !== currentUrlQuery && session?.accessToken) {
        setIsSearching(true);
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/projects/search?q=${encodeURIComponent(searchQuery)}`, {
            headers: {
              Authorization: `Bearer ${session.accessToken}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data);
            setShowSuggestions(true);
          }
        } catch (err) {
          console.error("Search failed", err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSuggestions(false);
      }
    }, 300);
    
    return () => clearTimeout(debounce);
  }, [searchQuery, session, searchParams]);

  const handleSuggestionClick = (suggestion: SearchGuideOut) => {
    setSearchQuery(suggestion.project_name);
    setShowSuggestions(false);
    
    const targetTab = suggestion.type === 'personal' ? 'personal' : 'marketplace';
    router.push(`/user?tab=${targetTab}&q=${encodeURIComponent(suggestion.project_name)}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery) {
      router.push(`/user?tab=${activeTab}&q=${encodeURIComponent(searchQuery)}`);
      setShowSuggestions(false);
    } else {
      router.push(`/user?tab=${activeTab}`);
    }
  };

  const changeTab = (tab: string) => {
    const q = searchParams.get('q');
    if (q) {
      router.push(`/user?tab=${tab}&q=${encodeURIComponent(q)}`);
    } else {
      router.push(`/user?tab=${tab}`);
    }
  };

  const isAdminPath = pathname?.split('/').includes('admin');
  const isDashboardMode = session && (pathname === '/user' || pathname === '/admin');

  return (
    <nav className="fixed top-0 w-full z-[100] px-6 py-4 flex items-center justify-between pointer-events-none bg-[var(--surface)]/80 backdrop-blur-lg border-b border-[var(--outline-variant)]">
      <div className="flex items-center space-x-2 pointer-events-auto">
        <Link href="/">
          <h1 className="text-2xl font-bold font-['Space_Grotesk'] text-white">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-rose-400">Latent</span>
            <span>Precision</span>
          </h1>
        </Link>
      </div>

      {isDashboardMode && (
        <div className="flex-1 flex justify-center items-center px-8 pointer-events-auto hidden lg:flex space-x-8">
          {/* Tabs inside Navbar */}
          <div className="flex items-center space-x-6">
            <button 
              className={`flex items-center space-x-2 text-sm font-semibold transition-colors ${activeTab === 'personal' ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={() => changeTab('personal')}
            >
              <FolderOpen className="w-5 h-5"/> 
              <span className="text-base">{t('nav.personalProjects') || 'Personal Projects'}</span>
            </button>
            <button 
              className={`flex items-center space-x-2 text-sm font-semibold transition-colors ${activeTab === 'marketplace' ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={() => changeTab('marketplace')}
            >
              <Globe className="w-5 h-5"/> 
              <span className="text-base">{t('nav.marketplace') || 'Marketplace'}</span>
            </button>
          </div>

          {/* Search Bar inside Navbar */}
          <div className="relative w-full max-w-md group">
            <form onSubmit={handleSearchSubmit}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[var(--primary)] transition-colors" />
              <input 
                type="text" 
                placeholder={t('nav.searchPlaceholder') || "Search projects..."}
                className="w-full bg-[var(--surface-container)] border border-[var(--outline-variant)] rounded-full py-2.5 pl-12 pr-10 text-base text-white focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--primary)] animate-spin" />}
            </form>
            
            {/* Search Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && searchResults.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 right-0 mt-3 bg-[var(--surface-container-high)] border border-[var(--outline-variant)] rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
                >
                  {searchResults.map(result => (
                    <div 
                      key={result.id} 
                      className="px-4 py-3 hover:bg-[var(--surface-variant)] cursor-pointer flex items-center justify-between transition-colors border-b border-[var(--outline-variant)]/50 last:border-0"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent input blur before click registers
                        handleSuggestionClick(result);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <Search className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-200">{result.project_name}</span>
                      </div>
                      <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${result.type === 'personal' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                        {result.type}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-4 pointer-events-auto">
        <LanguageSelector />

        {session ? (
          <div 
            className="flex items-center space-x-3 relative cursor-pointer group" 
            ref={dropdownRef}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="w-10 h-10 rounded-full border border-[var(--outline-variant)] overflow-hidden group-hover:border-[var(--primary)] transition-colors">
              {session.user?.image ? (
                <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[var(--surface-container-high)] flex items-center justify-center text-gray-400">
                  <User size={20} />
                </div>
              )}
            </div>
            <div className="mr-3 text-left hidden sm:block">
              <div className="text-base font-bold text-white leading-none group-hover:text-[var(--primary)] transition-colors">{session.user?.name || 'User'}</div>
              <div className="text-[11px] font-bold tracking-widest text-[var(--primary)] uppercase mt-1 opacity-80">{session.user?.role || 'GUEST'}</div>
            </div>
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-[var(--surface-container-high)]/90 backdrop-blur-xl border border-[var(--outline-variant)] rounded-xl shadow-2xl overflow-hidden py-1"
                >
                  <div className="px-4 py-3 border-b border-[var(--outline-variant)]/50">
                    <p className="text-sm font-semibold text-white truncate">{session.user?.name || 'User'}</p>
                  </div>
                  <Link href="/profile" onClick={() => setIsDropdownOpen(false)} className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:text-white hover:bg-[var(--surface-container-highest)] flex items-center transition-colors">
                    <Settings size={14} className="mr-2" /> {t('nav.settings') || 'Profile Settings'}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center transition-colors"
                  >
                    <LogOut size={14} className="mr-2" /> {t('nav.logout') || 'Logout'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={() => signIn()}
            className="px-4 py-2 text-xs font-bold tracking-widest text-black bg-[var(--primary)] rounded-lg uppercase hover:scale-105 transition-transform"
          >
            {t('login.title') || 'Login'}
          </button>
        )}
      </div>
    </nav>
  );
}

/** Renders the Navbar everywhere EXCEPT /admin/* routes */
export function NavbarWrapper() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) {
    return null;
  }
  return (
    <Suspense fallback={null}>
      <Navbar />
    </Suspense>
  );
}
