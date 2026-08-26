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
        <h2 className="text-2xl font-bold text-white tracking-tight">Target Endpoint Registration</h2>
        <p className="text-sm text-slate-400">
          Register application HTTP/API targets, set environment labels, and verify testing authorization.
        </p>
      </div>

      {/* Registration Form */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
        <h3 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
          <Plus className="h-5 w-5 text-indigo-400" />
          <span>Register New Target</span>
        </h3>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Base Target URL *</label>
              <input
                type="text"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="http://localhost:4000"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Health Check Endpoint (Optional)</label>
              <input
                type="text"
                value={healthUrl}
                onChange={e => setHealthUrl(e.target.value)}
                placeholder="http://localhost:4000/health"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Environment Profile</label>
            <select
              value={environment}
              onChange={e => setEnvironment(e.target.value as any)}
              className="w-full md:w-64 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="staging">Staging</option>
              <option value="development">Development</option>
              <option value="production">Production</option>
            </select>
          </div>

          {/* Authorization Checkbox */}
          <div className="p-4 rounded-xl bg-indigo-900/20 border border-indigo-500/20 space-y-2">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={authAcknowledged}
                onChange={e => setAuthAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-300">
                <span className="font-semibold text-indigo-300 block mb-0.5">Authorization Acknowledgement</span>
                I confirm that I am authorized to execute controlled load validation checks against this target URL and that this target complies with platform acceptable use policies.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={createTargetMutation.isPending}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{createTargetMutation.isPending ? "Validating Target..." : "Register & Verify Target"}</span>
          </button>
        </form>
      </div>

      {/* Registered Targets List */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Target className="h-5 w-5 text-indigo-400" />
          <span>Registered Endpoints</span>
        </h3>

        {targetsQuery.isLoading ? (
          <div className="p-6 flex justify-center">
            <LoadingDots size="sm" label="Loading target endpoints..." />
          </div>
        ) : (
          <div className="space-y-3">
            {targetsQuery.data?.map(target => (
              <div key={target.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-semibold text-indigo-300">{target.baseUrl}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{target.authorizationStatus}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Allowed Host: <span className="font-mono text-slate-400">{target.allowedHost}</span> | Env: {target.environment}</p>
                </div>
                <span className="text-xs text-slate-500 font-mono">ID: {target.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
