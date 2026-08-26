import React, { useState } from "react";
import { Menu, X, ArrowRight, LayoutDashboard } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

const links = [
  { label: "Pipeline", href: "#pipeline" },
  { label: "Methodology", href: "#methodology" },
  { label: "Safety Guardrails", href: "#safety" },
  { label: "Scoring Spec", href: "#scoring" },
];

interface PublicNavProps {
  onSignIn?: () => void;
  onSignUp?: () => void;
  isLoggedIn?: boolean;
  onGoToDashboard?: () => void;
}

export function PublicNav({ onSignIn, onSignUp, isLoggedIn, onGoToDashboard }: PublicNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="glass-nav">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-12 h-20 flex items-center justify-between gap-8">
        <BrandLogo onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }} />

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-text-muted" aria-label="Primary navigation">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={onGoToDashboard}
              className="btn-solid-primary cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onSignIn}
                className="text-sm font-medium text-text-muted hover:text-text-primary px-3 py-2 transition-colors cursor-pointer bg-transparent border-0"
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
