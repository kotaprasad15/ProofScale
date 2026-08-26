import { QueueManager } from "./queue/QueueManager.js";
import { executeLoadTest } from "./runner/k6Runner.js";
import { WorkerCallbackClient } from "./services/WorkerCallbackClient.js";
import { db, testRuns } from "@proofscale/db";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

const WORKER_ID = process.env.WORKER_ID || `worker_${crypto.randomUUID().slice(0, 6)}`;
const POLL_INTERVAL_MS = 2000;

console.log(`🤖 ProofScale Load Execution Worker initialized [ID: ${WORKER_ID}]`);

async function pollAndExecute() {
  try {
    // 1. Reclaim any expired leases first
    await QueueManager.reclaimExpiredLeases();

    // 2. Claim next available job
    const job = await QueueManager.claimNextJob(WORKER_ID);

    if (job) {
      const { run, plan, target } = job;
      console.log(`⚡ Claimed run '${run.id}' targeting '${target.baseUrl}' (Plan: ${plan.name})`);

      const scenarios = JSON.parse(plan.scenariosJson);
      const loadProfile = JSON.parse(plan.loadProfileJson);
      const thresholds = JSON.parse(plan.thresholdsJson);

      // Report started
      await WorkerCallbackClient.reportStarted(run.id, WORKER_ID, "load-runner");

      // Lease renewal timer
      const renewalTimer = setInterval(async () => {
        await QueueManager.renewLease(run.id, WORKER_ID);
      }, 15000);

      try {
        const checkCancellation = async () => {
          const [current] = await db.select().from(testRuns).where(eq(testRuns.id, run.id));
          return current?.status === "cancelling";
        };

        const result = await executeLoadTest(
          target.baseUrl,
          scenarios,
          loadProfile,
          thresholds,
          checkCancellation
        );

        clearInterval(renewalTimer);

        console.log(`✅ Run '${run.id}' finished successfully. (${result.metrics.totalRequests} reqs, ${result.metrics.throughputRps} RPS)`);
        await WorkerCallbackClient.reportCompleted(run.id, result.metrics, result.rawOutput, thresholds, loadProfile.durationSeconds);
      } catch (err: any) {
        clearInterval(renewalTimer);
        console.error(`❌ Run '${run.id}' failed:`, err?.message);
        await WorkerCallbackClient.reportFailed(run.id, err?.message || "Execution error");
      }
    }
  } catch (err) {
    console.error("⚠️ Worker poll loop error:", err);
  } finally {
    setTimeout(pollAndExecute, POLL_INTERVAL_MS);
  }
}

if (process.env.NODE_ENV !== "test") {
  pollAndExecute();
}
