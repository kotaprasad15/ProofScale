import { router, tenantProcedure, requireProjectPermission } from "../trpc.js";
import { CreatePolicyDraftSchema, PromoteBaselineSchema, RevokeBaselineSchema } from "@proofscale/shared";
import { readinessPolicies, baselines, testRuns } from "@proofscale/db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { evaluateRunAgainstPolicy } from "@proofscale/shared";

export const policiesRouter = router({
  list: tenantProcedure
    .input(z.object({ projectId: z.string(), testPlanId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(readinessPolicies)
        .where(
          and(
            eq(readinessPolicies.projectId, input.projectId),
            eq(readinessPolicies.testPlanId, input.testPlanId)
          )
        )
        .orderBy(desc(readinessPolicies.version));
    }),

  getActive: tenantProcedure
    .input(z.object({ testPlanId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [policy] = await ctx.db
        .select()
        .from(readinessPolicies)
        .where(
          and(
            eq(readinessPolicies.testPlanId, input.testPlanId),
            eq(readinessPolicies.status, "active")
          )
        )
        .limit(1);
      return policy || null;
    }),

  createDraft: requireProjectPermission("editTestPlans")
    .input(CreatePolicyDraftSchema)
    .mutation(async ({ ctx, input }) => {
      const [existingActive] = await ctx.db
        .select()
        .from(readinessPolicies)
        .where(
          and(
            eq(readinessPolicies.testPlanId, input.testPlanId),
            eq(readinessPolicies.status, "active")
          )
        );

      const nextVersion = existingActive ? existingActive.version + 1 : 1;
      const policyId = `pol_${crypto.randomUUID().slice(0, 8)}`;

      // Validate at least one threshold
      if (
        input.minimumScore == null &&
        input.maximumP95Ms == null &&
        input.maximumP99Ms == null &&
        input.maximumErrorRatePercent == null &&
        input.minimumThroughputRps == null &&
        input.maximumTimeouts == null
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "At least one evaluation threshold must be configured." });
      }

      const [draft] = await ctx.db
        .insert(readinessPolicies)
        .values({
          id: policyId,
          organizationId: ctx.user.lastWorkspaceId || "", // from auth ctx
          projectId: input.projectId,
          testPlanId: input.testPlanId,
          version: nextVersion,
          name: input.name,
          description: input.description || null,
          status: "draft",
          minimumScore: input.minimumScore ?? null,
          maximumP95Ms: input.maximumP95Ms ?? null,
          maximumP99Ms: input.maximumP99Ms ?? null,
          maximumErrorRatePercent: input.maximumErrorRatePercent ?? null,
          minimumThroughputRps: input.minimumThroughputRps ?? null,
          maximumTimeouts: input.maximumTimeouts ?? null,
          failOnHardCap: input.failOnHardCap ?? false,
          minimumConfidence: input.minimumConfidence ?? null,
          createdBy: ctx.user.id
        })
        .returning();

      return draft;
    }),

  activateVersion: requireProjectPermission("editTestPlans")
    .input(z.object({ id: z.string(), testPlanId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [draft] = await ctx.db
        .select()
        .from(readinessPolicies)
        .where(eq(readinessPolicies.id, input.id));

      if (!draft || draft.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid policy or policy is not in draft status." });
      }

      // Archive any currently active policy
      await ctx.db
        .update(readinessPolicies)
        .set({ status: "archived", archivedAt: new Date() })
        .where(
          and(
            eq(readinessPolicies.testPlanId, input.testPlanId),
            eq(readinessPolicies.status, "active")
          )
        );

      const [activated] = await ctx.db
        .update(readinessPolicies)
        .set({ status: "active", activatedAt: new Date() })
        .where(eq(readinessPolicies.id, input.id))
        .returning();

      return activated;
    }),

  archiveVersion: requireProjectPermission("editTestPlans")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [archived] = await ctx.db
        .update(readinessPolicies)
        .set({ status: "archived", archivedAt: new Date() })
        .where(eq(readinessPolicies.id, input.id))
        .returning();
      return archived;
    })
});
