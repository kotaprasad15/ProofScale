import React from "react";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { PublicNav } from "./PublicNav";
import { SignalField } from "./SignalField";
import { MetricPreview } from "./MetricPreview";
import { Scrollytelling } from "./Scrollytelling";
import { CapabilitiesBento } from "./CapabilitiesBento";
import { MethodologySection } from "./MethodologySection";
import { SafetyGuardrails } from "./SafetyGuardrails";
import { RolePathwaysSection } from "./RolePathwaysSection";
import { PublicFooter } from "./PublicFooter";
import { TiltCard } from "./ui/TiltCard";

interface HomeViewProps {
  onSignIn: () => void;
  onSignUp: () => void;
  isLoggedIn?: boolean;
  onGoToDashboard?: () => void;
  onLogout?: () => void;
}

export function HomeView({ onSignIn, onSignUp, isLoggedIn, onGoToDashboard, onLogout }: HomeViewProps) {
  return (
    <div data-motion="full" className="min-h-screen bg-ink-950 text-text-primary selection:bg-signal-indigo/30 selection:text-white relative">
      {/* Signature Background: Full-Viewport 3D Signal Field */}
      <SignalField variant="marketing" />

      {/* Glass Header Navigation */}
      <PublicNav onSignIn={onSignIn} onSignUp={onSignUp} isLoggedIn={isLoggedIn} onGoToDashboard={onGoToDashboard} onLogout={onLogout} />

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
                <h1 className="type-h1 text-text-primary max-w-xl">
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
                <TiltCard maxTilt={4}>
                  <MetricPreview />
                </TiltCard>
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
              Ratecap replaces uncertain launch conversations with{" "}
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
            3.5 CAPABILITIES (Bento grid rhythm break — 2 large + 4 small)
           ========================================================================= */}
        <CapabilitiesBento />

        {/* =========================================================================
            4. METHODOLOGY (weighted bars fill on scroll, brutalist hard-cap)
           ========================================================================= */}
        <MethodologySection />

        {/* =========================================================================
            5. ROLE PATHWAYS (4 tilt-hover glass cards)
           ========================================================================= */}
        <RolePathwaysSection />

        {/* =========================================================================
            6. SAFETY GUARDRAILS (shield assembles on scroll)
           ========================================================================= */}
        <SafetyGuardrails />

        {/* =========================================================================
            7. CLOSING CTA BAND (Glass Panel over Signal Field)
           ========================================================================= */}
        <section className="py-16 sm:py-24 border-t border-white/[0.06]">
          <div className="max-w-[1240px] mx-auto px-6 sm:px-12">
            <div className="glass-panel p-8 sm:p-14 relative overflow-hidden border border-white/[0.12] flex flex-col md:flex-row md:items-center justify-between gap-8">
              
              <div className="space-y-3 max-w-xl">
                <div className="font-mono text-xs text-signal-indigo font-bold uppercase tracking-wider">
                  MAKE THE NEXT RELEASE MEASURABLE
                </div>
                <h2 className="type-h2 text-text-primary tracking-tight">
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
