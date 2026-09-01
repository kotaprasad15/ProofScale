import React from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { MaskedReveal } from "./MaskedReveal";
import { MagneticElement } from "./MagneticElement";

interface ClosingCTAProps {
  onSignUp?: () => void;
  onSignIn?: () => void;
  isLoggedIn?: boolean;
  onGoToDashboard?: () => void;
}

export function ClosingCTA({
  onSignUp,
  onSignIn,
  isLoggedIn,
  onGoToDashboard
}: ClosingCTAProps) {
  return (
    <section className="py-28 sm:py-44 px-6 sm:px-12 relative z-10 border-t border-[var(--border)] overflow-hidden">
      {/* Background ambient gradient glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[40vw] rounded-full bg-gradient-to-r from-signal-indigo/15 via-signal-teal/10 to-transparent blur-[160px]" />
      </div>

      <div className="max-w-6xl mx-auto text-center space-y-10 relative z-10">
        
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono text-[11px] font-medium tracking-widest text-signal-indigo bg-signal-indigo-soft border border-signal-indigo/25 uppercase mx-auto">
          <Sparkles className="w-3.5 h-3.5" />
          START WITH CONFIDENCE
        </div>

        <div className="space-y-2">
          <MaskedReveal>
            <h2 className="font-display font-bold text-4xl sm:text-6xl lg:text-7xl text-text-primary tracking-tight leading-[1.05]">
              Start with the conditions
            </h2>
          </MaskedReveal>
          <MaskedReveal delay={0.12}>
            <h2 className="font-display font-bold text-4xl sm:text-6xl lg:text-7xl text-transparent bg-clip-text bg-gradient-to-r from-signal-indigo via-indigo-300 to-signal-teal tracking-tight leading-[1.05]">
              your team can explain.
            </h2>
          </MaskedReveal>
        </div>

        <p className="text-text-muted text-base sm:text-xl max-w-2xl mx-auto leading-relaxed font-sans">
          Configure an authorized target, define bounded concurrency, and turn real runtime behavior into verifiable evidence.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {isLoggedIn ? (
            <MagneticElement strength={0.35} radius={80}>
              <button
                type="button"
                onClick={onGoToDashboard}
                className="btn-solid-primary text-base px-9 py-4 cursor-pointer"
              >
                <span>Go to Workspace Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </MagneticElement>
          ) : (
            <>
              <MagneticElement strength={0.35} radius={80}>
                <button
                  type="button"
                  onClick={onSignUp}
                  className="btn-solid-primary text-base px-9 py-4 cursor-pointer"
                >
                  <span>Create Workspace</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </MagneticElement>

              <button
                type="button"
                onClick={onSignIn}
                className="btn-glass-secondary text-sm px-7 py-4 cursor-pointer"
              >
                <span>Sign In</span>
              </button>
            </>
          )}
        </div>

      </div>
    </section>
  );
}
