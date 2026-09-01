import React from "react";
import { ThemeProvider } from "./home/ThemeContext";
import { SmoothScroll } from "./home/SmoothScroll";
import { CustomCursor } from "./home/CustomCursor";
import { SceneBackground } from "./home/SceneBackground";
import { PillNav } from "./home/PillNav";
import { HeroSection } from "./home/HeroSection";
import { Marquee } from "./home/Marquee";
import { CapabilitiesBento } from "./home/CapabilitiesBento";
import { CinematicStages } from "./home/CinematicStages";
import { RolePathways } from "./home/RolePathways";
import { SafetyGuardrails } from "./home/SafetyGuardrails";
import { ClosingCTA } from "./home/ClosingCTA";
import { MinimalFooter } from "./home/MinimalFooter";

interface HomeViewProps {
  onSignIn: () => void;
  onSignUp: () => void;
  isLoggedIn?: boolean;
  onGoToDashboard?: () => void;
  onLogout?: () => void;
  userEmail?: string;
}

export function HomeView({
  onSignIn,
  onSignUp,
  isLoggedIn,
  onGoToDashboard,
  onLogout,
  userEmail
}: HomeViewProps) {
  return (
    <ThemeProvider>
      <SmoothScroll>
        <div className="bg-[var(--color-bg)] min-h-screen text-text-primary selection:bg-signal-indigo/30 selection:text-white relative overflow-x-hidden transition-colors duration-300">
          {/* Custom cursor with precision dot + lagging ring (hidden on touch) */}
          <CustomCursor />

          {/* 3D Depth Particle Field & Floating Wireframe (Behind all content) */}
          <SceneBackground />

          {/* Floating Pill Nav with Brand Title "Rate cap" & Light/Dark Theme Switcher */}
          <PillNav
            onSignIn={onSignIn}
            onSignUp={onSignUp}
            isLoggedIn={isLoggedIn}
            onGoToDashboard={onGoToDashboard}
            onLogout={onLogout}
            userEmail={userEmail}
          />

          <main className="relative z-10">
            {/* 1. Hero: Full-Bleed Kinetic Type with Title Kicker */}
            <HeroSection
              onSignUp={onSignUp}
              onSignIn={onSignIn}
              isLoggedIn={isLoggedIn}
              onGoToDashboard={onGoToDashboard}
            />

            {/* 2. Marquee: Infinite Horizontal Auto-Scroll Strip */}
            <Marquee />

            {/* 3. Capabilities: Mixed-Size Bento Grid with Hover-Reveal Visuals */}
            <CapabilitiesBento />

            {/* 4. How It Works: Full-Viewport Cinematic Stages */}
            <CinematicStages />

            {/* 5. Role Pathways: Magnetic-Hover Cards */}
            <RolePathways onSignUp={onSignUp} />

            {/* 6. Safety Guardrails: Horizontal Scroll-Snap Brutalist Panels */}
            <SafetyGuardrails />

            {/* 7. Closing CTA: Giant Masked-Reveal Headline */}
            <ClosingCTA
              onSignUp={onSignUp}
              onSignIn={onSignIn}
              isLoggedIn={isLoggedIn}
              onGoToDashboard={onGoToDashboard}
            />
          </main>

          {/* 8. Minimal Footer: Repeated Marquee + Clean Baseline */}
          <MinimalFooter onSignIn={onSignIn} />
        </div>
      </SmoothScroll>
    </ThemeProvider>
  );
}
