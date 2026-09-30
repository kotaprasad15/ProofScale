import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { testPlans } from "./testPlans.js";
import { targets } from "./targets.js";

export const testRuns = sqliteTable("test_runs", {
  id: text("id").primaryKey(),
  planId: text("planId").notNull().references(() => testPlans.id, { onDelete: "cascade" }),
  targetId: text("targetId").notNull().references(() => targets.id, { onDelete: "cascade" }),
  status: text("status", {
    enum: ["queued", "starting", "running", "cancelling", "completed", "cancelled", "failed", "expired"]
  }).notNull().default("queued"),
  requestedByUserId: text("requested_by_user_id").notNull(),
  workerId: text("worker_id"),
  leaseOwner: text("lease_owner"),
  leaseExpiresAt: integer("lease_expires_at", { mode: "timestamp" }),
  attemptCount: integer("attempt_count").notNull().default(0),
  workerProfile: text("worker_profile").default("standard-runner-1"),
  targetVersionLabel: text("target_version_label").default("v1.0.0"),
  region: text("region").default("local-us-east"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  summaryMetricsJson: text("summary_metrics_json"), // JSON SummaryMetrics
  score: integer("score"), // 0-100
  confidence: text("confidence", { enum: ["high", "medium", "low"] }),
  readinessLabel: text("readiness_label"),
  scoreBreakdownJson: text("score_breakdown_json"), // JSON ScoreBreakdown
  policySnapshotJson: text("policy_snapshot_json"), // JSON PolicyEvaluationSnapshot
  errorMessage: text("error_message"),
  // ---- Server-side execution (v2) result columns ----
  // envelopeJson: exact immutable TestPlan snapshot used for this run.
  envelopeJson: text("envelope_json"),
  // resultJson: full TestRunResult (metrics + samples + threshold checks).
  resultJson: text("result_json"),
  // progressJson: live RunProgress snapshot updated periodically while running.
  progressJson: text("progress_json"),
  cancelReason: text("cancel_reason"),
  runKind: text("run_kind", { enum: ["k6", "server_side"] }).notNull().default("k6"),
  // ---- Phase 3: trigger metadata ----
  /** 'manual' | 'schedule' — how this run was requested. */
  triggerSource: text("trigger_source").notNull().default("manual"),
  scheduleId: text("schedule_id"),
  scheduleName: text("schedule_name"),
  /** The planned occurrence instant (may differ from actual start). */
  scheduledFor: integer("scheduled_for", { mode: "timestamp" }),
  actualStartedAt: integer("actual_started_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
