import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { users } from "./users.js";

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp" }),
  ipAddress: text("ip_address"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});

export const processedWebhooks = sqliteTable("processed_webhooks", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  provider: text("provider").notNull(),
  payloadHash: text("payload_hash").notNull(),
  processedAt: integer("processed_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});

export const aiUsageRecords = sqliteTable("ai_usage_records", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokensUsed: integer("tokens_used").notNull().default(0),
  requestsCount: integer("requests_count").notNull().default(1),
  windowStart: integer("window_start", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
