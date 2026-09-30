import {
  db,
  notifications,
  notificationRules,
  projects,
  projectMembers,
  organizationMembers,
  testRuns,
  testPlans
} from "@proofscale/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import crypto from "node:crypto";
import { NotificationEventType } from "@proofscale/shared";

/**
 * Phase 3: readiness notification service.
 *
 * Creates in-app notifications from DURABLE run/policy/schedule outcomes.
 *
 * Design invariants:
 *  - Notifications are secondary to execution truth: this service never
 *    decides whether a run succeeded, and callers never block run completion
 *    on delivery.
 *  - Deduplication is deterministic: dedupKey =
 *    `{recipientUserId}:{eventType}:{sourceEventId}` where sourceEventId is
 *    `runId + terminalState (+ policyVersion)`. The unique index
 *    idx_notifications_dedup_key makes duplicate processing a no-op.
 *  - Recipients are resolved from active org/project membership only — never
 *    from raw user listings — so unauthorized users never receive (and thus
 *    cannot infer) other projects' activity.
 *  - Rules (notification_rules) opt events in/out per user; safe defaults
 *    apply when no rule exists.
 */

export interface ReadinessEvent {
  eventType: NotificationEventType;
  organizationId: string;
  projectId: string;
  runId?: string | null;
  scheduleId?: string | null;
  /** Deterministic source identifier (dedup salt). Composed into dedupKey. */
  sourceEventId: string;
  severity: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  linkUrl?: string | null;
  metadata?: Record<string, unknown>;
}

const SEVERITY_ORDER = { info: 0, success: 0, warning: 1, error: 2 } as const;

/** Safe notification defaults when a user has no explicit rule. */
const DEFAULT_RULES: Record<string, { enabled: boolean; minimumSeverity: "info" | "success" | "warning" | "error" }> = {
  "run.completed": { enabled: false, minimumSeverity: "info" }, // opt-in (avoid noisy success spam)
  "run.failed": { enabled: true, minimumSeverity: "error" },
  "run.cancelled": { enabled: false, minimumSeverity: "info" },
  "run.timed_out": { enabled: true, minimumSeverity: "error" },
  "policy.failed": { enabled: true, minimumSeverity: "error" },
  "policy.warning": { enabled: true, minimumSeverity: "warning" },
  "schedule.failed": { enabled: true, minimumSeverity: "error" },
  "schedule.paused_due_to_error": { enabled: true, minimumSeverity: "warning" }
};

/** Resolves active org members (plus project members) for a project. */
async function resolveAuthorizedRecipients(organizationId: string, projectId: string): Promise<string[]> {
  const orgMems = await db
    .select({ userId: organizationMembers.userId, role: organizationMembers.role })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.status, "active")));

  const recipients = new Set<string>();
  for (const mem of orgMems) {
    if (["owner", "admin"].includes(mem.role)) {
      recipients.add(mem.userId);
      continue;
    }
    const [pm] = await db
      .select({ id: projectMembers.id })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, mem.userId),
          eq(projectMembers.status, "active")
        )
      );
    if (pm) recipients.add(mem.userId);
  }
  return Array.from(recipients);
}

/** Evaluates a user's rule (explicit rule wins over the safe default). */
async function shouldNotify(
  userId: string,
  organizationId: string,
  projectId: string,
  eventType: string,
  severity: "info" | "success" | "warning" | "error"
): Promise<boolean> {
  // Project-specific rule first, then org-wide rule.
  const rules = await db
    .select()
    .from(notificationRules)
    .where(
      and(
        eq(notificationRules.userId, userId),
        eq(notificationRules.organizationId, organizationId),
        eq(notificationRules.eventType, eventType)
      )
    )
    .orderBy(desc(notificationRules.updatedAt));

  const projectRule = rules.find(r => r.projectId === projectId);
  const orgRule = rules.find(r => r.projectId === null);
  const rule = projectRule || orgRule;

  const effective = rule
    ? { enabled: rule.enabled, minimumSeverity: rule.minimumSeverity as keyof typeof SEVERITY_ORDER }
    : DEFAULT_RULES[eventType] || { enabled: false, minimumSeverity: "info" as const };

  if (!effective.enabled) return false;
  return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[effective.minimumSeverity];
}

/**
 * Processes a readiness event: resolves recipients, applies rules, and
 * inserts idempotent in-app notifications. Never throws to the caller:
 * failures are logged and returned so callers can record them without
 * blocking run truth.
 */
