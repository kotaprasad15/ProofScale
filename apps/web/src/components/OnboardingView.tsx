import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { Building2, Mail, ShieldAlert, CheckCircle2, ArrowRight, UserPlus, ShieldCheck, ArrowLeft } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { LoadingDots } from "./LoadingDots";

interface OnboardingViewProps {
  onComplete: () => void;
}

export function OnboardingView({ onComplete }: OnboardingViewProps) {
  const [tab, setTab] = useState<"create" | "invite" | "tester">("create");

  // Choice 1: Create Org
  const [orgName, setOrgName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [initialProject, setInitialProject] = useState("Payment Gateway API");

  // Choice 2: Invite token
  const [inviteToken, setInviteToken] = useState("");

  // Choice 3: Request tester access
  const [requestMsg, setRequestMsg] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const createOrgMutation = trpc.auth.createOrganizationOnboarding.useMutation();
  const acceptInviteMutation = trpc.auth.acceptInvitation.useMutation();
  const requestAccessMutation = trpc.auth.requestTesterAccess.useMutation();

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await createOrgMutation.mutateAsync({
        name: orgName,
        displayName: displayName || undefined,
        initialProjectName: initialProject || undefined
      });
      onComplete();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create organization.");
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await acceptInviteMutation.mutateAsync({ token: inviteToken });
      onComplete();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to accept invitation.");
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await requestAccessMutation.mutateAsync({ message: requestMsg });
      setSuccessMsg("Your access request has been submitted! An organization owner will review it.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to submit access request.");
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

      {/* Top Header */}
      <header className="relative z-20 max-w-[1240px] w-full mx-auto px-6 sm:px-12 py-8 flex items-center justify-between">
        <BrandLogo />
        <span className="font-mono text-xs text-text-muted font-medium">SETUP WIZARD · RBAC INITIALIZATION</span>
      </header>

      {/* Main Wizard Form */}
      <main className="relative z-10 max-w-xl w-full mx-auto px-6 sm:px-12 py-6">
        <div className="glass-panel p-8 sm:p-10 border border-white/[0.12] space-y-6 shadow-2xl">
          <div>
            <span className="font-mono text-[10px] text-signal-indigo font-bold uppercase tracking-wider">
              WORKSPACE CONFIGURATION
            </span>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-text-primary tracking-tight mt-1">
              Configure your entry point
            </h1>
            <p className="text-text-muted text-xs sm:text-sm leading-relaxed mt-1 font-sans">
              Choose how you want to configure your identity and active workspace permissions.
            </p>
          </div>

          {/* 3 Choice Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-ink-900/80 border border-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                setTab("create");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-medium transition flex flex-col items-center gap-1 cursor-pointer ${
                tab === "create" ? "bg-signal-indigo text-white shadow" : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Create Org</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab("invite");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-medium transition flex flex-col items-center gap-1 cursor-pointer ${
                tab === "invite" ? "bg-signal-indigo text-white shadow" : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Mail className="h-4 w-4" />
              <span>Accept Invite</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab("tester");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-mono font-medium transition flex flex-col items-center gap-1 cursor-pointer ${
                tab === "tester" ? "bg-signal-indigo text-white shadow" : "text-text-muted hover:text-text-primary"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>Test App</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-signal-rose-soft border border-signal-rose/30 text-xs text-signal-rose flex items-center gap-2 font-mono">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-signal-teal-soft border border-signal-teal/30 text-xs text-signal-teal flex items-center gap-2 font-mono">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Tab 1: Create Organization */}
          {tab === "create" && (
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Engineering Corp"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-900/90 border border-white/[0.1] text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal-indigo"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                  Your Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Leah Evans"
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-900/90 border border-white/[0.1] text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal-indigo"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                  First Project Name
                </label>
                <input
                  type="text"
                  value={initialProject}
                  onChange={(e) => setInitialProject(e.target.value)}
                  placeholder="e.g. Payment Gateway API"
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-900/90 border border-white/[0.1] text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal-indigo"
                />
              </div>

              <button
                type="submit"
                disabled={createOrgMutation.isPending}
                className="btn-solid-primary w-full py-3.5 mt-4 cursor-pointer justify-center"
              >
                {createOrgMutation.isPending ? (
                  <LoadingDots size="sm" />
                ) : (
                  <>
                    <span>Create Organization &amp; Continue</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Tab 2: Accept Invite */}
          {tab === "invite" && (
            <form onSubmit={handleAcceptInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                  Invitation Token / Code *
                </label>
                <input
                  type="text"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  placeholder="ps_inv_..."
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-900/90 border border-white/[0.1] text-sm font-mono text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal-indigo"
                />
              </div>

              <button
                type="submit"
                disabled={acceptInviteMutation.isPending}
                className="btn-solid-primary w-full py-3.5 mt-4 cursor-pointer justify-center"
              >
                {acceptInviteMutation.isPending ? (
                  <LoadingDots size="sm" />
                ) : (
                  <>
                    <span>Accept &amp; Enter Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Tab 3: Request Tester Access */}
          {tab === "tester" && (
            <form onSubmit={handleRequestAccess} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                  Message to Organization Owner
                </label>
                <textarea
                  value={requestMsg}
                  onChange={(e) => setRequestMsg(e.target.value)}
                  placeholder="e.g. Requesting access to execute load verification checks for Staging QA..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-900/90 border border-white/[0.1] text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal-indigo font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={requestAccessMutation.isPending}
                className="btn-solid-primary w-full py-3.5 mt-4 cursor-pointer justify-center"
              >
                {requestAccessMutation.isPending ? (
                  <LoadingDots size="sm" />
                ) : (
                  <>
                    <span>Submit Tester Request</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer Baseline */}
      <footer className="relative z-10 py-6 text-center text-xs font-mono text-text-faint">
        © 2026 Ratecap Instruments · Dual-Scope RBAC Onboarding
      </footer>
    </div>
  );
}
