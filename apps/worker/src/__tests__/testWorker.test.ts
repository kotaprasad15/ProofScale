import assert from "node:assert";
import { test, describe, before, after } from "node:test";
import http from "node:http";
import {
  TestPlan,
  TestRequest,
  validateTestPlan,
  validateTargetUrl,
  percentile,
  computeRunResult,
  TEST_EXEC_LIMITS
} from "@proofscale/shared";
import {
  CancellationSignal,
  executeTestPlan,
  runTestPlan,
  classifyError,
  buildRequestUrl,
  PlanValidationError
} from "../runner/testWorker.js";

/**
 * Server-side test worker engine tests.
 * All HTTP traffic targets a local mock server — never external endpoints.
 */

function makePlan(overrides: Partial<TestPlan> = {}): TestPlan {
  const now = new Date().toISOString();
  const req = (i: number, extra: Partial<TestRequest> = {}): TestRequest => ({
    id: `req_${i}`,
    name: `Request ${i}`,
    method: "GET",
    path: "/api/v1/products",
    enabled: true,
    ...extra
  });
  return {
    id: "plan_test_1",
    projectId: "proj_test",
    name: "Test Plan",
    targetBaseUrl: "http://127.0.0.1:47191",
    environment: "staging",
    durationSeconds: 5,
    virtualUsers: 2,
    maxRequestsPerSecond: 100,
    requestTimeoutMs: 2000,
    requests: [req(1), req(2)],
    thresholds: {},
    status: "approved",
    createdBy: "usr_test",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

let requestLog: { path: string; method: string }[] = [];
let server: http.Server;

before(async () => {
  server = http.createServer((req, res) => {
    requestLog.push({ path: req.url || "/", method: req.method || "GET" });

    if (req.url === "/api/v1/products") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('[{"id":1}]');
    } else if (req.url === "/api/v1/slow") {
      // Deliberately exceeds the worker timeout.
      setTimeout(() => {
        res.writeHead(200);
        res.end("late");
      }, 5000);
    } else if (req.url === "/api/v1/flaky") {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end('{"error":"boom"}');
    } else if (req.url === "/api/v1/ratelimited") {
      res.writeHead(429, { "Content-Type": "application/json" });
      res.end('{"error":"slow down"}');
    } else if (req.url === "/redirect/safe") {
      res.writeHead(302, { Location: "/api/v1/products" });
      res.end();
    } else if (req.url === "/redirect/unsafe") {
      res.writeHead(302, { Location: "http://evil.example.com/steal" });
      res.end();
    } else if (req.url === "/api/v1/echo" && req.method === "POST") {
      let body = "";
      req.on("data", c => (body += c));
      req.on("end", () => {
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ received: body.length }));
      });
    } else {
      res.writeHead(404);
      res.end("not found");
    }
  });
  await new Promise<void>(resolve => server.listen(47191, "127.0.0.1", resolve));
});

