import React from "react";

type BrandLogoProps = {
  compact?: boolean;
  onClick?: () => void;
};

export function BrandLogo({ compact = false, onClick }: BrandLogoProps) {
  return (
    <div
      onClick={onClick}
      className="inline-flex items-center gap-3 cursor-pointer select-none group"
      aria-label="ProofScale home"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.();
        }
      }}
    >
      {/* Shield Mark on Indigo -> Teal gradient chip */}
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5B5FEF] via-[#4D51E8] to-[#2FD4A6] p-[1px] shadow-[0_0_20px_rgba(91,95,239,0.3)] transition-transform duration-200 group-hover:scale-105">
        <div className="w-full h-full bg-[#0A0E16]/80 backdrop-blur-sm rounded-[11px] flex items-center justify-center text-[#2FD4A6]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
          >
            <path
              d="M12 2L4 5.5V11.5C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11.5V5.5L12 2Z"
              stroke="url(#shield_grad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="2.2" fill="#2FD4A6" />
            <defs>
              <linearGradient id="shield_grad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#5B5FEF" />
                <stop offset="1" stopColor="#2FD4A6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {!compact && (
        <div className="flex flex-col">
          <span className="font-display font-bold text-base tracking-tight text-[#F3F5FA] leading-none group-hover:text-white">
            ProofScale
          </span>
          <span className="font-mono text-[9px] font-medium tracking-wider text-[#8D96AC] uppercase mt-1 leading-none">
            READINESS INSTRUMENT
          </span>
        </div>
      )}
    </div>
  );
}
