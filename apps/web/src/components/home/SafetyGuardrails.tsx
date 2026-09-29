import React from "react";
import { motion, useReducedMotion as useFramerReducedMotion } from "framer-motion";
import { ShieldAlert, Power, ScrollText, Globe2, ShieldCheck } from "lucide-react";
import { Reveal, SpotlightCard, EASE, DURATION } from "../../motion";
import { Section, SectionHeader } from "./HomeSectionBase";

const GUARDS = [
  {
    icon: Globe2,
    title: "Private-Range Blocking",
    body: "Loopback, link-local, RFC1918 and metadata endpoints are rejected at registration and re-verified at run time.",
  },
  {
    icon: ShieldAlert,
    title: "Allowlist Enforcement",
    body: "Only explicitly registered base URLs may receive traffic. Scheme, host and port are pinned before every request.",
  },
  {
    icon: Power,
    title: "Global Kill Switch",
    body: "A single operator action halts all in-flight execution across every workspace. Audited, instant, irreversible.",
  },
  {
    icon: ScrollText,
    title: "Full Audit Trail",
    body: "Registrations, runs, policy changes and promotions are append-only and attributable to individual operators.",
  },
];

/** Checks a request passes through in the flow diagram */
const FLOW = [
  { label: "Private-range block", color: "var(--accent-2)" },
  { label: "Allowlist pin", color: "var(--accent)" },
  { label: "Kill-switch gate", color: "var(--warning)" },
  { label: "Audit log", color: "var(--success)" },
];

/**
 * Animated request-flow diagram: a packet dot travels down the guard chain,
 * each node lights up in sequence, ending at a shielded target.
 */
function GuardFlowDiagram() {
  const reduced = useFramerReducedMotion();
  const LOOP = 4.8;

  return (
    <div className="glass p-6 sm:p-8 w-full max-w-md mx-auto lg:mx-0" style={{ boxShadow: "var(--shadow-panel)" }}>
      <div className="flex items-center justify-between mb-6">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">
          Live request path
        </span>
        <span
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest"
          style={{ color: "var(--success)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
          Guarded
        </span>
      </div>

      <div className="relative">
        {/* Connecting line + animated pulse */}
        <div
          className="absolute left-[19px] top-4 bottom-4 w-px"
          style={{ background: "var(--border)" }}
          aria-hidden="true"
        />
        {!reduced && (
          <motion.div
            className="absolute left-[19px] top-4 bottom-4 w-px origin-top"
            style={{ background: "var(--accent)", opacity: 0.6 }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: [0, 1, 1, 0] }}
            transition={{ duration: LOOP, repeat: Infinity, ease: "easeInOut", times: [0, 0.55, 0.85, 1] }}
            aria-hidden="true"
          />
        )}

        <ol className="space-y-5">
          {FLOW.map((step, i) => {
            const nodeDelay = i * (LOOP / (FLOW.length + 1));
            return (
              <li key={step.label} className="flex items-center gap-4 relative">
                {/* Node */}
                <motion.span
                  className="relative w-10 h-10 rounded-xl glass-subtle flex items-center justify-center shrink-0 z-10"
                  style={{ border: `1px solid color-mix(in srgb, ${step.color} 35%, transparent)` }}
                  animate={reduced ? undefined : {
                    boxShadow: [
                      `0 0 0px ${step.color}`,
                      `0 0 14px -2px ${step.color}`,
                      `0 0 0px ${step.color}`,
                    ],
                  }}
                  transition={{ duration: LOOP, repeat: Infinity, times: [0, 0.15, 0.3], delay: nodeDelay, ease: "easeInOut" }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: step.color }} />
                </motion.span>

                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs font-semibold text-[var(--text-1)]">{step.label}</div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-3)]">
                    {["src filtered", "host pinned", "operator halt", "append-only"][i]}
                  </div>
                </div>

                <motion.span
                  className="font-mono text-[10px] uppercase tracking-widest shrink-0"
                  style={{ color: "var(--success)" }}
                  animate={reduced ? { opacity: 1 } : { opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: LOOP, repeat: Infinity, times: [0, 0.2, 0.4], delay: nodeDelay, ease: "easeInOut" }}
                >
                  pass
                </motion.span>
              </li>
            );
          })}
        </ol>

        {/* Final shielded target */}
        <div className="flex items-center gap-4 mt-6 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              boxShadow: "var(--glow-accent)",
            }}
            animate={reduced ? undefined : { scale: [1, 1.06, 1] }}
            transition={{ duration: LOOP, repeat: Infinity, times: [0.85, 0.95, 1], ease: "easeInOut" }}
          >
            <ShieldCheck className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <div className="font-mono text-xs font-semibold text-[var(--text-1)]">Target receives request</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-3)]">
              bounded envelope enforced
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SafetyGuardrails() {
  return (
    <Section id="safety" className="border-t">
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">
        {/* Left: heading + 2x2 guard cards */}
        <div>
          <SectionHeader
            eyebrow="05 / Safety"
            title={
              <>
                Synthetic load with <span className="text-gradient">real-world discipline.</span>
              </>
            }
            body="RateCap is built to test systems you are explicitly authorized to test. The guardrails below are enforced in code, not policy documents."
          />

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {GUARDS.map((g, i) => {
              const Icon = g.icon;
              return (
                <Reveal key={g.title} index={i} className="h-full">
                  <SpotlightCard className="h-full p-6">
                    <div className="flex flex-col h-full">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: "var(--danger-soft)",
                          color: "var(--danger)",
                          border: "1px solid color-mix(in srgb, var(--danger) 22%, transparent)",
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="mt-4 font-display font-semibold text-base text-[var(--text-1)]">{g.title}</h3>
                      <p className="mt-1.5 text-sm text-[var(--text-2)] leading-relaxed">{g.body}</p>
                    </div>
                  </SpotlightCard>
                </Reveal>
              );
            })}
          </div>
        </div>

        {/* Right: animated guard-chain diagram */}
        <Reveal index={1}>
          <GuardFlowDiagram />
        </Reveal>
      </div>
    </Section>
  );
}
