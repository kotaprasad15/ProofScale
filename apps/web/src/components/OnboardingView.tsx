import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { Building2, Mail, ShieldAlert, CheckCircle2, ArrowRight, UserPlus, ShieldCheck } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { PointWave } from "./PointWave";
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
    <main className="onboarding-page">
      <PointWave className="onboarding-wave" />

      <header className="onboarding-header">
        <BrandLogo />
        <span className="text-xs font-mono text-[#74778A] font-bold">SETUP WIZARD</span>
      </header>

      <div className="onboarding-content">
        <div className="onboarding-panel">
          <span className="eyebrow">ProofScale Workspace Setup</span>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight mt-2 mb-3">
            Welcome to ProofScale
          </h1>
          <p className="text-sm text-[#737687] leading-relaxed mb-6">
            Choose how you want to configure your identity and active workspace.
          </p>

          {/* 3 Choices */}
          <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-canvas border border-cardborder mb-6">
            <button
              type="button"
              onClick={() => {
                setTab("create");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                tab === "create" ? "bg-brand text-white shadow-md" : "text-[#727586] hover:text-ink"
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
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                tab === "invite" ? "bg-brand text-white shadow-md" : "text-[#727586] hover:text-ink"
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
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                tab === "tester" ? "bg-brand text-white shadow-md" : "text-[#727586] hover:text-ink"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>Test App</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 flex items-center gap-2 mb-4">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-[#129B78] flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Tab 1: Create Organization */}
          {tab === "create" && (
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Organization Name *</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Engineering Corp"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-canvas border border-cardborder text-sm text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">Your Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Leah Evans"
                  className="w-full px-4 py-2.5 rounded-xl bg-canvas border border-cardborder text-sm text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">First Project Name</label>
                <input
                  type="text"
                  value={initialProject}
                  onChange={(e) => setInitialProject(e.target.value)}
                  placeholder="e.g. Payment Gateway API"
                  className="w-full px-4 py-2.5 rounded-xl bg-canvas border border-cardborder text-sm text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <button
                type="submit"
                disabled={createOrgMutation.isPending}
                className="w-full py-3.5 bg-brand hover:bg-brand-hover text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 mt-4 cursor-pointer"
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
                <label className="block text-xs font-bold text-ink mb-1.5">Invitation Token / Code *</label>
                <input
                  type="text"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  placeholder="ps_inv_..."
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-canvas border border-cardborder text-sm text-ink font-mono focus:outline-none focus:border-brand"
                />
              </div>

              <button
                type="submit"
                disabled={acceptInviteMutation.isPending}
                className="w-full py-3.5 bg-brand hover:bg-brand-hover text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 mt-4 cursor-pointer"
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
                <label className="block text-xs font-bold text-ink mb-1.5">Message to Organization Owner</label>
                <textarea
                  value={requestMsg}
                  onChange={(e) => setRequestMsg(e.target.value)}
                  placeholder="e.g. Requesting access to execute load verification checks for Staging QA..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-canvas border border-cardborder text-sm text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <button
                type="submit"
                disabled={requestAccessMutation.isPending}
                className="w-full py-3.5 bg-brand hover:bg-brand-hover text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 mt-4 cursor-pointer"
              >
                {requestAccessMutation.isPending ? (
                  <LoadingDots size="sm" />
                ) : (
                  <>
                    <span>Request Tester Access</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
