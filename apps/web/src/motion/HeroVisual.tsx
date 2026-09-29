import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion as useFramerReducedMotion, type TargetAndTransition } from "framer-motion";
import { Activity } from "lucide-react";
import { useIsTouchDevice } from "./useReducedMotion";
import { DURATION, EASE } from "./tokens";

const HeroScene3D = lazy(() => import("./HeroScene3D"));

/** Lightweight skeleton shown while the 3D chunk loads */
function SceneSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ minHeight: 320 }}>
      <div className="relative w-48 h-48">
        <div className="absolute inset-0 rounded-full skeleton opacity-60" />
        <div className="absolute inset-6 rounded-full skeleton opacity-40" />
      </div>
    </div>
  );
}

/** Pure CSS/SVG fallback — no WebGL, no three.js */
function FallbackVisual() {
  const reduced = useFramerReducedMotion();

  const float = (delay: number): TargetAndTransition | undefined =>
    reduced
      ? undefined
      : { y: [0, -8, 0], transition: { duration: 5.5, repeat: Infinity, ease: "easeInOut", delay } };

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square flex items-center justify-center" aria-hidden="true">
      {/* Glow */}
      <div
        className="absolute inset-8 rounded-full blur-[70px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%)",
        }}
      />

      {/* Score ring */}
      <motion.div animate={float(0)} className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-52 h-52">
          <svg viewBox="0 0 120 120" className="w-full h-full">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="6" />
            <motion.circle
              cx="60" cy="60" r="52" fill="none"
              stroke="var(--success)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 52}
              initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - 0.94) }}
              transition={{ duration: 1.6, ease: EASE.out, delay: 0.4 }}
              transform="rotate(-90 60 60)"
              style={{ filter: "drop-shadow(0 0 6px var(--success))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-4xl font-bold text-[var(--text-1)]">94</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-3)]">readiness</span>
          </div>
        </div>
      </motion.div>

      {/* Latency chart card */}
      <motion.div animate={float(0.8)} className="absolute -left-2 sm:left-0 bottom-6 glass p-4 w-44">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-3)]">p95 latency</span>
          <Activity className="w-3 h-3" style={{ color: "var(--accent-2)" }} />
        </div>
        <svg viewBox="0 0 140 44" className="w-full h-11">
          <motion.path
            d="M0 36 C14 34 20 30 32 28 C46 26 52 16 66 14 C80 12 88 20 102 18 C116 16 126 8 140 6"
            fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, delay: 0.7, ease: EASE.out }}
            style={{ filter: "drop-shadow(0 0 4px var(--accent-2))" }}
          />
        </svg>
        <div className="font-mono text-lg font-bold text-[var(--text-1)] mt-1">312 ms</div>
      </motion.div>

      {/* Run status chip */}
      <motion.div animate={float(1.6)} className="absolute right-0 top-8 glass px-4 py-3 flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: "var(--accent-2)" }} />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "var(--accent-2)" }} />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-2)]">Run · 25 VUs · live</span>
      </motion.div>
    </div>
  );
}

/**
 * Chooses the right hero visual:
 * - 3D scene on capable desktop browsers with a fine pointer
 * - CSS/SVG fallback on mobile, touch devices, reduced-motion, or no WebGL
 * - Intersection gate pauses the 3D render loop when scrolled away
 */
export function HeroVisual() {
  const reduced = useFramerReducedMotion();
  const isTouch = useIsTouchDevice();
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(true);
  const hostRef = useRef<HTMLDivElement>(null);

  // WebGL capability probe (cheap, once)
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      setWebglOk(
        !!(canvas.getContext("webgl2") || canvas.getContext("webgl"))
      );
    } catch {
      setWebglOk(false);
    }
  }, []);

  // Pause 3D rendering when the hero is offscreen
  useEffect(() => {
    if (!hostRef.current || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 }
    );
    io.observe(hostRef.current);
    return () => io.disconnect();
  }, []);

  const use3D = webglOk === true && !isTouch && !reduced;

  return (
    <div
      ref={hostRef}
      className="relative w-full"
      style={{ visibility: visible ? "visible" : "hidden" }}
      aria-hidden="true"
    >
      {use3D ? (
        <Suspense fallback={<SceneSkeleton />}>
          <div className="aspect-square w-full max-w-[560px] mx-auto">
            <HeroScene3D />
          </div>
        </Suspense>
      ) : (
        <FallbackVisual />
      )}
    </div>
  );
}
