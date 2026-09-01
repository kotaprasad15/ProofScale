import React from "react";

type EyebrowColor = "indigo" | "teal" | "amber" | "rose";

const COLORS: Record<EyebrowColor, string> = {
  indigo: "text-brand bg-brand-soft border-brand-soft",
  teal: "text-signal-teal bg-signal-teal-soft border-signal-teal/20",
  amber: "text-signal-amber bg-signal-amber-soft border-signal-amber/25",
  rose: "text-signal-rose bg-signal-rose-soft border-signal-rose/25"
};

/* Skewed section eyebrow / tag. The -3deg skew is a seasoning, never a layout. */
export function Eyebrow({
  children,
  color = "indigo",
  dot = true,
  className = ""
}: {
  children: React.ReactNode;
  color?: EyebrowColor;
  dot?: boolean;
  className?: string;
}) {
  return (
    <div className={`skew-tag ${className}`}>
      <span
        className={`type-eyebrow inline-flex items-center gap-2 px-3 py-1 rounded-full border ${COLORS[color]}`}
      >
        {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
        {children}
      </span>
    </div>
  );
}
