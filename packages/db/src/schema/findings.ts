import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { testRuns } from "./testRuns.js";

export const findings = sqliteTable("findings", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => testRuns.id, { onDelete: "cascade" }),
  severity: text("severity", { enum: ["critical", "high", "medium", "low", "info"] }).notNull(),
  category: text("category", {
    enum: ["reliability", "latency", "capacity_behavior", "stability", "readiness_hygiene"]
  }).notNull(),
  title: text("title").notNull(),
  evidence: text("evidence").notNull(),
  recommendation: text("recommendation").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
