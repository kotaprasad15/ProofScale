import { SCHEDULING_POLICY, NextRunPreview, ScheduleStatus, ScheduleType } from "./types.js";
import { isValidTimezone } from "./types.js";

/**
 * Pure schedule-time engine: cron + timezone → next occurrence.
 *
 * - All computation is UTC-based; timestamps are stored/returned as UTC ISO.
 * - The user-selected timezone is stored separately and is used only to
 *   interpret cron wall-clock fields (DST handled automatically via Intl).
 * - No I/O and no external cron dependency: the supported 5-field subset
 *   (minute hour dom month dow with * , - / lists) is parsed here and covered
 *   by unit tests including DST transitions.
 */

export interface ScheduleShape {
  scheduleType: ScheduleType;
  status: ScheduleStatus;
  cronExpression?: string | null;
  runAt?: string | Date | null;
  timezone: string;
  maxRuns?: number | null;
  runCount?: number;
  lastRunAt?: string | Date | null;
}

// ---------------------------------------------------------------------------
// Cron field parsing
// ---------------------------------------------------------------------------

interface CronFields {
  minute: Set<number>;
  hour: Set<number>;
  dom: Set<number> | null; // null = '*'
  month: Set<number>;
  dow: Set<number> | null; // null = '*'
}

function parseField(field: string, min: number, max: number): Set<number> | "invalid" {
  const values = new Set<number>();
  for (const part of field.split(",")) {
    if (part === "*") {
      for (let i = min; i <= max; i++) values.add(i);
      continue;
    }
    const stepMatch = part.match(/^\*\/(\d+)$/);
    if (stepMatch) {
      const step = parseInt(stepMatch[1], 10);
      if (step < 1) return "invalid";
      for (let i = min; i <= max; i += step) values.add(i);
      continue;
    }
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const a = parseInt(rangeMatch[1], 10);
      const b = parseInt(rangeMatch[2], 10);
      if (a < min || b > max || a > b) return "invalid";
      for (let i = a; i <= b; i++) values.add(i);
      continue;
    }
    if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10);
      if (n < min || n > max) return "invalid";
      values.add(n);
      continue;
    }
    return "invalid";
  }
  return values;
}

/** Parses a 5-field cron expression; returns null when syntactically invalid. */
export function parseCron(expression: string): CronFields | null {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return null;
  const minute = parseField(fields[0], 0, 59);
  const hour = parseField(fields[1], 0, 23);
  const dom = parseField(fields[2], 1, 31);
  const month = parseField(fields[3], 1, 12);
  const dow = parseField(fields[4], 0, 6);
  if (
    minute === "invalid" ||
    hour === "invalid" ||
    dom === "invalid" ||
    month === "invalid" ||
    dow === "invalid"
  ) {
    return null;
  }
  return {
    minute,
    hour,
    dom: fields[2] === "*" ? null : dom,
    month,
    dow: fields[4] === "*" ? null : dow
  };
}

// ---------------------------------------------------------------------------
// Timezone helpers (Intl-based, no external deps)
// ---------------------------------------------------------------------------

/** Returns wall-clock parts for an instant in the given IANA timezone. */
export function zonedParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0=Sun..6=Sat
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short"
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value]));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    // Some runtimes render midnight as "24"; normalize.
    hour: parseInt(parts.hour, 10) % 24,
    minute: parseInt(parts.minute, 10),
    weekday: weekdays.indexOf(parts.weekday)
  };
}

