import React from "react";
import { motion, useReducedMotion as useFramerReducedMotion } from "framer-motion";

/**
 * "Test running" live indicator: pulsing radial waves + animated load curve
 * in a glass chip. Reduced motion: static dot + text.
 */
export function RunPulse({ label = "Load test executing" }: { label?: string }) {
  const reduced = useFramerReducedMotion();

  if (reduced) {
    return (
      <div className="inline-flex items-center gap-2" role="status" aria-live="polite">
        <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent-2)" }} />
        <span className="font-mono text-xs text-[var(--text-2)]">{label}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-3" role="status" aria-live="polite">
      <span className="relative flex h-5 w-5 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ border: "1.5px solid var(--accent-2)" }}
          animate={{ scale: [1, 1.9], opacity: [0.8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ border: "1.5px solid var(--accent-2)" }}
          animate={{ scale: [1, 1.9], opacity: [0.8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
        />
        <span
          className="relative w-2 h-2 rounded-full"
          style={{ background: "var(--accent-2)", boxShadow: "0 0 10px var(--accent-2)" }}
        />
      </span>

      {/* Animated load curve */}
      <svg width="72" height="20" viewBox="0 0 72 20" aria-hidden="true" className="overflow-visible">
        <motion.path
          d="M0 16 C8 16 10 15 16 14 C22 13 24 9 30 8 C36 7 38 10 44 9 C50 8 54 4 60 3 C64 2.4 68 2.2 72 2"
          fill="none"
          stroke="var(--accent-2)"
          strokeWidth="1.8"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 3px var(--accent-2))" }}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <motion.path
          d="M0 16 C8 16 10 15 16 14 C22 13 24 9 30 8 C36 7 38 10 44 9 C50 8 54 4 60 3 C64 2.4 68 2.2 72 2"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="6 66"
          animate={{ strokeDashoffset: [0, -72] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
      </svg>

      <span className="font-mono text-xs text-[var(--text-2)]">{label}</span>
    </div>
  );
}
