import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { Target, Flag, Play } from "lucide-react";
import { LoadingDots } from "./LoadingDots";

interface BaselineViewProps {
  testPlanId: string;
}

export function BaselineView({ testPlanId }: BaselineViewProps) {
  const baselineQuery = trpc.baselines.getActive.useQuery({ testPlanId });
  const revokeMutation = trpc.baselines.revoke.useMutation();

  const handleRevoke = async () => {
    try {
      await revokeMutation.mutateAsync({ planId: testPlanId });
      baselineQuery.refetch();
    } catch (err: any) {
      alert("Failed to revoke: " + err.message);
    }
  };

  if (baselineQuery.isLoading) return <LoadingDots size="sm" />;

  const baseline = baselineQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Flag className="w-4 h-4 text-signal-amber" />
          <span>Active Baseline</span>
        </h3>
      </div>

      {!baseline ? (
        <div className="text-xs text-text-muted">
          No baseline configured. Run this plan, and promote a successful run from the run detail page to establish a baseline.
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-signal-amber/30 bg-signal-amber/5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary">Run: {baseline.runId.slice(0, 12)}...</span>
            <span className="text-[10px] font-mono text-text-muted">Promoted {new Date(baseline.promotedAt).toLocaleDateString()}</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <div>
              <div className="text-text-muted">Score</div>
              <div className="font-semibold text-text-primary">{baseline.run.score ?? "N/A"}</div>
            </div>
            <div>
              <div className="text-text-muted">p95</div>
              <div className="font-semibold text-text-primary">{baseline.run.summaryMetrics?.p95Ms ?? "N/A"} ms</div>
            </div>
            <div>
              <div className="text-text-muted">Error Rate</div>
              <div className="font-semibold text-text-primary">{((baseline.run.summaryMetrics?.errorRate ?? 0) * 100).toFixed(2)}%</div>
            </div>
          </div>

          <button 
            onClick={handleRevoke}
            className="self-end px-3 py-1.5 bg-signal-rose/10 text-signal-rose text-xs font-semibold rounded-lg"
          >
            Revoke Baseline
          </button>
        </div>
      )}
    </div>
  );
}
