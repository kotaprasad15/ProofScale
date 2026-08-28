import React, { useState, useEffect } from "react";
import { trpc } from "../utils/trpc";
import { Activity, XCircle, Clock, CheckCircle2, AlertTriangle, Loader2, Filter, Target, Play, Plus, ChevronRight, Globe, Layers, ArrowUpRight, Timer, Trash2, Edit3, ShieldCheck } from "lucide-react";
import { LoadingDots } from "./LoadingDots";

interface LiveRunMonitorViewProps {
  projectId: string;
  onSelectRun?: (runId: string) => void;
  onNavigateToBuilder?: (planId?: string) => void;
}

function RunProgressBar({
  status,
  startedAt,
  finishedAt,
  createdAt,
  loadProfile
}: {
  status: string;
  startedAt?: string | Date | null;
  finishedAt?: string | Date | null;
  createdAt: string | Date;
  loadProfile?: { virtualUsers: number; durationSeconds: number; rampUpSeconds?: number } | null;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (["queued", "starting", "running"].includes(status)) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const totalDurationSeconds = Math.max(5, (loadProfile?.durationSeconds || 60) + (loadProfile?.rampUpSeconds || 0));

  let percent = 0;
  let label = "";
  let barGradient = "bg-signal-indigo";

  if (status === "completed") {
    percent = 100;
    const startMs = startedAt ? new Date(startedAt).getTime() : new Date(createdAt).getTime();
    const endMs = finishedAt ? new Date(finishedAt).getTime() : (startMs + totalDurationSeconds * 1000);
    const elapsed = Math.max(1, Math.round((endMs - startMs) / 1000));
    label = `Completed · ${elapsed}s / ${totalDurationSeconds}s total execution`;
    barGradient = "bg-gradient-to-r from-signal-teal to-emerald-400";
  } else if (status === "queued") {
    percent = 5;
    label = "Queued in execution pool · Awaiting worker allocation";
    barGradient = "bg-signal-amber animate-pulse";
  } else if (status === "starting") {
    percent = 12;
    label = "Initializing virtual user worker sandbox...";
    barGradient = "bg-gradient-to-r from-signal-indigo to-cyan-400 animate-pulse";
  } else if (status === "running") {
    const startMs = startedAt ? new Date(startedAt).getTime() : new Date(createdAt).getTime();
    const elapsedSec = Math.max(1, Math.floor((now - startMs) / 1000));
    const calculatedPercent = Math.min(96, Math.max(10, Math.round((elapsedSec / totalDurationSeconds) * 100)));
    const remainingSec = Math.max(0, totalDurationSeconds - elapsedSec);
    percent = calculatedPercent;
    label = `Executing Synthetic Load: ${elapsedSec}s / ${totalDurationSeconds}s elapsed (${remainingSec}s remaining)`;
    barGradient = "bg-gradient-to-r from-signal-indigo via-cyan-400 to-signal-teal";
  } else if (status === "cancelled" || status === "cancelling") {
    percent = 100;
    label = "Execution cancelled by operator";
    barGradient = "bg-white/[0.2]";
  } else {
    percent = 100;
    label = "Execution interrupted / failed";
    barGradient = "bg-signal-rose";
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
        <span className={`font-bold font-mono ${status === "completed" ? "text-signal-teal" : status === "running" ? "text-cyan-300" : "text-text-primary"}`}>
          {percent}%
        </span>
      </div>

      <div className="w-full h-2.5 rounded-full bg-ink-950 border border-white/[0.1] overflow-hidden p-[1px] shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barGradient} ${
            status === "running" ? "shadow-[0_0_12px_rgba(6,182,212,0.7)]" : ""
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function LiveRunMonitorView({ projectId, onSelectRun, onNavigateToBuilder }: LiveRunMonitorViewProps) {
  const [selectedTargetFilter, setSelectedTargetFilter] = useState<string>("all");
  const [selectedTargetByPlan, setSelectedTargetByPlan] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Deletion state for plans in monitor view
  const [planToDelete, setPlanToDelete] = useState<{ id: string; name: string } | null>(null);

  const runsQuery = trpc.runs.listByProject.useQuery({ projectId }, { refetchInterval: 2000 });
  const targetsQuery = trpc.targets.listByProject.useQuery({ projectId });
  const testPlansQuery = trpc.testPlans.listByProject.useQuery({ projectId });
  
  const createRunMutation = trpc.runs.create.useMutation();
  const deletePlanMutation = trpc.testPlans.delete.useMutation();
  const cancelMutation = trpc.runs.cancel.useMutation();

  const handleLaunchRun = async (planId: string) => {
    setActionError(null);
    setActionSuccess(null);

    const targetsList = targetsQuery.data || [];
    if (targetsList.length === 0) {
      setActionError("Please register at least one target endpoint in 'Target Endpoints' before launching a test run.");
      return;
    }

    const targetIdToUse = selectedTargetByPlan[planId] || targetsList[0]?.id;
    if (!targetIdToUse) {
      setActionError("Please select a valid target endpoint to execute against.");
      return;
    }

    try {
      const newRun = await createRunMutation.mutateAsync({
        planId,
        targetId: targetIdToUse
      });
      setActionSuccess(`Test run '${newRun.id}' queued successfully! Live progress bar tracking execution...`);
      runsQuery.refetch();
    } catch (err: any) {
      setActionError(err?.message || "Failed to launch test run.");
    }
  };

  const handleConfirmDeletePlan = async () => {
    if (!planToDelete) return;
    setActionError(null);
    try {
      await deletePlanMutation.mutateAsync({
        id: planToDelete.id,
        projectId
      });
      setActionSuccess(`Test plan '${planToDelete.name}' was removed.`);
      setPlanToDelete(null);
      testPlansQuery.refetch();
    } catch (err: any) {
      setActionError(err?.message || "Failed to remove test plan.");
      setPlanToDelete(null);
    }
  };

  const handleCancel = async (runId: string) => {
    try {
      await cancelMutation.mutateAsync({ runId, reason: "Cancelled by user via dashboard monitor" });
      runsQuery.refetch();
    } catch (err: any) {
      alert(err?.message || "Failed to cancel run.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "queued":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-signal-amber-soft text-signal-amber border border-signal-amber/30 inline-flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Queued</span>
          </span>
        );
      case "starting":
      case "running":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-signal-indigo-soft text-signal-indigo border border-signal-indigo/30 inline-flex items-center space-x-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="capitalize">{status}...</span>
          </span>
        );
      case "completed":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-signal-teal-soft text-signal-teal border border-signal-teal/30 inline-flex items-center space-x-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Completed</span>
          </span>
        );
      case "cancelled":
      case "cancelling":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-white/[0.06] text-text-muted border border-white/[0.08] inline-flex items-center space-x-1">
            <XCircle className="h-3 w-3" />
            <span className="capitalize">{status}</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-signal-rose-soft text-signal-rose border border-signal-rose/30 inline-flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3" />
            <span className="capitalize">{status}</span>
          </span>
        );
    }
  };

  // Left-accent bar color for the table-row hover, keyed to run status
  const statusAccent = (status: string): string => {
    switch (status) {
      case "completed":
        return "#2FD4A6";
      case "starting":
      case "running":
        return "#5B5FEF";
      case "queued":
        return "#F0A63A";
      case "failed":
        return "#F2586B";
      default:
        return "#5C6478";
    }
  };

  const allRuns = runsQuery.data || [];
  const targetsList = targetsQuery.data || [];
  const testPlansList = testPlansQuery.data || [];

  // Filter test runs by selected target endpoint
  const filteredRuns = selectedTargetFilter === "all"
    ? allRuns
    : allRuns.filter(r => r.targetId === selectedTargetFilter || r.targetBaseUrl === selectedTargetFilter);

  // Primary metric tiles derive from the freshest run that carries telemetry
  const recording = allRuns.some(r => ["running", "starting"].includes(r.status));
  const metricRun = allRuns.find(r => r.summaryMetrics) || null;
  const sm = metricRun?.summaryMetrics;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">Test Execution & Live Monitor</h2>
          <p className="text-xs text-text-muted mt-1">
            Trigger test runs from your saved plans, track live progress completion, and inspect empirical findings.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {recording ? (
            <>
              <span className="recording-dot" />
              <span className="text-xs font-mono text-signal-rose font-bold uppercase tracking-wider">Recording</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-signal-teal" />
              <span className="text-xs font-mono text-text-muted">Live Polling (2s)</span>
            </>
          )}
        </div>
      </div>

      {/* Primary metric tiles — flat panels, no glass blur, max legibility */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flat-instrument p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">p95 Latency</span>
            <Activity className="w-3.5 h-3.5 text-signal-indigo" />
          </div>
          <div className="font-mono text-3xl font-bold text-text-primary">
            {sm?.p95Ms != null ? sm.p95Ms : "—"}
            <span className="text-sm text-text-faint font-medium"> ms</span>
          </div>
          <div className="text-[10px] font-mono text-text-faint">
            {recording ? "updating in place" : "latest telemetry"}
          </div>
        </div>

        <div className="flat-instrument p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Throughput</span>
            <Activity className="w-3.5 h-3.5 text-signal-teal" />
          </div>
          <div className="font-mono text-3xl font-bold text-text-primary">
            {sm?.throughputRps != null ? sm.throughputRps.toFixed(1) : "—"}
            <span className="text-sm text-text-faint font-medium"> RPS</span>
          </div>
          <div className="text-[10px] font-mono text-text-faint">sustained requests/sec</div>
        </div>

        <div className="flat-instrument p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Error Rate</span>
            <ShieldCheck className="w-3.5 h-3.5 text-signal-rose" />
          </div>
          <div className={`font-mono text-3xl font-bold ${sm && sm.errorRate > 0.05 ? "text-signal-rose" : "text-text-primary"}`}>
            {sm?.errorRate != null ? (sm.errorRate * 100).toFixed(2) : "—"}
            <span className="text-sm text-text-faint font-medium"> %</span>
          </div>
          <div className="text-[10px] font-mono text-text-faint">hard-cap at 5.00%</div>
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

      {/* 1. Saved Test Plans & Quick Execution Triggers */}
      <div className="glass-panel p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Available Saved Test Plans ({testPlansList.length})</h3>
            <p className="text-xs text-text-muted">Select a target endpoint, launch workloads, or edit/remove saved plans</p>
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

        {testPlansQuery.isLoading ? (
          <div className="p-6 flex justify-center">
            <LoadingDots size="sm" label="Loading test plans..." />
          </div>
        ) : testPlansList.length === 0 ? (
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
            {testPlansList.map(plan => {
              const currentTargetId = selectedTargetByPlan[plan.id] || targetsList[0]?.id || "";
              return (
                <div key={plan.id} className="p-4 rounded-2xl bg-ink-950/80 border border-white/[0.06] space-y-3 flex flex-col justify-between hover:border-signal-indigo/30 transition">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="font-bold text-text-primary text-sm truncate">{plan.name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-signal-indigo-soft text-signal-indigo border border-signal-indigo/30 shrink-0">
                          {plan.profile}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        {onNavigateToBuilder && (
                          <button
                            type="button"
                            onClick={() => onNavigateToBuilder(plan.id)}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-signal-indigo-soft hover:text-signal-indigo text-text-muted border border-white/[0.06] transition cursor-pointer"
                            title="Edit this test plan in Builder"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setPlanToDelete({ id: plan.id, name: plan.name })}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-signal-rose-soft hover:text-signal-rose text-text-muted border border-white/[0.06] transition cursor-pointer"
                          title="Remove this test plan"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-text-muted font-mono">
                      <span>{plan.loadProfile?.virtualUsers || 10} VUs</span>
                      <span>·</span>
                      <span>{plan.loadProfile?.durationSeconds || 60}s duration</span>
                      <span>·</span>
                      <span>p95 &lt; {plan.thresholds?.maxP95Ms || 1500}ms</span>
                    </div>

                    {plan.scenarios && plan.scenarios.length > 0 && (
                      <div className="text-[11px] text-text-faint font-mono truncate">
                        Endpoints: {plan.scenarios.map((s: any) => `${s.method} ${s.path}`).join(", ")}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-white/[0.04]">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[10px] font-mono text-text-muted uppercase mb-1">Target Endpoint:</label>
                      <select
                        value={currentTargetId}
                        onChange={e => setSelectedTargetByPlan({ ...selectedTargetByPlan, [plan.id]: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-ink-900 border border-white/[0.1] text-xs font-mono text-text-primary focus:outline-none focus:border-signal-indigo cursor-pointer"
                      >
                        {targetsList.length === 0 ? (
                          <option value="">No targets registered</option>
                        ) : (
                          targetsList.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.baseUrl} ({t.environment})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLaunchRun(plan.id)}
                      disabled={createRunMutation.isPending || targetsList.length === 0}
                      className="btn-solid-primary text-xs py-2 px-4 cursor-pointer shrink-0 sm:self-end disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>Launch Run</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Target Endpoint Filter Bar */}
      <div className="glass-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-xs font-mono text-text-muted">
          <Filter className="h-4 w-4 text-signal-indigo" />
          <span className="uppercase font-bold">Filter Live Runs Feed:</span>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={selectedTargetFilter}
            onChange={e => setSelectedTargetFilter(e.target.value)}
            className="w-full sm:w-72 px-3.5 py-2 rounded-xl bg-ink-900 border border-white/[0.1] text-xs font-mono text-text-primary focus:outline-none focus:border-signal-indigo cursor-pointer"
          >
            <option value="all">All Target Endpoints ({allRuns.length} runs)</option>
            {targetsList.map(t => (
              <option key={t.id} value={t.id}>
                {t.baseUrl} ({t.environment})
              </option>
            ))}
          </select>

          {selectedTargetFilter !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedTargetFilter("all")}
              className="btn-glass-secondary text-xs py-2 px-3 shrink-0 cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* 3. Live Execution Feed with Completion Progress Bar */}
      <div className="glass-panel p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Execution Plane Feed</h3>
            <p className="text-xs text-text-muted">Live workload completion tracking, test scenarios, and readiness grades</p>
          </div>
          <span className="text-xs font-mono text-text-muted px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
            Showing {filteredRuns.length} of {allRuns.length} Runs
          </span>
        </div>

        {runsQuery.isLoading ? (
          <div className="p-8 flex justify-center">
            <LoadingDots size="sm" label="Loading test runs..." />
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="p-12 text-center text-sm text-text-muted font-mono space-y-2">
            <div>No test runs recorded yet.</div>
            <p className="text-xs text-text-faint">
              Click <strong>Launch Run</strong> above to execute a workload against your target endpoint.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filteredRuns.map(r => (
              <div
                key={r.id}
                className="data-row py-5 px-2 space-y-3"
                style={{ "--accent": statusAccent(r.status) } as React.CSSProperties}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Test Plan Name + Status + Profile */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-text-primary text-sm">{r.planName}</h4>
                      {getStatusBadge(r.status)}
                      {r.planProfile && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-signal-indigo-soft text-signal-indigo border border-signal-indigo/30">
                          {r.planProfile}
                        </span>
                      )}
                      <span className="text-xs text-text-muted font-mono">{r.targetVersionLabel}</span>
                    </div>

                    {/* Target Endpoint Name & URL */}
                    <div className="flex items-center space-x-2 text-xs font-mono text-signal-teal">
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-semibold truncate">Target Endpoint: {r.targetBaseUrl}</span>
                      {r.targetEnvironment && (
                        <span className="px-1.5 py-0.2 rounded bg-white/[0.06] text-[10px] text-text-muted">
                          {r.targetEnvironment}
                        </span>
                      )}
                    </div>

                    {/* Scenarios / Endpoints Details */}
                    {r.scenarios && r.scenarios.length > 0 && (
                      <div className="text-[11px] text-text-faint font-mono truncate">
                        Endpoints Tested: {r.scenarios.map((s: any) => `${s.method} ${s.path}`).join(", ")}
                      </div>
                    )}

                    <p className="text-[10px] text-text-muted font-mono">
                      Run ID: {r.id} · Worker: {(r as any).leaseWorkerId || "local-worker"}
                    </p>
                  </div>

                  <div className="flex items-center space-x-4 shrink-0">
                    {r.score !== null && r.score !== undefined && (
                      <div className="text-right">
                        <div className="text-lg font-bold font-mono text-signal-teal">{r.score} / 100</div>
                        <span className="text-[10px] uppercase font-mono text-text-muted">{r.readinessLabel}</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      {["queued", "starting", "running"].includes(r.status) && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          disabled={cancelMutation.isPending}
                          className="px-3 py-1.5 bg-signal-rose-soft hover:bg-signal-rose/20 text-signal-rose text-xs font-semibold rounded-xl border border-signal-rose/30 transition cursor-pointer"
                        >
                          Cancel Run
                        </button>
                      )}

                      {r.status === "completed" && (
                        <button
                          onClick={() => onSelectRun?.(r.id)}
                          className="btn-solid-primary text-xs py-1.5 px-3.5 cursor-pointer flex items-center gap-1"
                        >
                          <span>View Report</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Real-time Completion Progress Bar */}
                <div className="pt-1">
                  <RunProgressBar
                    status={r.status}
                    startedAt={r.startedAt}
                    finishedAt={r.finishedAt}
                    createdAt={r.createdAt}
                    loadProfile={r.loadProfile}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan Removal Confirmation Modal */}
      {planToDelete && (
        <div className="modal-backdrop">
          <div className="modal-panel--destructive max-w-md w-full p-6 space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-signal-rose-soft border border-signal-rose/30 flex items-center justify-center text-signal-rose shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-base">Remove Test Plan?</h3>
                <p className="text-xs text-text-muted">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-ink-950 border border-white/[0.08] text-xs font-mono text-text-primary font-semibold">
              {planToDelete.name}
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Are you sure you want to remove this test plan? Historical test run logs and reports will remain preserved in your archive.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="btn-glass-secondary flex-1 justify-center cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDeletePlan}
                disabled={deletePlanMutation.isPending}
                className="btn-destructive flex-1"
              >
                {deletePlanMutation.isPending ? (
                  <span>Removing...</span>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Yes, Remove Plan</span>
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
