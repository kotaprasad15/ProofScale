import assert from "node:assert";
import { test, describe } from "node:test";
import {
  calculateReadinessScore,
  generateFindings,
  exportReportToMarkdown,
  exportReportToJson,
  compareTestRuns
} from "@proofscale/shared";
import { appRouter } from "../routers/index.js";
import { createContext } from "../context.js";
import { db, testRuns } from "@proofscale/db";

describe("Phase 4: Deterministic Scoring & Report Engine", () => {
  const mockReq = {
    headers: {
      "x-user-id": "usr_admin_01",
      "x-user-email": "lead@acme.dev",
      "x-organization-id": "org_default_01"
    }
  } as any;

  const caller = appRouter.createCaller(async () => createContext({ req: mockReq }));

  describe("Deterministic Scoring Engine (mvp-1)", () => {
    test("assigns 100 score and 'Ready' label for ideal metrics", () => {
      const metrics = {
        totalRequests: 500,
        successfulRequests: 500,
        failedRequests: 0,
        throughputRps: 50,
        p50Ms: 20,
        p95Ms: 40,
        p99Ms: 80,
        errorRate: 0,
        statusCodes: { "200": 500 },
        timeouts: 0
      };

      const score = calculateReadinessScore(metrics, { maxP95Ms: 500, maxP99Ms: 1000, maxErrorRate: 0.01 }, 60);
      assert.strictEqual(score.overallScore, 100);
      assert.strictEqual(score.label, "Ready");
      assert.strictEqual(score.confidence, "high");
      assert.strictEqual(score.categories.reliability.score, 100);
    });

    test("applies hard cap (max 49 score, 'Not ready') for > 5% error rate", () => {
      const metrics = {
        totalRequests: 500,
        successfulRequests: 460,
        failedRequests: 40,
        throughputRps: 45,
        p50Ms: 30,
        p95Ms: 80,
        p99Ms: 150,
        errorRate: 0.08, // 8% error rate
        statusCodes: { "200": 460, "500": 40 },
        timeouts: 0
      };

      const score = calculateReadinessScore(metrics, { maxP95Ms: 500, maxP99Ms: 1000, maxErrorRate: 0.01 }, 60);
      assert.ok(score.overallScore <= 49);
      assert.strictEqual(score.label, "Not ready");
      assert.ok(score.criticalFailures.length > 0);
    });

    test("assigns 'low' confidence grade for small sample size (<30 reqs)", () => {
      const metrics = {
        totalRequests: 10,
        successfulRequests: 10,
        failedRequests: 0,
        throughputRps: 2,
        p50Ms: 15,
        p95Ms: 30,
        p99Ms: 50,
        errorRate: 0,
        statusCodes: { "200": 10 },
        timeouts: 0
      };

      const score = calculateReadinessScore(metrics, { maxP95Ms: 500, maxP99Ms: 1000, maxErrorRate: 0.01 }, 5);
      assert.strictEqual(score.confidence, "low");
    });
  });

  describe("Automated Findings Generator", () => {
    test("generates critical finding for error rate spike", () => {
      const metrics = {
        totalRequests: 200,
        successfulRequests: 180,
        failedRequests: 20,
        throughputRps: 20,
        p50Ms: 50,
        p95Ms: 100,
        p99Ms: 200,
        errorRate: 0.10,
        statusCodes: { "200": 180, "500": 20 },
        timeouts: 0
      };

      const findingsList = generateFindings(metrics, { maxP95Ms: 500, maxP99Ms: 1000, maxErrorRate: 0.01 });
      assert.ok(findingsList.some(f => f.severity === "critical"));
    });

    test("generates clean info finding for clean run", () => {
      const metrics = {
        totalRequests: 200,
        successfulRequests: 200,
        failedRequests: 0,
        throughputRps: 30,
        p50Ms: 25,
        p95Ms: 45,
        p99Ms: 90,
        errorRate: 0,
        statusCodes: { "200": 200 },
        timeouts: 0
      };

      const findingsList = generateFindings(metrics, { maxP95Ms: 500, maxP99Ms: 1000, maxErrorRate: 0.01 });
      assert.strictEqual(findingsList.length, 1);
      assert.strictEqual(findingsList[0].severity, "info");
    });
  });

  describe("Report Exporters & Run Comparison Engine", () => {
    test("formats clean GitHub-Flavored Markdown report", () => {
      const scoreBreakdown = calculateReadinessScore(
        { totalRequests: 100, successfulRequests: 100, failedRequests: 0, throughputRps: 20, p50Ms: 10, p95Ms: 30, p99Ms: 50, errorRate: 0, statusCodes: {}, timeouts: 0 },
        { maxP95Ms: 500, maxP99Ms: 1000, maxErrorRate: 0.01 }
      );

      const markdown = exportReportToMarkdown({
        runId: "run_sample_01",
        projectName: "Payment Gateway API",
        targetBaseUrl: "http://localhost:4000",
        planName: "Checkout Smoke Check",
        profile: "smoke",
        targetVersionLabel: "v1.0.0",
        region: "local-us-east",
        createdAt: new Date().toISOString(),
        scoreBreakdown,
        summaryMetrics: { totalRequests: 100, successfulRequests: 100, failedRequests: 0, throughputRps: 20, p50Ms: 10, p95Ms: 30, p99Ms: 50, errorRate: 0, statusCodes: {}, timeouts: 0 },
        findings: []
      });

      assert.match(markdown, /# ProofScale Readiness Assessment Report/);
      assert.match(markdown, /Executive Summary/);
      assert.match(markdown, /Category Score Breakdown/);
    });

    test("compares baseline vs current run diffs correctly", () => {
      const baseline = {
        id: "run_base_01",
        score: 80,
        summaryMetrics: { totalRequests: 100, successfulRequests: 100, failedRequests: 0, throughputRps: 20, p50Ms: 40, p95Ms: 120, p99Ms: 200, errorRate: 0, statusCodes: {}, timeouts: 0 }
      };

      const current = {
        id: "run_curr_01",
        score: 95,
        summaryMetrics: { totalRequests: 100, successfulRequests: 100, failedRequests: 0, throughputRps: 25, p50Ms: 15, p95Ms: 35, p99Ms: 60, errorRate: 0, statusCodes: {}, timeouts: 0 }
      };

      const diff = compareTestRuns(baseline, current);
      assert.strictEqual(diff.scoreDiff, 15);
      assert.strictEqual(diff.p95DiffMs, -85);
      assert.strictEqual(diff.regressionStatus, "improved");
    });
  });

  describe("Token-Hashed Report Sharing Service", () => {
    test("creates share link, fetches public report, and respects revocation", async () => {
      // 1. Create a dummy completed run
      const runId = `run_share_test_${Date.now()}`;
      await db.insert(testRuns).values({
        id: runId,
        planId: "plan_smoke_01",
        targetId: "target_fixture_01",
        status: "completed",
        score: 92,
        readinessLabel: "Ready",
        scoreBreakdownJson: JSON.stringify({ overallScore: 92, label: "Ready", confidence: "high", categories: {}, criticalFailures: [], limitations: [] }),
        requestedByUserId: "usr_admin_01"
      });

      // 2. Generate share link
      const shareResult = await caller.reports.createShareLink({ runId, expiresInDays: 30 });
      assert.ok(shareResult.rawToken);
      assert.ok(shareResult.shareId);

      // 3. Query public report via raw token
      const publicReport = await caller.reports.getPublicReport({ token: shareResult.rawToken });
      assert.ok(publicReport);
      assert.strictEqual(publicReport.run.id, runId);
      assert.strictEqual(publicReport.run.score, 92);

      // 4. Revoke share link
      await caller.reports.revokeShareLink({ shareId: shareResult.shareId });

      // 5. Subsequent public query should fail with FORBIDDEN
      await assert.rejects(
        async () => {
          await caller.reports.getPublicReport({ token: shareResult.rawToken });
        },
        (err: any) => {
          assert.strictEqual(err.code, "FORBIDDEN");
          assert.match(err.message, /revoked/);
          return true;
        }
      );
    });
  });
});
