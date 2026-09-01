import React from "react";
import { BrandLogo } from "../BrandLogo";
import { Marquee } from "./Marquee";

interface MinimalFooterProps {
  onSignIn?: () => void;
}

export function MinimalFooter({ onSignIn }: MinimalFooterProps) {
  return (
    <footer className="relative z-10 border-t border-[var(--border)] bg-[var(--color-bg)]">
      {/* Repeated Marquee Strip */}
      <Marquee />

      {/* Minimal Footer Row */}
      <div className="max-w-7xl mx-auto px-6 sm:px-12 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <BrandLogo onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />

        <div className="flex items-center gap-6 font-mono text-xs text-text-muted">
          <a href="#pipeline" className="hover:text-text-primary transition-colors">Pipeline</a>
          <a href="#capabilities" className="hover:text-text-primary transition-colors">Capabilities</a>
          <a href="#roles" className="hover:text-text-primary transition-colors">Roles</a>
          <a href="#safety" className="hover:text-text-primary transition-colors">Safety</a>
          {onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="text-signal-indigo hover:text-text-primary transition-colors bg-transparent border-0 cursor-pointer font-bold font-mono"
            >
              Sign In →
            </button>
          )}
        </div>

        <div className="font-mono text-xs text-text-faint">
          © 2026 Ratecap · SPEC v1.4
        </div>
      </div>
    </footer>
  );
}
