import assert from "node:assert";
import { test, describe, before } from "node:test";
import { appRouter } from "../routers/index.js";
import { createContext } from "../context.js";
import {
  db,
  organizations,
  projects,
  projectMembers,
  organizationMembers,
  users,
  targets,
  testPlans,
  testRuns,
  assessmentSchedules,
  scheduleExecutions,
  notifications,
  auditEvents
} from "@proofscale/db";
import { eq, and, like } from "drizzle-orm";
import { runPgMigrations, isPostgres } from "@proofscale/db";
import crypto from "node:crypto";
import { KillSwitch, computeNextRun } from "@proofscale/shared";
import {
  claimDueOccurrenceForTest,
  processClaimedOccurrenceForTest
} from "../services/schedulerService.js";

/**
 * Phase 3 integration tests: durable scheduling, idempotency, recovery,
 * authorization, and notification dedup.
 *
 * NOTE: tests run against the project's configured database (SQLite locally;
 * the shared Supabase Postgres in this repo's CI convention) using uniquely
 * prefixed IDs so repeated runs stay isolated. PG migrations are awaited
 * explicitly before seeding because the client's auto-migration is
 * fire-and-forget and can otherwise race the first queries.
 */

const RUN = `p3_${Date.now().toString(36)}`;
const ORG_A = `org_${RUN}_a`;
const ORG_B = `org_${RUN}_b`;
const OWNER_A = `usr_${RUN}_owner`;
const TESTER_A = `usr_${RUN}_tester`;
const OUTSIDER = `usr_${RUN}_outsider`;
const PROJECT_A = `proj_${RUN}_a`;
const PLAN_A = `plan_${RUN}_a`;
const TARGET_A = `target_${RUN}_a`;

function callerFor(userId: string, email: string, orgId?: string, projectId?: string) {
  return appRouter.createCaller(async () =>
    createContext({
      req: {
        headers: {
          "x-user-id": userId,
          "x-user-email": email,
          ...(orgId ? { "x-organization-id": orgId } : {}),
          ...(projectId ? { "x-project-id": projectId } : {})
        }
      } as any,
      res: {} as any
    })
  );
}

