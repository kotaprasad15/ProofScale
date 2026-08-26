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
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
