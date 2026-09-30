import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  XCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
  ArrowUpRight,
  Globe,
  Play,
  ShieldCheck,
  ListOrdered,
  X
} from "lucide-react";
import { LoadingDots } from "./LoadingDots";
import { RunPulse } from "../motion";
import { TestRun, TestRunResult, RunProgress } from "@proofscale/shared";
import { testExecApi } from "../utils/api";

interface LiveRunMonitorViewProps {
  projectId: string;
  onSelectRun?: (runId: string) => void;
  onNavigateToBuilder?: (planId?: string) => void;
}

const ACTIVE_STATES = ["queued", "starting", "running", "cancelling"];
const TERMINAL_STATES = ["completed", "cancelled", "failed"];

function RunProgressBar({ status, progress }: { status: string; progress?: RunProgress | null }) {
  const duration = progress?.durationSeconds || 1;
  let percent = 0;
  let label = "";
  let barGradient = "bg-signal-indigo";

  if (status === "completed") {
    percent = 100;
    label = "Completed";
    barGradient = "bg-gradient-to-r from-signal-teal to-emerald-400";
  } else if (status === "queued") {
    percent = 5;
    label = "Queued · awaiting worker allocation";
    barGradient = "bg-signal-amber animate-pulse";
  } else if (status === "starting") {
    percent = 10;
    label = "Initializing server-side execution...";
    barGradient = "bg-gradient-to-r from-signal-indigo to-cyan-400 animate-pulse";
  } else if (status === "running") {
    percent = Math.min(98, Math.max(8, Math.round(((progress?.elapsedSeconds || 0) / duration) * 100)));
    label = `Executing server-side load: ${progress?.elapsedSeconds ?? 0}s / ${duration}s elapsed`;
    barGradient = "bg-gradient-to-r from-signal-indigo via-cyan-400 to-signal-teal";
  } else if (status === "cancelling") {
    percent = 100;
    label = "Cancellation requested · stopping workers...";
    barGradient = "bg-signal-amber";
  } else if (status === "cancelled") {
    percent = 100;
    label = "Cancelled by operator";
    barGradient = "bg-white/[0.2]";
  } else if (status === "failed") {
    percent = 100;
    label = "Execution failed";
    barGradient = "bg-signal-rose";
  } else {
    label = status;
  }

  return (
    <div className="space-y-1.5 w-full pt-1.5">
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-text-muted flex items-center gap-1.5">
          {["starting", "running"].includes(status) && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
          )}
          <span className={status === "running" ? "text-cyan-300 font-semibold" : ""}>{label}</span>
        </span>
        {status === "running" && progress && (
          <span className="text-cyan-300 font-bold font-mono">
            {progress.totalRequests} reqs · {progress.currentRps} RPS
          </span>
        )}
      </div>

      <div
        className="w-full h-2.5 rounded-full overflow-hidden p-[1px]"
        style={{ background: "var(--field)", border: "1px solid var(--border)", boxShadow: "var(--inset-shadow)" }}
      >
        <motion.div
          className={`h-full rounded-full ${barGradient}`}
          style={{
            boxShadow: status === "running" ? "0 0 12px rgba(34,211,238,0.7)" : undefined,
            background:
              status === "running"
                ? "linear-gradient(90deg, var(--accent), var(--accent-2), var(--success))"
                : status === "completed"
                ? "linear-gradient(90deg, var(--success), var(--mint))"
                : undefined
          }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

export function LiveRunMonitorView({ projectId, onSelectRun, onNavigateToBuilder }: LiveRunMonitorViewProps) {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [plans, setPlans] = useState<{ id: string; name: string; status: string; environment: string; summary: string }[]>([]);
  const [confirmProdRun, setConfirmProdRun] = useState<{ planId: string; planName: string } | null>(null);
  const [startingPlanId, setStartingPlanId] = useState<string | null>(null);

  const hasActive = runs.some(r => ACTIVE_STATES.includes(r.status));

  // Poll run list while anything is active; otherwise a slower refresh.
  useEffect(() => {
    let cancelled = false;
    const fetchRuns = async () => {
      try {
        const data = await testExecApi.listRuns(projectId);
        if (!cancelled) setRuns(data.runs || []);
      } catch (err: any) {
        if (!cancelled) setActionError(err?.message || "Failed to load runs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchRuns();
    const interval = setInterval(fetchRuns, hasActive ? 1500 : 6000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [projectId, hasActive]);

  // Load plans for the launch section.
  useEffect(() => {
    testExecApi
      .listPlans(projectId)
      .then(({ plans }) =>
        setPlans(
          (plans || [])
            .filter(p => p.status !== "archived")
            .map(p => ({
              id: p.id,
              name: p.name,
              status: p.status,
              environment: p.environment,
              summary: `${p.virtualUsers} VUs · ${p.durationSeconds}s · ${p.maxRequestsPerSecond} RPS max · ${p.requests.filter(r => r.enabled).length}/${p.requests.length} reqs`
            }))
        )
      )
      .catch(() => setPlans([]));
  }, [projectId]);

  const handleLaunchRun = async (planId: string, planName: string, environment: string) => {
    setActionError(null);
    setActionSuccess(null);

    if (environment === "production") {
      setConfirmProdRun({ planId, planName });
      return;
    }

    setStartingPlanId(planId);
    try {
      const { runId } = await testExecApi.startRun(planId);
      setActionSuccess(`Run '${runId}' queued for '${planName}'. Live progress below.`);
    } catch (err: any) {
      setActionError(err?.message || "Failed to launch run.");
    } finally {
      setStartingPlanId(null);
    }
  };

  const handleConfirmProductionRun = async () => {
    if (!confirmProdRun) return;
    setStartingPlanId(confirmProdRun.planId);
    setConfirmProdRun(null);
    try {
      const { runId } = await testExecApi.startRun(confirmProdRun.planId, true);
      setActionSuccess(`Production run '${runId}' queued for '${confirmProdRun.planName}'.`);
    } catch (err: any) {
      setActionError(err?.message || "Failed to launch production run.");
    } finally {
      setStartingPlanId(null);
    }
  };

  const handleCancel = async (runId: string) => {
    setActionError(null);
    try {
      await testExecApi.cancelRun(runId);
      setActionSuccess(`Cancellation requested for run '${runId}'.`);
    } catch (err: any) {
      setActionError(err?.message || "Failed to cancel run.");
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "queued") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-signal-amber-soft text-signal-amber border border-signal-amber/30 inline-flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>Queued</span>
        </span>
      );
    }
    if (["starting", "running"].includes(status)) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-signal-indigo-soft text-signal-indigo border border-signal-indigo/30 inline-flex items-center space-x-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="capitalize">{status}...</span>
        </span>
      );
    }
    if (status === "completed") {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-signal-teal-soft text-signal-teal border border-signal-teal/30 inline-flex items-center space-x-1">
          <CheckCircle2 className="h-3 w-3" />
          <span>Completed</span>
        </span>
      );
    }
    if (["cancelled", "cancelling"].includes(status)) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-white/[0.06] text-text-muted border border-white/[0.08] inline-flex items-center space-x-1">
          <XCircle className="h-3 w-3" />
          <span className="capitalize">{status}</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-signal-rose-soft text-signal-rose border border-signal-rose/30 inline-flex items-center space-x-1">
        <AlertTriangle className="h-3 w-3" />
        <span className="capitalize">{status}</span>
      </span>
    );
  };

  // Latest completed run with a real result drives the metric tiles.
  const metricRun = useMemo(() => runs.find(r => r.result) || null, [runs]);
  const result: TestRunResult | null = metricRun?.result || null;
  const recording = hasActive;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">Test Execution & Live Monitor</h2>
          <p className="text-xs text-text-muted mt-1">
            Start approved plans, watch the backend worker execute them live, and inspect real measured results.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {recording ? (
            <RunPulse label="Server-side load executing" />
          ) : (
            <>
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--success)" }} />
              <span className="text-xs font-mono text-[var(--text-2)]">Live Polling</span>
            </>
          )}
        </div>
      </div>

      {/* Metric tiles — real measured values only; em-dash when no run exists. */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[var(--text-2)] uppercase tracking-wider">p95 Latency</span>
            <Activity className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
          </div>
          <div className="font-mono text-3xl font-bold text-[var(--text-1)] tabular-nums">
            {result ? result.p95LatencyMs : "—"}
            {result && <span className="text-sm text-[var(--text-3)] font-medium"> ms</span>}
          </div>
          <div className="text-[10px] font-mono text-[var(--text-3)]">latest measured run</div>
        </div>

        <div className="glass-panel p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[var(--text-2)] uppercase tracking-wider">Throughput</span>
            <Activity className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
          </div>
          <div className="font-mono text-3xl font-bold text-[var(--text-1)] tabular-nums">
            {result ? result.requestsPerSecond : "—"}
            {result && <span className="text-sm text-[var(--text-3)] font-medium"> RPS</span>}
          </div>
          <div className="text-[10px] font-mono text-[var(--text-3)]">sustained requests/sec</div>
        </div>

        <div className="glass-panel p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[var(--text-2)] uppercase tracking-wider">Error Rate</span>
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: "var(--danger)" }} />
          </div>
          <div
            className={`font-mono text-3xl font-bold tabular-nums ${result && result.errorRatePercent > 5 ? "" : "text-[var(--text-1)]"}`}
            style={result && result.errorRatePercent > 5 ? { color: "var(--danger)" } : undefined}
          >
            {result ? result.errorRatePercent : "—"}
            {result && <span className="text-sm text-[var(--text-3)] font-medium"> %</span>}
          </div>
          <div className="text-[10px] font-mono text-[var(--text-3)]">measured failures / total</div>
        </div>

        <div className="glass-panel p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[var(--text-2)] uppercase tracking-wider">Thresholds</span>
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
          </div>
          <div
            className={`font-mono text-3xl font-bold tabular-nums ${
              !result ? "text-[var(--text-3)]" : result.passed ? "text-signal-teal" : "text-signal-rose"
            }`}
          >
            {result ? (result.passed ? "PASS" : "FAIL") : "—"}
          </div>
          <div className="text-[10px] font-mono text-[var(--text-3)]">
            {result ? `${result.totalRequests} requests recorded` : "no completed run yet"}
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-signal-rose-soft border border-signal-rose/30 text-xs text-signal-rose flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-signal-teal-soft border border-signal-teal/30 text-xs text-signal-teal flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Saved plans quick launch */}
      <div className="glass-panel p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Approved Test Plans ({plans.filter(p => p.status === "approved").length})</h3>
            <p className="text-xs text-text-muted">Only approved plans can start. Create or approve plans in the builder.</p>
          </div>
          {onNavigateToBuilder && (
            <button
              type="button"
              onClick={() => onNavigateToBuilder()}
              className="btn-glass-secondary text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create New Plan</span>
            </button>
          )}
        </div>

        {plans.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-xs text-text-muted font-mono">No test plans found for this project yet.</p>
            {onNavigateToBuilder && (
              <button
                type="button"
                onClick={() => onNavigateToBuilder()}
                className="btn-solid-primary text-xs py-2 px-4 cursor-pointer inline-flex"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                <span>Create Your First Test Plan</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map(plan => (
              <div
                key={plan.id}
                className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--border)] space-y-3 flex flex-col justify-between hover:border-signal-indigo/40 shadow-sm transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-text-primary text-sm truncate">{plan.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border shrink-0 ${
                        plan.status === "approved"
                          ? "bg-signal-teal-soft text-signal-teal border-signal-teal/30"
                          : "bg-signal-amber-soft text-signal-amber border-signal-amber/30"
                      }`}
                    >
                      {plan.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-faint font-mono">{plan.summary}</div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border)]">
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                      plan.environment === "production" ? "text-signal-rose" : "text-text-muted"
                    }`}
                  >
                    {plan.environment}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLaunchRun(plan.id, plan.name, plan.environment)}
                    disabled={plan.status !== "approved" || startingPlanId === plan.id}
                    title={plan.status !== "approved" ? "Approve this plan first" : "Start server-side run"}
                    className="btn-solid-primary text-xs py-2 px-4 cursor-pointer shrink-0 disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>{startingPlanId === plan.id ? "Queueing..." : "Launch Run"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live execution feed */}
      <div className="glass-panel p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Execution Plane Feed</h3>
            <p className="text-xs text-text-muted">Server-side run tracking with live progress and real results</p>
          </div>
          <span className="text-xs font-mono text-text-muted px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
            {runs.length} Runs
          </span>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <LoadingDots size="sm" label="Loading test runs..." />
          </div>
        ) : runs.length === 0 ? (
          <div className="p-12 text-center text-sm text-text-muted font-mono space-y-2">
            <div>No test runs recorded yet.</div>
            <p className="text-xs text-text-faint">
              Click <strong>Launch Run</strong> above to execute a saved plan from the ProofScale worker.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {runs.map(run => {
              const envelope = run.envelope;
              return (
                <div key={run.id} className="data-row py-5 px-2 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-text-primary text-sm">{envelope?.name || run.testPlanId}</h4>
                        {getStatusBadge(run.status)}
                        {envelope && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                              envelope.environment === "production"
                                ? "bg-signal-rose-soft text-signal-rose border-signal-rose/30"
                                : "bg-white/[0.06] text-text-muted border-white/[0.08]"
                            }`}
                          >
                            {envelope.environment}
                          </span>
                        )}
                        {run.result && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              run.result.passed ? "bg-signal-teal-soft text-signal-teal" : "bg-signal-rose-soft text-signal-rose"
                            }`}
                          >
                            {run.result.passed ? "thresholds passed" : "thresholds failed"}
                          </span>
                        )}
                      </div>

                      {envelope && (
                        <div className="flex items-center space-x-2 text-xs font-mono text-signal-teal">
                          <Globe className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-semibold truncate">{envelope.targetBaseUrl}</span>
                        </div>
                      )}

                      {envelope && (
                        <div className="flex items-start space-x-2 text-[11px] text-text-faint font-mono">
                          <ListOrdered className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="truncate">
                            {envelope.requests.map((r, i) => `${i + 1}. ${r.method} ${r.path}`).join(" → ")} ·{" "}
                            {envelope.virtualUsers} VUs
                          </span>
                        </div>
                      )}

                      {run.result && (
                        <p className="text-[10px] text-text-muted font-mono">
                          {run.result.totalRequests} requests · {run.result.successfulRequests} ok ·{" "}
                          {run.result.failedRequests} failed · p50 {run.result.p50LatencyMs}ms · p95{" "}
                          {run.result.p95LatencyMs}ms · p99 {run.result.p99LatencyMs}ms
                        </p>
                      )}

                      {(run.cancelReason || run.failureReason) && (
                        <p
                          className={`text-[10px] font-mono ${run.failureReason ? "text-signal-rose" : "text-signal-amber"}`}
                        >
                          {run.failureReason ? `Failure: ${run.failureReason}` : `Cancelled: ${run.cancelReason}`}
                        </p>
                      )}

                      <p className="text-[10px] text-text-muted font-mono">
                        Run ID: {run.id} · started{" "}
                        {run.startedAt ? new Date(run.startedAt).toLocaleString() : new Date(run.requestedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      {ACTIVE_STATES.includes(run.status) && (
                        <button
                          onClick={() => handleCancel(run.id)}
                          className="px-3 py-1.5 bg-signal-rose-soft hover:bg-signal-rose/20 text-signal-rose text-xs font-semibold rounded-xl border border-signal-rose/30 transition cursor-pointer"
                        >
                          Cancel Run
                        </button>
                      )}

                      {run.status === "completed" && (
                        <button
                          onClick={() => onSelectRun?.(run.id)}
                          className="btn-solid-primary text-xs py-1.5 px-3.5 cursor-pointer flex items-center gap-1"
                        >
                          <span>View Report</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <RunProgressBar status={run.status} progress={run.progress} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Production confirmation modal */}
      {confirmProdRun && (
        <div
          className="modal-backdrop"
          onClick={e => {
            if (e.target === e.currentTarget) setConfirmProdRun(null);
          }}
        >
          <div className="modal-panel--destructive max-w-md w-full p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-signal-rose-soft border border-signal-rose/30 flex items-center justify-center text-signal-rose shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary text-base">Confirm Production Run</h3>
                  <p className="text-xs text-text-muted">This action generates real traffic.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmProdRun(null)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-[var(--white-fill-sm)] transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-ink-950 border border-signal-rose/30 text-xs font-mono text-text-primary font-semibold">
              {confirmProdRun.planName}
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              You are about to execute load against a <strong className="text-signal-rose">PRODUCTION</strong> target.
              The ProofScale worker will issue real HTTP requests for the configured duration. Confirm to proceed.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmProdRun(null)}
                className="btn-glass-secondary flex-1 justify-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmProductionRun}
                className="btn-destructive flex-1"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Yes, Run on Production</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
