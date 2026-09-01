import React from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  Cpu, 
  BarChart3, 
  Share2, 
  Lock, 
  AlertTriangle, 
  ShieldCheck, 
  Server,
  Activity,
  FileCode2,
  Zap
} from "lucide-react";
import { MaskedReveal } from "./MaskedReveal";

interface StageConfig {
  number: string;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  bgWash: string;
  visualType: "envelope" | "worker" | "scoring" | "evidence";
}

const STAGES: StageConfig[] = [
  {
    number: "01",
    tag: "STAGE 01 / DECLARATION",
    title: "Declare the envelope.",
    subtitle: "Target authorization & bounded test plan",
    description: "Register target endpoints with mandatory domain ownership verification. Define virtual user ramp-ups, durations, and strict SLA thresholds from standard presets or custom scenarios.",
    bgWash: "rgba(91, 95, 239, 0.05)",
    visualType: "envelope"
  },
  {
    number: "02",
    tag: "STAGE 02 / EXECUTION",
    title: "Run in isolation.",
    subtitle: "Sandboxed worker & SSRF network guard",
    description: "The control plane queues the job. A sandboxed worker claims execution via an atomic lease lock, passes every request through the SSRF and private IP guard, and runs bounded load generation under hard safety caps.",
    bgWash: "rgba(47, 212, 166, 0.05)",
    visualType: "worker"
  },
  {
    number: "03",
    tag: "STAGE 03 / EVALUATION",
    title: "Score deterministically.",
    subtitle: "Normalized multi-metric weights & hard caps",
    description: "Raw telemetry is scored against fixed deterministic weightings: Reliability (30%), Latency percentiles (25%), Capacity behavior (20%), Stability (15%), and Readiness hygiene (10%). Any error rate above 5% triggers a hard cap score of 49.",
    bgWash: "rgba(240, 166, 58, 0.05)",
    visualType: "scoring"
  },
  {
    number: "04",
    tag: "STAGE 04 / EVIDENCE",
    title: "Share the evidence.",
    subtitle: "Token-hashed reports & raw evidence export",
    description: "Generate client-ready evidence reports with latency histograms and audit logs. Share securely through cryptographically hashed SHA-256 links with configurable expiry, or export complete raw Markdown and JSON artifacts.",
    bgWash: "rgba(242, 88, 107, 0.05)",
    visualType: "evidence"
  }
];

