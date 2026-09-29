import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Reveal, DURATION, EASE } from "../../motion";
import { Section } from "./HomeSectionBase";

interface ClosingCTAProps {
  onSignUp?: () => void;
  onSignIn?: () => void;
  isLoggedIn?: boolean;
  onGoToDashboard?: () => void;
}

/**
 * Final CTA: a centered glass panel with a soft gradient glow behind it.
 * The headline animates on mount (`animate`, not `whileInView`) so it can
 * never get stuck invisible — the old masked-line pattern clipped the text
 * to zero visibility whenever the IntersectionObserver callback raced or
 * never fired for this below-the-fold section.
 */
export function ClosingCTA({ onSignUp, onSignIn, isLoggedIn, onGoToDashboard }: ClosingCTAProps) {
  return (
    <Section className="border-t">
      {/* Soft gradient glow behind the panel */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] max-w-[90vw] h-[320px] rounded-full blur-[110px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent) 20%, transparent), color-mix(in srgb, var(--accent-2) 10%, transparent) 55%, transparent 75%)",
          }}
        />

        <div
          className="relative glass rounded-3xl px-6 sm:px-12 py-12 sm:py-16 max-w-3xl mx-auto text-center"
          style={{ boxShadow: "var(--shadow-panel), var(--glow-accent)" }}
        >
          <h2 className="font-display font-bold text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-[var(--text-1)]">
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.slow, ease: EASE.out }}
            >
              Ship with evidence,
            </motion.span>
            <motion.span
              className="block text-gradient"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.slow, delay: 0.12, ease: EASE.out }}
            >
              not optimism.
            </motion.span>
          </h2>

          <motion.p
            className="mt-5 text-[var(--text-2)] max-w-xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.slow, delay: 0.22, ease: EASE.out }}
          >
            Register a target, define a bounded envelope, and get a deterministic readiness
            score backed by empirical telemetry — in minutes.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.slow, delay: 0.32, ease: EASE.out }}
          >
            {isLoggedIn ? (
              <button type="button" onClick={onGoToDashboard} className="btn-primary">
                Open Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={onSignUp} className="btn-primary">
                Create Free Account
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {!isLoggedIn && (
              <button type="button" onClick={onSignIn} className="btn-secondary">
                Sign In
              </button>
            )}
          </motion.div>
        </div>
      </div>
    </Section>
  );
}
