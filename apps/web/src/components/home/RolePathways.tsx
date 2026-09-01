import React from "react";
import { ShieldCheck, ClipboardCheck, Gauge, Eye, ArrowRight } from "lucide-react";
import { MaskedReveal } from "./MaskedReveal";
import { MagneticElement } from "./MagneticElement";

interface RolePathwaysProps {
  onSignUp?: () => void;
}

const ROLES = [
  {
    icon: ShieldCheck,
    role: "Organization Owner",
    eyebrow: "ORG LEVEL · FULL ADMIN",
    desc: "Create projects, define safety boundaries, manage members, and turn raw runs into client-ready proof.",
    color: "signal-indigo",
    badge: "FULL CONTROL"
  },
  {
    icon: ClipboardCheck,
    role: "Project Owner",
    eyebrow: "PROJECT LEVEL · WRITE",
    desc: "Register target endpoints, build test plans, and calibrate SLA thresholds without inheriting org-wide administration.",
    color: "signal-teal",
    badge: "PLAN CONFIG"
  },
  {
    icon: Gauge,
    role: "Tester",
    eyebrow: "RUN ACCESS · EXECUTE",
    desc: "Trigger approved test scenarios and inspect real-time execution telemetry without modifying target configs.",
    color: "signal-amber",
    badge: "RUN EXECUTION"
  },
  {
    icon: Eye,
    role: "Viewer",
    eyebrow: "READ ONLY · AUDIT",
    desc: "Read-only access to final readiness reports, histograms, and evidence artifacts for compliance review.",
    color: "text-muted",
    badge: "READ ONLY"
  }
];

export function RolePathways({ onSignUp }: RolePathwaysProps) {
  return (
    <section id="roles" className="py-24 sm:py-36 px-6 sm:px-12 relative z-10 border-t border-[var(--border)]">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Section Heading */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[11px] font-medium tracking-wider text-signal-teal bg-signal-teal-soft border border-signal-teal/25 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-teal" />
            DUAL-SCOPE RBAC
          </div>
          <MaskedReveal>
            <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-text-primary tracking-tight leading-[1.05]">
              Access that mirrors the work.
            </h2>
          </MaskedReveal>
          <p className="text-text-muted text-lg leading-relaxed font-sans">
            Account identity is strictly decoupled from organization and project roles. Everyone acts within declared boundaries.
          </p>
        </div>

        {/* 4 Magnetic-Hover Cards in a Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <MagneticElement
                key={r.role}
                strength={0.25}
                radius={80}
                className="w-full h-full"
              >
                <div
                  onClick={onSignUp}
                  className="glass-panel p-8 h-full flex flex-col justify-between space-y-6 group cursor-pointer border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--white-fill-sm)] border border-[var(--border)] flex items-center justify-center text-text-primary group-hover:scale-110 transition-transform">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-[var(--white-fill-sm)] text-text-muted border border-[var(--border)]">
                        {r.badge}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <span className="font-mono text-[10px] font-bold text-signal-indigo uppercase tracking-wider block">
                        {r.eyebrow}
                      </span>
                      <h3 className="font-display font-bold text-2xl text-text-primary tracking-tight">
                        {r.role}
                      </h3>
                    </div>

                    <p className="text-text-muted text-xs leading-relaxed font-sans">
                      {r.desc}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-text-primary group-hover:text-signal-teal transition-colors pt-4 border-t border-[var(--border)]">
                    <span>Enter as {r.role.split(" ")[0]}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </MagneticElement>
            );
          })}
        </div>

      </div>
    </section>
  );
}
