import { z } from "zod";

/**
 * Phase 3: Durable Scheduled Assessments — shared domain schemas.
 *
 * Schedules are durable database records (see @proofscale/db
 * assessmentSchedules). This module defines the wire/validation contracts and
 * re-exports the pure schedule-time engine.
 */

// ---------------------------------------------------------------------------
// Enums & primitives
// ---------------------------------------------------------------------------

export const ScheduleStatusEnum = z.enum(["active", "paused", "completed", "cancelled", "invalid"]);
export type ScheduleStatus = z.infer<typeof ScheduleStatusEnum>;

export const ScheduleTypeEnum = z.enum(["one_time", "recurring"]);
export type ScheduleType = z.infer<typeof ScheduleTypeEnum>;

export const ScheduleFailureCodeEnum = z.enum([
  "invalid_schedule",
  "test_plan_missing",
  "target_unauthorized",
  "safety_limit_changed",
  "kill_switch_active",
  "concurrency_limit_reached",
  "queue_unavailable",
  "database_error",
  "run_creation_failed"
]);
export type ScheduleFailureCode = z.infer<typeof ScheduleFailureCodeEnum>;

export const ScheduleExecutionStatusEnum = z.enum([
  "pending",
  "claimed",
  "run_created",
  "completed",
  "skipped",
  "failed"
]);
export type ScheduleExecutionStatus = z.infer<typeof ScheduleExecutionStatusEnum>;

/** Notification event types supported in Phase 3. */
export const NotificationEventTypeEnum = z.enum([
  "run.completed",
  "run.failed",
  "run.cancelled",
  "run.timed_out",
  "policy.failed",
  "policy.warning",
  "schedule.failed",
  "schedule.paused_due_to_error"
]);
export type NotificationEventType = z.infer<typeof NotificationEventTypeEnum>;

export const NotificationRuleSeverityEnum = z.enum(["info", "success", "warning", "error"]);
export type NotificationRuleSeverity = z.infer<typeof NotificationRuleSeverityEnum>;

// ---------------------------------------------------------------------------
// Safety policy for scheduling frequency (conservative defaults)
// ---------------------------------------------------------------------------

/**
 * Product-level scheduling safety policy.
 *
 * Bounded load assessments are heavyweight; recurring schedules may not fire
 * more often than this minimum interval (one hour). One-time schedules in the
 * past are tolerated only within this grace window (handles clock skew and a
 * scheduler that was briefly down).
 */
export const SCHEDULING_POLICY = {
  /** Minimum spacing between recurring occurrences. */
  MIN_RECURRENCE_MINUTES: 60,
  /** Cron granularity floor: the smallest allowed unit is hourly. */
  MIN_CRON_MINUTE: 0,
  /** How far in the past a one-time runAt may still be honored. */
  ONE_TIME_PAST_GRACE_MINUTES: 10,
  /** One-time schedules cannot be created more than 1 year ahead. */
  MAX_FUTURE_DAYS: 365,
  /** Max schedules per project (prevents runaway schedule creation). */
  MAX_SCHEDULES_PER_PROJECT: 50
} as const;

// ---------------------------------------------------------------------------
// Zod input schemas (tRPC wire contracts)
// ---------------------------------------------------------------------------

const cronField = (name: string, min: number, max: number) =>
  z
    .string()
    .refine(v => {
      if (v === "*") return true;
      if (/^\*\/\d+$/.test(v)) {
        const step = parseInt(v.slice(2), 10);
        return step >= 1 && step <= max;
      }
      return v.split(",").every(part => {
        const range = part.match(/^(\d+)-(\d+)$/);
        if (range) {
          return +range[1] >= min && +range[2] <= max && +range[1] <= +range[2];
        }
        if (!/^\d+$/.test(part)) return false;
        const n = parseInt(part, 10);
        return n >= min && n <= max;
      });
    }, { message: `Invalid ${name} field` });

/** 5-field cron: minute hour day-of-month month day-of-week. */
export const CronExpressionSchema = z
  .string()
  .trim()
  .refine(v => v.split(/\s+/).length === 5, { message: "Cron expression must have exactly 5 fields" })
  .superRefine((v, ctx) => {
    const fields = v.split(/\s+/);
    const specs: [string, number, number][] = [
      ["minute", 0, 59],
      ["hour", 0, 23],
      ["day-of-month", 1, 31],
      ["month", 1, 12],
      ["day-of-week", 0, 6]
    ];
    fields.forEach((f, i) => {
      const [name, min, max] = specs[i];
      const r = cronField(name, min, max).safeParse(f);
      if (!r.success) {
        ctx.addIssue({ code: "custom", message: `Invalid ${name} field '${f}'` });
      }
    });
  });

/** Common IANA timezone validation via Intl support probe. */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const TimezoneSchema = z
  .string()
  .trim()
  .min(1)
  .refine(isValidTimezone, { message: "Unknown IANA timezone identifier" });

export const CreateScheduleSchema = z
  .object({
    projectId: z.string().min(1),
    testPlanId: z.string().min(1),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional(),
    scheduleType: ScheduleTypeEnum,
    /** ISO datetime; required for one_time. */
    runAt: z.string().datetime().optional(),
    /** 5-field cron; required for recurring. */
    cronExpression: CronExpressionSchema.optional(),
    timezone: TimezoneSchema.default("UTC"),
    maxRuns: z.number().int().min(1).max(10_000).nullable().optional()
  })
  .superRefine((v, ctx) => {
    if (v.scheduleType === "one_time" && !v.runAt) {
      ctx.addIssue({ code: "custom", message: "One-time schedules require runAt", path: ["runAt"] });
    }
    if (v.scheduleType === "recurring" && !v.cronExpression) {
      ctx.addIssue({
        code: "custom",
        message: "Recurring schedules require cronExpression",
        path: ["cronExpression"]
      });
    }
  });
export type CreateScheduleInput = z.infer<typeof CreateScheduleSchema>;

export const UpdateScheduleSchema = z.object({
  id: z.string().min(1),
  /** Optimistic concurrency: reject stale edits. */
  version: z.number().int().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  cronExpression: CronExpressionSchema.optional(),
  timezone: TimezoneSchema.optional(),
  runAt: z.string().datetime().optional(),
  maxRuns: z.number().int().min(1).max(10_000).nullable().optional()
});
export type UpdateScheduleInput = z.infer<typeof UpdateScheduleSchema>;

export const ScheduleIdSchema = z.object({ id: z.string().min(1), expectedVersion: z.number().int().min(1).optional() });

// ---------------------------------------------------------------------------
// Next-run engine result contracts
// ---------------------------------------------------------------------------

export interface NextRunPreview {
  /** Null when no further occurrence exists (paused/cancelled/completed/expired). */
  nextRunAtUtc: string | null;
  nextRunAtLocal: string | null;
  timezone: string;
  scheduleDescription: string;
  /** Human-readable reasons the schedule will not fire, if any. */
  limitations: string[];
}
