import { db, testPlans, targets, testRuns, projects, runEvents, auditEvents } from "@proofscale/db";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { KillSwitch, sanitizeTargetUrl, validateTargetHostDns } from "@proofscale/shared";

/**
 * Shared run-trigger service.
 *
 * This is the SINGLE safe path for creating test runs. Both the manual tRPC
 * mutation (`runs.create`) and the Phase 3 scheduler call `createQueuedRun`,
 * so scheduled execution inherits every safety check:
 *   - kill-switch gate
 *   - plan + target existence (loaded fresh from the DB at trigger time)
 *   - URL sanitization + SSRF/DNS re-validation
 *   - org/project ownership verification
 *   - quota checks performed by callers (runCount budgets, concurrency)
 *
 * NOTE: the kill switch is currently process-local (pre-existing Phase 0
 * design). Each process instance checks its own KillSwitch state; the
 * scheduler additionally records `kill_switch_active` failures when gated.
 */

export interface TriggerContext {
  requestedByUserId: string;
  /** Present for scheduled runs; enables trigger metadata. */
  schedule?: {
    id: string;
    name: string;
    scheduledFor: Date;
  };
  /** Skip audit emission when the caller already recorded an audit trail. */
  skipAudit?: boolean;
}

export type TriggerFailureCode =
  | "kill_switch_active"
  | "test_plan_missing"
  | "target_unauthorized"
  | "safety_limit_changed"
  | "run_creation_failed";

export type TriggerResult =
  | { ok: true; runId: string; status: string }
  | { ok: false; code: TriggerFailureCode; message: string };

/** Validates the plan's current safety envelope at trigger time. */
function validatePlanEnvelope(plan: {
  loadProfileJson: string | null;
  scenariosJson: string | null;
  thresholdsJson: string | null;
}): { ok: true } | { ok: false; code: TriggerFailureCode; message: string } {
  try {
    const loadProfile = JSON.parse(plan.loadProfileJson || "{}");
    const scenarios = JSON.parse(plan.scenariosJson || "[]");
    const thresholds = JSON.parse(plan.thresholdsJson || "{}");

    // Current platform safety caps (mirrors SAFETY_CAPS; re-checked live so an
    // older schedule cannot bypass newer limits).
    const MAX_VIRTUAL_USERS = 100;
    const MAX_DURATION_SECONDS = 600;
    const MAX_TIMEOUT_MS = 30_000;
    if (
      !Number.isInteger(loadProfile.virtualUsers) ||
      loadProfile.virtualUsers < 1 ||
      loadProfile.virtualUsers > MAX_VIRTUAL_USERS
    ) {
      return {
        ok: false,
        code: "safety_limit_changed",
        message: `Plan virtual users (${loadProfile.virtualUsers}) exceed current safety limits.`
      };
    }
    if (
      !Number.isInteger(loadProfile.durationSeconds) ||
      loadProfile.durationSeconds < 5 ||
      loadProfile.durationSeconds > MAX_DURATION_SECONDS
    ) {
      return {
        ok: false,
        code: "safety_limit_changed",
        message: `Plan duration (${loadProfile.durationSeconds}s) exceeds current safety limits.`
      };
    }
    if (loadProfile.timeoutMs !== undefined && (loadProfile.timeoutMs < 500 || loadProfile.timeoutMs > MAX_TIMEOUT_MS)) {
      return {
        ok: false,
        code: "safety_limit_changed",
        message: `Plan timeout (${loadProfile.timeoutMs}ms) exceeds current safety limits.`
      };
    }
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      return { ok: false, code: "safety_limit_changed", message: "Plan has no scenario steps to execute." };
    }
    void thresholds;
    return { ok: true };
  } catch {
    return { ok: false, code: "safety_limit_changed", message: "Plan configuration is unreadable." };
  }
}

/**
 * Creates exactly one queued run using the existing safety pipeline.
 * Throws nothing: returns a typed result so the scheduler can categorize
 * failures without parsing stack traces.
 */
