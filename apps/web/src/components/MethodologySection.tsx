import React from "react";
import { Gauge, Shield, Cpu, Scale, AlertCircle, CheckCircle2, Sliders, BarChart3 } from "lucide-react";

export function MethodologySection() {
  const pillars = [
    {
      title: "Latency SLA Compliance",
      weight: "35%",
      description: "Calculates the gap between observed p95/p99 latency against declared SLA thresholds. Penalizes exponential degradation curves.",
      icon: Gauge,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100"
    },
    {
      title: "Error-Free Delivery",
      weight: "30%",
      description: "Measures 4xx and 5xx status rates under load. Even minor 500 error rates heavily lower the readiness score.",
      icon: Shield,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100"
    },
    {
      title: "Throughput Linearity",
      weight: "20%",
      description: "Checks whether response throughput scales linearly as virtual users ramp up, detecting thread starvation bottlenecks early.",
      icon: Cpu,
      color: "bg-purple-50 text-purple-600 border-purple-100"
    },
    {
      title: "Stability & Variance Index",
      weight: "15%",
      description: "Evaluates standard deviation and jitter during steady-state plateaus to ensure consistent, predictable performance.",
      icon: Scale,
      color: "bg-amber-50 text-amber-600 border-amber-100"
    }
  ];

  return (
    <section id="methodology" className="py-20 lg:py-28 bg-white border-b border-cardborder">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-surface-muted text-ink border border-cardborder uppercase tracking-wider">
            <BarChart3 className="h-3.5 w-3.5 text-brand" />
            <span>Deterministic Scoring Formula</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            How Ratecap Calculates Application Readiness
          </h2>
          <p className="text-base sm:text-lg text-ink-muted leading-relaxed">
            Ratecap does not give arbitrary pass/fail stamps. Every assessment produces a mathematical 0–100 score strictly bounded within your test configuration envelope.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-surface-muted border border-cardborder shadow-soft flex flex-col justify-between space-y-4 hover:border-brand/40 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-2xl border ${pillar.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-white border border-cardborder text-ink">
                      Weight: {pillar.weight}
                    </span>
                  </div>

                  <h3 className="font-bold text-ink text-lg">{pillar.title}</h3>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {pillar.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/60 flex items-center text-[11px] font-semibold text-brand">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Deterministic Metric
                </div>
              </div>
            );
          })}
        </div>

        {/* Validity Envelope & Safety Guardrail Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 rounded-2xl bg-amber-100 text-amber-800 shrink-0">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-amber-950 text-base">The Test Envelope Principle</h4>
              <p className="text-xs sm:text-sm text-amber-900/80 leading-relaxed max-w-3xl">
                A 100/100 readiness score indicates that your application passed all declared SLAs under the specified workload parameters (e.g., 50 VUs for 60 seconds). It is not an unconditional guarantee of unconstrained live capacity.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <span className="px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-xs font-bold text-amber-900 font-mono inline-block">
              Safety Envelope Protected
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
