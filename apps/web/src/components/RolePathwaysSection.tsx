import React from "react";
import { Building2, ShieldCheck, UserCog, TestTube2, CheckCircle2, XCircle } from "lucide-react";
import { TiltCard } from "./ui/TiltCard";
import { Eyebrow } from "./ui/Eyebrow";

/* =========================================================================
   Role Pathways — a horizontal set of 4 tilt-hover glass cards (Owner / Admin
   / Member / Tester), each listing exactly what that role can and can't do.
   Marketing surfaces get the tilt; the dashboard never does.
   ========================================================================= */

const ROLES = [
  {
    role: "Owner",
    icon: Building2,
    tint: "#5B5FEF",
    subtitle: "Governance & safety boundaries",
    desc: "Owns the organization. Sets global safety caps and holds the kill switch.",
    can: ["Manage workspace & members", "Set global safety caps & rate limits", "Transfer ownership", "View cross-project audit trail"],
    cant: ["Bypass the SSRF / IP guard"]
  },
  {
    role: "Admin",
    icon: ShieldCheck,
    tint: "#2FD4A6",
    subtitle: "Projects, targets & plans",
    desc: "Runs the engineering surface — targets, plans, and report reviews.",
    can: ["Register & verify targets", "Configure test plans & SLA thresholds", "Launch & cancel runs", "Review readiness reports"],
    cant: ["Transfer ownership", "Change global safety caps"]
  },
  {
    role: "Member",
    icon: UserCog,
    tint: "#F0A63A",
    subtitle: "Day-to-day engineering",
    desc: "Configures workloads and reads the evidence for their project.",
    can: ["Configure targets & plans", "Launch test runs", "View reports & evidence"],
    cant: ["Manage organization members", "Approve tester access requests"]
  },
  {
    role: "Tester",
    icon: TestTube2,
    tint: "#F2586B",
    subtitle: "Execute & inspect",
    desc: "Runs approved scenarios and reads results — no config surface.",
    can: ["1-click approved test execution", "Monitor live telemetry", "View readiness reports"],
    cant: ["Register targets", "Edit plans or thresholds", "Manage members"]
  }
];

export function RolePathwaysSection() {
  return (
    <section id="roles" className="py-16 sm:py-32 border-t border-white/[0.06] bg-ink-900/20 relative">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-12 space-y-12">
        <div className="max-w-2xl space-y-4">
          <Eyebrow color="indigo">
            <ShieldCheck className="w-3.5 h-3.5" />
            Role-aware access
          </Eyebrow>
          <h2 className="type-h2 text-text-primary tracking-tight">
            Four roles. Zero ambiguity about what each one can touch.
          </h2>
          <p className="text-text-muted text-base leading-relaxed">
            Permissions are isolated so a tester can execute an approved run without ever reaching a target-registration field.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <TiltCard key={r.role} className="glass-panel p-6 flex flex-col space-y-5 h-full">
                <div className="flex items-center justify-between">
                  <div
                    className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0"
                    style={{ color: r.tint, background: `${r.tint}1f`, borderColor: `${r.tint}55` }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-faint">
                    {r.subtitle}
                  </span>
                </div>

                <div>
                  <h3 className="font-display font-bold text-xl text-text-primary">{r.role}</h3>
                  <p className="text-text-muted text-xs leading-relaxed mt-1.5">{r.desc}</p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                  {r.can.map((c) => (
                    <div key={c} className="flex items-start gap-2 text-xs text-text-muted">
                      <CheckCircle2 className="w-3.5 h-3.5 text-signal-teal shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </div>
                  ))}
                  {r.cant.map((c) => (
                    <div key={c} className="flex items-start gap-2 text-xs text-text-faint">
                      <XCircle className="w-3.5 h-3.5 text-signal-rose/60 shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </TiltCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
