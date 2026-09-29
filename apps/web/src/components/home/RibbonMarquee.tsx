import React from "react";
import { useReducedMotion } from "../../motion/useReducedMotion";

const ITEMS = [
  "Bounded load",
  "Deterministic scoring",
  "SSRF guardrails",
  "Live telemetry",
  "p95 budgets",
  "Kill switch",
  "Baselines & diffs",
  "Dual-scope RBAC",
];

function ItemList() {
  return (
    <>
      {ITEMS.map((item, i) => (
        <span key={i} className="marquee-item font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-2)]">
          <span
            className="w-1 h-1 rounded-full shrink-0"
            style={{ background: i % 2 === 0 ? "var(--accent)" : "var(--accent-2)" }}
          />
          {item}
        </span>
      ))}
    </>
  );
}

function Tape({ reverse = false }: { reverse?: boolean }) {
  return (
    <div
      className={`marquee glass-subtle py-3 ${reverse ? "marquee--reverse" : ""}`}
      style={{ borderRadius: 0 }}
    >
      <div className="marquee-track" style={{ ["--marquee-duration" as string]: reverse ? "44s" : "36s" }}>
        {/* Exactly two identical copies inside ONE track — the -50% keyframe jump is seamless */}
        <div className="marquee-track__copy" aria-hidden="true">
          <ItemList />
        </div>
        <div className="marquee-track__copy">
          <ItemList />
        </div>
      </div>
    </div>
  );
}

/**
 * Dual marquee tape strips: full-viewport-width, single row each, infinite
 * linear scroll. The second row drifts in the opposite direction for depth.
 * Under prefers-reduced-motion the CSS layer swaps the animation for a
 * static, user-scrollable row.
 */
export function RibbonMarquee() {
  const reduced = useReducedMotion();

  return (
    <div className="relative z-10 py-6 space-y-3" aria-hidden={reduced ? undefined : "true"}>
      <Tape />
      <Tape reverse />
    </div>
  );
}
