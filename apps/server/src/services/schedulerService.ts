import {
  db,
  assessmentSchedules,
  scheduleExecutions,
  schedulerState,
  testRuns,
  projects,
  targets,
  auditEvents
} from "@proofscale/db";
import { eq, and, lte, inArray, desc, count } from "drizzle-orm";
import crypto from "node:crypto";
import { computeNextRun, SCHEDULING_POLICY, KillSwitch } from "@proofscale/shared";
import { createQueuedRun } from "./runTriggerService.js";
import { processReadinessEvent } from "./notifications/ReadinessNotificationService.js";

/**
 * Phase 3: durable scheduler.
 *
 * A control-plane loop that claims DUE schedules and creates runs through the
 * SAME shared trigger service used by manual execution. Durability & safety:
 *
 *  - Schedules and occurrences live in the DB (survive restarts).
 *  - Idempotency: one execution row per occurrence via the UNIQUE
 *    occurrence_key (`scheduleId:scheduledForEpochMs`). A restart between
 *    claim and run creation re-enters the claim path and finds the existing
 *    row in 'claimed' state instead of creating a second load test.
 *  - Ambiguity policy: if a claimed occurrence already has a runId, we NEVER
 *    create a second run — the occurrence is marked completed/skipped for
 *    operator review. Safe + inspectable beats automatic duplication.
 *  - Execution-time safety revalidation: plan, target authorization, SSRF,
 *    current safety limits, and kill switch are re-read at claim time.
 *  - Concurrency: an advisory lease on scheduler_state plus the unique
 *    occurrence index make multiple scheduler instances safe. The lease is
 *    advisory (reduces duplicate work); correctness comes from the index.
 */

const INSTANCE_ID = `sched_${process.pid.toString(36)}_${crypto.randomUUID().slice(0, 6)}`;
const CLAIM_LEASE_SECONDS = 120;

/** Failure categories surfaced to operators (redacted, no stack traces). */
type FailureCode =
  | "invalid_schedule"
  | "test_plan_missing"
  | "target_unauthorized"
  | "safety_limit_changed"
  | "kill_switch_active"
  | "concurrency_limit_reached"
  | "queue_unavailable"
  | "database_error"
  | "run_creation_failed";

function safeMessage(err: unknown): string {
  const msg = String((err as any)?.message || err || "unknown error");
  // Redaction: strip anything resembling credentials/tokens/long secrets.
  return msg.replace(/(bearer|token|key|password|secret)[=:]\s*\S+/gi, "$1=[REDACTED]").slice(0, 240);
}

async function logSchedulerEvent(action: string, subject: string, metadata?: Record<string, unknown>) {
  try {
    await db.insert(auditEvents).values({
      id: `audit_${crypto.randomUUID().slice(0, 12)}`,
      actorUserId: "system:scheduler",
      action,
      subject,
      metadataJson: metadata ? JSON.stringify(metadata) : null
    });
  } catch (err) {
    console.error("[Scheduler] audit write failed:", safeMessage(err));
  }
}

/** Resolves the current target for a plan (targets are per-project rows). */
async function resolvePlanTarget(projectId: string): Promise<string | null> {
  const [target] = await db
    .select({ id: targets.id })
    .from(targets)
    .where(eq(targets.projectId, projectId))
    .limit(1);
  return target?.id || null;
}

/** Marks a schedule invalid with a redacted explanation. */
async function markScheduleInvalid(scheduleId: string, reason: string) {
  await db
    .update(assessmentSchedules)
    .set({ status: "invalid", lastError: reason.slice(0, 240), updatedAt: new Date() })
    .where(eq(assessmentSchedules.id, scheduleId));
}

/**
 * Records a schedule failure + emits a `schedule.failed` readiness event.
 * `occurrenceKey` salts the dedup sourceEventId so a retried occurrence of
 * the same failure is deduplicated while distinct occurrences are not.
 */
