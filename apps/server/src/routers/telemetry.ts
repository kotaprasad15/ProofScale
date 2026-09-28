import { router, tenantProcedure } from "../trpc.js";
import { z } from "zod";
import { eq, and, desc, isNull } from "drizzle-orm";
import { testRuns, testPlans, targets, projects, baselines, readinessPolicies } from "@proofscale/db";
import { TRPCError } from "@trpc/server";
import { GetProjectHistorySchema, ProjectHistoryResponseSchema } from "@proofscale/shared";

export const telemetryRouter = router({
  getProjectHistory: tenantProcedure
    .input(GetProjectHistorySchema)
    .query(async ({ ctx, input }) => {
      // Ensure user belongs to the project's organization
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project || project.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const queryParams = [
        eq(testPlans.projectId, input.projectId),
        eq(testRuns.status, "completed" as any)
      ];

      if (input.testPlanId) queryParams.push(eq(testRuns.planId, input.testPlanId));
      if (input.targetId) queryParams.push(eq(testRuns.targetId, input.targetId));
      if (input.targetVersionLabel) queryParams.push(eq(testRuns.targetVersionLabel, input.targetVersionLabel));
      if (input.environment) queryParams.push(eq(targets.environment, input.environment as any));

      const runs = await ctx.db
        .select({
          run: testRuns,
          targetEnvironment: targets.environment,
          planName: testPlans.name
        })
        .from(testRuns)
        .innerJoin(testPlans, eq(testRuns.planId, testPlans.id))
        .innerJoin(targets, eq(testRuns.targetId, targets.id))
        .where(and(...queryParams))
        .orderBy(desc(testRuns.createdAt)); // Get newest first, then we might slice

      let filtered = runs;

      if (input.dateRange?.start) {
        const start = new Date(input.dateRange.start).getTime();
        filtered = filtered.filter(r => r.run.createdAt.getTime() >= start);
      }
      if (input.dateRange?.end) {
        const end = new Date(input.dateRange.end).getTime();
        filtered = filtered.filter(r => r.run.createdAt.getTime() <= end);
      }

      // Limit response
      if (filtered.length > input.limit) {
        filtered = filtered.slice(0, input.limit);
      }

      // Sort chronologically for trends
      filtered.sort((a, b) => a.run.createdAt.getTime() - b.run.createdAt.getTime());

      const points = filtered.map(r => {
        const sm = r.run.summaryMetricsJson ? JSON.parse(r.run.summaryMetricsJson) : null;
        const ps = r.run.policySnapshotJson ? JSON.parse(r.run.policySnapshotJson) : null;
        return {
          runId: r.run.id,
          timestamp: r.run.createdAt,
          environment: r.targetEnvironment,
          targetVersionLabel: r.run.targetVersionLabel,
          score: r.run.score,
          readinessLabel: r.run.readinessLabel,
          confidence: r.run.confidence,
          policyResult: ps?.result || null,
          regressionStatus: ps?.regressionStatus || null,
          p50Ms: sm?.p50Ms || null,
          p95Ms: sm?.p95Ms || null,
          p99Ms: sm?.p99Ms || null,
          throughputRps: sm?.throughputRps || null,
          errorRatePercent: sm ? sm.errorRate * 100 : null,
          timeoutCount: sm?.timeouts || null
        };
      });

      // Find Baseline if testPlanId is provided
      let baselineData = null;
      let policyData = null;

      if (input.testPlanId) {
        const [baselineInfo] = await ctx.db
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

        if (baselineInfo) {
          const bsm = baselineInfo.run.summaryMetricsJson ? JSON.parse(baselineInfo.run.summaryMetricsJson) : null;
          baselineData = {
            runId: baselineInfo.run.id,
            timestamp: baselineInfo.run.createdAt,
            score: baselineInfo.run.score,
            p95Ms: bsm?.p95Ms || null,
            p99Ms: bsm?.p99Ms || null,
            throughputRps: bsm?.throughputRps || null,
            errorRatePercent: bsm ? bsm.errorRate * 100 : null
          };
        }

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

        if (policy) {
          policyData = {
            id: policy.id,
            name: policy.name,
            version: policy.version
          };
        }
      }

      return {
        points,
        baseline: baselineData,
        policy: policyData,
        limitations: filtered.length < runs.length ? ["Response limited to maximum points. Oldest data may be truncated."] : []
      };
    })
});
