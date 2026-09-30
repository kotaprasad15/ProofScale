import { TestPlan } from "./types.js";

/**
 * Redaction helpers: logs must never contain authorization tokens, cookies,
 * API keys, or sensitive request bodies.
 */

const REDACTED_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "proxy-authorization",
  "x-api-key",
  "x-auth-token",
  "x-access-token",
  "x-session-token"
]);

const SENSITIVE_BODY_KEYS = /password|secret|token|api[-_]?key|authorization|credential|card|ssn/i;

export function redactHeaderValue(name: string, value: string): string {
  return REDACTED_HEADER_NAMES.has(name.toLowerCase()) ? "[REDACTED]" : value;
}

/** Redacts an in-memory headers record (never logged raw). */
export function redactHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
  if (!headers) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = redactHeaderValue(k, v);
  }
  return out;
}

/** Produces a log-safe, redacted summary of a test plan. */
export function redactPlanForLogging(plan: TestPlan): Record<string, unknown> {
  return {
    id: plan.id,
    name: plan.name,
    projectId: plan.projectId,
    environment: plan.environment,
    targetBaseUrl: plan.targetBaseUrl,
    virtualUsers: plan.virtualUsers,
    durationSeconds: plan.durationSeconds,
    maxRequestsPerSecond: plan.maxRequestsPerSecond,
    requestCount: plan.requests.length,
    requests: plan.requests.map(r => ({
      id: r.id,
      name: r.name,
      method: r.method,
      path: r.path,
      enabled: r.enabled,
      hasBody: r.body !== undefined && r.body !== null,
      headers: redactHeaders(r.headers)
    }))
  };
}

/** Removes sensitive keys from an arbitrary JSON body before logging. */
export function redactBodyForLogging(body: unknown): unknown {
  if (body === null || body === undefined) return body;
  if (typeof body !== "object") return "[omitted]";
  if (Array.isArray(body)) return `[array of ${body.length} items]`;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    out[k] = SENSITIVE_BODY_KEYS.test(k) ? "[REDACTED]" : typeof v === "object" && v !== null ? "[object]" : v;
  }
  return out;
}
