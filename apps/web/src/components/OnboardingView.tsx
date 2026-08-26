import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { Building2, Mail, ShieldAlert, CheckCircle2, ArrowRight, Sparkles, UserPlus } from "lucide-react";

interface OnboardingViewProps {
  onComplete: () => void;
}

export function OnboardingView({ onComplete }: OnboardingViewProps) {
  const [tab, setTab] = useState<"create" | "invite" | "tester">("create");

  // Choice 1: Create Org
  const [orgName, setOrgName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [initialProject, setInitialProject] = useState("Main Staging API");

  // Choice 2: Invite token
  const [inviteToken, setInviteToken] = useState("");

  // Choice 3: Request tester access
  const [requestOrgName, setRequestOrgName] = useState("");
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-slate-100">
      <div className="max-w-xl w-full space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mx-auto flex items-center justify-center text-indigo-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Welcome to ProofScale</h1>
          <p className="text-sm text-slate-400">
            Choose how you would like to start using the application readiness platform.
          </p>
        </div>

        {/* 3 Onboarding Choices Selector */}
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => { setTab("create"); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition flex flex-col items-center space-y-1 ${
              tab === "create" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Create Org</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab("invite"); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition flex flex-col items-center space-y-1 ${
              tab === "invite" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>Accept Invite</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab("tester"); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition flex flex-col items-center space-y-1 ${
              tab === "tester" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>Test an App</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center space-x-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab 1: Create Organization */}
        {tab === "create" && (
          <form onSubmit={handleCreateOrg} className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="space-y-1 mb-2">
              <h3 className="font-bold text-white text-base">Create your Organization Workspace</h3>
              <p className="text-xs text-slate-400">You will become the organization owner with full administrative access.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Organization Name *</label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="e.g. Acme Engineering Corp"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Your Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">First Project Name</label>
              <input
                type="text"
                value={initialProject}
                onChange={e => setInitialProject(e.target.value)}
                placeholder="e.g. Checkout API v2"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={createOrgMutation.isPending}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 disabled:opacity-50 mt-4"
            >
              <span>{createOrgMutation.isPending ? "Creating Workspace..." : "Create Organization & Continue"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* Tab 2: Accept Invite */}
        {tab === "invite" && (
          <form onSubmit={handleAcceptInvite} className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="space-y-1 mb-2">
              <h3 className="font-bold text-white text-base">Accept an Organization Invitation</h3>
              <p className="text-xs text-slate-400">Enter the invitation token or code provided by your organization owner.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Invitation Token / Code *</label>
              <input
                type="text"
                value={inviteToken}
                onChange={e => setInviteToken(e.target.value)}
                placeholder="ps_inv_..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={acceptInviteMutation.isPending}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 disabled:opacity-50 mt-4"
            >
              <span>{acceptInviteMutation.isPending ? "Joining Organization..." : "Accept & Enter Workspace"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* Tab 3: Request Tester Access */}
        {tab === "tester" && (
          <form onSubmit={handleRequestAccess} className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="space-y-1 mb-2">
              <h3 className="font-bold text-white text-base">I'm here to test an application</h3>
              <p className="text-xs text-slate-400">
                To execute load tests, testing permissions must be granted by an organization owner or project owner.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Message to Organization Owner</label>
              <textarea
                value={requestMsg}
                onChange={e => setRequestMsg(e.target.value)}
                placeholder="e.g. Requesting access to execute load verification checks for Staging QA..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={requestAccessMutation.isPending}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 disabled:opacity-50 mt-4"
            >
              <span>{requestAccessMutation.isPending ? "Submitting Request..." : "Request Tester Access"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
