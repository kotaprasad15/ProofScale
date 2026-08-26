import React from "react";
import { Building2, FolderGit2, TestTube2, ArrowRight, ShieldCheck, UserCheck, KeyRound } from "lucide-react";

interface RolePathwaysSectionProps {
  onSelectRole: (role: "owner" | "project_owner" | "tester") => void;
}

export function RolePathwaysSection({ onSelectRole }: RolePathwaysSectionProps) {
  const roles = [
    {
      type: "owner" as const,
      badge: "Enterprise & Leads",
      title: "Organization Owner",
      subtitle: "Governance & Safety Boundaries",
      description: "Manage workspaces, invite teammates, establish organization-wide concurrency caps, and view cross-project readiness trends.",
      features: [
        "Workspace & Member Management",
        "Global Safety Caps & Rate Limits",
        "Centralized Readiness Dashboard",
        "Cross-Project Audit Trail"
      ],
      ctaText: "Start as Org Owner",
      icon: Building2,
      accent: "border-purple-200 hover:border-purple-500 bg-purple-50/30",
      buttonBg: "bg-purple-600 hover:bg-purple-700"
    },
    {
      type: "project_owner" as const,
      badge: "Tech Leads & Architects",
      title: "Project Owner",
      subtitle: "Target Endpoints & Test Plans",
      description: "Register and verify target staging APIs, configure multi-step traffic ramp scenarios, define SLA thresholds, and analyze deep reports.",
      features: [
        "Domain & Target Handshake Verification",
        "Visual Test Plan & Scenario Builder",
        "SLA Threshold Configuration",
        "Empirical Run Comparison"
      ],
      ctaText: "Start as Project Owner",
      icon: FolderGit2,
      accent: "border-indigo-200 hover:border-brand bg-indigo-50/30",
      buttonBg: "bg-brand hover:bg-brand-hover"
    },
    {
      type: "tester" as const,
      badge: "QA & Engineers",
      title: "QA Tester",
      subtitle: "Scenario Execution & Inspection",
      description: "Execute approved test scenarios with one click, stream live load execution metrics, and export executive report certificates.",
      features: [
        "1-Click Approved Test Execution",
        "Live Telemetry & Histogram Monitor",
        "Readiness Certificate Export",
        "Zero-Config Safety Rails"
      ],
      ctaText: "Start as QA Tester",
      icon: TestTube2,
      accent: "border-amber-200 hover:border-amber-500 bg-amber-50/30",
      buttonBg: "bg-amber-600 hover:bg-amber-700"
    }
  ];

  return (
    <section id="pathways" className="py-20 lg:py-28 bg-canvas border-b border-cardborder">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-ink border border-cardborder uppercase tracking-wider">
            <UserCheck className="h-3.5 w-3.5 text-brand" />
            <span>Role-Aware Access</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            Designed for Your Entire Engineering Team
          </h2>
          <p className="text-base sm:text-lg text-ink-muted leading-relaxed">
            ProofScale isolates permissions so testers can execute approved scenarios safely without administrative risk, while organization owners maintain complete safety governance.
          </p>
        </div>

        {/* 3 Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {roles.map(role => {
            const Icon = role.icon;
            return (
              <div
                key={role.type}
                className={`p-8 rounded-3xl bg-white border ${role.accent} shadow-soft hover:shadow-elevated transition-all flex flex-col justify-between space-y-6`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-surface-muted border border-cardborder flex items-center justify-center text-ink">
                      <Icon className="h-6 w-6 text-brand" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-surface-muted text-ink-muted border border-cardborder">
                      {role.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-ink">{role.title}</h3>
                    <p className="text-xs font-semibold text-brand mt-0.5">{role.subtitle}</p>
                  </div>

                  <p className="text-xs text-ink-muted leading-relaxed">
                    {role.description}
                  </p>

                  <div className="pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-2">
                      Key Capabilities:
                    </span>
                    <ul className="space-y-2 text-xs text-ink">
                      {role.features.map((feat, i) => (
                        <li key={i} className="flex items-center space-x-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => onSelectRole(role.type)}
                  className={`w-full py-3 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-2 shadow-sm ${role.buttonBg}`}
                >
                  <span>{role.ctaText}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
