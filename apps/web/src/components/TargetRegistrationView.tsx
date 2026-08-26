import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { Target, Plus, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
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

  const targetsQuery = trpc.targets.listByProject.useQuery({ projectId });
  const createTargetMutation = trpc.targets.create.useMutation();

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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">Target Endpoint Registration</h2>
        <p className="text-xs text-text-muted mt-1">
          Register application HTTP/API targets, set environment labels, and verify testing authorization.
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
        <h3 className="text-base font-semibold text-text-primary">Registered Target Endpoints</h3>

        {targetsQuery.isLoading ? (
          <div className="p-6 flex justify-center">
            <LoadingDots size="sm" label="Loading target endpoints..." />
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

                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-text-muted text-xs font-mono">
                    {t.environment}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
