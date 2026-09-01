import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { ArrowRight, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle } from "lucide-react";
import { LoadingDots } from "./LoadingDots";

interface RunComparisonViewProps {
  projectId: string;
}

export function RunComparisonView({ projectId }: RunComparisonViewProps) {
  const [baselineRunId, setBaselineRunId] = useState<string>("");
  const [currentRunId, setCurrentRunId] = useState<string>("");

  const runsQuery = trpc.runs.listByProject.useQuery({ projectId });
  const completedRuns = runsQuery.data?.filter(r => r.status === "completed") || [];

  const comparisonQuery = trpc.reports.compareRuns.useQuery(
    { baselineRunId, currentRunId },
    { enabled: !!baselineRunId && !!currentRunId }
  );

  const diff = comparisonQuery.data;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">Run-over-Run Performance Comparison</h2>
        <p className="text-xs text-text-muted mt-1">
          Select two completed test runs to compute regression diffs ($\Delta$ Score, $\Delta p95$ Latency, $\Delta$ RPS, $\Delta$ Error Rate).
        </p>
      </div>

      {/* Selectors Grid */}
      <div className="glass-panel p-6 sm:p-8 space-y-6">
        <h3 className="text-sm font-semibold text-text-primary uppercase font-mono">Select Runs for Differential Analysis</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Baseline Run (Previous)</label>
            <select
              value={baselineRunId}
              onChange={e => setBaselineRunId(e.target.value)}
              className="field-input field-input--mono text-xs cursor-pointer"
            >
              <option value="">-- Choose Baseline Run --</option>
              {completedRuns.map(r => (
                <option key={r.id} value={r.id}>
                  {r.planName} ({r.targetVersionLabel}) - Score: {r.score}/100
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5 uppercase">Candidate Run (Current)</label>
            <select
              value={currentRunId}
              onChange={e => setCurrentRunId(e.target.value)}
              className="field-input field-input--mono text-xs cursor-pointer"
            >
              <option value="">-- Choose Candidate Run --</option>
              {completedRuns.map(r => (
                <option key={r.id} value={r.id}>
                  {r.planName} ({r.targetVersionLabel}) - Score: {r.score}/100
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Differential Metrics Display */}
      {diff && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-5 space-y-2">
              <span className="text-[10px] text-text-muted font-mono uppercase">Score Delta</span>
              <div className={`text-2xl font-bold font-mono ${diff.scoreDiff > 0 ? "text-signal-teal" : diff.scoreDiff < 0 ? "text-signal-rose" : "text-text-primary"}`}>
                {diff.scoreDiff > 0 ? `+${diff.scoreDiff}` : diff.scoreDiff} pts
              </div>
              <p className="text-[11px] text-text-muted font-mono capitalize">{diff.regressionStatus}</p>
            </div>

            <div className="glass-panel p-5 space-y-2">
              <span className="text-[10px] text-text-muted font-mono uppercase">p95 Latency Delta</span>
              <div className={`text-2xl font-bold font-mono ${diff.p95DiffMs < 0 ? "text-signal-teal" : diff.p95DiffMs > 0 ? "text-signal-rose" : "text-text-primary"}`}>
                {diff.p95DiffMs > 0 ? `+${diff.p95DiffMs.toFixed(0)}` : diff.p95DiffMs.toFixed(0)} ms
              </div>
              <p className="text-[11px] text-text-muted font-mono">Differential</p>
            </div>

            <div className="glass-panel p-5 space-y-2">
              <span className="text-[10px] text-text-muted font-mono uppercase">Throughput Delta</span>
              <div className={`text-2xl font-bold font-mono ${diff.throughputDiffRps > 0 ? "text-signal-teal" : "text-text-muted"}`}>
                {diff.throughputDiffRps > 0 ? `+${diff.throughputDiffRps.toFixed(1)}` : diff.throughputDiffRps.toFixed(1)} req/s
              </div>
              <p className="text-[11px] text-text-muted font-mono">Sustained RPS</p>
            </div>

            <div className="glass-panel p-5 space-y-2">
              <span className="text-[10px] text-text-muted font-mono uppercase">Error Rate Delta</span>
              <div className={`text-2xl font-bold font-mono ${diff.errorRateDiffPercent < 0 ? "text-signal-teal" : diff.errorRateDiffPercent > 0 ? "text-signal-rose" : "text-text-primary"}`}>
                {diff.errorRateDiffPercent > 0 ? `+${diff.errorRateDiffPercent.toFixed(2)}` : diff.errorRateDiffPercent.toFixed(2)}%
              </div>
              <p className="text-[11px] text-text-muted font-mono">Observed Shift</p>
            </div>
          </div>

          <div className="glass-panel p-6">
            <h4 className="text-sm font-semibold text-text-primary mb-2">Automated Comparison Finding</h4>
            <p className="text-xs text-text-muted leading-relaxed font-mono">{diff.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}
