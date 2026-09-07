import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Target,
  PlaySquare,
  FileText,
  Settings,
  Activity,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  Menu,
  X,
  ExternalLink,
  BookOpen,
  Terminal,
  Server
} from "lucide-react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { UserPermissions } from "@proofscale/shared";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./home/ThemeToggle";
import { CommandPalette } from "./CommandPalette";

interface LayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  organizations?: Array<{ id: string; name: string; slug: string; role: string }>;
  activeOrgId?: string | null;
  orgRole?: string | null;
  permissions?: UserPermissions;
  userEmail?: string;
  onSelectOrg?: (orgId: string) => void;
  onLogout?: () => void;
  onGoHome?: () => void;
}

export function Layout({
  children,
  activeTab = "projects",
  onTabChange,
  organizations = [],
  activeOrgId,
  orgRole,
  permissions,
  userEmail = "user@organization.dev",
  onSelectOrg,
  onLogout,
  onGoHome
}: LayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("rc_sidebar_collapsed") === "true";
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("rc_sidebar_collapsed", String(next));
      return next;
    });
  };

  // Keyboard shortcut listener for Command Palette (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navSections = [
    {
      label: "Monitoring",
      items: [
        { id: "projects", label: "Overview", icon: LayoutDashboard, visible: true },
        { id: "targets", label: "Target Endpoints", icon: Target, visible: permissions?.manageTargets ?? true },
        { id: "runs", label: "Live Telemetry", icon: Activity, visible: true }
      ]
    },
    {
      label: "Validation",
      items: [
        { id: "plans", label: "Test Plans", icon: PlaySquare, visible: permissions?.viewProject ?? true },
        { id: "reports", label: "Readiness Reports", icon: FileText, visible: true }
      ]
    },
    {
      label: "Workspace",
      items: [
        { id: "organization", label: "Organization", icon: Users, visible: permissions?.manageMembers ?? false },
        { id: "settings", label: "Settings", icon: Settings, visible: true }
      ]
    }
  ];

  const currentTabLabel =
    navSections
      .flatMap((s) => s.items)
      .find((i) => i.id === activeTab)?.label || "Overview";

  const handleNavClick = (id: string) => {
    onTabChange?.(id);
    setIsMobileOpen(false);
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-ink-950 text-text-primary font-sans">
      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => handleNavClick(tab)}
      />

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Rail */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col justify-between bg-ink-900 border-r border-[var(--border)] transition-all duration-200 select-none ${
          isCollapsed ? "w-16" : "w-64"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
          {/* Top Brand Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border)] shrink-0">
            {!isCollapsed ? (
              <div className="flex items-center gap-2">
                <BrandLogo onClick={onGoHome} />
              </div>
            ) : (
              <button
                onClick={onGoHome}
                className="w-8 h-8 rounded-lg bg-signal-indigo text-white flex items-center justify-center font-bold font-mono text-sm mx-auto cursor-pointer"
                title="RateCap Home"
              >
                R
              </button>
            )}

            <button
              onClick={toggleSidebar}
              className="hidden md:flex p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-[var(--white-fill-sm)] transition cursor-pointer"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Workspace Switcher (Expanded only) */}
          {!isCollapsed && (
            <div className="p-3 border-b border-[var(--border)]">
              <WorkspaceSwitcher
                organizations={organizations}
                activeOrgId={activeOrgId}
                orgRole={orgRole}
                onSelectOrg={onSelectOrg || (() => {})}
              />
            </div>
          )}

          {/* Navigation Sections */}
          <div className="flex-1 py-4 px-2 space-y-6">
            {navSections.map((section) => {
              const visibleItems = section.items.filter((item) => item.visible);
              if (visibleItems.length === 0) return null;

              return (
                <div key={section.label} className="space-y-1">
                  {!isCollapsed && (
                    <span className="px-3 text-[10px] font-mono uppercase tracking-wider font-semibold text-text-faint block mb-1">
                      {section.label}
                    </span>
                  )}
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer group relative ${
                          isActive
                            ? "bg-signal-indigo/10 text-signal-indigo font-semibold border border-signal-indigo/25"
                            : "text-text-muted hover:text-text-primary hover:bg-[var(--white-fill-sm)] border border-transparent"
                        } ${isCollapsed ? "justify-center px-0" : ""}`}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-signal-indigo" : "text-text-muted group-hover:text-text-primary"}`} />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}

                        {/* Tooltip in collapsed state */}
                        {isCollapsed && (
                          <span className="absolute left-full ml-2 px-2 py-1 bg-ink-900 border border-[var(--border)] text-text-primary text-[11px] rounded shadow-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition z-50 font-sans">
                            {item.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Bottom Sidebar: Active Envelope Pill & User Profile */}
          <div className="p-3 border-t border-[var(--border)] space-y-3 shrink-0">
            {!isCollapsed && (
              <div className="p-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] space-y-1 text-xs font-mono">
                <div className="flex items-center justify-between text-[10px] text-text-faint uppercase">
                  <span>Active Envelope</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-teal animate-pulse" />
                </div>
                <div className="font-semibold text-text-primary flex items-center gap-1.5">
                  <span>25 VUs</span>
                  <span className="text-text-faint">·</span>
                  <span>p95 &lt; 500ms</span>
                </div>
              </div>
            )}

            {/* Profile & Controls */}
            <div className={`flex items-center ${isCollapsed ? "flex-col gap-2" : "justify-between"}`}>
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-signal-indigo/20 border border-signal-indigo/40 text-signal-indigo flex items-center justify-center font-bold text-xs shrink-0">
                  {userEmail[0].toUpperCase()}
                </div>
                {!isCollapsed && (
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-text-primary truncate">{userEmail}</p>
                    <span className="text-[10px] font-mono text-text-faint uppercase">
                      {orgRole || "Member"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <ThemeToggle />
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-1.5 rounded-lg text-text-muted hover:text-signal-rose hover:bg-signal-rose/10 transition cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 px-4 sm:px-8 border-b border-[var(--border)] bg-ink-900/60 backdrop-blur-md flex items-center justify-between gap-4 shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-[var(--white-fill-sm)]"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-mono">
              <span className="text-text-faint hover:text-text-muted cursor-pointer" onClick={onGoHome}>
                RateCap
              </span>
              <span className="text-text-faint">/</span>
              <span className="text-text-primary font-semibold">{currentTabLabel}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Search & Command Palette Trigger */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--white-fill-sm)] hover:bg-[var(--white-fill-md)] text-text-muted border border-[var(--border)] text-xs transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-text-faint" />
              <span>Quick search or command...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--white-fill-md)] text-[10px] font-mono border border-[var(--border)] text-text-faint">
                ⌘K
              </kbd>
            </button>

            {/* System Status Ping Badge */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-signal-teal/10 border border-signal-teal/20 text-signal-teal text-[11px] font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-teal animate-pulse" />
              <span>Control Plane Operational</span>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-ink-950">
          {children}
        </main>
      </div>
    </div>
  );
}
