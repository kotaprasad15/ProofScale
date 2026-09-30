import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { projects } from "./projects.js";
import { organizations } from "./organizations.js";
import { testPlans } from "./testPlans.js";

/**
 * Phase 3: durable assessment schedules.
 *
 * Schedules never define workload parameters themselves — they reference an
 * approved test plan and inherit its safety envelope. Execution-time safety
 * revalidation reads the CURRENT plan and limits, never creation-time values.
 */
export const assessmentSchedules = sqliteTable(
  "assessment_schedules",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    testPlanId: text("test_plan_id")
      .notNull()
      .references(() => testPlans.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    description: text("description"),

    status: text("status", {
      enum: ["active", "paused", "completed", "cancelled", "invalid"]
    })
      .notNull()
      .default("active"),

    scheduleType: text("schedule_type", { enum: ["one_time", "recurring"] }).notNull(),
    /** One-time only: exact UTC instant. */
    runAt: integer("run_at", { mode: "timestamp" }),
    /** Recurring only: 5-field cron interpreted in `timezone`. */
    cronExpression: text("cron_expression"),
    /** IANA timezone for wall-clock interpretation; timestamps stay UTC. */
    timezone: text("timezone").notNull().default("UTC"),

    nextRunAt: integer("next_run_at", { mode: "timestamp" }),
    lastRunAt: integer("last_run_at", { mode: "timestamp" }),
    lastRunId: text("last_run_id"),
    lastRunStatus: text("last_run_status"),
    /** Redacted, safe failure summary (no stack traces/secrets). */
    lastError: text("last_error"),

    maxRuns: integer("max_runs"),
    runCount: integer("run_count").notNull().default(0),

    createdBy: text("created_by").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),

    pausedBy: text("paused_by"),
    pausedAt: integer("paused_at", { mode: "timestamp" }),
    cancelledBy: text("cancelled_by"),
    cancelledAt: integer("cancelled_at", { mode: "timestamp" }),

    /** Optimistic concurrency for edits. */
    version: integer("version").notNull().default(1)
  },
  table => ({
    // Scheduler query: claim due active schedules efficiently.
    dueSchedulesIdx: index("idx_schedules_status_next_run").on(table.status, table.nextRunAt),
    orgProjectIdx: index("idx_schedules_org_project").on(table.organizationId, table.projectId),
    planIdx: index("idx_schedules_test_plan").on(table.testPlanId)
  })
);

/**
 * One execution record per schedule occurrence. occurrenceKey is unique:
 * `scheduleId + scheduledFor epoch ms`, which makes occurrence claiming
 * idempotent across scheduler restarts and concurrent instances.
 */
export const scheduleExecutions = sqliteTable(
  "schedule_executions",
  {
    id: text("id").primaryKey(),
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => assessmentSchedules.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    testPlanId: text("test_plan_id").notNull(),

    /** Nullable until run creation succeeds. */
    runId: text("run_id"),

    /** Unique occurrence key: `{scheduleId}:{scheduledFor epoch ms}`. */
    occurrenceKey: text("occurrence_key").notNull(),
    scheduledFor: integer("scheduled_for", { mode: "timestamp" }).notNull(),

    claimedAt: integer("claimed_at", { mode: "timestamp" }),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),

    status: text("status", {
      enum: ["pending", "claimed", "run_created", "completed", "skipped", "failed"]
    })
      .notNull()
      .default("pending"),

    failureCode: text("failure_code"),
    /** Redacted message safe for operator display. */
    failureMessage: text("failure_message"),

    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
  },
  table => ({
    // THE idempotency guarantee: one execution row per occurrence.
    occurrenceKeyIdx: uniqueIndex("idx_executions_occurrence_key").on(table.occurrenceKey),
    scheduleIdx: index("idx_executions_schedule").on(table.scheduleId),
    runIdx: index("idx_executions_run").on(table.runId),
    statusIdx: index("idx_executions_status").on(table.status)
  })
);

/**
 * Single-row scheduler heartbeat/state for operational observability.
 * Also serves as an advisory claim marker: only the instance that can update
 * the row's claim lease processes due schedules in this tick.
 */
export const schedulerState = sqliteTable("scheduler_state", {
  id: text("id").primaryKey(), // always 'singleton'
  lastHeartbeatAt: integer("last_heartbeat_at", { mode: "timestamp" }),
  lastTickAt: integer("last_tick_at", { mode: "timestamp" }),
  lastTickError: text("last_tick_error"),
  runningInstance: text("running_instance"),
  claimLeaseUntil: integer("claim_lease_until", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
