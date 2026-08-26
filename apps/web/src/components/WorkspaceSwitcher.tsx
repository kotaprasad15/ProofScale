import React, { useState } from "react";
import { Building2, ChevronDown, Check, Shield, User, Zap } from "lucide-react";

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
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">Owner</span>;
      case "admin":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Admin</span>;
      case "tester":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">Tester</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-700 text-slate-300">Member</span>;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
      >
        <Building2 className="h-4 w-4 text-indigo-400" />
        <span className="text-xs font-semibold text-white max-w-[140px] truncate">
          {activeOrg?.name || "Select Workspace"}
        </span>
        {getRoleBadge(orgRole || activeOrg?.role)}
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 space-y-1">
            <span className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Organizations
            </span>

            {organizations.map(org => {
              const isSelected = org.id === activeOrgId;
              return (
                <button
                  key={org.id}
                  onClick={() => {
                    onSelectOrg(org.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                    isSelected ? "bg-indigo-600/20 text-white border border-indigo-500/30" : "text-slate-300 hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="font-semibold truncate">{org.name}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {getRoleBadge(org.role)}
                    {isSelected && <Check className="h-3.5 w-3.5 text-indigo-400" />}
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
