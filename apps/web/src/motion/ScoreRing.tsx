import React, { useEffect, useState } from "react";
import { motion, useReducedMotion as useFramerReducedMotion } from "framer-motion";

export function scoreTone(score: number): "ready" | "cond" | "needs" | "notready" {
  if (score >= 90) return "ready";
  if (score >= 75) return "cond";
  if (score >= 50) return "needs";
  return "notready";
}

const TONE_COLOR: Record<string, string> = {
  ready: "var(--success)",
  cond: "var(--warning)",
  needs: "var(--warning)",
  notready: "var(--danger)",
};

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showGlow?: boolean;
}

/**
 * Readiness score ring: animated arc draw + count-up + glow.
 * Native to the glass style — gradient stroke with a soft outer glow.
 */
export function ScoreRing({
  score,
  size = 148,
  strokeWidth = 11,
  label = "Readiness",
  showGlow = true,
}: ScoreRingProps) {
  const reduced = useFramerReducedMotion();
  const [shown, setShown] = useState(reduced ? score : 0);

  const clamped = Math.max(0, Math.min(100, score));
  const r = (size - strokeWidth) / 2 - 2;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(clamped);
  const color = TONE_COLOR[tone];

  useEffect(() => {
    if (reduced) {
      setShown(clamped);
      return;
    }
    const start = performance.now();
    const dur = 900;
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(clamped * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clamped, reduced]);

  const gradientId = React.useId().replace(/:/g, "");

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {showGlow && !reduced && (
        <div
          aria-hidden
          className="absolute inset-2 rounded-full"
          style={{ boxShadow: `0 0 44px -6px ${color}`, opacity: 0.35 }}
        />
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${clamped} of 100`}>
        <defs>
          <linearGradient id={`ring-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#ring-${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduced ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * shown) / 100 }}
          transition={reduced ? { duration: 0 } : { duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: showGlow && !reduced ? `drop-shadow(0 0 6px ${color})` : undefined }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-bold tabular-nums" style={{ fontSize: size * 0.26, color: "var(--text-1)" }}>
          {Math.round(shown)}
        </span>
        <span className="font-mono uppercase tracking-widest" style={{ fontSize: size * 0.065, color: "var(--text-3)" }}>
          {label}
        </span>
      </div>
    </div>
  );
}
