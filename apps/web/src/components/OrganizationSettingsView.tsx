import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { Building2, Users, UserPlus, Shield, Copy, Check, AlertCircle, CheckCircle2, UserCheck, X, UserCog, Trash2 } from "lucide-react";
import { OrgRole } from "@proofscale/shared";

interface OrganizationSettingsViewProps {
  organizationId: string;
}

export function OrganizationSettingsView({ organizationId }: OrganizationSettingsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"members" | "requests">("members");

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [generatedInviteToken, setGeneratedInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const membersQuery = trpc.organizations.listMembers.useQuery();
  const requestsQuery = trpc.accessRequests.listForReview.useQuery();

  const inviteMemberMutation = trpc.organizations.inviteMember.useMutation();
  const changeRoleMutation = trpc.organizations.changeMemberRole.useMutation();
  const approveRequestMutation = trpc.accessRequests.approve.useMutation();
  const denyRequestMutation = trpc.accessRequests.deny.useMutation();
  const transferOwnershipMutation = trpc.organizations.transferOwnership.useMutation();

  // Danger zone state
  const [transferUserId, setTransferUserId] = useState<string>("");
  const [transferConfirm, setTransferConfirm] = useState(false);

  const handleTransferOwnership = async () => {
    if (!transferUserId) return;
    try {
      await transferOwnershipMutation.mutateAsync({ newOwnerUserId: transferUserId });
      setTransferConfirm(false);
      setTransferUserId("");
      membersQuery.refetch();
    } catch (err: any) {
      alert(err?.message || "Failed to transfer ownership.");
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await inviteMemberMutation.mutateAsync({
        organizationId,
        email: inviteEmail,
        role: inviteRole
      });
      setGeneratedInviteToken(res.rawToken);
      membersQuery.refetch();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create invitation.");
    }
  };

  const handleRoleChange = async (memberId: string, newRole: OrgRole) => {
    try {
      await changeRoleMutation.mutateAsync({ organizationId, memberId, newRole });
      membersQuery.refetch();
    } catch (err: any) {
      alert(err?.message || "Failed to update member role.");
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await approveRequestMutation.mutateAsync({ requestId, role: "tester" });
      requestsQuery.refetch();
      membersQuery.refetch();
    } catch (err: any) {
      alert(err?.message || "Failed to approve request.");
    }
  };

  const handleDenyRequest = async (requestId: string) => {
    try {
      await denyRequestMutation.mutateAsync({ requestId });
      requestsQuery.refetch();
    } catch (err: any) {
      alert(err?.message || "Failed to deny request.");
    }
  };

  const copyInvite = () => {
    if (generatedInviteToken) {
      navigator.clipboard.writeText(generatedInviteToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">Organization Administration</h2>
          <p className="text-xs text-text-muted mt-1">
            Manage organization members, assign dual-scope roles, and approve tester access requests.
          </p>
        </div>

        <button
          onClick={() => { setShowInviteModal(true); setGeneratedInviteToken(null); }}
          className="btn-solid-primary"
        >
          <UserPlus className="h-4 w-4" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center space-x-6 border-b border-white/[0.08]">
        <button
          onClick={() => setActiveSubTab("members")}
          className={`pb-3 text-xs font-semibold inline-flex items-center space-x-1.5 border-b-2 -mb-px transition cursor-pointer ${
            activeSubTab === "members" ? "text-signal-indigo border-signal-indigo" : "text-text-muted border-transparent hover:text-text-primary"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Active Members ({membersQuery.data?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("requests")}
          className={`pb-3 text-xs font-semibold inline-flex items-center space-x-1.5 border-b-2 -mb-px transition cursor-pointer ${
            activeSubTab === "requests" ? "text-signal-indigo border-signal-indigo" : "text-text-muted border-transparent hover:text-text-primary"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Access Requests ({requestsQuery.data?.length || 0})</span>
        </button>
      </div>

      {/* Active Members Table */}
      {activeSubTab === "members" && (
        <div className="glass-panel p-6 space-y-4">
          <h3 className="font-bold text-text-primary text-sm">Organization Members</h3>

          <div className="divide-y divide-white/[0.06]">
            {membersQuery.data?.map(m => (
              <div
                key={m.id}
                className="data-row py-3.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                style={{ "--accent": "#2FD4A6" } as React.CSSProperties}
              >
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-text-primary">{m.userEmail}</span>
                  <p className="text-[11px] text-text-muted font-mono">User ID: {m.userId}</p>
                </div>

                <div className="flex items-center space-x-3">
                  <select
                    value={m.role}
                    onChange={e => handleRoleChange(m.id, e.target.value as OrgRole)}
                    className="px-2.5 py-1.5 rounded-xl bg-ink-900 border border-white/[0.1] text-xs font-semibold text-text-primary focus:outline-none focus:border-signal-indigo"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="tester">Tester</option>
                  </select>

                  <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-mono font-bold bg-signal-teal-soft text-signal-teal border border-signal-teal/30">
                    {m.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Access Requests Table */}
      {activeSubTab === "requests" && (
        <div className="glass-panel p-6 space-y-4">
          <h3 className="font-bold text-text-primary text-sm">Pending Tester Access Requests</h3>

          {requestsQuery.data?.length === 0 ? (
            <div className="text-xs text-text-muted py-4 font-mono">No pending tester access requests.</div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {requestsQuery.data?.map(r => (
                <div key={r.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-text-primary">{r.userEmail}</span>
                    <p className="text-xs text-text-muted">{r.message || "Requested tester access"}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleApproveRequest(r.id)}
                      className="px-3 py-1.5 bg-signal-teal hover:bg-emerald-400 text-ink-950 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Approve Tester
                    </button>
                    <button
                      onClick={() => handleDenyRequest(r.id)}
                      className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-text-muted hover:text-text-primary text-xs font-semibold rounded-xl border border-white/[0.08] transition cursor-pointer"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Danger Zone (brutalist) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-signal-rose uppercase tracking-wider">Danger zone</span>
          <span className="flex-1 h-px bg-signal-rose/30" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Transfer ownership (real mutation) */}
          <div className="brutalist p-5 space-y-3">
            <div className="flex items-center gap-2 text-signal-rose uppercase tracking-wider text-xs font-bold">
              <UserCog className="w-4 h-4" />
              <span>Transfer ownership</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Hand the organization to another active member. You will be demoted to Admin.
            </p>

            {!transferConfirm ? (
              <button
                type="button"
                onClick={() => setTransferConfirm(true)}
                className="w-full py-2.5 px-3 text-signal-rose text-xs font-bold uppercase tracking-wider border-2 border-signal-rose rounded-md hover:bg-signal-rose/10 transition cursor-pointer"
              >
                Begin transfer
              </button>
            ) : (
              <div className="space-y-2">
                <select
                  value={transferUserId}
                  onChange={e => setTransferUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-ink-950 border border-white/[0.12] text-xs text-text-primary focus:outline-none focus:border-signal-rose"
                >
                  <option value="">Select new owner…</option>
                  {membersQuery.data?.filter(m => m.role !== "owner").map(m => (
                    <option key={m.id} value={m.userId}>
                      {m.userEmail}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTransferConfirm(false)}
                    className="flex-1 py-2 px-3 bg-white/[0.06] text-text-primary text-xs font-bold uppercase rounded-md border border-white/[0.1] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleTransferOwnership}
                    disabled={!transferUserId || transferOwnershipMutation.isPending}
                    className="flex-1 py-2 px-3 bg-signal-rose text-white text-xs font-bold uppercase rounded-md transition cursor-pointer disabled:opacity-50"
                  >
                    {transferOwnershipMutation.isPending ? "Transferring…" : "Confirm"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Remove member (not yet exposed via API) */}
          <div className="brutalist p-5 space-y-3">
            <div className="flex items-center gap-2 text-signal-rose uppercase tracking-wider text-xs font-bold">
              <Trash2 className="w-4 h-4" />
              <span>Remove member</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Permanently revoke a member's access to this organization.
            </p>
            <button
              type="button"
              disabled
              title="Member removal is not yet exposed via the API"
              className="w-full py-2.5 px-3 text-text-faint text-xs font-bold uppercase tracking-wider border-2 border-white/[0.1] rounded-md cursor-not-allowed"
            >
              Not yet available
            </button>
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="modal-backdrop">
          <div className="modal-panel max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="font-bold text-text-primary text-base">Invite Organization Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-signal-rose-soft border border-signal-rose/30 text-xs text-signal-rose">
                {errorMsg}
              </div>
            )}

            {!generatedInviteToken ? (
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Member Email Address *</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    required
                    className="field-input field-input--mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Role Assignment</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as OrgRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-ink-900 border border-white/[0.1] text-sm text-text-primary focus:outline-none focus:border-signal-indigo"
                  >
                    <option value="admin">Admin (Can manage projects and members)</option>
                    <option value="member">Member (Standard project access)</option>
                    <option value="tester">Tester (Execute tests and view reports)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={inviteMemberMutation.isPending}
                  className="btn-solid-primary w-full py-3 justify-center"
                >
                  {inviteMemberMutation.isPending ? "Generating Invitation..." : "Generate Invitation Token"}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-text-muted">
                  Invitation created! Share this secure token with <strong className="text-text-primary font-mono">{inviteEmail}</strong>:
                </p>

                <div className="p-3 rounded-xl bg-ink-950 border border-white/[0.1] flex items-center justify-between">
                  <span className="text-xs font-mono text-signal-indigo truncate mr-2">{generatedInviteToken}</span>
                  <button
                    onClick={copyInvite}
                    className="px-3 py-1.5 bg-signal-indigo hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shrink-0 flex items-center space-x-1 cursor-pointer"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>

                <button
                  onClick={() => { setShowInviteModal(false); setGeneratedInviteToken(null); setInviteEmail(""); }}
                  className="w-full py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-text-primary text-xs font-semibold rounded-xl border border-white/[0.08] transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
