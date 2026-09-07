import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import {
  Target,
  Plus,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Trash2,
  X,
  AlertTriangle,
  Globe,
  Activity,
  Server,
  ArrowRight
} from "lucide-react";
import { LoadingDots } from "./LoadingDots";

interface TargetRegistrationViewProps {
  projectId: string;
}

export function TargetRegistrationView({ projectId }: TargetRegistrationViewProps) {
  const [baseUrl, setBaseUrl] = useState("http://localhost:4000");
  const [healthUrl, setHealthUrl] = useState("http://localhost:4000/health");
  const [environment, setEnvironment] = useState<"staging" | "production" | "development">("staging");
  const [authAcknowledged, setAuthAcknowledged] = useState(true);
  const [step, setStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Target Removal Confirmation State
  const [targetToDelete, setTargetToDelete] = useState<{ id: string; baseUrl: string } | null>(null);

  const targetsQuery = trpc.targets.listByProject.useQuery({ projectId });
  const createTargetMutation = trpc.targets.create.useMutation();
  const deleteTargetMutation = trpc.targets.delete.useMutation();

  const handleNext = () => {
    if (step === 0 && !baseUrl.trim()) {
      setErrorMsg("Base target URL is required before continuing.");
      return;
    }
    setErrorMsg(null);
    setStep(step + 1);
  };

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
      setStep(0);
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
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              Target Endpoints
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[var(--white-fill-sm)] text-text-muted border border-[var(--border)]">
              {targetsQuery.data?.length || 0} Registered
            </span>
          </div>
          <p className="text-sm text-text-muted">
            Register authorized HTTP/API endpoints, configure environment tiers, and enforce SSRF safety limits.
          </p>
        </div>
      </div>

      {/* Stepped Registration Card */}
      <div className="rounded-2xl bg-ink-900 border border-[var(--border)] p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-signal-indigo/10 text-signal-indigo">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">Register New Target</h3>
              <p className="text-xs text-text-muted">Declare endpoint URL, target environment, and safety clearance</p>
            </div>
          </div>
          <span className="font-mono text-xs text-text-faint uppercase tracking-wider">
            Step {step + 1} of 3
          </span>
        </div>

        {/* Stepper progress indicator */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: "1. Endpoint URL", desc: "Base & health route" },
            { label: "2. Environment", desc: "Deployment tier" },
            { label: "3. Safety Clearance", desc: "Ownership certify" }
          ].map((s, i) => (
            <div
              key={s.label}
              className={`p-3 rounded-xl border transition ${
                i === step
                  ? "bg-signal-indigo/10 border-signal-indigo/30 text-signal-indigo"
                  : i < step
                  ? "bg-[var(--white-fill-sm)] border-signal-teal/30 text-signal-teal"
                  : "bg-[var(--white-fill-sm)] border-[var(--border)] text-text-faint"
              }`}
            >
              <div className="text-xs font-semibold">{s.label}</div>
              <div className="text-[10px] font-mono text-text-muted hidden sm:block">{s.desc}</div>
            </div>
          ))}
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-signal-rose/10 border border-signal-rose/30 text-xs text-signal-rose flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-signal-teal/10 border border-signal-teal/30 text-xs text-signal-teal flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 0 — Endpoint URL */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                  Base Target URL *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-mono text-text-faint">
                    <Globe className="w-4 h-4" />
                  </span>
                  <input
                    type="url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api-staging.example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] focus:border-signal-indigo text-xs font-mono text-text-primary outline-none transition"
                  />
                </div>
                <p className="text-[11px] text-text-faint font-mono mt-1">
                  Target must be an HTTP or HTTPS endpoint resolvable by the worker execution cluster.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">
                  Health Check URL (Optional)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-mono text-text-faint">
                    <Activity className="w-4 h-4" />
                  </span>
                  <input
                    type="url"
                    value={healthUrl}
                    onChange={(e) => setHealthUrl(e.target.value)}
                    placeholder="https://api-staging.example.com/health"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)] focus:border-signal-indigo text-xs font-mono text-text-primary outline-none transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Environment */}
          {step === 1 && (
            <div className="space-y-3">
              <label className="block text-xs font-mono text-text-muted uppercase">
                Select Target Environment Tier
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(["development", "staging", "production"] as const).map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setEnvironment(env)}
                    className={`p-4 rounded-xl text-left border transition cursor-pointer ${
                      environment === env
                        ? "bg-signal-indigo/10 border-signal-indigo text-text-primary shadow-sm"
                        : "bg-[var(--white-fill-sm)] border-[var(--border)] hover:border-[var(--border-strong)] text-text-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-text-primary capitalize">{env}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          env === "production"
                            ? "bg-signal-amber"
                            : env === "staging"
                            ? "bg-signal-indigo"
                            : "bg-signal-teal"
                        }`}
                      />
                    </div>
                    <p className="text-[11px] font-mono text-text-muted">
                      {env === "production"
                        ? "Live production traffic"
                        : env === "staging"
                        ? "Pre-release staging mirror"
                        : "Local / isolated testbed"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Safety Clearance */}
          {step === 2 && (
            <div className="p-5 rounded-2xl bg-signal-indigo/5 border border-signal-indigo/20 space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="authCheck"
                  checked={authAcknowledged}
                  onChange={(e) => setAuthAcknowledged(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded bg-ink-900 border-[var(--border)] text-signal-indigo focus:ring-0 cursor-pointer shrink-0"
                />
                <label
                  htmlFor="authCheck"
                  className="text-xs text-text-muted cursor-pointer select-none leading-relaxed"
                >
                  <strong className="text-text-primary uppercase tracking-wide block mb-1 font-mono">
                    Ownership Authorization & Anti-DDoS Certification
                  </strong>
                  I certify that our organization owns, manages, or possesses explicit written authorization to execute synthetic load tests and burst concurrency checks against <code className="text-signal-indigo font-bold">{baseUrl}</code>.
                </label>
              </div>

              <div className="text-[11px] font-mono text-text-faint p-3 rounded-xl bg-[var(--white-fill-sm)] border border-[var(--border)]">
                Note: RateCap enforces automated SSRF protection and will reject tests targeting internal loopbacks (127.0.0.1, 169.254.169.254) in production mode.
              </div>
            </div>
          )}

          {/* Stepper Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStep(step - 1);
                  setErrorMsg(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--white-fill-sm)] hover:bg-[var(--white-fill-md)] text-text-primary border border-[var(--border)] transition cursor-pointer"
              >
                Back
              </button>
            )}

            {step < 2 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-signal-indigo hover:bg-signal-indigo-hover text-white transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={createTargetMutation.isPending || !authAcknowledged}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-signal-indigo hover:bg-signal-indigo-hover text-white transition cursor-pointer disabled:opacity-50"
              >
                {createTargetMutation.isPending
                  ? "Validating & Registering..."
                  : "Register Target Endpoint"}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Target List Table */}
      <div className="rounded-2xl bg-ink-900 border border-[var(--border)] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Server className="w-4 h-4 text-signal-indigo" />
            <span>Configured Endpoints in Project</span>
          </h3>
          <span className="text-xs font-mono text-text-muted px-2.5 py-0.5 rounded-full bg-[var(--white-fill-sm)] border border-[var(--border)]">
            {targetsQuery.data?.length || 0} Total
          </span>
        </div>

        {targetsQuery.isLoading ? (
          <div className="p-8 flex justify-center">
            <LoadingDots size="sm" label="Loading target endpoints..." />
          </div>
        ) : targetsQuery.data?.length === 0 ? (
          <div className="text-xs text-text-muted font-mono py-8 text-center space-y-2">
            <Target className="w-8 h-8 text-text-faint mx-auto mb-2" />
            <p>No target endpoints registered yet.</p>
            <p className="text-text-faint">Register an endpoint above to begin performance validations.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {targetsQuery.data?.map((t) => (
              <div
                key={t.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-semibold text-text-primary">
                      {t.baseUrl}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-signal-teal/10 text-signal-teal border border-signal-teal/20">
                      {t.authorizationStatus}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[var(--white-fill-sm)] text-text-muted border border-[var(--border)]">
                      {t.environment}
                    </span>
                  </div>
                  {t.healthUrl && (
                    <p className="text-xs text-text-muted font-mono">
                      Health Probe: {t.healthUrl}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetToDelete({ id: t.id, baseUrl: t.baseUrl })}
                    className="p-2 rounded-xl bg-[var(--white-fill-sm)] hover:bg-signal-rose/10 hover:text-signal-rose hover:border-signal-rose/30 text-text-muted border border-[var(--border)] transition cursor-pointer"
                    title="Remove target"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Target Deletion Confirmation Modal */}
      {targetToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setTargetToDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-ink-900 border border-signal-rose/30 p-6 space-y-5 shadow-2xl text-text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-signal-rose/10 border border-signal-rose/25 flex items-center justify-center text-signal-rose shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary text-base">
                    Remove Target Endpoint?
                  </h3>
                  <p className="text-xs text-text-muted">This action is immediate and cannot be undone.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTargetToDelete(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-ink-950 border border-[var(--border)] text-xs font-mono text-text-primary break-all">
              {targetToDelete.baseUrl}
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Test plans referencing this endpoint will be unable to run until re-associated with another verified target.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTargetToDelete(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[var(--white-fill-sm)] hover:bg-[var(--white-fill-md)] text-text-primary border border-[var(--border)] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteTargetMutation.isPending}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-signal-rose hover:bg-signal-rose/90 text-white transition cursor-pointer"
              >
                {deleteTargetMutation.isPending ? "Removing..." : "Confirm Removal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
