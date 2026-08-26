import { SummaryMetrics, Thresholds, FindingSeverity, FindingCategory } from "../schemas/index.js";

export interface GeneratedFinding {
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  evidence: string;
  recommendation: string;
}

export function generateFindings(metrics: SummaryMetrics, thresholds: Thresholds): GeneratedFinding[] {
  const findingsList: GeneratedFinding[] = [];

  // 1. Critical Error Rate Finding
  if (metrics.errorRate > 0.05) {
    findingsList.push({
      severity: "critical",
      category: "reliability",
      title: "Critical HTTP Error Spike Detected",
      evidence: `HTTP error rate reached ${(metrics.errorRate * 100).toFixed(2)}% (${metrics.failedRequests} failed requests out of ${metrics.totalRequests} total).`,
      recommendation: "Investigate target application server error logs, unhandled exceptions, or database connection pool exhaustion under load."
    });
  } else if (metrics.errorRate > 0.01) {
    findingsList.push({
      severity: "high",
      category: "reliability",
      title: "Elevated HTTP Error Rate",
      evidence: `HTTP error rate reached ${(metrics.errorRate * 100).toFixed(2)}%, exceeding the 1% target threshold limit.`,
      recommendation: "Inspect non-200 HTTP status code distribution and verify endpoint error recovery behavior."
    });
  }

  // 2. Latency Threshold Finding
  const maxP95 = thresholds.maxP95Ms || 2000;
  if (metrics.p95Ms > maxP95) {
    const excessPct = Math.round(((metrics.p95Ms - maxP95) / maxP95) * 100);
    findingsList.push({
      severity: excessPct > 50 ? "high" : "medium",
      category: "latency",
      title: "Target Response Latency Exceeded Threshold",
      evidence: `Observed 95th percentile (p95) response time of ${metrics.p95Ms}ms exceeded the declared threshold limit of ${maxP95}ms by ${excessPct}%.`,
      recommendation: "Optimize database query indexing, enable HTTP response caching, or reduce downstream synchronous API call latency."
    });
  }

  // 3. Timeouts Finding
  if (metrics.timeouts > 0) {
    findingsList.push({
      severity: "high",
      category: "stability",
      title: "Request Timeouts Encountered",
      evidence: `Encountered ${metrics.timeouts} request timeout(s) during execution.`,
      recommendation: "Increase worker connection timeout limits or investigate thread lock contention on the target application looper."
    });
  }

  // 4. Clean Performance Confirmation
  if (findingsList.length === 0) {
    findingsList.push({
      severity: "info",
      category: "readiness_hygiene",
      title: "Target Endpoint Met All Readiness Thresholds",
      evidence: `Target sustained ${metrics.throughputRps} RPS with 0% error rate and p95 latency of ${metrics.p95Ms}ms (below ${maxP95}ms limit).`,
      recommendation: "Target configuration is ready for baseline staging deployment under current load envelope parameters."
    });
  }

  return findingsList;
}
