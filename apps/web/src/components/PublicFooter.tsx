import React from "react";
import { BrandLogo } from "./BrandLogo";

interface PublicFooterProps {
  onSignIn?: () => void;
  onSignUp?: () => void;
}

export function PublicFooter({ onSignIn, onSignUp }: PublicFooterProps) {
  return (
    <footer className="site-footer">
      <div>
        <BrandLogo />
        <p>Readiness &amp; safety for the software you ship.</p>
      </div>

      <nav aria-label="Footer navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#methodology">Methodology</a>
        <a href="#role-pathways">Role pathways</a>
        <a href="#safety">Safety</a>
        {onSignIn && (
          <button
            type="button"
            onClick={onSignIn}
            className="text-[11px] font-bold text-[#656878] hover:text-brand bg-transparent border-0 cursor-pointer p-0"
          >
            Sign in
          </button>
        )}
        {onSignUp && (
          <button
            type="button"
            onClick={onSignUp}
            className="text-[11px] font-bold text-brand bg-transparent border-0 cursor-pointer p-0"
          >
            Create workspace
          </button>
        )}
      </nav>

      <small>© 2026 ProofScale. Results are conditional on the declared test envelope.</small>
    </footer>
  );
}
