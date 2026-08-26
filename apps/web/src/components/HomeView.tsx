import React from "react";
import { 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Lock, 
  AlertTriangle, 
  SlidersHorizontal, 
  Cpu, 
  Share2, 
  FileText, 
  Radio,
  Server,
  Zap,
  Activity
} from "lucide-react";
import { PublicNav } from "./PublicNav";
import { SignalField } from "./SignalField";
import { MetricPreview } from "./MetricPreview";
import { Scrollytelling } from "./Scrollytelling";
import { PublicFooter } from "./PublicFooter";

interface HomeViewProps {
  onSignIn: () => void;
  onSignUp: () => void;
  onQuickLogin?: (role: "owner" | "tester") => void;
  isLoggedIn?: boolean;
  onGoToDashboard?: () => void;
}

export function HomeView({ onSignIn, onSignUp, onQuickLogin, isLoggedIn, onGoToDashboard }: HomeViewProps) {
  return (
    <div className="min-h-screen bg-ink-950 text-text-primary selection:bg-signal-indigo/30 selection:text-white relative">
      {/* Signature Background: Full-Viewport Signal Field Canvas */}
      <SignalField />

      {/* Glass Header Navigation */}
      <PublicNav onSignIn={onSignIn} onSignUp={onSignUp} isLoggedIn={isLoggedIn} onGoToDashboard={onGoToDashboard} />

      <main className="relative z-10">
        
        {/* =========================================================================
            1. HERO SECTION (2-Column Balanced Telemetry Grid)
           ========================================================================= */}
        <section className="py-16 sm:py-28 relative">
          <div className="max-w-[1240px] mx-auto px-6 sm:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              
              {/* Left Hero Column */}
              <div className="lg:col-span-6 space-y-6">
                {/* Technical Eyebrow Badge in IBM Plex Mono */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[11px] font-medium tracking-wider text-signal-indigo bg-signal-indigo-soft border border-signal-indigo/25 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-indigo animate-pulse" />
                  DETERMINISTIC APPLICATION READINESS
                </div>

                {/* 2-Line Balanced Headline in Space Grotesk */}
                <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-[56px] text-text-primary tracking-tight leading-[1.08] max-w-xl">
                  Know what your application can handle—{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-signal-indigo via-indigo-400 to-signal-teal">
                    before your users do.
                  </span>
                </h1>

                {/* Paragraph in Inter */}
                <p className="text-text-muted text-base sm:text-lg leading-relaxed max-w-lg">
                  Run controlled, authorized performance checks and turn real measurements into an evidence-backed readiness report your team and stakeholders can understand.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={onSignUp}
                    className="btn-solid-primary cursor-pointer justify-center"
                  >
                    <span>Create Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <a
                    href="#pipeline"
                    className="btn-glass-secondary justify-center cursor-pointer text-sm"
                  >
                    <Sparkles className="w-4 h-4 text-signal-indigo" />
                    <span>See how it runs ↓</span>
                  </a>
                </div>

                {/* Real Proof Tags in IBM Plex Mono */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 font-mono text-xs text-text-muted">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-signal-teal" />
                    Authorized testing only
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-signal-teal" />
                    Bounded safety caps
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-signal-teal" />
                    Deterministic math
                  </span>
                </div>
              </div>

              {/* Right Hero Column: Restyled Dark Glass HUD Readiness Card */}
              <div className="lg:col-span-6">
                <MetricPreview />
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. VALUE STRIP (Observed Behavior Under Workload)
           ========================================================================= */}
        <section className="border-y border-white/[0.06] bg-ink-900/50 py-8 relative">
          <div className="max-w-[1240px] mx-auto px-6 sm:px-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <p className="text-sm sm:text-base text-text-muted max-w-xl">
              ProofScale replaces uncertain launch conversations with{" "}
              <strong className="text-text-primary font-semibold">
                observed behavior under a declared workload.
              </strong>
            </p>

            <div className="flex items-center flex-wrap gap-4 font-mono text-xs text-text-muted uppercase tracking-wider">
              <span className="text-text-primary font-medium">Reliability</span>
              <span className="w-1 h-1 rounded-full bg-signal-indigo" />
              <span className="text-text-primary font-medium">Latency</span>
              <span className="w-1 h-1 rounded-full bg-signal-indigo" />
              <span className="text-text-primary font-medium">Capacity</span>
              <span className="w-1 h-1 rounded-full bg-signal-indigo" />
              <span className="text-text-primary font-medium">Stability</span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. SCROLLYTELLING PIPELINE ("How an assessment actually runs")
           ========================================================================= */}
        <Scrollytelling />

        {/* =========================================================================
            4. METHODOLOGY & SCORING SPEC SECTION
           ========================================================================= */}
        <section id="methodology" className="py-16 sm:py-32 border-t border-white/[0.06] bg-ink-900/30">
          <div className="max-w-[1240px] mx-auto px-6 sm:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              
              {/* Left Column: Methodology Explanation */}
              <div className="lg:col-span-5 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[11px] font-medium tracking-wider text-signal-teal bg-signal-teal-soft border border-signal-teal/20 uppercase">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  METHODOLOGY MADE VISIBLE
                </div>

                <h2 className="font-display font-bold text-3xl sm:text-4xl text-text-primary tracking-tight leading-[1.15]">
                  A score should be understandable, not just impressive.
                </h2>

                <p className="text-text-muted text-base leading-relaxed">
                  ProofScale keeps the workload, thresholds, target, run conditions, and confidence context next to the number. The result is defensible across engineering teams and executive stakeholders.
                </p>

                {/* Score Status Tiers Matrix */}
                <div className="space-y-2 pt-2">
                  <div className="p-3 rounded-xl bg-ink-900/90 border border-white/[0.06] flex items-center justify-between font-mono text-xs">
                    <span className="text-text-primary font-medium">Ready (90–100)</span>
                    <span className="text-signal-teal font-bold">Passes declared SLA thresholds</span>
                  </div>
                  <div className="p-3 rounded-xl bg-ink-900/90 border border-white/[0.06] flex items-center justify-between font-mono text-xs">
                    <span className="text-text-primary font-medium">Conditionally ready (75–89)</span>
                    <span className="text-signal-amber font-bold">Passing with latency drift notes</span>
                  </div>
                  <div className="p-3 rounded-xl bg-ink-900/90 border border-white/[0.06] flex items-center justify-between font-mono text-xs">
                    <span className="text-text-primary font-medium">Needs investigation (50–74)</span>
                    <span className="text-signal-amber font-bold">Approaching capacity limit</span>
                  </div>
                  <div className="p-3 rounded-xl bg-ink-900/90 border border-white/[0.06] flex items-center justify-between font-mono text-xs">
                    <span className="text-text-primary font-medium">Not ready (0–49)</span>
                    <span className="text-signal-rose font-bold">Error spike or hard-cap tripped</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Exact Scoring Specification Table */}
              <div className="lg:col-span-7" id="scoring">
                <div className="glass-panel p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                    <span className="font-mono text-xs font-bold text-text-primary uppercase tracking-wider">
                      DETERMINISTIC SCORING ENGINE SPEC · v1.4
                    </span>
                    <span className="font-mono text-[10px] text-signal-indigo uppercase px-2 py-0.5 rounded bg-signal-indigo-soft border border-signal-indigo/30">
                      STRICT WEIGHTING
                    </span>
                  </div>

                  {/* Weights Spec Table */}
                  <div className="divide-y divide-white/[0.06] font-mono text-xs">
                    <div className="py-3 flex items-center justify-between">
                      <div>
                        <span className="text-text-primary font-bold block">Reliability &amp; Error Rate</span>
                        <span className="text-[11px] text-text-muted">HTTP 5xx, socket drops, network resets</span>
                      </div>
                      <span className="text-signal-teal font-bold text-sm">30%</span>
                    </div>

                    <div className="py-3 flex items-center justify-between">
                      <div>
                        <span className="text-text-primary font-bold block">Latency Percentiles</span>
                        <span className="text-[11px] text-text-muted">p50 median, p95 target, p99 maximum</span>
                      </div>
                      <span className="text-signal-indigo font-bold text-sm">25%</span>
                    </div>

                    <div className="py-3 flex items-center justify-between">
                      <div>
                        <span className="text-text-primary font-bold block">Capacity Envelope Behavior</span>
                        <span className="text-[11px] text-text-muted">Concurrency throughput scaling &amp; backpressure</span>
                      </div>
                      <span className="text-text-primary font-bold text-sm">20%</span>
                    </div>

                    <div className="py-3 flex items-center justify-between">
                      <div>
                        <span className="text-text-primary font-bold block">System Stability &amp; Jitter</span>
                        <span className="text-[11px] text-text-muted">Variance over sustained workload duration</span>
                      </div>
                      <span className="text-text-primary font-bold text-sm">15%</span>
                    </div>

                    <div className="py-3 flex items-center justify-between">
                      <div>
                        <span className="text-text-primary font-bold block">Readiness Hygiene</span>
                        <span className="text-[11px] text-text-muted">Target authorization status &amp; config health</span>
                      </div>
                      <span className="text-text-primary font-bold text-sm">10%</span>
                    </div>
                  </div>

                  {/* Hard-Cap Warning Spec */}
                  <div className="p-4 rounded-xl bg-signal-rose-soft border border-signal-rose/30 space-y-1 font-mono text-xs text-signal-rose">
                    <div className="font-bold flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      <span>HARD-CAP RULE ENFORCEMENT</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      If the overall error rate exceeds 5.00%, the total score is capped at a maximum of <strong className="text-signal-rose font-bold">49 / 100 ("Not ready")</strong> regardless of low latency or high throughput.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. SAFETY GUARDRAILS SECTION (4 Glass Cards)
           ========================================================================= */}
        <section id="safety" className="py-16 sm:py-32 border-t border-white/[0.06]">
          <div className="max-w-[1240px] mx-auto px-6 sm:px-12 space-y-12">
            
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[11px] font-medium tracking-wider text-signal-teal bg-signal-teal-soft border border-signal-teal/20 uppercase">
                <Lock className="w-3.5 h-3.5" />
                SAFETY GUARDRAILS
              </div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-text-primary tracking-tight">
                Designed for authorized measurement, not indiscriminate traffic.
              </h2>
              <p className="text-text-muted text-base leading-relaxed">
                Target validation, constrained plans, audit trails, role-aware access, and report limitations are built into the workflow from the first click.
              </p>
            </div>

            {/* 4 Small Glass Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="glass-panel p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-signal-indigo-soft border border-signal-indigo/30 flex items-center justify-center text-signal-indigo">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-lg text-text-primary">
                  SSRF &amp; IP Guard
                </h3>
                <p className="text-text-muted text-xs leading-relaxed">
                  Automatic blocking of loopback 127.0.0.1, RFC 1918 private subnets, and cloud metadata endpoints on all worker requests.
                </p>
              </div>

              <div className="glass-panel p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-signal-teal-soft border border-signal-teal/30 flex items-center justify-center text-signal-teal">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-lg text-text-primary">
                  Domain Verification
                </h3>
                <p className="text-text-muted text-xs leading-relaxed">
                  Cryptographic DNS TXT or HTTP token challenge required before executing any traffic against external target endpoints.
                </p>
              </div>

              <div className="glass-panel p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-signal-rose-soft border border-signal-rose/30 flex items-center justify-center text-signal-rose">
                  <Radio className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-lg text-text-primary">
                  Emergency Kill Switch
                </h3>
                <p className="text-text-muted text-xs leading-relaxed">
                  Global and per-run emergency abort button that immediately terminates all runner processes and socket connections.
                </p>
              </div>

              <div className="glass-panel p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-signal-amber-soft border border-signal-amber/30 flex items-center justify-center text-signal-amber">
                  <Share2 className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-lg text-text-primary">
                  Hashed Evidence Links
                </h3>
                <p className="text-text-muted text-xs leading-relaxed">
                  Readiness reports shared via SHA-256 token-hashed URLs with configurable expiration dates and instant one-click revocation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            6. CLOSING CTA BAND (Glass Panel over Signal Field)
           ========================================================================= */}
        <section className="py-16 sm:py-24 border-t border-white/[0.06]">
          <div className="max-w-[1240px] mx-auto px-6 sm:px-12">
            <div className="glass-panel p-8 sm:p-14 relative overflow-hidden border border-white/[0.12] flex flex-col md:flex-row md:items-center justify-between gap-8">
              
              <div className="space-y-3 max-w-xl">
                <div className="font-mono text-xs text-signal-indigo font-bold uppercase tracking-wider">
                  MAKE THE NEXT RELEASE MEASURABLE
                </div>
                <h2 className="font-display font-bold text-3xl sm:text-4xl text-text-primary tracking-tight">
                  Start with the conditions your team can explain.
                </h2>
                <p className="text-text-muted text-sm sm:text-base leading-relaxed">
                  Set up your first project, declare target endpoints, and produce deterministic readiness reports today.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
                <button
                  type="button"
                  onClick={onSignUp}
                  className="btn-solid-primary cursor-pointer justify-center"
                >
                  <span>Create Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="btn-glass-secondary cursor-pointer justify-center"
                >
                  <span>Sign In</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 4-Column Balanced Footer */}
      <PublicFooter onSignIn={onSignIn} onSignUp={onSignUp} />
    </div>
  );
}
