import { useEffect, useRef } from "react";

type PointWaveProps = { className?: string };

/** Passive reference-inspired point landscape. It never consumes pointer events. */
export function PointWave({ className = "" }: PointWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId = 0;
    let width = 1;
    let height = 1;
    let columns = 48;
    let rows = 32;
    let visible = true;
    let pageVisible = !document.hidden;
    let origin = performance.now();

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(bounds.width, 1);
      height = Math.max(bounds.height, 1);
      const ratio = Math.min(window.devicePixelRatio || 1, width < 720 ? 1.25 : 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      columns = Math.max(28, Math.min(110, Math.round(width / (width < 720 ? 20 : 17))));
      rows = Math.max(22, Math.min(84, Math.round(height / (width < 720 ? 16 : 13))));
    };

    const draw = (now: number) => {
      frameId = 0;
      context.clearRect(0, 0, width, height);
      const elapsed = reducedMotion.matches ? 0 : (now - origin) / 1000;
      const horizon = height * 0.12;
      const planeHeight = height * 1.03;

      for (let row = 0; row <= rows; row += 1) {
        const rowRatio = row / rows;
        const depth = Math.pow(rowRatio, 0.62);
        const perspective = Math.pow(rowRatio, 2.46);
        const baseY = horizon + perspective * planeHeight;

        for (let column = 0; column <= columns; column += 1) {
          const columnRatio = column / columns;
          const worldX = (columnRatio - 0.5) * 2;
          const depthScale = 0.66 + depth * 0.34;
          const baseX = width * 0.5 + worldX * width * 0.5 * depthScale;
          const diagonalWave = Math.sin(worldX * 7.7 + rowRatio * 8.9 - elapsed * 0.86);
          const crossWave = Math.cos(worldX * 3.3 - rowRatio * 12.2 - elapsed * 0.54);
          const ridge = diagonalWave * 0.74 + crossWave * 0.26;
          const x = baseX + ridge * (0.35 + depth * 1.3);
          const y = baseY + ridge * (3 + depth * Math.min(25, height * 0.038));
          const alpha = Math.min(0.09 + depth * 0.68 + Math.max(ridge, 0) * 0.12, 0.94);
          const radius = 0.52 + depth * 0.86 + Math.max(ridge, 0) * 0.12;
          context.beginPath();
          context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.fill();
        }
      }
    };

    const pause = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
    };
    const loop = (now: number) => {
      draw(now);
      if (visible && pageVisible && !reducedMotion.matches) frameId = window.requestAnimationFrame(loop);
    };
    const requestLoop = () => {
      if (!frameId && visible && pageVisible && !reducedMotion.matches) frameId = window.requestAnimationFrame(loop);
    };
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) requestLoop(); else pause();
    }, { threshold: 0.01 });
    const resizeObserver = new ResizeObserver(() => { resize(); draw(performance.now()); });
    const handleVisibility = () => { pageVisible = !document.hidden; if (pageVisible) requestLoop(); else pause(); };
    const handleMotion = () => { pause(); origin = performance.now(); draw(origin); requestLoop(); };

    resize();
    draw(origin);
    intersectionObserver.observe(canvas);
    resizeObserver.observe(canvas);
    document.addEventListener("visibilitychange", handleVisibility);
    reducedMotion.addEventListener("change", handleMotion);
    requestLoop();

    return () => {
      pause();
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotion.removeEventListener("change", handleMotion);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={`ps-point-wave ${className}`} />;
}
