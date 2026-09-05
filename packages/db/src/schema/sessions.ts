import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { users } from "./users.js";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionTokenHash: text("session_token_hash").notNull().unique(),
  csrfToken: text("csrf_token").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  lastActiveAt: integer("last_active_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
