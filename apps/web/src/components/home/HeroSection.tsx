import React from "react";
import { motion, useReducedMotion as useFramerReducedMotion } from "framer-motion";
import { ArrowRight, ShieldCheck, Activity, Zap } from "lucide-react";
import { DURATION, EASE, HeroVisual } from "../../motion";

interface HeroSectionProps {
  onSignUp?: () => void;
  onSignIn?: () => void;
  isLoggedIn?: boolean;
  onGoToDashboard?: () => void;
}

const HEADLINE = ["Know how your", "application behaves"];

export function HeroSection({
  onSignUp,
  onSignIn,
  isLoggedIn,
  onGoToDashboard,
}: HeroSectionProps) {
  const reduced = useFramerReducedMotion();

  return (
    <section className="relative min-h-[92vh] flex flex-col justify-center pt-28 pb-20 overflow-hidden">
      {/* Same centered container as every other section, so edges align */}
      <div className="relative z-10 mx-auto w-full max-w-[1360px] px-6 sm:px-10 lg:px-14 my-auto">
        {/* Two-column hero: text left, visual right, vertically centered */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-10 items-center">
          {/* ============ Left column: ALL text content ============ */}
          <div className="space-y-8 min-w-0">
            {/* Technical eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.base, ease: EASE.out }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono text-[11px] font-medium tracking-widest uppercase glass-subtle"
              style={{ color: "var(--accent)" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--success)", boxShadow: "0 0 8px var(--success)" }}
              />
              RateCap · Application Readiness & Rate-Limit Validation
            </motion.div>

            {/* Headline with animated gradient text */}
            <h1 className="font-display font-bold text-4xl sm:text-5xl xl:text-6xl tracking-tight leading-[1.06] text-[var(--text-1)]">
              {HEADLINE.map((line, li) => (
                <span key={li} className="block overflow-hidden">
                  <motion.span
                    className="block"
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: DURATION.reveal, delay: 0.1 + li * 0.12, ease: EASE.out }}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
              <span className="block overflow-hidden">
                <motion.span
                  className="block text-gradient"
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: DURATION.reveal, delay: 0.34, ease: EASE.out }}
                >
                  before production.
                </motion.span>
              </span>
            </h1>

            {/* Subtitle */}
            <motion.p
              className="max-w-xl text-[var(--text-2)] text-base sm:text-lg leading-relaxed"
              initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: DURATION.slow, delay: 0.5, ease: EASE.out }}
            >
              An engineering control center for understanding application readiness, rate limits,
              bounded-load behavior, and system performance under real-world traffic envelopes.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-wrap items-center gap-4 pt-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.slow, delay: 0.62, ease: EASE.out }}
            >
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={onGoToDashboard}
                  className="btn-primary flex items-center gap-2"
                >
                  Open Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="button" onClick={onSignUp} className="btn-primary flex items-center gap-2">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {isLoggedIn ? null : (
                <button type="button" onClick={onSignIn} className="btn-secondary">
                  Sign In
                </button>
              )}
              <a
                href="#pipeline"
                className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors px-2 py-2"
              >
                <Activity className="w-4 h-4" style={{ color: "var(--accent-2)" }} />
                See the pipeline
              </a>
            </motion.div>

            {/* Trust row */}
            <motion.div
              className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 font-mono text-[11px] uppercase tracking-wider text-[var(--text-3)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: DURATION.slow, delay: 0.8 }}
            >
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: "var(--success)" }} /> SSRF-guarded targets
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" style={{ color: "var(--warning)" }} /> Bounded load envelopes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" style={{ color: "var(--accent-2)" }} /> Deterministic scoring
              </span>
            </motion.div>
          </div>

          {/* ============ Right column: 3D readiness visual (lazy, CSS fallback) ============ */}
          <motion.div
            className="min-w-0"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: DURATION.slow, delay: 0.35, ease: EASE.out }}
          >
            <HeroVisual />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
