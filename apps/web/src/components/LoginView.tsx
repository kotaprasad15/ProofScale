import React, { useState, useEffect } from "react";
import { ArrowRight, ShieldCheck, ArrowLeft, Lock, Mail, AlertTriangle, CheckCircle2, User, KeyRound } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { LoadingDots } from "./LoadingDots";
import { trpc } from "../utils/trpc";

interface LoginViewProps {
  onLogin: (user: { id: string; email: string; organizationId?: string }) => void;
  onBackToHome?: () => void;
  initialMode?: "signin" | "signup";
}

export function LoginView({ onLogin, onBackToHome, initialMode = "signin" }: LoginViewProps) {
  const [isSignUp, setIsSignUp] = useState(initialMode === "signup");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Debounced email for real-time existence checking
  const [debouncedEmail, setDebouncedEmail] = useState("");

  // Feedback messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Debounce email input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmail(email.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(timer);
  }, [email]);

  // Valid email check for query
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail);

  // Real-time check while typing email in signup mode
  const checkEmailQuery = trpc.auth.checkEmailAvailability.useQuery(
    { email: debouncedEmail },
    {
      enabled: isSignUp && isValidEmail,
      retry: false,
      staleTime: 5000
    }
  );

  const emailExists = isSignUp && isValidEmail && checkEmailQuery.data?.exists === true;

  // Mutations
  const loginMutation = trpc.auth.login.useMutation();
  const signupMutation = trpc.auth.signup.useMutation();

  const isSubmitting = loginMutation.isPending || signupMutation.isPending;

  const passwordsMatch = !confirmPassword || password === confirmPassword;
  const isPasswordLongEnough = password.length >= 10;

  const handleToggleMode = (signUpMode: boolean) => {
    setIsSignUp(signUpMode);
    setErrorMsg(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    if (!password) {
      setErrorMsg("Please enter your password.");
      return;
    }

    if (isSignUp) {
      // 1. Check if email already exists
      if (emailExists) {
        setErrorMsg("already this email exists");
        return;
      }

      // 2. Validate passwords match
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return;
      }

      // 3. Validate password length
      if (password.length < 10) {
        setErrorMsg("Password must be at least 10 characters long.");
        return;
      }

      try {
        const res = await signupMutation.mutateAsync({
          email: cleanEmail,
          password,
          confirmPassword,
          displayName: displayName.trim() || undefined
        });

        if (res.success && res.user) {
          onLogin({
            id: res.user.id,
            email: res.user.email,
            organizationId: res.user.lastWorkspaceId || undefined
          });
        }
      } catch (err: any) {
        setErrorMsg(err?.message || "Registration failed. Please try again.");
      }
    } else {
      // Sign In Flow
      try {
        const res = await loginMutation.mutateAsync({
          email: cleanEmail,
          password
        });

        if (res.success && res.user) {
          onLogin({
            id: res.user.id,
            email: res.user.email,
            organizationId: res.user.lastWorkspaceId || undefined
          });
        }
      } catch (err: any) {
        setErrorMsg(err?.message || "Invalid credentials or account locked.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 text-text-primary flex flex-col justify-between relative selection:bg-signal-indigo/30 selection:text-white">
      {/* Background ambient gradient glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
      >
        <div className="absolute top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-signal-indigo/10 blur-[140px]" />
        <div className="absolute bottom-[10%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-signal-teal/8 blur-[140px]" />
        <div className="absolute inset-0 grain-bg opacity-30" />
      </div>

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
          
          {/* Left Column: Telemetry & Security Notice */}
          <div className="md:col-span-5 p-8 bg-ink-900/90 border-b md:border-b-0 md:border-r border-white/[0.08] flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] text-signal-indigo bg-signal-indigo-soft border border-signal-indigo/20 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-indigo animate-pulse" />
                SECURE IDENTITY PIPELINE
              </div>
              <h2 className="font-display font-bold text-2xl text-text-primary tracking-tight">
                {isSignUp ? "Create your workspace" : "Return to the evidence"}
              </h2>
              <p className="text-text-muted text-xs leading-relaxed font-sans">
                {isSignUp
                  ? "Register with your work email and password. Your credentials are cryptographically protected with salted scrypt hashing and persisted to Supabase PostgreSQL."
                  : "Sign in to inspect your organization’s declared test envelopes, report archives, and permitted workspace actions."}
              </p>
            </div>

            {/* Live Mini Telemetry Card */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-text-muted text-[10px]">
                <span>DATABASE STORAGE</span>
                <span className="text-signal-teal font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-teal animate-ping" />
                  SUPABASE POSTGRES
                </span>
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
              <div className="text-[9px] text-text-muted pt-1 border-t border-white/[0.04] flex justify-between">
                <span>Encrypted At Rest</span>
                <span className="text-signal-indigo">RLS Hardened</span>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-[10px] text-signal-teal">
              <ShieldCheck className="w-4 h-4" />
              <span>DUAL-SCOPE RBAC &amp; HSTS ACTIVE</span>
            </div>
          </div>

          {/* Right Column: Dynamic Form */}
          <div className="md:col-span-7 p-8 sm:p-10 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] text-signal-indigo font-bold uppercase tracking-wider">
                  {isSignUp ? "NEW ACCOUNT" : "AUTHENTICATION"}
                </span>
                <h1 className="font-display font-bold text-2xl sm:text-3xl text-text-primary tracking-tight mt-1">
                  {isSignUp ? "Sign Up" : "Sign In"}
                </h1>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="inline-flex p-1 rounded-xl bg-ink-900 border border-white/[0.08] text-xs font-mono">
                <button
                  type="button"
                  onClick={() => handleToggleMode(false)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    !isSignUp ? "bg-signal-indigo text-white shadow font-semibold" : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMode(true)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    isSignUp ? "bg-signal-indigo text-white shadow font-semibold" : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-signal-rose-soft border border-signal-rose/30 text-xs text-signal-rose flex items-center gap-2 font-mono">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                  Email ID *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-faint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="you@company.dev"
                    required
                    className={`field-input pl-10 pr-4 py-2.5 ${
                      emailExists ? "border-signal-rose focus:border-signal-rose bg-signal-rose-soft/20" : ""
                    }`}
                  />
                  {checkEmailQuery.isFetching && isSignUp && isValidEmail && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <LoadingDots size="sm" />
                    </div>
                  )}
                </div>

                {/* Real-time email check status */}
                {isSignUp && isValidEmail && emailExists && (
                  <p className="text-xs text-signal-rose font-mono mt-1.5 flex items-center gap-1.5 animate-fadeIn">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-bold">already this email exists</span>
                  </p>
                )}
                {isSignUp && isValidEmail && !checkEmailQuery.isFetching && !emailExists && (
                  <p className="text-xs text-signal-teal font-mono mt-1.5 flex items-center gap-1.5 animate-fadeIn">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Email is available for registration</span>
                  </p>
                )}
              </div>

              {/* Display Name (Only on Sign Up) */}
              {isSignUp && (
                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-text-faint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="field-input pl-10 pr-4 py-2.5"
                    />
                  </div>
                </div>
              )}

              {/* Password Input */}
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                  Password *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-text-faint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder={isSignUp ? "Minimum 10 characters" : "Enter your password"}
                    required
                    className="field-input pl-10 pr-4 py-2.5"
                  />
                </div>
                {isSignUp && password.length > 0 && !isPasswordLongEnough && (
                  <p className="text-[11px] text-signal-amber font-mono mt-1">
                    Password must be at least 10 characters long
                  </p>
                )}
              </div>

              {/* Confirm Password (Only on Sign Up) */}
              {isSignUp && (
                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-text-faint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="Re-enter your password"
                      required
                      className={`field-input pl-10 pr-4 py-2.5 ${
                        !passwordsMatch ? "border-signal-rose focus:border-signal-rose bg-signal-rose-soft/20" : ""
                      }`}
                    />
                  </div>
                  {!passwordsMatch && (
                    <p className="text-xs text-signal-rose font-mono mt-1.5 flex items-center gap-1.5 animate-fadeIn">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Passwords do not match</span>
                    </p>
                  )}
                  {passwordsMatch && confirmPassword.length > 0 && (
                    <p className="text-xs text-signal-teal font-mono mt-1.5 flex items-center gap-1.5 animate-fadeIn">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Passwords match</span>
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || (isSignUp && (emailExists || !passwordsMatch || !email || !password || !confirmPassword))}
                className="btn-solid-primary w-full py-3.5 cursor-pointer justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? (
                  <LoadingDots size="sm" label={isSignUp ? "Creating account in Supabase..." : "Verifying credentials..."} />
                ) : (
                  <>
                    <span>{isSignUp ? "Create Account & Continue" : "Sign In"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative text-center pt-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.08]" />
              </div>
              <span className="relative px-3 bg-ink-950 font-mono text-[10px] text-text-faint uppercase tracking-wider">
                Quick Demo Identities
              </span>
            </div>

            {/* Quick Demo Role Cards */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setEmail("lead@acme.dev");
                  setPassword("Password123!Secure");
                  setIsSignUp(false);
                  setErrorMsg(null);
                }}
                className="p-3 rounded-xl bg-ink-900/60 border border-white/[0.08] hover:border-signal-indigo text-left transition cursor-pointer group"
              >
                <div className="font-display font-semibold text-xs text-text-primary flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-signal-indigo" />
                  <span>Org Owner</span>
                </div>
                <p className="font-mono text-[10px] text-text-muted mt-0.5">lead@acme.dev</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail("qa.tester@acme.dev");
                  setPassword("Password123!Secure");
                  setIsSignUp(false);
                  setErrorMsg(null);
                }}
                className="p-3 rounded-xl bg-ink-900/60 border border-white/[0.08] hover:border-signal-teal text-left transition cursor-pointer group"
              >
                <div className="font-display font-semibold text-xs text-text-primary flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-signal-teal" />
                  <span>QA Tester</span>
                </div>
                <p className="font-mono text-[10px] text-text-muted mt-0.5">qa.tester@acme.dev</p>
              </button>
            </div>

            <p className="text-center text-xs text-text-muted pt-1">
              {isSignUp ? "Already have an account?" : "Don't have an account yet?"}{" "}
              <button
                type="button"
                onClick={() => handleToggleMode(!isSignUp)}
                className="text-signal-indigo hover:text-white font-semibold cursor-pointer bg-transparent border-0 underline ml-1"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* Footer Baseline */}
      <footer className="relative z-10 py-6 text-center text-xs font-mono text-text-faint">
        © 2026 Ratecap Instruments · Deterministic Application Readiness · Supabase Connected
      </footer>
    </div>
  );
}
