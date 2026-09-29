import React from "react";

interface LoadingDotsProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const DOT_PX = { sm: 6, md: 8, lg: 12 } as const;

/**
 * Three-pulse loader. Self-contained (no external CSS dependency): the old
 * `.dots-container` / `.dot` classes were dropped in the token rewrite, which
 * rendered this component as invisible empty space.
 */
export function LoadingDots({
  size = "md",
  label,
  className = "",
}: LoadingDotsProps) {
  const px = DOT_PX[size];

  return (
    <div className={`flex flex-col items-center justify-center p-4 space-y-3 ${className}`}>
      <div
        className="flex items-center space-x-2"
        role="status"
        aria-label={label || "Loading"}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="rounded-full"
            style={{
              width: px,
              height: px,
              background: "var(--accent)",
              opacity: 0.85,
              animation: `loading-pulse 1.1s ease-in-out ${i * 0.18}s infinite`,
              boxShadow: "0 0 8px color-mix(in srgb, var(--accent) 45%, transparent)",
            }}
          />
        ))}
      </div>
      {label && (
        <span className="text-xs font-semibold text-[var(--text-2)] tracking-wide animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
}
