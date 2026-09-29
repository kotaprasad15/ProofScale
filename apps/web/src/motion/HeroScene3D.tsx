import React, { useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";

const ACCENT = "#8b7cff";
const CYAN = "#22d3ee";
const MINT = "#34f5c5";

/** Request particles orbiting the core on tilted rings */
function ParticleOrbits({ count = 90 }: { count?: number }) {
  const group = useRef<Group>(null);

  const particles = useMemo(() => {
    const arr: Array<{ pos: [number, number, number]; color: string; scale: number }> = [];
    const rings = [2.35, 2.85, 3.35];
    for (let i = 0; i < count; i++) {
      const ring = rings[i % rings.length];
      const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.6;
      const y = Math.sin(angle * 2 + i) * 0.28;
      arr.push({
        pos: [Math.cos(angle) * ring, y, Math.sin(angle) * ring],
        color: i % 5 === 0 ? MINT : i % 2 === 0 ? CYAN : ACCENT,
        scale: 0.035 + (i % 4) * 0.012,
      });
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = t * 0.18;
    // Individual ring tilt wobble
    group.current.children.forEach((child, i: number) => {
      child.rotation.z = Math.sin(t * 0.25 + i) * 0.12;
    });
  });

  return (
    <group ref={group}>
      {particles.map((p, i) => (
        <mesh key={i} position={p.pos} scale={p.scale}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color={p.color} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** The frosted-glass core: an icosahedron shell + inner glowing heart */
function GlassCore() {
  const shell = useRef<Mesh>(null);
  const heart = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (shell.current) {
      shell.current.rotation.y = t * 0.12;
      shell.current.rotation.x = Math.sin(t * 0.18) * 0.1;
    }
    if (heart.current) {
      const s = 1 + Math.sin(t * 1.6) * 0.06;
      heart.current.scale.set(s, s, s);
      heart.current.rotation.y = -t * 0.3;
    }
  });

  return (
    <group>
      {/* Frosted shell */}
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.7, 1]} />
        <meshPhysicalMaterial
          color={ACCENT}
          transparent
          opacity={0.16}
          roughness={0.25}
          metalness={0.1}
          transmission={0.55}
          thickness={1.2}
          clearcoat={0.6}
        />
      </mesh>
      {/* Wireframe lattice over the shell */}
      <mesh scale={1.002}>
        <icosahedronGeometry args={[1.7, 1]} />
        <meshBasicMaterial color={CYAN} wireframe transparent opacity={0.22} />
      </mesh>
      {/* Inner glowing heart */}
      <mesh ref={heart}>
        <icosahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={1.4}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

/** Glowing readiness ring around the core, sweeps like a gauge */
function ScoreRing3D() {
  const ring = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ring.current) ring.current.rotation.z = t * 0.45;
    if (halo.current) halo.current.rotation.z = -t * 0.2;
  });

  return (
    <group rotation={[Math.PI / 2.4, 0, 0]}>
      <mesh ref={ring}>
        <torusGeometry args={[2.6, 0.035, 12, 96, Math.PI * 1.5]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.9} />
      </mesh>
      <mesh ref={halo}>
        <torusGeometry args={[2.6, 0.012, 8, 96]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/**
 * Cursor state shared from the scene host down into the R3F tree.
 * Normalized to the host element (NOT the viewport): x, y ∈ [-1, 1] with
 * (0, 0) at the element's center, so the model only responds while the
 * cursor is actually over the 3D design.
 */
const cursorState = { x: 0, y: 0 };

/** Rotation limits — the model never flips backward past these. */
const MAX_YAW = Math.PI / 12; // ±15° around local Y
const MAX_PITCH = Math.PI / 12; // ±15° around local X
const LERP = 0.05; // per-frame easing factor

/**
 * Maps the cursor's normalized position over the scene host onto the model's
 * local rotation: X → yaw (Y-axis), Y → pitch (X-axis). Rotation eases toward
 * the target each frame with a 0.05 lerp and is hard-clamped to ±15°. When the
 * cursor leaves the host, the target eases back to center.
 */
function CursorTrackingGroup({ children }: { children: React.ReactNode }) {
  const group = useRef<Group>(null);

  useFrame(() => {
    if (!group.current) return;
    const targetYaw = cursorState.x * MAX_YAW;
    const targetPitch = cursorState.y * MAX_PITCH;
    group.current.rotation.y += (targetYaw - group.current.rotation.y) * LERP;
    group.current.rotation.x += (targetPitch - group.current.rotation.x) * LERP;
  });

  return <group ref={group}>{children}</group>;
}

/**
 * Full RateCap hero scene. The model tracks the cursor only while it is over
 * the scene's own box, easing back to center on leave. Pixel ratio is capped
 * to protect GPUs on high-DPI displays.
 */
export default function HeroScene3D() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const move = (e: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      cursorState.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      cursorState.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1); // screen Y down → NDC Y up
    };
    const leave = () => {
      cursorState.x = 0;
      cursorState.y = 0;
    };

    host.addEventListener("mousemove", move);
    host.addEventListener("mouseleave", leave);
    return () => {
      host.removeEventListener("mousemove", move);
      host.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <div ref={hostRef} className="w-full h-full" style={{ minHeight: 320 }}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.4, 6.2], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.55} />
        <pointLight position={[4, 4, 5]} intensity={40} color={CYAN} />
        <pointLight position={[-4, -2, 3]} intensity={26} color={ACCENT} />
        <CursorTrackingGroup>
          <GlassCore />
          <ParticleOrbits />
          <ScoreRing3D />
        </CursorTrackingGroup>
      </Canvas>
    </div>
  );
}
