import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useIsTouchDevice } from "./useReducedMotion";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  /** Enable 3D tilt following the pointer (hero/feature cards) */
  tilt?: boolean;
  tiltMax?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
  ariaLabel?: string;
  role?: string;
}

/**
 * Glass card with a radial spotlight that follows the cursor across the
 * surface, plus optional subtle 3D tilt. Spotlight/tilt are pointer-only.
 */
export function SpotlightCard({
  children,
  className = "",
  tilt = false,
  tiltMax = 4,
  onClick,
  style,
  ariaLabel,
  role,
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isTouch = useIsTouchDevice();
  const [hovering, setHovering] = useState(false);

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 22 });
  const sry = useSpring(ry, { stiffness: 200, damping: 22 });

  const rotateX = useTransform(srx, (v) => (tilt && !isTouch ? v : 0));
  const rotateY = useTransform(sry, (v) => (tilt && !isTouch ? v : 0));

  const handleMove = (e: React.MouseEvent) => {
    if (isTouch || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    // Spotlight position via CSS vars (consumed by .spotlight-host::before)
    ref.current.style.setProperty("--spot-x", `${px * 100}%`);
    ref.current.style.setProperty("--spot-y", `${py * 100}%`);

    if (tilt) {
      ry.set((px - 0.5) * tiltMax * 2);
      rx.set(-(py - 0.5) * tiltMax * 2);
    }
  };

  const reset = () => {
    setHovering(false);
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      role={role}
      aria-label={ariaLabel}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      onMouseMove={handleMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={reset}
      onClick={onClick}
      style={{
        rotateX: tilt ? rotateX : undefined,
        rotateY: tilt ? rotateY : undefined,
        transformPerspective: tilt ? 900 : undefined,
        transformStyle: "preserve-3d",
        boxShadow: hovering && tilt ? "var(--shadow-panel), var(--glow-accent)" : undefined,
        ...style,
      }}
      className={`glass spotlight-host glass-hover ${className}`}
    >
      {children}
    </motion.div>
  );
}
