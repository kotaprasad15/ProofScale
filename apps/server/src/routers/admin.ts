import { router, requireOrgPermission } from "../trpc.js";
import { SecurityLogger } from "@proofscale/shared";
import { users, auditEvents, sessions } from "@proofscale/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

export const adminRouter = router({
  /**
   * 16 & 18. Audit log inspection requiring explicit 'manageOrganization' role permission
   */
  listAuditLogs: requireOrgPermission("manageOrganization")
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      SecurityLogger.log({
        eventType: "admin.action",
        userId: ctx.user.id,
        organizationId: ctx.organizationId,
        message: `Admin inspected security audit log (limit ${input.limit})`
      });

      return ctx.db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.organizationId, ctx.organizationId))
        .orderBy(desc(auditEvents.createdAt))
        .limit(input.limit);
    }),

  /**
   * 16, 17, 18. Safe account unlock by an authorized administrator
   */
  unlockUserAccount: requireOrgPermission("manageOrganization")
    .input(z.object({ targetUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, input.targetUserId));

      SecurityLogger.log({
        eventType: "admin.action",
        userId: ctx.user.id,
        organizationId: ctx.organizationId,
        message: `Admin manually unlocked user account '${input.targetUserId}'`
      });

      return { success: true };
    }),

  /**
   * 16 & 3. Invalidate all active sessions for a user (admin revocation)
   */
  revokeUserSessions: requireOrgPermission("manageOrganization")
    .input(z.object({ targetUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.userId, input.targetUserId));

      SecurityLogger.log({
        eventType: "auth.session_revoked",
        userId: ctx.user.id,
        organizationId: ctx.organizationId,
        message: `Admin revoked all active sessions for user '${input.targetUserId}'`
      });

      return { success: true };
    })
});
