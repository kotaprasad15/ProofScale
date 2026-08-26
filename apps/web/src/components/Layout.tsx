import React from "react";
import { LayoutDashboard, Target, PlaySquare, FileText, Settings, ShieldCheck, Activity, Users, LogOut, ChevronRight, Home, Globe } from "lucide-react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { PointWave } from "./PointWave";
import { UserPermissions } from "@proofscale/shared";
import { BrandLogo } from "./BrandLogo";

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
  userEmail = "lead@acme.dev",
  onSelectOrg,
  onLogout,
  onGoHome
}: LayoutProps) {
  const activeOrg = organizations.find(o => o.id === activeOrgId) || organizations[0];

  const navItems = [
    { id: "projects", label: "Projects", icon: LayoutDashboard, visible: true },
    { id: "targets", label: "Target Endpoints", icon: Target, visible: permissions?.manageTargets ?? true },
    { id: "plans", label: "Test Plans", icon: PlaySquare, visible: permissions?.viewProject ?? true },
    { id: "runs", label: "Test Runs", icon: Activity, visible: true },
    { id: "reports", label: "Readiness Reports", icon: FileText, visible: true },
    { id: "organization", label: "Organization", icon: Users, visible: permissions?.manageMembers ?? false },
    { id: "settings", label: "Settings", icon: Settings, visible: true }
  ].filter((item) => item.visible);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ink-950 text-text-primary font-sans">
      {/* Sidebar Rail */}
      <aside className="w-64 min-w-[260px] bg-ink-900 border-r border-white/[0.08] flex flex-col justify-between p-4 z-20 select-none">
        <div className="space-y-6">
          {/* Brand Header with Home click */}
          <div className="px-2 pt-1">
            <BrandLogo onClick={onGoHome} />
          </div>

          {/* Workspace Switcher */}
          <div className="px-1">
            <WorkspaceSwitcher
              organizations={organizations}
              activeOrgId={activeOrgId}
              orgRole={orgRole}
              onSelectOrg={onSelectOrg || (() => {})}
            />
          </div>

          {/* Active Test Envelope Context Pill */}
          <div className="mx-1 p-3 rounded-2xl bg-ink-950/80 border border-white/[0.06] space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-[10px] text-text-muted uppercase">
              <span>ACTIVE ENVELOPE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-signal-teal animate-pulse" />
            </div>
            <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <span>25 VUs</span>
              <span className="text-text-faint">·</span>
              <span>60s Ramp</span>
            </div>
            <p className="text-[10px] text-text-faint">Baseline · p95 &lt; 500ms</p>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Workspace navigation" className="space-y-1 px-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? "bg-signal-indigo/15 text-white border border-signal-indigo/35 shadow-sm shadow-signal-indigo/20"
                      : "text-text-muted hover:text-text-primary hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-signal-indigo" : "text-text-muted"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Account Card & Sign Out */}
        <div className="p-3 rounded-2xl bg-ink-950/90 border border-white/[0.06] space-y-3 mx-1">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-xl bg-signal-indigo/20 border border-signal-indigo/30 flex items-center justify-center font-mono font-bold text-xs text-signal-indigo uppercase shrink-0">
              {userEmail.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-signal-teal font-bold uppercase tracking-wider">
                  {orgRole || "Member"}
                </span>
              </div>
              <p className="text-xs font-semibold text-text-primary truncate">{userEmail}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {onGoHome && (
              <button
                type="button"
                onClick={onGoHome}
                title="Go to Homepage"
                className="flex-1 py-2 px-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-text-primary text-xs font-semibold rounded-xl border border-white/[0.06] transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Home</span>
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Sign out of current workspace"
                className="flex-1 py-2 px-2.5 bg-white/[0.04] hover:bg-signal-rose/15 hover:text-signal-rose hover:border-signal-rose/30 text-text-muted text-xs font-semibold rounded-xl border border-white/[0.06] transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Workspace Surface */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-ink-950">
        {/* Topbar Header */}
        <header className="h-16 border-b border-white/[0.08] bg-ink-900/60 backdrop-blur-xl px-8 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center space-x-2 text-xs font-medium text-text-muted">
            <span>Workspace</span>
            <ChevronRight className="h-3.5 w-3.5 text-text-faint" />
            <span className="text-text-primary font-semibold">{activeOrg?.name || "Acme Engineering Corp"}</span>
            <ChevronRight className="h-3.5 w-3.5 text-text-faint" />
            <span className="text-signal-indigo font-bold capitalize">{activeTab}</span>
          </div>

          <div className="flex items-center space-x-3">
            {onGoHome && (
              <button
                type="button"
                onClick={onGoHome}
                className="btn-glass-secondary text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1.5"
              >
                <Home className="h-3.5 w-3.5 text-signal-indigo" />
                <span>Public Home</span>
              </button>
            )}

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-signal-teal-soft text-signal-teal border border-signal-teal/30">
              <span className="w-2 h-2 rounded-full bg-signal-teal animate-pulse" />
              Engine Online
            </span>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
