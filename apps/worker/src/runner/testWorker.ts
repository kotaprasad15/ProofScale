import {
  TestPlan,
  RequestSample,
  RequestErrorType,
  validateTestPlan,
  ValidationIssue,
  computeRunResult
} from "@proofscale/shared";
import crypto from "node:crypto";

/**
 * Server-side test worker engine.
 *
 * Receives a validated TestPlan and executes its requests from Node.js —
 * never from the browser:
 *   - N virtual users run the saved request sequence on repeat
 *   - global maximum request rate is enforced via a shared token bucket
 *   - each request has a hard timeout (AbortController)
 *   - redirects are validated and capped (SSRF)
 *   - every request produces a RequestSample with latency + error class
 *   - stops at duration end, on cancellation, or on fatal validation errors
 *
 * This module is persistence-agnostic: results are returned to the caller
 * (the run orchestrator / queue handler) to be persisted.
 */

/** A cancellation signal the orchestrator flips to stop the run. */
export class CancellationSignal {
  private cancelled = false;
  private reason: string | null = null;

  cancel(reason = "Cancelled by user"): void {
    if (!this.cancelled) {
      this.cancelled = true;
      this.reason = reason;
    }
  }

  get isCancelled(): boolean {
    return this.cancelled;
  }

  get cancelReason(): string | null {
    return this.reason;
  }
}

export class PlanValidationError extends Error {
  constructor(public issues: ValidationIssue[]) {
    super(`Test plan failed validation: ${issues.map(i => `${i.field}: ${i.message}`).join("; ")}`);
    this.name = "PlanValidationError";
  }
}

export interface WorkerExecutionResult {
  samples: RequestSample[];
  startedAtMs: number;
  finishedAtMs: number;
  cancelled: boolean;
  cancelReason: string | null;
}

export interface ExecuteOptions {
  orgMaxVirtualUsers?: number;
  /**
   * TEST-ONLY escape hatch: skips the workload-envelope part of validation so
   * unit tests can exercise the engine with sub-5-second runs. Never enabled
   * on production code paths (the API and orchestrator omit it).
   */
  skipEnvelopeLimits?: boolean;
}

/** One in-flight HTTP outcome before becoming a sample. */
interface RequestOutcome {
  status?: number;
  latencyMs: number;
  ok: boolean;
  errorType?: RequestErrorType;
  errorMessage?: string;
}

const USER_AGENT = "ProofScale-Worker/1.0 (server-side load validation)";

/** Shared token bucket enforcing the plan's max requests/second. */
class RateLimiter {
  private capacity: number;
  private tokens: number;
  private lastRefill: number;

