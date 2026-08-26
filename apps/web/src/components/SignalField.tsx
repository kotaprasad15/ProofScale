import React, { useEffect, useRef } from "react";

export function SignalField({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    let running = true;
    let width = 0;
    let height = 0;
    let columns = 0;
    let rows = 0;
    const spacing = 48;
    const mouse = { x: -1000, y: -1000, active: false };

    const resize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      columns = Math.ceil(width / spacing) + 1;
      rows = Math.ceil(height / spacing) + 1;
    };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const onMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave, { passive: true });
    resize();

    let step = 0;

    const draw = () => {
      if (!running) return;

      ctx.clearRect(0, 0, width, height);

      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= columns; c++) {
          const originX = c * spacing;
          const originY = r * spacing;

          // Ambient slow sine wave drift
          const ambient = Math.sin(c * 0.15 + step) * 2.5 + Math.cos(r * 0.15 + step * 0.8) * 2.5;

          let posX = originX;
          let posY = originY + ambient;
          let dotRadius = 1.2;
          let rVal = 255;
          let gVal = 255;
          let bVal = 255;
          let alpha = 0.08;

          // Cursor probe ripple ping within 200px
          if (mouse.active) {
            const dx = originX - mouse.x;
            const dy = originY - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 220) {
              const factor = (1 - dist / 220);
              const push = Math.sin(dist * 0.04 - step * 3) * factor * 10;
              posX += (dx / (dist || 1)) * push;
              posY += (dy / (dist || 1)) * push;

              dotRadius = 1.2 + factor * 2.2;
              alpha = 0.08 + factor * 0.45;

              // Color-shift toward signal-indigo (91, 95, 239) and signal-teal (47, 212, 166)
              rVal = Math.round(255 - factor * (255 - 91));
              gVal = Math.round(255 - factor * (255 - 150));
              bVal = Math.round(255 - factor * (255 - 239));
            }
          }

          ctx.beginPath();
          ctx.arc(posX, posY, dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rVal}, ${gVal}, ${bVal}, ${alpha})`;
          ctx.fill();
        }
      }

      if (!reduceMotion) {
        step += 0.018;
      }

      frame = window.requestAnimationFrame(draw);
    };

    frame = window.requestAnimationFrame(draw);

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 w-full h-full ${className}`}
    />
  );
}

export { SignalField as PointWave, SignalField as PointWaveBackground };
