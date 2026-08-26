import { router, requireOrgPermission } from "../trpc.js";
import { accessRequests, organizationMembers, projectMembers } from "@proofscale/db";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "node:crypto";
import { z } from "zod";

export const accessRequestsRouter = router({
  listForReview: requireOrgPermission("manageMembers").query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.organizationId, ctx.organizationId),
          eq(accessRequests.status, "pending")
        )
      );
  }),

  approve: requireOrgPermission("manageMembers")
    .input(z.object({
      requestId: z.string(),
      role: z.enum(["tester", "member"]).default("tester")
    }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      const [req] = await ctx.db
        .select()
        .from(accessRequests)
        .where(eq(accessRequests.id, input.requestId));

      if (!req) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Access request not found." });
      }

      // Add user to organization members
      if (req.organizationId) {
        await ctx.db
          .insert(organizationMembers)
          .values({
            id: `mem_${crypto.randomUUID().slice(0, 8)}`,
            organizationId: req.organizationId,
            userId: req.userId,
            userEmail: req.userEmail,
            role: input.role,
            status: "active"
          })
          .onConflictDoNothing();
      }

      // Add user to project members if specified
      if (req.projectId) {
        await ctx.db
          .insert(projectMembers)
          .values({
            id: `pmem_${crypto.randomUUID().slice(0, 8)}`,
            projectId: req.projectId,
            userId: req.userId,
            role: "tester",
            status: "active"
          })
          .onConflictDoNothing();
      }

      await ctx.db
        .update(accessRequests)
        .set({
          status: "approved",
          reviewedByUserId: ctx.user.id,
          reviewedAt: now
        })
        .where(eq(accessRequests.id, input.requestId));

      return { success: true };
    }),

  deny: requireOrgPermission("manageMembers")
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(accessRequests)
        .set({
          status: "denied",
          reviewedByUserId: ctx.user.id,
          reviewedAt: new Date()
        })
        .where(eq(accessRequests.id, input.requestId));

      return { success: true };
    })
});
