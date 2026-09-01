import React from "react";

const PHRASES = [
  "DETERMINISTIC SCORING",
  "SANDBOXED EXECUTION",
  "SSRF GUARDED",
  "BOUNDED LOAD",
  "SLA VERIFIED",
  "ATOMIC LEASE WORKERS",
  "TOKEN-HASHED REPORTS"
];

interface MarqueeProps {
  className?: string;
  speedClass?: string;
}

export function Marquee({ className = "" }: MarqueeProps) {
  return (
    <div className={`marquee-container py-5 border-y border-[var(--border)] bg-[var(--color-surface)]/40 select-none ${className}`}>
      <div className="marquee-track flex items-center">
        {/* Double the list for seamless infinite loop */}
        {[...PHRASES, ...PHRASES, ...PHRASES, ...PHRASES].map((phrase, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-6 px-6 font-mono text-xs sm:text-sm font-medium tracking-widest text-text-muted hover:text-text-primary transition-colors"
          >
            <span>{phrase}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-signal-indigo opacity-60" />
          </span>
        ))}
      </div>
    </div>
  );
}
