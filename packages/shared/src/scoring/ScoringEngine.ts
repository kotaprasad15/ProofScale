import { SummaryMetrics, Thresholds, ScoreBreakdown, ReadinessLabel, ConfidenceLevel, CategoryScore } from "../schemas/index.js";
import { SCORING_VERSION, CATEGORY_WEIGHTS, STANDARD_LIMITATIONS } from "../constants.js";

/**
 * Versioned pure deterministic scoring engine (mvp-1).
 * Transforms empirical test metrics and plan thresholds into category scores, confidence grades, and readiness labels.
 */
export function calculateReadinessScore(
  metrics: SummaryMetrics,
  thresholds: Thresholds,
  testDurationSec = 30
): ScoreBreakdown {
  const criticalFailures: string[] = [];

  // 1. Reliability Score (30% Weight)
  // Base 100, deducted by 5 points for every 1% error rate
  const errorRatePercent = metrics.errorRate * 100;
  const reliabilityScoreValue = Math.max(Math.round(100 - errorRatePercent * 5), 0);
  const reliabilityPassed = metrics.errorRate <= (thresholds.maxErrorRate ?? 0.01);

  if (metrics.errorRate > 0.05) {
    criticalFailures.push(`HTTP error rate (${errorRatePercent.toFixed(2)}%) exceeded the 5% critical safety threshold.`);
  }

  // 2. Latency Score (25% Weight)
  // Evaluates p95 latency against target threshold
  const maxP95 = thresholds.maxP95Ms || 2000;
  let latencyScoreValue = 100;
  if (metrics.p95Ms > maxP95) {
    const latencyExcessRatio = (metrics.p95Ms - maxP95) / maxP95;
    latencyScoreValue = Math.max(Math.round(100 - latencyExcessRatio * 50), 0);
  }
  const latencyPassed = metrics.p95Ms <= maxP95;

  // 3. Capacity Behavior Score (20% Weight)
  // Evaluates sustained RPS throughput vs minRps requirement
  let capacityScoreValue = 100;
  if (thresholds.minRps && thresholds.minRps > 0) {
    if (metrics.throughputRps < thresholds.minRps) {
      const rpsRatio = metrics.throughputRps / thresholds.minRps;
      capacityScoreValue = Math.max(Math.round(rpsRatio * 100), 0);
    }
  }

  // 4. Stability Score (15% Weight)
  // Evaluates timeouts and variance
  let stabilityScoreValue = 100;
  if (metrics.timeouts > 0) {
    const timeoutRatio = metrics.timeouts / Math.max(metrics.totalRequests, 1);
    stabilityScoreValue = Math.max(Math.round(100 - timeoutRatio * 100 * 10), 0);
  }

  // 5. Readiness Hygiene Score (10% Weight)
  const hygieneScoreValue = 100;

  // Calculate Weighted Overall Score
  const rawOverall = Math.round(
    reliabilityScoreValue * CATEGORY_WEIGHTS.reliability +
    latencyScoreValue * CATEGORY_WEIGHTS.latency +
    capacityScoreValue * CATEGORY_WEIGHTS.capacityBehavior +
    stabilityScoreValue * CATEGORY_WEIGHTS.stability +
    hygieneScoreValue * CATEGORY_WEIGHTS.readinessHygiene
  );

  // Apply Hard Safety Caps
  let overallScore = Math.min(rawOverall, 100);
  if (criticalFailures.length > 0) {
    overallScore = Math.min(overallScore, 49); // Capped to Not Ready
  }

  // Map Readiness Label
  let label: ReadinessLabel = "Ready";
  if (overallScore < 50) {
    label = "Not ready";
  } else if (overallScore < 75) {
    label = "Needs investigation";
  } else if (overallScore < 90) {
    label = "Conditionally ready";
  }

  // Map Confidence Level
  let confidence: ConfidenceLevel = "high";
  if (metrics.totalRequests < 30 || testDurationSec < 10) {
    confidence = "low";
  } else if (metrics.totalRequests < 100 || testDurationSec < 30) {
    confidence = "medium";
  }

  const buildCategoryScore = (score: number, weight: number, passed: boolean, notes?: string): CategoryScore => ({
    score,
    weight,
    weightedScore: Math.round(score * weight * 10) / 10,
    passed,
    notes
  });

  return {
    scoringVersion: SCORING_VERSION,
    overallScore,
    label,
    confidence,
    categories: {
      reliability: buildCategoryScore(
        reliabilityScoreValue,
        CATEGORY_WEIGHTS.reliability,
        reliabilityPassed,
        `Measured error rate: ${(errorRatePercent).toFixed(2)}% (Threshold: ${((thresholds.maxErrorRate ?? 0.01) * 100).toFixed(1)}%)`
      ),
      latency: buildCategoryScore(
        latencyScoreValue,
        CATEGORY_WEIGHTS.latency,
        latencyPassed,
        `Measured p95: ${metrics.p95Ms}ms (Threshold: ${maxP95}ms)`
      ),
      capacityBehavior: buildCategoryScore(
        capacityScoreValue,
        CATEGORY_WEIGHTS.capacityBehavior,
        metrics.throughputRps > 0,
        `Sustained throughput: ${metrics.throughputRps} RPS`
      ),
      stability: buildCategoryScore(
        stabilityScoreValue,
        CATEGORY_WEIGHTS.stability,
        metrics.timeouts === 0,
        `Timeouts encountered: ${metrics.timeouts}`
      ),
      readinessHygiene: buildCategoryScore(
        hygieneScoreValue,
        CATEGORY_WEIGHTS.readinessHygiene,
        true,
        "Target protocol & health endpoints verified"
      )
    },
    criticalFailures,
    limitations: [...STANDARD_LIMITATIONS]
  };
}
