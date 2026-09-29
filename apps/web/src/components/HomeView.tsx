import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { ThemeProvider } from "./home/ThemeContext";
import { ThemeToggle } from "../motion/ThemeToggle";
import { AuroraBackground } from "../motion/AuroraBackground";
import { HeroSection } from "./home/HeroSection";
import { RibbonMarquee } from "./home/RibbonMarquee";
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
  onGoHome?: () => void;
}

/**
 * Public export kept for DocsView / FaqView which render a shared navbar.
 * Redesigned as a frosted glass pill nav with a mobile sheet.
 */
export function HomeNavbar({
  onSignIn,
  onSignUp,
  isLoggedIn,
  onGoToDashboard,
  onLogout,
  userEmail,
  onGoHome,
}: HomeViewProps) {
  const [open, setOpen] = useState(false);

  const links: Array<{ label: string; href?: string; onClick?: () => void }> = useMemo(
    () => [
      { label: "Pipeline", href: "#pipeline" },
      { label: "Capabilities", href: "#capabilities" },
      { label: "Roles", href: "#roles" },
      { label: "Safety", href: "#safety" },
      { label: "Docs", href: "/docs" },
      { label: "FAQ", href: "/faq" },
    ],
    []
  );

  return (
    <header className="fixed top-0 inset-x-0 z-40 px-4 sm:px-8 pt-4">
      <div
        className="max-w-6xl mx-auto glass rounded-2xl px-4 sm:px-5 h-14 flex items-center justify-between gap-4"
        style={{ background: "var(--glass-strong)" }}
      >
        {/* Brand */}
        <button
          type="button"
          className="flex items-center gap-2 cursor-pointer select-none group"
          onClick={() => {
            setOpen(false);
            if (onGoHome) onGoHome();
            else window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          aria-label="RateCap home"
        >
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center font-display font-bold text-xs"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              color: "#fff",
              boxShadow: "var(--glow-accent)",
            }}
          >
            R
          </span>
          <span className="font-display font-bold tracking-[0.18em] text-sm text-[var(--text-1)] group-hover:text-[var(--accent)] transition-colors">
            RATECAP
          </span>
        </button>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Marketing">
          {links.map((l) =>
            l.href?.startsWith("/") ? (
              <a
                key={l.label}
                href={l.href}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--accent-soft)] transition"
              >
                {l.label}
              </a>
            ) : (
              <a
                key={l.label}
                href={l.href}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--accent-soft)] transition"
              >
                {l.label}
              </a>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          {isLoggedIn ? (
            <button type="button" onClick={onGoToDashboard} className="btn-primary !py-2 !px-4 text-xs">
              Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onSignIn}
                className="hidden sm:inline-flex px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-1)] hover:bg-[var(--accent-soft)] transition cursor-pointer"
              >
                Sign In
              </button>
              <button type="button" onClick={onSignUp} className="btn-primary !py-2 !px-4 text-xs">
                Get Started
              </button>
            </>
          )}
          <button
            type="button"
            className="md:hidden p-1.5 rounded-lg text-[var(--text-2)]"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden max-w-6xl mx-auto glass rounded-2xl mt-2 p-4 space-y-1"
            style={{ background: "var(--glass-strong)" }}
            aria-label="Mobile"
          >
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--accent-soft)] transition"
              >
                {l.label}
              </a>
            ))}
            {!isLoggedIn && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSignIn?.();
                }}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--accent)] cursor-pointer"
              >
                Sign In
              </button>
            )}
            {isLoggedIn && onLogout && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--danger)] cursor-pointer"
              >
                Sign Out
              </button>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export function HomeView(props: HomeViewProps) {
  return (
    <ThemeProvider>
      <div
        className="min-h-screen text-[var(--text-1)] relative overflow-x-hidden transition-colors duration-300"
        style={{ background: "var(--bg-0)" }}
      >
        {/* Ambient aurora field behind the glass sections (old SceneBackground was three.js) */}
        <AuroraBackground />
        <HomeNavbar {...props} />

        <main className="relative z-10">
          <HeroSection
            onSignUp={props.onSignUp}
            onSignIn={props.onSignIn}
            isLoggedIn={props.isLoggedIn}
            onGoToDashboard={props.onGoToDashboard}
          />
          <RibbonMarquee />
          <CapabilitiesBento />
          <CinematicStages />
          <RolePathways onSignUp={props.onSignUp} />
          <SafetyGuardrails />
          <ClosingCTA
            onSignUp={props.onSignUp}
            onSignIn={props.onSignIn}
            isLoggedIn={props.isLoggedIn}
            onGoToDashboard={props.onGoToDashboard}
          />
        </main>

        <MinimalFooter onSignIn={props.onSignIn} />
      </div>
    </ThemeProvider>
  );
}
