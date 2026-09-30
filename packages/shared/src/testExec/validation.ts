import { TestPlan, TestRequest } from "./types.js";
import { TEST_EXEC_LIMITS, LOCAL_DEV_HOSTNAMES } from "./limits.js";
import { isBlockedIP, isIPv4, isIPv6 } from "../safety/ipGuard.js";

/**
 * Pure validation for server-side test plans.
 *
 * Runs in the API (before queueing) and again in the worker (defense in
 * depth). Never performs I/O; DNS/network checks happen separately at run
 * start so validation stays unit-testable.
 */

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface PlanValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const UNSAFE_HEADER_NAMES = new Set([
  // Hop-by-hop & transport controlled
  "host",
  "content-length",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-connection",
  "proxy-authorization",
  "proxy-authenticate",
  "te",
  "trailer",
  // Sensitive / forbidden to set via test plans
  "authorization",
  "cookie",
  "set-cookie"
]);

/** Header value content that suggests embedded secrets or injection. */
const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /^bearer\s+/i,
  /^basic\s+/i,
  /^token\s+/i,
  /sk-[a-z0-9]{8,}/i,
  /ghp_[a-z0-9]{20,}/i,
  /^\s*[\w-]*secret[\w-]*\s*[:=]/i
];

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

function isLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return LOCAL_DEV_HOSTNAMES.has(h) || h === "::1" || h === "[::1]";
}

function isPrivateOrReservedIpLiteral(hostname: string): boolean {
  if (isIPv4(hostname) || isIPv6(hostname)) {
    return isBlockedIP(hostname, false);
  }
  return false;
}

/** Validates a single request definition (path/query/headers/body). */
export function validateTestRequest(req: TestRequest, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const label = `requests[${index}]`;

  if (!req.name || typeof req.name !== "string") issues.push({ field: `${label}.name`, message: "Request name is required." });
  if (!req.id || typeof req.id !== "string") issues.push({ field: `${label}.id`, message: "Request id is required." });

  if (typeof req.path !== "string" || req.path.length === 0) {
    issues.push({ field: `${label}.path`, message: "Request path is required." });
  } else if (!req.path.startsWith("/")) {
    issues.push({ field: `${label}.path`, message: `Path must start with '/'. Got '${req.path.slice(0, 40)}'.` });
  } else if (CONTROL_CHARS.test(req.path)) {
    issues.push({ field: `${label}.path`, message: "Path contains control characters." });
  } else if (req.path.includes("..")) {
    issues.push({ field: `${label}.path`, message: "Path must not contain '..' segments." });
  }

  // Header checks
  if (req.headers) {
    for (const [name, value] of Object.entries(req.headers)) {
      if (!/^[a-z0-9-]+$/i.test(name)) {
        issues.push({ field: `${label}.headers`, message: `Invalid header name '${name.slice(0, 20)}'.` });
        continue;
      }
      if (UNSAFE_HEADER_NAMES.has(name.toLowerCase())) {
        issues.push({ field: `${label}.headers.${name}`, message: `Header '${name}' is not allowed in test plans.` });
      }
      if (typeof value !== "string" || CONTROL_CHARS.test(value)) {
        issues.push({ field: `${label}.headers.${name}`, message: `Header '${name}' contains invalid characters.` });
      } else if (SENSITIVE_VALUE_PATTERNS.some(p => p.test(value))) {
        issues.push({ field: `${label}.headers.${name}`, message: `Header '${name}' looks like it carries a secret; store credentials server-side instead.` });
      }
    }
  }

  // Body checks
  if (req.body !== undefined && req.body !== null) {
    if (!["POST", "PUT", "PATCH"].includes(req.method)) {
      issues.push({ field: `${label}.body`, message: `Request body is only allowed for POST/PUT/PATCH (method is ${req.method}).` });
    }
    let serialized: string;
    try {
      serialized = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    } catch {
      issues.push({ field: `${label}.body`, message: "Request body must be JSON-serializable." });
      return issues;
    }
    if (Buffer.byteLength(serialized, "utf8") > TEST_EXEC_LIMITS.MAX_REQUEST_BODY_BYTES) {
      issues.push({
        field: `${label}.body`,
        message: `Request body exceeds the ${Math.round(TEST_EXEC_LIMITS.MAX_REQUEST_BODY_BYTES / 1024)}KB limit.`
      });
    }
  }

  return issues;
}

