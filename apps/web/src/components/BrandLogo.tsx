import React from "react";

type BrandLogoProps = {
  compact?: boolean;
  onClick?: () => void;
};

export function BrandLogo({ compact = false, onClick }: BrandLogoProps) {
  return (
    <div
      onClick={onClick}
      className="brand-logo cursor-pointer select-none"
      aria-label="ProofScale home"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.();
        }
      }}
    >
      <div className="brand-mark">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-white"
        >
          <path
            d="M12 2L4 5.5V11.5C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11.5V5.5L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      </div>
      {!compact && (
        <span className="brand-copy">
          <strong>ProofScale</strong>
          <small>READINESS &amp; SAFETY</small>
        </span>
      )}
    </div>
  );
}
