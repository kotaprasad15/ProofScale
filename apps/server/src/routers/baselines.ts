import { router, tenantProcedure, requireProjectPermission } from "../trpc.js";
import { PromoteBaselineSchema, RevokeBaselineSchema } from "@proofscale/shared";
import { baselines, testRuns, projects, testPlans } from "@proofscale/db";
import { eq, and, desc, isNull } from "drizzle-orm";
import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const baselinesRouter = router({
  getActive: tenantProcedure
    .input(z.object({ testPlanId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [baseline] = await ctx.db
        .select({
          baseline: baselines,
          run: testRuns
        })
        .from(baselines)
        .innerJoin(testRuns, eq(baselines.runId, testRuns.id))
        .where(
          and(
            eq(baselines.testPlanId, input.testPlanId),
            isNull(baselines.revokedAt)
          )
        )
        .orderBy(desc(baselines.promotedAt))
        .limit(1);

      if (!baseline) return null;
      return {
        ...baseline.baseline,
        run: {
          ...baseline.run,
          summaryMetrics: baseline.run.summaryMetricsJson ? JSON.parse(baseline.run.summaryMetricsJson) : null
        }
      };
    }),

  promote: requireProjectPermission("editTestPlans")
    .input(PromoteBaselineSchema)
    .mutation(async ({ ctx, input }) => {
      const [run] = await ctx.db
        .select({
          run: testRuns,
          plan: testPlans,
          project: projects
        })
        .from(testRuns)
        .innerJoin(testPlans, eq(testRuns.planId, testPlans.id))
        .innerJoin(projects, eq(testPlans.projectId, projects.id))
        .where(eq(testRuns.id, input.runId));

      if (!run) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Run not found." });
      }

      if (run.run.status !== "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only completed runs may become baselines." });
      }

      const baselineId = `bsl_${crypto.randomUUID().slice(0, 8)}`;

      // Revoke existing baseline for this test plan
      await ctx.db
        .update(baselines)
        .set({ revokedAt: new Date(), revokedBy: ctx.user.id })
        .where(
          and(
            eq(baselines.testPlanId, run.run.planId),
            isNull(baselines.revokedAt)
          )
        );
      
      // Let's just revoke all previous baselines for this test plan
      await ctx.db
        .update(baselines)
        .set({ revokedAt: new Date(), revokedBy: ctx.user.id })
        .where(
          and(
            eq(baselines.testPlanId, run.run.planId),
            isNull(baselines.revokedAt)
          )
        );

      const [newBaseline] = await ctx.db
        .insert(baselines)
        .values({
          id: baselineId,
          organizationId: run.project.organizationId,
          projectId: run.project.id,
          testPlanId: run.run.planId,
          runId: input.runId,
          promotedBy: ctx.user.id,
          promotedAt: new Date()
        })
        .returning();

      return newBaseline;
    }),

  revoke: requireProjectPermission("editTestPlans")
    .input(RevokeBaselineSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(baselines)
        .set({ revokedAt: new Date(), revokedBy: ctx.user.id })
        .where(
          and(
            eq(baselines.testPlanId, input.planId),
            isNull(baselines.revokedAt)
          )
        );
      
      return { success: true };
    })
});
