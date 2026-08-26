import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { testRuns } from "./testRuns.js";

export const artifacts = sqliteTable("artifacts", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => testRuns.id, { onDelete: "cascade" }),
  objectKey: text("object_key").notNull(),
  type: text("type").notNull(), // raw_runner_output, summary_json, markdown_report
  sizeBytes: integer("size_bytes").notNull(),
  checksum: text("checksum").notNull(),
  retentionUntil: integer("retention_until", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