/** Formats an instant as "YYYY-MM-DD HH:mm" wall-clock in a timezone. */
export function formatZoned(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * Renders a cron expression in plain language, e.g.
 * "every weekday at 09:00".
 */
export function describeCron(expression: string): string {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return expression;
  const [minute, hour, dom, month, dow] = fields;

  const time =
    hour !== "*" && minute !== "*"
      ? `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`
      : null;

  let frequency = "every day";
  if (dow === "1-5") frequency = "every weekday";
  else if (dow === "0,6") frequency = "every weekend day";
  else if (dow !== "*") frequency = `on selected weekdays (cron dow=${dow})`;
  else if (dom !== "*") frequency = `on day ${dom} of the month`;
  else if (month !== "*") frequency = `in month ${month}`;

  if (/^\*\/\d+$/.test(hour)) {
    return `every ${hour.slice(2)} hours`;
  }
  if (hour === "*" && minute !== "*") {
    return `hourly at :${minute.padStart(2, "0")}`;
  }
  return time ? `${frequency} at ${time}` : `${frequency} (cron: ${expression})`;
}

// ---------------------------------------------------------------------------
// Next-occurrence computation
// ---------------------------------------------------------------------------

/**
 * Computes the next occurrence strictly after `afterMs` for a recurring cron
 * schedule interpreted in `timezone`. Iterates minute-by-minute bounded by a
 * 366-day scan (matching cron semantics without external libraries).
 */
export function nextCronOccurrence(
  expression: string,
  timezone: string,
  afterMs: number
): Date | null {
  const cron = parseCron(expression);
  if (!cron || !isValidTimezone(timezone)) return null;

  // Start at the next whole minute after `afterMs`.
  const cursor = new Date(Math.floor(afterMs / 60_000) * 60_000 + 60_000);
  const horizon = afterMs + 366 * 24 * 60 * 60 * 1000;

  while (cursor.getTime() <= horizon) {
    const p = zonedParts(cursor, timezone);
    if (
      cron.minute.has(p.minute) &&
      cron.hour.has(p.hour) &&
      cron.month.has(p.month) &&
      (cron.dom === null || cron.dom.has(p.day)) &&
      (cron.dow === null || cron.dow.has(p.weekday))
    ) {
      return new Date(cursor.getTime());
    }
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }
  return null;
}

/**
 * Validates a schedule shape against the product scheduling policy.
 * Returns a list of human-readable problems; empty means valid.
 */
export function validateScheduleShape(
  schedule: Pick<ScheduleShape, "scheduleType" | "cronExpression" | "runAt" | "timezone">,
  nowMs: number = Date.now()
): string[] {
  const problems: string[] = [];

  if (!isValidTimezone(schedule.timezone)) {
    problems.push(`Unknown timezone '${schedule.timezone}'.`);
  }

  if (schedule.scheduleType === "recurring") {
    if (!schedule.cronExpression) {
      problems.push("Recurring schedules require a cron expression.");
    } else {
      const fields = schedule.cronExpression.trim().split(/\s+/);
      if (fields.length !== 5 || parseCron(schedule.cronExpression) === null) {
        problems.push("Invalid cron expression.");
      } else {
        // Frequency safety: the tightest supported cadence is hourly.
        const minuteField = fields[0];
        const hourField = fields[1];
        const subHourly =
          hourField === "*" ||
          /^\*\/\d+$/.test(hourField) && parseInt(hourField.slice(2), 10) < 1;
        if (subHourly && minuteField !== "0") {
          problems.push(
            `Recurring schedules may not run more often than every ${SCHEDULING_POLICY.MIN_RECURRENCE_MINUTES} minutes.`
          );
        }
      }
    }
  }

  if (schedule.scheduleType === "one_time") {
    if (!schedule.runAt) {
      problems.push("One-time schedules require a run time.");
    } else {
      const t = new Date(schedule.runAt as any).getTime();
      if (Number.isNaN(t)) {
        problems.push("runAt is not a parseable date.");
      } else if (t < nowMs - SCHEDULING_POLICY.ONE_TIME_PAST_GRACE_MINUTES * 60_000) {
        problems.push("runAt is too far in the past.");
      } else if (t > nowMs + SCHEDULING_POLICY.MAX_FUTURE_DAYS * 24 * 60 * 60 * 1000) {
        problems.push("runAt is too far in the future.");
      }
    }
  }

  return problems;
}

/**
 * Computes the next run for a full schedule shape, honoring status and run
 * budget. Pure: no DB access, fully unit-testable.
 */
export function computeNextRun(schedule: ScheduleShape, nowMs: number = Date.now()): NextRunPreview {
  const tz = schedule.timezone || "UTC";
  const limitations: string[] = [];
  const describe = (): string => {
    if (schedule.scheduleType === "recurring" && schedule.cronExpression) {
      return describeCron(schedule.cronExpression);
    }
    if (schedule.scheduleType === "one_time" && schedule.runAt) {
      return `one-time run at ${formatZoned(new Date(schedule.runAt as any), tz)} (${tz})`;
    }
    return "unscheduled";
  };

  if (schedule.status === "paused") {
    limitations.push("Schedule is paused; occurrences are not claimed until resumed.");
  }
  if (schedule.status === "cancelled") {
    limitations.push("Schedule is cancelled and cannot execute again.");
  }
  if (schedule.status === "completed") {
    limitations.push("One-time schedule already completed.");
  }
  if (schedule.status === "invalid") {
    limitations.push("Schedule is invalid and cannot execute.");
  }
  if (
    schedule.maxRuns != null &&
    (schedule.runCount ?? 0) >= schedule.maxRuns
  ) {
    limitations.push(`Run budget exhausted (${schedule.runCount}/${schedule.maxRuns}).`);
  }

  if (limitations.length > 0) {
    return {
      nextRunAtUtc: null,
      nextRunAtLocal: null,
      timezone: tz,
      scheduleDescription: describe(),
      limitations
    };
  }

  if (schedule.scheduleType === "one_time") {
    if (!schedule.runAt) {
      return {
        nextRunAtUtc: null,
        nextRunAtLocal: null,
        timezone: tz,
        scheduleDescription: describe(),
        limitations: ["One-time schedule is missing its run time."]
      };
    }
    const t = new Date(schedule.runAt as any);
    if (t.getTime() < nowMs - SCHEDULING_POLICY.ONE_TIME_PAST_GRACE_MINUTES * 60_000) {
      return {
        nextRunAtUtc: null,
        nextRunAtLocal: null,
        timezone: tz,
        scheduleDescription: describe(),
        limitations: ["Scheduled time has passed."]
      };
    }
    return {
      nextRunAtUtc: t.toISOString(),
      nextRunAtLocal: formatZoned(t, tz),
      timezone: tz,
      scheduleDescription: describe(),
      limitations
    };
  }

  // Recurring
  if (!schedule.cronExpression) {
    return {
      nextRunAtUtc: null,
      nextRunAtLocal: null,
      timezone: tz,
      scheduleDescription: describe(),
      limitations: ["Recurring schedule is missing its cron expression."]
    };
  }
  const next = nextCronOccurrence(schedule.cronExpression, tz, nowMs);
  if (!next) {
    return {
      nextRunAtUtc: null,
      nextRunAtLocal: null,
      timezone: tz,
      scheduleDescription: describe(),
      limitations: ["No future occurrence found within the supported horizon."]
    };
  }
  return {
    nextRunAtUtc: next.toISOString(),
    nextRunAtLocal: formatZoned(next, tz),
    timezone: tz,
    scheduleDescription: describe(),
    limitations
  };
}

/** Builds the plain-language summary used in the UI confirmation step. */
export function buildScheduleSummary(params: {
  planName: string;
  scheduleType: ScheduleType;
  cronExpression?: string | null;
  runAt?: string | null;
  timezone: string;
}): string {
  const { planName, scheduleType, cronExpression, runAt, timezone } = params;
  if (scheduleType === "recurring" && cronExpression) {
    return `Run the ${planName} assessment ${describeCron(cronExpression)} (${timezone}).`;
  }
  if (scheduleType === "one_time" && runAt) {
    return `Run the ${planName} assessment once at ${formatZoned(new Date(runAt), timezone)} (${timezone}).`;
  }
  return `Run the ${planName} assessment.`;
}
