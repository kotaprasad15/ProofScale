import React from "react";

export type ReadinessTone = "ready" | "cond" | "needs" | "notready";

/* Pill: 999px radius, dot + Plex Mono uppercase label, signal color at 12%
   background with full-opacity text/dot. One chip = one readiness state,
   always paired with text (never color alone). */
const PILL: Record<ReadinessTone, string> = {
  ready: "status-pill-ready",
  cond: "status-pill-cond",
  needs: "status-pill-cond",
  notready: "status-pill-notready"
};

export function StatusChip({ tone, label }: { tone: ReadinessTone; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[11px] font-medium uppercase tracking-wider border ${PILL[tone]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      <span>{label}</span>
    </span>
  );
}

/* Maps a readiness score (0-100) to a tone + label. */
export function readinessTone(score: number): { tone: ReadinessTone; label: string } {
  if (score >= 90) return { tone: "ready", label: "Ready" };
  if (score >= 75) return { tone: "cond", label: "Conditionally ready" };
  if (score >= 50) return { tone: "needs", label: "Needs investigation" };
  return { tone: "notready", label: "Not ready" };
}
