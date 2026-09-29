import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  BookOpen,
} from "lucide-react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { UserPermissions } from "@proofscale/shared";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "../motion/ThemeToggle";
import { CommandPalette } from "./CommandPalette";
import { NotificationBell } from "./notifications/NotificationBell";
import { ToastContainer } from "./notifications/ToastContainer";
import { PageTransition, RunPulse } from "../motion";
import { InAppToast } from "../hooks/useNotifications";

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
  toasts?: InAppToast[];
  onDismissToast?: (id: string) => void;
  onNavigate?: (path: string) => void;
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
  onGoHome,
  toasts,
  onDismissToast,
  onNavigate,
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
        { id: "runs", label: "Live Telemetry", icon: Activity, visible: true },
        { id: "history", label: "Run Explorer", icon: Search, visible: true },
      ],
    },
    {
      label: "Validation",
      items: [
        { id: "plans", label: "Test Plans", icon: PlaySquare, visible: permissions?.viewProject ?? true },
        { id: "reports", label: "Readiness Reports", icon: FileText, visible: true },
      ],
    },
    {
      label: "Workspace",
      items: [
        { id: "organization", label: "Organization", icon: Users, visible: permissions?.manageMembers ?? false },
        { id: "settings", label: "Settings", icon: Settings, visible: true },
      ],
    },
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
    <div className="relative flex h-screen w-screen overflow-hidden text-[var(--text-1)]">
      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => handleNavClick(tab)}
      />

      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: "var(--scrim)", backdropFilter: "blur(6px)" }}
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Rail */}
      <motion.aside
        animate={{ width: isCollapsed ? 64 : 256 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col justify-between select-none shrink-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{
          background: "var(--surface)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          borderRight: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
          {/* Top Brand Header */}
          <div className="h-16 flex items-center justify-between px-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
            {!isCollapsed ? (
              <div className="flex items-center gap-2">
                <BrandLogo onClick={onGoHome} />
              </div>
            ) : (
              <button
                onClick={onGoHome}
                className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center font-bold font-mono text-sm cursor-pointer"
                style={{ background: "var(--accent)", color: "#fff", boxShadow: "var(--glow-accent)" }}
                title="RateCap Home"
              >
                R
              </button>
            )}

            <button
              onClick={toggleSidebar}
              className="hidden md:flex p-1.5 rounded-lg text-[var(--text-2)] hover:text-[var(--text-1)] transition cursor-pointer"
              style={{ background: "transparent" }}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-[var(--text-2)] hover:text-[var(--text-1)]"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Workspace Switcher (Expanded only) */}
          {!isCollapsed && (
            <div className="p-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <WorkspaceSwitcher
                organizations={organizations}
                activeOrgId={activeOrgId}
                orgRole={orgRole}
                onSelectOrg={onSelectOrg || (() => {})}
              />
            </div>
          )}

          {/* Navigation Sections */}
          <nav className="flex-1 py-4 px-2 space-y-6" aria-label="Primary">
            {navSections.map((section) => {
              const visibleItems = section.items.filter((item) => item.visible);
              if (visibleItems.length === 0) return null;

              return (
                <div key={section.label} className="space-y-1">
                  {!isCollapsed && (
                    <span className="px-3 text-[10px] font-mono uppercase tracking-wider font-semibold text-[var(--text-3)] block mb-1">
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
                        aria-current={isActive ? "page" : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer group relative ${
                          isActive ? "font-semibold" : "text-[var(--text-2)] hover:text-[var(--text-1)]"
                        } ${isCollapsed ? "justify-center px-0" : ""}`}
                        style={
                          isActive
                            ? {
                                color: "var(--accent)",
                                background: "var(--accent-soft)",
                                border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                              }
                            : { border: "1px solid transparent" }
                        }
                        title={isCollapsed ? item.label : undefined}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="nav-active-pill"
                            className="absolute inset-0 rounded-xl"
                            style={{
                              background: "var(--accent-soft)",
                              border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                            }}
                            transition={{ type: "spring", stiffness: 320, damping: 30 }}
                          />
                        )}
                        <Icon
                          className={`w-4 h-4 shrink-0 relative z-10 ${
                            isActive ? "" : "text-[var(--text-2)] group-hover:text-[var(--text-1)]"
                          }`}
                          style={isActive ? { color: "var(--accent)" } : undefined}
                        />
                        {!isCollapsed && <span className="truncate relative z-10">{item.label}</span>}

                        {/* Tooltip in collapsed state */}
                        {isCollapsed && (
                          <span
                            className="absolute left-full ml-2 px-2 py-1 text-[11px] rounded shadow-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition z-50 font-sans"
                            style={{ background: "var(--surface-solid)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                          >
                            {item.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* Bottom Sidebar: Active Envelope Pill & User Profile */}
          <div className="p-3 space-y-3 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
            {!isCollapsed && (
              <div className="p-2.5 rounded-xl glass-inset space-y-1 text-xs font-mono">
                <div className="flex items-center justify-between text-[10px] text-[var(--text-3)] uppercase tracking-wider">
                  <span>Active Envelope</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
                </div>
                <div className="font-semibold text-[var(--text-1)] flex items-center gap-1.5">
                  <span>25 VUs</span>
                  <span className="text-[var(--text-3)]">·</span>
                  <span>p95 &lt; 500ms</span>
                </div>
              </div>
            )}

            {/* Profile & Controls */}
            <div className={`flex items-center ${isCollapsed ? "flex-col gap-2" : "justify-between"}`}>
              <div className="flex items-center gap-2 overflow-hidden">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                  style={{ background: "var(--accent-soft)", border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)", color: "var(--accent)" }}
                >
                  {userEmail[0].toUpperCase()}
                </div>
                {!isCollapsed && (
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-[var(--text-1)] truncate">{userEmail}</p>
                    <span className="text-[10px] font-mono text-[var(--text-3)] uppercase">
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
                    className="p-1.5 rounded-lg text-[var(--text-2)] hover:text-[var(--danger)] transition cursor-pointer"
                    style={{ borderRadius: 10 }}
                    title="Sign Out"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header
          className="h-16 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0 z-30"
          style={{
            borderBottom: "1px solid var(--glass-border)",
            background: "var(--surface)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 rounded-lg text-[var(--text-2)] hover:text-[var(--text-1)]"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-mono">
              <button
                className="text-[var(--text-3)] hover:text-[var(--text-2)] cursor-pointer transition-colors"
                onClick={onGoHome}
              >
                RateCap
              </button>
              <span className="text-[var(--text-3)]">/</span>
              <span className="text-[var(--text-1)] font-semibold">{currentTabLabel}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Search & Command Palette Trigger */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl neo-btn text-[var(--text-2)] text-xs transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-[var(--text-3)]" />
              <span>Quick search or command…</span>
              <kbd
                className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={{ background: "var(--field)", border: "1px solid var(--border)", color: "var(--text-3)" }}
              >
                ⌘K
              </kbd>
            </button>

            {/* Notification Bell with Dropdown Inbox */}
            <NotificationBell
              orgId={activeOrgId}
              onNavigate={onNavigate || onTabChange}
              onOpenSettings={() => onTabChange?.("settings")}
            />

            {/* System Status Ping Badge */}
            <div
              className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium"
              style={{
                background: "var(--success-soft)",
                border: "1px solid color-mix(in srgb, var(--success) 22%, transparent)",
                color: "var(--success)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
              <span>Control Plane Operational</span>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body with animated route transitions */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8" style={{ background: "transparent" }}>
          <PageTransition routeKey={`${activeTab}`}>
            <div className="max-w-[1400px] mx-auto">{children}</div>
          </PageTransition>
        </main>
      </div>

      {/* Floating Realtime Toast Notifications */}
      {toasts && onDismissToast && (
        <ToastContainer
          toasts={toasts}
          onDismiss={onDismissToast}
          onNavigate={onNavigate || onTabChange}
        />
      )}
    </div>
  );
}
