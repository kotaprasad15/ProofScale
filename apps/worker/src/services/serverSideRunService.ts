import { drizzleRepositories, TestRunRepository } from "@proofscale/db";
import { eq, and } from "drizzle-orm";
import { db, testRuns } from "@proofscale/db";
import { runOne, requestCancellation, RunOneOptions } from "../runner/testRunOrchestrator.js";

/**
 * Server-side run service: the queue consumer.
 *
 * Polls the test_runs table for queued server_side runs and executes them via
 * the orchestrator. This mirrors the k6 worker loop and keeps the worker
 * replaceable by an external queue: swap this poller for a real queue
 * consumer and the engine/repository stay untouched.
 */

let running = false;
let consecutiveErrors = 0;

/** Claims the next queued server_side run atomically. */
export async function claimNextServerSideRun(
  runRepo: TestRunRepository
): Promise<string | null> {
  const rows = await db
    .select({ id: testRuns.id })
    .from(testRuns)
    .where(and(eq(testRuns.status, "queued"), eq(testRuns.runKind, "server_side")))
    .limit(5);

  for (const { id } of rows) {
    // Atomic transition: only one poller wins per run.
    const updated = await db
      .update(testRuns)
      .set({ status: "starting", updatedAt: new Date() })
      .where(and(eq(testRuns.id, id), eq(testRuns.status, "queued")))
      .returning({ id: testRuns.id });

    if (updated.length > 0) {
      void runRepo; // repository used downstream by runOne
      return id;
    }
  }
  return null;
}

/** Executes one claimed run by loading it from the repository. */
export async function executeClaimedRun(runId: string, options: RunOneOptions = {}) {
  const run = await drizzleRepositories.testRuns.getById(runId);
  if (!run) return;
  await runOne(run, drizzleRepositories.testRuns, options);
}

/** Starts the background polling loop (no-op in tests). */
export function startServerSideRunLoop(options: RunOneOptions = {}, intervalMs = 1500): void {
  if (running) return;
  running = true;

  const tick = async () => {
    if (!running) return;
    try {
      const runId = await claimNextServerSideRun(drizzleRepositories.testRuns);
      if (runId) {
        // Fire-and-forget: never block the poll loop while a run executes.
        void executeClaimedRun(runId, options).catch(err =>
          console.error(`Server-side run '${runId}' crashed:`, err?.message)
        );
      }
      consecutiveErrors = 0;
    } catch (err: any) {
      consecutiveErrors += 1;
      if (consecutiveErrors <= 3) {
        console.error("Server-side run poll error:", err?.message);
      }
    } finally {
      setTimeout(tick, intervalMs);
    }
  };

  tick();
}

export function stopServerSideRunLoop(): void {
  running = false;
}

export { requestCancellation };
