import React from "react";
import { trpc } from "../utils/trpc";
import { Activity, XCircle, Clock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { LoadingDots } from "./LoadingDots";

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

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">Live Test Execution Monitor</h2>
          <p className="text-xs text-text-muted mt-1">
            Real-time feed of worker queue state machines, active runner heartbeats, and completed test runs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-signal-teal animate-ping" />
          <span className="text-xs font-mono text-text-muted">Live Polling (2s)</span>
        </div>
      </div>

      {/* Runs Table / Feed */}
      <div className="glass-panel p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-semibold text-text-primary">Execution Plane Feed</h3>

        {runsQuery.isLoading ? (
          <div className="p-8 flex justify-center">
            <LoadingDots size="sm" label="Loading test runs..." />
          </div>
        ) : runsQuery.data?.length === 0 ? (
          <div className="p-12 text-center text-sm text-text-muted font-mono">
            No test runs recorded for this project yet.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {runsQuery.data?.map(r => (
              <div key={r.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-text-primary text-sm">{r.planName}</span>
                    {getStatusBadge(r.status)}
                    <span className="text-xs text-text-muted font-mono">{r.targetVersionLabel}</span>
                  </div>
                  <p className="text-xs text-text-muted font-mono truncate">
                    Target: {r.targetBaseUrl} · Worker: {(r as any).leaseWorkerId || "local-worker"}
                  </p>
                </div>

                <div className="flex items-center space-x-4">
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
                        className="btn-solid-primary text-xs py-1.5 px-3.5 cursor-pointer"
                      >
                        View Report
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
