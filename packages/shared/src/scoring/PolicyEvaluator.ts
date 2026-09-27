import {
  ReadinessPolicy,
  PolicyEvaluationResult,
  RuleResult,
  RuleResultStatus,
  RuleResultStatusEnum,
  BaselineComparison,
} from "../schemas/policy.js";
import { SummaryMetrics } from "../schemas/testRun.js";

export interface PolicyEvaluatorInput {
  currentRunId: string;
  score: number | null;
  confidence: "low" | "medium" | "high" | null;
  summaryMetrics: SummaryMetrics | null;
  status: string;
  hasHardCapFailure: boolean;
  policy: ReadinessPolicy;
  baseline: {
    id: string;
    score: number | null;
    summaryMetrics: SummaryMetrics | null;
  } | null;
}

export function evaluateRunAgainstPolicy(input: PolicyEvaluatorInput): PolicyEvaluationResult {
  const { currentRunId, score, confidence, summaryMetrics, status, hasHardCapFailure, policy, baseline } = input;

  const rules: RuleResult[] = [];
  let limitations: string[] = [];
  let overallResult: "pass" | "warn" | "fail" | "inconclusive" = "pass";

  // Check missing telemetry (completed run but no metrics)
  if (status === "completed" && !summaryMetrics) {
    overallResult = "inconclusive";
    limitations.push("Missing required telemetry summary metrics");
  }

  // 1. Minimum Confidence
  if (policy.minimumConfidence) {
    const confidenceOrder = { low: 1, medium: 2, high: 3 };
    const requiredLevel = confidenceOrder[policy.minimumConfidence as keyof typeof confidenceOrder] || 1;
    const actualLevel = confidenceOrder[(confidence as keyof typeof confidenceOrder)] || 0;

    if (!confidence || actualLevel < requiredLevel) {
      rules.push({
        key: "confidence",
        status: "fail",
        observed: confidence || "none",
        threshold: policy.minimumConfidence,
        message: `Run confidence (${confidence || "none"}) is below required level (${policy.minimumConfidence})`
      });
      overallResult = "inconclusive"; // Rule: inconclusive when required telemetry is missing or confidence is below minimum
    } else {
      rules.push({
        key: "confidence",
        status: "pass",
        observed: confidence,
        threshold: policy.minimumConfidence,
        message: "Confidence meets minimum requirement"
      });
    }
  } else {
    rules.push({
      key: "confidence",
      status: "not_configured",
      observed: confidence || "none",
      threshold: null,
      message: "No confidence threshold configured"
    });
  }

  // Helper to add metric rules
  const evaluateRule = (
    key: RuleResult["key"],
    observed: number | null | undefined,
    threshold: number | null | undefined,
    isMax: boolean,
    name: string
  ) => {
    if (threshold == null) {
      rules.push({
        key,
        status: "not_configured",
        observed: observed ?? null,
        threshold: null,
        message: `No ${name} threshold configured`
      });
      return;
    }

    if (observed == null) {
      rules.push({
        key,
        status: "fail", // No data
        observed: null,
        threshold,
        message: `Missing ${name} data`
      });
      if (overallResult !== "inconclusive") overallResult = "fail";
      return;
    }

    let passed = false;
    if (isMax) {
      passed = observed <= threshold;
    } else {
      passed = observed >= threshold;
    }

    if (!passed) {
      rules.push({
        key,
        status: "fail",
        observed,
        threshold,
        message: `${name} (${observed}) ${isMax ? "exceeds maximum" : "is below minimum"} (${threshold})`
      });
      if (overallResult !== "inconclusive") overallResult = "fail";
    } else {
      rules.push({
        key,
        status: "pass",
        observed,
        threshold,
        message: `${name} passes requirement`
      });
    }
  };

  // 2. Minimum Score
  evaluateRule("minimumScore", score, policy.minimumScore, false, "Score");

  // 3. Max p95
  evaluateRule("maximumP95Ms", summaryMetrics?.p95Ms, policy.maximumP95Ms, true, "p95 Latency");

  // 4. Max p99
  evaluateRule("maximumP99Ms", summaryMetrics?.p99Ms, policy.maximumP99Ms, true, "p99 Latency");

  // 5. Max Error Rate
  const observedErrorRate = summaryMetrics?.errorRate != null ? summaryMetrics.errorRate * 100 : null; // Converting to percentage
  evaluateRule("maximumErrorRatePercent", observedErrorRate, policy.maximumErrorRatePercent, true, "Error Rate");

  // 6. Min Throughput
  evaluateRule("minimumThroughputRps", summaryMetrics?.throughputRps, policy.minimumThroughputRps, false, "Throughput");

  // 7. Max Timeouts
  evaluateRule("maximumTimeouts", summaryMetrics?.timeouts, policy.maximumTimeouts, true, "Timeouts");

  // 8. Hard Cap
  if (policy.failOnHardCap) {
    if (hasHardCapFailure) {
      rules.push({
        key: "hardCap",
        status: "fail",
        observed: "triggered",
        threshold: "none",
        message: "Critical hard cap condition was triggered"
      });
      if (overallResult !== "inconclusive") overallResult = "fail";
    } else {
      rules.push({
        key: "hardCap",
        status: "pass",
        observed: "none",
        threshold: "none",
        message: "No hard cap triggered"
      });
    }
  }

  // Ensure overall result
  // The default semantics: fail when blocking threshold fails.
  // inconclusive when telemetry is missing or confidence is below minimum (handled above).
  // warn when non-blocking warning condition exists (not implemented yet based on strict limits above).
  // pass when all pass.

  // Baseline Comparison
  let baselineComparison: BaselineComparison = {
    baselineRunId: null,
    scoreDelta: null,
    p95DeltaMs: null,
    p99DeltaMs: null,
    throughputDeltaRps: null,
    errorRateDeltaPercent: null,
    regressionStatus: "not_available"
  };

  if (baseline && baseline.summaryMetrics) {
    const currentP95 = summaryMetrics?.p95Ms ?? 0;
    const currentP99 = summaryMetrics?.p99Ms ?? 0;
    const currentRps = summaryMetrics?.throughputRps ?? 0;
    const currentErr = (summaryMetrics?.errorRate ?? 0) * 100;
    const currentScore = score ?? 0;

    const baselineP95 = baseline.summaryMetrics.p95Ms ?? 0;
    const baselineP99 = baseline.summaryMetrics.p99Ms ?? 0;
    const baselineRps = baseline.summaryMetrics.throughputRps ?? 0;
    const baselineErr = (baseline.summaryMetrics.errorRate ?? 0) * 100;
    const baselineScore = baseline.score ?? 0;

    const scoreDelta = currentScore - baselineScore;
    const p95DeltaMs = currentP95 - baselineP95;
    const p99DeltaMs = currentP99 - baselineP99;
    const throughputDeltaRps = Math.round((currentRps - baselineRps) * 10) / 10;
    const errorRateDeltaPercent = Math.round((currentErr - baselineErr) * 100) / 100;

    let regressionStatus: "improved" | "stable" | "regressed" = "stable";
    
    // Lower latency is better, lower error is better.
    // Higher throughput is better provided error and latency remain healthy.
    // Score delta >= 5 -> improved. <= -5 -> regressed.
    if (scoreDelta >= 5 || p95DeltaMs <= -50 || errorRateDeltaPercent <= -1) {
      regressionStatus = "improved";
    } else if (scoreDelta <= -5 || p95DeltaMs >= 50 || errorRateDeltaPercent > 1) {
      regressionStatus = "regressed";
    }

    baselineComparison = {
      baselineRunId: baseline.id,
      scoreDelta,
      p95DeltaMs,
      p99DeltaMs,
      throughputDeltaRps,
      errorRateDeltaPercent,
      regressionStatus
    };
  }

  return {
    result: overallResult,
    policyId: policy.id,
    policyVersion: policy.version,
    evaluatedAt: new Date().toISOString(),
    rules,
    baselineComparison,
    limitations
  };
}
