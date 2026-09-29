import React from "react";
import {
  Shield,
  Gauge,
  Terminal,
  FileText,
  Lock,
  Workflow,
  Bell,
  Layers,
} from "lucide-react";
import { SpotlightCard, Reveal, AnimatedNumber } from "../../motion";
import { Section, SectionHeader } from "./HomeSectionBase";

const CAPS = [
  {
    icon: Gauge,
    title: "Bounded Load Profiles",
    body: "Define virtual users, ramp-up and duration envelopes. Every run is capped by policy — never an open-ended flood.",
    span: "sm:col-span-2",
    metric: { value: 25, suffix: " VUs", label: "default envelope" },
  },
  {
    icon: Shield,
    title: "SSRF Guardrails",
    body: "Private-range blocking, DNS pinning and allowlist enforcement on every target before a single request fires.",
    span: "",
  },
  {
    icon: Terminal,
    title: "Live Telemetry",
    body: "Per-second RPS, latency percentiles and error classes streamed while the run executes.",
    span: "",
  },
  {
    icon: FileText,
    title: "Readiness Scoring",
    body: "A deterministic weighted score from SLA checks, latency budgets and error rates. Same inputs, same score.",
    span: "sm:col-span-2",
    metric: { value: 96, suffix: "/100", label: "deterministic score" },
  },
  {
    icon: Lock,
    title: "Dual-Scope RBAC",
    body: "Organization and project roles with explicit tester access requests — operators never stumble into prod.",
    span: "",
  },
  {
    icon: Workflow,
    title: "Baselines & Diffs",
    body: "Promote a run to baseline and diff every future run against it — regressions surface instantly.",
    span: "",
  },
  {
    icon: Bell,
    title: "Alerting & Push",
    body: "Threshold breaches, kill-switch events and report-ready notifications via in-app and web push.",
    span: "",
  },
  {
    icon: Layers,
    title: "4-Stage Sandbox",
    body: "Validate → warm → load → cool. Each stage is sandboxed, logged, and independently abortable.",
    span: "",
  },
];

export function CapabilitiesBento() {
  return (
    <Section id="capabilities">
      <SectionHeader
        eyebrow="02 / Capabilities"
        title={
          <>
            Everything readiness requires,{" "}
            <span className="text-gradient">nothing it doesn't.</span>
          </>
        }
        body="RateCap pairs a deterministic scoring engine with strictly bounded load generation, wrapped in the safety rails an operator actually needs."
      />

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CAPS.map((cap, i) => {
          const Icon = cap.icon;
          return (
            <Reveal key={cap.title} index={i % 4} className={cap.span}>
              <SpotlightCard className="h-full p-6 flex flex-col">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)" }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-base text-[var(--text-1)]">{cap.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-2)] leading-relaxed flex-1">{cap.body}</p>
                {cap.metric && (
                  <div className="mt-4 pt-4 flex items-baseline gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                    <AnimatedNumber
                      value={cap.metric.value}
                      suffix={cap.metric.suffix}
                      className="text-xl font-bold"
                      // eslint-disable-next-line
                    />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">
                      {cap.metric.label}
                    </span>
                  </div>
                )}
              </SpotlightCard>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
