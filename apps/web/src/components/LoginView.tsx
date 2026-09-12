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

  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const handleDemoLogin = async (demoEmail: string, demoRole: string) => {
    const demoPass = "Password123!Secure";
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsSignUp(false);
    setErrorMsg(null);
    setActiveDemo(demoRole);

    try {
      const res = await loginMutation.mutateAsync({
        email: demoEmail,
        password: demoPass
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
    } finally {
      setActiveDemo(null);
    }
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
    <div className="min-h-screen bg-ink-950 text-text-primary flex flex-col justify-between relative">
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
        <div className="glass-panel overflow-hidden border border-slate-300 dark:border-white/[0.12] grid grid-cols-1 md:grid-cols-12 shadow-2xl bg-white dark:bg-ink-950/80">
          
          {/* Left Column: Shield & Security Notice */}
          <div className="md:col-span-5 p-8 bg-slate-50 dark:bg-ink-900/90 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/[0.08] flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold text-black dark:text-signal-indigo bg-slate-200/80 dark:bg-signal-indigo-soft border border-slate-300 dark:border-signal-indigo/20 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-indigo animate-pulse" />
                SECURE IDENTITY PIPELINE
              </div>
              <h2 className="font-display font-bold text-2xl text-black dark:text-white tracking-tight">
                {isSignUp ? "Create your workspace" : "Return to the evidence"}
              </h2>
              <p className="text-black dark:text-text-muted text-xs leading-relaxed font-sans font-medium">
                {isSignUp
                  ? "Register with your work email and password. Your credentials are cryptographically protected with salted scrypt hashing and persisted to Supabase PostgreSQL."
                  : "Sign in to inspect your organization’s declared test envelopes, report archives, and permitted workspace actions."}
              </p>
            </div>

            {/* RateCap Security Shield Feature (Replaces Database Storage Box) */}
            <div className="my-auto py-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative group">
                <div className="absolute -inset-3 bg-gradient-to-r from-signal-indigo via-[#4D51E8] to-signal-teal rounded-3xl blur-xl opacity-25 group-hover:opacity-50 transition duration-500" />
                <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-signal-indigo via-[#4D51E8] to-signal-teal p-[2px] shadow-2xl transition-transform duration-300 group-hover:scale-105">
                  <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-signal-teal shadow-inner">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-14 h-14"
                    >
                      <path
                        d="M12 2L4 5.5V11.5C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11.5V5.5L12 2Z"
                        stroke="url(#shield_left_grad)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="2.5" fill="#2FD4A6" />
                      <defs>
                        <linearGradient id="shield_left_grad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#5B5FEF" />
                          <stop offset="1" stopColor="#2FD4A6" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-display font-bold text-base text-black dark:text-white tracking-tight">
                  RateCap Shield
                </div>
                <div className="font-mono text-[11px] text-slate-700 dark:text-text-muted uppercase tracking-wider font-semibold">
                  Hardened Verification &amp; Load Safety
                </div>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-200/80 dark:bg-black/40 border border-slate-300 dark:border-white/[0.08] text-[10px] font-mono text-black dark:text-signal-teal font-bold shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-signal-teal shrink-0" />
                <span>DUAL-SCOPE RBAC &amp; HSTS ACTIVE</span>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Form */}
          <div className="md:col-span-7 p-8 sm:p-10 space-y-6 bg-white dark:bg-ink-950/60">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] text-black dark:text-signal-indigo font-bold uppercase tracking-wider">
                  {isSignUp ? "NEW ACCOUNT" : "AUTHENTICATION"}
                </span>
                <h1 className="font-display font-bold text-2xl sm:text-3xl text-black dark:text-white tracking-tight mt-1">
                  {isSignUp ? "Sign Up" : "Sign In"}
                </h1>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-ink-900 border-2 border-slate-300 dark:border-white/[0.08] text-xs font-mono shadow-sm">
                <button
                  type="button"
                  onClick={() => handleToggleMode(false)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                    !isSignUp ? "bg-slate-950 text-white dark:bg-signal-indigo dark:text-white shadow" : "text-black hover:text-slate-800 dark:text-text-muted dark:hover:text-text-primary"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMode(true)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                    isSignUp ? "bg-slate-950 text-white dark:bg-signal-indigo dark:text-white shadow" : "text-black hover:text-slate-800 dark:text-text-muted dark:hover:text-text-primary"
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
                <label className="block text-xs font-mono text-black dark:text-slate-200 font-bold mb-1.5 uppercase tracking-wide">
                  Email ID *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-black dark:text-text-faint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="you@company.dev"
                    required
                    className={`w-full rounded-xl bg-white dark:bg-ink-900 text-black dark:text-white font-semibold placeholder:text-slate-500 dark:placeholder:text-slate-400 border-2 border-slate-300 focus:border-black dark:border-white/15 dark:focus:border-signal-indigo pl-11 pr-4 py-2.5 outline-none transition shadow-sm ${
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
                  <label className="block text-xs font-mono text-black dark:text-slate-200 font-bold mb-1.5 uppercase tracking-wide">
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-black dark:text-text-faint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="w-full rounded-xl bg-white dark:bg-ink-900 text-black dark:text-white font-semibold placeholder:text-slate-500 dark:placeholder:text-slate-400 border-2 border-slate-300 focus:border-black dark:border-white/15 dark:focus:border-signal-indigo pl-11 pr-4 py-2.5 outline-none transition shadow-sm"
                    />
                  </div>
                </div>
              )}

              {/* Password Input */}
              <div>
                <label className="block text-xs font-mono text-black dark:text-slate-200 font-bold mb-1.5 uppercase tracking-wide">
                  Password *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-black dark:text-text-faint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder={isSignUp ? "Minimum 10 characters" : "Enter your password"}
                    required
                    className="w-full rounded-xl bg-white dark:bg-ink-900 text-black dark:text-white font-semibold placeholder:text-slate-500 dark:placeholder:text-slate-400 border-2 border-slate-300 focus:border-black dark:border-white/15 dark:focus:border-signal-indigo pl-11 pr-4 py-2.5 outline-none transition shadow-sm"
                  />
                </div>
                {isSignUp && password.length > 0 && !isPasswordLongEnough && (
                  <p className="text-[11px] text-signal-amber font-mono mt-1 font-bold">
                    Password must be at least 10 characters long
                  </p>
                )}
              </div>

              {/* Confirm Password (Only on Sign Up) */}
              {isSignUp && (
                <div>
                  <label className="block text-xs font-mono text-black dark:text-slate-200 font-bold mb-1.5 uppercase tracking-wide">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-black dark:text-text-faint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="Re-enter your password"
                      required
                      className={`w-full rounded-xl bg-white dark:bg-ink-900 text-black dark:text-white font-semibold placeholder:text-slate-500 dark:placeholder:text-slate-400 border-2 border-slate-300 focus:border-black dark:border-white/15 dark:focus:border-signal-indigo pl-11 pr-4 py-2.5 outline-none transition shadow-sm ${
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
                className="w-full py-3.5 px-6 rounded-xl font-display font-bold text-sm transition-all duration-200 cursor-pointer justify-center flex items-center gap-2 mt-3 shadow-lg disabled:cursor-not-allowed bg-slate-950 hover:bg-black text-white dark:bg-signal-indigo dark:hover:bg-signal-indigo/90 dark:text-white border-2 border-slate-950 dark:border-signal-indigo disabled:bg-slate-200 disabled:text-black disabled:border-2 disabled:border-slate-800 disabled:opacity-100"
              >
                {isSubmitting ? (
                  <LoadingDots size="sm" label={isSignUp ? "Creating account in Supabase..." : "Verifying credentials..."} />
                ) : (
                  <>
                    <span className="font-bold">{isSignUp ? "Create Account & Continue" : "Sign In"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative text-center pt-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300 dark:border-white/[0.08]" />
              </div>
              <span className="relative px-3 bg-white dark:bg-ink-950 font-mono text-[10px] text-black dark:text-text-faint uppercase tracking-wider font-bold border border-slate-300 dark:border-transparent rounded-full">
                Quick Demo Identities
              </span>
            </div>

            {/* Quick Demo Role Cards */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoLogin("lead@acme.dev", "owner")}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-ink-900/70 border-2 border-slate-300 dark:border-white/[0.08] hover:border-black dark:hover:border-signal-indigo/70 hover:bg-slate-100 dark:hover:bg-signal-indigo/5 text-left transition cursor-pointer group disabled:opacity-50 shadow-sm"
              >
                {activeDemo === "owner" ? (
                  <div className="py-2 flex items-center justify-center">
                    <LoadingDots size="sm" label="Entering as Org Owner..." />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="font-display font-semibold text-xs text-black dark:text-text-primary flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-signal-indigo" />
                        <span>Org Owner</span>
                      </div>
                      <span className="text-[9px] font-mono text-signal-indigo opacity-0 group-hover:opacity-100 transition">
                        1-Click →
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-slate-950 dark:text-text-muted mt-1 truncate font-bold">lead@acme.dev</p>
                    <div className="mt-1.5 flex items-center gap-1 text-[9px] font-mono text-slate-700 dark:text-text-faint font-medium">
                      <KeyRound className="w-2.5 h-2.5 text-signal-indigo" />
                      <span>Password123!Secure</span>
                    </div>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoLogin("qa.tester@acme.dev", "tester")}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-ink-900/70 border-2 border-slate-300 dark:border-white/[0.08] hover:border-black dark:hover:border-signal-teal/70 hover:bg-slate-100 dark:hover:bg-signal-teal/5 text-left transition cursor-pointer group disabled:opacity-50 shadow-sm"
              >
                {activeDemo === "tester" ? (
                  <div className="py-2 flex items-center justify-center">
                    <LoadingDots size="sm" label="Entering as QA Tester..." />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="font-display font-semibold text-xs text-black dark:text-text-primary flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-signal-teal" />
                        <span>QA Tester</span>
                      </div>
                      <span className="text-[9px] font-mono text-signal-teal opacity-0 group-hover:opacity-100 transition">
                        1-Click →
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-slate-950 dark:text-text-muted mt-1 truncate font-bold">qa.tester@acme.dev</p>
                    <div className="mt-1.5 flex items-center gap-1 text-[9px] font-mono text-slate-700 dark:text-text-faint font-medium">
                      <KeyRound className="w-2.5 h-2.5 text-signal-teal" />
                      <span>Password123!Secure</span>
                    </div>
                  </>
                )}
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
