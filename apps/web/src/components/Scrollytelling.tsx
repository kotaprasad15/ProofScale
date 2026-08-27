import React, { useEffect, useRef, useState } from "react";
import { 
  ShieldCheck, 
  Cpu, 
  BarChart3, 
  Share2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Lock, 
  ArrowRight,
  Server,
  Activity,
  FileCode2,
  Clock,
  Zap
} from "lucide-react";

interface PipelineStage {
  step: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
}

const STAGES: PipelineStage[] = [
  {
    step: "01",
    title: "Declare the envelope",
    subtitle: "Target authorization & bounded test plan",
    description: "Register a target endpoint with required cryptographic domain ownership verification. Define virtual user ramp-ups, durations, and strict SLA thresholds from standard presets or custom scenarios.",
    badge: "TARGET AUTHORIZATION"
  },
  {
    step: "02",
    title: "Run in isolation",
    subtitle: "Sandboxed worker & SSRF network guard",
    description: "The control plane queues the job. A sandboxed worker claims execution via an atomic lease lock, passes every request through the SSRF and private IP guard, and runs bounded load generation under hard safety caps.",
    badge: "ATOMIC EXECUTION LEASE"
  },
  {
    step: "03",
    title: "Score deterministically",
    subtitle: "Normalized multi-metric weights & hard caps",
    description: "Raw telemetry is scored against fixed deterministic weightings: Reliability (30%), Latency percentiles (25%), Capacity behavior (20%), Stability (15%), and Readiness hygiene (10%). Any error rate above 5% triggers a hard cap score of 49.",
    badge: "DETERMINISTIC MATH"
  },
  {
    step: "04",
    title: "Share the evidence",
    subtitle: "Token-hashed reports & raw evidence export",
    description: "Generate client-ready evidence reports with latency histograms and audit logs. Share securely through cryptographically hashed SHA-256 links with configurable expiry, or export complete raw Markdown and JSON artifacts.",
    badge: "CRYPTOGRAPHIC AUDIT"
  }
];

