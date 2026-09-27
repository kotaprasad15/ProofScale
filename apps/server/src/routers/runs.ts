import { router, tenantProcedure, requireProjectPermission } from "../trpc.js";
import { CreateTestRunSchema, CancelTestRunSchema, KillSwitch, sanitizeTargetUrl, validateTargetHostDns, LifecycleEventBus } from "@proofscale/shared";
import { eq, desc, and, isNull } from "drizzle-orm";
import { testRuns, runEvents, testPlans, targets, projects, readinessPolicies, baselines } from "@proofscale/db";
import { evaluateRunAgainstPolicy } from "@proofscale/shared";
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
          planProfile: testPlans.profile,
          planScenariosJson: testPlans.scenariosJson,
          planLoadProfileJson: testPlans.loadProfileJson,
          targetBaseUrl: targets.baseUrl,
          targetEnvironment: targets.environment
        })
        .from(testRuns)
        .innerJoin(testPlans, eq(testRuns.planId, testPlans.id))
        .innerJoin(targets, eq(testRuns.targetId, targets.id))
        .where(eq(testPlans.projectId, input.projectId))
        .orderBy(desc(testRuns.createdAt));

      return runs.map(r => ({
        ...r.run,
        planName: r.planName,
        planProfile: r.planProfile,
        scenarios: r.planScenariosJson ? JSON.parse(r.planScenariosJson) : [],
        loadProfile: r.planLoadProfileJson ? JSON.parse(r.planLoadProfileJson) : null,
        targetBaseUrl: r.targetBaseUrl,
        targetEnvironment: r.targetEnvironment,
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
          planProfile: testPlans.profile,
          planScenariosJson: testPlans.scenariosJson,
          planLoadProfileJson: testPlans.loadProfileJson,
          targetBaseUrl: targets.baseUrl,
          targetEnvironment: targets.environment
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

        const snapshotJson = runData.run.policySnapshotJson;
        let policySnapshot = snapshotJson ? JSON.parse(snapshotJson) : null;

        if (!policySnapshot && runData.run.status === "completed") {
          // Lazy evaluation
          
          const [policy] = await ctx.db
            .select()
            .from(readinessPolicies)
            .where(
              and(
                eq(readinessPolicies.testPlanId, runData.run.planId),
                eq(readinessPolicies.status, "active")
              )
            )
            .limit(1);

          if (policy) {
            const [baseline] = await ctx.db
              .select({
                baseline: baselines,
                run: testRuns
              })
              .from(baselines)
              .innerJoin(testRuns, eq(baselines.runId, testRuns.id))
              .where(
                and(
                  eq(baselines.testPlanId, runData.run.planId),
                  isNull(baselines.revokedAt)
                )
              )
              .orderBy(desc(baselines.promotedAt))
              .limit(1);

            let baselineData = null;
            if (baseline) {
              baselineData = {
                id: baseline.run.id,
                score: baseline.run.score,
                summaryMetrics: baseline.run.summaryMetricsJson ? JSON.parse(baseline.run.summaryMetricsJson) : null
              };
            }

            const summaryMetrics = runData.run.summaryMetricsJson ? JSON.parse(runData.run.summaryMetricsJson) : null;
            const hasHardCap = runData.run.scoreBreakdownJson && runData.run.scoreBreakdownJson.includes('"isHardCapTriggered":true'); // Rough check, since we just parse the whole thing anyway
            const scoreBreakdown = runData.run.scoreBreakdownJson ? JSON.parse(runData.run.scoreBreakdownJson) : null;
            
            const result = evaluateRunAgainstPolicy({
              currentRunId: runData.run.id,
              score: runData.run.score,
              confidence: runData.run.confidence as any,
              summaryMetrics,
              status: runData.run.status,
              hasHardCapFailure: scoreBreakdown?.isHardCapTriggered || false,
              policy: policy as any,
              baseline: baselineData
            });

            policySnapshot = result;
            await ctx.db
              .update(testRuns)
              .set({ policySnapshotJson: JSON.stringify(result) })
              .where(eq(testRuns.id, runData.run.id));
          }
        }

        return {
          ...runData.run,
          planName: runData.planName,
          planProfile: runData.planProfile,
          scenarios: runData.planScenariosJson ? JSON.parse(runData.planScenariosJson) : [],
          loadProfile: runData.planLoadProfileJson ? JSON.parse(runData.planLoadProfileJson) : null,
          targetBaseUrl: runData.targetBaseUrl,
          targetEnvironment: runData.targetEnvironment,
          summaryMetrics: runData.run.summaryMetricsJson ? JSON.parse(runData.run.summaryMetricsJson) : null,
          scoreBreakdown: runData.run.scoreBreakdownJson ? JSON.parse(runData.run.scoreBreakdownJson) : null,
          policySnapshot,
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
          targetVersionLabel: input.targetVersionLabel || "v1.0.0"
        })
        .returning();

      // 5. Emit queue event
      await ctx.db.insert(runEvents).values({
        id: `ev_${crypto.randomUUID().slice(0, 8)}`,
        runId,
        eventType: "queued",
        message: `Run ${runId} queued for execution against ${target.baseUrl} by ${ctx.user.email}`
      });

      return newRun;
    }),

  cancel: requireProjectPermission("createRuns")
    .input(CancelTestRunSchema)
    .mutation(async ({ ctx, input }) => {
      const [run] = await ctx.db.select().from(testRuns).where(eq(testRuns.id, input.runId));
      if (!run) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Test run not found." });
      }

      if (["completed", "cancelled", "failed"].includes(run.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot cancel test run in terminal status '${run.status}'.`
        });
      }

      await ctx.db
        .update(testRuns)
        .set({
          status: "cancelled",
          errorMessage: input.reason || "Cancelled by user"
        })
        .where(eq(testRuns.id, input.runId));

      await ctx.db.insert(runEvents).values({
        id: `ev_${crypto.randomUUID().slice(0, 8)}`,
        runId: input.runId,
        eventType: "cancelled",
        message: `Run cancelled by ${ctx.user.email}: ${input.reason || "No reason provided"}`
      });

      // Emit run.aborted lifecycle event
      try {
        const [runInfo] = await ctx.db
          .select({
            run: testRuns,
            plan: testPlans,
            target: targets,
            project: projects
          })
          .from(testRuns)
          .innerJoin(testPlans, eq(testRuns.planId, testPlans.id))
          .innerJoin(targets, eq(testRuns.targetId, targets.id))
          .innerJoin(projects, eq(testPlans.projectId, projects.id))
          .where(eq(testRuns.id, input.runId));

        if (runInfo) {
          await LifecycleEventBus.publish({
            eventId: `evt_${crypto.randomUUID()}`,
            eventType: "run.aborted",
            occurredAt: new Date().toISOString(),
            orgId: runInfo.project.organizationId,
            projectId: runInfo.project.id,
            targetId: runInfo.target.id,
            runId: input.runId,
            payload: {
              targetName: runInfo.target.baseUrl,
              scenario: runInfo.plan.profile,
              failureReason: input.reason || "Cancelled by user"
            }
          });
        }
      } catch (evtErr) {
        console.error("Failed to publish run.aborted event:", evtErr);
      }

      return { success: true, id: input.runId };
    })
});
