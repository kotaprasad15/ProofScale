import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateRunAgainstPolicy } from "../scoring/PolicyEvaluator.js";
import { ReadinessPolicy } from "../schemas/policy.js";
import { SummaryMetrics } from "../schemas/testRun.js";

describe("PolicyEvaluator", () => {
  const defaultPolicy: ReadinessPolicy = {
    id: "pol_1",
    organizationId: "org_1",
    projectId: "proj_1",
    testPlanId: "plan_1",
    version: 1,
    name: "Test Policy",
    status: "active",
    failOnHardCap: false,
    createdBy: "usr_1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const defaultMetrics: any = {
    totalRequests: 100,
    requestsPerSecond: 10,
    errorRate: 0,
    throughputRps: 10,
    timeouts: 0,
    latencyPercentiles: { p50: 10, p90: 20, p95: 30, p99: 40 },
    p95Ms: 30,
    p99Ms: 40
  };

  it("should pass when metrics meet policy", () => {
    const policy: ReadinessPolicy = { ...defaultPolicy, minimumScore: 80, maximumP95Ms: 50 };
    const result = evaluateRunAgainstPolicy({
      currentRunId: "run_1",
      score: 90,
      confidence: "high",
      summaryMetrics: defaultMetrics,
      status: "completed",
      hasHardCapFailure: false,
      policy,
      baseline: null
    });

    assert.equal(result.result, "pass");
    assert.equal(result.rules.find(r => r.key === "minimumScore")?.status, "pass");
    assert.equal(result.rules.find(r => r.key === "maximumP95Ms")?.status, "pass");
  });

  it("should fail when score is below minimum", () => {
    const policy: ReadinessPolicy = { ...defaultPolicy, minimumScore: 80 };
    const result = evaluateRunAgainstPolicy({
      currentRunId: "run_1",
      score: 75,
      confidence: "high",
      summaryMetrics: defaultMetrics as any,
      status: "completed",
      hasHardCapFailure: false,
      policy,
      baseline: null
    });

    assert.equal(result.result, "fail");
  });

  it("should fail when hard cap is triggered", () => {
    const policy: ReadinessPolicy = { ...defaultPolicy, failOnHardCap: true };
    const result = evaluateRunAgainstPolicy({
      currentRunId: "run_1",
      score: 90,
      confidence: "high",
      summaryMetrics: defaultMetrics as any,
      status: "completed",
      hasHardCapFailure: true,
      policy,
      baseline: null
    });

    assert.equal(result.result, "fail");
  });

  it("should be inconclusive if missing telemetry", () => {
    const result = evaluateRunAgainstPolicy({
      currentRunId: "run_1",
      score: 90,
      confidence: "high",
      summaryMetrics: null,
      status: "completed",
      hasHardCapFailure: false,
      policy: defaultPolicy,
      baseline: null
    });

    assert.equal(result.result, "inconclusive");
  });

  it("calculates baseline comparison properly", () => {
    const result = evaluateRunAgainstPolicy({
      currentRunId: "run_1",
      score: 90,
      confidence: "high",
      summaryMetrics: { ...defaultMetrics, p95Ms: 150, errorRate: 0.05 } as any,
      status: "completed",
      hasHardCapFailure: false,
      policy: defaultPolicy,
      baseline: {
        id: "run_0",
        score: 80,
        summaryMetrics: { ...defaultMetrics, p95Ms: 100, errorRate: 0.03 } as any
      }
    });

    assert.equal(result.baselineComparison.scoreDelta, 10);
    assert.equal(result.baselineComparison.p95DeltaMs, 50);
    assert.equal(result.baselineComparison.errorRateDeltaPercent, 2);
    // Score delta +10 is an improvement, but p95 increased by 50ms and error rate by 2%
    // Improved logic takes precedence if scoreDelta >= 5. Wait, in our logic it's OR.
    // Let's verify the regression status based on our logic.
    assert.equal(result.baselineComparison.regressionStatus, "improved"); // Because scoreDelta >= 5
  });
});
