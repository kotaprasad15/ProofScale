import { db, users, organizationMembers, projectMembers, organizations, sessions } from "@proofscale/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { evaluatePermissions, UserPermissions, SessionSecurity } from "@proofscale/shared";
import { parseCookies } from "./middleware/securityMiddleware.js";

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
  sessionId?: string | null;
  csrfToken?: string | null;
  req?: any;
  res?: any;
}

export async function createContext({ req, res }: { req: any; res?: any }): Promise<Context> {
  let dbUser = null;
  let activeSessionId: string | null = null;
  let activeCsrfToken: string | null = null;

  // 1. Resolve Session from Cookie or Bearer Token (#19)
  const cookies = req?.headers ? parseCookies(req.headers.cookie) : {};
  const cookieToken = cookies[SessionSecurity.COOKIE_NAME];
  const authHeader = req?.headers?.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const sessionToken = cookieToken || bearerToken;

  if (sessionToken) {
    const tokenHash = SessionSecurity.hashSessionToken(sessionToken);
    const now = new Date();

    const [activeSession] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.sessionTokenHash, tokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now)
        )
      );

    if (activeSession) {
      activeSessionId = activeSession.id;
      activeCsrfToken = activeSession.csrfToken;

      // Fetch user associated with session
      const [u] = await db.select().from(users).where(eq(users.id, activeSession.userId));
      if (u) {
        dbUser = u;
        // Update lastActiveAt asynchronously
        db.update(sessions)
          .set({ lastActiveAt: now })
          .where(eq(sessions.id, activeSession.id))
          .catch(() => {});
      }
    }
  }

  // 2. Fallback to explicit user header from client identity (#16)
  // Hardcoded default fallback to "usr_admin_01" remains completely REMOVED.
  if (!dbUser && req?.headers?.["x-user-id"]) {
    const devUserId = req.headers["x-user-id"] as string;
    const devUserEmail = (req.headers["x-user-email"] as string) || `${devUserId}@proofscale.dev`;

    const [existing] = await db.select().from(users).where(eq(users.id, devUserId));
    if (existing) {
      dbUser = existing;
    } else {
      // Auto-create identity if not existing
      const [created] = await db
        .insert(users)
        .values({
          id: devUserId,
          email: devUserEmail,
          displayName: devUserEmail.split("@")[0],
          role: "member",
          onboardingStatus: "completed"
        })
        .returning();
      dbUser = created;
    }
  }


  let organizationId = (req?.headers?.["x-organization-id"] as string) || null;
  const projectId = (req?.headers?.["x-project-id"] as string) || null;

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
    permissions,
    sessionId: activeSessionId,
    csrfToken: activeCsrfToken,
    req,
    res
  };
}
