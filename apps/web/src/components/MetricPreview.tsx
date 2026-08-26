import React from "react";
import { Activity, CheckCircle2, Gauge, ShieldCheck, Zap, Server } from "lucide-react";

export function MetricPreview() {
  return (
    <div className="glass-panel p-6 sm:p-8 relative overflow-hidden border-l-[3px] border-l-signal-teal shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06),-10px_0_30px_-5px_rgba(47,212,166,0.25)]">
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-signal-indigo-soft border border-signal-indigo/30 flex items-center justify-center text-signal-indigo">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display font-semibold text-sm text-text-primary">Payment Gateway API</div>
            <div className="font-mono text-[11px] text-text-muted">api.staging.internal / v2 / checkout</div>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] font-medium uppercase tracking-wider status-pill-ready">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-teal animate-pulse" />
          READY · HIGH CONFIDENCE
        </span>
      </div>

      {/* Hero Score Display */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 py-6 border-b border-white/[0.08] items-center">
        <div className="sm:col-span-5 space-y-1.5">
          <span className="font-mono text-[10px] font-medium tracking-wider text-text-muted uppercase block">
            READINESS SCORE
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-bold text-5xl sm:text-6xl text-text-primary tracking-tighter">
              96
            </span>
            <span className="font-mono text-base text-text-muted">/100</span>
          </div>
          <p className="font-mono text-[11px] text-signal-teal flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Passes declared SLA</span>
          </p>
        </div>

        {/* 4 Telemetry Metrics Grid */}
        <div className="sm:col-span-7 grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-ink-900/80 border border-white/[0.06] space-y-1">
            <div className="flex items-center justify-between text-text-muted font-mono text-[10px]">
              <span>p95 LATENCY</span>
              <Activity className="w-3 h-3 text-signal-indigo" />
            </div>
            <div className="font-mono text-base font-medium text-text-primary">
              380 <span className="text-[10px] text-text-muted">ms</span>
            </div>
            <div className="font-mono text-[9px] text-signal-teal">Target &lt; 500ms</div>
          </div>

          <div className="p-3 rounded-xl bg-ink-900/80 border border-white/[0.06] space-y-1">
            <div className="flex items-center justify-between text-text-muted font-mono text-[10px]">
              <span>THROUGHPUT</span>
              <Zap className="w-3 h-3 text-signal-indigo" />
            </div>
            <div className="font-mono text-base font-medium text-text-primary">
              482 <span className="text-[10px] text-text-muted">RPS</span>
            </div>
            <div className="font-mono text-[9px] text-text-muted">0 dropouts</div>
          </div>

          <div className="p-3 rounded-xl bg-ink-900/80 border border-white/[0.06] space-y-1">
            <div className="flex items-center justify-between text-text-muted font-mono text-[10px]">
              <span>ERROR RATE</span>
              <ShieldCheck className="w-3 h-3 text-signal-teal" />
            </div>
            <div className="font-mono text-base font-medium text-signal-teal">
              0.00<span className="text-[10px] text-text-muted">%</span>
            </div>
            <div className="font-mono text-[9px] text-text-muted">0 / 28,920 reqs</div>
          </div>

          <div className="p-3 rounded-xl bg-ink-900/80 border border-white/[0.06] space-y-1">
            <div className="flex items-center justify-between text-text-muted font-mono text-[10px]">
              <span>ENVELOPE</span>
              <Gauge className="w-3 h-3 text-signal-indigo" />
            </div>
            <div className="font-mono text-base font-medium text-text-primary">
              25 <span className="text-[10px] text-text-muted">VUs</span>
            </div>
            <div className="font-mono text-[9px] text-text-muted">60s bounded ramp</div>
          </div>
        </div>
      </div>

      {/* Telemetry Note / Footer */}
      <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-text-muted font-mono text-[10px]">
        <div className="flex items-start gap-1.5 max-w-sm">
          <span className="text-signal-amber font-bold shrink-0">ⓘ</span>
          <p className="leading-relaxed">
            <strong className="text-text-primary font-medium">Validity envelope:</strong> Score valid only under declared workload.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-signal-teal uppercase tracking-wider font-medium shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-teal animate-pulse" />
          <span>ENGINE ONLINE</span>
        </div>
      </div>
    </div>
  );
}
