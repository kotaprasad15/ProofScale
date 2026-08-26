import { ScoreBreakdown, SummaryMetrics } from "../schemas/index.js";
import { GeneratedFinding } from "../scoring/FindingsGenerator.js";

export interface ReportExportInput {
  runId: string;
  projectName: string;
  targetBaseUrl: string;
  planName: string;
  profile: string;
  targetVersionLabel: string;
  region: string;
  createdAt: Date | string;
  scoreBreakdown: ScoreBreakdown;
  summaryMetrics?: SummaryMetrics | null;
  findings: GeneratedFinding[];
}

export function exportReportToMarkdown(data: ReportExportInput): string {
  const sb = data.scoreBreakdown;
  const metrics = data.summaryMetrics;
  const createdDateStr = new Date(data.createdAt).toUTCString();

  let md = `# ProofScale Readiness Assessment Report\n\n`;
  md += `**Project:** ${data.projectName}  \n`;
  md += `**Target Base URL:** \`${data.targetBaseUrl}\`  \n`;
  md += `**Target Version:** \`${data.targetVersionLabel}\`  \n`;
  md += `**Test Profile:** ${data.profile.toUpperCase()} (${data.planName})  \n`;
  md += `**Evaluation Timestamp:** ${createdDateStr}  \n\n`;

  md += `---\n\n`;
  md += `## Executive Summary\n\n`;
  md += `| Score | Readiness Status | Confidence Grade | Scoring Version |\n`;
  md += `|---|---|---|---|\n`;
  md += `| **${sb.overallScore} / 100** | **${sb.label}** | **${sb.confidence.toUpperCase()}** | \`${sb.scoringVersion}\` |\n\n`;

  if (sb.criticalFailures.length > 0) {
    md += `> [!CAUTION]\n`;
    md += `> **Critical Failures Encountered:**\n`;
    sb.criticalFailures.forEach((cf: string) => {
      md += `> - ${cf}\n`;
    });
    md += `\n`;
  }

  md += `## Category Score Breakdown\n\n`;
  md += `| Category | Weight | Score | Status | Notes |\n`;
  md += `|---|---|---|---|---|\n`;
  md += `| Reliability | 30% | ${sb.categories.reliability.score}/100 | ${sb.categories.reliability.passed ? "PASS" : "FAIL"} | ${sb.categories.reliability.notes || "-"} |\n`;
  md += `| Latency | 25% | ${sb.categories.latency.score}/100 | ${sb.categories.latency.passed ? "PASS" : "FAIL"} | ${sb.categories.latency.notes || "-"} |\n`;
  md += `| Capacity Behavior | 20% | ${sb.categories.capacityBehavior.score}/100 | ${sb.categories.capacityBehavior.passed ? "PASS" : "FAIL"} | ${sb.categories.capacityBehavior.notes || "-"} |\n`;
  md += `| Stability | 15% | ${sb.categories.stability.score}/100 | ${sb.categories.stability.passed ? "PASS" : "FAIL"} | ${sb.categories.stability.notes || "-"} |\n`;
  md += `| Readiness Hygiene | 10% | ${sb.categories.readinessHygiene.score}/100 | ${sb.categories.readinessHygiene.passed ? "PASS" : "FAIL"} | ${sb.categories.readinessHygiene.notes || "-"} |\n\n`;

  if (metrics) {
    md += `## Observed Metrics Summary\n\n`;
    md += `- **Total Requests:** ${metrics.totalRequests.toLocaleString()}\n`;
    md += `- **Throughput:** ${metrics.throughputRps} RPS\n`;
    md += `- **50th Percentile (p50):** ${metrics.p50Ms} ms\n`;
    md += `- **95th Percentile (p95):** ${metrics.p95Ms} ms\n`;
    md += `- **99th Percentile (p99):** ${metrics.p99Ms} ms\n`;
    md += `- **Error Rate:** ${(metrics.errorRate * 100).toFixed(2)}%\n\n`;
  }

  md += `## Prioritized Findings & Remediation\n\n`;
  if (data.findings.length === 0) {
    md += `No significant findings recorded.\n\n`;
  } else {
    data.findings.forEach((f, idx) => {
      md += `### ${idx + 1}. [${f.severity.toUpperCase()}] ${f.title}\n\n`;
      md += `- **Category:** ${f.category}\n`;
      md += `- **Empirical Evidence:** ${f.evidence}\n`;
      md += `- **Recommended Action:** ${f.recommendation}\n\n`;
    });
  }

  md += `## Methodological Limitations\n\n`;
  sb.limitations.forEach((lim: string) => {
    md += `- ${lim}\n`;
  });
  md += `\n---\n*Report generated automatically by ProofScale Application Readiness Platform.*\n`;

  return md;
}

export function exportReportToJson(data: ReportExportInput): string {
  return JSON.stringify(data, null, 2);
}
