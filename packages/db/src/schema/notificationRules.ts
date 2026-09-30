import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { users } from "./users.js";
import { organizations } from "./organizations.js";

/**
 * Per-user notification rules for Phase 3 readiness events.
 *
 * Rules are opt-out per event type with a minimum severity floor. In-app is
 * the only delivery channel in this phase; the model stays extensible for
 * email/webhook channels later.
 */
export const notificationRules = sqliteTable(
  "notification_rules",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    /** Nullable: null rule applies org-wide for this user. */
    projectId: text("project_id"),

    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    eventType: text("event_type").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    /** Deliver only events at or above this severity. */
    minimumSeverity: text("minimum_severity", { enum: ["info", "success", "warning", "error"] })
      .notNull()
      .default("info"),

    createdBy: text("created_by").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
  },
  table => ({
    // One rule per user+org+project(optional)+eventType: upsert target.
    ruleIdentityIdx: uniqueIndex(
      "idx_notification_rules_identity"
    ).on(table.userId, table.organizationId, table.projectId, table.eventType),
    lookupIdx: index("idx_notification_rules_lookup").on(table.organizationId, table.eventType, table.enabled)
  })
);
