import React, { useId, useLayoutEffect, useEffect, useRef } from "react";
import { gsap } from "gsap";
import "./TextLoop.css";

export interface TextLoopProps {
  text: string;
  shape?: "wave" | "circle" | "infinity" | "arch" | "line";
  curviness?: number;
  speed?: number;
  separator?: string;
  fontSize?: number;
  fontWeight?: number | string;
  letterSpacing?: number;
  uppercase?: boolean;
  color?: string;
  ribbon?: boolean;
  ribbonColor?: string;
  pauseOnHover?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const TextLoop: React.FC<TextLoopProps> = ({
  text,
  shape = "wave",
  curviness = 35,
  speed = 70,
  separator = "—",
  fontSize = 26,
  fontWeight = 700,
  letterSpacing = 2,
  uppercase = true,
  color = "var(--text-primary)",
  ribbon = false,
  ribbonColor,
  pauseOnHover = true,
  className = "",
  style
}) => {
  const generatedId = useId();
  const pathId = `text-loop-path-${generatedId.replace(/:/g, "")}`;
  const textPathRef = useRef<SVGTextPathElement | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  const cleanText = uppercase ? text.toUpperCase() : text;
  const unitText = `${cleanText} ${separator} `;
  // 10 units guarantee continuous seamless coverage across the 1200px SVG path
  const REPEAT_COUNT = 10;
  const fullContent = Array(REPEAT_COUNT).fill(unitText).join("");

  // Build the wave path across the 1200x520 viewBox
  const amp = curviness;
  let pathD = "";

  if (shape === "line") {
    pathD = "M -400 260 L 2200 260";
  } else if (shape === "arch") {
    pathD = `M -400 ${260 + amp * 2} Q 600 ${260 - amp * 3} 2000 ${260 + amp * 2}`;
  } else {
    // Default: smooth sinusoidal wave
    pathD = `
      M -400 260
      C -250 ${260 - amp * 2}, -50 ${260 + amp * 2}, 100 260
      C 250 ${260 - amp * 2}, 450 ${260 + amp * 2}, 600 260
      C 750 ${260 - amp * 2}, 950 ${260 + amp * 2}, 1100 260
      C 1250 ${260 - amp * 2}, 1450 ${260 + amp * 2}, 1600 260
      C 1750 ${260 - amp * 2}, 1950 ${260 + amp * 2}, 2100 260
    `.trim();
  }

  const useIsomorphicEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

  useIsomorphicEffect(() => {
    const textPathEl = textPathRef.current;
    if (!textPathEl) return;

    let computedTotal = 0;
    try {
      computedTotal = textPathEl.getComputedTextLength();
    } catch {
      computedTotal = 0;
    }

    // Fallback measurement if offscreen or hidden
    const unitLength = computedTotal > 0 ? computedTotal / REPEAT_COUNT : 900;
    const duration = Math.max(unitLength / Math.max(speed, 1), 2);

    const ctx = gsap.context(() => {
      const tween = gsap.fromTo(
        textPathEl,
        { attr: { startOffset: 0 } },
        {
          attr: { startOffset: -unitLength },
          duration,
          ease: "none",
          repeat: -1
        }
      );
      tweenRef.current = tween;

      // Handle prefers-reduced-motion
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (prefersReducedMotion.matches) {
        tween.pause();
      }

      const handleMotionChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          tween.pause();
        } else {
          tween.play();
        }
      };

      prefersReducedMotion.addEventListener("change", handleMotionChange);
      return () => {
        prefersReducedMotion.removeEventListener("change", handleMotionChange);
      };
    });

    return () => {
      ctx.revert();
      tweenRef.current = null;
    };
  }, [text, shape, curviness, speed, separator, fontSize, letterSpacing, uppercase]);

  const handleMouseEnter = () => {
    if (pauseOnHover && tweenRef.current) {
      tweenRef.current.pause();
    }
  };

  const handleMouseLeave = () => {
    if (pauseOnHover && tweenRef.current) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!prefersReducedMotion) {
        tweenRef.current.play();
      }
    }
  };

  return (
    <div
      className={`text-loop-container ${className}`.trim()}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <svg
        className="text-loop-svg"
        viewBox="0 0 1200 520"
        preserveAspectRatio="xMidYMid meet"
        aria-label={text}
        role="region"
      >
        <defs>
          <path id={pathId} d={pathD} fill="none" />
        </defs>

        {ribbon && (
          <path
            d={pathD}
            fill="none"
            stroke={ribbonColor || "rgba(255, 255, 255, 0.08)"}
            strokeWidth={fontSize * 2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        <text
          fill={color}
          fontSize={fontSize}
          fontWeight={fontWeight}
          letterSpacing={letterSpacing}
          style={{
            fontFamily: "'Space Grotesk', 'Inter', sans-serif"
          }}
        >
          <textPath
            ref={textPathRef}
            href={`#${pathId}`}
            startOffset={0}
          >
            {fullContent}
          </textPath>
        </text>
      </svg>
    </div>
  );
};

export default TextLoop;
