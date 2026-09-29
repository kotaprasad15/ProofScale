import React from "react";

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div aria-hidden className={`skeleton ${className ?? ""}`} style={style} />;
}

/** Round skeleton block (avatars, chips) */
export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <div aria-hidden className="skeleton rounded-full" style={{ width: size, height: size }} />;
}

/**
 * Accessible loading placeholder for data views.
 * Screen readers announce the label; sighted users get glass shimmer blocks.
 */
export function SkeletonPanel({
  rows = 3,
  label = "Loading…",
  className,
}: {
  rows?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`glass-panel p-6 space-y-4 ${className ?? ""}`}
    >
      <span className="sr-only">{label}</span>
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" style={{ opacity: 1 - i * 0.18 }} />
      ))}
    </div>
  );
}

/** Dashboard-style metric card skeleton */
export function SkeletonMetricCard() {
  return (
    <div className="glass-panel p-5 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}
