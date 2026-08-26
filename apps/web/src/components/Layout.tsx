import React, { useState } from "react";
import { LayoutDashboard, Target, PlaySquare, FileText, Settings, ShieldCheck, Activity, Users, Menu, X } from "lucide-react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { PointWave } from "./PointWave";
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

export function Layout({ children, activeTab = "projects", onTabChange, organizations = [], activeOrgId, orgRole, permissions, userEmail = "lead@acme.dev", onSelectOrg }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = [
    { id: "projects", label: "Projects", icon: LayoutDashboard, visible: true },
    { id: "targets", label: "Target Endpoints", icon: Target, visible: permissions?.manageTargets ?? true },
    { id: "plans", label: "Test Plans", icon: PlaySquare, visible: permissions?.viewProject ?? true },
    { id: "runs", label: "Test Runs", icon: Activity, visible: true },
    { id: "reports", label: "Readiness Reports", icon: FileText, visible: true },
    { id: "organization", label: "Organization", icon: Users, visible: permissions?.manageMembers ?? false },
    { id: "settings", label: "Settings", icon: Settings, visible: true }
  ].filter((item) => item.visible);
  const selectTab = (tab: string) => { onTabChange?.(tab); setMenuOpen(false); };

  return (
    <div className="ps-shell">
      <PointWave className="ps-shell-wave" />
      <aside className={`ps-sidebar ${menuOpen ? "is-open" : ""}`} aria-label="Workspace navigation">
        <div>
          <div className="ps-brand"><span className="ps-brand-mark"><ShieldCheck size={19} /></span><span className="ps-brand-copy"><strong>ProofScale</strong><small>Readiness &amp; safety</small></span></div>
          <div className="mb-5"><WorkspaceSwitcher organizations={organizations} activeOrgId={activeOrgId} orgRole={orgRole} onSelectOrg={onSelectOrg || (() => {})} /></div>
          <div className="ps-role-block"><p className="text-[8px] uppercase tracking-[.11em] font-mono text-slate-500">Active envelope</p><p className="mt-1 text-sm font-bold text-slate-100">25 VUs <span className="text-indigo-400">·</span> 60s</p><p className="mt-1 text-[9px] font-mono text-slate-500">Baseline · p95 &lt; 500ms</p></div>
          <nav className="space-y-1" aria-label="Workspace sections">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return <button key={item.id} type="button" onClick={() => selectTab(item.id)} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium border ${isActive ? "bg-indigo-600/15 text-indigo-300 border-indigo-500/25" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/45"}`}><Icon className="h-4 w-4" /><span>{item.label}</span></button>;
            })}
          </nav>
        </div>
        <div className="px-2 py-3 border-t border-slate-800/70 text-xs text-slate-500"><p className="font-mono text-[10px] uppercase tracking-[.07em]">Role: <span className="text-indigo-300 capitalize font-bold">{orgRole || "Member"}</span></p><p className="text-[10px] mt-1 text-slate-500 truncate">{userEmail}</p></div>
      </aside>
      <div className="ps-main">
        <header className="ps-topbar"><div className="flex items-center gap-3"><button type="button" className="ps-mobile-menu" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={18} /> : <Menu size={18} />}</button><div className="ps-breadcrumb">Workspace <span className="mx-1 text-slate-600">/</span> <strong>{activeTab}</strong></div></div><div className="flex items-center space-x-3"><span className="ps-engine-status"><i /> Engine online</span><div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-indigo-300 border border-slate-700 uppercase">{userEmail.slice(0, 2)}</div></div></header>
        <main className="ps-content">{children}</main>
      </div>
    </div>
  );
}