async function seedFixtures() {
  const now = new Date();

  // Hygiene: cancel stale ACTIVE schedules left behind by earlier crashed
  // runs of this suite (org ids carry the p3_ prefix). The scheduler claims
  // across all orgs, so a stale due schedule could hijack a claim.
  await db
    .update(assessmentSchedules)
    .set({ status: "cancelled", nextRunAt: null, updatedAt: now })
    .where(
      and(
        eq(assessmentSchedules.status, "active"),
        like(assessmentSchedules.organizationId, "org_p3_%")
      )
    );
  await db.insert(users).values([
    { id: OWNER_A, email: `${RUN}_owner@test.dev`, displayName: "Owner A", role: "admin", onboardingStatus: "completed", createdAt: now, updatedAt: now },
    { id: TESTER_A, email: `${RUN}_tester@test.dev`, displayName: "Tester A", role: "member", onboardingStatus: "completed", createdAt: now, updatedAt: now },
    { id: OUTSIDER, email: `${RUN}_out@test.dev`, displayName: "Outsider", role: "member", onboardingStatus: "completed", createdAt: now, updatedAt: now }
  ]).onConflictDoNothing();

  await db.insert(organizations).values([
    { id: ORG_A, name: `Org A ${RUN}`, slug: `a-${RUN}`, ownerId: OWNER_A, ownerUserId: OWNER_A, status: "active", createdAt: now, updatedAt: now },
    { id: ORG_B, name: `Org B ${RUN}`, slug: `b-${RUN}`, ownerId: OUTSIDER, ownerUserId: OUTSIDER, status: "active", createdAt: now, updatedAt: now }
  ]).onConflictDoNothing();

  await db.insert(organizationMembers).values([
    { id: `mem_${RUN}_1`, organizationId: ORG_A, userId: OWNER_A, userEmail: `${RUN}_owner@test.dev`, role: "owner", status: "active", joinedAt: now, createdAt: now },
    { id: `mem_${RUN}_2`, organizationId: ORG_A, userId: TESTER_A, userEmail: `${RUN}_tester@test.dev`, role: "tester", status: "active", joinedAt: now, createdAt: now },
    { id: `mem_${RUN}_3`, organizationId: ORG_B, userId: OUTSIDER, userEmail: `${RUN}_out@test.dev`, role: "owner", status: "active", joinedAt: now, createdAt: now }
  ]).onConflictDoNothing();

  await db.insert(projects).values({
    id: PROJECT_A, organizationId: ORG_A, ownerUserId: OWNER_A, name: `Proj A ${RUN}`, environment: "staging", status: "active", createdAt: now, updatedAt: now
  }).onConflictDoNothing();

  await db.insert(projectMembers).values([
    { id: `pmem_${RUN}_1`, projectId: PROJECT_A, userId: OWNER_A, role: "owner", status: "active", joinedAt: now, createdAt: now },
    { id: `pmem_${RUN}_2`, projectId: PROJECT_A, userId: TESTER_A, role: "tester", status: "active", joinedAt: now, createdAt: now }
  ]).onConflictDoNothing();

  await db.insert(targets).values({
    id: TARGET_A, projectId: PROJECT_A, baseUrl: "http://localhost:4000", healthUrl: "http://localhost:4000/health",
    environment: "staging", authorizationStatus: "verified", allowedHost: "localhost:4000", createdAt: now, updatedAt: now
  }).onConflictDoNothing();

  await db.insert(testPlans).values({
    id: PLAN_A, projectId: PROJECT_A, name: `Plan A ${RUN}`, version: 1, profile: "smoke",
    scenariosJson: JSON.stringify([{ name: "Health", method: "GET", path: "/health", weight: 1 }]),
    loadProfileJson: JSON.stringify({ virtualUsers: 2, durationSeconds: 30, rampUpSeconds: 2, timeoutMs: 5000 }),
    thresholdsJson: JSON.stringify({ maxP95Ms: 1000, maxP99Ms: 2000, maxErrorRate: 0.01 }),
    scoringVersion: "mvp-1", planStatus: "approved", createdAt: now, updatedAt: now
  }).onConflictDoNothing();
}

const ownerCaller = () => callerFor(OWNER_A, `${RUN}_owner@test.dev`, ORG_A, PROJECT_A);
const testerCaller = () => callerFor(TESTER_A, `${RUN}_tester@test.dev`, ORG_A, PROJECT_A);
const outsiderCaller = () => callerFor(OUTSIDER, `${RUN}_out@test.dev`, ORG_B);

