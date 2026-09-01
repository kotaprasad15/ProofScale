import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  Cpu, 
  ShieldCheck, 
  Radio, 
  Share2, 
  Gauge, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  ArrowUpRight
} from "lucide-react";
import { MaskedReveal } from "./MaskedReveal";

export function CapabilitiesBento() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="capabilities" className="py-24 sm:py-36 px-6 sm:px-12 relative z-10 border-t border-[var(--border)]">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Section Heading */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[11px] font-medium tracking-wider text-signal-indigo bg-signal-indigo-soft border border-signal-indigo/25 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-indigo" />
            INSTRUMENT ARCHITECTURE
          </div>
          <MaskedReveal>
            <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-text-primary tracking-tight leading-[1.05]">
              Capabilities built for verifiable proof.
            </h2>
          </MaskedReveal>
          <p className="text-text-muted text-lg leading-relaxed font-sans">
            Every layer of Ratecap is designed for audit-defensible measurement, strict safety boundaries, and empirical telemetry.
          </p>
        </div>

        {/* Mixed-Size Bento Grid (2 Large Cells + 4 Small Cells) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          
          {/* =========================================================================
              LARGE CELL 1: Deterministic Scoring Engine (Span 7 cols)
             ========================================================================= */}
          <motion.div
            onMouseEnter={() => setHoveredIndex(0)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="lg:col-span-7 glass-panel p-8 sm:p-10 flex flex-col justify-between space-y-8 relative overflow-hidden group cursor-pointer border border-[var(--border)] hover:border-signal-indigo/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-signal-indigo tracking-wider uppercase">
                CORE CALCULATION ENGINE
              </span>
              <div className="w-8 h-8 rounded-full bg-[var(--white-fill-sm)] flex items-center justify-center text-text-muted group-hover:text-text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-display font-bold text-3xl sm:text-4xl text-text-primary tracking-tight">
                Deterministic Scoring Engine
              </h3>
              <p className="text-text-muted text-sm sm:text-base leading-relaxed max-w-xl">
                Fixed mathematical weighting across 5 metrics with a strict &gt;5% error hard-cap at 49. No black boxes.
              </p>
            </div>

            {/* Hover-Reveal Supporting Visual: Interactive Weight Decomposition */}
            <div className="p-5 rounded-2xl bg-[var(--panel-inset)] border border-[var(--border)] space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-text-muted text-[11px]">
                <span>WEIGHTED FORMULA DECOMPOSITION</span>
                <span className="text-signal-teal font-bold">PASS · 96/100</span>
              </div>
              
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-text-primary">Reliability &amp; Errors</span>
                    <span className="text-signal-teal font-bold">30%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--white-fill-md)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: hoveredIndex === 0 ? "100%" : "85%" }}
                      transition={{ duration: 0.6 }}
                      className="h-full bg-signal-teal rounded-full"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-text-primary">Latency Percentiles (p95)</span>
                    <span className="text-signal-indigo font-bold">25%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--white-fill-md)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: hoveredIndex === 0 ? "92%" : "70%" }}
                      transition={{ duration: 0.6, delay: 0.05 }}
                      className="h-full bg-signal-indigo rounded-full"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-text-primary">Capacity Envelope</span>
                    <span className="text-text-muted font-bold">20%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--white-fill-md)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: hoveredIndex === 0 ? "95%" : "60%" }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      className="h-full bg-signal-indigo/70 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* =========================================================================
              LARGE CELL 2: Sandboxed Worker Execution (Span 5 cols)
             ========================================================================= */}
          <motion.div
            onMouseEnter={() => setHoveredIndex(1)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="lg:col-span-5 glass-panel p-8 sm:p-10 flex flex-col justify-between space-y-8 relative overflow-hidden group cursor-pointer border border-[var(--border)] hover:border-signal-teal/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-signal-teal tracking-wider uppercase">
                ISOLATED EXECUTION PLANE
              </span>
              <div className="w-8 h-8 rounded-full bg-[var(--white-fill-sm)] flex items-center justify-center text-text-muted group-hover:text-text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-display font-bold text-3xl sm:text-4xl text-text-primary tracking-tight">
                Sandboxed Workers
              </h3>
              <p className="text-text-muted text-sm sm:text-base leading-relaxed">
                Atomic database lease lock claims runner tasks. Traffic executes with zero inter-tenant leakage.
              </p>
            </div>

            {/* Hover-Reveal Supporting Visual: Live Worker Lease Stream */}
            <div className="p-5 rounded-2xl bg-[var(--panel-inset)] border border-[var(--border)] space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between text-text-muted text-[10px]">
                <span>ATOMIC LEASE WORKER</span>
                <span className="text-signal-teal font-bold">LEASE #0x8F92</span>
              </div>
              <div className="p-2 rounded bg-[var(--white-fill-sm)] border border-[var(--border)] text-[11px] text-text-primary space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-muted">Target:</span>
                  <span className="text-signal-teal">TLS 1.3 Verified</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">SSRF Guard:</span>
                  <span className="text-signal-teal">Active · Loopback Blocked</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Concurrency:</span>
                  <span>50 VUs (Bounded Cap)</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* =========================================================================
              SMALL CELL 1: Dual-Scope RBAC (Span 3 cols)
             ========================================================================= */}
          <motion.div
            onMouseEnter={() => setHoveredIndex(2)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="lg:col-span-3 glass-panel p-6 sm:p-8 flex flex-col justify-between space-y-6 group cursor-pointer border border-[var(--border)] hover:border-signal-indigo/40 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-signal-indigo-soft border border-signal-indigo/30 flex items-center justify-center text-signal-indigo group-hover:scale-110 transition-transform">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h4 className="font-display font-bold text-xl text-text-primary">
                Dual-Scope RBAC
              </h4>
              <p className="text-text-muted text-xs leading-relaxed font-sans">
                Separate organization identity from project testing rights.
              </p>
            </div>
            <div className="font-mono text-[10px] text-signal-indigo pt-2 border-t border-[var(--border)]">
              4 Granular Roles
            </div>
          </motion.div>

          {/* =========================================================================
              SMALL CELL 2: Emergency Kill Switch (Span 3 cols)
             ========================================================================= */}
          <motion.div
            onMouseEnter={() => setHoveredIndex(3)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="lg:col-span-3 glass-panel p-6 sm:p-8 flex flex-col justify-between space-y-6 group cursor-pointer border border-[var(--border)] hover:border-signal-rose/40 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-signal-rose-soft border border-signal-rose/30 flex items-center justify-center text-signal-rose group-hover:scale-110 transition-transform">
              <Radio className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h4 className="font-display font-bold text-xl text-text-primary">
                Emergency Kill Switch
              </h4>
              <p className="text-text-muted text-xs leading-relaxed font-sans">
                Immediate global and per-run abort to terminate active worker connections.
              </p>
            </div>
            <div className="font-mono text-[10px] text-signal-rose pt-2 border-t border-[var(--border)]">
              Zero-Latency Abort
            </div>
          </motion.div>

          {/* =========================================================================
              SMALL CELL 3: Token-Hashed Report Sharing (Span 3 cols)
             ========================================================================= */}
          <motion.div
            onMouseEnter={() => setHoveredIndex(4)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="lg:col-span-3 glass-panel p-6 sm:p-8 flex flex-col justify-between space-y-6 group cursor-pointer border border-[var(--border)] hover:border-signal-teal/40 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-signal-teal-soft border border-signal-teal/30 flex items-center justify-center text-signal-teal group-hover:scale-110 transition-transform">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h4 className="font-display font-bold text-xl text-text-primary">
                Hashed Sharing
              </h4>
              <p className="text-text-muted text-xs leading-relaxed font-sans">
                SHA-256 tokenized report links with instant one-click revocation.
              </p>
            </div>
            <div className="font-mono text-[10px] text-signal-teal pt-2 border-t border-[var(--border)]">
              Configurable Expiry
            </div>
          </motion.div>

          {/* =========================================================================
              SMALL CELL 4: Bounded Load Presets (Span 3 cols)
             ========================================================================= */}
          <motion.div
            onMouseEnter={() => setHoveredIndex(5)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="lg:col-span-3 glass-panel p-6 sm:p-8 flex flex-col justify-between space-y-6 group cursor-pointer border border-[var(--border)] hover:border-signal-amber/40 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-signal-amber-soft border border-signal-amber/30 flex items-center justify-center text-signal-amber group-hover:scale-110 transition-transform">
              <Gauge className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h4 className="font-display font-bold text-xl text-text-primary">
                Bounded Presets
              </h4>
              <p className="text-text-muted text-xs leading-relaxed font-sans">
                Pre-configured ramp-up scenarios with hard ceilings on virtual users.
              </p>
            </div>
            <div className="font-mono text-[10px] text-signal-amber pt-2 border-t border-[var(--border)]">
              Smoke / Peak / Stress
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
