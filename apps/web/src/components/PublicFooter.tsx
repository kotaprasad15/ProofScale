import React from "react";
import { BrandLogo } from "./BrandLogo";

interface PublicFooterProps {
  onSignIn?: () => void;
  onSignUp?: () => void;
}

export function PublicFooter({ onSignIn, onSignUp }: PublicFooterProps) {
  return (
    <footer className="border-t border-white/[0.08] bg-ink-950/90 relative z-10 pt-16 pb-12">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-12 space-y-12">
        {/* 4-Column Balanced Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 sm:gap-12">
          
          {/* Column 1 (~40%): Brand Block */}
          <div className="md:col-span-5 space-y-4">
            <BrandLogo />
            <p className="text-text-muted text-sm max-w-sm leading-relaxed">
              Deterministic application readiness &amp; bounded load verification. Designed for authorized measurement, not indiscriminate traffic.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-signal-teal-soft border border-signal-teal/20 font-mono text-[10px] text-signal-teal">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-teal animate-pulse" />
              <span>CONTROL PLANE &amp; WORKERS OPERATIONAL</span>
            </div>
          </div>

          {/* Column 2 (20%): Pipeline */}
          <div className="md:col-span-2 space-y-3">
            <div className="font-mono text-xs font-semibold text-text-primary uppercase tracking-wider">
              Pipeline
            </div>
            <ul className="space-y-2 text-sm text-text-muted">
              <li>
                <a href="#pipeline" className="hover:text-text-primary transition-colors">
                  Target Declaration
                </a>
              </li>
              <li>
                <a href="#pipeline" className="hover:text-text-primary transition-colors">
                  Isolated Workers
                </a>
              </li>
              <li>
                <a href="#pipeline" className="hover:text-text-primary transition-colors">
                  Deterministic Math
                </a>
              </li>
              <li>
                <a href="#pipeline" className="hover:text-text-primary transition-colors">
                  Evidence Reports
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 (20%): Safety & Architecture */}
          <div className="md:col-span-2 space-y-3">
            <div className="font-mono text-xs font-semibold text-text-primary uppercase tracking-wider">
              Safety
            </div>
            <ul className="space-y-2 text-sm text-text-muted">
              <li>
                <a href="#safety" className="hover:text-text-primary transition-colors">
                  SSRF Network Guard
                </a>
              </li>
              <li>
                <a href="#safety" className="hover:text-text-primary transition-colors">
                  Atomic Lease Locks
                </a>
              </li>
              <li>
                <a href="#safety" className="hover:text-text-primary transition-colors">
                  Emergency Kill Switch
                </a>
              </li>
              <li>
                <a href="#safety" className="hover:text-text-primary transition-colors">
                  Dual-Scope RBAC
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4 (25%): Spec & Actions */}
          <div className="md:col-span-3 space-y-3">
            <div className="font-mono text-xs font-semibold text-text-primary uppercase tracking-wider">
              Verification
            </div>
            <ul className="space-y-2 text-sm text-text-muted">
              <li>
                <a href="#scoring" className="hover:text-text-primary transition-colors">
                  Scoring Engine v1.4
                </a>
              </li>
              <li>
                <a href="#methodology" className="hover:text-text-primary transition-colors">
                  Deterministic Weights
                </a>
              </li>
              {onSignIn && (
                <li>
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="hover:text-text-primary transition-colors text-left bg-transparent border-0 p-0 cursor-pointer text-sm text-text-muted"
                  >
                    Sign In to Workspace
                  </button>
                </li>
              )}
              {onSignUp && (
                <li>
                  <button
                    type="button"
                    onClick={onSignUp}
                    className="text-signal-indigo hover:text-white transition-colors text-left bg-transparent border-0 p-0 cursor-pointer text-sm font-semibold"
                  >
                    Create Workspace →
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Baseline Bar */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono text-text-faint">
          <div>
            © 2026 ProofScale Instruments. All assessments conditional on declared test envelope.
          </div>
          <div>
            ENGINE SPEC: v1.4 · AES-256 · SHA-256 EVIDENCE
          </div>
        </div>
      </div>
    </footer>
  );
}
