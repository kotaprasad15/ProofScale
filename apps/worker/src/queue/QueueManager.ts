import { db, testRuns, runEvents, testPlans, targets } from "@proofscale/db";
import { eq, and, lt, or } from "drizzle-orm";
import crypto from "node:crypto";

export interface ClaimedJob {
  run: typeof testRuns.$inferSelect;
  plan: typeof testPlans.$inferSelect;
  target: typeof targets.$inferSelect;
}

export class QueueManager {
  /**
   * Atomically claims the next available queued test run from the database.
   */
  static async claimNextJob(
    workerId: string,
    leaseDurationSeconds = 60,
    targetRunId?: string
  ): Promise<ClaimedJob | null> {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + leaseDurationSeconds * 1000);

    // 1. Find next queued run (or specific runId if provided)
    const query = db
      .select()
      .from(testRuns)
      .where(
        targetRunId
          ? and(eq(testRuns.id, targetRunId), eq(testRuns.status, "queued"))
          : eq(testRuns.status, "queued")
      )
      .limit(1);

    const [queuedRun] = await query;

    if (!queuedRun) {
      return null;
    }

    // 2. Atomically transition status to 'starting' and claim lease
    const [updatedRun] = await db
      .update(testRuns)
      .set({
        status: "starting",
        workerId,
        leaseOwner: workerId,
        leaseExpiresAt,
        attemptCount: queuedRun.attemptCount + 1,
        startedAt: now,
        updatedAt: now
      })
      .where(and(eq(testRuns.id, queuedRun.id), eq(testRuns.status, "queued")))
      .returning();

    if (!updatedRun) {
      // Race condition: job was claimed by another worker
      return null;
    }

    // 3. Fetch plan and target details
    const [plan] = await db.select().from(testPlans).where(eq(testPlans.id, updatedRun.planId));
    const [target] = await db.select().from(targets).where(eq(targets.id, updatedRun.targetId));

    // 4. Log worker claim event
    await db.insert(runEvents).values({
      id: `evt_${crypto.randomUUID().slice(0, 8)}`,
      runId: updatedRun.id,
      eventType: "starting",
      message: `Job claimed by worker '${workerId}' (Lease expires in ${leaseDurationSeconds}s)`
    });

    return {
      run: updatedRun,
      plan,
      target
    };
  }

  /**
   * Periodically extends the lease timer for an actively running job.
   */
  static async renewLease(runId: string, workerId: string, leaseDurationSeconds = 60): Promise<boolean> {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + leaseDurationSeconds * 1000);

    const [updated] = await db
      .update(testRuns)
      .set({
        leaseExpiresAt,
        updatedAt: now
      })
      .where(and(eq(testRuns.id, runId), eq(testRuns.leaseOwner, workerId)))
      .returning();

    return !!updated;
  }

  /**
   * Scans for abandoned or expired leases and reclaims or fails them.
   */
  static async reclaimExpiredLeases(maxAttempts = 3): Promise<number> {
    const now = new Date();

    const expiredJobs = await db
      .select()
      .from(testRuns)
      .where(
        and(
          or(eq(testRuns.status, "starting"), eq(testRuns.status, "running")),
          lt(testRuns.leaseExpiresAt, now)
        )
      );

    let reclaimedCount = 0;

    for (const job of expiredJobs) {
      if (job.attemptCount >= maxAttempts) {
        // Exceeded retries -> mark failed
        await db
          .update(testRuns)
          .set({
            status: "failed",
            errorMessage: `Worker lease expired after ${job.attemptCount} attempts. Job failed.`,
            finishedAt: now,
            updatedAt: now
          })
          .where(eq(testRuns.id, job.id));

        await db.insert(runEvents).values({
          id: `evt_${crypto.randomUUID().slice(0, 8)}`,
          runId: job.id,
          eventType: "failed",
          message: `Worker lease expired. Reached maximum attempt count (${maxAttempts}). Marked as failed.`
        });
      } else {
        // Return to queued status for retry
        await db
          .update(testRuns)
          .set({
            status: "queued",
            workerId: null,
            leaseOwner: null,
            leaseExpiresAt: null,
            updatedAt: now
          })
          .where(eq(testRuns.id, job.id));

        await db.insert(runEvents).values({
          id: `evt_${crypto.randomUUID().slice(0, 8)}`,
          runId: job.id,
          eventType: "queued",
          message: `Worker lease expired. Re-queued job for attempt #${job.attemptCount + 1}.`
        });
      }
      reclaimedCount++;
    }

    return reclaimedCount;
  }
}
