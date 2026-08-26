import React, { useState } from "react";
import { Activity, ArrowRight, CheckCircle2, ShieldCheck, UserCheck, Shield, Sparkles, ArrowLeft, Lock } from "lucide-react";
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
  const [customEmail, setCustomEmail] = useState("");
  const [selectedRolePath, setSelectedRolePath] = useState("Create organization");

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) return;
    setLoading(true);
    const cleanId = `usr_${customEmail.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 16)}`;
    setTimeout(() => {
      onLogin({
        id: cleanId,
        email: customEmail
      });
    }, 400);
  };

  const handleQuickLogin = (roleType: "owner" | "tester") => {
    setLoading(true);
    setTimeout(() => {
      if (roleType === "owner") {
        onLogin({
          id: "usr_admin_01",
          email: "lead@acme.dev",
          organizationId: "org_default_01"
        });
      } else {
        onLogin({
          id: "usr_tester_01",
          email: "qa.tester@acme.dev",
          organizationId: "org_default_01"
        });
      }
    }, 350);
  };

  return (
    <div className="min-h-screen bg-ink-950 text-text-primary flex flex-col justify-between relative selection:bg-signal-indigo/30 selection:text-white">
      {/* Signature Signal Field Background */}
      <SignalField />

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
                Sign in to view your organization’s declared test envelopes, reports, and permitted workspace actions.
              </p>
            </div>

            {/* Live Mini Telemetry Card */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-text-muted text-[10px]">
                <span>LAST OBSERVED SIGNAL</span>
                <span className="text-signal-teal font-bold">READY · 96/100</span>
              </div>
              <div className="flex items-end gap-1 h-8 px-1">
                {[30, 45, 60, 50, 75, 80, 88, 92, 94, 96].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 rounded-t-sm bg-signal-indigo opacity-75"
                  />
                ))}
              </div>
              <div className="text-[9px] text-text-muted pt-1 border-t border-white/[0.04]">
                25 VUs · p95 380ms · 0.00% errors
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
                {isSignUp ? "Set up your role pathway" : "Sign in to ProofScale"}
              </h1>
            </div>

            <form onSubmit={handleCustomLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                  Work Email
                </label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-ink-900/90 border border-white/[0.1] text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal-indigo"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-solid-primary w-full py-3.5 cursor-pointer justify-center"
              >
                {loading ? (
                  <LoadingDots size="sm" />
                ) : (
                  <>
                    <span>{isSignUp ? "Create Account & Continue" : "Sign In with Email"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.08]" />
              </div>
              <span className="relative px-3 bg-ink-950/80 font-mono text-[10px] text-text-faint uppercase tracking-wider">
                Or quick demo roles
              </span>
            </div>

            {/* Quick Demo Role Cards */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickLogin("owner")}
                className="p-3 rounded-xl bg-ink-900/60 border border-white/[0.08] hover:border-signal-indigo text-left transition cursor-pointer group"
              >
                <div className="font-display font-semibold text-xs text-text-primary flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-signal-indigo" />
                  <span>Org Owner</span>
                </div>
                <p className="font-mono text-[10px] text-text-muted mt-0.5">lead@acme.dev</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("tester")}
                className="p-3 rounded-xl bg-ink-900/60 border border-white/[0.08] hover:border-signal-teal text-left transition cursor-pointer group"
              >
                <div className="font-display font-semibold text-xs text-text-primary flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-signal-teal" />
                  <span>QA Tester</span>
                </div>
                <p className="font-mono text-[10px] text-text-muted mt-0.5">qa.tester@acme.dev</p>
              </button>
            </div>

            <p className="text-center text-xs text-text-muted">
              {isSignUp ? "Already have a workspace?" : "New to ProofScale?"}{" "}
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
        © 2026 ProofScale Instruments · Deterministic Application Readiness
      </footer>
    </div>
  );
}
