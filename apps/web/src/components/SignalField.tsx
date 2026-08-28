import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointMaterial } from "@react-three/drei";
import * as THREE from "three";

/* =========================================================================
   SignalField — the "Signal Field" upgraded to a real 3D point cloud.
   Three depth layers drift at different speeds for true parallax; the camera
   tilts a few degrees toward the cursor (instrument-panel, not a game); on
   marketing surfaces a cursor ripple pushes the near field aside.

   variant:
     "marketing"  -> full particle count, cursor ripple, ambient drift
     "dashboard"  -> ~30% particles, frozen ripple, near-zero drift (~15% texture)
     (anything else, incl. "auth") -> marketing treatment
   ========================================================================= */

type Variant = "marketing" | "dashboard" | "auth";

interface SignalFieldProps {
  variant?: Variant;
  className?: string;
}

interface LayerConfig {
  z: number;
  zJitter: number;
  count: number;
  size: number;
  opacity: number;
  color: string;
  spreadX: number;
  spreadY: number;
  drift: { xAmp: number; yAmp: number; xSpeed: number; ySpeed: number; phase: number };
  ripple: { radius: number; amp: number };
}

// Shared pointer state (window-level, so the canvas can stay pointer-events-none)
const sharedPointer = { x: 0, y: 0, active: false };
let pointerBound = false;

function bindPointer() {
  if (pointerBound) return;
  pointerBound = true;
  const onMove = (e: MouseEvent) => {
    sharedPointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    sharedPointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    sharedPointer.active = true;
  };
  const onLeave = () => {
    sharedPointer.active = false;
    sharedPointer.x = 0;
    sharedPointer.y = 0;
  };
  window.addEventListener("mousemove", onMove, { passive: true });
  document.addEventListener("mouseleave", onLeave, { passive: true });
}

function makePositions(config: LayerConfig): Float32Array {
  const arr = new Float32Array(config.count * 3);
  for (let i = 0; i < config.count; i++) {
    arr[i * 3] = (Math.random() - 0.5) * config.spreadX;
    arr[i * 3 + 1] = (Math.random() - 0.5) * config.spreadY;
    arr[i * 3 + 2] = config.z + (Math.random() - 0.5) * config.zJitter;
  }
  return arr;
}

function buildConfigs(variant: Variant, isMobile: boolean): LayerConfig[] {
  const scale = variant === "dashboard" ? 0.3 : isMobile ? 0.5 : 1;
  const near: LayerConfig = {
    z: -1.5,
    zJitter: 0.6,
    count: Math.round(240 * scale),
    size: variant === "dashboard" ? 0.07 : 0.085,
    opacity: variant === "dashboard" ? 0.15 : 0.8,
    color: "#A5A8FF",
    spreadX: 26,
    spreadY: 17,
    drift: { xAmp: 0.6, yAmp: 0.4, xSpeed: 0.11, ySpeed: 0.08, phase: 0 },
    ripple: { radius: 5.5, amp: 1.1 }
  };
  const mid: LayerConfig = {
    z: -6,
    zJitter: 1.2,
    count: Math.round(360 * scale),
    size: variant === "dashboard" ? 0.055 : 0.062,
    opacity: variant === "dashboard" ? 0.12 : 0.5,
    color: "#7C7F9E",
    spreadX: 36,
    spreadY: 23,
    drift: { xAmp: 0.34, yAmp: 0.24, xSpeed: 0.07, ySpeed: 0.05, phase: 2.1 },
    ripple: { radius: 6.5, amp: 0.5 }
  };
  const far: LayerConfig = {
    z: -12,
    zJitter: 2.2,
    count: Math.round(300 * scale),
    size: variant === "dashboard" ? 0.05 : 0.052,
    opacity: variant === "dashboard" ? 0.1 : 0.32,
    color: "#3E4255",
    spreadX: 48,
    spreadY: 30,
    drift: { xAmp: 0.18, yAmp: 0.14, xSpeed: 0.04, ySpeed: 0.03, phase: 4.4 },
    ripple: { radius: 7.5, amp: 0.22 }
  };
  return [near, mid, far];
}

