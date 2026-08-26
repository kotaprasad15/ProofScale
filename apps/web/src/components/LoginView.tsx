import React, { useState } from "react";
import { Activity, ArrowRight, CheckCircle2, ShieldCheck, UserCheck, Shield, Sparkles } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { GoBackButton, WorkspaceButton } from "./AnimatedButtons";
import { PointWave } from "./PointWave";
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
    }, 450);
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
    }, 400);
  };

  // Sign Up View
  if (isSignUp) {
    return (
      <main className="auth-page signup-page">
        <PointWave className="auth-wave" />
        <div className="auth-top">
          <BrandLogo onClick={onBackToHome} />
          {onBackToHome && <GoBackButton onClick={onBackToHome} label="Back to Home" />}
        </div>

        <section className="signup-shell">
          <div className="signup-copy">
            <span className="eyebrow">ProofScale onboarding</span>
            <h1>Start with the role your work requires.</h1>
            <p>
              Your workspace reflects the organization and project permissions your team grants. You can change your active workspace later.
            </p>
            <div className="signup-signal-list">
              <span>
                <CheckCircle2 size={17} /> Create an organization workspace
              </span>
              <span>
                <CheckCircle2 size={17} /> Join a project with an invitation
              </span>
              <span>
                <CheckCircle2 size={17} /> Run approved tests as a tester
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-white/90 border border-cardborder shadow-sm space-y-3">
              <span className="text-xs font-bold text-[#727586] uppercase tracking-wider block">
                Direct Sign Up with Email
              </span>
              <form onSubmit={handleCustomLogin} className="space-y-3">
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-canvas border border-cardborder text-sm text-ink focus:outline-none focus:border-brand"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-brand hover:bg-brand-hover text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center space-x-2"
                >
                  {loading ? <LoadingDots size="sm" /> : <span>Create Account &amp; Continue</span>}
                </button>
              </form>
            </div>
          </div>

          <div className="role-select-card">
            <span className="eyebrow">Choose your starting path</span>
            <div className="role-choice-grid">
              {["Create organization", "Join project", "Test an application"].map((choice) => (
                <button
                  type="button"
                  key={choice}
                  className={selectedRolePath === choice ? "role-choice selected" : "role-choice"}
                  onClick={() => setSelectedRolePath(choice)}
                >
                  <b>{choice}</b>
                  <small>
                    {choice === "Create organization"
                      ? "I will own the workspace"
                      : choice === "Join project"
                      ? "I have an invitation"
                      : "I need approved test access"}
                  </small>
                </button>
              ))}
            </div>

            <div className="role-choice-note">
              <strong>{selectedRolePath}</strong>
              <p>
                {selectedRolePath === "Create organization"
                  ? "You’ll create your organization, become its owner, and optionally create a first project."
                  : selectedRolePath === "Join project"
                  ? "Use your invitation to enter the organization and project your team assigned."
                  : "Request tester access or accept an invitation. Choosing this option does not grant access by itself."}
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  if (selectedRolePath === "Create organization") {
                    handleQuickLogin("owner");
                  } else {
                    handleQuickLogin("tester");
                  }
                }}
                className="w-full py-3 bg-[#171A32] hover:bg-ink text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center space-x-2"
              >
                <span>Quick Start as Demo {selectedRolePath === "Create organization" ? "Owner" : "Tester"}</span>
                <ArrowRight size={16} />
              </button>
            </div>

            <p className="auth-footnote">
              Already have a workspace?{" "}
              <button type="button" onClick={() => setIsSignUp(false)}>
                Sign in
              </button>
            </p>
          </div>
        </section>
      </main>
    );
  }

  // Sign In View
  return (
    <main className="auth-page">
      <PointWave className="auth-wave" />
      <div className="auth-top">
        <BrandLogo onClick={onBackToHome} />
        {onBackToHome && <GoBackButton onClick={onBackToHome} label="Back to Home" />}
      </div>

      <section className="auth-card">
        {/* Left Side Visual / Signal Plot */}
        <div className="auth-card-aside">
          <span className="eyebrow">Measured access</span>
          <h1>Return to the evidence.</h1>
          <p>
            Sign in to view your organization’s declared test envelopes, reports, and permitted workspace actions.
          </p>

          <div className="auth-trust">
            <ShieldCheck size={17} />
            <span>Secure session · organization-scoped access</span>
          </div>

          <div className="auth-signal-figure">
            <div className="auth-signal-label">
              <Activity size={14} /> Last verified signal
            </div>
            <strong>
              96<span>/100</span>
            </strong>
            <div className="auth-signal-bars">
              <i /><i /><i /><i /><i /><i /><i /><i />
            </div>
            <small>baseline · 25 VUs · p95 380ms</small>
          </div>
        </div>

        {/* Right Side Form */}
        <div className="auth-card-form">
          <span className="eyebrow">Welcome back</span>
          <h2>Sign in to ProofScale</h2>
          <p>Use your approved organization identity to continue.</p>

          <form onSubmit={handleCustomLogin} className="space-y-3 mt-6">
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">Work Email</label>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-canvas border border-cardborder text-sm text-ink focus:outline-none focus:border-brand"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand hover:bg-brand-hover text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center space-x-2"
            >
              {loading ? <LoadingDots size="sm" /> : <><span>Sign In with Email</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-cardborder" />
            </div>
            <span className="relative px-3 bg-white text-[11px] font-bold text-[#848697] uppercase tracking-wider">
              Or quick demo roles
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickLogin("owner")}
              className="p-3 rounded-xl border border-cardborder bg-canvas hover:bg-[#F3F1FF] hover:border-brand text-left transition"
            >
              <div className="font-bold text-xs text-ink flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-brand" />
                <span>Org Owner</span>
              </div>
              <p className="text-[10px] text-[#7A7D8D] mt-0.5">lead@acme.dev</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin("tester")}
              className="p-3 rounded-xl border border-cardborder bg-canvas hover:bg-[#F3F1FF] hover:border-brand text-left transition"
            >
              <div className="font-bold text-xs text-ink flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#129B78]" />
                <span>QA Tester</span>
              </div>
              <p className="text-[10px] text-[#7A7D8D] mt-0.5">qa.tester@acme.dev</p>
            </button>
          </div>

          <p className="auth-footnote">
            New to ProofScale?{" "}
            <button type="button" onClick={() => setIsSignUp(true)}>
              Create a workspace
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