async function recordScheduleFailure(
  schedule: typeof assessmentSchedules.$inferSelect,
  code: FailureCode,
  message: string,
  occurrenceKey?: string
) {
  await db
    .update(assessmentSchedules)
    .set({ lastError: `[${code}] ${message}`.slice(0, 240), updatedAt: new Date() })
    .where(eq(assessmentSchedules.id, schedule.id));

  await processReadinessEvent({
    eventType: "schedule.failed",
    organizationId: schedule.organizationId,
    projectId: schedule.projectId,
    scheduleId: schedule.id,
    sourceEventId: `${schedule.id}:${code}:${occurrenceKey || "schedule"}`,
    severity: "error",
    title: "Scheduled assessment failed",
    message: `A scheduled assessment could not start (${code}). Check the schedule history for details.`,
    linkUrl: `/schedules`
  }).catch(() => {});
}

/**
 * Attempts to claim a single due occurrence. Returns:
 *  - "claimed"  : this instance won the occurrence
 *  - "taken"    : another instance/attempt already holds it
 *  - "none"     : no due schedules
 */
async function claimDueOccurrence(): Promise<
  | { outcome: "none" }
  | { outcome: "taken" }
  | {
      outcome: "claimed";
      execution: typeof scheduleExecutions.$inferSelect;
      schedule: typeof assessmentSchedules.$inferSelect;
    }