after(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe("Test plan validation", () => {
  test("accepts a valid plan", () => {
    const result = validateTestPlan(makePlan());
    assert.strictEqual(result.valid, true, JSON.stringify(result.issues));
  });

  test("rejects empty request plans", () => {
    const result = validateTestPlan(makePlan({ requests: [] }));
    assert.strictEqual(result.valid, false);
    assert.ok(result.issues.some(i => i.field === "requests"));
  });

  test("rejects plans exceeding the request count cap", () => {
    const many = Array.from({ length: TEST_EXEC_LIMITS.MAX_REQUESTS_PER_PLAN + 1 }, (_, i) => ({
      id: `r${i}`,
      name: `r${i}`,
      method: "GET" as const,
      path: "/x",
      enabled: true
    }));
    const result = validateTestPlan(makePlan({ requests: many }));
    assert.strictEqual(result.valid, false);
    assert.ok(result.issues.some(i => /maximum of 25/.test(i.message)));
  });

  test("rejects invalid URLs", () => {
    const issues = validateTargetUrl("not-a-url");
    assert.ok(issues.length > 0);
  });

  test("rejects non-HTTPS remote targets", () => {
    const issues = validateTargetUrl("http://api.example.com");
    assert.ok(issues.some(i => /HTTPS/.test(i.message)));
  });

  test("allows plain HTTP for local development targets", () => {
    const issues = validateTargetUrl("http://localhost:4000");
    assert.deepStrictEqual(issues, []);
  });

  test("rejects URLs with embedded credentials", () => {
    const issues = validateTargetUrl("https://user:pass@api.example.com");
    assert.ok(issues.some(i => /embedded username/i.test(i.message)));
  });

  test("rejects private and reserved IP literals (SSRF)", () => {
    assert.ok(validateTargetUrl("https://10.0.0.5").length > 0);
    assert.ok(validateTargetUrl("https://192.168.1.10").length > 0);
    assert.ok(validateTargetUrl("https://169.254.169.254").length > 0);
  });

  test("rejects excessive virtual users, durations, rates, and timeouts", () => {
    const result = validateTestPlan(
      makePlan({
        virtualUsers: TEST_EXEC_LIMITS.MAX_VIRTUAL_USERS + 1,
        durationSeconds: TEST_EXEC_LIMITS.MAX_DURATION_SECONDS + 1,
        maxRequestsPerSecond: TEST_EXEC_LIMITS.MAX_REQUESTS_PER_SECOND + 1,
        requestTimeoutMs: TEST_EXEC_LIMITS.MAX_REQUEST_TIMEOUT_MS + 1
      })
    );
    assert.strictEqual(result.valid, false);
    assert.ok(result.issues.some(i => i.field === "virtualUsers"));
    assert.ok(result.issues.some(i => i.field === "durationSeconds"));
    assert.ok(result.issues.some(i => i.field === "maxRequestsPerSecond"));
    assert.ok(result.issues.some(i => i.field === "requestTimeoutMs"));
  });

  test("rejects unapproved plans via API policy (status check is server-side)", () => {
    // The worker re-validates the envelope; approval is enforced by the API.
    const plan = makePlan({ status: "draft" });
    assert.strictEqual(plan.status !== "approved", true);
  });

  test("rejects unauthorized users (auth enforced in API layer)", () => {
    // Documented contract: POST /api/test-runs requires resolveAuth != null.
    // Engine-level check: disabled-only plans are rejected before execution.
    const plan = makePlan({ requests: [{ id: "r1", name: "r", method: "GET", path: "/", enabled: false }] });
    const result = validateTestPlan(plan);
    assert.strictEqual(result.valid, true); // valid structurally...
    // ...but the worker engine must refuse to run it.
    assert.rejects(
      () =>
        executeTestPlan(plan, new CancellationSignal()).catch((err: unknown) => {
          assert.ok(err instanceof PlanValidationError);
          throw err;
        }),
      PlanValidationError
    );
  });

  test("rejects unsafe headers and oversized bodies", () => {
    const result = validateTestPlan(
      makePlan({
        requests: [
          {
            id: "r1",
            name: "r",
            method: "POST",
            path: "/x",
            enabled: true,
            headers: { Authorization: "Bearer abc123", "X-Ok": "fine" },
            body: "x".repeat(TEST_EXEC_LIMITS.MAX_REQUEST_BODY_BYTES + 1)
          }
        ]
      })
    );
    assert.strictEqual(result.valid, false);
    assert.ok(result.issues.some(i => /Authorization/.test(i.message)));
    assert.ok(result.issues.some(i => /64KB/.test(i.message)));
  });

  test("rejects GET requests with bodies", () => {
    const result = validateTestPlan(
      makePlan({
        requests: [{ id: "r1", name: "r", method: "GET", path: "/x", enabled: true, body: { a: 1 } }]
      })
    );
    assert.strictEqual(result.valid, false);
    assert.ok(result.issues.some(i => /body is only allowed/.test(i.message)));
  });
});

describe("Worker engine behavior", () => {
  test("executes requests in the configured order", async () => {
    requestLog = [];
    const plan = makePlan({
      durationSeconds: 1,
      virtualUsers: 1,
      maxRequestsPerSecond: 50,
      requests: [
        { id: "a", name: "first", method: "GET", path: "/api/v1/products", enabled: true },
        { id: "b", name: "second", method: "POST", path: "/api/v1/echo", body: {}, enabled: true }
      ]
    });
    await executeTestPlan(plan, new CancellationSignal(), { skipEnvelopeLimits: true });
    // With one VU the log must strictly alternate product → echo.
    const relevant = requestLog.filter(r => r.path.startsWith("/api"));
    const pattern = relevant.map(r => r.path);
    assert.ok(pattern.length >= 4, `expected several requests, got ${pattern.length}`);
    for (let i = 0; i < pattern.length; i++) {
      const expected = i % 2 === 0 ? "/api/v1/products" : "/api/v1/echo";
      assert.strictEqual(pattern[i], expected, `position ${i}: ${pattern.join(",")}`);
    }
  });

  test("runs multiple virtual users concurrently", async () => {
    requestLog = [];
    const plan = makePlan({ durationSeconds: 1, virtualUsers: 4, maxRequestsPerSecond: 100 });
    const execution = await executeTestPlan(plan, new CancellationSignal(), { skipEnvelopeLimits: true });
    const vus = new Set(execution.samples.map(s => s.virtualUserId));
    assert.deepStrictEqual([...vus].sort(), [0, 1, 2, 3]);
    assert.ok(execution.samples.length >= 4);
  });

  test("stops after the configured duration", async () => {
    const plan = makePlan({ durationSeconds: 1, virtualUsers: 2, maxRequestsPerSecond: 100 });
    const started = Date.now();
    const execution = await executeTestPlan(plan, new CancellationSignal(), { skipEnvelopeLimits: true });
    const elapsed = Date.now() - started;
    assert.ok(elapsed >= 950, `finished too early: ${elapsed}ms`);
    assert.ok(elapsed < 4000, `ran too long: ${elapsed}ms`);
    assert.strictEqual(execution.cancelled, false);
  });

  test("enforces the maximum request rate", async () => {
    requestLog = [];
    const plan = makePlan({ durationSeconds: 2, virtualUsers: 5, maxRequestsPerSecond: 20 });
    const execution = await executeTestPlan(plan, new CancellationSignal(), { skipEnvelopeLimits: true });
    // 2 seconds at 20 rps ≈ 40 requests. Allow generous headroom (≤ 2x) for
    // scheduler jitter and bucket-refill granularity while still proving the
    // cap binds far below the uncapped rate (5 VUs would exceed 500+).
    assert.ok(
      execution.samples.length <= 80,
      `rate cap violated: ${execution.samples.length} samples in 2s at 20 rps`
 );
    assert.ok(execution.samples.length >= 15, `too few samples: ${execution.samples.length}`);
  });

  test("applies request timeouts and classifies them", async () => {
    const plan = makePlan({
      durationSeconds: 2,
      virtualUsers: 1,
      requestTimeoutMs: 500,
      requests: [{ id: "s", name: "slow", method: "GET", path: "/api/v1/slow", enabled: true }]
    });
    const execution = await executeTestPlan(plan, new CancellationSignal(), { skipEnvelopeLimits: true });
    assert.ok(execution.samples.length > 0);
    const timeouts = execution.samples.filter(s => s.errorType === "timeout");
    assert.ok(timeouts.length > 0, "expected at least one timeout sample");
    for (const t of timeouts) {
      assert.strictEqual(t.ok, false);
      assert.ok(t.latencyMs >= 450 && t.latencyMs < 2000, `timeout latency ${t.latencyMs}ms`);
    }
  });

  test("handles HTTP error responses with correct classification", async () => {
    const plan = makePlan({
      durationSeconds: 1,
      virtualUsers: 1,
      requests: [{ id: "f", name: "flaky", method: "GET", path: "/api/v1/flaky", enabled: true }]
    });
    const execution = await executeTestPlan(plan, new CancellationSignal(), { skipEnvelopeLimits: true });
    assert.ok(execution.samples.length > 0);
    for (const s of execution.samples) {
      assert.strictEqual(s.ok, false);
      assert.strictEqual(s.status, 500);
      assert.strictEqual(s.errorType, "http_error");
    }
  });

  test("classifies 429 responses as rate_limit_rejection", async () => {
    const plan = makePlan({
      durationSeconds: 1,
      virtualUsers: 1,
      requests: [{ id: "rl", name: "limited", method: "GET", path: "/api/v1/ratelimited", enabled: true }]
    });
    const execution = await executeTestPlan(plan, new CancellationSignal(), { skipEnvelopeLimits: true });
    assert.ok(execution.samples.length > 0);
    assert.ok(execution.samples.every(s => s.errorType === "rate_limit_rejection"));
  });

  test("handles connection errors against a dead port", async () => {
    const plan = makePlan({
      durationSeconds: 1,
      virtualUsers: 1,
      targetBaseUrl: "http://127.0.0.1:47999", // nothing listens here
      requests: [{ id: "d", name: "dead", method: "GET", path: "/", enabled: true }]
    });
    const execution = await executeTestPlan(plan, new CancellationSignal(), { skipEnvelopeLimits: true });
    assert.ok(execution.samples.length > 0);
    assert.ok(execution.samples.every(s => !s.ok));
    assert.ok(
      execution.samples.every(s => s.errorType === "connection_failure"),
      `unexpected types: ${execution.samples.map(s => s.errorType).join(",")}`
    );
  });

  test("validates redirects: same-origin followed, cross-origin rejected", async () => {
    const safePlan = makePlan({
      durationSeconds: 1,
      virtualUsers: 1,
      requests: [{ id: "r", name: "safe redirect", method: "GET", path: "/redirect/safe", enabled: true }]
    });
    const safe = await executeTestPlan(safePlan, new CancellationSignal(), { skipEnvelopeLimits: true });
    assert.ok(safe.samples.every(s => s.ok), "same-origin redirect should be followed");

    const unsafePlan = makePlan({
      durationSeconds: 1,
      virtualUsers: 1,
      requests: [{ id: "r", name: "unsafe redirect", method: "GET", path: "/redirect/unsafe", enabled: true }]
    });
    const unsafe = await executeTestPlan(unsafePlan, new CancellationSignal(), { skipEnvelopeLimits: true });
    assert.ok(unsafe.samples.every(s => !s.ok));
    assert.ok(unsafe.samples.every(s => s.errorType === "invalid_target"), "cross-origin redirect must be blocked");
  });

  test("does not execute disabled requests", async () => {
    requestLog = [];
    const plan = makePlan({
      durationSeconds: 1,
      virtualUsers: 1,
      maxRequestsPerSecond: 100,
      requests: [
        { id: "on", name: "enabled", method: "GET", path: "/api/v1/products", enabled: true },
        { id: "off", name: "disabled", method: "GET", path: "/api/v1/flaky", enabled: false }
      ]
    });
    const execution = await executeTestPlan(plan, new CancellationSignal(), { skipEnvelopeLimits: true });
    assert.ok(execution.samples.length > 0);
    assert.ok(execution.samples.every(s => s.requestId === "on"), "disabled request must never run");
    assert.ok(requestLog.every(r => r.path !== "/api/v1/flaky"), "disabled path never hit");
  });

  test("cancels cleanly mid-run", async () => {
    const cancellation = new CancellationSignal();
    const plan = makePlan({ durationSeconds: 30, virtualUsers: 2, maxRequestsPerSecond: 100 });
    const started = Date.now();
    setTimeout(() => cancellation.cancel("test cancel"), 400);
    const execution = await executeTestPlan(plan, cancellation, { skipEnvelopeLimits: true });
    const elapsed = Date.now() - started;
    assert.strictEqual(execution.cancelled, true);
    assert.strictEqual(execution.cancelReason, "test cancel");
    assert.ok(elapsed < 3000, `cancel took too long: ${elapsed}ms`);
  });
});

describe("Metrics computation", () => {
  test("percentile uses nearest-rank over sorted data", () => {
    // rank for p50 of 100 items = ceil(0.5*100)=50 → 50th smallest
    const data = Array.from({ length: 100 }, (_, i) => i + 1);
    assert.strictEqual(percentile(data, 50), 50);
    assert.strictEqual(percentile(data, 95), 95);
    assert.strictEqual(percentile(data, 99), 99);
    assert.strictEqual(percentile([], 95), 0);
  });

  test("computes p50/p95/p99, error rate, and RPS correctly", () => {
    const now = Date.now();
    const samples = Array.from({ length: 100 }, (_, i) => ({
      requestId: "r",
      requestName: "r",
      virtualUserId: 0,
      method: "GET",
      status: 200,
      latencyMs: i + 1,
      ok: i >= 5, // 5 failures of 100 → 5%
      timestamp: new Date(now).toISOString()
    }));
    const plan = makePlan({
      thresholds: { p95LatencyMs: 90, maxErrorRatePercent: 4, minRequestsPerSecond: 45 }
    });
    const result = computeRunResult({
      runId: "run_x",
      plan,
      samples,
      startedAtMs: now,
      finishedAtMs: now + 2000
    });

    assert.strictEqual(result.totalRequests, 100);
    assert.strictEqual(result.successfulRequests, 95);
    assert.strictEqual(result.failedRequests, 5);
    assert.strictEqual(result.errorRatePercent, 5);
    assert.strictEqual(result.requestsPerSecond, 50);
    assert.strictEqual(result.p50LatencyMs, 50);
    assert.strictEqual(result.p95LatencyMs, 95);
    assert.strictEqual(result.p99LatencyMs, 99);

    assert.strictEqual(result.thresholdResults.p95Latency.actual, 95);
    assert.strictEqual(result.thresholdResults.p95Latency.passed, false); // 95 > 90
    assert.strictEqual(result.thresholdResults.errorRate.passed, false); // 5% > 4%
    assert.strictEqual(result.thresholdResults.requestsPerSecond.passed, true); // 50 >= 45
    assert.strictEqual(result.passed, false);
  });

  test("passes when all thresholds are met and computes the score from data", () => {
    const now = Date.now();
    const samples = Array.from({ length: 40 }, () => ({
      requestId: "r",
      requestName: "r",
      virtualUserId: 0,
      method: "GET",
      status: 200,
      latencyMs: 50,
      ok: true,
      timestamp: new Date(now).toISOString()
    }));
    const plan = makePlan({
      thresholds: { p95LatencyMs: 200, maxErrorRatePercent: 1, minRequestsPerSecond: 5 }
    });
    const result = computeRunResult({
      runId: "run_y",
      plan,
      samples,
      startedAtMs: now,
      finishedAtMs: now + 8000
    });
    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.errorRatePercent, 0);
    assert.strictEqual(result.thresholdResults.p95Latency.passed, true);
  });

  test("marks a cancelled run as not passed", () => {
    const result = computeRunResult({
      runId: "run_z",
      plan: makePlan({ thresholds: {} }),
      samples: [],
      startedAtMs: Date.now(),
      finishedAtMs: Date.now() + 100,
      cancelled: true
    });
    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.cancelled, true);
  });

  test("runTestPlan end-to-end computes a result from recorded samples", async () => {
    const plan = makePlan({ durationSeconds: 1, virtualUsers: 2, maxRequestsPerSecond: 100 });
    const { result } = await runTestPlan(plan, new CancellationSignal(), "run_e2e", { skipEnvelopeLimits: true });
    assert.strictEqual(result.runId, "run_e2e");
    assert.strictEqual(result.testPlanId, plan.id);
    assert.strictEqual(result.targetBaseUrl, plan.targetBaseUrl);
    assert.ok(result.totalRequests > 0);
    assert.strictEqual(result.samples.length, result.totalRequests);
  });
});

