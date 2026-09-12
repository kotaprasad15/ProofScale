import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { users } from "./users.js";
import { organizations } from "./organizations.js";

export const notificationPreferences = sqliteTable("notification_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  eventCategory: text("event_category").notNull(), // 'run_results' | 'team_activity' | 'security_alerts'
  inAppEnabled: integer("in_app_enabled", { mode: "boolean" }).notNull().default(true),
  pushEnabled: integer("push_enabled", { mode: "boolean" }).notNull().default(true),
  emailEnabled: integer("email_enabled", { mode: "boolean" }).notNull().default(false),
  runResultFilter: text("run_result_filter"), // 'all' | 'tier_change_only' | 'failures_only'
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  isValid: integer("is_valid", { mode: "boolean" }).notNull().default(true)
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // 'run.completed' | 'run.failed' | 'run.aborted' | 'run.tier_changed'
  title: text("title").notNull(),
  body: text("body").notNull(),
  severity: text("severity").notNull().default("info"), // 'info' | 'warning' | 'critical'
  linkUrl: text("link_url"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});

export const notificationDeliveries = sqliteTable("notification_deliveries", {
  id: text("id").primaryKey(),
  notificationId: text("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(), // 'in_app' | 'push' | 'email'
  status: text("status").notNull(), // 'sent' | 'failed' | 'skipped_preference'
  errorDetail: text("error_detail"),
  attemptedAt: integer("attempted_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