describe("Phase 3: Durable Schedules & Notifications", () => {
  let createdScheduleId: string;

  before(async () => {
    // The DB client's auto-migration is fire-and-forget; make it a hard
    // prerequisite so tests never race schema creation on a fresh database.
    if (isPostgres) await runPgMigrations();
    await seedFixtures();
  });

  describe("Authorization", () => {
    test("owner creates a recurring schedule for an approved plan", async () => {
      const schedule = await ownerCaller().schedules.create({
        projectId: PROJECT_A,
        testPlanId: PLAN_A,
        name: "Nightly readiness",
        scheduleType: "recurring",
        cronExpression: "0 9 * * 1-5",
        timezone: "UTC"
      });
      assert.ok(schedule.id);
      assert.strictEqual(schedule.status, "active");
      assert.strictEqual(schedule.version, 1);
      assert.ok(schedule.nextRunAt, "recurring schedule must have a nextRunAt");
      createdScheduleId = schedule.id;
    });

    test("outsider cannot list another org's project schedules", async () => {
      await assert.rejects(
        async () => outsiderCaller().schedules.list({ projectId: PROJECT_A }),
        (err: any) => err.code === "FORBIDDEN"
      );
    });

    test("outsider cannot create a schedule for another org's project", async () => {
      await assert.rejects(
        async () =>
          outsiderCaller().schedules.create({
            projectId: PROJECT_A,
            testPlanId: PLAN_A,
            name: "Hostile schedule",
            scheduleType: "recurring",
            cronExpression: "0 9 * * *",
            timezone: "UTC"
          } as any),
        (err: any) => ["FORBIDDEN", "NOT_FOUND"].includes(err.code)
      );
    });

    test("tester (no editTestPlans) cannot create, pause, resume, or cancel schedules", async () => {
      await assert.rejects(
        async () =>
          testerCaller().schedules.create({
            projectId: PROJECT_A,
            testPlanId: PLAN_A,
            name: "Tester schedule",
            scheduleType: "recurring",
            cronExpression: "0 9 * * *",
            timezone: "UTC"
          } as any),
        (err: any) => err.code === "FORBIDDEN" && /editTestPlans/.test(err.message)
      );

      await assert.rejects(
        async () => testerCaller().schedules.pause({ id: createdScheduleId }),
        (err: any) => err.code === "FORBIDDEN"
      );
      await assert.rejects(
        async () => testerCaller().schedules.resume({ id: createdScheduleId }),
        (err: any) => err.code === "FORBIDDEN"
      );
      await assert.rejects(
        async () => testerCaller().schedules.cancel({ id: createdScheduleId }),
        (err: any) => err.code === "FORBIDDEN"
      );
    });

    test("guessing a schedule ID from another org reveals nothing (NOT_FOUND, no metadata)", async () => {
      await assert.rejects(
        async () => outsiderCaller().schedules.getById({ id: createdScheduleId }),
        (err: any) => {
          assert.strictEqual(err.code, "NOT_FOUND");
          assert.ok(!/proj|plan|cron/i.test(err.message), "error must not leak metadata");
          return true;
        }
      );
    });

    test("scheduling a non-approved plan is rejected", async () => {
      const draftPlanId = `plan_${RUN}_draft`;
      const now = new Date();
      await db.insert(testPlans).values({
        id: draftPlanId, projectId: PROJECT_A, name: `Draft ${RUN}`, version: 1, profile: "smoke",
        scenariosJson: "[]", loadProfileJson: "{}", thresholdsJson: "{}", scoringVersion: "mvp-1",
        planStatus: "draft", createdAt: now, updatedAt: now
      }).onConflictDoNothing();

      await assert.rejects(
        async () =>
          ownerCaller().schedules.create({
            projectId: PROJECT_A,
            testPlanId: draftPlanId,
            name: "Draft schedule",
            scheduleType: "recurring",
            cronExpression: "0 9 * * *",
            timezone: "UTC"
          } as any),
        (err: any) => err.code === "BAD_REQUEST" && /approved/i.test(err.message)
      );
    });
  });

  describe("Validation and preview", () => {
    test("previewNextRun computes without creating anything", async () => {
      const preview = await ownerCaller().schedules.previewNextRun({
        scheduleType: "recurring",
        cronExpression: "0 9 * * 1-5",
        timezone: "Asia/Kolkata"
      });
      assert.ok(preview.nextRunAtUtc);
      assert.ok(preview.nextRunAtLocal);
      assert.strictEqual(preview.timezone, "Asia/Kolkata");
      assert.match(preview.scheduleDescription, /weekday/);
    });

    test("create rejects invalid cron, invalid timezone, and past runAt", async () => {
      await assert.rejects(
        async () =>
          ownerCaller().schedules.create({
            projectId: PROJECT_A, testPlanId: PLAN_A, name: "bad cron", scheduleType: "recurring",
            cronExpression: "0 9 * *", timezone: "UTC"
          } as any),
        (err: any) => err.code === "BAD_REQUEST"
      );
      await assert.rejects(
        async () =>
          ownerCaller().schedules.create({
            projectId: PROJECT_A, testPlanId: PLAN_A, name: "bad tz", scheduleType: "recurring",
            cronExpression: "0 9 * * *", timezone: "Mars/Base"
          } as any),
        (err: any) => err.code === "BAD_REQUEST"
      );
      await assert.rejects(
        async () =>
          ownerCaller().schedules.create({
            projectId: PROJECT_A, testPlanId: PLAN_A, name: "past run", scheduleType: "one_time",
            runAt: new Date(Date.now() - 3_600_000).toISOString(), timezone: "UTC"
          } as any),
        (err: any) => err.code === "BAD_REQUEST" && /past/i.test(err.message)
      );
    });

    test("version conflict is detected on concurrent edit", async () => {
      const schedule = await ownerCaller().schedules.update({
        id: createdScheduleId,
        version: 1,
        name: "Nightly readiness v2"
      });
      assert.strictEqual(schedule.version, 2);

      // Stale write with the old version must fail.
      await assert.rejects(
        async () => ownerCaller().schedules.update({ id: createdScheduleId, version: 1, name: "stale" }),
        (err: any) => {
          assert.strictEqual(err.code, "CONFLICT");
          assert.match(err.message, /modified by someone else/);
          return true;
        }
      );
    });

    test("invalid or missing test plan is rejected", async () => {
      await assert.rejects(
        async () =>
          ownerCaller().schedules.create({
            projectId: PROJECT_A,
            testPlanId: `plan_missing_${RUN}`,
            name: "ghost",
            scheduleType: "recurring",
            cronExpression: "0 9 * * *",
            timezone: "UTC"
          } as any),
        (err: any) => err.code === "NOT_FOUND"
      );
    });
  });

  describe("Idempotency, claiming, and recovery", () => {
    test("a due occurrence is claimed exactly once; second claim is rejected", async () => {
      // Force the schedule due. NOTE: SQLite timestamps have second
      // granularity, so tests must use distinct WHOLE-SECOND slots (≥30s
      // apart) or occurrence keys collide across tests.
      const past = new Date(Date.now() - 60_000);
      await db.update(assessmentSchedules).set({ nextRunAt: past }).where(eq(assessmentSchedules.id, createdScheduleId));

      const first = await claimDueOccurrenceForTest();
      assert.strictEqual(first.outcome, "claimed");
      assert.strictEqual((first as any).schedule.id, createdScheduleId);

      const second = await claimDueOccurrenceForTest();
      assert.notStrictEqual(second.outcome, "claimed", "second claim for the same occurrence must not win");
    });

    test("two processing attempts create exactly one run (no duplicate load tests)", async () => {
      const [execution] = await db
        .select()
        .from(scheduleExecutions)
        .where(eq(scheduleExecutions.scheduleId, createdScheduleId));
      assert.ok(execution);
      assert.strictEqual(execution.status, "claimed");

      // Process the claimed occurrence (creates the run through the shared trigger).
      await processClaimedOccurrenceForTest(execution.id);

      const [afterFirst] = await db
        .select()
        .from(scheduleExecutions)
        .where(eq(scheduleExecutions.id, execution.id));
      assert.strictEqual(afterFirst.status, "run_created");
      assert.ok(afterFirst.runId);
      const runIdFirst = afterFirst.runId!;

      // Simulate a restart/retry: run processing again on the same occurrence.
      await processClaimedOccurrenceForTest(execution.id);
      const [afterSecond] = await db
        .select()
        .from(scheduleExecutions)
        .where(eq(scheduleExecutions.id, execution.id));

      assert.strictEqual(afterSecond.runId, runIdFirst, "runId must not change on retry");
      const linkedRuns = await db
        .select({ id: testRuns.id })
        .from(testRuns)
        .where(eq(testRuns.scheduleId, createdScheduleId));
      assert.strictEqual(linkedRuns.length, 1, "exactly one run per occurrence");
    });

    test("restart before claim recovers: schedule stays due and gets claimed", async () => {
      // New occurrence: advance nextRunAt into the past, no execution row yet.
      await db
        .update(assessmentSchedules)
        .set({ nextRunAt: new Date(Date.now() - 120_000) })
        .where(eq(assessmentSchedules.id, createdScheduleId));

      const claim = await claimDueOccurrenceForTest();
      assert.strictEqual(claim.outcome, "claimed");
    });

    test("recurring schedule advances to a strictly later occurrence", async () => {
      const [schedule] = await db.select().from(assessmentSchedules).where(eq(assessmentSchedules.id, createdScheduleId));
      const before = schedule.nextRunAt!.getTime();
      const preview = computeNextRun(
        {
          scheduleType: "recurring",
          status: "active",
          cronExpression: schedule.cronExpression,
          timezone: schedule.timezone,
          runCount: schedule.runCount + 1
        },
        before
      );
      assert.ok(preview.nextRunAtUtc);
      assert.ok(new Date(preview.nextRunAtUtc).getTime() > before);
    });

    test("kill switch prevents unsafe scheduled execution (skip, no run)", async () => {
      // Due occurrence while the kill switch is active (-150s: distinct whole
      // second from the -60s and -120s slots used by earlier tests).
      await db.update(assessmentSchedules).set({ nextRunAt: new Date(Date.now() - 150_000) }).where(eq(assessmentSchedules.id, createdScheduleId));
      const claim = await claimDueOccurrenceForTest();
      assert.strictEqual(claim.outcome, "claimed");

      KillSwitch.activate("phase3 test", "test");
      try {
        await processClaimedOccurrenceForTest((claim as any).execution.id);
        const [exec] = await db
          .select()
          .from(scheduleExecutions)
          .where(eq(scheduleExecutions.id, (claim as any).execution.id));
        assert.strictEqual(exec.status, "skipped");
        assert.strictEqual(exec.failureCode, "kill_switch_active");
        assert.strictEqual(exec.runId, null);
      } finally {
        KillSwitch.deactivate();
      }
    });

    test("changed safety limits are revalidated at execution time", async () => {
      // Corrupt the plan envelope to violate current caps; the trigger must refuse.
      await db
        .update(testPlans)
        .set({ loadProfileJson: JSON.stringify({ virtualUsers: 9999, durationSeconds: 30, rampUpSeconds: 2, timeoutMs: 5000 }) })
        .where(eq(testPlans.id, PLAN_A));

      try {
        const past = new Date(Date.now() - 180_000);
        await db.update(assessmentSchedules).set({ nextRunAt: past }).where(eq(assessmentSchedules.id, createdScheduleId));
        const claim = await claimDueOccurrenceForTest();
        assert.strictEqual(claim.outcome, "claimed");
        await processClaimedOccurrenceForTest((claim as any).execution.id);

        const [exec] = await db
          .select()
          .from(scheduleExecutions)
          .where(eq(scheduleExecutions.id, (claim as any).execution.id));
        assert.strictEqual(exec.status, "failed");
        assert.strictEqual(exec.failureCode, "safety_limit_changed");
      } finally {
        // Restore a valid envelope even on failure so later tests are not
        // poisoned by an unsafe plan.
        await db
          .update(testPlans)
          .set({ loadProfileJson: JSON.stringify({ virtualUsers: 2, durationSeconds: 30, rampUpSeconds: 2, timeoutMs: 5000 }) })
          .where(eq(testPlans.id, PLAN_A));
      }
    });
  });

  describe("Lifecycle: pause, resume, cancel, one-time completion", () => {
    test("paused schedule does not produce a claimable next execution; resume recalculates", async () => {
      // The previous safety test marked the schedule invalid (plan envelope
      // exceeded caps). An operator edit that revalidates restores it to
      // active — the documented recovery path for invalid schedules.
      const [invalidRow] = await db
        .select({ version: assessmentSchedules.version })
        .from(assessmentSchedules)
        .where(eq(assessmentSchedules.id, createdScheduleId));
      const recovered = await ownerCaller().schedules.update({
        id: createdScheduleId,
        version: invalidRow.version,
        name: "Nightly readiness (recovered)"
      });
      assert.strictEqual(recovered.status, "active");

      const paused = await ownerCaller().schedules.pause({ id: createdScheduleId });
      assert.strictEqual(paused.status, "paused");

      // Force nextRunAt into the past to simulate a due slot while paused.
      await db.update(assessmentSchedules).set({ nextRunAt: new Date(Date.now() - 60_000) }).where(eq(assessmentSchedules.id, createdScheduleId));
      const claim = await claimDueOccurrenceForTest();
      assert.strictEqual(claim.outcome, "none", "paused schedules must never be claimed");

      const resumed = await ownerCaller().schedules.resume({ id: createdScheduleId });
      assert.strictEqual(resumed.status, "active");
      assert.ok(resumed.nextRunAt, "resume must calculate a new next run");
    });

    test("cancelled schedule cannot execute again", async () => {
      const cancelled = await ownerCaller().schedules.cancel({ id: createdScheduleId });
      assert.strictEqual(cancelled.status, "cancelled");
      assert.strictEqual(cancelled.nextRunAt, null);

      await db.update(assessmentSchedules).set({ nextRunAt: new Date(Date.now() - 60_000) }).where(eq(assessmentSchedules.id, createdScheduleId));
      const claim = await claimDueOccurrenceForTest();
      assert.strictEqual(claim.outcome, "none");
    });

    test("one-time schedule becomes completed after successful run creation", async () => {
      const oneTime = await ownerCaller().schedules.create({
        projectId: PROJECT_A,
        testPlanId: PLAN_A,
        name: "One-shot validation",
        scheduleType: "one_time",
        runAt: new Date(Date.now() + 5_000).toISOString(),
        timezone: "UTC"
      });
      const due = new Date(Date.now() - 5_000);
      await db.update(assessmentSchedules).set({ nextRunAt: due }).where(eq(assessmentSchedules.id, oneTime.id));

      const claim = await claimDueOccurrenceForTest();
      assert.strictEqual(claim.outcome, "claimed");
      await processClaimedOccurrenceForTest((claim as any).execution.id);

      const [row] = await db.select().from(assessmentSchedules).where(eq(assessmentSchedules.id, oneTime.id));
      assert.strictEqual(row.status, "completed");
      assert.strictEqual(row.runCount, 1);
      assert.strictEqual(row.nextRunAt, null);
    });

    test("schedule history links occurrences to runs with policy results", async () => {
      const history = await ownerCaller().schedules.getHistory({ scheduleId: createdScheduleId });
      assert.ok(history.items.length >= 1);
      const withRun = history.items.find(i => i.runId);
      assert.ok(withRun, "at least one occurrence should link to a run");
      assert.ok(["queued", "starting", "running", "completed"].includes(withRun!.runStatus || ""));
    });
  });

  describe("Notifications", () => {
    test("duplicate event processing does not duplicate notifications", async () => {
      const { notifyRunTerminal } = await import("../services/notifications/ReadinessNotificationService.js");

      // Create a completed run for the plan (durable truth first).
      const runId = `run_${RUN}_n1`;
      const now = new Date();
      await db.insert(testRuns).values({
        id: runId, planId: PLAN_A, targetId: TARGET_A, status: "completed",
        requestedByUserId: OWNER_A, score: 55, readinessLabel: "Needs investigation",
        summaryMetricsJson: JSON.stringify({ totalRequests: 10, successfulRequests: 9, failedRequests: 1, throughputRps: 1, p50Ms: 1, p95Ms: 2, p99Ms: 3, errorRate: 0.1, statusCodes: {}, timeouts: 0 }),
        policySnapshotJson: JSON.stringify({ result: "fail", policyVersion: 3 }),
        triggerSource: "schedule", scheduleId: createdScheduleId,
        createdAt: now, updatedAt: now
      }).onConflictDoNothing();

      const first = await notifyRunTerminal({ runId, terminalState: "completed", policyResult: "fail", policyVersion: 3 });
      const second = await notifyRunTerminal({ runId, terminalState: "completed", policyResult: "fail", policyVersion: 3 });

      const rows = await db
        .select({ id: notifications.id, dedupKey: notifications.dedupKey })
        .from(notifications)
        .where(and(eq(notifications.runId, runId), eq(notifications.eventType, "policy.failed")));
      const ownerRows = rows.filter(r => r.dedupKey?.startsWith(`${OWNER_A}:`));
      assert.strictEqual(ownerRows.length, 1, `expected exactly 1 notification for owner, got ${ownerRows.length}`);
      assert.ok(first.created >= 1);
      assert.strictEqual(second.created, 0, "duplicate processing must create zero new notifications");
    });

    test("notifications respect per-user rules (disabled event type → no new notification)", async () => {
      const { notifyRunTerminal } = await import("../services/notifications/ReadinessNotificationService.js");

      await ownerCaller().notificationRules.createOrUpdate({
        organizationId: ORG_A,
        eventType: "run.completed",
        enabled: false
      } as any);

      const runId = `run_${RUN}_n2`;
      const now = new Date();
      await db.insert(testRuns).values({
        id: runId, planId: PLAN_A, targetId: TARGET_A, status: "completed",
        requestedByUserId: OWNER_A, score: 95, readinessLabel: "Ready",
        summaryMetricsJson: JSON.stringify({ totalRequests: 10, successfulRequests: 10, failedRequests: 0, throughputRps: 1, p50Ms: 1, p95Ms: 2, p99Ms: 3, errorRate: 0, statusCodes: {}, timeouts: 0 }),
        policySnapshotJson: null,
        triggerSource: "manual",
        createdAt: now, updatedAt: now
      }).onConflictDoNothing();

      await notifyRunTerminal({ runId, terminalState: "completed", policyResult: null, policyVersion: null });

      const rows = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(and(eq(notifications.runId, runId), eq(notifications.userId, OWNER_A)));
      assert.strictEqual(rows.length, 0, "disabled run.completed rule must suppress notifications");

      // Restore default (delete the rule).
      const [rule] = await db
        .select()
        .from((await import("@proofscale/db")).notificationRules)
        .where(and(eq((await import("@proofscale/db")).notificationRules.userId, OWNER_A), eq((await import("@proofscale/db")).notificationRules.eventType, "run.completed")));
      if (rule) {
        await ownerCaller().notificationRules.delete({ id: rule.id } as any);
      }
    });

    test("markRead marks a notification and audit records rule changes", async () => {
      const list = await ownerCaller().notifications.list({ orgId: ORG_A });
      const unread = list.items.find(i => !i.isRead);
      if (unread) {
        await ownerCaller().notifications.markRead({ id: unread.id });
        const [after] = await db.select().from(notifications).where(eq(notifications.id, unread.id));
        assert.strictEqual(after.isRead, true);
      }

      const ruleAudits = await db
        .select({ id: auditEvents.id })
        .from(auditEvents)
        .where(eq(auditEvents.action, "notification_rule.changed"));
      assert.ok(ruleAudits.length >= 1, "rule changes must be audited");
    });
  });

  describe("Audit trail", () => {
    test("schedule mutations are audited", async () => {
      const actions = await db
        .select({ action: auditEvents.action, subject: auditEvents.subject })
        .from(auditEvents);
      const subjects = new Set(actions.filter(a => a.subject === createdScheduleId).map(a => a.action));
      for (const expected of ["schedule.created", "schedule.updated", "schedule.paused", "schedule.resumed", "schedule.cancelled"]) {
        assert.ok(subjects.has(expected), `missing audit action: ${expected}`);
      }
      const claimed = actions.filter(a => a.action === "schedule.occurrence_claimed" && a.subject.startsWith(createdScheduleId));
      assert.ok(claimed.length >= 1, "occurrence claims must be audited");
    });
  });
});
