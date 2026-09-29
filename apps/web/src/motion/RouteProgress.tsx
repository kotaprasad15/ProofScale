import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Slim top-of-viewport gradient progress bar shown during route changes.
 * Simulated: eases to ~85% while loading, completes on finish.
 */
export function RouteProgress({ active }: { active: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      // asymptotic approach to 85%
      setProgress(Math.min(85, 85 * (1 - Math.exp(-3 * t))));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[2147482000] h-[3px] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          role="progressbar"
          aria-label="Loading page"
        >
          <div
            className="h-full transition-[width] duration-200 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--accent), var(--accent-2), var(--mint))",
              boxShadow: "0 0 12px rgba(139,124,255,0.7)",
              borderRadius: "0 2px 2px 0",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
