import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { projects } from "./projects.js";

export const testPlans = sqliteTable("test_plans", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  version: integer("version").notNull().default(1),
  profile: text("profile", { enum: ["smoke", "baseline", "ramp", "spike", "short_soak"] }).notNull().default("smoke"),
  scenariosJson: text("scenarios_json").notNull(), // JSON array of ScenarioStep
  loadProfileJson: text("load_profile_json").notNull(), // JSON LoadProfile
  thresholdsJson: text("thresholds_json").notNull(), // JSON Thresholds
  safetyLimitsJson: text("safety_limits_json"), // JSON SafetyLimits
  scoringVersion: text("scoring_version").notNull().default("mvp-1"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
