import { router, tenantProcedure, requireProjectPermission } from "../trpc.js";
import {
  CreateScheduleSchema,
  UpdateScheduleSchema,
  ScheduleIdSchema,
  computeNextRun,
  validateScheduleShape,
  SCHEDULING_POLICY,
  ScheduleStatus
} from "@proofscale/shared";
import { assessmentSchedules, scheduleExecutions, testPlans, testRuns, projects, auditEvents } from "@proofscale/db";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

/**
 * Phase 3: durable schedule management.
 *
 * All queries/mutations are scoped to the caller's active organization.
 * Schedules never carry workload parameters — they reference an approved test
 * plan and inherit its safety envelope at execution time.
 */

const MAX_NAME_LENGTH = 120;

/** Verifies project + plan belong to the caller's org; returns plan row. */
async function authorizePlan(ctx: any, projectId: string, testPlanId: string) {
  const [project] = await ctx.db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || project.organizationId !== ctx.organizationId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Project not found in your organization." });
  }

  const [plan] = await ctx.db.select().from(testPlans).where(eq(testPlans.id, testPlanId));
  if (!plan || plan.projectId !== projectId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Test plan not found in this project." });
  }
  return { project, plan };
}

async function audit(ctx: any, params: { actorUserId: string; organizationId: string; projectId?: string | null; action: string; subject: string; metadata?: Record<string, unknown> }) {
  await ctx.db.insert(auditEvents).values({
    id: `audit_${crypto.randomUUID().slice(0, 8)}`,
    actorUserId: params.actorUserId,
    organizationId: params.organizationId,
    projectId: params.projectId || null,
    action: params.action,
    subject: params.subject,
    metadataJson: params.metadata ? JSON.stringify(params.metadata) : null
  });
}

function scheduleRowToDomain(row: typeof assessmentSchedules.$inferSelect) {
  const shape = {
    scheduleType: row.scheduleType as any,
    status: row.status as ScheduleStatus,
    cronExpression: row.cronExpression,
    runAt: row.runAt ? row.runAt.toISOString() : null,
    timezone: row.timezone,
    maxRuns: row.maxRuns,
    runCount: row.runCount
  };
  const preview = computeNextRun(shape);
  return {
    id: row.id,
    organizationId: row.organizationId,
    projectId: row.projectId,
    testPlanId: row.testPlanId,
    name: row.name,
    description: row.description,
    status: row.status,
    scheduleType: row.scheduleType,
    runAt: row.runAt ? row.runAt.toISOString() : null,
    cronExpression: row.cronExpression,
    timezone: row.timezone,
    nextRunAt: preview.nextRunAtUtc,
    nextRunAtLocal: preview.nextRunAtLocal,
    scheduleDescription: preview.scheduleDescription,
    lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
    lastRunId: row.lastRunId,
    lastRunStatus: row.lastRunStatus,
    lastError: row.lastError,
    maxRuns: row.maxRuns,
    runCount: row.runCount,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    pausedBy: row.pausedBy,
    pausedAt: row.pausedAt ? row.pausedAt.toISOString() : null,
    cancelledBy: row.cancelledBy,
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
    version: row.version,
    limitations: preview.limitations
  };
}

