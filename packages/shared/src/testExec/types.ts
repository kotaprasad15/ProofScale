/**
 * Server-Side Test Execution domain types.
 *
 * These types describe the test envelope (a saved, approved test plan), the
 * per-request samples recorded by the backend worker, and the final computed
 * test-run result. The browser NEVER generates test traffic; it only creates,
 * approves, starts, monitors, and cancels runs through the API.
 */

export type PlanEnvironment = "staging" | "production";

export type TestPlanStatus = "draft" | "approved" | "archived";

export type TestRequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** A single saved HTTP request inside a test plan. */
export interface TestRequest {
  id: string;
  name: string;

  method: TestRequestMethod;
  path: string;

  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;

  enabled: boolean;
}

/** Latency / error / throughput thresholds the run result is evaluated against. */
export interface TestPlanThresholds {
  p95LatencyMs?: number;
  p99LatencyMs?: number;
  maxErrorRatePercent?: number;
  minRequestsPerSecond?: number;
}

/** Workload + request envelope of a test plan (the runnable spec). */
export interface TestPlan {
  id: string;
  projectId: string;
  name: string;

  targetBaseUrl: string;
  environment: PlanEnvironment;

  durationSeconds: number;
  virtualUsers: number;
  maxRequestsPerSecond: number;
  requestTimeoutMs: number;

  requests: TestRequest[];

  thresholds: TestPlanThresholds;

  status: TestPlanStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Error categories recorded by the worker for failed samples. */
export type RequestErrorType =
  | "timeout"
  | "dns_failure"
  | "connection_failure"
  | "aborted"
  | "http_error"
  | "invalid_target"
  | "rate_limit_rejection"
  | "unknown";

/** One observed HTTP request executed by the server-side worker. */
export interface RequestSample {
  requestId: string;
  requestName: string;
  virtualUserId: number;
  method: string;
  status?: number;
  latencyMs: number;
  ok: boolean;
  errorType?: RequestErrorType;
  errorMessage?: string;
  timestamp: string;
}

export interface ThresholdCheck {
  actual: number;
  limit?: number;
  passed: boolean;
}

/** Final, persisted result of a completed test run. Never fabricated: computed from samples. */
export interface TestRunResult {
  runId: string;
  testPlanId: string;
  targetBaseUrl: string;
  environment: string;

  startedAt: string;
  finishedAt: string;
  durationSeconds: number;

  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;

  errorRatePercent: number;
  requestsPerSecond: number;

  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;

  thresholdResults: {
    p95Latency: ThresholdCheck;
    p99Latency?: ThresholdCheck;
    errorRate: ThresholdCheck;
    requestsPerSecond: ThresholdCheck;
  };

  passed: boolean;

  /** True when the run ended early because a user cancelled it. */
  cancelled?: boolean;
  /** Per-request samples recorded during the run. */
  samples: RequestSample[];
}

/** Live progress snapshot persisted while a run is queued/running. */
export interface RunProgress {
  elapsedSeconds: number;
  durationSeconds: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  currentRps: number;
}

/**
 * Full run lifecycle states exposed by the API.
 * "starting"/"expired" are transient DB states surfaced for fidelity.
 */
export type TestRunStatus =
  | "draft"
  | "queued"
  | "starting"
  | "running"
  | "cancelling"
  | "cancelled"
  | "completed"
  | "failed"
  | "expired";

/** Domain representation of a persisted test run (repos map to this). */
export interface TestRun {
  id: string;
  testPlanId: string;
  projectId: string;
  organizationId: string;

  targetBaseUrl: string;
  environment: string;

  status: TestRunStatus;
  requestedByUserId: string;

  requestedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;

  cancelReason?: string | null;
  failureReason?: string | null;

  /** Exact immutable snapshot of the test envelope used for this run. */
  envelope: TestPlan | null;
  progress: RunProgress | null;
  result: TestRunResult | null;
}
