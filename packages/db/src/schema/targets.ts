import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { projects } from "./projects.js";

export const targets = sqliteTable("targets", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  baseUrl: text("base_url").notNull(),
  healthUrl: text("health_url"),
  environment: text("environment", { enum: ["development", "staging", "production", "testing"] }).notNull().default("staging"),
  authorizationStatus: text("authorization_status", { enum: ["pending", "verified", "rejected"] }).notNull().default("verified"),
  allowedHost: text("allowed_host").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
