import assert from "node:assert";
import { test, describe } from "node:test";
import {
  parseCron,
  nextCronOccurrence,
  computeNextRun,
  validateScheduleShape,
  describeCron,
  buildScheduleSummary,
  isValidTimezone,
  formatZoned,
  zonedParts,
  SCHEDULING_POLICY
} from "../index.js";

/** Fixed "now": 2026-03-05 10:30:15 UTC (a Thursday). */
const NOW = Date.UTC(2026, 2, 5, 10, 30, 15);

describe("Cron parsing", () => {
  test("accepts valid expressions", () => {
    assert.ok(parseCron("0 9 * * *"));
    assert.ok(parseCron("*/15 * * * *"));
    assert.ok(parseCron("0 9 * * 1-5"));
    assert.ok(parseCron("30 8 1,15 * *"));
    assert.ok(parseCron("0 */6 * * *"));
  });

  test("rejects invalid expressions", () => {
    assert.strictEqual(parseCron("0 9 * *"), null); // 4 fields
    assert.strictEqual(parseCron("0 9 * * * *"), null); // 6 fields
    assert.strictEqual(parseCron("60 9 * * *"), null); // minute out of range
    assert.strictEqual(parseCron("0 24 * * *"), null); // hour out of range
    assert.strictEqual(parseCron("0 9 32 * *"), null); // dom out of range
    assert.strictEqual(parseCron("0 9 * 13 *"), null); // month out of range
    assert.strictEqual(parseCron("0 9 * * 7"), null); // dow out of range
    assert.strictEqual(parseCron("abc 9 * * *"), null);
    assert.strictEqual(parseCron("0 9 5-2 * *"), null); // inverted range
  });
});

describe("Next-run calculation across timezones", () => {
  test("computes next occurrence in UTC", () => {
    // Daily at 09:00 UTC. Now is 10:30 UTC → next is tomorrow 09:00 UTC.
    const next = nextCronOccurrence("0 9 * * *", "UTC", NOW)!;
    assert.strictEqual(next.toISOString(), "2026-03-06T09:00:00.000Z");
  });

  test("computes next occurrence in a positive-offset timezone (Asia/Kolkata, +05:30)", () => {
    // Daily at 09:00 Kolkata = 03:30 UTC. Now is 10:30 UTC (16:00 IST) →
    // next is tomorrow 09:00 IST = 2026-03-06T03:30:00Z.
    const next = nextCronOccurrence("0 9 * * *", "Asia/Kolkata", NOW)!;
    assert.strictEqual(next.toISOString(), "2026-03-06T03:30:00.000Z");
  });

  test("computes next occurrence in a negative-offset timezone (America/New_York)", () => {
    // 2026-03-05 is EST (UTC-5): daily 09:00 New York = 14:00 UTC.
    // Now is 10:30 UTC = 05:30 EST → today 09:00 EST is still ahead.
    const next = nextCronOccurrence("0 9 * * *", "America/New_York", NOW)!;
    assert.strictEqual(next.toISOString(), "2026-03-05T14:00:00.000Z");
  });

  test("handles US daylight-saving transition (spring forward 2026-03-08)", () => {
    // Daily 09:00 New York. On 2026-03-07 (EST) 09:00 = 14:00 UTC;
    // after the 2026-03-08 spring-forward (EDT) 09:00 = 13:00 UTC.
    const before = nextCronOccurrence("0 9 * * *", "America/New_York", Date.UTC(2026, 2, 6, 20, 0, 0))!;
    assert.strictEqual(before.toISOString(), "2026-03-07T14:00:00.000Z");

    const after = nextCronOccurrence("0 9 * * *", "America/New_York", Date.UTC(2026, 2, 7, 20, 0, 0))!;
    assert.strictEqual(after.toISOString(), "2026-03-08T13:00:00.000Z");
  });

  test("skips a nonexistent local time during spring-forward (Australia/Lord_Howe)", () => {
    // Lord Howe springs forward 2026-10-04 02:00→02:30 (+10:30→+11:00).
    // Daily at 02:00 local: on the transition day 02:00 local does not exist;
    // the engine must land on the closest valid instant (02:30 local) or the
    // next day, but never an invalid/ambiguous duplicate.
    const next = nextCronOccurrence("0 2 * * *", "Australia/Lord_Howe", Date.UTC(2026, 9, 3, 12, 0, 0))!;
    const parts = zonedParts(next, "Australia/Lord_Howe");
    // Must be hour 2 on Oct 4 local (adjusted instant) or hour 2 on Oct 5.
    const okDay =
      (parts.day === 4 || parts.day === 5) && parts.month === 10 && parts.hour === 2;
    assert.ok(okDay, `unexpected transition landing: ${next.toISOString()} ${JSON.stringify(parts)}`);
  });

  test("rejects invalid timezone and invalid cron", () => {
    assert.strictEqual(nextCronOccurrence("0 9 * * *", "Not/AZone", NOW), null);
    assert.strictEqual(nextCronOccurrence("bad cron expr", "UTC", NOW), null);
    assert.strictEqual(isValidTimezone("UTC"), true);
    assert.strictEqual(isValidTimezone("Asia/Kolkata"), true);
    assert.strictEqual(isValidTimezone("Mars/Olympus"), false);
  });

  test("respects day-of-week filters (weekdays only)", () => {
    // 2026-03-05 is Thursday; 2026-03-06 Friday; 2026-03-07 Saturday (skipped);
    // 2026-03-08 Sunday (skipped) → next after Friday 09:00 UTC is Monday.
    const next = nextCronOccurrence("0 9 * * 1-5", "UTC", Date.UTC(2026, 2, 6, 10, 0, 0))!;
    assert.strictEqual(next.toISOString(), "2026-03-09T09:00:00.000Z");
  });
});

