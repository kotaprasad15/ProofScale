import { SummaryMetrics, ScoreBreakdown } from "../schemas/index.js";

export interface RunComparisonResult {
  baselineRunId: string;
  currentRunId: string;
  scoreDiff: number; // e.g. +5 or -10
  p95DiffMs: number; // e.g. -50ms (faster) or +120ms (slower)
  throughputDiffRps: number;
  errorRateDiffPercent: number;
  regressionStatus: "improved" | "stable" | "regressed";
  summary: string;
}

export function compareTestRuns(
  baseline: { id: string; score?: number | null; summaryMetrics?: SummaryMetrics | null },
  current: { id: string; score?: number | null; summaryMetrics?: SummaryMetrics | null }
): RunComparisonResult {
  const baselineScore = baseline.score ?? 0;
  const currentScore = current.score ?? 0;
  const scoreDiff = currentScore - baselineScore;

  const baselineP95 = baseline.summaryMetrics?.p95Ms ?? 0;
  const currentP95 = current.summaryMetrics?.p95Ms ?? 0;
  const p95DiffMs = currentP95 - baselineP95;

  const baselineRps = baseline.summaryMetrics?.throughputRps ?? 0;
  const currentRps = current.summaryMetrics?.throughputRps ?? 0;
  const throughputDiffRps = Math.round((currentRps - baselineRps) * 10) / 10;

  const baselineErr = (baseline.summaryMetrics?.errorRate ?? 0) * 100;
  const currentErr = (current.summaryMetrics?.errorRate ?? 0) * 100;
  const errorRateDiffPercent = Math.round((currentErr - baselineErr) * 100) / 100;

  let regressionStatus: "improved" | "stable" | "regressed" = "stable";
  if (scoreDiff >= 5 || p95DiffMs <= -50) {
    regressionStatus = "improved";
  } else if (scoreDiff <= -5 || p95DiffMs >= 50 || errorRateDiffPercent > 1) {
    regressionStatus = "regressed";
  }

  let summary = "";
  if (regressionStatus === "improved") {
    summary = `Performance improved: Score increased by +${scoreDiff} points (p95 latency reduced by ${Math.abs(p95DiffMs)}ms).`;
  } else if (regressionStatus === "regressed") {
    summary = `Performance regressed: Score dropped by ${scoreDiff} points (p95 latency increased by +${p95DiffMs}ms).`;
  } else {
    summary = `Performance is stable: Score changed by ${scoreDiff >= 0 ? "+" : ""}${scoreDiff} points within baseline limits.`;
  }

  return {
    baselineRunId: baseline.id,
    currentRunId: current.id,
    scoreDiff,
    p95DiffMs,
    throughputDiffRps,
    errorRateDiffPercent,
    regressionStatus,
    summary
  };
}
