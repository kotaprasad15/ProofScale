import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { organizations } from "./organizations.js";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  ownerUserId: text("owner_user_id"),
  name: text("name").notNull(),
  description: text("description"),
  environment: text("environment", { enum: ["development", "staging", "production", "testing"] }).notNull().default("staging"),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