describe("Schedule validation policy", () => {
  test("accepts a valid one-time schedule in the future", () => {
    const problems = validateScheduleShape(
      { scheduleType: "one_time", runAt: new Date(NOW + 3_600_000).toISOString(), timezone: "UTC" },
      NOW
    );
    assert.deepStrictEqual(problems, []);
  });

  test("rejects a past one-time schedule beyond the grace window", () => {
    const problems = validateScheduleShape(
      { scheduleType: "one_time", runAt: new Date(NOW - 2 * 3_600_000).toISOString(), timezone: "UTC" },
      NOW
    );
    assert.ok(problems.some(p => /past/.test(p)));
  });

  test("tolerates a one-time schedule within the past grace window", () => {
    const problems = validateScheduleShape(
      {
        scheduleType: "one_time",
        runAt: new Date(NOW - SCHEDULING_POLICY.ONE_TIME_PAST_GRACE_MINUTES * 60_000 + 60_000).toISOString(),
        timezone: "UTC"
      },
      NOW
    );
    assert.deepStrictEqual(problems, []);
  });

  test("rejects invalid cron and invalid timezone", () => {
    const badCron = validateScheduleShape(
      { scheduleType: "recurring", cronExpression: "0 9 * *", timezone: "UTC" },
      NOW
    );
    assert.ok(badCron.some(p => /cron/i.test(p)));

    const badTz = validateScheduleShape(
      { scheduleType: "recurring", cronExpression: "0 9 * * *", timezone: "Nowhere/Nothing" },
      NOW
    );
    assert.ok(badTz.some(p => /timezone/i.test(p)));
  });

  test("rejects unsupported high-frequency (per-minute / sub-hourly) schedules", () => {
    const perMinute = validateScheduleShape(
      { scheduleType: "recurring", cronExpression: "* * * * *", timezone: "UTC" },
      NOW
    );
    assert.ok(perMinute.some(p => /may not run more often/i.test(p)), "per-minute must be rejected");

    const every5Min = validateScheduleShape(
      { scheduleType: "recurring", cronExpression: "*/5 * * * *", timezone: "UTC" },
      NOW
    );
    assert.ok(every5Min.some(p => /may not run more often/i.test(p)), "every-5-min must be rejected");

    // Hourly is the floor and must be accepted.
    const hourly = validateScheduleShape(
      { scheduleType: "recurring", cronExpression: "0 * * * *", timezone: "UTC" },
      NOW
    );
    assert.deepStrictEqual(hourly, []);
  });

  test("rejects unparsable runAt", () => {
    const problems = validateScheduleShape(
      { scheduleType: "one_time", runAt: "not-a-date", timezone: "UTC" },
      NOW
    );
    assert.ok(problems.some(p => /parseable/i.test(p)));
  });
});

