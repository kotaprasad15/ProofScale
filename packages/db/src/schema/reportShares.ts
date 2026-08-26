import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { testRuns } from "./testRuns.js";

export const reportShares = sqliteTable("report_shares", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => testRuns.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdByUserId: text("created_by_user_id").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
