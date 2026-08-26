import { db, users, organizationMembers, projectMembers, organizations } from "@proofscale/db";
import { eq, and } from "drizzle-orm";
import { evaluatePermissions, UserPermissions } from "@proofscale/shared";

export interface Context {
  db: typeof db;
  user: {
    id: string;
    email: string;
    displayName?: string | null;
    role: string;
    onboardingStatus: string;
    lastWorkspaceId?: string | null;
  } | null;
  organizationId?: string | null;
  projectId?: string | null;
  orgRole?: string | null;
  projectRole?: string | null;
  permissions: UserPermissions;
}

export async function createContext({ req, res }: { req: any; res?: any }): Promise<Context> {
  const userId = (req.headers["x-user-id"] as string) || "usr_admin_01";
  const userEmail = (req.headers["x-user-email"] as string) || "lead@acme.dev";
  let organizationId = (req.headers["x-organization-id"] as string) || null;
  const projectId = (req.headers["x-project-id"] as string) || null;

  let dbUser = null;
  if (userId) {
    const [existing] = await db.select().from(users).where(eq(users.id, userId));
    if (existing) {
      dbUser = existing;
    } else {
      // Auto-create user identity on first OAuth sign-in
      const [created] = await db
        .insert(users)
        .values({
          id: userId,
          email: userEmail,
          displayName: userEmail.split("@")[0],
          role: "member",
          onboardingStatus: "completed"
        })
        .returning();
      dbUser = created;
    }
  }

  // Resolve active organization membership
  let orgRole: string | null = null;
  if (dbUser) {
    if (!organizationId) {
      // Default to lastWorkspaceId or first available org
      if (dbUser.lastWorkspaceId) {
        organizationId = dbUser.lastWorkspaceId;
      } else {
        const [firstOrg] = await db
          .select()
          .from(organizationMembers)
          .where(and(eq(organizationMembers.userId, dbUser.id), eq(organizationMembers.status, "active")));
        if (firstOrg) {
          organizationId = firstOrg.organizationId;
        }
      }
    }

    if (organizationId) {
      const [member] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, dbUser.id),
            eq(organizationMembers.status, "active")
          )
        );
      if (member) {
        orgRole = member.role;
      }
    }
  }

  // Resolve active project membership
  let projectRole: string | null = null;
  if (dbUser && projectId) {
    const [pm] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, dbUser.id),
          eq(projectMembers.status, "active")
        )
      );
    if (pm) {
      projectRole = pm.role;
    }
  }

  const permissions = evaluatePermissions(orgRole, projectRole);

  return {
    db,
    user: dbUser
      ? {
          id: dbUser.id,
          email: dbUser.email,
          displayName: dbUser.displayName,
          role: dbUser.role,
          onboardingStatus: dbUser.onboardingStatus,
          lastWorkspaceId: dbUser.lastWorkspaceId
        }
      : null,
    organizationId,
    projectId,
    orgRole,
    projectRole,
    permissions
  };
}
