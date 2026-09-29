import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Lock, Mail, AlertTriangle, CheckCircle2, User, ShieldCheck } from "lucide-react";
import { trpc } from "../utils/trpc";
import { DURATION, EASE } from "../motion";

interface LoginViewProps {
  onLogin: (user: { id: string; email: string; organizationId?: string }) => void;
  onBackToHome?: () => void;
  initialMode?: "signin" | "signup";
}

const DEMO_ACCOUNTS = [
  { role: "Owner", email: "owner@demo.dev", desc: "Full workspace control" },
  { role: "Lead", email: "lead@demo.dev", desc: "Plans, targets, baselines" },
  { role: "Tester", email: "tester@demo.dev", desc: "Authorized runs only" },
];

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
      staleTime: 5000,
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
        password: demoPass,
      });

      if (res.success && res.user) {
        onLogin({
          id: res.user.id,
          email: res.user.email,
          organizationId: res.user.lastWorkspaceId || undefined,
        });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Demo sign-in failed.");
      setActiveDemo(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      if (isSignUp) {
        if (!email.trim() || !password || !displayName.trim()) {
          setErrorMsg("All fields are required to create an account.");
          return;
        }
        if (!isPasswordLongEnough) {
          setErrorMsg("Password must be at least 10 characters.");
          return;
        }
        if (!passwordsMatch) {
          setErrorMsg("Passwords do not match.");
          return;
        }
        if (emailExists) {
          setErrorMsg("An account with this email already exists. Sign in instead.");
          return;
        }
        const res = await signupMutation.mutateAsync({
          email: email.trim().toLowerCase(),
          password,
          displayName: displayName.trim(),
        });
        if (res.success && res.user) {
          onLogin({
            id: res.user.id,
            email: res.user.email,
            organizationId: res.user.lastWorkspaceId || undefined,
          });
        }
      } else {
        if (!email.trim() || !password) {
          setErrorMsg("Email and password are required.");
          return;
        }
        const res = await loginMutation.mutateAsync({
          email: email.trim().toLowerCase(),
          password,
        });
        if (res.success && res.user) {
          onLogin({
            id: res.user.id,
            email: res.user.email,
            organizationId: res.user.lastWorkspaceId || undefined,
          });
        } else {
          setErrorMsg("Invalid credentials. Check your email and password.");
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Authentication failed. Please try again.");
    }
  };

  const shake = errorMsg ? { x: [0, -6, 6, -4, 4, 0] } : {};

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-8 relative"
      style={{ background: "transparent" }}
    >
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-0 glass overflow-hidden relative z-10">
        {/* Left brand rail */}
        <div
          className="hidden lg:flex flex-col justify-between p-10 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(160deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, var(--accent-2) 8%, transparent))",
            borderRight: "1px solid var(--glass-border)",
          }}
        >
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[var(--text-2)] hover:text-[var(--text-1)] transition cursor-pointer self-start"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </button>

          <div className="space-y-5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                boxShadow: "var(--glow-accent)",
              }}
            >
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display font-bold text-3xl tracking-tight text-[var(--text-1)] leading-tight">
              Know how your app behaves{" "}
              <span className="text-gradient">before production.</span>
            </h1>
            <p className="text-sm text-[var(--text-2)] leading-relaxed max-w-xs">
              Bounded load validation with deterministic readiness scoring — wrapped in the
              safety rails your operators demand.
            </p>
          </div>

          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">
            RateCap · Readiness Instrument
          </div>
        </div>

        {/* Right form panel */}
        <div className="p-6 sm:p-10 flex flex-col justify-center">
          <button
            type="button"
            onClick={onBackToHome}
            className="lg:hidden inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[var(--text-2)] hover:text-[var(--text-1)] transition cursor-pointer self-start mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          {/* Mode switch */}
          <div className="flex p-1 rounded-xl glass-inset mb-7 relative" role="tablist" aria-label="Authentication mode">
            {(["signin", "signup"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={isSignUp === (mode === "signup")}
                onClick={() => handleToggleMode(mode === "signup")}
                className={`relative flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  isSignUp === (mode === "signup") ? "text-white" : "text-[var(--text-2)] hover:text-[var(--text-1)]"
                }`}
              >
                {isSignUp === (mode === "signup") && (
                  <motion.span
                    layoutId="auth-mode-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: "var(--accent)", boxShadow: "var(--glow-accent)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10">
                  {mode === "signin" ? "Sign In" : "Create Account"}
                </span>
              </button>
            ))}
          </div>

          <motion.form
            onSubmit={handleSubmit}
            animate={shake}
            className="space-y-4"
            key={isSignUp ? "signup" : "signin"}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: DURATION.fast, ease: EASE.out }}
                >
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-1.5">
                    Display name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ada Lovelace"
                      autoComplete="name"
                      className="neo-field !pl-11"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@organization.dev"
                  autoComplete="email"
                  className="neo-field !pl-11"
                />
              </div>
              {emailExists && (
                <p className="mt-1.5 text-[11px] font-mono flex items-center gap-1" style={{ color: "var(--warning)" }}>
                  <AlertTriangle className="w-3 h-3" /> Account exists — try signing in.
                </p>
              )}
              {isSignUp && isValidEmail && !emailExists && checkEmailQuery.isSuccess && (
                <p className="mt-1.5 text-[11px] font-mono flex items-center gap-1" style={{ color: "var(--success)" }}>
                  <CheckCircle2 className="w-3 h-3" /> Email available.
                </p>
              )}
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? "Minimum 10 characters" : "••••••••••••"}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="neo-field !pl-11"
                />
              </div>
            </div>

            <AnimatePresence mode="popLayout" initial={false}>
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: DURATION.fast, ease: EASE.out }}
                >
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-1.5">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      className="neo-field !pl-11"
                    />
                  </div>
                  {!passwordsMatch && (
                    <p className="mt-1.5 text-[11px] font-mono" style={{ color: "var(--danger)" }}>
                      Passwords do not match.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2 p-3 rounded-xl text-xs font-mono"
                  style={{
                    background: "var(--danger-soft)",
                    border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)",
                    color: "var(--danger)",
                  }}
                  role="alert"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full !py-3 justify-center"
            >
                {isSubmitting ? (
                  <motion.span
                    className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                  />
                ) : (
                  <>
                    {isSignUp ? "Create Account" : "Sign In"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
            </button>
          </motion.form>

          {/* Demo accounts */}
          <div className="mt-7 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-3">
              Demo accounts · one-click
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((d) => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => handleDemoLogin(d.email, d.role)}
                  disabled={isSubmitting}
                  className="neo-btn p-3 text-left cursor-pointer disabled:opacity-50"
                >
                  <span className="block text-xs font-semibold" style={{ color: activeDemo === d.role ? "var(--accent)" : "var(--text-1)" }}>
                    {activeDemo === d.role ? "Signing in…" : d.role}
                  </span>
                  <span className="block font-mono text-[9px] text-[var(--text-3)] mt-0.5 truncate">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
