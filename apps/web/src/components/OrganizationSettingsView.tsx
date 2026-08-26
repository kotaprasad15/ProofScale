import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { Building2, Users, UserPlus, Shield, Copy, Check, AlertCircle, CheckCircle2, UserCheck, X } from "lucide-react";
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
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Organization Administration</h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage organization members, assign dual-scope roles, and approve tester access requests.
          </p>
        </div>

        <button
          onClick={() => { setShowInviteModal(true); setGeneratedInviteToken(null); }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5"
        >
          <UserPlus className="h-4 w-4" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center space-x-3 border-b border-slate-800">
        <button
          onClick={() => setActiveSubTab("members")}
          className={`pb-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition ${
            activeSubTab === "members" ? "text-indigo-400 border-indigo-500" : "text-slate-400 border-transparent hover:text-slate-200"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Active Members ({membersQuery.data?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("requests")}
          className={`pb-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition ${
            activeSubTab === "requests" ? "text-indigo-400 border-indigo-500" : "text-slate-400 border-transparent hover:text-slate-200"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Access Requests ({requestsQuery.data?.length || 0})</span>
        </button>
      </div>

      {/* Active Members Table */}
      {activeSubTab === "members" && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-sm">Organization Members</h3>

          <div className="divide-y divide-slate-800">
            {membersQuery.data?.map(m => (
              <div key={m.id} className="py-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-slate-200">{m.userEmail}</span>
                  <p className="text-[11px] text-slate-500 font-mono">User ID: {m.userId}</p>
                </div>

                <div className="flex items-center space-x-3">
                  <select
                    value={m.role}
                    onChange={e => handleRoleChange(m.id, e.target.value as OrgRole)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="tester">Tester</option>
                  </select>

                  <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-sm">Pending Tester Access Requests</h3>

          {requestsQuery.data?.length === 0 ? (
            <div className="text-xs text-slate-500 py-4">No pending tester access requests.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {requestsQuery.data?.map(r => (
                <div key={r.id} className="py-3.5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-slate-200">{r.userEmail}</span>
                    <p className="text-xs text-slate-400">{r.message || "Requested tester access"}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleApproveRequest(r.id)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition"
                    >
                      Approve Tester
                    </button>
                    <button
                      onClick={() => handleDenyRequest(r.id)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
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

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Invite Organization Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {errorMsg}
              </div>
            )}

            {!generatedInviteToken ? (
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Member Email Address *</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Role Assignment</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as OrgRole)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="admin">Admin (Can manage projects and members)</option>
                    <option value="member">Member (Standard project access)</option>
                    <option value="tester">Tester (Execute tests and view reports)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={inviteMemberMutation.isPending}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition shadow-lg shadow-indigo-600/30"
                >
                  {inviteMemberMutation.isPending ? "Generating Invitation..." : "Generate Invitation Token"}
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Invitation created! Share this secure token with <strong className="text-slate-200">{inviteEmail}</strong>:
                </p>

                <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-mono text-indigo-300 truncate mr-2">{generatedInviteToken}</span>
                  <button
                    onClick={copyInvite}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shrink-0 flex items-center space-x-1"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>

                <button
                  onClick={() => { setShowInviteModal(false); setGeneratedInviteToken(null); setInviteEmail(""); }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl"
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
