import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useInView } from "../hooks/useInView";
import { Eyebrow } from "./ui/Eyebrow";

/* =========================================================================
   Methodology — the weighted scoring bars fill in one at a time on scroll,
   then the sequence closes on the hard-cap rule in the brutalist treatment
   (the one moment that should feel like a wall, not a card).
   ========================================================================= */

const WEIGHTS = [
  { label: "Reliability & Error Rate", weight: 30, color: "#2FD4A6", note: "HTTP 5xx, socket drops, resets" },
  { label: "Latency Percentiles", weight: 25, color: "#5B5FEF", note: "p50 / p95 / p99 vs SLA" },
  { label: "Capacity Behavior", weight: 20, color: "#8D96AC", note: "sustained RPS scaling" },
  { label: "Stability & Jitter", weight: 15, color: "#F0A63A", note: "variance over duration" },
  { label: "Readiness Hygiene", weight: 10, color: "#5C6478", note: "health check + config safety" }
];

const MAX_WEIGHT = 30;

export function MethodologySection() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.25 });

  return (
    <section id="methodology" className="py-16 sm:py-32 border-t border-white/[0.06] bg-ink-900/30 relative">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left: explanation */}
          <div className="lg:col-span-5 space-y-6">
            <Eyebrow color="teal" dot={false}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Methodology made visible
            </Eyebrow>
            <h2 className="type-h2 text-text-primary tracking-tight">
              A score should be understandable, not just impressive.
            </h2>
            <p className="text-text-muted text-base leading-relaxed">
              Every assessment decomposes into five weighted signals. Scroll and watch each weight resolve — then read the one rule that overrides them all.
            </p>

            {/* Readiness tiers */}
            <div className="space-y-2 pt-2">
              {[
                { label: "Ready (90–100)", desc: "Passes declared SLA thresholds", tone: "text-signal-teal" },
                { label: "Conditionally ready (75–89)", desc: "Passing with latency drift notes", tone: "text-signal-amber" },
                { label: "Needs investigation (50–74)", desc: "Approaching capacity limit", tone: "text-signal-amber" },
                { label: "Not ready (0–49)", desc: "Error spike or hard-cap tripped", tone: "text-signal-rose" }
              ].map((tier) => (
                <div
                  key={tier.label}
                  className="p-3 rounded-xl bg-ink-900/90 border border-white/[0.06] flex items-center justify-between gap-3 font-mono text-xs"
                >
                  <span className="text-text-primary font-medium">{tier.label}</span>
                  <span className={`${tier.tone} font-semibold text-right`}>{tier.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: weighted bars + hard-cap wall */}
          <div className="lg:col-span-7" id="scoring" ref={ref}>
            <div className="glass-panel p-6 sm:p-8 space-y-7">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <span className="font-mono text-xs font-bold text-text-primary uppercase tracking-wider">
                  Deterministic scoring engine · v1.4
                </span>
                <span className="font-mono text-[10px] text-signal-indigo uppercase px-2 py-0.5 rounded bg-signal-indigo-soft border border-signal-indigo/30">
                  strict weighting
                </span>
              </div>

              {/* Weighted bars, filling one at a time */}
              <div className="space-y-5">
                {WEIGHTS.map((w, i) => {
                  const widthPct = Math.round((w.weight / MAX_WEIGHT) * 100);
                  return (
                    <div key={w.label}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-text-primary">{w.label}</span>
                          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wide hidden sm:inline">
                            {w.note}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-text-primary">{w.weight}%</span>
                      </div>
                      <div className="weight-bar-track">
                        <div
                          className="weight-bar-fill"
                          style={{
                            width: inView ? `${widthPct}%` : "0%",
                            background: `linear-gradient(90deg, ${w.color}66, ${w.color})`,
                            transitionDelay: `${i * 180}ms`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hard-cap rule — the wall */}
              <div className="brutalist p-5 space-y-2">
                <div className="flex items-center gap-2 text-signal-rose text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Hard-cap rule enforcement</span>
                </div>
                <p className="text-[12px] leading-relaxed text-text-muted">
                  If the overall error rate exceeds{" "}
                  <strong className="text-signal-rose">5.00%</strong>, the total score is capped at a maximum of{" "}
                  <strong className="text-signal-rose">49 / 100</strong> — regardless of latency or throughput.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
