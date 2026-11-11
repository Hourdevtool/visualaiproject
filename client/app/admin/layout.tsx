
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  key: string;
  href: string;
  icon: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Sidebar link component
// ---------------------------------------------------------------------------

function SidebarLink({
  item,
  isActive,
  isCollapsed,
  label,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  label: string;
  onClick?: () => void;
}) {
  const router = useRouter();

  const handleClick = () => {
    router.push(item.href);
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      title={isCollapsed ? label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={`
        w-full flex items-center gap-3 px-3 py-3 rounded-xl
        transition-all duration-200 cursor-pointer group
        ${isActive
          ? "bg-[var(--primary-container)] text-white"
          : "text-[#9a9a9a] hover:bg-[var(--surface-container)] hover:text-white"
        }
        ${isCollapsed ? "justify-center" : ""}
      `}
    >
      <span className={`flex-shrink-0 w-5 h-5 ${isActive ? "text-white" : "text-[#9a9a9a] group-hover:text-[var(--primary)]"}`}>
        {item.icon}
      </span>
      {!isCollapsed && (
        <span className="text-base font-semibold truncate">{label}</span>
      )}
      {isActive && !isCollapsed && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--primary)] flex-shrink-0" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main layout
// ---------------------------------------------------------------------------

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session.user as any)?.role !== "admin") {
      router.replace("/");
    }
  }, [session, status, router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const navItems: NavItem[] = [
    {
      key: "dashboard",
      href: "/admin",
      icon: <LayoutDashboard size={20} />,
    },
    {
      key: "users",
      href: "/admin/users",
      icon: <Users size={20} />,
    },
    {
      key: "projects",
      href: "/admin/projects",
      icon: <FolderKanban size={20} />,
    },
    {
      key: "logConfig",
      href: "/admin/logs",
      icon: <ScrollText size={20} />,
    },
  ];

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sidebarContent = (
    <aside
      className={`
        flex flex-col h-full bg-[var(--surface-container-low)] ghost-border
        transition-all duration-300 ease-in-out overflow-hidden
        ${isCollapsed ? "w-16" : "w-60"}
      `}
    >
      {/* Logo / Brand */}
      <div className={`flex items-center gap-3 p-4 border-b border-[var(--outline-variant)] ${isCollapsed ? "justify-center" : ""}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] flex items-center justify-center">
          <ShieldCheck size={16} className="text-black" />
        </div>
        {!isCollapsed && (
          <span className="text-base font-bold text-white tracking-widest uppercase">
            Admin
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <SidebarLink
              key={item.key}
              item={item}
              isActive={isActive}
              isCollapsed={isCollapsed}
              label={t(`admin.nav.${item.key}`)}
              onClick={() => setIsMobileOpen(false)}
            />
          );
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="p-3 border-t border-[var(--outline-variant)]">
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-label={isCollapsed ? t("admin.nav.expand") : t("admin.nav.collapse")}
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-xl
            text-[#9a9a9a] hover:bg-[var(--surface-container)] hover:text-white
            transition-colors duration-200 cursor-pointer
            ${isCollapsed ? "justify-center" : ""}
          `}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!isCollapsed && (
            <span className="text-sm font-medium">{t("admin.nav.collapse")}</span>
          )}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[var(--surface)] flex pt-20">
      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex flex-shrink-0 sticky top-20 h-[calc(100vh-80px)]">
        {sidebarContent}
      </div>

      {/* ── Mobile drawer overlay ── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar drawer ── */}
      <div
        className={`
          fixed top-0 left-0 h-full z-50 md:hidden
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Force expanded in mobile drawer */}
        <aside className="flex flex-col h-full w-60 bg-[var(--surface-container-low)] ghost-border">
          <div className="flex items-center justify-between p-4 border-b border-[var(--outline-variant)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] flex items-center justify-center">
                <ShieldCheck size={16} className="text-black" />
              </div>
              <span className="text-base font-bold text-white tracking-widest uppercase">Admin</span>
            </div>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="text-[#9a9a9a] hover:text-white transition-colors cursor-pointer"
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <SidebarLink
                  key={item.key}
                  item={item}
                  isActive={isActive}
                  isCollapsed={false}
                  label={t(`admin.nav.${item.key}`)}
                  onClick={() => setIsMobileOpen(false)}
                />
              );
            })}
          </nav>
        </aside>
      </div>

      {/* ── Main content area ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-4 p-4 border-b border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
          <button
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open sidebar"
            className="text-[#9a9a9a] hover:text-white transition-colors cursor-pointer"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--primary)]" />
            <span className="text-base font-bold text-white">Admin Panel</span>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