export async function createQueuedRun(
  planId: string,
  targetId: string,
  ctx: TriggerContext
): Promise<TriggerResult> {
  // 1. Global kill switch.
  if (KillSwitch.isActivated()) {
    const state = KillSwitch.getState();
    return {
      ok: false,
      code: "kill_switch_active",
      message: `Global kill switch active: ${state.reason || "system operation"}`
    };
  }

  // 2. Load plan + target fresh (never trust schedule/creation-time copies).
  const [plan] = await db.select().from(testPlans).where(eq(testPlans.id, planId));
  if (!plan) {
    return { ok: false, code: "test_plan_missing", message: "Test plan no longer exists." };
  }

  const [target] = await db.select().from(targets).where(eq(targets.id, targetId));
  if (!target) {
    return { ok: false, code: "target_unauthorized", message: "Target endpoint no longer exists." };
  }

  // 3. Plan's project must own the target (authorization).
  const [project] = await db.select().from(projects).where(eq(projects.id, plan.projectId));
  if (!project || target.projectId !== plan.projectId) {
    return { ok: false, code: "target_unauthorized", message: "Target does not belong to the plan's project." };
  }

  // 4. Current safety envelope re-validation.
  const envelope = validatePlanEnvelope(plan);
  if (!envelope.ok) {
    return envelope;
  }

  // 5. SSRF / URL sanitization + DNS re-check (current policy).
  const sanitization = sanitizeTargetUrl(target.baseUrl);
  if (!sanitization.isValid || !sanitization.allowedHost) {
    return {
      ok: false,
      code: "target_unauthorized",
      message: `Target failed safety check: ${sanitization.reason || "invalid URL"}`
    };
  }
  const allowPrivate = process.env.ALLOW_PRIVATE_TARGETS === "true" || process.env.NODE_ENV !== "production";
  const dnsCheck = await validateTargetHostDns(sanitization.allowedHost, { allowPrivateIPs: allowPrivate });
  if (!dnsCheck.isValid) {
    return {
      ok: false,
      code: "target_unauthorized",
      message: `Target SSRF re-check failed: ${dnsCheck.reason || "restricted destination"}`
    };
  }

  // 6. Create the queued run.
  const runId = `run_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date();
  try {
    await db.insert(testRuns).values({
      id: runId,
      planId,
      targetId,
      status: "queued",
      requestedByUserId: ctx.requestedByUserId,
      targetVersionLabel: "v1.0.0",
      triggerSource: ctx.schedule ? "schedule" : "manual",
      scheduleId: ctx.schedule?.id || null,
      scheduleName: ctx.schedule?.name || null,
      scheduledFor: ctx.schedule?.scheduledFor || null,
      actualStartedAt: now
    });

    await db.insert(runEvents).values({
      id: `ev_${crypto.randomUUID().slice(0, 8)}`,
      runId,
      eventType: "queued",
      message: ctx.schedule
        ? `Scheduled run '${ctx.schedule.name}' queued for execution against ${target.baseUrl}`
        : `Run queued for execution against ${target.baseUrl} by user ${ctx.requestedByUserId}`
    });

    if (!ctx.skipAudit) {
      await db.insert(auditEvents).values({
        id: `audit_${crypto.randomUUID().slice(0, 8)}`,
        actorUserId: ctx.requestedByUserId,
        organizationId: project.organizationId,
        projectId: project.id,
        action: ctx.schedule ? "scheduled_run.created" : "test_run.created",
        subject: runId,
        metadataJson: JSON.stringify({
          planId,
          targetId,
          ...(ctx.schedule ? { scheduleId: ctx.schedule.id, scheduledFor: ctx.schedule.scheduledFor.toISOString() } : {})
        })
      });
    }

    return { ok: true, runId, status: "queued" };
  } catch (err: any) {
    return {
      ok: false,
      code: "run_creation_failed",
      message: `Run creation failed: ${String(err?.message || err).slice(0, 200)}`
    };
  }
}
