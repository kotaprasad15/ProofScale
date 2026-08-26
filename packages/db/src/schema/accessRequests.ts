import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const accessRequests = sqliteTable("access_requests", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  projectId: text("project_id"),
  userId: text("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  message: text("message"),
  status: text("status", { enum: ["pending", "approved", "denied", "cancelled"] }).notNull().default("pending"),
  reviewedByUserId: text("reviewed_by_user_id"),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
