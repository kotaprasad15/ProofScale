import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { projects } from "./projects.js";

export const projectMembers = sqliteTable("project_members", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role", { enum: ["owner", "editor", "tester", "viewer"] }).notNull().default("tester"),
  status: text("status", { enum: ["active", "suspended", "revoked"] }).notNull().default("active"),
  invitedByUserId: text("invited_by_user_id"),
  joinedAt: integer("joined_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
