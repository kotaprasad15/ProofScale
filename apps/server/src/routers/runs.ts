import { router, tenantProcedure, requireProjectPermission } from "../trpc.js";
import { CreateTestRunSchema, CancelTestRunSchema, KillSwitch, sanitizeTargetUrl, validateTargetHostDns } from "@proofscale/shared";
import { testRuns, runEvents, testPlans, targets } from "@proofscale/db";
import { eq, desc } from "drizzle-orm";
import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const runsRouter = router({
  listByProject: tenantProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const runs = await ctx.db
        .select({
          run: testRuns,
          planName: testPlans.name,
          targetBaseUrl: targets.baseUrl
        })
        .from(testRuns)
        .innerJoin(testPlans, eq(testRuns.planId, testPlans.id))
        .innerJoin(targets, eq(testRuns.targetId, targets.id))
        .where(eq(testPlans.projectId, input.projectId))
        .orderBy(desc(testRuns.createdAt));

      return runs.map(r => ({
        ...r.run,
        planName: r.planName,
        targetBaseUrl: r.targetBaseUrl,
        summaryMetrics: r.run.summaryMetricsJson ? JSON.parse(r.run.summaryMetricsJson) : null,
        scoreBreakdown: r.run.scoreBreakdownJson ? JSON.parse(r.run.scoreBreakdownJson) : null
      }));
    }),

  getById: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [runData] = await ctx.db
        .select({
          run: testRuns,
          planName: testPlans.name,
          targetBaseUrl: targets.baseUrl
        })
        .from(testRuns)
        .innerJoin(testPlans, eq(testRuns.planId, testPlans.id))
        .innerJoin(targets, eq(testRuns.targetId, targets.id))
        .where(eq(testRuns.id, input.id));

      if (!runData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Test run not found." });
      }

      const events = await ctx.db
        .select()
        .from(runEvents)
        .where(eq(runEvents.runId, input.id))
        .orderBy(runEvents.timestamp);

      return {
        ...runData.run,
        planName: runData.planName,
        targetBaseUrl: runData.targetBaseUrl,
        summaryMetrics: runData.run.summaryMetricsJson ? JSON.parse(runData.run.summaryMetricsJson) : null,
        scoreBreakdown: runData.run.scoreBreakdownJson ? JSON.parse(runData.run.scoreBreakdownJson) : null,
        events
      };
    }),

  create: requireProjectPermission("createRuns")
    .input(CreateTestRunSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Check Global Emergency Kill Switch
      if (KillSwitch.isActivated()) {
        const state = KillSwitch.getState();
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Global Emergency Kill Switch is active. Run creation is disabled. Reason: ${state.reason || "System shutdown"}`
        });
      }

      const runId = `run_${crypto.randomUUID().slice(0, 8)}`;

      // 2. Validate plan and target exist
      const [plan] = await ctx.db.select().from(testPlans).where(eq(testPlans.id, input.planId));
      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Specified test plan does not exist." });
      }

      const [target] = await ctx.db.select().from(targets).where(eq(targets.id, input.targetId));
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Specified target endpoint does not exist." });
      }

      // 3. Pre-execution Safety Re-Validation (SSRF & DNS rebinding guard)
      const sanitization = sanitizeTargetUrl(target.baseUrl);
      if (!sanitization.isValid || !sanitization.allowedHost) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Target URL safety check failed: ${sanitization.reason || "Invalid URL"}`
        });
      }

      const allowPrivate = process.env.ALLOW_PRIVATE_TARGETS === "true" || process.env.NODE_ENV !== "production";
      const dnsCheck = await validateTargetHostDns(sanitization.allowedHost, { allowPrivateIPs: allowPrivate });

      if (!dnsCheck.isValid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Target SSRF re-check failed: ${dnsCheck.reason || "Restricted destination"}`
        });
      }

      // 4. Queue the run in DB
      const [newRun] = await ctx.db
        .insert(testRuns)
        .values({
          id: runId,
          planId: input.planId,
          targetId: input.targetId,
          status: "queued",
          requestedByUserId: ctx.user.id,
          targetVersionLabel: input.targetVersionLabel || "v1.0.0",
          region: input.region || "local-us-east"
        })
        .returning();

      // 5. Record audit run event with resolved target IP evidence
      await ctx.db.insert(runEvents).values({
        id: `evt_${crypto.randomUUID().slice(0, 8)}`,
        runId,
        eventType: "queued",
        message: `Run enqueued by user ${ctx.user.email} for target ${target.baseUrl} (Resolved IPs: ${dnsCheck.resolvedIps.join(", ")})`
      });

      return newRun;
    }),

  cancel: tenantProcedure
    .input(CancelTestRunSchema)
    .mutation(async ({ ctx, input }) => {
      const [run] = await ctx.db.select().from(testRuns).where(eq(testRuns.id, input.runId));

      if (!run) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Test run not found." });
      }

      // Check if user is allowed to cancel: must have cancelAnyRun OR (cancelOwnRuns and be creator)
      const canCancel = ctx.permissions.cancelAnyRun || (ctx.permissions.cancelOwnRuns && run.requestedByUserId === ctx.user.id);
      if (!canCancel) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are only permitted to cancel test runs that you initiated." });
      }

      if (["completed", "failed", "cancelled", "expired"].includes(run.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot cancel a run with terminal status '${run.status}'.`
        });
      }

      const [updatedRun] = await ctx.db
        .update(testRuns)
        .set({
          status: "cancelling",
          errorMessage: input.reason || "Cancelled by user request.",
          updatedAt: new Date()
        })
        .where(eq(testRuns.id, input.runId))
        .returning();

      await ctx.db.insert(runEvents).values({
        id: `evt_${crypto.randomUUID().slice(0, 8)}`,
        runId: input.runId,
        eventType: "cancelling",
        message: `Cancellation requested: ${input.reason || "User initiated cancel"}`
      });

      return updatedRun;
    })
});
