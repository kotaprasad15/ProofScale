import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useTheme } from "./ThemeContext";
import { generateLetterTargets } from "./generateLetterTargets";

// ---------------------------------------------------------------------------
// Helper: Create Soft Glowing Circle Texture for Particles
// ---------------------------------------------------------------------------
function getCircleTexture() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.35, "rgba(255, 255, 255, 0.75)");
  gradient.addColorStop(0.75, "rgba(255, 255, 255, 0.15)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// ---------------------------------------------------------------------------
// 1. Scroll-Driven Particle Morph Field (Ambient -> RATECAP)
// ---------------------------------------------------------------------------
interface MorphingParticleFieldProps {
  count: number;
  isLight: boolean;
  reducedMotion: boolean;
  texture: THREE.Texture | null;
  scrollProgressRef: React.MutableRefObject<number>;
}

function MorphingParticleField({
  count,
  isLight,
  reducedMotion,
  texture,
  scrollProgressRef
}: MorphingParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  // Generate Ambient Source Positions & Initial Colors
  const { ambientPositions, targetPositions, initialPositions, colors, driftFactors } = useMemo(() => {
    const amb = new Float32Array(count * 3);
    const cur = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const drift = new Float32Array(count * 3);

    // Letter targets generated from offscreen canvas for "RATECAP"
    const targets = generateLetterTargets(count, "RATECAP", 7.2, 1.85);

    const indigo = new THREE.Color(isLight ? "#4347D9" : "#6E72FF");
    const teal = new THREE.Color(isLight ? "#0A8F62" : "#3BF5C4");

    let generated = 0;
    let attempts = 0;
    const maxAttempts = count * 5;

    while (generated < count && attempts < maxAttempts) {
      attempts++;
      let x = 0;
      let y = 0;

      if (Math.random() < 0.65) {
        // Bias top-right quadrant for hero state
        x = THREE.MathUtils.randFloat(1.2, 6.8);
        y = THREE.MathUtils.randFloat(0.1, 4.0);
      } else {
        // Broad peripheral spread
        x = THREE.MathUtils.randFloatSpread(16);
        y = THREE.MathUtils.randFloatSpread(10);
      }

      // Strict headline exclusion zone in hero
      if (x >= -6.8 && x <= 1.25 && y >= -1.9 && y <= 2.6) {
        continue;
      }

      const z = THREE.MathUtils.randFloat(-18, -2);
      const i3 = generated * 3;

      amb[i3] = x;
      amb[i3 + 1] = y;
      amb[i3 + 2] = z;

      cur[i3] = x;
      cur[i3 + 1] = y;
      cur[i3 + 2] = z;

      // Unique subtle drift speeds
      drift[i3] = THREE.MathUtils.randFloat(0.3, 0.9);
      drift[i3 + 1] = THREE.MathUtils.randFloat(0.3, 0.8);
      drift[i3 + 2] = THREE.MathUtils.randFloat(0.2, 0.6);

      // Color gradient across X axis of letters
      const normTargetX = (targets[i3] + 3.6) / 7.2;
      const c = new THREE.Color().lerpColors(indigo, teal, THREE.MathUtils.clamp(normTargetX, 0, 1));

      col[i3] = c.r;
      col[i3 + 1] = c.g;
      col[i3 + 2] = c.b;

      generated++;
    }

    // Fill remaining slots if any
    for (let i = generated; i < count; i++) {
      const i3 = i * 3;
      const x = THREE.MathUtils.randFloat(1.5, 6.0);
      const y = THREE.MathUtils.randFloat(0.2, 3.5);
      const z = THREE.MathUtils.randFloat(-15, -3);

      amb[i3] = x;
      amb[i3 + 1] = y;
      amb[i3 + 2] = z;
      cur[i3] = x;
      cur[i3 + 1] = y;
      cur[i3 + 2] = z;

      drift[i3] = 0.5;
      drift[i3 + 1] = 0.5;
      drift[i3 + 2] = 0.3;

      col[i3] = indigo.r;
      col[i3 + 1] = indigo.g;
      col[i3 + 2] = indigo.b;
    }

    return {
      ambientPositions: amb,
      targetPositions: targets,
      initialPositions: cur,
      colors: col,
      driftFactors: drift
    };
  }, [count, isLight]);

  // Per-Frame Particle Morphing based on Scroll Progress
  useFrame(({ clock }) => {
    if (!pointsRef.current) return;

    const geom = pointsRef.current.geometry;
    const posAttr = geom.getAttribute("position") as THREE.BufferAttribute;
    if (!posAttr) return;

    const currentArray = posAttr.array as Float32Array;
    const scroll = scrollProgressRef.current;
    const time = clock.getElapsedTime();

    // Smoothstep transition: morph begins around 20% scroll and reaches full RATECAP by 95%
    const rawProgress = THREE.MathUtils.clamp((scroll - 0.18) / 0.76, 0, 1);
    // Cubic smoothstep curve for natural organic flow
    const morphT = reducedMotion ? (scroll > 0.6 ? 1 : 0) : rawProgress * rawProgress * (3 - 2 * rawProgress);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Ambient organic drift (damps out as it locks into letters)
      const driftMult = (1 - morphT);
      const driftX = Math.sin(time * driftFactors[i3] + i) * 0.12 * driftMult;
      const driftY = Math.cos(time * driftFactors[i3 + 1] + i) * 0.12 * driftMult;
      const driftZ = Math.sin(time * driftFactors[i3 + 2] + i * 2) * 0.15 * driftMult;

      const ax = ambientPositions[i3] + driftX;
      const ay = ambientPositions[i3 + 1] + driftY;
      const az = ambientPositions[i3 + 2] + driftZ;

      const tx = targetPositions[i3];
      const ty = targetPositions[i3 + 1];
      const tz = targetPositions[i3 + 2];

      // Interpolate smoothly between ambient field and RATECAP letters
      currentArray[i3] = ax * (1 - morphT) + tx * morphT;
      currentArray[i3 + 1] = ay * (1 - morphT) + ty * morphT;
      currentArray[i3 + 2] = az * (1 - morphT) + tz * morphT;
    }

    posAttr.needsUpdate = true;

    // Dynamically adjust opacity and size for crisp letter clarity when formed
    if (materialRef.current) {
      const baseOpacity = isLight ? 0.55 : 0.65;
      const targetOpacity = isLight ? 0.85 : 0.95;
      materialRef.current.opacity = baseOpacity * (1 - morphT) + targetOpacity * morphT;

      const baseSize = isLight ? 0.22 : 0.26;
      const targetSize = isLight ? 0.18 : 0.21;
      materialRef.current.size = baseSize * (1 - morphT) + targetSize * morphT;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[initialPositions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={isLight ? 0.22 : 0.26}
        map={texture || undefined}
        vertexColors
        transparent
        opacity={isLight ? 0.55 : 0.65}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ---------------------------------------------------------------------------
// 2. Floating Wireframe Ball Structure (Hero Top-Right -> RATECAP Center)
// ---------------------------------------------------------------------------
interface FloatingBallStructureProps {
  isLight: boolean;
  reducedMotion: boolean;
  scrollProgressRef: React.MutableRefObject<number>;
}

function FloatingBallStructure({
  isLight,
  reducedMotion,
  scrollProgressRef
}: FloatingBallStructureProps) {
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const outerMeshRef = useRef<THREE.Mesh>(null);
  const innerMeshRef = useRef<THREE.Mesh>(null);
  const ringMeshRef = useRef<THREE.Mesh>(null);

  const outerColor = isLight ? "#4347D9" : "#6E72FF";
  const innerColor = isLight ? "#0A8F62" : "#3BF5C4";

  // Initial Hero Safe Position (top-right whitespace)
  const heroX = Math.min(Math.max(viewport.width * 0.24, 2.0), 2.9);
  const heroY = Math.min(Math.max(viewport.height * 0.10, 0.3), 0.7);
  const heroZ = 0;

  // Final Bottom Position (in the middle of RATECAP text)
  const finalX = 0;
  const finalY = 0.05;
  const finalZ = 0.4;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scroll = scrollProgressRef.current;

    // Smooth progression curve for traveling to the center
    const rawProgress = THREE.MathUtils.clamp((scroll - 0.15) / 0.78, 0, 1);
    const pathT = reducedMotion ? (scroll > 0.6 ? 1 : 0) : rawProgress * rawProgress * (3 - 2 * rawProgress);

    // Interpolate position from hero top-right to middle of RATECAP
    if (groupRef.current) {
      const curX = heroX * (1 - pathT) + finalX * pathT;
      const curY = (heroY + Math.sin(t * 0.7) * 0.08) * (1 - pathT) + (finalY + Math.sin(t * 0.9) * 0.04) * pathT;
      const curZ = heroZ * (1 - pathT) + finalZ * pathT;

      groupRef.current.position.set(curX, curY, curZ);

      // Subtle scale adjust in the center
      const currentScale = 1.0 * (1 - pathT) + 0.92 * pathT;
      groupRef.current.scale.set(currentScale, currentScale, currentScale);
    }

    // Continuous 3D rotation of ball structure components
    if (outerMeshRef.current) {
      outerMeshRef.current.rotation.x = t * 0.07;
      outerMeshRef.current.rotation.y = t * 0.11;
    }

    if (innerMeshRef.current) {
      innerMeshRef.current.rotation.x = -t * 0.12;
      innerMeshRef.current.rotation.z = t * 0.09;
    }

    if (ringMeshRef.current) {
      ringMeshRef.current.rotation.x = 1.2 + Math.sin(t * 0.4) * 0.1;
      ringMeshRef.current.rotation.y = t * 0.14;
    }
  });

  return (
    <group ref={groupRef} position={[heroX, heroY, heroZ]}>
      {/* Outer Wireframe Icosahedron */}
      <mesh ref={outerMeshRef}>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshBasicMaterial
          wireframe
          color={outerColor}
          transparent
          opacity={isLight ? 0.48 : 0.58}
        />
      </mesh>

      {/* Inner Nested Core Shield */}
      <mesh ref={innerMeshRef} scale={0.65}>
        <octahedronGeometry args={[0.8, 0]} />
        <meshBasicMaterial
          wireframe
          color={innerColor}
          transparent
          opacity={isLight ? 0.38 : 0.48}
        />
      </mesh>

      {/* Delicate Orbiting Ring */}
      <mesh ref={ringMeshRef}>
        <torusGeometry args={[1.35, 0.008, 8, 32]} />
        <meshBasicMaterial
          color={outerColor}
          transparent
          opacity={isLight ? 0.28 : 0.38}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 3. Camera Controller with Cursor Tilt & Scroll Tracking
// ---------------------------------------------------------------------------
interface CameraRigProps {
  reducedMotion: boolean;
  scrollProgressRef: React.MutableRefObject<number>;
}

function CameraRig({ reducedMotion, scrollProgressRef }: CameraRigProps) {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame((_, delta) => {
    if (reducedMotion) return;

    const scroll = scrollProgressRef.current;
    // Damped tilt toward cursor (subtler when settled at bottom)
    const tiltDamp = Math.max(0.3, 1 - scroll * 0.7);
    const targetRotY = THREE.MathUtils.degToRad(mouse.current.x * 1.8 * tiltDamp);
    const targetRotX = THREE.MathUtils.degToRad(-mouse.current.y * 1.3 * tiltDamp);

    camera.rotation.y = THREE.MathUtils.damp(camera.rotation.y, targetRotY, 3.5, delta);
    camera.rotation.x = THREE.MathUtils.damp(camera.rotation.x, targetRotX, 3.5, delta);

    // Camera position gently zooms back slightly for the full word view
    const targetZ = 5 + scroll * 1.2;
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 3, delta);
  });

  return null;
}

// ---------------------------------------------------------------------------
// 4. Main Exported SceneBackground Component
// ---------------------------------------------------------------------------
export function SceneBackground() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });

  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const scrollProgressRef = useRef(0);
  const circleTexture = useMemo(() => getCircleTexture(), []);

  useEffect(() => {
    const checkViewport = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkViewport();

    // Track full page scroll progress [0, 1]
    const handleScroll = () => {
      const totalScrollable = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgressRef.current = totalScrollable > 0 ? Math.min(Math.max(window.scrollY / totalScrollable, 0), 1) : 0;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    // 1-second ease-in reveal on mount
    const revealTimer = setTimeout(() => {
      setMounted(true);
    }, 60);

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    motionQuery.addEventListener("change", handleMotionChange);

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("resize", () => {
      checkViewport();
      handleScroll();
    }, { passive: true });

    return () => {
      clearTimeout(revealTimer);
      window.removeEventListener("scroll", handleScroll);
      motionQuery.removeEventListener("change", handleMotionChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", checkViewport);
    };
  }, []);

  // Performance Guard: Don't mount WebGL on mobile or hidden tabs
  if (!isDesktop || !isVisible) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-0 pointer-events-none overflow-hidden transition-all duration-1000 ${
        mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
      style={{
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)"
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 55 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance"
        }}
        dpr={[1, 2]}
        className="w-full h-full"
      >
        <CameraRig
          reducedMotion={reducedMotion}
          scrollProgressRef={scrollProgressRef}
        />

        {/* Unified 1,200 Particle Field that morphs from ambient to "RATECAP" */}
        <MorphingParticleField
          count={1200}
          isLight={isLight}
          reducedMotion={reducedMotion}
          texture={circleTexture}
          scrollProgressRef={scrollProgressRef}
        />

        {/* Rotating Wireframe Ball Structure (Top-Right Hero -> RATECAP Center) */}
        <FloatingBallStructure
          isLight={isLight}
          reducedMotion={reducedMotion}
          scrollProgressRef={scrollProgressRef}
        />
      </Canvas>
    </div>
  );
}