  constructor(private maxPerSecond: number) {
    this.capacity = Math.max(1, maxPerSecond);
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    for (;;) {
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const now = Date.now();
      const elapsed = (now - this.lastRefill) / 1000;
      this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.maxPerSecond);
      this.lastRefill = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const waitMs = Math.max(5, Math.ceil(((1 - this.tokens) / this.maxPerSecond) * 1000));
      await sleep(Math.min(waitMs, 250));
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Classifies an unknown error into the supported error categories. */
export function classifyError(err: unknown): { errorType: RequestErrorType; errorMessage: string } {
  const e = err as any;
  const name: string = e?.name || "";
  const cause = e?.cause;
  const causeCode: string = cause?.code || "";
  const causeMessage: string = cause?.message || "";
  const message: string = String(e?.message || err || "Unknown error");
  const haystack = `${message} ${causeMessage} ${causeCode}`;

  if (
    name === "AbortError" ||
    /timeout|timed out|etimedout|esockettimedout|operation was aborted/i.test(haystack)
  ) {
    return { errorType: "timeout", errorMessage: `Request timed out: ${message}` };
  }
  if (
    causeCode === "ENOTFOUND" ||
    causeCode === "EAI_AGAIN" ||
    e?.code === "ENOTFOUND" ||
    e?.code === "EAI_AGAIN" ||
    /getaddrinfo|ENOTFOUND|EAI_AGAIN|dns/i.test(haystack)
  ) {
    return { errorType: "dns_failure", errorMessage: `DNS resolution failed: ${message}` };
  }
  if (
    [
      "ECONNREFUSED",
      "ECONNRESET",
      "EHOSTUNREACH",
      "ENETUNREACH",
      "EPIPE",
      "ERR_SOCKET_CONNECTION_TIMEOUT"
    ].includes(causeCode || e?.code) ||
    /econnrefused|econnreset|socket hang up|fetch failed/i.test(haystack)
  ) {
    return { errorType: "connection_failure", errorMessage: `Connection failed: ${message}` };
  }
  return { errorType: "unknown", errorMessage: message };
}

interface BuildUrlOptions {
  baseUrl: string;
  path: string;
  query?: Record<string, string>;
}

/** Builds the absolute request URL. Throws on non-same-origin paths. */
export function buildRequestUrl({ baseUrl, path, query }: BuildUrlOptions): string {
  const base = new URL(baseUrl);
  const rel = path.startsWith("/") ? path : `/${path}`;
  if (rel.startsWith("//")) {
    throw new Error("Protocol-relative paths are not allowed.");
  }
  let url: URL;
  try {
    url = new URL(rel, base);
  } catch {
    throw new Error("Request path is not a valid relative path.");
  }
  if (url.origin !== base.origin) {
    throw new Error("Request path escapes the target origin.");
  }
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/**
 * Executes a single HTTP request with timeout + validated redirects.
 * Never buffers response bodies (only counts bytes for the size cap).
 */
async function executeSingleRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
  signal: AbortSignal,
  maxRedirects: number
): Promise<RequestOutcome> {
  const start = Date.now();
  let currentUrl = url;
  let redirectsLeft = maxRedirects;

  for (;;) {
    let response: Response;
    try {
      const init: RequestInit = {
        method,
        headers: { "User-Agent": USER_AGENT, ...headers },
        redirect: "manual",
        signal,
        body:
          body !== undefined && body !== null && method !== "GET" && method !== "DELETE"
            ? typeof body === "string"
              ? body
              : JSON.stringify(body)
            : undefined
      };
      if (init.body !== undefined) {
        (init.headers as Record<string, string>)["Content-Type"] =
          (init.headers as Record<string, string>)["Content-Type"] || "application/json";
      }
      response = await fetch(currentUrl, init);
    } catch (err) {
      const latencyMs = Date.now() - start;
      if (signal.aborted) {
        const reason = (signal as any)._cancelReason;
        return {
          latencyMs,
          ok: false,
          errorType: reason === "timeout" ? "timeout" : "aborted",
          errorMessage: reason === "timeout" ? `Request timed out after ${timeoutMs}ms` : "Request aborted (run cancelled)"
        };
      }
      const classified = classifyError(err);
      return { latencyMs, ok: false, ...classified };
    }

    // Redirect handling: validate every hop against the target origin.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        return {
          status: response.status,
          latencyMs: Date.now() - start,
          ok: false,
          errorType: "http_error",
          errorMessage: `Redirect ${response.status} without Location header`
        };
      }
      let next: URL;
      try {
        next = new URL(location, currentUrl);
      } catch {
        return {
          status: response.status,
          latencyMs: Date.now() - start,
          ok: false,
          errorType: "invalid_target",
          errorMessage: `Invalid redirect location: ${location.slice(0, 100)}`
        };
      }
      const baseOrigin = new URL(url).origin;
      if (next.origin !== baseOrigin) {
        return {
          status: response.status,
          latencyMs: Date.now() - start,
          ok: false,
          errorType: "invalid_target",
          errorMessage: `Unsafe redirect to different origin blocked: ${next.host}`
        };
      }
      if (redirectsLeft <= 0) {
        return {
          status: response.status,
          latencyMs: Date.now() - start,
          ok: false,
          errorType: "http_error",
          errorMessage: "Too many redirects"
        };
      }
      redirectsLeft -= 1;
      currentUrl = next.toString();
      continue;
    }

    // Drain the response without retaining bodies (size-capped).
    let bytes = 0;
    try {
      const reader = response.body?.getReader();
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value?.byteLength || 0;
          if (bytes > 1_000_000) {
            try {
              await reader.cancel();
            } catch {}
            break;
          }
        }
      }
    } catch {}

    const latencyMs = Date.now() - start;
    const ok = response.status >= 200 && response.status < 400;
    return {
      status: response.status,
      latencyMs,
      ok,
      errorType: ok ? undefined : response.status === 429 ? "rate_limit_rejection" : "http_error",
      errorMessage: ok ? undefined : `HTTP ${response.status} ${response.statusText || ""}`.trim()
    };
  }
}

