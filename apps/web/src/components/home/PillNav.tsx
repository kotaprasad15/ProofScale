import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ShieldCheck, Sparkles, User, ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { BrandLogo } from "../BrandLogo";
import { MaskedReveal } from "./MaskedReveal";
import { MagneticElement } from "./MagneticElement";
import { ThemeToggle } from "./ThemeToggle";

interface PillNavProps {
  onSignIn?: () => void;
  onSignUp?: () => void;
  isLoggedIn?: boolean;
  onGoToDashboard?: () => void;
  onLogout?: () => void;
  userEmail?: string;
}

const NAV_LINKS = [
  { label: "01 / PIPELINE", href: "#pipeline", desc: "4-stage sandboxed execution" },
  { label: "02 / CAPABILITIES", href: "#capabilities", desc: "Deterministic bento architecture" },
  { label: "03 / METHODOLOGY", href: "#methodology", desc: "Weighted scoring spec & hard caps" },
  { label: "04 / ROLES", href: "#roles", desc: "Dual-scope RBAC access pathways" },
  { label: "05 / SAFETY", href: "#safety", desc: "SSRF guard, kill switch & audit" }
];

export function PillNav({
  onSignIn,
  onSignUp,
  isLoggedIn,
  onGoToDashboard,
  onLogout,
  userEmail
}: PillNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleLinkClick = (href: string) => {
    setIsOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Floating Centered Pill Nav */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[92vw]">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2 rounded-full border transition-all duration-300 ${
            scrolled
              ? "bg-[var(--glass-fill)] backdrop-blur-xl border-[var(--border-strong)] shadow-[0_12px_32px_rgba(0,0,0,0.2)]"
              : "bg-[var(--glass-fill)] backdrop-blur-md border-[var(--border)] shadow-lg"
          }`}
        >
          {/* Logo Mark + Title "Rate cap" */}
          <div
            className="cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <BrandLogo showWordmark title="Rate cap" />
          </div>

          <div className="h-4 w-[1px] bg-[var(--border-strong)] hidden sm:block" />

          {/* Menu Trigger Button */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium text-text-primary hover:text-signal-teal hover:bg-[var(--white-fill-sm)] transition-all cursor-pointer bg-transparent border-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-signal-indigo animate-pulse" />
            <span>MENU</span>
          </button>

          {/* Light / Dark Theme Switcher Button */}
          <ThemeToggle />

          {/* Quick Action Button: Profile Menu when signed in, Workspace when signed out */}
          {isLoggedIn ? (
            <div
              className="relative"
              onMouseEnter={() => setProfileOpen(true)}
              onMouseLeave={() => setProfileOpen(false)}
            >
              <button
                type="button"
                onClick={() => setProfileOpen(prev => !prev)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-signal-indigo hover:bg-signal-indigo-hover text-white text-xs font-medium transition cursor-pointer font-sans shadow-sm shadow-signal-indigo/25"
                aria-expanded={profileOpen}
              >
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold uppercase shrink-0">
                  {userEmail ? userEmail.slice(0, 1) : <User className="w-2.5 h-2.5" />}
                </div>
                <span>Profile</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 py-1.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--border-strong)] shadow-2xl shadow-black/25 backdrop-blur-xl z-50 overflow-hidden"
                  >
                    {userEmail && (
                      <div className="px-3.5 py-2 border-b border-[var(--border)]">
                        <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Signed in as</p>
                        <p className="text-xs font-semibold text-text-primary truncate">{userEmail}</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        onGoToDashboard?.();
                      }}
                      className="w-full px-3.5 py-2.5 text-xs text-text-primary hover:text-signal-indigo hover:bg-[var(--white-fill-sm)] transition flex items-center gap-2.5 text-left cursor-pointer"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-signal-indigo shrink-0" />
                      <span className="font-semibold">Dashboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        onLogout?.();
                      }}
                      className="w-full px-3.5 py-2.5 text-xs text-text-muted hover:text-signal-rose hover:bg-signal-rose-soft transition flex items-center gap-2.5 text-left cursor-pointer border-t border-[var(--border)]"
                    >
                      <LogOut className="w-3.5 h-3.5 text-signal-rose shrink-0" />
                      <span className="font-semibold">Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignUp}
              className="hidden md:inline-flex px-3.5 py-1.5 rounded-full bg-signal-indigo hover:bg-signal-indigo-hover text-white text-xs font-medium transition cursor-pointer font-sans"
            >
              Workspace
            </button>
          )}
        </motion.div>
      </nav>

      {/* Full-Screen Theme Takeover Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-[var(--overlay-bg)] backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-12 overflow-y-auto"
          >
            {/* Top Bar inside Overlay */}
            <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
              <BrandLogo showWordmark title="Rate cap" onClick={() => { setIsOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
              
              <div className="flex items-center gap-3">
                <ThemeToggle showLabel />
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-3 rounded-full bg-[var(--white-fill-sm)] hover:bg-[var(--white-fill-md)] text-text-primary transition cursor-pointer border border-[var(--border)]"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Giant Navigation Links */}
            <div className="max-w-6xl w-full mx-auto my-auto py-12 space-y-6 sm:space-y-8">
              {NAV_LINKS.map((link, idx) => (
                <div key={link.href} className="group overflow-hidden">
                  <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: idx * 0.08,
                      ease: [0.16, 1, 0.3, 1]
                    }}
                    className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[var(--border)] pb-4 cursor-pointer"
                    onClick={() => handleLinkClick(link.href)}
                  >
                    <span className="font-display font-bold text-3xl sm:text-5xl lg:text-7xl text-text-muted group-hover:text-text-primary group-hover:translate-x-3 transition-all duration-300">
                      {link.label}
                    </span>
                    <span className="font-mono text-xs sm:text-sm text-text-faint group-hover:text-signal-teal transition-colors">
                      {link.desc} →
                    </span>
                  </motion.div>
                </div>
              ))}
            </div>

            {/* Bottom Actions inside Overlay */}
            <div className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-[var(--border)]">
              <div className="flex items-center gap-2 font-mono text-xs text-text-muted">
                <span className="w-2 h-2 rounded-full bg-signal-teal animate-pulse" />
                <span>RATE CAP APPLICATION READINESS INSTRUMENT</span>
              </div>

              <div className="flex items-center gap-4">
                {isLoggedIn ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setIsOpen(false); onGoToDashboard?.(); }}
                      className="btn-solid-primary"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsOpen(false); onLogout?.(); }}
                      className="btn-glass-secondary text-xs"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { setIsOpen(false); onSignIn?.(); }}
                      className="btn-glass-secondary text-xs"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsOpen(false); onSignUp?.(); }}
                      className="btn-solid-primary"
                    >
                      <span>Create Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
