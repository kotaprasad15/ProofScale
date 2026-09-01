import React, { useState } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";

interface WorkspaceSwitcherProps {
  organizations: Array<{ id: string; name: string; slug: string; role: string }>;
  activeOrgId?: string | null;
  orgRole?: string | null;
  onSelectOrg: (orgId: string) => void;
}

export function WorkspaceSwitcher({
  organizations,
  activeOrgId,
  orgRole,
  onSelectOrg
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeOrg = organizations.find(o => o.id === activeOrgId) || organizations[0];

  const getRoleBadge = (role?: string | null) => {
    switch (role) {
      case "owner":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">Owner</span>;
      case "admin":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-signal-indigo-soft text-signal-indigo border border-signal-indigo/30">Admin</span>;
      case "tester":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-signal-amber-soft text-signal-amber border border-signal-amber/30">Tester</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-white/[0.06] text-text-muted border border-white/[0.08]">Member</span>;
    }
  };

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-ink-950/80 border border-[var(--border-strong)] hover:border-signal-indigo/50 transition cursor-pointer select-none"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-signal-indigo-soft border border-signal-indigo/30 flex items-center justify-center text-signal-indigo shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="text-left truncate">
            <span className="text-xs font-bold text-text-primary block truncate">
              {activeOrg?.name || "Acme Engineering Corp"}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0 ml-1">
          {getRoleBadge(orgRole || activeOrg?.role)}
          <ChevronDown className={`h-3.5 w-3.5 text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-[var(--color-surface)] border border-[var(--border-strong)] shadow-2xl p-2 z-50 space-y-1 backdrop-blur-xl">
            <span className="px-3 py-1.5 text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider block">
              Organizations
            </span>

            {organizations.map(org => {
              const isSelected = org.id === activeOrgId;
              return (
                <button
                  type="button"
                  key={org.id}
                  onClick={() => {
                    onSelectOrg(org.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? "bg-signal-indigo/20 text-signal-indigo font-bold border border-signal-indigo/35"
                      : "text-text-muted hover:text-text-primary hover:bg-[var(--white-fill-sm)] border border-transparent"
                  }`}
                >
                  <span className="truncate">{org.name}</span>
                  <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    {getRoleBadge(org.role)}
                    {isSelected && <Check className="h-3.5 w-3.5 text-signal-indigo" />}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
