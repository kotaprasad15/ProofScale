import React, { useState } from "react";
import { ArrowRight, ShieldCheck, ArrowLeft, Lock, Mail } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { SignalField } from "./SignalField";
import { LoadingDots } from "./LoadingDots";

interface LoginViewProps {
  onLogin: (user: { id: string; email: string; organizationId?: string }) => void;
  onBackToHome?: () => void;
  initialMode?: "signin" | "signup";
}

export function LoginView({ onLogin, onBackToHome, initialMode = "signin" }: LoginViewProps) {
  const [isSignUp, setIsSignUp] = useState(initialMode === "signup");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const cleanId = `usr_${email.trim().replace(/[^a-zA-Z0-9]/g, "_").slice(0, 24)}`;
    setTimeout(() => {
      onLogin({
        id: cleanId,
        email: email.trim().toLowerCase()
      });
    }, 300);
  };

  return (
    <div data-motion="calm" className="min-h-screen bg-ink-950 text-text-primary flex flex-col justify-between relative selection:bg-signal-indigo/30 selection:text-white">
      {/* Signature Signal Field Background (full motion, calm interactions) */}
      <SignalField variant="auth" />

      {/* Top Bar */}
      <header className="relative z-20 max-w-[1240px] w-full mx-auto px-6 sm:px-12 py-8 flex items-center justify-between">
        <BrandLogo onClick={onBackToHome} />
        {onBackToHome && (
          <button
            type="button"
            onClick={onBackToHome}
            className="btn-glass-secondary text-xs font-mono py-2 px-3.5 cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO HOME</span>
          </button>
        )}
      </header>

      {/* Main Auth Container */}
      <main className="relative z-10 max-w-4xl w-full mx-auto px-6 sm:px-12 py-6">
        <div className="glass-panel overflow-hidden border border-white/[0.12] grid grid-cols-1 md:grid-cols-12 shadow-2xl">
          
          {/* Left Column: Live Telemetry Status Banner */}
          <div className="md:col-span-5 p-8 bg-ink-900/90 border-b md:border-b-0 md:border-r border-white/[0.08] flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] text-signal-indigo bg-signal-indigo-soft border border-signal-indigo/20 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-indigo animate-pulse" />
                SECURE IDENTITY PIPELINE
              </div>
              <h2 className="font-display font-bold text-2xl text-text-primary tracking-tight">
                {isSignUp ? "Create your workspace" : "Return to the evidence"}
              </h2>
              <p className="text-text-muted text-xs leading-relaxed">
                Sign in with your work email to access your organization’s declared test envelopes, performance reports, and permitted workspace actions.
              </p>
            </div>

            {/* Live Mini Telemetry Card */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-text-muted text-[10px]">
                <span>ENFORCED ISOLATION</span>
                <span className="text-signal-teal font-bold">ACTIVE</span>
              </div>
              <div className="text-[10px] text-text-muted leading-relaxed">
                Isolated tenant workspaces with cryptographic role-based access control.
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-[10px] text-signal-teal">
              <ShieldCheck className="w-4 h-4" />
              <span>DUAL-SCOPE RBAC ENFORCED</span>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="md:col-span-7 p-8 sm:p-10 space-y-6">
            <div>
              <span className="font-mono text-[10px] text-signal-indigo font-bold uppercase tracking-wider">
                {isSignUp ? "NEW ACCOUNT" : "AUTHENTICATION"}
              </span>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-text-primary tracking-tight mt-1">
                {isSignUp ? "Create your account" : "Sign in to Ratecap"}
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                  Work Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    autoFocus
                    className="field-input field-input--mono pl-10"
                  />
                  <Mail className="w-4 h-4 text-text-faint absolute left-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-solid-primary w-full py-3.5 cursor-pointer justify-center disabled:opacity-50"
              >
                {loading ? (
                  <LoadingDots size="sm" />
                ) : (
                  <>
                    <span>{isSignUp ? "Continue to Workspace Setup" : "Sign In with Email"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-white/[0.06] space-y-2">
              <span className="block text-[10px] font-mono text-text-faint uppercase text-center tracking-wider">
                Pre-seeded Demo Accounts
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail("lead@acme.dev");
                    setIsSignUp(false);
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-mono text-text-muted hover:text-white transition cursor-pointer text-center"
                >
                  👑 lead@acme.dev (Owner)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("qa.tester@acme.dev");
                    setIsSignUp(false);
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-mono text-text-muted hover:text-white transition cursor-pointer text-center"
                >
                  ⚡ qa.tester@acme.dev (Tester)
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-text-muted pt-1">
              {isSignUp ? "Already have a workspace?" : "New to Ratecap?"}{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-signal-indigo hover:text-white font-semibold cursor-pointer bg-transparent border-0 underline"
              >
                {isSignUp ? "Sign in" : "Create a workspace"}
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* Footer Baseline */}
      <footer className="relative z-10 py-6 text-center text-xs font-mono text-text-faint">
        © 2026 Ratecap Instruments · Deterministic Application Readiness
      </footer>
    </div>
  );
}
