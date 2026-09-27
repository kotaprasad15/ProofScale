import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { projects } from "./projects.js";
import { testPlans } from "./testPlans.js";

export const readinessPolicies = sqliteTable("readiness_policies", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  testPlanId: text("test_plan_id").notNull().references(() => testPlans.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["draft", "active", "archived"] }).notNull().default("draft"),
  minimumScore: integer("minimum_score"),
  maximumP95Ms: integer("maximum_p95_ms"),
  maximumP99Ms: integer("maximum_p99_ms"),
  maximumErrorRatePercent: integer("maximum_error_rate_percent"), // stored as integer percent * 100 for precision, or maybe just integer percent? The prompt says "Prefer percentages in the UI and a consistent numeric representation in storage."
  minimumThroughputRps: integer("minimum_throughput_rps"),
  maximumTimeouts: integer("maximum_timeouts"),
  failOnHardCap: integer("fail_on_hard_cap", { mode: "boolean" }).notNull().default(false),
  minimumConfidence: text("minimum_confidence", { enum: ["low", "medium", "high"] }),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  activatedAt: integer("activated_at", { mode: "timestamp" }),
  archivedAt: integer("archived_at", { mode: "timestamp" })
});
