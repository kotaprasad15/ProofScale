import React from "react";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Activity,
  Zap,
  Server,
  Terminal,
  BookOpen
} from "lucide-react";
import { MaskedReveal } from "./MaskedReveal";
import { MagneticElement } from "./MagneticElement";

interface HeroSectionProps {
  onSignUp?: () => void;
  onSignIn?: () => void;
  isLoggedIn?: boolean;
  onGoToDashboard?: () => void;
}

export function HeroSection({
  onSignUp,
  onSignIn,
  isLoggedIn,
  onGoToDashboard
}: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex flex-col justify-between pt-28 pb-12 px-6 sm:px-12 overflow-hidden">
      {/* Subtle developer-first ambient background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
      >
        <div
          className="absolute -top-[20%] -left-[10%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-br from-signal-indigo/10 via-signal-indigo/5 to-transparent blur-[140px]"
        />
        <div
          className="absolute top-[40%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-bl from-signal-teal/10 via-signal-indigo/5 to-transparent blur-[160px]"
        />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 max-w-6xl mx-auto w-full space-y-10 my-auto">
        {/* Technical Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono text-[11px] font-medium tracking-widest text-signal-indigo bg-signal-indigo/10 border border-signal-indigo/20 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-teal animate-pulse" />
          RATECAP · APPLICATION READINESS & RATE-LIMIT VALIDATION
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <MaskedReveal delay={0.05} duration={0.8}>
            <h1 className="font-sans font-semibold text-4xl sm:text-6xl lg:text-7xl text-text-primary tracking-tight leading-[1.05]">
              Know how your application behaves{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-signal-indigo to-signal-teal">
                before production.
              </span>
            </h1>
          </MaskedReveal>
        </div>

        {/* Subtitle */}
        <div className="max-w-2xl">
          <MaskedReveal delay={0.2} duration={0.7}>
            <p className="text-text-muted text-base sm:text-lg lg:text-xl leading-relaxed font-sans">
              An engineering control center for understanding application readiness, rate limits, bounded-load behavior, and system performance under real-world traffic envelopes.
            </p>
          </MaskedReveal>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          {isLoggedIn ? (
            <MagneticElement strength={0.3} radius={60}>
              <button
                type="button"
                onClick={onGoToDashboard}
                className="px-6 py-3.5 rounded-xl text-sm font-semibold bg-signal-indigo hover:bg-signal-indigo-hover text-white shadow-sm shadow-signal-indigo/20 transition cursor-pointer flex items-center gap-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </MagneticElement>
          ) : (
            <>
              <MagneticElement strength={0.3} radius={60}>
                <button
                  type="button"
                  onClick={onSignUp}
                  className="px-6 py-3.5 rounded-xl text-sm font-semibold bg-signal-indigo hover:bg-signal-indigo-hover text-white shadow-sm shadow-signal-indigo/20 transition cursor-pointer flex items-center gap-2"
                >
                  <span>Start Validation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </MagneticElement>

              <a
                href="#pipeline"
                className="px-5 py-3.5 rounded-xl text-sm font-semibold bg-[var(--white-fill-sm)] hover:bg-[var(--white-fill-md)] text-text-primary border border-[var(--border)] transition cursor-pointer flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-text-muted" />
                <span>View Documentation</span>
              </a>
            </>
          )}
        </div>

        {/* Live Product Preview Card (Realistic Infrastructure Console) */}
        <div className="pt-6">
          <div className="rounded-2xl bg-ink-900 border border-[var(--border)] shadow-2xl overflow-hidden font-mono text-xs">
            {/* Console Titlebar */}
            <div className="h-10 px-4 bg-[var(--white-fill-sm)] border-b border-[var(--border)] flex items-center justify-between text-text-muted">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-signal-rose/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-signal-amber/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-signal-teal/60" />
                </div>
                <span className="text-[11px] text-text-faint ml-2">
                  ratecap-agent · target: api-staging.internal · 25 VUs · 60s
                </span>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-signal-teal font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-teal animate-pulse" />
                READY FOR STAGING
              </span>
            </div>

            {/* Console Preview Body */}
            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
              <div className="space-y-1">
                <span className="text-[10px] uppercase text-text-faint">Readiness Score</span>
                <div className="text-2xl font-bold text-signal-teal">96 / 100</div>
                <span className="text-[10px] text-text-muted">Passes declared SLA</span>
              </div>

              <div className="pt-3 sm:pt-0 sm:pl-4 space-y-1">
                <span className="text-[10px] uppercase text-text-faint">p95 Latency</span>
                <div className="text-2xl font-bold text-text-primary">128 ms</div>
                <span className="text-[10px] text-signal-teal">&lt; 500ms threshold</span>
              </div>

              <div className="pt-3 sm:pt-0 sm:pl-4 space-y-1">
                <span className="text-[10px] uppercase text-text-faint">Rate Limit Usage</span>
                <div className="text-2xl font-bold text-signal-indigo">74.2%</div>
                <span className="text-[10px] text-text-muted">Optimal headroom</span>
              </div>

              <div className="pt-3 sm:pt-0 sm:pl-4 space-y-1">
                <span className="text-[10px] uppercase text-text-faint">Validated Throughput</span>
                <div className="text-2xl font-bold text-text-primary">482 RPS</div>
                <span className="text-[10px] text-text-muted">Zero 5xx detected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info Row */}
      <div className="relative z-10 max-w-6xl mx-auto w-full pt-8 flex items-center justify-between text-xs font-mono text-text-faint border-t border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-signal-teal" />
          <span>Production-Grade Observability</span>
        </div>
        <div>
          <span>Engine v1.0.4 · Open Telemetry Compatible</span>
        </div>
      </div>
    </section>
  );
}
