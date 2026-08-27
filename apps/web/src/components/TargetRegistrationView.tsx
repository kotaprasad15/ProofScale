import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { Target, Plus, ShieldCheck, AlertCircle, CheckCircle2, Trash2, X, AlertTriangle } from "lucide-react";
import { LoadingDots } from "./LoadingDots";

interface TargetRegistrationViewProps {
  projectId: string;
}

export function TargetRegistrationView({ projectId }: TargetRegistrationViewProps) {
  const [baseUrl, setBaseUrl] = useState("http://localhost:4000");
  const [healthUrl, setHealthUrl] = useState("http://localhost:4000/health");
  const [environment, setEnvironment] = useState<"staging" | "production" | "development">("staging");
  const [authAcknowledged, setAuthAcknowledged] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Target Removal Confirmation State
  const [targetToDelete, setTargetToDelete] = useState<{ id: string; baseUrl: string } | null>(null);

  const targetsQuery = trpc.targets.listByProject.useQuery({ projectId });
  const createTargetMutation = trpc.targets.create.useMutation();
  const deleteTargetMutation = trpc.targets.delete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!authAcknowledged) {
      setErrorMsg("You must acknowledge explicit target testing authorization.");
      return;
    }

    try {
      await createTargetMutation.mutateAsync({
        projectId,
        baseUrl,
        healthUrl: healthUrl || undefined,
        environment,
        authorizationAcknowledged: true
      });

      setSuccessMsg(`Target endpoint '${baseUrl}' successfully registered and verified.`);
      targetsQuery.refetch();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to register target URL.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!targetToDelete) return;
    setErrorMsg(null);
    try {
      await deleteTargetMutation.mutateAsync({
        id: targetToDelete.id,
        projectId
      });
      setSuccessMsg(`Target endpoint '${targetToDelete.baseUrl}' was successfully removed.`);
      setTargetToDelete(null);
      targetsQuery.refetch();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to remove target endpoint.");
      setTargetToDelete(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">Target Endpoint Registration</h2>
        <p className="text-xs text-text-muted mt-1">
          Register application HTTP/API targets, set environment labels, and manage authorization status.
        </p>
      </div>

      {/* Registration Form */}
      <div className="glass-panel p-6 sm:p-8 space-y-6">
        <h3 className="text-base font-semibold text-text-primary flex items-center space-x-2">
          <Plus className="h-5 w-5 text-signal-indigo" />
          <span>Register New Target</span>
        </h3>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-signal-rose-soft border border-signal-rose/30 text-xs text-signal-rose flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-signal-teal-soft border border-signal-teal/30 text-xs text-signal-teal flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Base Target URL *</label>
            <input
              type="url"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://api-staging.example.com"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/[0.1] text-sm text-text-primary font-mono focus:outline-none focus:border-signal-indigo"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Health Check URL (Optional)</label>
              <input
                type="url"
                value={healthUrl}
                onChange={e => setHealthUrl(e.target.value)}
                placeholder="https://api-staging.example.com/health"
                className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/[0.1] text-sm text-text-primary font-mono focus:outline-none focus:border-signal-indigo"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Target Environment</label>
              <select
                value={environment}
                onChange={e => setEnvironment(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/[0.1] text-sm text-text-primary focus:outline-none focus:border-signal-indigo"
              >
                <option value="staging">Staging</option>
                <option value="development">Development</option>
                <option value="production">Production</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-ink-950/80 border border-white/[0.06] flex items-start space-x-3">
            <input
              type="checkbox"
              id="authCheck"
              checked={authAcknowledged}
              onChange={e => setAuthAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded bg-ink-900 border-white/[0.2] text-signal-indigo focus:ring-0 cursor-pointer"
            />
            <label htmlFor="authCheck" className="text-xs text-text-muted cursor-pointer select-none">
              <strong className="text-text-primary font-semibold">Ownership Authorization Acknowledgement:</strong> I certify that our organization owns or has explicit written authorization to execute synthetic load tests against this target endpoint.
            </label>
          </div>

          <button
            type="submit"
            disabled={createTargetMutation.isPending}
            className="btn-solid-primary cursor-pointer"
          >
            {createTargetMutation.isPending ? "Validating SSRF & Registering..." : "Register & Verify Target"}
          </button>
        </form>
      </div>

      {/* Target List */}
      <div className="glass-panel p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <h3 className="text-base font-semibold text-text-primary">Registered Target Endpoints</h3>
          <span className="text-xs font-mono text-text-muted px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
            {targetsQuery.data?.length || 0} Total
          </span>
        </div>

        {targetsQuery.isLoading ? (
          <div className="p-6 flex justify-center">
            <LoadingDots size="sm" label="Loading target endpoints..." />
          </div>
        ) : targetsQuery.data?.length === 0 ? (
          <div className="text-xs text-text-muted font-mono py-6 text-center">
            No target endpoints registered yet. Register a target above to begin performance testing.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {targetsQuery.data?.map(t => (
              <div key={t.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm text-text-primary font-semibold">{t.baseUrl}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-signal-teal-soft text-signal-teal border border-signal-teal/30">
                      {t.authorizationStatus}
                    </span>
                  </div>
                  {t.healthUrl && (
                    <p className="text-xs text-text-muted font-mono">Health: {t.healthUrl}</p>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-text-muted text-xs font-mono">
                    {t.environment}
                  </span>

                  {/* Remove Target Button */}
                  <button
                    type="button"
                    onClick={() => setTargetToDelete({ id: t.id, baseUrl: t.baseUrl })}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-signal-rose-soft hover:text-signal-rose hover:border-signal-rose/30 text-text-muted border border-white/[0.06] transition cursor-pointer"
                    title="Remove this target endpoint"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Target Deletion Confirmation Modal */}
      {targetToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-panel max-w-md w-full p-6 space-y-5 border border-white/[0.15] shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-signal-rose-soft border border-signal-rose/30 flex items-center justify-center text-signal-rose shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-base">Remove Target Endpoint?</h3>
                <p className="text-xs text-text-muted">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-ink-950 border border-white/[0.08] text-xs font-mono text-text-primary break-all">
              {targetToDelete.baseUrl}
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Are you sure you want to remove this target endpoint? Test plans will need to point to an active endpoint to execute.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTargetToDelete(null)}
                className="btn-glass-secondary flex-1 justify-center cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteTargetMutation.isPending}
                className="px-4 py-2.5 bg-signal-rose hover:bg-red-600 text-white font-semibold text-xs rounded-xl transition flex-1 justify-center flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-signal-rose/20"
              >
                {deleteTargetMutation.isPending ? (
                  <span>Removing...</span>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Yes, Remove Target</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