/**
 * Validates a full test plan against the safety envelope.
 * The optional `orgMaxVirtualUsers` lets organizations tighten (never raise) the global cap.
 */
export function validateTestPlan(
  plan: TestPlan,
  options: { orgMaxVirtualUsers?: number } = {}
): PlanValidationResult {
  const issues: ValidationIssue[] = [];

  if (!plan || typeof plan !== "object") {
    return { valid: false, issues: [{ field: "plan", message: "Test plan payload is required." }] };
  }

  // Requests
  if (!Array.isArray(plan.requests)) {
    issues.push({ field: "requests", message: "Test plan must contain a requests array." });
  } else if (plan.requests.length === 0) {
    issues.push({ field: "requests", message: "Test plan must contain at least one request." });
  } else if (plan.requests.length > TEST_EXEC_LIMITS.MAX_REQUESTS_PER_PLAN) {
    issues.push({
      field: "requests",
      message: `Test plan exceeds the maximum of ${TEST_EXEC_LIMITS.MAX_REQUESTS_PER_PLAN} requests (got ${plan.requests.length}).`
    });
  } else {
    plan.requests.forEach((r, i) => issues.push(...validateTestRequest(r, i)));
  }

  // Workload numbers
  if (!Number.isInteger(plan.virtualUsers) || plan.virtualUsers < 1) {
    issues.push({ field: "virtualUsers", message: "virtualUsers must be an integer >= 1." });
  } else {
    const vuCap = Math.min(plan.virtualUsers, options.orgMaxVirtualUsers ?? TEST_EXEC_LIMITS.MAX_VIRTUAL_USERS);
    if (plan.virtualUsers > (options.orgMaxVirtualUsers ?? TEST_EXEC_LIMITS.MAX_VIRTUAL_USERS)) {
      issues.push({
        field: "virtualUsers",
        message: `virtualUsers exceeds the organization maximum of ${vuCap}.`
      });
    } else if (plan.virtualUsers > TEST_EXEC_LIMITS.MAX_VIRTUAL_USERS) {
      issues.push({ field: "virtualUsers", message: `virtualUsers exceeds the maximum of ${TEST_EXEC_LIMITS.MAX_VIRTUAL_USERS}.` });
    }
  }

  if (!Number.isInteger(plan.durationSeconds) || plan.durationSeconds < 5) {
    issues.push({ field: "durationSeconds", message: "durationSeconds must be an integer >= 5." });
  } else if (plan.durationSeconds > TEST_EXEC_LIMITS.MAX_DURATION_SECONDS) {
    issues.push({ field: "durationSeconds", message: `durationSeconds exceeds the maximum of ${TEST_EXEC_LIMITS.MAX_DURATION_SECONDS}s.` });
  }

  if (!Number.isInteger(plan.maxRequestsPerSecond) || plan.maxRequestsPerSecond < 1) {
    issues.push({ field: "maxRequestsPerSecond", message: "maxRequestsPerSecond must be an integer >= 1." });
  } else if (plan.maxRequestsPerSecond > TEST_EXEC_LIMITS.MAX_REQUESTS_PER_SECOND) {
    issues.push({ field: "maxRequestsPerSecond", message: `maxRequestsPerSecond exceeds the maximum of ${TEST_EXEC_LIMITS.MAX_REQUESTS_PER_SECOND}.` });
  }

  if (!Number.isInteger(plan.requestTimeoutMs) || plan.requestTimeoutMs < TEST_EXEC_LIMITS.MIN_REQUEST_TIMEOUT_MS) {
    issues.push({ field: "requestTimeoutMs", message: `requestTimeoutMs must be an integer >= ${TEST_EXEC_LIMITS.MIN_REQUEST_TIMEOUT_MS}ms.` });
  } else if (plan.requestTimeoutMs > TEST_EXEC_LIMITS.MAX_REQUEST_TIMEOUT_MS) {
    issues.push({ field: "requestTimeoutMs", message: `requestTimeoutMs exceeds the maximum of ${TEST_EXEC_LIMITS.MAX_REQUEST_TIMEOUT_MS}ms.` });
  }

  // Thresholds sanity
  const th = plan.thresholds ?? {};
  for (const key of ["p95LatencyMs", "p99LatencyMs", "maxErrorRatePercent", "minRequestsPerSecond"] as const) {
    const v = th[key];
    if (v !== undefined && (typeof v !== "number" || !Number.isFinite(v) || v < 0)) {
      issues.push({ field: `thresholds.${key}`, message: "Threshold must be a non-negative number." });
    }
  }
  if (
    th.maxErrorRatePercent !== undefined &&
    (th.maxErrorRatePercent < 0 || th.maxErrorRatePercent > 100)
  ) {
    issues.push({ field: "thresholds.maxErrorRatePercent", message: "maxErrorRatePercent must be between 0 and 100." });
  }

  // Target URL
  issues.push(...validateTargetUrl(plan.targetBaseUrl, plan.environment));

  return { valid: issues.length === 0, issues };
}

