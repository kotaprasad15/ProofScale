import React from "react";
import "./RibbonMarquee.css";

const DEFAULT_PHRASES_1 = [
  "DETERMINISTIC SCORING",
  "SANDBOXED EXECUTION",
  "SSRF GUARDED",
  "BOUNDED LOAD",
  "SLA VERIFIED",
  "PROOF OF READINESS",
  "SPEC v1.4 HARD CAPS",
  "TOKEN-HASHED AUDIT"
];

const DEFAULT_PHRASES_2 = [
  "DUAL-SCOPE RBAC",
  "ATOMIC LEASE WORKERS",
  "AES-GCM ENCRYPTED",
  "EMPIRICAL TELEMETRY",
  "LATENCY BUDGET VERIFIED",
  "TAMPER-PROOF REPORTS",
  "CIRCUIT BREAKER ACTIVATED",
  "SINGLE-USE AUDIT TOKENS"
];

interface RibbonMarqueeProps {
  className?: string;
  phrasesTop?: string[];
  phrasesBottom?: string[];
}

export const RibbonMarquee: React.FC<RibbonMarqueeProps> = ({
  className = "",
  phrasesTop = DEFAULT_PHRASES_1,
  phrasesBottom = DEFAULT_PHRASES_2
}) => {
  return (
    <div
      className={`ribbon-marquee-container ${className}`.trim()}
      aria-hidden="true"
    >
      {/* Ribbon 1: Angled downwards (-2.8deg), scrolling left */}
      <div className="ribbon-strip ribbon-strip-1 py-2 sm:py-2.5">
        <div className="ribbon-track-left">
          {/* First set */}
          <div className="flex items-center shrink-0">
            {phrasesTop.map((phrase, idx) => (
              <span
                key={`r1-a-${idx}`}
                className="inline-flex items-center gap-4 sm:gap-6 px-4 sm:px-6 font-raleway font-black text-xs sm:text-sm tracking-[0.2em] text-white uppercase"
              >
                <span>{phrase}</span>
                <span className="w-2 h-2 rounded-full bg-white/90 shadow-sm" />
              </span>
            ))}
          </div>
          {/* Duplicate set for seamless infinite loop */}
          <div className="flex items-center shrink-0" aria-hidden="true">
            {phrasesTop.map((phrase, idx) => (
              <span
                key={`r1-b-${idx}`}
                className="inline-flex items-center gap-4 sm:gap-6 px-4 sm:px-6 font-raleway font-black text-xs sm:text-sm tracking-[0.2em] text-white uppercase"
              >
                <span>{phrase}</span>
                <span className="w-2 h-2 rounded-full bg-white/90 shadow-sm" />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Ribbon 2: Angled upwards (+2.8deg), crossing over Ribbon 1, scrolling right */}
      <div className="ribbon-strip ribbon-strip-2 py-2 sm:py-2.5">
        <div className="ribbon-track-right">
          {/* First set */}
          <div className="flex items-center shrink-0">
            {phrasesBottom.map((phrase, idx) => (
              <span
                key={`r2-a-${idx}`}
                className="inline-flex items-center gap-4 sm:gap-6 px-4 sm:px-6 font-raleway font-black text-xs sm:text-sm tracking-[0.2em] text-white uppercase"
              >
                <span>{phrase}</span>
                <span className="w-2 h-2 rounded-full bg-white/90 shadow-sm" />
              </span>
            ))}
          </div>
          {/* Duplicate set for seamless infinite loop */}
          <div className="flex items-center shrink-0" aria-hidden="true">
            {phrasesBottom.map((phrase, idx) => (
              <span
                key={`r2-b-${idx}`}
                className="inline-flex items-center gap-4 sm:gap-6 px-4 sm:px-6 font-raleway font-black text-xs sm:text-sm tracking-[0.2em] text-white uppercase"
              >
                <span>{phrase}</span>
                <span className="w-2 h-2 rounded-full bg-white/90 shadow-sm" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RibbonMarquee;