/** Per-request timeout signal that also respects run cancellation. */
function linkSignals(cancellation: CancellationSignal, timeoutMs: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    (controller.signal as any)._cancelReason = "timeout";
    controller.abort();
  }, timeoutMs);

  const check = setInterval(() => {
    if (cancellation.isCancelled) {
      (controller.signal as any)._cancelReason = "cancelled";
      controller.abort();
    }
  }, 50);

  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
      clearInterval(check);
    }
  };
}

/**
 * Executes a test plan against its target and returns raw samples + timing.
 * Throws PlanValidationError if the plan fails the safety envelope.
 */
export async function executeTestPlan(
  plan: TestPlan,
  cancellation: CancellationSignal,
  options: ExecuteOptions = {}
): Promise<WorkerExecutionResult> {
  // Defense in depth: re-validate on the worker even though the API did.
  const validation = options.skipEnvelopeLimits
    ? { valid: plan.requests.some(r => r.enabled), issues: plan.requests.some(r => r.enabled) ? [] : [{ field: "requests", message: "No enabled requests to execute." }] }
    : validateTestPlan(plan, options);
  if (!validation.valid) {
    throw new PlanValidationError(validation.issues);
  }

  const enabledRequests = plan.requests.filter(r => r.enabled);
  if (enabledRequests.length === 0) {
    throw new PlanValidationError([{ field: "requests", message: "No enabled requests to execute." }]);
  }

  const startedAtMs = Date.now();
  const durationMs = plan.durationSeconds * 1000;
  const deadline = startedAtMs + durationMs;

  const limiter = new RateLimiter(plan.maxRequestsPerSecond);
  const samples: RequestSample[] = [];

  const virtualUserTasks = Array.from({ length: plan.virtualUsers }, (_, vu) =>
    (async () => {
      let requestIndex = 0;
      while (Date.now() < deadline && !cancellation.isCancelled) {
        const req = enabledRequests[requestIndex % enabledRequests.length];
        requestIndex += 1;

        let url: string;
        try {
          url = buildRequestUrl({ baseUrl: plan.targetBaseUrl, path: req.path, query: req.query });
        } catch (err) {
          samples.push({
            requestId: req.id,
            requestName: req.name,
            virtualUserId: vu,
            method: req.method,
            latencyMs: 0,
            ok: false,
            errorType: "invalid_target",
            errorMessage: (err as Error).message,
            timestamp: new Date().toISOString()
          });
          // A URL that cannot even be built is fatal for the run.
          cancellation.cancel("Invalid request target; stopping run.");
          return;
        }

        await limiter.acquire();
        if (Date.now() >= deadline || cancellation.isCancelled) return;

        const { signal, clear } = linkSignals(cancellation, plan.requestTimeoutMs);
        let outcome: RequestOutcome;
        try {
          outcome = await executeSingleRequest(
            url,
            req.method,
            req.headers || {},
            req.body,
            plan.requestTimeoutMs,
            signal,
            3
          );
        } finally {
          clear();
        }

        samples.push({
          requestId: req.id,
          requestName: req.name,
          virtualUserId: vu,
          method: req.method,
          status: outcome.status,
          latencyMs: outcome.latencyMs,
          ok: outcome.ok,
          errorType: outcome.errorType,
          errorMessage: outcome.errorMessage,
          timestamp: new Date().toISOString()
        });
      }
    })()
  );

  await Promise.all(virtualUserTasks);

  const finishedAtMs = Date.now();
  return {
    samples,
    startedAtMs,
    finishedAtMs,
    cancelled: cancellation.isCancelled,
    cancelReason: cancellation.cancelReason
  };
}

/** Convenience wrapper: executes a plan and computes the full TestRunResult. */
export async function runTestPlan(
  plan: TestPlan,
  cancellation: CancellationSignal,
  runId: string,
  options: ExecuteOptions = {}
) {
  const execution = await executeTestPlan(plan, cancellation, options);
  const result = computeRunResult({
    runId,
    plan,
    samples: execution.samples,
    startedAtMs: execution.startedAtMs,
    finishedAtMs: execution.finishedAtMs,
    cancelled: execution.cancelled
  });
  return { execution, result };
}

/** Exported for orchestrators that need progress ticks. */
export function newRunId(): string {
  return `run_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