export function Scrollytelling() {
  const [activeStage, setActiveStage] = useState(0);
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset.stageIndex ?? 0);
            setActiveStage(index);
          }
        });
      },
      { threshold: 0.5, rootMargin: "-10% 0px -30% 0px" }
    );

    stageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section id="pipeline" className="py-16 sm:py-32 relative">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-12">
        {/* Section Header */}
        <div className="max-w-2xl mb-16 sm:mb-24 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[11px] font-medium tracking-wider text-signal-indigo bg-signal-indigo-soft border border-signal-indigo/20 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-indigo animate-pulse" />
            HOW AN ASSESSMENT ACTUALLY RUNS
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-text-primary tracking-tight leading-[1.15]">
            From workload to evidence: the 4-stage pipeline.
          </h2>
          <p className="text-text-muted text-base sm:text-lg leading-relaxed">
            Ratecap operates as a sandboxed testing instrument. Every run executes under strict safety boundaries and produces an audit-defensible assessment.
          </p>
        </div>

        {/* 2-Column Scrollytelling Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: 4 Narrative Stages */}
          <div className="lg:col-span-6 space-y-12 sm:space-y-20 pb-12">
            {STAGES.map((stage, idx) => {
              const isActive = activeStage === idx;
              return (
                <div
                  key={stage.step}
                  ref={(el) => { stageRefs.current[idx] = el; }}
                  data-stage-index={idx}
                  onClick={() => setActiveStage(idx)}
                  className={`p-6 sm:p-8 rounded-2xl transition-all duration-300 cursor-pointer border ${
                    isActive
                      ? "glass-panel border-white/[0.16] shadow-glass"
                      : "bg-ink-900/30 border-white/[0.04] opacity-50 hover:opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <span className="font-mono text-xs font-semibold text-signal-indigo tracking-wider">
                      STAGE {stage.step} / 04
                    </span>
                    <span className="font-mono text-[10px] font-medium text-text-muted uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
                      {stage.badge}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-xl sm:text-2xl text-text-primary mb-2">
                    {stage.title}
                  </h3>
                  <div className="font-mono text-xs text-text-muted mb-4 font-medium">
                    {stage.subtitle}
                  </div>
                  <p className="text-text-muted text-sm sm:text-base leading-relaxed">
                    {stage.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Right Column: Sticky Telemetry Visualizer (Pure Visual, NEVER repeats left text) */}
          <div className="lg:col-span-6 lg:sticky lg:top-28">
            <div className="glass-panel p-6 sm:p-8 overflow-hidden min-h-[460px] flex flex-col justify-between relative border border-white/[0.12]">
              
              {/* Telemetry Stage Indicator Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2 font-mono text-[11px] text-text-muted">
                  <span className="w-2 h-2 rounded-full bg-signal-indigo animate-pulse" />
                  <span>TELEMETRY STAGE {STAGES[activeStage].step}</span>
                </div>
                <div className="flex items-center gap-1">
                  {STAGES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveStage(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === activeStage ? "w-6 bg-signal-indigo" : "w-2 bg-white/20"
                      }`}
                      aria-label={`View stage ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Stage 1 Visual: Target Envelope Configuration */}
              {activeStage === 0 && (
                <div className="py-6 space-y-4 animate-fadeIn">
                  <div className="p-4 rounded-xl bg-ink-900/90 border border-white/[0.08] space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between text-text-muted text-[10px]">
                      <span>TARGET SPECIFICATION</span>
                      <span className="text-signal-teal flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> VERIFIED
                      </span>
                    </div>
                    <div className="text-text-primary text-sm font-semibold">
                      https://api.staging.internal/v2/checkout
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-[11px]">
                      <div>
                        <span className="text-text-muted block text-[9px]">ALLOWED HOST</span>
                        <span className="text-text-primary">api.staging.internal</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[9px]">TLS HANDSHAKE</span>
                        <span className="text-signal-teal">TLSv1.3 AES-GCM</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-ink-900/90 border border-white/[0.08] space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between text-text-muted text-[10px]">
                      <span>LOAD ENVELOPE BOUNDS</span>
                      <span className="text-signal-indigo">PRESET: PEAK-RAMP</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-text-muted block text-[9px]">MAX VUs</span>
                        <span className="text-text-primary font-bold">50 VUs</span>
                      </div>
                      <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-text-muted block text-[9px]">DURATION</span>
                        <span className="text-text-primary font-bold">120 sec</span>
                      </div>
                      <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-text-muted block text-[9px]">p95 SLA</span>
                        <span className="text-signal-teal font-bold">&lt; 450ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stage 2 Visual: Sandboxed Worker Execution & Network Guard */}
              {activeStage === 1 && (
                <div className="py-6 space-y-4 animate-fadeIn">
                  <div className="p-4 rounded-xl bg-ink-900/90 border border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between font-mono text-[10px] text-text-muted">
                      <span>WORKER LEASE ACQUISITION</span>
                      <span className="text-signal-indigo font-bold">ATOMIC LOCK #9041</span>
                    </div>
                    <div className="space-y-2 font-mono text-xs">
                      <div className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-text-muted">SSRF / Private IP Filter</span>
                        <span className="text-signal-teal font-bold">127.0.0.1 / RFC1918 BLOCKED</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-text-muted">Sandboxed k6 Runner</span>
                        <span className="text-signal-teal font-bold">ACTIVE · 0 MEMORY LEAKS</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-text-muted">Emergency Kill Switch</span>
                        <span className="text-signal-indigo font-bold">ARMED &amp; LISTENING</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Mini Throughput Wave */}
                  <div className="p-4 rounded-xl bg-ink-900/90 border border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between font-mono text-[10px] text-text-muted">
                      <span>LIVE THROUGHPUT TELEMETRY</span>
                      <span className="text-signal-teal font-mono">482 RPS (STABLE)</span>
                    </div>
                    <div className="h-12 flex items-end gap-1 px-1">
                      {[35, 42, 58, 65, 78, 85, 92, 88, 90, 94, 91, 95, 93, 96, 94, 98, 95, 96, 94, 95].map((h, i) => (
                        <div
                          key={i}
                          style={{ height: `${h}%` }}
                          className="flex-1 rounded-t-sm bg-gradient-to-t from-signal-indigo to-signal-teal opacity-80"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Stage 3 Visual: Deterministic Scoring Matrix & Status Tiers */}
              {activeStage === 2 && (
                <div className="py-6 space-y-4 animate-fadeIn">
                  {/* 4 Status Tiers */}
                  <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                    <div className="p-2.5 rounded-lg status-pill-ready flex items-center justify-between">
                      <span>Ready (90–100)</span>
                      <CheckCircle2 className="w-3 h-3 text-signal-teal" />
                    </div>
                    <div className="p-2.5 rounded-lg status-pill-cond flex items-center justify-between">
                      <span>Cond. Ready (75–89)</span>
                      <AlertTriangle className="w-3 h-3 text-signal-amber" />
                    </div>
                    <div className="p-2.5 rounded-lg bg-signal-amber-soft border border-signal-amber/20 text-signal-amber flex items-center justify-between">
                      <span>Needs Invest. (50–74)</span>
                      <AlertTriangle className="w-3 h-3 text-signal-amber" />
                    </div>
                    <div className="p-2.5 rounded-lg status-pill-notready flex items-center justify-between">
                      <span>Not Ready (0–49)</span>
                      <XCircle className="w-3 h-3 text-signal-rose" />
                    </div>
                  </div>

                  {/* 5 Deterministic Weighting Bars */}
                  <div className="p-4 rounded-xl bg-ink-900/90 border border-white/[0.08] space-y-2.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-text-muted text-[10px]">
                      <span>WEIGHTED METRIC DECOMPOSITION</span>
                      <span className="text-signal-indigo">v1.4 DETERMINISTIC SPEC</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-text-primary">Reliability &amp; Errors</span>
                          <span className="text-signal-teal font-bold">30% (Weight)</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-signal-teal rounded-full" style={{ width: '100%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-text-primary">Latency Percentiles</span>
                          <span className="text-signal-indigo font-bold">25% (Weight)</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-signal-indigo rounded-full" style={{ width: '92%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-text-primary">Capacity Behavior</span>
                          <span className="text-text-muted font-bold">20% (Weight)</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-white/60 rounded-full" style={{ width: '95%' }} />
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-signal-rose-soft border border-signal-rose/25 text-signal-rose text-[10px] flex items-center gap-1.5 mt-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Hard-cap rule: Error rate &gt; 5% caps score to 49 max.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Stage 4 Visual: Cryptographic Report Sharing & Artifacts */}
              {activeStage === 3 && (
                <div className="py-6 space-y-4 animate-fadeIn">
                  <div className="p-4 rounded-xl bg-ink-900/90 border border-white/[0.08] space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between text-text-muted text-[10px]">
                      <span>TOKEN-HASHED SHARE LINK</span>
                      <span className="text-signal-teal flex items-center gap-1">
                        <Lock className="w-3 h-3" /> SHA-256 VERIFIED
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-black/40 border border-white/[0.06] text-text-primary text-[11px] break-all">
                      https://ratecap.dev/share/0x4f88e2c91b70a931...
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-text-muted block text-[9px]">EXPIRATION</span>
                        <span className="text-text-primary">7 Days (Configurable)</span>
                      </div>
                      <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-text-muted block text-[9px]">REVOCATION</span>
                        <span className="text-signal-teal">Instant One-Click</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-ink-900/90 border border-white/[0.08] flex items-center justify-between font-mono text-xs">
                    <div>
                      <div className="text-text-primary font-bold">Raw Artifact Exports</div>
                      <div className="text-[10px] text-text-muted">GitHub-Flavored Markdown &amp; JSON</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded bg-white/10 text-text-primary font-bold text-[10px]">
                        .MD
                      </span>
                      <span className="px-2.5 py-1 rounded bg-white/10 text-text-primary font-bold text-[10px]">
                        .JSON
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sticky Card Bottom Baseline */}
              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-text-muted">
                <span>STAGE {STAGES[activeStage].step} AUDIT LOG</span>
                <span className="text-signal-indigo">RATECAP INSTRUMENT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { Scrollytelling as ScrollytellingStory };
