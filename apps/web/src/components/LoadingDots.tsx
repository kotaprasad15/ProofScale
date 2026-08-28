import React from "react";

interface LoadingDotsProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

export function LoadingDots({
  size = "md",
  label,
  className = ""
}: LoadingDotsProps) {
  const dotSizeClass = size === "sm" ? "dot-sm" : size === "lg" ? "dot-lg" : "";

  return (
    <div className={`flex flex-col items-center justify-center p-4 space-y-3 ${className}`}>
      <div className="dots-container" role="status" aria-label={label || "Loading"}>
        <div className={`dot ${dotSizeClass}`} />
        <div className={`dot ${dotSizeClass}`} />
        <div className={`dot ${dotSizeClass}`} />
      </div>
      {label && (
        <span className="text-xs font-semibold text-text-muted tracking-wide animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
}