export const schedulesRouter = router({
  list: tenantProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [project] = await ctx.db.select().from(projects).where(eq(projects.id, input.projectId));
      if (!project || project.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized for this project." });
      }

      const rows = await ctx.db
        .select({ schedule: assessmentSchedules, planName: testPlans.name })
        .from(assessmentSchedules)
        .innerJoin(testPlans, eq(assessmentSchedules.testPlanId, testPlans.id))
        .where(eq(assessmentSchedules.projectId, input.projectId))
        .orderBy(desc(assessmentSchedules.createdAt));

      const planEnvRows = await ctx.db
        .select({ id: testPlans.id, loadProfileJson: testPlans.loadProfileJson })
        .from(testPlans)
        .where(eq(testPlans.projectId, input.projectId));
      const envByPlan = new Map(planEnvRows.map(p => [p.id, p.loadProfileJson]));

      return rows.map(r => {
        const domain = scheduleRowToDomain(r.schedule);
        let maxVus: number | null = null;
        let duration: number | null = null;
        try {
          const lp = JSON.parse(envByPlan.get(r.schedule.testPlanId) || "{}");
          maxVus = lp.virtualUsers ?? null;
          duration = lp.durationSeconds ?? null;
        } catch {}
        return { ...domain, planName: r.planName, planMaxVus: maxVus, planDurationSeconds: duration };
      });
    }),

  getById: tenantProcedure
    .input(ScheduleIdSchema)
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ schedule: assessmentSchedules, planName: testPlans.name })
        .from(assessmentSchedules)
        .innerJoin(testPlans, eq(assessmentSchedules.testPlanId, testPlans.id))
        .where(eq(assessmentSchedules.id, input.id));

      // Tenant isolation: ID guessing reveals nothing across orgs.
      if (!row || row.schedule.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found." });
      }

      let planEnvelope: Record<string, unknown> | null = null;
      try {
        const lp = JSON.parse(
          (await ctx.db.select({ lp: testPlans.loadProfileJson }).from(testPlans).where(eq(testPlans.id, row.schedule.testPlanId)))[0]?.lp || "{}"
        );
        planEnvelope = { virtualUsers: lp.virtualUsers ?? null, durationSeconds: lp.durationSeconds ?? null };
      } catch {
        planEnvelope = null;
      }

      return { ...scheduleRowToDomain(row.schedule), planName: row.planName, planEnvelope };
    }),

  create: requireProjectPermission("editTestPlans")
    .input(CreateScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      const { project, plan } = await authorizePlan(ctx, input.projectId, input.testPlanId);

      // Only approved plans may be scheduled automatically.
      const planStatus = (plan as any).planStatus;
      if (planStatus && planStatus !== "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Only approved test plans can be scheduled (plan status: ${planStatus}).`
        });
      }

      // Shared validation (timezone, cron, frequency safety, runAt windows).
      const problems = validateScheduleShape({
        scheduleType: input.scheduleType,
        cronExpression: input.cronExpression || null,
        runAt: input.runAt || null,
        timezone: input.timezone
      });
      if (problems.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: problems.join(" ") });
      }

      // Per-project schedule budget.
      const existing = await ctx.db
        .select({ id: assessmentSchedules.id })
        .from(assessmentSchedules)
        .where(eq(assessmentSchedules.projectId, input.projectId));
      if (existing.length >= SCHEDULING_POLICY.MAX_SCHEDULES_PER_PROJECT) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This project already has ${SCHEDULING_POLICY.MAX_SCHEDULES_PER_PROJECT} schedules. Cancel unused ones first.`
        });
      }

      const preview = computeNextRun({
        scheduleType: input.scheduleType,
        status: "active",
        cronExpression: input.cronExpression || null,
        runAt: input.runAt || null,
        timezone: input.timezone,
        maxRuns: input.maxRuns ?? null,
        runCount: 0
      });

      const id = `sched_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      const now = new Date();
      const runAtDate = input.runAt ? new Date(input.runAt) : null;

      await ctx.db.insert(assessmentSchedules).values({
        id,
        organizationId: project.organizationId,
        projectId: input.projectId,
        testPlanId: input.testPlanId,
        name: input.name,
        description: input.description || null,
        status: "active",
        scheduleType: input.scheduleType,
        runAt: runAtDate,
        cronExpression: input.cronExpression || null,
        timezone: input.timezone,
        nextRunAt: preview.nextRunAtUtc ? new Date(preview.nextRunAtUtc) : null,
        maxRuns: input.maxRuns ?? null,
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now
      });

      await audit(ctx, {
        actorUserId: ctx.user.id,
        organizationId: project.organizationId,
        projectId: project.id,
        action: "schedule.created",
        subject: id,
        metadata: { name: input.name, scheduleType: input.scheduleType, timezone: input.timezone }
      });

      return scheduleRowToDomain(
        (await ctx.db.select().from(assessmentSchedules).where(eq(assessmentSchedules.id, id)))[0]
      );
    }),

  update: requireProjectPermission("editTestPlans")
    .input(UpdateScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(assessmentSchedules).where(eq(assessmentSchedules.id, input.id));
      if (!row || row.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found." });
      }

      // Optimistic concurrency: reject stale writes.
      if (row.version !== input.version) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Schedule was modified by someone else (stored version ${row.version}, you sent ${input.version}). Reload and retry.`
        });
      }

      if (["cancelled", "completed"].includes(row.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `A ${row.status} schedule cannot be edited.` });
      }

      const nextCron = input.cronExpression ?? row.cronExpression;
      const nextRunAt = input.runAt ?? (row.runAt ? row.runAt.toISOString() : null);
      const nextTz = input.timezone ?? row.timezone;

      const problems = validateScheduleShape({
        scheduleType: row.scheduleType as any,
        cronExpression: nextCron,
        runAt: nextRunAt,
        timezone: nextTz
      });
      if (problems.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: problems.join(" ") });
      }

      const preview = computeNextRun({
        scheduleType: row.scheduleType as any,
        status: "active",
        cronExpression: nextCron,
        runAt: nextRunAt,
        timezone: nextTz,
        maxRuns: input.maxRuns ?? row.maxRuns,
        runCount: row.runCount
      });

      const now = new Date();
      await ctx.db
        .update(assessmentSchedules)
        .set({
          name: input.name ?? row.name,
          description: input.description !== undefined ? input.description : row.description,
          cronExpression: nextCron,
          timezone: nextTz,
          runAt: nextRunAt ? new Date(nextRunAt) : null,
          maxRuns: input.maxRuns !== undefined ? input.maxRuns : row.maxRuns,
          nextRunAt: preview.nextRunAtUtc ? new Date(preview.nextRunAtUtc) : null,
          // Recovery path: editing an invalid schedule that now validates
          // restores it to active — safe, because execution time re-checks the
          // current plan, target, safety limits, and kill switch anyway.
          status: row.status === "invalid" ? "active" : row.status,
          lastError: row.status === "invalid" ? null : row.lastError,
          updatedAt: now,
          version: row.version + 1
        })
        .where(eq(assessmentSchedules.id, input.id));

      await audit(ctx, {
        actorUserId: ctx.user.id,
        organizationId: row.organizationId,
        projectId: row.projectId,
        action: "schedule.updated",
        subject: row.id,
        metadata: { version: row.version + 1 }
      });

      return scheduleRowToDomain(
        (await ctx.db.select().from(assessmentSchedules).where(eq(assessmentSchedules.id, input.id)))[0]
      );
    }),

  pause: requireProjectPermission("editTestPlans")
    .input(ScheduleIdSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(assessmentSchedules).where(eq(assessmentSchedules.id, input.id));
      if (!row || row.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found." });
      }
      if (row.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Only active schedules can be paused (status: ${row.status}).` });
      }

      const now = new Date();
      await ctx.db
        .update(assessmentSchedules)
        .set({
          status: "paused",
          pausedBy: ctx.user.id,
          pausedAt: now,
          updatedAt: now,
          version: row.version + 1
        })
        .where(eq(assessmentSchedules.id, input.id));

      await audit(ctx, {
        actorUserId: ctx.user.id,
        organizationId: row.organizationId,
        projectId: row.projectId,
        action: "schedule.paused",
        subject: row.id
      });

      return scheduleRowToDomain((await ctx.db.select().from(assessmentSchedules).where(eq(assessmentSchedules.id, input.id)))[0]);
    }),

  resume: requireProjectPermission("editTestPlans")
    .input(ScheduleIdSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(assessmentSchedules).where(eq(assessmentSchedules.id, input.id));
      if (!row || row.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found." });
      }
      if (row.status !== "paused") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Only paused schedules can be resumed (status: ${row.status}).` });
      }

      // Recompute the next occurrence from now (skip missed occurrences while paused).
      const now = new Date();
      const preview = computeNextRun({
        scheduleType: row.scheduleType as any,
        status: "active",
        cronExpression: row.cronExpression,
        runAt: row.runAt ? row.runAt.toISOString() : null,
        timezone: row.timezone,
        maxRuns: row.maxRuns,
        runCount: row.runCount
      }, now.getTime());

      // A one-time schedule whose window passed while paused becomes invalid
      // rather than silently firing a stale load test.
      if (!preview.nextRunAtUtc && row.scheduleType === "one_time") {
        await ctx.db
          .update(assessmentSchedules)
          .set({
            status: "invalid",
            lastError: "One-time schedule window passed while paused; manual review required.",
            updatedAt: now,
            version: row.version + 1
          })
          .where(eq(assessmentSchedules.id, input.id));

        await audit(ctx, {
          actorUserId: ctx.user.id,
          organizationId: row.organizationId,
          projectId: row.projectId,
          action: "schedule.marked_invalid",
          subject: row.id,
          metadata: { reason: "one_time_window_expired_while_paused" }
        });

        return scheduleRowToDomain((await ctx.db.select().from(assessmentSchedules).where(eq(assessmentSchedules.id, input.id)))[0]);
      }

      await ctx.db
        .update(assessmentSchedules)
        .set({
          status: "active",
          nextRunAt: preview.nextRunAtUtc ? new Date(preview.nextRunAtUtc) : null,
          pausedBy: null,
          pausedAt: null,
          updatedAt: now,
          version: row.version + 1
        })
        .where(eq(assessmentSchedules.id, input.id));

      await audit(ctx, {
        actorUserId: ctx.user.id,
        organizationId: row.organizationId,
        projectId: row.projectId,
        action: "schedule.resumed",
        subject: row.id,
        metadata: { nextRunAt: preview.nextRunAtUtc }
      });

      return scheduleRowToDomain((await ctx.db.select().from(assessmentSchedules).where(eq(assessmentSchedules.id, input.id)))[0]);
    }),

  cancel: requireProjectPermission("editTestPlans")
    .input(ScheduleIdSchema.extend({ expectedVersion: z.number().int().min(1).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(assessmentSchedules).where(eq(assessmentSchedules.id, input.id));
      if (!row || row.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found." });
      }
      if (row.status === "cancelled") {
        return scheduleRowToDomain(row);
      }

      const now = new Date();
      await ctx.db
        .update(assessmentSchedules)
        .set({
          status: "cancelled",
          cancelledBy: ctx.user.id,
          cancelledAt: now,
          nextRunAt: null,
          updatedAt: now,
          version: row.version + 1
        })
        .where(eq(assessmentSchedules.id, input.id));

      await audit(ctx, {
        actorUserId: ctx.user.id,
        organizationId: row.organizationId,
        projectId: row.projectId,
        action: "schedule.cancelled",
        subject: row.id
      });

      // Note for the UI: already-created runs are NOT cancelled by this
      // action; cancel runs individually via the runs router.
      return scheduleRowToDomain((await ctx.db.select().from(assessmentSchedules).where(eq(assessmentSchedules.id, input.id)))[0]);
    }),

  previewNextRun: tenantProcedure
    .input(
      z.object({
        scheduleType: z.enum(["one_time", "recurring"]),
        cronExpression: z.string().optional(),
        runAt: z.string().datetime().optional(),
        timezone: z.string().default("UTC")
      })
    )
    .query(async ({ input }) => {
      // Stateless preview: no schedule row is created or read.
      const problems = validateScheduleShape({
        scheduleType: input.scheduleType,
        cronExpression: input.cronExpression || null,
        runAt: input.runAt || null,
        timezone: input.timezone
      });
      const preview = computeNextRun({
        scheduleType: input.scheduleType,
        status: "active",
        cronExpression: input.cronExpression || null,
        runAt: input.runAt || null,
        timezone: input.timezone
      });
      return { ...preview, limitations: [...problems, ...preview.limitations] };
    }),

  getHistory: tenantProcedure
    .input(z.object({ scheduleId: z.string(), limit: z.number().int().min(1).max(100).default(25) }))
    .query(async ({ ctx, input }) => {
      const [schedule] = await ctx.db
        .select()
        .from(assessmentSchedules)
        .where(eq(assessmentSchedules.id, input.scheduleId));
      if (!schedule || schedule.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found." });
      }

      const rows = await ctx.db
        .select({
          execution: scheduleExecutions,
          runStatus: testRuns.status,
          policySnapshotJson: testRuns.policySnapshotJson
        })
        .from(scheduleExecutions)
        .leftJoin(testRuns, eq(scheduleExecutions.runId, testRuns.id))
        .where(eq(scheduleExecutions.scheduleId, input.scheduleId))
        .orderBy(desc(scheduleExecutions.scheduledFor))
        .limit(input.limit);

      return {
        scheduleId: input.scheduleId,
        items: rows.map(r => {
          let policyResult: string | null = null;
          try {
            policyResult = r.policySnapshotJson ? JSON.parse(r.policySnapshotJson)?.result ?? null : null;
          } catch {}
          return {
            id: r.execution.id,
            scheduledFor: r.execution.scheduledFor.toISOString(),
            claimedAt: r.execution.claimedAt ? r.execution.claimedAt.toISOString() : null,
            startedAt: r.execution.startedAt ? r.execution.startedAt.toISOString() : null,
            completedAt: r.execution.completedAt ? r.execution.completedAt.toISOString() : null,
            status: r.execution.status,
            runId: r.execution.runId,
            runStatus: r.runStatus || null,
            policyResult,
            failureCode: r.execution.failureCode,
            failureMessage: r.execution.failureMessage
          };
        })
      };
    })
});
