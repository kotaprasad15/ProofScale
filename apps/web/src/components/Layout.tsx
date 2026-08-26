import React from "react";
import { LayoutDashboard, Target, PlaySquare, FileText, Settings, ShieldCheck, Activity, Users, Shield } from "lucide-react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { UserPermissions } from "@proofscale/shared";

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
  onSelectOrg
}: LayoutProps) {
  // Navigation tabs derived dynamically from server-returned permissions
  const navItems = [
    { id: "projects", label: "Projects", icon: LayoutDashboard, visible: true },
    { id: "targets", label: "Target Endpoints", icon: Target, visible: permissions?.manageTargets ?? true },
    { id: "plans", label: "Test Plans", icon: PlaySquare, visible: permissions?.viewProject ?? true },
    { id: "runs", label: "Test Runs", icon: Activity, visible: true },
    { id: "reports", label: "Readiness Reports", icon: FileText, visible: true },
    { id: "organization", label: "Organization", icon: Users, visible: permissions?.manageMembers ?? false },
    { id: "settings", label: "Settings", icon: Settings, visible: true }
  ].filter(i => i.visible);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col justify-between p-4">
        <div>
          {/* Logo & Header */}
          <div className="flex items-center space-x-3 px-2 py-3 mb-6">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white leading-tight">ProofScale</h1>
              <p className="text-xs text-slate-400">Readiness & Load Platform</p>
            </div>
          </div>

          {/* Org Selector Switcher */}
          <div className="mb-6">
            <WorkspaceSwitcher
              organizations={organizations}
              activeOrgId={activeOrgId}
              orgRole={orgRole}
              onSelectOrg={onSelectOrg || (() => {})}
            />
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="px-2 py-3 border-t border-slate-800/60 text-xs text-slate-500">
          <p className="font-mono text-[11px]">Role: <span className="text-indigo-400 capitalize font-bold">{orgRole || "Member"}</span></p>
          <p className="text-[10px] mt-0.5 text-slate-500 truncate">{userEmail}</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between px-6">
          <div className="flex items-center space-x-2 text-sm text-slate-400">
            <span>Workspace</span>
            <span>/</span>
            <span className="font-medium text-slate-200 capitalize">{activeTab}</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ● Engine Online
            </span>
            <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-400 border border-slate-700 uppercase">
              {userEmail.slice(0, 2)}
            </div>
          </div>
        </header>

        {/* Main View Container */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
