import React, { useCallback, useRef } from "react";

/* Card-level 3D tilt — marketing + role-pathway surfaces only.
   Pointer position drives rotateX/rotateY (up to maxTilt degrees) via CSS vars.
   Never used on dashboard cards (hover there is border-glow + lift only). */

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  onClick?: () => void;
}

export function TiltCard({ children, className = "", maxTilt = 6, onClick }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const ry = (px - 0.5) * 2 * maxTilt;
      const rx = (0.5 - py) * 2 * maxTilt;
      el.style.setProperty("--tilt-rx", `${rx.toFixed(2)}deg`);
      el.style.setProperty("--tilt-ry", `${ry.toFixed(2)}deg`);
    },
    [maxTilt]
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-rx", "0deg");
    el.style.setProperty("--tilt-ry", "0deg");
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`tilt-card ${className}`}
    >
      {children}
    </div>
  );
}
