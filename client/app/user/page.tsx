"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Folder, Shield, Factory, Leaf, Activity, ShoppingBag, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "../../providers/LanguageProvider";
import Loading from "../loading";

interface ProjectOut {
  id: string;
  user_id: string;
  project_name: string;
  category: string;
  description?: string;
}

const CATEGORIES = ["All", "Security", "Manufacturing", "Agriculture", "Healthcare", "Retail"];

const CategoryIcon = ({ category, className }: { category: string, className?: string }) => {
  switch (category) {
    case "Security": return <Shield className={className} />;
    case "Manufacturing": return <Factory className={className} />;
    case "Agriculture": return <Leaf className={className} />;
    case "Healthcare": return <Activity className={className} />;
    case "Retail": return <ShoppingBag className={className} />;
    default: return <Folder className={className} />;
  }
};

function ProjectCard({ project, innerRef }: { project: ProjectOut, innerRef?: any }) {
  return (
    <motion.div
      ref={innerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="relative rounded-3xl overflow-hidden group cursor-pointer border border-[var(--outline-variant)] bg-[var(--surface-container-low)] shadow-lg"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent z-10 pointer-events-none" />
      
      {/* Decorative Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface-container)] to-[var(--surface)] z-0" />
      <div className="absolute top-0 right-0 p-10 bg-[var(--primary)]/5 blur-3xl rounded-full z-0 pointer-events-none" />

      <div className="relative z-20 p-6 flex flex-col h-full min-h-[220px]">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-2 text-[10px] font-bold tracking-widest text-[var(--primary)] uppercase bg-[var(--primary)]/10 px-3 py-1.5 rounded-full border border-[var(--primary)]/20 shadow-[0_0_10px_rgba(255,177,197,0.1)]">
            <CategoryIcon category={project.category} className="w-3 h-3" />
            <span>{project.category}</span>
          </div>
        </div>
        
        <div className="mt-auto pt-4">
          <h3 className="text-xl font-bold text-white mb-2 drop-shadow-md">{project.project_name}</h3>
          <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
            {project.description || "No description provided for this project."}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function UserContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  
  const activeTab = (searchParams.get('tab') as "personal" | "marketplace") || "personal";
  const searchQuery = searchParams.get('q') || "";

  const [activeCategory, setActiveCategory] = useState("All");
  const [projects, setProjects] = useState<ProjectOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Intersection Observer for Infinite Scroll
  const observer = useRef<IntersectionObserver | null>(null);
  const lastProjectElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreProjects();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const fetchProjects = async (tab: "personal" | "marketplace", currentOffset: number, isInitial: boolean = false) => {
    if (!session?.accessToken) return;
    
    try {
      setLoading(true);
      const endpoint = tab === "personal" ? "/api/projects/me" : "/api/projects/public";
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${endpoint}?limit=10&offset=${currentOffset}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        }
      });
      
      if (!res.ok) throw new Error("Failed to fetch projects");
      
      const data = await res.json();
      if (isInitial) {
        setProjects(data.data);
      } else {
        setProjects(prev => [...prev, ...data.data]);
      }
      setHasMore(data.has_more);
      if (data.has_more) {
        setOffset(data.next_offset);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when the tab changes
  useEffect(() => {
    if (status === "authenticated") {
      setOffset(0);
      setHasMore(true);
      setProjects([]);
      fetchProjects(activeTab, 0, true);
    }
  }, [activeTab, status]);

  const loadMoreProjects = () => {
    if (!loading && hasMore) {
      fetchProjects(activeTab, offset, false);
    }
  };

  // Filter out projects on the client side
  const displayedProjects = projects.filter(p => {
    const matchesCategory = activeCategory === "All" || p.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch = p.project_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (status === "loading") {
    return <Loading />;
  }

  return (
    <div className="min-h-screen font-sans pb-20">
      
      {/* Reduced Header Area since Tabs and Search are in Navbar */}
      <header className="pt-32 pb-4 px-8 lg:px-16 relative">
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-bold font-['Space_Grotesk'] text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2">
              {t('userDashboard.title') || 'Projects Workspace'}
            </h1>
            <p className="text-gray-400 text-sm max-w-md leading-relaxed">
              {t('userDashboard.subtitle') || 'Manage your personal projects or explore public projects in the marketplace.'}
            </p>
          </div>
          <Link href="/user/projects/create">
            <button className="px-6 py-2.5 bg-[var(--primary)] text-black font-bold tracking-widest text-sm rounded-lg hover:scale-105 hover:shadow-[0_0_20px_rgba(255,177,197,0.4)] transition-all flex items-center gap-2">
              <Folder className="w-4 h-4" />
              <span>{t('userDashboard.createProject') || 'Create Project'}</span>
            </button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 lg:px-16 py-8">
        {/* Categories Filter */}
        <div className="flex flex-wrap gap-2 mb-10">
          {CATEGORIES.map(cat => {
            const translationKey = cat.toLowerCase();
            const categoryName = t(`userDashboard.categories.${translationKey}`) || cat;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border flex items-center space-x-2 ${
                  activeCategory === cat 
                    ? 'bg-[var(--primary)]/20 border-[var(--primary)]/50 text-[var(--primary)] shadow-[0_0_10px_rgba(255,177,197,0.2)]' 
                    : 'bg-[var(--surface-container)] border-[var(--outline-variant)] text-gray-400 hover:text-white hover:border-gray-500 hover:bg-[var(--surface-container-high)]'
                }`}
              >
                <CategoryIcon category={cat} className="w-3 h-3" />
                <span>{categoryName}</span>
              </button>
            )
          })}
        </div>

        {/* Project Grid */}
        {displayedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedProjects.map((project, index) => {
              if (displayedProjects.length === index + 1) {
                return (
                  <Link href={`/user/projects/${project.id}`} key={project.id}>
                    <ProjectCard innerRef={lastProjectElementRef} project={project} />
                  </Link>
                );
              }
              return (
                <Link href={`/user/projects/${project.id}`} key={project.id}>
                  <ProjectCard project={project} />
                </Link>
              );
            })}
          </div>
        ) : (
          !loading && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-24 flex flex-col items-center justify-center text-center border border-dashed border-[var(--outline-variant)] rounded-3xl bg-[var(--surface-container-lowest)] mt-4"
            >
              <div className="w-20 h-20 rounded-full bg-[var(--surface-container)] flex items-center justify-center mb-6 border border-[var(--outline-variant)] shadow-inner">
                <AlertCircle className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                {t('userDashboard.noProjectFound') || 'No projects found'}
              </h3>
              <p className="text-gray-400 max-w-sm leading-relaxed">
                {activeTab === 'personal' 
                  ? (t('userDashboard.noProjectDescPersonal') || "You haven't created any projects yet, or no projects match your current filters.")
                  : (t('userDashboard.noProjectDescPublic') || "No public projects are available in the marketplace with your current filters.")}
              </p>
            </motion.div>
          )
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[220px] rounded-3xl bg-[var(--surface-container)] animate-pulse border border-[var(--outline-variant)] flex flex-col p-6 shadow-md">
                 <div className="w-24 h-7 bg-[var(--surface-variant)] rounded-full mb-4"></div>
                 <div className="mt-auto space-y-3">
                   <div className="h-6 bg-[var(--surface-variant)] rounded w-3/4"></div>
                   <div className="h-4 bg-[var(--surface-variant)] rounded w-full"></div>
                   <div className="h-4 bg-[var(--surface-variant)] rounded w-5/6"></div>
                 </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function UserPage() {
  return (
    <Suspense fallback={<Loading />}>
      <UserContent />
    </Suspense>
  );
}
