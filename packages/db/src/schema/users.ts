import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  role: text("role").notNull().default("member"),
  onboardingStatus: text("onboarding_status").notNull().default("completed"),
  lastWorkspaceId: text("last_workspace_id"),
  passwordHash: text("password_hash"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: integer("locked_until", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())
});