export async function processReadinessEvent(event: ReadinessEvent): Promise<{ created: number; skipped: number; error?: string }> {
  try {
    const recipients = await resolveAuthorizedRecipients(event.organizationId, event.projectId);
    let created = 0;
    let skipped = 0;

    for (const userId of recipients) {
      const allowed = await shouldNotify(userId, event.organizationId, event.projectId, event.eventType, event.severity);
      if (!allowed) {
        skipped += 1;
        continue;
      }

      const dedupKey = `${userId}:${event.eventType}:${event.sourceEventId}`;
      const id = `notif_${crypto.randomUUID().slice(0, 12)}`;

      // Idempotent insert: a duplicate dedup key is silently ignored.
      // `.returning()` is driver-agnostic (SQLite + PG): a conflicted insert
      // yields zero rows, which is how we count "created" reliably.
      const inserted = await db
        .insert(notifications)
        .values({
          id,
          userId,
          orgId: event.organizationId,
          eventType: event.eventType,
          title: event.title,
          body: event.message,
          severity: event.severity === "success" ? "info" : event.severity === "error" ? "critical" : event.severity,
          linkUrl: event.linkUrl || null,
          projectId: event.projectId,
          runId: event.runId || null,
          scheduleId: event.scheduleId || null,
          dedupKey,
          metadataJson: event.metadata ? JSON.stringify(event.metadata) : null,
          isRead: false,
          createdAt: new Date()
        })
        .onConflictDoNothing({ target: notifications.dedupKey })
        .returning({ id: notifications.id });

      if (inserted && inserted.length > 0) {
        created += 1;
      } else {
        skipped += 1;
      }
    }

    return { created, skipped };
  } catch (err: any) {
    // Notification failures must never propagate into run truth.
    console.error("[ReadinessNotificationService] event processing failed:", String(err?.message || err).slice(0, 200));
    return { created: 0, skipped: 0, error: String(err?.message || err).slice(0, 200) };
  }
}

/**
 * Builds and dispatches the notification event for a terminal run state.
 * Reads the durable run row (never in-memory state) before creating
 * notifications, honoring "truth first, notifications second".
 */
export async function notifyRunTerminal(params: {
  runId: string;
  terminalState: "completed" | "failed" | "cancelled";
  policyResult?: "pass" | "warn" | "fail" | "inconclusive" | null;
  policyVersion?: number | null;
}): Promise<{ created: number; skipped: number; error?: string }> {
  // 1. Read durable run + plan + project truth.
  const [row] = await db
    .select({ run: testRuns, plan: testPlans, project: projects })
    .from(testRuns)
    .innerJoin(testPlans, eq(testRuns.planId, testPlans.id))
    .innerJoin(projects, eq(testPlans.projectId, projects.id))
    .where(eq(testRuns.id, params.runId));

  if (!row) return { created: 0, skipped: 0, error: "run not found" };

  const { run, plan, project } = row;

  // 2. Choose the event type(s). Policy outcome overrides generic completion.
  const events: ReadinessEvent[] = [];
  const sourceEventId =
    params.terminalState === "completed" && params.policyResult
      ? `${run.id}:completed:v${params.policyVersion ?? "na"}`
      : `${run.id}:${params.terminalState}`;

  if (params.terminalState === "completed" && params.policyResult === "fail") {
    events.push({
      eventType: "policy.failed",
      organizationId: project.organizationId,
      projectId: project.id,
      runId: run.id,
      scheduleId: run.scheduleId,
      sourceEventId,
      severity: "error",
      title: `Scheduled assessment failed its policy: ${plan.name}`,
      message: `Readiness policy v${params.policyVersion ?? "?"} failed for '${plan.name}'. Inspect the report for measured metrics.`,
      linkUrl: `/reports?runId=${run.id}`,
      metadata: { policyResult: params.policyResult }
    });
  } else if (params.terminalState === "completed" && params.policyResult === "warn") {
    events.push({
      eventType: "policy.warning",
      organizationId: project.organizationId,
      projectId: project.id,
      runId: run.id,
      scheduleId: run.scheduleId,
      sourceEventId,
      severity: "warning",
      title: `Policy warning: ${plan.name}`,
      message: `Readiness policy v${params.policyVersion ?? "?"} returned a warning for '${plan.name}'.`,
      linkUrl: `/reports?runId=${run.id}`,
      metadata: { policyResult: params.policyResult }
    });
  } else if (params.terminalState === "completed") {
    events.push({
      eventType: "run.completed",
      organizationId: project.organizationId,
      projectId: project.id,
      runId: run.id,
      scheduleId: run.scheduleId,
      sourceEventId,
      severity: "success",
      title: `Assessment completed: ${plan.name}`,
      message: `Run completed for '${plan.name}'${run.scheduleName ? ` (schedule: ${run.scheduleName})` : ""}.`,
      linkUrl: `/reports?runId=${run.id}`
    });
  } else if (params.terminalState === "failed") {
    const timedOut = /timeout/i.test(run.errorMessage || "");
    events.push({
      eventType: timedOut ? "run.timed_out" : "run.failed",
      organizationId: project.organizationId,
      projectId: project.id,
      runId: run.id,
      scheduleId: run.scheduleId,
      sourceEventId,
      severity: "error",
      title: `Assessment failed: ${plan.name}`,
      message: timedOut
        ? `Run '${plan.name}' timed out during execution.`
        : `Run '${plan.name}' failed: ${(run.errorMessage || "execution error").slice(0, 140)}`,
      linkUrl: `/reports?runId=${run.id}`
    });
  } else {
    events.push({
      eventType: "run.cancelled",
      organizationId: project.organizationId,
      projectId: project.id,
      runId: run.id,
      scheduleId: run.scheduleId,
      sourceEventId,
      severity: "info",
      title: `Assessment cancelled: ${plan.name}`,
      message: `Run '${plan.name}' was cancelled${run.cancelReason ? `: ${run.cancelReason.slice(0, 100)}` : "."}`,
      linkUrl: `/reports?runId=${run.id}`
    });
  }

  let total = { created: 0, skipped: 0 };
  for (const evt of events) {
    const res = await processReadinessEvent(evt);
    total.created += res.created;
    total.skipped += res.skipped;
  }
  return total;
}
