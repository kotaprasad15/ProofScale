import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { projects } from "./projects.js";

export const testPlans = sqliteTable("test_plans", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  version: integer("version").notNull().default(1),
  profile: text("profile", { enum: ["smoke", "baseline", "load", "ramp", "stress", "spike", "short_soak"] }).notNull().default("smoke"),
  scenariosJson: text("scenarios_json").notNull(), // JSON array of ScenarioStep (legacy k6)
  loadProfileJson: text("load_profile_json").notNull(), // JSON LoadProfile (legacy k6)
  thresholdsJson: text("thresholds_json").notNull(), // JSON Thresholds (legacy k6)
  safetyLimitsJson: text("safety_limits_json"), // JSON SafetyLimits
  scoringVersion: text("scoring_version").notNull().default("mvp-1"),
  // ---- Server-side execution (v2) spec ----
  // specJson holds the full TestPlan envelope (target, workload, ordered
  // requests, thresholds). targetId/environment are denormalized for queries.
  specJson: text("spec_json"),
  planStatus: text("plan_status", { enum: ["draft", "approved", "archived"] }).notNull().default("draft"),
  planEnvironment: text("plan_environment", { enum: ["staging", "production"] }).notNull().default("staging"),
  targetBaseUrl: text("target_base_url"),
  approvedBy: text("approved_by"),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  specVersion: integer("spec_version").notNull().default(0),
  createdBy: text("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
