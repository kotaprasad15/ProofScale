import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion as useFramerReducedMotion } from "framer-motion";
import { DURATION, EASE } from "./tokens";

const SPLASH_KEY = "rc_splash_seen";
const SPLASH_MS = 1400;

function BrandMark() {
  return (
    <svg viewBox="0 0 48 48" className="w-14 h-14" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="splash-g" x1="0" y1="0" x2="48" y2="48">
          <stop stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <motion.path
        d="M24 4 L7 11 V24 C7 34.5 14.5 42.5 24 45 C33.5 42.5 41 34.5 41 24 V11 L24 4 Z"
        stroke="url(#splash-g)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: EASE.out }}
      />
      <motion.path
        d="M16 25.5 L21.5 31 L33 17.5"
        stroke="url(#splash-g)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, delay: 0.55, ease: EASE.out }}
      />
    </svg>
  );
}

/**
 * Branded intro splash — first visit per session only, <1.5s, skippable
 * (click, key, or scroll). Never shown under reduced motion.
 */
export function Splash() {
  const reduced = useFramerReducedMotion();
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(SPLASH_KEY);
  });

  useEffect(() => {
    if (!show || reduced) {
      if (show) sessionStorage.setItem(SPLASH_KEY, "1");
      return;
    }
    sessionStorage.setItem(SPLASH_KEY, "1");
    const t = setTimeout(() => setShow(false), SPLASH_MS);

    const skip = () => setShow(false);
    window.addEventListener("keydown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
    };
  }, [show, reduced]);

  return (
    <AnimatePresence>
      {show && !reduced && (
        <motion.div
          className="splash-root"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(10px)", transition: { duration: 0.45, ease: EASE.out } }}
          onClick={() => setShow(false)}
          role="presentation"
        >
          <div className="flex flex-col items-center gap-5">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 22 }}
            >
              <BrandMark />
            </motion.div>
            <motion.div
              className="font-display font-bold text-2xl tracking-[0.3em] text-gradient"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.base, delay: 0.3, ease: EASE.out }}
            >
              RATECAP
            </motion.div>
            <motion.div
              className="h-px w-40 overflow-hidden"
              style={{ background: "var(--border)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="h-full"
                style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: SPLASH_MS / 1000 - 0.2, ease: "easeInOut" }}
              />
            </motion.div>
            <motion.button
              className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={(e) => {
                e.stopPropagation();
                setShow(false);
              }}
            >
              Skip
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


