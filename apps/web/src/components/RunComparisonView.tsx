import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { GitCompare, ArrowUpRight, ArrowDownRight, Minus, CheckCircle2, AlertTriangle } from "lucide-react";

interface RunComparisonViewProps {
  projectId: string;
}

export function RunComparisonView({ projectId }: RunComparisonViewProps) {
  const runsQuery = trpc.runs.listByProject.useQuery({ projectId });
  const completedRuns = runsQuery.data?.filter(r => r.status === "completed") || [];

  const [baselineRunId, setBaselineRunId] = useState<string>("");
  const [currentRunId, setCurrentRunId] = useState<string>("");

  const comparisonQuery = trpc.reports.compareRuns.useQuery(
    { baselineRunId, currentRunId },
    { enabled: !!baselineRunId && !!currentRunId && baselineRunId !== currentRunId }
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Run-over-Run Build Comparison</h2>
        <p className="text-sm text-slate-400">
          Compare two completed load test runs to evaluate performance regressions, latency improvements, or throughput trends across target builds.
        </p>
      </div>

      {/* Selectors */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
          <GitCompare className="h-5 w-5 text-indigo-400" />
          <span>Select Runs to Compare</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Baseline Run (Before)</label>
            <select
              value={baselineRunId}
              onChange={e => setBaselineRunId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="">-- Select Baseline Run --</option>
              {completedRuns.map(r => (
                <option key={r.id} value={r.id}>
                  {r.planName} - Score: {r.score}/100 ({new Date(r.createdAt).toLocaleTimeString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Current Run (After)</label>
            <select
              value={currentRunId}
              onChange={e => setCurrentRunId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="">-- Select Current Run --</option>
              {completedRuns.map(r => (
                <option key={r.id} value={r.id}>
                  {r.planName} - Score: {r.score}/100 ({new Date(r.createdAt).toLocaleTimeString()})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Results Card */}
      {comparisonQuery.data && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white">Comparison Results</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center space-x-1 ${
              comparisonQuery.data.regressionStatus === "improved" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
              comparisonQuery.data.regressionStatus === "regressed" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
              "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
            }`}>
              {comparisonQuery.data.regressionStatus === "improved" ? <ArrowUpRight className="h-4 w-4" /> :
               comparisonQuery.data.regressionStatus === "regressed" ? <ArrowDownRight className="h-4 w-4" /> :
               <Minus className="h-4 w-4" />}
              <span>{comparisonQuery.data.regressionStatus}</span>
            </span>
          </div>

          <p className="text-xs text-slate-300 bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
            {comparisonQuery.data.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-1">
              <span className="text-xs text-slate-400">Score Change</span>
              <div className="text-xl font-bold text-white">
                {comparisonQuery.data.scoreDiff >= 0 ? `+${comparisonQuery.data.scoreDiff}` : comparisonQuery.data.scoreDiff} pts
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-1">
              <span className="text-xs text-slate-400">p95 Latency Diff</span>
              <div className="text-xl font-bold text-white">
                {comparisonQuery.data.p95DiffMs >= 0 ? `+${comparisonQuery.data.p95DiffMs}` : comparisonQuery.data.p95DiffMs} ms
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-1">
              <span className="text-xs text-slate-400">Throughput Diff</span>
              <div className="text-xl font-bold text-white">
                {comparisonQuery.data.throughputDiffRps >= 0 ? `+${comparisonQuery.data.throughputDiffRps}` : comparisonQuery.data.throughputDiffRps} RPS
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