> {
  const now = new Date();

  // 1. Find due ACTIVE schedules (status filter prevents paused/cancelled runs).
  const due = await db
    .select()
    .from(assessmentSchedules)
    .where(and(eq(assessmentSchedules.status, "active"), lte(assessmentSchedules.nextRunAt, now)))
    .limit(5);

  if (due.length === 0) return { outcome: "none" };

  for (const schedule of due) {
    const scheduledFor = schedule.nextRunAt as Date;
    const occurrenceKey = `${schedule.id}:${scheduledFor.getTime()}`;

    // 2. Idempotent claim: the unique occurrence_key index arbitrates.
    const executionId = `sexec_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    try {
      const inserted = await db
        .insert(scheduleExecutions)
        .values({
          id: executionId,
          scheduleId: schedule.id,
          organizationId: schedule.organizationId,
          projectId: schedule.projectId,
          testPlanId: schedule.testPlanId,
          occurrenceKey,
          scheduledFor,
          claimedAt: now,
          status: "claimed",
          createdAt: now
        })
        .onConflictDoNothing({ target: scheduleExecutions.occurrenceKey })
        .returning({ id: scheduleExecutions.id });

      if (!inserted || inserted.length === 0) {
        // Another attempt already owns this occurrence.
        return { outcome: "taken" };
      }

      await logSchedulerEvent("schedule.occurrence_claimed", occurrenceKey, { scheduleId: schedule.id });
      return { outcome: "claimed", execution: (await db.select().from(scheduleExecutions).where(eq(scheduleExecutions.id, executionId)))[0], schedule };
    } catch (err) {
      // DB constraint race or transient DB failure: treat as "taken" and let
      // the next tick retry. Nothing was double-claimed because the unique
      // index is the source of truth.
      console.error("[Scheduler] claim race/error:", safeMessage(err));
      return { outcome: "taken" };
    }
  }
  return { outcome: "none" };
}

/**
 * Processes one claimed occurrence end-to-end.
 * Never creates a second run for an occurrence that already has a runId.
 */
async function processClaimedOccurrence(
  execution: typeof scheduleExecutions.$inferSelect,
  schedule: typeof assessmentSchedules.$inferSelect
): Promise<void> {
  const now = new Date();

  try {
    // ---- Ambiguity guard: restart-after-run-creation recovery ----
    if (execution.runId) {
      // Bookkeeping already finished for this occurrence: re-running
      // advanceOrComplete would double-count runCount and re-advance
      // nextRunAt. Idempotent no-op.
      if (["run_created", "completed", "skipped", "failed"].includes(execution.status)) {
        return;
      }
      // A run exists but bookkeeping never finished (crash after run creation,
      // before schedule updates). NEVER duplicate; reconcile bookkeeping only.
      const [run] = await db.select().from(testRuns).where(eq(testRuns.id, execution.runId));
      await db
        .update(scheduleExecutions)
        .set({ status: run ? "run_created" : "failed", completedAt: now, failureCode: run ? null : "run_creation_failed", failureMessage: run ? null : "Referenced run no longer exists" })
        .where(eq(scheduleExecutions.id, execution.id));
      await advanceOrComplete(schedule, run ? new Date(run.createdAt) : now, run?.id || null, run?.status || null);
      await logSchedulerEvent("schedule.occurrence_reconciled", execution.occurrenceKey, { runId: execution.runId });
      return;
    }

    // ---- Kill switch (current state, not creation-time state) ----
    if (KillSwitch.isActivated()) {
      await db
        .update(scheduleExecutions)
        .set({ status: "skipped", failureCode: "kill_switch_active", failureMessage: "Skipped while the global kill switch is active", completedAt: now })
        .where(eq(scheduleExecutions.id, execution.id));
      // Do not advance recurring nextRunAt past a skipped occurrence: retry the
      // same slot when the switch is lifted.
      await logSchedulerEvent("schedule.occurrence_skipped", execution.occurrenceKey, { code: "kill_switch_active" });
      return;
    }

    // ---- Current schedule status re-check (paused/cancelled mid-claim) ----
    const [freshSchedule] = await db.select().from(assessmentSchedules).where(eq(assessmentSchedules.id, schedule.id));
    if (!freshSchedule || freshSchedule.status !== "active") {
      await db
        .update(scheduleExecutions)
        .set({ status: "skipped", failureCode: "invalid_schedule", failureMessage: `Schedule status is now '${freshSchedule?.status || "deleted"}'`, completedAt: now })
        .where(eq(scheduleExecutions.id, execution.id));
      return;
    }

    // ---- Plan validity + target resolution (current rows) ----
    const [plan] = await db.select().from(projects).where(eq(projects.id, schedule.projectId)).limit(1);
    if (!plan) {
      await db
        .update(scheduleExecutions)
        .set({ status: "failed", failureCode: "test_plan_missing", failureMessage: "Project no longer exists", completedAt: now })
        .where(eq(scheduleExecutions.id, execution.id));
      await markScheduleInvalid(schedule.id, "Project no longer exists.");
      return;
    }

    const targetId = await resolvePlanTarget(schedule.projectId);
    if (!targetId) {
      await db
        .update(scheduleExecutions)
        .set({ status: "failed", failureCode: "target_unauthorized", failureMessage: "No registered target for the plan's project", completedAt: now })
        .where(eq(scheduleExecutions.id, execution.id));
      await recordScheduleFailure(schedule, "target_unauthorized", "No registered target for project", execution.occurrenceKey);
      return;
    }

    // ---- Create exactly one run via the shared safe trigger path ----
    const result = await createQueuedRun(schedule.testPlanId, targetId, {
      requestedByUserId: schedule.createdBy,
      schedule: {
        id: schedule.id,
        name: schedule.name,
        scheduledFor: new Date(execution.scheduledFor)
      },
      skipAudit: true // scheduler writes its own audit entries
    });

    if (!result.ok) {
      const skippedCodes: FailureCode[] = ["kill_switch_active", "concurrency_limit_reached"];
      const isSkip = skippedCodes.includes(result.code as FailureCode);
      await db
        .update(scheduleExecutions)
        .set({
          status: isSkip ? "skipped" : "failed",
          failureCode: result.code,
          failureMessage: result.message,
          completedAt: now
        })
        .where(eq(scheduleExecutions.id, execution.id));

      if (result.code === "test_plan_missing" || result.code === "safety_limit_changed") {
        await markScheduleInvalid(schedule.id, `[${result.code}] ${result.message}`);
      } else {
        await recordScheduleFailure(schedule, result.code as FailureCode, result.message, execution.occurrenceKey);
      }
      await logSchedulerEvent("schedule.execution_failed", execution.occurrenceKey, { code: result.code });
      return;
    }

    // ---- Success: link run + advance schedule ----
    await db
      .update(scheduleExecutions)
      .set({ status: "run_created", runId: result.runId, startedAt: now })
      .where(eq(scheduleExecutions.id, execution.id));

    await advanceOrComplete(schedule, now, result.runId, "queued");
    await logSchedulerEvent("scheduled_run.created", result.runId, {
      scheduleId: schedule.id,
      occurrence: execution.occurrenceKey
    });
  } catch (err) {
    // Database/unknown error: leave the execution in 'claimed' with a recorded
    // reason — inspectable, never auto-retried into a duplicate load test.
    await db
      .update(scheduleExecutions)
      .set({ failureCode: "database_error", failureMessage: safeMessage(err) })
      .where(eq(scheduleExecutions.id, execution.id))
      .catch(() => {});
    console.error("[Scheduler] occurrence processing failed:", safeMessage(err));
  }
}

/** Advances a recurring schedule or completes a one-time schedule. */
async function advanceOrComplete(
  schedule: typeof assessmentSchedules.$inferSelect,
  occurredAt: Date,
  runId: string | null,
  runStatus: string | null
) {
  const now = new Date();
  const runCount = schedule.runCount + 1;
  const budgetReached = schedule.maxRuns != null && runCount >= schedule.maxRuns;

  if (schedule.scheduleType === "one_time") {
    await db
      .update(assessmentSchedules)
      .set({
        status: "completed",
        nextRunAt: null,
        lastRunAt: occurredAt,
        lastRunId: runId,
        lastRunStatus: runStatus,
        lastError: null,
        runCount,
        updatedAt: now
      })
      .where(eq(assessmentSchedules.id, schedule.id));
    return;
  }

  // Recurring: compute the next occurrence strictly after the one just claimed.
  const preview = computeNextRun(
    {
      scheduleType: "recurring",
      status: "active",
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      maxRuns: schedule.maxRuns,
      runCount
    },
    (schedule.nextRunAt as Date).getTime()
  );

  const nextRunAt = preview.nextRunAtUtc ? new Date(preview.nextRunAtUtc) : null;
  await db
    .update(assessmentSchedules)
    .set({
      status: budgetReached ? "completed" : "active",
      nextRunAt: budgetReached ? null : nextRunAt,
      lastRunAt: occurredAt,
      lastRunId: runId,
      lastRunStatus: runStatus,
      lastError: null,
      runCount,
      updatedAt: now
    })
    .where(eq(assessmentSchedules.id, schedule.id));
}

// ---------------------------------------------------------------------------
// Terminal-run notification processing
// ---------------------------------------------------------------------------

/** Finds runs that reached a terminal state without processed notifications. */
async function processTerminalRuns(): Promise<number> {
  const terminalRuns = await db
    .select({
      run: testRuns,
      policySnapshotJson: testRuns.policySnapshotJson
    })
    .from(testRuns)
    .where(inArray(testRuns.status, ["completed", "failed", "cancelled"]))
    .orderBy(desc(testRuns.updatedAt))
    .limit(20);

  let processed = 0;
  for (const { run, policySnapshotJson } of terminalRuns) {
    try {
      // Parse the durable policy snapshot (Phase 1 evaluator output).
      let policyResult: "pass" | "warn" | "fail" | "inconclusive" | null = null;
      let policyVersion: number | null = null;
      try {
        const snapshot = policySnapshotJson ? JSON.parse(policySnapshotJson) : null;
        policyResult = snapshot?.result ?? null;
        policyVersion = snapshot?.policyVersion ?? null;
      } catch {}

      const { notifyRunTerminal } = await import("./notifications/ReadinessNotificationService.js");
      await notifyRunTerminal({
        runId: run.id,
        terminalState: run.status as "completed" | "failed" | "cancelled",
        policyResult,
        policyVersion
      });
      processed += 1;
    } catch (err) {
      console.error("[Scheduler] terminal-run notification failed:", safeMessage(err));
    }
  }
  return processed;
}

// ---------------------------------------------------------------------------
// Heartbeat, lease, and public API
// ---------------------------------------------------------------------------

async function heartbeat(): Promise<void> {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + CLAIM_LEASE_SECONDS * 1000);
  try {
    await db
      .insert(schedulerState)
      .values({
        id: "singleton",
        lastHeartbeatAt: now,
        lastTickAt: now,
        runningInstance: INSTANCE_ID,
        claimLeaseUntil: leaseUntil,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: schedulerState.id,
        set: {
          lastHeartbeatAt: now,
          lastTickAt: now,
          runningInstance: INSTANCE_ID,
          claimLeaseUntil: leaseUntil,
          updatedAt: now
        }
      });
  } catch (err) {
    console.error("[Scheduler] heartbeat failed (DB unavailable?):", safeMessage(err));
  }
}

let running = false;
let tickTimer: ReturnType<typeof setTimeout> | null = null;
let consecutiveErrors = 0;
const MAX_LOGGED_ERRORS = 5;

/** Executes one scheduler tick: claim + process due occurrences, then notifications. */
export async function schedulerTick(): Promise<{ claimed: number; skipped: number; failed: number; notifications: number }> {
  const stats = { claimed: 0, skipped: 0, failed: 0, notifications: 0 };
  try {
    for (let i = 0; i < 10; i++) {
      const claim = await claimDueOccurrence();
      if (claim.outcome !== "claimed") break;
      stats.claimed += 1;
      await processClaimedOccurrence(claim.execution, claim.schedule);
    }

    stats.notifications = await processTerminalRuns();

    if (consecutiveErrors > 0) consecutiveErrors = 0;
  } catch (err) {
    consecutiveErrors += 1;
    if (consecutiveErrors <= MAX_LOGGED_ERRORS) {
      console.error("[Scheduler] tick error (bounded logging):", safeMessage(err));
    }
    try {
      await db
        .update(schedulerState)
        .set({ lastTickError: safeMessage(err), updatedAt: new Date() })
        .where(eq(schedulerState.id, "singleton"));
    } catch {}
  } finally {
    await heartbeat();
  }
  return stats;
}

/**
 * Starts the durable scheduler loop.
 * DEV: runs inside the API process (npm run dev:server).
 * PROD: the API web service runs it; Render/Railway keep it alive. Multiple
 * instances are safe — the occurrence unique index arbitrates claims.
 */
export function startScheduler(intervalMs = 30_000): void {
  if (running) return;
  running = true;
  console.log(`⏰ Durable scheduler started [${INSTANCE_ID}] interval=${intervalMs}ms`);

  const loop = async () => {
    if (!running) return;
    await schedulerTick();
    if (running) tickTimer = setTimeout(loop, intervalMs);
  };
  loop();
}

export function stopScheduler(): void {
  running = false;
  if (tickTimer) clearTimeout(tickTimer);
}

// ---------------------------------------------------------------------------
// Test seams: narrow exports for integration tests. They exercise the same
// code paths as the production loop without needing timer orchestration.
// ---------------------------------------------------------------------------

/** @internal test seam */
export async function claimDueOccurrenceForTest(): Promise<
  | { outcome: "none" | "taken" }
  | { outcome: "claimed"; execution: typeof scheduleExecutions.$inferSelect; schedule: typeof assessmentSchedules.$inferSelect }
> {
  return claimDueOccurrence();
}

/** @internal test seam */
export async function processClaimedOccurrenceForTest(executionId: string): Promise<void> {
  const [execution] = await db.select().from(scheduleExecutions).where(eq(scheduleExecutions.id, executionId));
  if (!execution) return;
  const [schedule] = await db.select().from(assessmentSchedules).where(eq(assessmentSchedules.id, execution.scheduleId));
  if (!schedule) return;
  await processClaimedOccurrence(execution, schedule);
}

/** Operational observability (admin-facing). */
export async function getSchedulerObservability() {
  const [state] = await db.select().from(schedulerState).where(eq(schedulerState.id, "singleton"));
  const [activeSchedules] = await db
    .select({ n: count() })
    .from(assessmentSchedules)
    .where(eq(assessmentSchedules.status, "active"));
  const now = new Date();
  const [dueSchedules] = await db
    .select({ n: count() })
    .from(assessmentSchedules)
    .where(and(eq(assessmentSchedules.status, "active"), lte(assessmentSchedules.nextRunAt, now)));
  const [claimedExecs] = await db
    .select({ n: count() })
    .from(scheduleExecutions)
    .where(eq(scheduleExecutions.status, "claimed"));
  const [failedExecs] = await db
    .select({ n: count() })
    .from(scheduleExecutions)
    .where(eq(scheduleExecutions.status, "failed"));

  return {
    instanceId: state?.runningInstance || null,
    lastHeartbeatAt: state?.lastHeartbeatAt ? state.lastHeartbeatAt.toISOString() : null,
    lastTickAt: state?.lastTickAt ? state.lastTickAt.toISOString() : null,
    lastTickError: state?.lastTickError || null,
    claimLeaseUntil: state?.claimLeaseUntil ? state.claimLeaseUntil.toISOString() : null,
    activeSchedules: activeSchedules?.n ?? 0,
    dueSchedules: dueSchedules?.n ?? 0,
    claimedOccurrences: claimedExecs?.n ?? 0,
    failedOccurrences: failedExecs?.n ?? 0
  };
}
