import { db, testRuns, runEvents, artifacts, findings, testPlans, targets, projects } from "@proofscale/db";
import { eq, and, ne, desc } from "drizzle-orm";
import { SummaryMetrics, Thresholds, calculateReadinessScore, generateFindings, LifecycleEventBus } from "@proofscale/shared";
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

    // 7. Publish RunLifecycleEvent (run.completed and optionally run.tier_changed)
    try {
      const [runInfo] = await db
        .select({
          run: testRuns,
          plan: testPlans,
          target: targets,
          project: projects
        })
        .from(testRuns)
        .innerJoin(testPlans, eq(testRuns.planId, testPlans.id))
        .innerJoin(targets, eq(testRuns.targetId, targets.id))
        .innerJoin(projects, eq(testPlans.projectId, projects.id))
        .where(eq(testRuns.id, runId));

      if (runInfo) {
        let previousTier: string | null = null;
        const [prevRun] = await db
          .select({ readinessLabel: testRuns.readinessLabel })
          .from(testRuns)
          .where(
            and(
              eq(testRuns.targetId, runInfo.target.id),
              eq(testRuns.status, "completed"),
              ne(testRuns.id, runId)
            )
          )
          .orderBy(desc(testRuns.finishedAt))
          .limit(1);

        previousTier = prevRun?.readinessLabel || null;

        // Emit run.completed
        await LifecycleEventBus.publish({
          eventId: `evt_${crypto.randomUUID()}`,
          eventType: "run.completed",
          occurredAt: now.toISOString(),
          orgId: runInfo.project.organizationId,
          projectId: runInfo.project.id,
          targetId: runInfo.target.id,
          runId,
          payload: {
            targetName: runInfo.target.baseUrl,
            scenario: runInfo.plan.profile,
            score: scoreBreakdown.overallScore,
            tier: scoreBreakdown.label as any,
            previousTier,
            errorRate: metrics.errorRate,
            p95LatencyMs: metrics.p95Ms
          }
        });

        // Distinct second event if tier changed
        if (previousTier !== null && previousTier !== scoreBreakdown.label) {
          await LifecycleEventBus.publish({
            eventId: `evt_${crypto.randomUUID()}`,
            eventType: "run.tier_changed",
            occurredAt: now.toISOString(),
            orgId: runInfo.project.organizationId,
            projectId: runInfo.project.id,
            targetId: runInfo.target.id,
            runId,
            payload: {
              targetName: runInfo.target.baseUrl,
              scenario: runInfo.plan.profile,
              score: scoreBreakdown.overallScore,
              tier: scoreBreakdown.label as any,
              previousTier,
              errorRate: metrics.errorRate,
              p95LatencyMs: metrics.p95Ms
            }
          });
        }
      }
    } catch (evtErr) {
      console.error("Failed to publish run.completed event:", evtErr);
    }
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

    // Publish run.failed event
    try {
      const [runInfo] = await db
        .select({
          run: testRuns,
          plan: testPlans,
          target: targets,
          project: projects
        })
        .from(testRuns)
        .innerJoin(testPlans, eq(testRuns.planId, testPlans.id))
        .innerJoin(targets, eq(testRuns.targetId, targets.id))
        .innerJoin(projects, eq(testPlans.projectId, projects.id))
        .where(eq(testRuns.id, runId));

      if (runInfo) {
        await LifecycleEventBus.publish({
          eventId: `evt_${crypto.randomUUID()}`,
          eventType: "run.failed",
          occurredAt: now.toISOString(),
          orgId: runInfo.project.organizationId,
          projectId: runInfo.project.id,
          targetId: runInfo.target.id,
          runId,
          payload: {
            targetName: runInfo.target.baseUrl,
            scenario: runInfo.plan.profile,
            failureReason: errorMessage
          }
        });
      }
    } catch (evtErr) {
      console.error("Failed to publish run.failed event:", evtErr);
    }
  }
}
