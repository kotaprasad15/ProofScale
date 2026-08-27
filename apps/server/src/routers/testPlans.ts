import { router, tenantProcedure, requireProjectPermission } from "../trpc.js";
import { CreateTestPlanSchema, UpdateTestPlanSchema } from "@proofscale/shared";
import { testPlans } from "@proofscale/db";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const testPlansRouter = router({
  listByProject: tenantProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const plans = await ctx.db
        .select()
        .from(testPlans)
        .where(eq(testPlans.projectId, input.projectId));

      return plans.map(p => ({
        ...p,
        scenarios: JSON.parse(p.scenariosJson),
        loadProfile: JSON.parse(p.loadProfileJson),
        thresholds: JSON.parse(p.thresholdsJson),
        safetyLimits: p.safetyLimitsJson ? JSON.parse(p.safetyLimitsJson) : undefined
      }));
    }),

  getById: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [plan] = await ctx.db
        .select()
        .from(testPlans)
        .where(eq(testPlans.id, input.id));

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Test plan not found." });
      }

      return {
        ...plan,
        scenarios: JSON.parse(plan.scenariosJson),
        loadProfile: JSON.parse(plan.loadProfileJson),
        thresholds: JSON.parse(plan.thresholdsJson),
        safetyLimits: plan.safetyLimitsJson ? JSON.parse(plan.safetyLimitsJson) : undefined
      };
    }),

  create: requireProjectPermission("editTestPlans")
    .input(CreateTestPlanSchema)
    .mutation(async ({ ctx, input }) => {
      const planId = `plan_${crypto.randomUUID().slice(0, 8)}`;

      const [newPlan] = await ctx.db
        .insert(testPlans)
        .values({
          id: planId,
          projectId: input.projectId,
          name: input.name,
          version: 1,
          profile: input.profile,
          scenariosJson: JSON.stringify(input.scenarios),
          loadProfileJson: JSON.stringify(input.loadProfile),
          thresholdsJson: JSON.stringify(input.thresholds),
          safetyLimitsJson: input.safetyLimits ? JSON.stringify(input.safetyLimits) : null,
          scoringVersion: "mvp-1"
        })
        .returning();

      return {
        ...newPlan,
        scenarios: input.scenarios,
        loadProfile: input.loadProfile,
        thresholds: input.thresholds,
        safetyLimits: input.safetyLimits
      };
    }),

  update: requireProjectPermission("editTestPlans")
    .input(UpdateTestPlanSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(testPlans)
        .where(eq(testPlans.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Test plan not found." });
      }

      const updateData: Record<string, any> = {
        version: (existing.version || 1) + 1,
        updatedAt: new Date()
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.profile !== undefined) updateData.profile = input.profile;
      if (input.scenarios !== undefined) updateData.scenariosJson = JSON.stringify(input.scenarios);
      if (input.loadProfile !== undefined) updateData.loadProfileJson = JSON.stringify(input.loadProfile);
      if (input.thresholds !== undefined) updateData.thresholdsJson = JSON.stringify(input.thresholds);
      if (input.safetyLimits !== undefined) updateData.safetyLimitsJson = JSON.stringify(input.safetyLimits);

      const [updated] = await ctx.db
        .update(testPlans)
        .set(updateData)
        .where(eq(testPlans.id, input.id))
        .returning();

      return {
        ...updated,
        scenarios: updated.scenariosJson ? JSON.parse(updated.scenariosJson) : [],
        loadProfile: updated.loadProfileJson ? JSON.parse(updated.loadProfileJson) : null,
        thresholds: updated.thresholdsJson ? JSON.parse(updated.thresholdsJson) : null
      };
    }),

  delete: requireProjectPermission("editTestPlans")
    .input(z.object({ id: z.string(), projectId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(testPlans)
        .where(eq(testPlans.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Test plan not found." });
      }

      await ctx.db.delete(testPlans).where(eq(testPlans.id, input.id));
      return { success: true, id: input.id };
    })
});
