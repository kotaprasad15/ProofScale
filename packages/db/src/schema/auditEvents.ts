import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id").notNull(),
  organizationId: text("organization_id"),
  projectId: text("project_id"),
  action: text("action").notNull(),
  subject: text("subject").notNull(),
  metadataJson: text("metadata_json"),
  ipAddress: text("ip_address"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
