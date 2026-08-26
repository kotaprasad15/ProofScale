import React from "react";
import { LayoutDashboard, Target, PlaySquare, FileText, Settings, ShieldCheck, Activity, Users, LogOut, ChevronDown, Bell } from "lucide-react";
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
  onLogout
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
    <div className="workspace-page">
      {/* Tidal Ledger Workspace Signal Rail */}
      <aside className="workspace-rail">
        <BrandLogo compact />

        {/* Active Workspace / Org Switcher */}
        <div className="rail-workspace">
          <span className="rail-company-dot" />
          <div>
            <strong>{activeOrg?.name || "Acme Engineering"}</strong>
            <small>{orgRole || "Owner"}</small>
          </div>
          {organizations.length > 1 && (
            <WorkspaceSwitcher
              organizations={organizations}
              activeOrgId={activeOrgId}
              orgRole={orgRole}
              onSelectOrg={onSelectOrg || (() => {})}
            />
          )}
        </div>

        {/* Active Envelope Context */}
        <div className="rail-signal-context" aria-label="Active test envelope">
          <span>Active envelope</span>
          <strong>25 VUs <i>·</i> 60s</strong>
          <small>Baseline · p95 &lt; 500ms</small>
          <div>
            <i /><i /><i /><i /><i /><i />
          </div>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Workspace navigation" className="rail-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onTabChange?.(item.id)}
                className={`rail-link ${isActive ? "active" : ""}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Account and Sign Out */}
        <div className="rail-account">
          <span className="avatar">
            {userEmail.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong>{userEmail.split("@")[0]}</strong>
            <small>{userEmail}</small>
          </div>
          {onLogout && (
            <button type="button" onClick={onLogout} aria-label="Sign out" title="Sign out">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Evidence Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-canvas">
        {/* Workspace Topbar */}
        <header className="workspace-topbar px-8">
          <div>
            <span className="breadcrumb">
              Workspace <b>/</b> {activeOrg?.name || "Acme Engineering"} <b>/</b> <span className="capitalize">{activeTab}</span>
            </span>
            <h1 className="text-xl font-black text-ink tracking-tight capitalize">{activeTab} Management</h1>
          </div>

          <div className="topbar-actions">
            <span className="engine-status">
              <i /> Engine available
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="workspace-main p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
