import { router, publicProcedure, requireOrgPermission } from "../trpc.js";
import { invitations, organizations, projects } from "@proofscale/db";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "node:crypto";
import { z } from "zod";

export const invitationsRouter = router({
  preview: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");

      const [invite] = await ctx.db
        .select({
          invitation: invitations,
          organization: organizations
        })
        .from(invitations)
        .innerJoin(organizations, eq(invitations.organizationId, organizations.id))
        .where(eq(invitations.tokenHash, tokenHash));

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired invitation token." });
      }

      if (invite.invitation.revokedAt) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This invitation has been revoked." });
      }

      if (invite.invitation.acceptedAt) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This invitation has already been used." });
      }

      if (new Date() > invite.invitation.expiresAt) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This invitation has expired." });
      }

      let projectName = null;
      if (invite.invitation.projectId) {
        const [proj] = await ctx.db.select().from(projects).where(eq(projects.id, invite.invitation.projectId));
        projectName = proj?.name || null;
      }

      return {
        organizationName: invite.organization.name,
        projectName,
        role: invite.invitation.role,
        expiresAt: invite.invitation.expiresAt
      };
    }),

  revoke: requireOrgPermission("manageMembers")
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(invitations)
        .set({ revokedAt: new Date() })
        .where(eq(invitations.id, input.invitationId));

      return { success: true };
    })
});
