import React, { useEffect, useRef } from "react";

type PointWaveProps = {
  className?: string;
  tone?: "violet" | "ink";
};

export function PointWave({ className = "", tone = "violet" }: PointWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let running = true;
    let visible = true;
    let width = 0;
    let height = 0;
    let columns = 0;
    let rows = 0;
    let dpr = 1;
    const start = performance.now();

    const resize = () => {
      if (!canvas) return;
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(bounds.width, 1);
      height = Math.max(bounds.height, 1);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.max(20, Math.floor(width / 34));
      rows = Math.max(10, Math.floor(height / 34));
    };

    const draw = (now: number) => {
      if (!running || !visible) return;
      context.clearRect(0, 0, width, height);
      const elapsed = reduceMotion.matches ? 0 : (now - start) / 1000;
      const hue = tone === "ink" ? "18, 20, 42" : "105, 87, 232";

      for (let row = 0; row <= rows; row += 1) {
        for (let col = 0; col <= columns; col += 1) {
          const x = (col / columns) * width;
          const yBase = (row / rows) * height;
          const normalizedX = col / columns;
          const normalizedY = row / rows;
          const waveA = Math.sin(normalizedX * 10 - elapsed * 0.78 + normalizedY * 2.4);
          const waveB = Math.cos(normalizedY * 8 + elapsed * 0.45 + normalizedX * 3.2);
          const y = yBase + waveA * 7 + waveB * 3;
          const alpha = 0.04 + (1 - normalizedY) * 0.10 + Math.max(waveA, 0) * 0.035;
          const size = 0.7 + Math.max(waveB, 0) * 0.35;
          context.beginPath();
          context.fillStyle = `rgba(${hue}, ${alpha})`;
          context.arc(x, y, size, 0, Math.PI * 2);
          context.fill();
        }
      }
      frame = window.requestAnimationFrame(draw);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !frame) frame = window.requestAnimationFrame(draw);
      },
      { threshold: 0.01 }
    );

    const onMotionChange = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(draw);
    };

    resize();
    observer.observe(canvas);
    window.addEventListener("resize", resize, { passive: true });
    reduceMotion.addEventListener("change", onMotionChange);
    frame = window.requestAnimationFrame(draw);

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      reduceMotion.removeEventListener("change", onMotionChange);
    };
  }, [tone]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`point-wave ${className}`} />;
}
}