describe("computeNextRun status handling", () => {
  const base = {
    scheduleType: "recurring" as const,
    cronExpression: "0 9 * * *",
    timezone: "UTC"
  };

  test("paused schedules produce no next execution", () => {
    const preview = computeNextRun({ ...base, status: "paused" }, NOW);
    assert.strictEqual(preview.nextRunAtUtc, null);
    assert.ok(preview.limitations.some(l => /paused/i.test(l)));
  });

  test("cancelled schedules produce no next execution", () => {
    const preview = computeNextRun({ ...base, status: "cancelled" }, NOW);
    assert.strictEqual(preview.nextRunAtUtc, null);
    assert.ok(preview.limitations.some(l => /cancelled/i.test(l)));
  });

  test("completed one-time schedules produce no next execution", () => {
    const preview = computeNextRun(
      { scheduleType: "one_time", status: "completed", runAt: new Date(NOW - 1000).toISOString(), timezone: "UTC" },
      NOW
    );
    assert.strictEqual(preview.nextRunAtUtc, null);
    assert.ok(preview.limitations.some(l => /completed/i.test(l)));
  });

  test("exhausted run budget produces no next execution", () => {
    const preview = computeNextRun({ ...base, status: "active", maxRuns: 3, runCount: 3 }, NOW);
    assert.strictEqual(preview.nextRunAtUtc, null);
    assert.ok(preview.limitations.some(l => /budget/i.test(l)));
  });

  test("active recurring schedule advances to the next occurrence", () => {
    const preview = computeNextRun({ ...base, status: "active", runCount: 1 }, NOW);
    assert.strictEqual(preview.nextRunAtUtc, "2026-03-06T09:00:00.000Z");
    assert.strictEqual(preview.nextRunAtLocal, "2026-03-06 09:00");
    assert.deepStrictEqual(preview.limitations, []);
  });

  test("active one-time schedule surfaces its exact instant", () => {
    const at = new Date(NOW + 7_200_000).toISOString();
    const preview = computeNextRun(
      { scheduleType: "one_time", status: "active", runAt: at, timezone: "Asia/Tokyo" },
      NOW
    );
    assert.strictEqual(preview.nextRunAtUtc, at);
    assert.strictEqual(preview.timezone, "Asia/Tokyo");
    // 2026-03-05T12:30Z = 21:30 Tokyo.
    assert.strictEqual(preview.nextRunAtLocal, "2026-03-05 21:30");
  });

  test("elapsed one-time schedule reports its limitation", () => {
    const preview = computeNextRun(
      { scheduleType: "one_time", status: "active", runAt: new Date(NOW - 3_600_000).toISOString(), timezone: "UTC" },
      NOW
    );
    assert.strictEqual(preview.nextRunAtUtc, null);
    assert.ok(preview.limitations.some(l => /passed/i.test(l)));
  });
});

describe("Plain-language summaries", () => {
  test("describeCron renders weekday schedules", () => {
    assert.strictEqual(describeCron("0 9 * * 1-5"), "every weekday at 09:00");
    assert.strictEqual(describeCron("0 9 * * *"), "every day at 09:00");
  });

  test("buildScheduleSummary mentions plan, cadence, and timezone", () => {
    const summary = buildScheduleSummary({
      planName: "Staging Checkout Assessment",
      scheduleType: "recurring",
      cronExpression: "0 9 * * 1-5",
      timezone: "Asia/Kolkata"
    });
    assert.match(summary, /Staging Checkout Assessment/);
    assert.match(summary, /every weekday at 09:00/);
    assert.match(summary, /Asia\/Kolkata/);
  });
});

describe("Zod schema validation", () => {
  test("CronExpressionSchema rejects bad crons and accepts good ones", async () => {
    const { CronExpressionSchema, CreateScheduleSchema } = await import("../index.js");
    assert.strictEqual(CronExpressionSchema.safeParse("0 9 * * 1-5").success, true);
    assert.strictEqual(CronExpressionSchema.safeParse("99 9 * * *").success, false);
    assert.strictEqual(CronExpressionSchema.safeParse("0 9 * *").success, false);

    const oneTime = CreateScheduleSchema.safeParse({
      projectId: "p1",
      testPlanId: "t1",
      name: "One shot",
      scheduleType: "one_time",
      runAt: new Date(NOW + 1000).toISOString(),
      timezone: "UTC"
    });
    assert.strictEqual(oneTime.success, true);

    const recurringNoCron = CreateScheduleSchema.safeParse({
      projectId: "p1",
      testPlanId: "t1",
      name: "Broken",
      scheduleType: "recurring",
      timezone: "UTC"
    });
    assert.strictEqual(recurringNoCron.success, false);

    const badTz = CreateScheduleSchema.safeParse({
      projectId: "p1",
      testPlanId: "t1",
      name: "Bad tz",
      scheduleType: "recurring",
      cronExpression: "0 9 * * *",
      timezone: "Invalid/Zone"
    });
    assert.strictEqual(badTz.success, false);
  });
});
