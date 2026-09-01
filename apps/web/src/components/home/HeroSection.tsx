import React from "react";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
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
    <section className="relative min-h-screen flex flex-col justify-between pt-24 pb-12 px-6 sm:px-12 overflow-hidden">
      {/* Slow-drifting grain-textured gradient mesh background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
      >
        <div className="absolute -top-[25%] -left-[15%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-signal-indigo/15 via-signal-indigo/5 to-transparent blur-[120px] animate-pulse" style={{ animationDuration: "10s" }} />
        <div className="absolute top-[35%] -right-[20%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-bl from-signal-teal/12 via-signal-indigo/5 to-transparent blur-[140px]" />
        <div className="absolute inset-0 grain-bg opacity-40" />
      </div>

      {/* Main Hero Kinetic Type Content */}
      <div className="relative z-10 max-w-7xl mx-auto w-full my-auto space-y-10">
        
        {/* Technical Eyebrow Badge with Title Rate cap */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono text-[11px] font-medium tracking-widest text-signal-teal bg-signal-teal-soft border border-signal-teal/20 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-teal animate-pulse" />
          RATE CAP · APPLICATION READINESS INSTRUMENT
        </div>

        {/* Massive Multi-Line Headline with Masked Reveal */}
        <div className="space-y-1 sm:space-y-3">
          <MaskedReveal delay={0.05} duration={0.85}>
            <h1 className="font-display font-bold text-5xl sm:text-7xl lg:text-[clamp(3.5rem,8.5vw,8.5rem)] text-text-primary tracking-tight leading-[0.95]">
              KNOW WHAT YOUR
            </h1>
          </MaskedReveal>

          <MaskedReveal delay={0.18} duration={0.85}>
            <h1 className="font-display font-bold text-5xl sm:text-7xl lg:text-[clamp(3.5rem,8.5vw,8.5rem)] text-transparent bg-clip-text bg-gradient-to-r from-signal-indigo via-indigo-400 to-signal-teal tracking-tight leading-[0.95]">
              APPLICATION CAN
            </h1>
          </MaskedReveal>

          <MaskedReveal delay={0.3} duration={0.85}>
            <h1 className="font-display font-bold text-5xl sm:text-7xl lg:text-[clamp(3.5rem,8.5vw,8.5rem)] text-text-primary tracking-tight leading-[0.95]">
              HANDLE.
            </h1>
          </MaskedReveal>
        </div>

        {/* Subtitle & Primary CTA Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pt-4">
          <div className="lg:col-span-7">
            <MaskedReveal delay={0.42} duration={0.7}>
              <p className="text-text-muted text-lg sm:text-xl lg:text-2xl leading-relaxed max-w-2xl font-sans">
                Run controlled, sandboxed performance checks under declared workloads. Turn empirical measurements into client-ready proof.
              </p>
            </MaskedReveal>
          </div>

          <div className="lg:col-span-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:justify-end">
            {isLoggedIn ? (
              <MagneticElement strength={0.35} radius={80}>
                <button
                  type="button"
                  onClick={onGoToDashboard}
                  className="btn-solid-primary text-base px-8 py-4 cursor-pointer"
                >
                  <span>Open Active Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </MagneticElement>
            ) : (
              <>
                <MagneticElement strength={0.35} radius={80}>
                  <button
                    type="button"
                    onClick={onSignUp}
                    className="btn-solid-primary text-base px-8 py-4 cursor-pointer"
                  >
                    <span>Create Workspace</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </MagneticElement>

                <a
                  href="#pipeline"
                  className="btn-glass-secondary text-sm px-6 py-4 cursor-pointer"
                >
                  <span>Explore Spec ↓</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Scroll Cue */}
      <div className="relative z-10 max-w-7xl mx-auto w-full pt-8 flex items-center justify-between border-t border-[var(--border)] text-xs font-mono text-text-faint">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-indigo" />
          <span>SPEC v1.4 · AES-GCM · SHA-256</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="tracking-widest uppercase">SCROLL TO EXAMINE</span>
          <div className="w-12 h-[1px] bg-[var(--border-strong)] relative overflow-hidden">
            <div className="w-full h-full bg-signal-teal animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
}
