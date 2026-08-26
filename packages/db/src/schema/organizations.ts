import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import crypto from "node:crypto";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().$defaultFn(() => `org-${crypto.randomUUID().slice(0, 6)}`),
  ownerId: text("owner_id").notNull().default("usr_admin_01"),
  ownerUserId: text("owner_user_id").notNull().default("usr_admin_01"),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
