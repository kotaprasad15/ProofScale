import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { testPlans } from "./testPlans.js";
import { projects } from "./projects.js";
import { testRuns } from "./testRuns.js";

export const baselines = sqliteTable("baselines", {
  id: text("id").primaryKey(),
  testPlanId: text("test_plan_id").notNull().references(() => testPlans.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull(),
  runId: text("run_id").notNull().references(() => testRuns.id, { onDelete: "cascade" }),
  promotedBy: text("promoted_by").notNull(),
  promotedAt: integer("promoted_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  reason: text("reason"),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
  revokedBy: text("revoked_by")
});
