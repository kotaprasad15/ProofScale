import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { organizations } from "./organizations.js";

export const invitations = sqliteTable("invitations", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: text("project_id"),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  tokenHash: text("token_hash").notNull().unique(),
  invitedByUserId: text("invited_by_user_id").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  acceptedAt: integer("accepted_at", { mode: "timestamp" }),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});
