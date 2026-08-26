import React from "react";
import { CheckCircle2, ShieldCheck, Activity, Gauge, Server, AlertCircle, ArrowUpRight, Zap } from "lucide-react";

export function HeroAssessmentPreview() {
  return (
    <div className="relative rounded-3xl bg-white border border-cardborder shadow-elevated p-6 sm:p-8 max-w-2xl mx-auto overflow-hidden">
      {/* Decorative top accent glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-success/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-cardborder">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center font-bold">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-ink text-base">Payment Gateway Service</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-soft text-success border border-success/20">
                Staging
              </span>
            </div>
            <p className="text-xs text-ink-muted font-mono mt-0.5">https://api.staging.internal/v2/checkout</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Conditionally Ready
          </span>
        </div>
      </div>

      {/* Main Score & Diagnostic Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 py-6 border-b border-cardborder items-center">
        {/* Score Ring / Radial */}
        <div className="sm:col-span-5 flex flex-col items-center sm:items-start text-center sm:text-left">
          <span className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">Readiness Score</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-5xl font-black text-ink tracking-tight font-sans">96</span>
            <span className="text-xl font-bold text-ink-muted">/ 100</span>
          </div>
          <p className="text-xs text-success font-semibold flex items-center mt-1">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Passes declared SLA thresholds
          </p>
        </div>

        {/* Diagnostic Pillars */}
        <div className="sm:col-span-7 grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-surface-muted border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-ink-muted font-medium">p95 Latency</span>
              <Activity className="h-3.5 w-3.5 text-brand" />
            </div>
            <div className="text-base font-bold font-mono text-ink mt-0.5">380 ms</div>
            <span className="text-[10px] text-emerald-600 font-semibold font-mono">Target: &lt; 500ms</span>
          </div>

          <div className="p-3 rounded-xl bg-surface-muted border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-ink-muted font-medium">Throughput</span>
              <Zap className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div className="text-base font-bold font-mono text-ink mt-0.5">482 RPS</div>
            <span className="text-[10px] text-emerald-600 font-semibold font-mono">Zero dropouts</span>
          </div>

          <div className="p-3 rounded-xl bg-surface-muted border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-ink-muted font-medium">Error Rate</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="text-base font-bold font-mono text-success mt-0.5">0.00 %</div>
            <span className="text-[10px] text-ink-muted font-mono">0 / 28,920 reqs</span>
          </div>

          <div className="p-3 rounded-xl bg-surface-muted border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-ink-muted font-medium">Test Envelope</span>
              <Gauge className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="text-xs font-bold font-mono text-ink mt-0.5">25 VUs · 60s</div>
            <span className="text-[10px] text-ink-muted font-mono">Bounded Ramp</span>
          </div>
        </div>
      </div>

      {/* Disclaimer and Context Banner */}
      <div className="pt-4 flex items-start space-x-2.5 text-[11px] text-ink-muted leading-relaxed">
        <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <p>
          <strong className="text-ink font-semibold">Validity Envelope:</strong> Score is valid only within the declared workload (<span className="font-mono text-slate-700">25 VUs, 500 RPS cap, 60s duration</span>). Does not represent unconditional production capacity.
        </p>
      </div>
    </div>
  );
}
