import { db, testRuns, runEvents, artifacts, findings } from "@proofscale/db";
import { eq } from "drizzle-orm";
import { SummaryMetrics, Thresholds, calculateReadinessScore, generateFindings } from "@proofscale/shared";
import crypto from "node:crypto";

export class WorkerCallbackClient {
  /**
   * Updates run status to 'running' and logs progress event.
   */
  static async reportStarted(runId: string, workerId: string, engineUsed: string): Promise<void> {
    const now = new Date();

    await db
      .update(testRuns)
      .set({
        status: "running",
        updatedAt: now
      })
      .where(eq(testRuns.id, runId));

    await db.insert(runEvents).values({
      id: `evt_${crypto.randomUUID().slice(0, 8)}`,
      runId,
      eventType: "started",
      message: `Load test execution started on worker '${workerId}' using engine '${engineUsed}'`
    });
  }

  /**
   * Completes a run, calculates deterministic score, saves metrics summary, findings & evidence artifact.
   */
  static async reportCompleted(
    runId: string,
    metrics: SummaryMetrics,
    rawOutput: string,
    thresholds: Thresholds,
    testDurationSec = 30
  ): Promise<void> {
    const now = new Date();

    // 1. Calculate Versioned Deterministic Score
    const scoreBreakdown = calculateReadinessScore(metrics, thresholds, testDurationSec);

    // 2. Generate Automated Findings
    const generatedFindings = generateFindings(metrics, thresholds);

    // 3. Update DB run record
    await db
      .update(testRuns)
      .set({
        status: "completed",
        finishedAt: now,
        summaryMetricsJson: JSON.stringify(metrics),
        score: scoreBreakdown.overallScore,
        confidence: scoreBreakdown.confidence,
        readinessLabel: scoreBreakdown.label,
        scoreBreakdownJson: JSON.stringify(scoreBreakdown),
        updatedAt: now
      })
      .where(eq(testRuns.id, runId));

    // 4. Save Findings to DB
    for (const f of generatedFindings) {
      await db.insert(findings).values({
        id: `fnd_${crypto.randomUUID().slice(0, 8)}`,
        runId,
        severity: f.severity,
        category: f.category,
        title: f.title,
        evidence: f.evidence,
        recommendation: f.recommendation
      });
    }

    // 5. Log completion event
    await db.insert(runEvents).values({
      id: `evt_${crypto.randomUUID().slice(0, 8)}`,
      runId,
      eventType: "completed",
      message: `Load test completed successfully. Score: ${scoreBreakdown.overallScore}/100 (${scoreBreakdown.label})`
    });

    // 6. Save Raw Artifact metadata
    const artifactId = `art_${crypto.randomUUID().slice(0, 8)}`;
    const objectKey = `runs/${runId}/raw_output.log`;
    const retentionUntil = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

    await db.insert(artifacts).values({
      id: artifactId,
      runId,
      objectKey,
      type: "raw_runner_output",
      sizeBytes: Buffer.byteLength(rawOutput, "utf8"),
      checksum: crypto.createHash("sha256").update(rawOutput).digest("hex"),
      retentionUntil
    });
  }

  /**
   * Reports run failure.
   */
  static async reportFailed(runId: string, errorMessage: string): Promise<void> {
    const now = new Date();

    await db
      .update(testRuns)
      .set({
        status: "failed",
        errorMessage,
        finishedAt: now,
        updatedAt: now
      })
      .where(eq(testRuns.id, runId));

    await db.insert(runEvents).values({
      id: `evt_${crypto.randomUUID().slice(0, 8)}`,
      runId,
      eventType: "failed",
      message: `Load test execution failed: ${errorMessage}`
    });
  }
}