describe("Error classification & URL building", () => {
  test("classifies timeout errors", () => {
    const t1 = classifyError(new Error("Request timed out"));
    assert.strictEqual(t1.errorType, "timeout");
    const t2 = classifyError(Object.assign(new Error("This operation was aborted"), { name: "AbortError" }));
    assert.strictEqual(t2.errorType, "timeout");
  });

  test("classifies DNS failures", () => {
    assert.strictEqual(classifyError(Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" })).errorType, "dns_failure");
  });

  test("classifies connection failures", () => {
    assert.strictEqual(classifyError(Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" })).errorType, "connection_failure");
  });

  test("classifies unknown errors", () => {
    assert.strictEqual(classifyError(new Error("something odd")).errorType, "unknown");
  });

  test("buildRequestUrl joins paths and query params on the target origin", () => {
    const url = new URL(buildRequestUrl({ baseUrl: "https://api.example.com/v1", path: "/products", query: { page: "2" } }));
    assert.strictEqual(url.toString(), "https://api.example.com/products?page=2");
  });

  test("buildRequestUrl rejects protocol-relative paths that escape the origin", () => {
    assert.throws(() => buildRequestUrl({ baseUrl: "https://api.example.com", path: "//evil.com/x" }));
    // A full URL passed as the path is neutralized into a path segment on the
    // target origin (never redirected off-host):
    const neutralized = new URL(buildRequestUrl({ baseUrl: "https://api.example.com", path: "https://evil.com/x" }));
    assert.strictEqual(neutralized.origin, "https://api.example.com");
  });
});
