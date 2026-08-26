import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { testRuns } from "./testRuns.js";

export const runEvents = sqliteTable("run_events", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => testRuns.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  message: text("message").notNull(),
  metadataJson: text("metadata_json"),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
