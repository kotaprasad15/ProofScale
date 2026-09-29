import React from "react";
import { Building2, Users, FlaskConical, ArrowRight } from "lucide-react";
import { Reveal, SpotlightCard } from "../../motion";
import { Section, SectionHeader } from "./HomeSectionBase";

const ROLES = [
  {
    icon: Building2,
    title: "Org Owners",
    body: "Create the workspace, invite members, set policy ceilings and keep the kill switch within reach.",
    cta: "Create organization",
    accent: "var(--accent)",
  },
  {
    icon: Users,
    title: "Project Leads",
    body: "Register targets, design bounded load envelopes and promote baselines for every release candidate.",
    cta: "Join with invite",
    accent: "var(--accent-2)",
  },
  {
    icon: FlaskConical,
    title: "Testers",
    body: "Execute authorized runs, watch live telemetry and file findings — scoped strictly to granted projects.",
    cta: "Request access",
    accent: "var(--success)",
  },
];

export function RolePathways({ onSignUp }: { onSignUp?: () => void }) {
  return (
    <Section id="roles" className="border-t" >
      <SectionHeader
        eyebrow="04 / Roles"
        title={
          <>
            Built for the whole <span className="text-gradient">readiness team.</span>
          </>
        }
        body="Dual-scope RBAC means every role sees exactly the workspace it should — no more, no less."
      />

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
        {ROLES.map((role, i) => {
          const Icon = role.icon;
          return (
            <Reveal key={role.title} index={i}>
              <SpotlightCard className="h-full p-7 flex flex-col" role="group">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                    style={{
                      background: `color-mix(in srgb, ${role.accent} 12%, transparent)`,
                      color: role.accent,
                      border: `1px solid color-mix(in srgb, ${role.accent} 25%, transparent)`,
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-[var(--text-1)]">{role.title}</h3>
                  <p className="mt-2 text-sm text-[var(--text-2)] leading-relaxed flex-1">{role.body}</p>
                  <button
                    type="button"
                    onClick={onSignUp}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors cursor-pointer"
                    style={{ color: role.accent }}
                  >
                    {role.cta}
                    <ArrowRight className="w-4 h-4" />
                  </button>
              </SpotlightCard>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
