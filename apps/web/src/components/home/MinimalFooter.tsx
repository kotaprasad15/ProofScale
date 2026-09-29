import React from "react";
import { ShieldCheck } from "lucide-react";

export function MinimalFooter({ onSignIn }: { onSignIn?: () => void }) {
  return (
    <footer className="relative z-10 px-6 sm:px-12 py-10 border-t" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-[var(--text-2)]">
          <ShieldCheck className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <span className="font-display font-bold tracking-[0.18em] text-sm text-[var(--text-1)]">RATECAP</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">
            readiness instrument
          </span>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-3)]">
          <a href="#pipeline" className="hover:text-[var(--text-1)] transition-colors">Pipeline</a>
          <a href="#capabilities" className="hover:text-[var(--text-1)] transition-colors">Capabilities</a>
          <a href="#roles" className="hover:text-[var(--text-1)] transition-colors">Roles</a>
          <a href="#safety" className="hover:text-[var(--text-1)] transition-colors">Safety</a>
          {onSignIn && (
            <button type="button" onClick={onSignIn} className="hover:text-[var(--text-1)] transition-colors uppercase tracking-wider cursor-pointer">
              Sign In
            </button>
          )}
        </nav>

        <span className="font-mono text-[10px] text-[var(--text-3)]">
          © {new Date().getFullYear()} RateCap
        </span>
      </div>
    </footer>
  );
}
