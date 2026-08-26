import { router, tenantProcedure, publicProcedure } from "../trpc.js";
import {
  CreateReportShareSchema,
  RevokeReportShareSchema,
  exportReportToMarkdown,
  exportReportToJson,
  compareTestRuns
} from "@proofscale/shared";
import { testRuns, reportShares, findings, artifacts, testPlans, targets, projects } from "@proofscale/db";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const reportsRouter = router({
  getReportByRunId: tenantProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [runData] = await ctx.db
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

      if (!runData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Test run report not found." });
      }

      const runFindings = await ctx.db
        .select()
        .from(findings)
        .where(eq(findings.runId, input.runId));

      const runArtifacts = await ctx.db
        .select()
        .from(artifacts)
        .where(eq(artifacts.runId, input.runId));

      return {
        run: {
          ...runData.run,
          summaryMetrics: runData.run.summaryMetricsJson ? JSON.parse(runData.run.summaryMetricsJson) : null,
          scoreBreakdown: runData.run.scoreBreakdownJson ? JSON.parse(runData.run.scoreBreakdownJson) : null
        },
        plan: {
          ...runData.plan,
          scenarios: JSON.parse(runData.plan.scenariosJson),
          loadProfile: JSON.parse(runData.plan.loadProfileJson),
          thresholds: JSON.parse(runData.plan.thresholdsJson)
        },
        target: runData.target,
        project: runData.project,
        findings: runFindings,
        artifacts: runArtifacts
      };
    }),

  exportMarkdown: tenantProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [runData] = await ctx.db
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

      if (!runData || !runData.run.scoreBreakdownJson) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Completed test run report not found." });
      }

      const runFindings = await ctx.db
        .select()
        .from(findings)
        .where(eq(findings.runId, input.runId));

      const markdown = exportReportToMarkdown({
        runId: runData.run.id,
        projectName: runData.project.name,
        targetBaseUrl: runData.target.baseUrl,
        planName: runData.plan.name,
        profile: runData.plan.profile,
        targetVersionLabel: runData.run.targetVersionLabel || "v1.0.0",
        region: runData.run.region || "local-us-east",
        createdAt: runData.run.createdAt,
        scoreBreakdown: JSON.parse(runData.run.scoreBreakdownJson),
        summaryMetrics: runData.run.summaryMetricsJson ? JSON.parse(runData.run.summaryMetricsJson) : null,
        findings: runFindings as any
      });

      return { markdown };
    }),

  exportJson: tenantProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [runData] = await ctx.db
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

      if (!runData || !runData.run.scoreBreakdownJson) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Completed test run report not found." });
      }

      const runFindings = await ctx.db
        .select()
        .from(findings)
        .where(eq(findings.runId, input.runId));

      const jsonStr = exportReportToJson({
        runId: runData.run.id,
        projectName: runData.project.name,
        targetBaseUrl: runData.target.baseUrl,
        planName: runData.plan.name,
        profile: runData.plan.profile,
        targetVersionLabel: runData.run.targetVersionLabel || "v1.0.0",
        region: runData.run.region || "local-us-east",
        createdAt: runData.run.createdAt,
        scoreBreakdown: JSON.parse(runData.run.scoreBreakdownJson),
        summaryMetrics: runData.run.summaryMetricsJson ? JSON.parse(runData.run.summaryMetricsJson) : null,
        findings: runFindings as any
      });

      return { json: jsonStr };
    }),

  compareRuns: tenantProcedure
    .input(z.object({
      baselineRunId: z.string(),
      currentRunId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const [baseline] = await ctx.db.select().from(testRuns).where(eq(testRuns.id, input.baselineRunId));
      const [current] = await ctx.db.select().from(testRuns).where(eq(testRuns.id, input.currentRunId));

      if (!baseline || !current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "One or both test runs were not found." });
      }

      const comparison = compareTestRuns(
        {
          id: baseline.id,
          score: baseline.score,
          summaryMetrics: baseline.summaryMetricsJson ? JSON.parse(baseline.summaryMetricsJson) : null
        },
        {
          id: current.id,
          score: current.score,
          summaryMetrics: current.summaryMetricsJson ? JSON.parse(current.summaryMetricsJson) : null
        }
      );

      return comparison;
    }),

  createShareLink: tenantProcedure
    .input(CreateReportShareSchema)
    .mutation(async ({ ctx, input }) => {
      const rawToken = `ps_share_${crypto.randomBytes(24).toString("hex")}`;
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      const shareId = `share_${crypto.randomUUID().slice(0, 8)}`;

      await ctx.db.insert(reportShares).values({
        id: shareId,
        runId: input.runId,
        tokenHash,
        createdByUserId: ctx.user.id,
        expiresAt
      });

      return {
        shareId,
        rawToken,
        expiresAt: expiresAt.toISOString()
      };
    }),

  getPublicReport: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");

      const [share] = await ctx.db
        .select()
        .from(reportShares)
        .where(eq(reportShares.tokenHash, tokenHash));

      if (!share) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired share link." });
      }

      if (share.revokedAt) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This share link has been revoked." });
      }

      if (new Date() > share.expiresAt) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This share link has expired." });
      }

      const [runData] = await ctx.db
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
        .where(eq(testRuns.id, share.runId));

      const runFindings = await ctx.db
        .select()
        .from(findings)
        .where(eq(findings.runId, share.runId));

      return {
        run: {
          ...runData.run,
          summaryMetrics: runData.run.summaryMetricsJson ? JSON.parse(runData.run.summaryMetricsJson) : null,
          scoreBreakdown: runData.run.scoreBreakdownJson ? JSON.parse(runData.run.scoreBreakdownJson) : null
        },
        plan: {
          ...runData.plan,
          scenarios: JSON.parse(runData.plan.scenariosJson),
          loadProfile: JSON.parse(runData.plan.loadProfileJson),
          thresholds: JSON.parse(runData.plan.thresholdsJson)
        },
        target: runData.target,
        project: runData.project,
        findings: runFindings
      };
    }),

  revokeShareLink: tenantProcedure
    .input(RevokeReportShareSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(reportShares)
        .set({ revokedAt: new Date() })
        .where(eq(reportShares.id, input.shareId))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Share link not found." });
      }

      return { success: true, revokedAt: updated.revokedAt };
    })
});