export function CinematicStages() {
  return (
    <section id="pipeline" className="relative z-10">
      {STAGES.map((stage, idx) => (
        <div
          key={stage.number}
          className="stage-panel min-h-screen py-24 sm:py-32 px-6 sm:px-12 border-t border-[var(--border)] flex items-center relative overflow-hidden"
          style={{ backgroundColor: stage.bgWash }}
        >
          {/* Giant Watermark Stage Number in Corner */}
          <div
            aria-hidden="true"
            className="absolute -bottom-10 right-4 sm:right-12 font-mono font-bold text-[clamp(10rem,22vw,24rem)] text-text-muted/10 select-none pointer-events-none leading-none tracking-tighter"
          >
            {stage.number}
          </div>

          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center relative z-10">
            
            {/* Left Narrative Column */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[11px] font-medium tracking-wider text-signal-indigo bg-signal-indigo-soft border border-signal-indigo/25 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-indigo" />
                {stage.tag}
              </div>

              <MaskedReveal>
                <h2 className="font-display font-bold text-4xl sm:text-6xl lg:text-7xl text-text-primary tracking-tight leading-[1.02]">
                  {stage.title}
                </h2>
              </MaskedReveal>

              <div className="font-mono text-sm text-signal-teal font-medium">
                {stage.subtitle}
              </div>

              <p className="text-text-muted text-base sm:text-lg lg:text-xl leading-relaxed max-w-xl font-sans">
                {stage.description}
              </p>
            </div>

            {/* Right Supporting Visual (Scales in from center) */}
            <div className="lg:col-span-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-15% 0px -15% 0px" }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="glass-panel p-6 sm:p-10 border border-[var(--border-strong)] shadow-2xl relative overflow-hidden"
              >
                {/* Stage 01: Envelope Declaration Spec Visual */}
                {stage.visualType === "envelope" && (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                      <span className="text-text-muted text-[10px]">ENVELOPE SPECIFICATION</span>
                      <span className="text-signal-teal flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> AUTHORIZED TARGET
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--border)] space-y-2">
                      <div className="text-[10px] text-text-muted">DECLARED HOST &amp; PATH</div>
                      <div className="text-sm font-bold text-text-primary">https://api.staging.internal/v2/checkout</div>
                      <div className="flex items-center gap-4 text-[11px] text-text-muted pt-2 border-t border-[var(--border)]">
                        <span>METHOD: POST</span>
                        <span>TLS: 1.3 AES-GCM</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--border)] space-y-1">
                        <span className="text-[10px] text-text-muted block">VUs</span>
                        <span className="text-base font-bold text-text-primary">50 Max</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--border)] space-y-1">
                        <span className="text-[10px] text-text-muted block">DURATION</span>
                        <span className="text-base font-bold text-text-primary">120s</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--border)] space-y-1">
                        <span className="text-[10px] text-text-muted block">p95 SLA</span>
                        <span className="text-base font-bold text-signal-teal">&lt; 450ms</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stage 02: Isolated Worker Execution Visual */}
                {stage.visualType === "worker" && (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                      <span className="text-text-muted text-[10px]">SANDBOXED RUNNER TELEMETRY</span>
                      <span className="text-signal-teal font-bold flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5" /> WORKER ACTIVE
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--border)] space-y-2.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-text-muted">Atomic Lease Lock</span>
                        <span className="text-signal-teal font-bold">LOCKED (#0x9041)</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-text-muted">SSRF / RFC 1918 Filter</span>
                        <span className="text-signal-teal font-bold">127.0.0.1 BLOCKED</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-text-muted">Runner Process</span>
                        <span className="text-text-primary font-bold">k6 / Isolated V8</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--border)] space-y-2">
                      <div className="flex justify-between text-[10px] text-text-muted">
                        <span>LIVE THROUGHPUT STREAM</span>
                        <span className="text-signal-teal font-bold">482 RPS</span>
                      </div>
                      <div className="h-10 flex items-end gap-1 px-1">
                        {[40, 55, 65, 78, 85, 92, 88, 94, 91, 96, 94, 95, 98, 95, 96, 94, 98, 96, 95, 97].map((h, i) => (
                          <div
                            key={i}
                            style={{ height: `${h}%` }}
                            className="flex-1 rounded-t-sm bg-gradient-to-t from-signal-indigo to-signal-teal opacity-85"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Stage 03: Deterministic Scoring Spec Visual */}
                {stage.visualType === "scoring" && (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                      <span className="text-text-muted text-[10px]">EVALUATION MATRIX v1.4</span>
                      <span className="text-signal-teal font-bold">96 / 100 · READY</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2.5 rounded-lg bg-signal-teal-soft border border-signal-teal/30 text-signal-teal flex justify-between items-center">
                        <span>Ready (90–100)</span>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="p-2.5 rounded-lg bg-signal-amber-soft border border-signal-amber/30 text-signal-amber flex justify-between items-center">
                        <span>Cond. Ready (75–89)</span>
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--border)] space-y-2">
                      <div className="flex justify-between text-[11px]">
                        <span>Reliability (30%)</span>
                        <span className="text-signal-teal font-bold">100 / 100</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Latency SLA (25%)</span>
                        <span className="text-signal-indigo font-bold">96 / 100</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Capacity Behavior (20%)</span>
                        <span className="text-text-primary font-bold">95 / 100</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-signal-rose-soft border border-signal-rose/30 text-signal-rose text-[11px] flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Hard-cap: Error rate &gt; 5% forces score max 49 ("Not ready")</span>
                    </div>
                  </div>
                )}

                {/* Stage 04: Evidence Sharing Visual */}
                {stage.visualType === "evidence" && (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                      <span className="text-text-muted text-[10px]">EVIDENCE ARTIFACT</span>
                      <span className="text-signal-teal font-bold flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> SHA-256 SIGNED
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--panel-inset)] border border-[var(--border)] space-y-2">
                      <div className="text-[10px] text-text-muted">TOKENIZED ACCESS URL</div>
                      <div className="p-2.5 rounded bg-[var(--white-fill-sm)] text-text-primary text-[11px] break-all border border-[var(--border)]">
                        https://ratecap.dev/report/0x4f88e2c91b70a931...
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--border)]">
                        <span className="text-[9px] text-text-muted block">EXPIRATION</span>
                        <span className="text-text-primary font-bold">7 Days</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[var(--panel-inset)] border border-[var(--border)]">
                        <span className="text-[9px] text-text-muted block">REVOCATION</span>
                        <span className="text-signal-teal font-bold">Instant 1-Click</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <span className="flex-1 py-2 rounded-lg bg-[var(--white-fill-sm)] border border-[var(--border)] text-center font-bold text-[10px] text-text-primary">
                        EXPORT .MD REPORT
                      </span>
                      <span className="flex-1 py-2 rounded-lg bg-[var(--white-fill-sm)] border border-[var(--border)] text-center font-bold text-[10px] text-text-primary">
                        EXPORT .JSON METRICS
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

          </div>
        </div>
      ))}
    </section>
  );
}
