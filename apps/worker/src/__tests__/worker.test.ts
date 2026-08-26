import assert from "node:assert";
import { test, describe, before, after } from "node:test";
import { createFixtureApp } from "@proofscale/fixture-target";
import { QueueManager } from "../queue/QueueManager.js";
import { generateK6Script } from "../runner/k6ScriptGenerator.js";
import { executeLoadTest } from "../runner/k6Runner.js";
import { WorkerCallbackClient } from "../services/WorkerCallbackClient.js";
import { db, organizations, projects, targets, testPlans, testRuns, artifacts } from "@proofscale/db";
import { eq } from "drizzle-orm";
import http from "node:http";
import crypto from "node:crypto";

describe("Phase 3: Execution Plane & Worker Engine", () => {
  let server: http.Server;
  const PORT = 4005;
  const baseUrl = `http://localhost:${PORT}`;

  before(async () => {
    try {
      process.env.NODE_ENV = "test";
      const app = createFixtureApp();
      await new Promise<void>(resolve => {
        server = app.listen(PORT, () => resolve());
      });

      await db.insert(organizations).values({ id: "org_default_01", name: "Acme Engineering Corp", slug: "acme-engineering", ownerId: "usr_admin_01" }).onConflictDoNothing();
      await db.insert(projects).values({ id: "proj_demo_01", organizationId: "org_default_01", name: "Payment Gateway API", environment: "staging" }).onConflictDoNothing();
      await db.insert(targets).values({ id: "target_fixture_01", projectId: "proj_demo_01", baseUrl: baseUrl, healthUrl: `${baseUrl}/health`, environment: "staging", authorizationStatus: "verified", allowedHost: "localhost" })
        .onConflictDoUpdate({ target: targets.id, set: { baseUrl: baseUrl, healthUrl: `${baseUrl}/health` } });
      await db.insert(testPlans).values({ id: "plan_smoke_01", projectId: "proj_demo_01", name: "Checkout API Smoke Check", version: 1, profile: "smoke", scenariosJson: "[]", loadProfileJson: "{}", thresholdsJson: "{}", scoringVersion: "mvp-1" }).onConflictDoNothing();
    } catch (err) {
      console.error("EXACT BEFORE ERROR:", err);
      throw err;
    }
  });

  after(async () => {
    await new Promise<void>(resolve => {
      server.close(() => resolve());
    });
  });

  test("QueueManager atomically claims next queued run", async () => {
    const runId = `run_test_${crypto.randomUUID().slice(0, 6)}`;
    
    // 1. Enqueue a test run
    await db.insert(testRuns).values({
      id: runId,
      planId: "plan_smoke_01",
      targetId: "target_fixture_01",
      status: "queued",
      requestedByUserId: "usr_admin_01"
    });

    // 2. Claim job via worker
    const job = await QueueManager.claimNextJob("worker_unit_01", 30, runId);
    assert.ok(job);
    assert.strictEqual(job.run.id, runId);
    assert.strictEqual(job.run.status, "starting");
    assert.strictEqual(job.run.workerId, "worker_unit_01");
    assert.ok(job.run.leaseExpiresAt);
  });

  test("k6ScriptGenerator produces valid JavaScript runner script", () => {
    const script = generateK6Script(
      baseUrl,
      [
        { name: "Health Check", method: "GET", path: "/health", weight: 1 },
        { name: "List Products", method: "GET", path: "/api/v1/products", weight: 1 }
      ],
      { virtualUsers: 5, durationSeconds: 10, rampUpSeconds: 2, timeoutMs: 3000 },
      { maxP95Ms: 1000, maxP99Ms: 2000, maxErrorRate: 0.01 }
    );

    assert.match(script, /import http from 'k6\/http'/);
    assert.match(script, /http\.request\('GET'/);
    assert.match(script, /target: 5/);
    assert.match(script, /p\(95\)<1000/);
  });

  test("executeLoadTest runs against fixture target and parses metrics", async () => {
    const result = await executeLoadTest(
      baseUrl,
      [
        { name: "Health Check", method: "GET", path: "/health", weight: 1 },
        { name: "List Products", method: "GET", path: "/api/v1/products", weight: 1 }
      ],
      { virtualUsers: 3, durationSeconds: 2, rampUpSeconds: 1, timeoutMs: 5000 },
      { maxP95Ms: 1000, maxP99Ms: 2000, maxErrorRate: 0.01 }
    );

    assert.ok(result.metrics.totalRequests > 0);
    assert.strictEqual(result.metrics.failedRequests, 0);
    assert.strictEqual(result.metrics.errorRate, 0);
    assert.ok(result.metrics.p50Ms >= 0);
    assert.ok(result.metrics.p95Ms >= 0);
    assert.ok(result.rawOutput.length > 0);
  });

  test("WorkerCallbackClient completes run and records artifact metadata", async () => {
    const runId = `run_cb_${crypto.randomUUID().slice(0, 6)}`;
    
    await db.insert(testRuns).values({
      id: runId,
      planId: "plan_smoke_01",
      targetId: "target_fixture_01",
      status: "running",
      requestedByUserId: "usr_admin_01"
    });

    const mockMetrics = {
      totalRequests: 100,
      successfulRequests: 100,
      failedRequests: 0,
      throughputRps: 50,
      p50Ms: 25,
      p95Ms: 45,
      p99Ms: 70,
      minMs: 10,
      maxMs: 80,
      avgMs: 30,
      errorRate: 0,
      statusCodes: { "200": 100 },
      timeouts: 0
    };

    await WorkerCallbackClient.reportCompleted(runId, mockMetrics, "Raw runner stdout log trace", { maxP95Ms: 1000, maxP99Ms: 2000, maxErrorRate: 0.01 }, 30);

    const [updatedRun] = await db.select().from(testRuns).where(eq(testRuns.id, runId));
    assert.strictEqual(updatedRun.status, "completed");
    assert.strictEqual(updatedRun.score, 100);
    assert.strictEqual(updatedRun.readinessLabel, "Ready");

    const [artifact] = await db.select().from(artifacts).where(eq(artifacts.runId, runId));
    assert.ok(artifact);
    assert.strictEqual(artifact.type, "raw_runner_output");
  });
});
