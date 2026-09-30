import {
  RequestSample,
  TestRunResult,
  TestPlanThresholds,
  ThresholdCheck,
  TestPlan
} from "./types.js";
import { TEST_EXEC_LIMITS } from "./limits.js";

/**
 * Deterministic metrics computation for test runs.
 *
 * Every number in a TestRunResult is derived here from recorded samples and
 * the configured thresholds — never fabricated.
 */

/**
 * Nearest-rank percentile over a sorted latency array.
 * p = 50/95/99. Returns 0 for empty data.
 */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sorted.length);
  const idx = Math.min(Math.max(rank - 1, 0), sorted.length - 1);
  return sorted[idx];
}

export interface ComputeMetricsInput {
  runId: string;
  plan: Pick<TestPlan, "id" | "targetBaseUrl" | "environment" | "thresholds">;
  samples: RequestSample[];
  startedAtMs: number;
  finishedAtMs: number;
  cancelled?: boolean;
}

export function computeRunResult(input: ComputeMetricsInput): TestRunResult {
  const { runId, plan, samples, startedAtMs, finishedAtMs } = input;

  const totalRequests = samples.length;
  const successfulRequests = samples.filter(s => s.ok).length;
  const failedRequests = totalRequests - successfulRequests;

  const durationSeconds = Math.max(0, (finishedAtMs - startedAtMs) / 1000);
  const requestsPerSecond =
    durationSeconds > 0
      ? Math.round((totalRequests / durationSeconds) * 100) / 100
      : 0;
  const errorRatePercent =
    totalRequests > 0
      ? Math.round((failedRequests / totalRequests) * 10000) / 100
      : 0;

  const latencies = samples.map(s => s.latencyMs).sort((a, b) => a - b);
  const p50 = Math.round(percentile(latencies, 50) * 100) / 100;
  const p95 = Math.round(percentile(latencies, 95) * 100) / 100;
  const p99 = Math.round(percentile(latencies, 99) * 100) / 100;

  const thresholds: TestPlanThresholds = plan.thresholds ?? {};

  const p95Check: ThresholdCheck = {
    actual: p95,
    limit: thresholds.p95LatencyMs,
    passed: thresholds.p95LatencyMs === undefined ? true : p95 <= thresholds.p95LatencyMs
  };

  const p99Check: ThresholdCheck | undefined =
    thresholds.p99LatencyMs === undefined
      ? undefined
      : {
          actual: p99,
          limit: thresholds.p99LatencyMs,
          passed: p99 <= thresholds.p99LatencyMs
        };

  const errorCheck: ThresholdCheck = {
    actual: errorRatePercent,
    limit: thresholds.maxErrorRatePercent,
    passed: thresholds.maxErrorRatePercent === undefined ? true : errorRatePercent <= thresholds.maxErrorRatePercent
  };

  const rpsCheck: ThresholdCheck = {
    actual: requestsPerSecond,
    limit: thresholds.minRequestsPerSecond,
    passed: thresholds.minRequestsPerSecond === undefined ? true : requestsPerSecond >= thresholds.minRequestsPerSecond
  };

  const passed =
    p95Check.passed && errorCheck.passed && rpsCheck.passed && (p99Check?.passed ?? true) && !input.cancelled;

  return {
    runId,
    testPlanId: plan.id,
    targetBaseUrl: plan.targetBaseUrl,
    environment: plan.environment,

    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationSeconds: Math.round(durationSeconds * 100) / 100,

    totalRequests,
    successfulRequests,
    failedRequests,

    errorRatePercent,
    requestsPerSecond,

    p50LatencyMs: p50,
    p95LatencyMs: p95,
    p99LatencyMs: p99,

    thresholdResults: {
      p95Latency: p95Check,
      ...(p99Check ? { p99Latency: p99Check } : {}),
      errorRate: errorCheck,
      requestsPerSecond: rpsCheck
    },

    passed,
    cancelled: input.cancelled ?? false,
    samples: samples.slice(0, TEST_EXEC_LIMITS.MAX_SAMPLES_PER_RUN)
  };
}

/** Live progress snapshot from the worker's counters. */
export function computeProgress(params: {
  samples: RequestSample[];
  startedAtMs: number;
  nowMs: number;
  durationSeconds: number;
}): {
  elapsedSeconds: number;
  durationSeconds: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  currentRps: number;
} {
  const { samples, startedAtMs, nowMs, durationSeconds } = params;
  const elapsedSeconds = Math.max(0, Math.round((nowMs - startedAtMs) / 1000));
  const totalRequests = samples.length;
  const successfulRequests = samples.filter(s => s.ok).length;
  const elapsedForRate = Math.max(1, (nowMs - startedAtMs) / 1000);
  return {
    elapsedSeconds: Math.min(elapsedSeconds, durationSeconds),
    durationSeconds,
    totalRequests,
    successfulRequests,
    failedRequests: totalRequests - successfulRequests,
    currentRps: Math.round((totalRequests / elapsedForRate) * 10) / 10
  };
}
