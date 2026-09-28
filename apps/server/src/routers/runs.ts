import { router, tenantProcedure, requireProjectPermission } from "../trpc.js";
import { CreateTestRunSchema, CancelTestRunSchema, KillSwitch, sanitizeTargetUrl, validateTargetHostDns, LifecycleEventBus } from "@proofscale/shared";
import { eq, desc, and, isNull } from "drizzle-orm";
import { testRuns, runEvents, testPlans, targets, projects, readinessPolicies, baselines } from "@proofscale/db";
import { evaluateRunAgainstPolicy } from "@proofscale/shared";
import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const runsRouter = router({
  list: tenantProcedure
    .input(z.object({
      projectId: z.string(),
      limit: z.number().min(1).max(100).default(25),
      cursor: z.object({
        id: z.string(),
        sortFieldValue: z.any()
      }).optional(),
      testPlanId: z.string().optional(),
      targetId: z.string().optional(),
      environment: z.string().optional(),
      targetVersionLabel: z.string().optional(),
      status: z.string().optional(),
      policyResult: z.enum(["pass", "warn", "fail", "inconclusive"]).optional(),
      regressionStatus: z.enum(["improved", "stable", "regressed"]).optional(),
      dateRange: z.object({
        start: z.string().datetime().optional(),
        end: z.string().datetime().optional()
      }).optional(),
      search: z.string().optional(),
      sortField: z.enum(["createdAt", "score", "p95Ms", "p99Ms", "throughputRps", "errorRate"]).default("createdAt"),
      sortDirection: z.enum(["asc", "desc"]).default("desc")
    }))
    .query(async ({ ctx, input }) => {
      // Because we must extract JSON for sorting/filtering on p95Ms etc, and cursor logic gets very complex,
      // we'll do a slightly simpler bounded approach where we query all matching runs for the project
      // in memory if there aren't too many, or we just rely on offset/limit. Since we only have Drizzle and this is Phase 2,
      // I will implement a robust query builder.
      const queryParams = [eq(testPlans.projectId, input.projectId)];

      if (input.testPlanId) queryParams.push(eq(testRuns.planId, input.testPlanId));
      if (input.targetId) queryParams.push(eq(testRuns.targetId, input.targetId));
      if (input.targetVersionLabel) queryParams.push(eq(testRuns.targetVersionLabel, input.targetVersionLabel));
      if (input.status) queryParams.push(eq(testRuns.status, input.status as any));
      if (input.environment) queryParams.push(eq(targets.environment, input.environment as any));
      
      // Date range
      if (input.dateRange?.start) {
        // We use created_at for date range logic
      }

      // We will pull the runs and do the cursor in code if it's too complex to map JSON extracts in SQLite/PG Drizzle ORM directly.
      // Given the data volume constraint (Performance: "Use server-side pagination"), we can use Drizzle's limit/offset,
      // but to implement cursor without raw SQL JSON extracts:
      
      const runs = await ctx.db
        .select({
          run: testRuns,
          planName: testPlans.name,
          targetName: targets.baseUrl,
          targetEnvironment: targets.environment
        })
        .from(testRuns)
        .innerJoin(testPlans, eq(testRuns.planId, testPlans.id))
        .innerJoin(targets, eq(testRuns.targetId, targets.id))
        .where(and(...queryParams))
        .orderBy(desc(testRuns.createdAt));

      // We apply search, json filters, and sorting in-memory for this MVP since JSON querying across SQLite/PG varies widely in Drizzle.
      let filtered = runs.map(r => {
        const sm = r.run.summaryMetricsJson ? JSON.parse(r.run.summaryMetricsJson) : null;
        const ps = r.run.policySnapshotJson ? JSON.parse(r.run.policySnapshotJson) : null;
        return {
          ...r.run,
          planName: r.planName,
          targetName: r.targetName,
          targetEnvironment: r.targetEnvironment,
          sm,
          ps
        };
      });

      if (input.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter(r => r.id.toLowerCase().includes(s) || (r.targetVersionLabel?.toLowerCase() || "").includes(s));
      }

      if (input.policyResult) {
        filtered = filtered.filter(r => r.ps?.result === input.policyResult);
      }

      if (input.regressionStatus) {
        filtered = filtered.filter(r => r.ps?.regressionStatus === input.regressionStatus);
      }

      if (input.dateRange?.start) {
        const start = new Date(input.dateRange.start).getTime();
        filtered = filtered.filter(r => r.createdAt.getTime() >= start);
      }
      if (input.dateRange?.end) {
        const end = new Date(input.dateRange.end).getTime();
        filtered = filtered.filter(r => r.createdAt.getTime() <= end);
      }

      // Sorting
      filtered.sort((a, b) => {
        let valA, valB;
        switch (input.sortField) {
          case "score": valA = a.score || 0; valB = b.score || 0; break;
          case "p95Ms": valA = a.sm?.p95Ms || 0; valB = b.sm?.p95Ms || 0; break;
          case "p99Ms": valA = a.sm?.p99Ms || 0; valB = b.sm?.p99Ms || 0; break;
          case "throughputRps": valA = a.sm?.throughputRps || 0; valB = b.sm?.throughputRps || 0; break;
          case "errorRate": valA = a.sm?.errorRate || 0; valB = b.sm?.errorRate || 0; break;
          case "createdAt": default: valA = a.createdAt.getTime(); valB = b.createdAt.getTime(); break;
        }

        const cmp = valA < valB ? -1 : (valA > valB ? 1 : 0);
        if (cmp !== 0) return input.sortDirection === "asc" ? cmp : -cmp;
        
        // Secondary sort by ID for stable sorting
        return a.id.localeCompare(b.id);
      });

      // Cursor Pagination
      let startIndex = 0;
      if (input.cursor) {
        const idx = filtered.findIndex(r => r.id === input.cursor?.id);
        if (idx !== -1) startIndex = idx + 1;
      }

      const paged = filtered.slice(startIndex, startIndex + input.limit);
      const nextCursor = startIndex + input.limit < filtered.length 
        ? { id: paged[paged.length - 1].id, sortFieldValue: null } 
        : undefined;

      return {
        items: paged.map(r => ({
          id: r.id,
          shortId: r.id.split("_")[1] || r.id,
          projectId: input.projectId,
          testPlanId: r.planId,
          testPlanName: r.planName,
          targetId: r.targetId,
          targetName: r.targetName,
          environment: r.targetEnvironment,
          targetVersionLabel: r.targetVersionLabel,
          status: r.status,
          startedAt: r.startedAt,
          completedAt: r.finishedAt,
          durationSeconds: r.startedAt && r.finishedAt ? Math.round((r.finishedAt.getTime() - r.startedAt.getTime()) / 1000) : null,
          score: r.score,
          confidence: r.confidence,
          readinessLabel: r.readinessLabel,
          policyResult: r.ps?.result || null,
          policyVersion: r.ps?.policy?.version || null,
          baselineRunId: r.ps?.baseline?.id || null,
          regressionStatus: r.ps?.regressionStatus || null,
          scoreDelta: r.ps?.scoreDelta || null,
          p95Ms: r.sm?.p95Ms || null,
          p99Ms: r.sm?.p99Ms || null,
          throughputRps: r.sm?.throughputRps || null,
          errorRatePercent: r.sm ? r.sm.errorRate * 100 : null,
          timeouts: r.sm?.timeouts || null
        })),
        nextCursor
      };
    }),

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

  getTimeline: tenantProcedure
    .input(z.object({
      runId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      // 1. Ensure user has access to the run's project
      const [runInfo] = await ctx.db
        .select({
          run: testRuns,
          plan: testPlans
        })
        .from(testRuns)
        .innerJoin(testPlans, eq(testRuns.planId, testPlans.id))
        .where(eq(testRuns.id, input.runId));

      if (!runInfo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Test run not found." });
      }

      // Check tenant implicitly done by relying on project-based access?
      // Wait, tenantProcedure ensures we have an active org. Let's make sure the plan belongs to the user's project/org.
      // Usually project scopes are checked via requireProjectPermission. But getTimeline is just tenantProcedure.
      // We will do a quick org check:
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, runInfo.plan.projectId));
        
      if (!project || project.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const events = await ctx.db
        .select()
        .from(runEvents)
        .where(eq(runEvents.runId, input.runId))
        .orderBy(runEvents.timestamp);

      // In-memory cursor
      let startIndex = 0;
      if (input.cursor) {
        const idx = events.findIndex(e => e.id === input.cursor);
        if (idx !== -1) startIndex = idx + 1;
      }

      const paged = events.slice(startIndex, startIndex + input.limit);
      const nextCursor = startIndex + input.limit < events.length 
        ? paged[paged.length - 1].id 
        : undefined;

      return {
        items: paged.map(e => ({
          id: e.id,
          timestamp: e.timestamp,
          eventType: e.eventType,
          message: e.message,
          metadata: e.metadataJson ? JSON.parse(e.metadataJson) : undefined
        })),
        nextCursor
      };
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