function PointsLayer({
  config,
  rippleEnabled
}: {
  config: LayerConfig;
  rippleEnabled: boolean;
}) {
  const base = useMemo(() => makePositions(config), [config]);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(base), 3));
    return g;
  }, [base]);

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    const arr = (geometry.attributes.position.array as Float32Array);
    const dx = Math.sin(t * config.drift.xSpeed + config.drift.phase) * config.drift.xAmp;
    const dy = Math.cos(t * config.drift.ySpeed + config.drift.phase) * config.drift.yAmp;

    // Approximate mouse world position at z=0 (camera near origin, small tilt)
    let rx = 0;
    let ry = 0;
    if (rippleEnabled && sharedPointer.active) {
      const vFov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
      const dist = camera.position.z;
      const h = 2 * Math.tan(vFov / 2) * dist;
      const w = h * (camera as THREE.PerspectiveCamera).aspect;
      rx = sharedPointer.x * w * 0.5;
      ry = sharedPointer.y * h * 0.5;
    }

    const radius = config.ripple.radius;
    const radiusSq = radius * radius;
    const amp = config.ripple.amp;

    for (let i = 0; i < config.count; i++) {
      const ix = i * 3;
      const bx = base[ix];
      const by = base[ix + 1];
      let px = bx + dx;
      let py = by + dy;

      if (rippleEnabled && sharedPointer.active) {
        const rdx = bx - rx;
        const rdy = by - ry;
        const d2 = rdx * rdx + rdy * rdy;
        if (d2 < radiusSq) {
          const d = Math.sqrt(d2) || 1;
          const f = 1 - d / radius;
          const push = Math.sin(d * 0.09 - t * 4) * f * amp;
          px += (rdx / d) * push;
          py += (rdy / d) * push;
        }
      }

      arr[ix] = px;
      arr[ix + 1] = py;
      // z (ix + 2) is static
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <PointMaterial
        transparent
        color={config.color}
        size={config.size}
        sizeAttenuation
        depthWrite={false}
        opacity={config.opacity}
      />
    </points>
  );
}

function CameraRig({ tilt }: { tilt: number }) {
  const { camera } = useThree();
  useFrame(() => {
    const targetX = sharedPointer.active ? sharedPointer.x * tilt : 0;
    const targetY = sharedPointer.active ? sharedPointer.y * tilt * 0.7 : 0;
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.position.z = 10;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function FieldScene({ variant, isMobile }: { variant: Variant; isMobile: boolean }) {
  const configs = useMemo(() => buildConfigs(variant, isMobile), [variant, isMobile]);
  const rippleEnabled = variant !== "dashboard";

  return (
    <>
      {configs.map((cfg, i) => (
        <PointsLayer key={i} config={cfg} rippleEnabled={rippleEnabled} />
      ))}
      <CameraRig tilt={variant === "dashboard" ? 0.2 : 0.55} />
    </>
  );
}

export function SignalField({ variant = "marketing", className = "" }: SignalFieldProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    bindPointer();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onMq = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onMq);

    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize, { passive: true });

    const onVis = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);

    return () => {
      mq.removeEventListener("change", onMq);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Static gradient fallback under reduced motion — no canvas, no animation.
  if (reduceMotion) {
    return (
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-0 pointer-events-none ${className}`}
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(91,95,239,0.10), transparent 45%), radial-gradient(circle at 70% 70%, rgba(47,212,166,0.07), transparent 45%), #0A0E16"
        }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-0 pointer-events-none ${className}`}
      style={{ opacity: variant === "dashboard" ? 0.4 : 1 }}
    >
      <Canvas
        frameloop={hidden ? "demand" : "always"}
        camera={{ position: [0, 0, 10], fov: 55, near: 0.1, far: 60 }}
        dpr={[1, 1.75]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <FieldScene variant={variant} isMobile={isMobile} />
      </Canvas>
    </div>
  );
}

export { SignalField as PointWave, SignalField as PointWaveBackground };
export default SignalField;
