import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { organizations } from "./organizations.js";

export const organizationMembers = sqliteTable("organization_members", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  role: text("role", { enum: ["owner", "admin", "member", "tester"] }).notNull().default("member"),
  status: text("status", { enum: ["active", "pending", "suspended", "revoked"] }).notNull().default("active"),
  invitedByUserId: text("invited_by_user_id"),
  joinedAt: integer("joined_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
