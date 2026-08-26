import React from "react";
import { trpc } from "../utils/trpc";
import { Activity, XCircle, Clock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface LiveRunMonitorViewProps {
  projectId: string;
  onSelectRun?: (runId: string) => void;
}

export function LiveRunMonitorView({ projectId, onSelectRun }: LiveRunMonitorViewProps) {
  const runsQuery = trpc.runs.listByProject.useQuery({ projectId }, { refetchInterval: 2000 });
  const cancelMutation = trpc.runs.cancel.useMutation();

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
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Queued</span>
          </span>
        );
      case "starting":
      case "running":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center space-x-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="capitalize">{status}...</span>
          </span>
        );
      case "completed":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Completed</span>
          </span>
        );
      case "cancelled":
      case "cancelling":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center space-x-1">
            <XCircle className="h-3 w-3" />
            <span className="capitalize">{status}</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3" />
            <span className="capitalize">{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Test Run Execution Monitor</h2>
        <p className="text-sm text-slate-400">
          Track real-time status transitions, worker lease heartbeats, and live execution timelines.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Activity className="h-5 w-5 text-indigo-400" />
            <span>Recent & Active Execution Runs</span>
          </h3>
          <span className="text-xs text-slate-500">Auto-refreshing every 2s</span>
        </div>

        {runsQuery.isLoading ? (
          <div className="text-xs text-slate-400">Loading run status...</div>
        ) : runsQuery.data?.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">No test runs executed yet.</div>
        ) : (
          <div className="space-y-3">
            {runsQuery.data?.map(run => (
              <div
                key={run.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-slate-200 text-sm">{run.planName}</span>
                    {getStatusBadge(run.status)}
                    {run.score !== null && (
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        Score: {run.score}/100
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400">
                    Target: <span className="font-mono text-slate-300">{run.targetBaseUrl}</span> | Version: {run.targetVersionLabel} | Region: {run.region}
                  </p>

                  {run.summaryMetrics && (
                    <div className="text-[11px] text-slate-500 space-x-3 pt-1">
                      <span>Requests: <strong>{run.summaryMetrics.totalRequests}</strong></span>
                      <span>RPS: <strong>{run.summaryMetrics.throughputRps}</strong></span>
                      <span>p95: <strong>{run.summaryMetrics.p95Ms}ms</strong></span>
                      <span>Error Rate: <strong>{(run.summaryMetrics.errorRate * 100).toFixed(2)}%</strong></span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  {["queued", "starting", "running"].includes(run.status) && (
                    <button
                      onClick={() => handleCancel(run.id)}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium rounded-lg border border-red-500/30 transition"
                    >
                      Cancel Run
                    </button>
                  )}

                  <button
                    onClick={() => onSelectRun?.(run.id)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
                  >
                    View Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
