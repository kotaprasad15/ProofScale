import React, { useMemo } from "react";
import { ThemeProvider, useTheme } from "./home/ThemeContext";
import { SmoothScroll } from "./home/SmoothScroll";
import { CustomCursor } from "./home/CustomCursor";
import { SceneBackground } from "./home/SceneBackground";
import { CardNav, CardNavItem } from "./home/CardNav";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./home/ThemeToggle";
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

function HomeNavbar({
  onSignIn,
  onSignUp,
  isLoggedIn,
  onGoToDashboard,
  onLogout,
  userEmail
}: HomeViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const items: CardNavItem[] = useMemo(() => [
    {
      label: "Platform",
      bgColor: isDark ? "#141A28" : "#F4F6FB",
      textColor: isDark ? "#F1F3F9" : "#0C101A",
      links: [
        { label: "Pipeline (4-Stage Sandbox)", href: "#pipeline", ariaLabel: "4-stage sandboxed execution" },
        { label: "Capabilities (Bento Matrix)", href: "#capabilities", ariaLabel: "Deterministic bento architecture" },
        { label: "Methodology (Scoring Spec)", href: "#methodology", ariaLabel: "Weighted scoring spec & hard caps" }
      ]
    },
    {
      label: "Security",
      bgColor: isDark ? "#1A2234" : "#EBF0F8",
      textColor: isDark ? "#F1F3F9" : "#0C101A",
      links: [
        { label: "Dual-Scope RBAC", href: "#roles", ariaLabel: "Dual-scope RBAC access pathways" },
        { label: "Safety Guardrails", href: "#safety", ariaLabel: "SSRF guardrails, kill switch & audit" },
        { label: "Emergency Protection", href: "#safety", ariaLabel: "SSRF prevention and circuit breaker" }
      ]
    },
    {
      label: isLoggedIn ? "Account" : "Workspace",
      bgColor: isDark ? "#202A40" : "#E2E8F4",
      textColor: isDark ? "#F1F3F9" : "#0C101A",
      links: isLoggedIn
        ? [
            { label: "Open Dashboard", onClick: onGoToDashboard, ariaLabel: "Open Dashboard" },
            { label: userEmail ? `User: ${userEmail.split("@")[0]}` : "Active Session", onClick: onGoToDashboard, ariaLabel: "User profile" },
            { label: "Sign Out", onClick: onLogout, ariaLabel: "Sign out of account" }
          ]
        : [
            { label: "Sign In", onClick: onSignIn, ariaLabel: "Sign in" },
            { label: "Create Account / Join Org", onClick: onSignUp, ariaLabel: "Sign up" },
            { label: "Architecture Overview", href: "#pipeline", ariaLabel: "Pipeline overview" }
          ]
    }
  ], [isDark, isLoggedIn, userEmail, onGoToDashboard, onLogout, onSignIn, onSignUp]);

  return (
    <CardNav
      items={items}
      childrenLogo={<BrandLogo showWordmark title="Rate cap" />}
      baseColor={isDark ? "rgba(16, 21, 31, 0.90)" : "rgba(255, 255, 255, 0.94)"}
      menuColor={isDark ? "#F1F3F9" : "#0C101A"}
      buttonBgColor={isDark ? "#5B5FEF" : "#4F53E8"}
      buttonTextColor="#FFFFFF"
      ctaText={isLoggedIn ? "Dashboard" : "Get Started"}
      onCtaClick={isLoggedIn ? onGoToDashboard : onSignUp}
      rightSlot={<ThemeToggle />}
    />
  );
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

          {/* Expandable 3-Card Navigation from React Bits with GSAP */}
          <HomeNavbar
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
