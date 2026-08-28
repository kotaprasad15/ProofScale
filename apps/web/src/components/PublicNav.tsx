import React, { useEffect, useState } from "react";
import { Menu, X, ArrowRight, LayoutDashboard } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

const links = [
  { label: "Pipeline", href: "#pipeline" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Methodology", href: "#methodology" },
  { label: "Safety", href: "#safety" }
];

interface PublicNavProps {
  onSignIn?: () => void;
  onSignUp?: () => void;
  isLoggedIn?: boolean;
  onGoToDashboard?: () => void;
  onLogout?: () => void;
}

export function PublicNav({ onSignIn, onSignUp, isLoggedIn, onGoToDashboard, onLogout }: PublicNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState("");

  // Nav gains opacity past 40px scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy for the persistent active underline
  useEffect(() => {
    const ids = links.map(l => l.href.slice(1));
    const sections = ids
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <header className={`glass-nav ${scrolled ? "glass-nav--scrolled" : ""}`}>
      <div className="max-w-[1240px] mx-auto px-6 sm:px-12 h-20 flex items-center justify-between gap-8">
        <BrandLogo onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }} />

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-text-muted" aria-label="Primary navigation">
          {links.map((link) => {
            const isActive = activeId === link.href.slice(1);
            return (
              <a
                key={link.href}
                href={link.href}
                className={`nav-link ${isActive ? "nav-link--active" : ""} hover:text-text-primary transition-colors`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {isLoggedIn ? (
            <>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-sm font-medium text-text-muted hover:text-signal-rose px-3 py-2 transition-colors cursor-pointer bg-transparent border-0"
                >
                  Sign Out
                </button>
              )}
              <button
                type="button"
                onClick={onGoToDashboard}
                className="btn-solid-primary cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onSignIn}
                className="text-sm font-medium text-text-muted hover:text-text-primary px-3 py-2 transition-colors cursor-pointer bg-transparent border-0 font-medium"
              >
                Sign in
              </button>

              <button
                type="button"
                onClick={onSignUp}
                className="btn-solid-primary cursor-pointer"
              >
                <span>Create Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-text-primary cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden glass-panel mx-4 mb-4 p-6 space-y-4 border border-white/[0.1]">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-text-muted hover:text-text-primary py-1"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-4 border-t border-white/[0.08] space-y-3">
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onGoToDashboard?.();
                }}
                className="btn-solid-primary w-full"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignIn?.();
                  }}
                  className="w-full text-left font-medium text-text-muted hover:text-text-primary py-1"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignUp?.();
                  }}
                  className="btn-solid-primary w-full"
                >
                  <span>Create Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