/**
 * Validates the target base URL: scheme, credentials, SSRF IP literals.
 * HTTPS is required except for explicitly allowed local development targets.
 */
export function validateTargetUrl(
  rawUrl: string,
  environment: string = "staging"
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return [{ field: "targetBaseUrl", message: "Target URL is not a valid absolute URL." }];
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return [{ field: "targetBaseUrl", message: `Unsupported protocol '${parsed.protocol}'. Only HTTP(S) targets are allowed.` }];
  }

  if (parsed.username || parsed.password) {
    issues.push({ field: "targetBaseUrl", message: "Target URL must not contain embedded usernames or passwords." });
  }

  const isLocal = isLocalHost(parsed.hostname);
  if (parsed.protocol !== "https:" && !isLocal) {
    issues.push({
      field: "targetBaseUrl",
      message: "Remote targets must use HTTPS. Plain HTTP is only allowed for local development targets (localhost/127.0.0.1)."
    });
  }

  // Reject obvious SSRF IP literals even when they bypass DNS checks.
  if (isPrivateOrReservedIpLiteral(parsed.hostname)) {
    // Local dev is the only exception, and only for loopback literals.
    const loopback = parsed.hostname === "127.0.0.1" || parsed.hostname === "::1" || parsed.hostname === "[::1]";
    if (!loopback || parsed.protocol !== "http:") {
      // allow http loopback for dev; anything else private/reserved is rejected
      if (!isLocal) {
        issues.push({
          field: "targetBaseUrl",
          message: `Target host '${parsed.hostname}' is a private or reserved IP and cannot be targeted.`
        });
      }
    }
  }

  // Reserved ports of common internal services
  const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === "https:" ? 443 : 80;
  const blockedPorts = [21, 22, 23, 25, 110, 143, 3306, 5432, 6379, 11211, 27017];
  if (blockedPorts.includes(port)) {
    issues.push({ field: "targetBaseUrl", message: `Port ${port} is a restricted system service port.` });
  }

  // Production targets must be HTTPS regardless of host.
  if (environment === "production" && parsed.protocol !== "https:") {
    issues.push({ field: "targetBaseUrl", message: "Production targets must use HTTPS." });
  }

  return issues;
}

/** Quick check used by the API to decide whether production confirmation is present. */
export function requiresProductionConfirmation(environment: string): boolean {
  return environment === "production";
}
