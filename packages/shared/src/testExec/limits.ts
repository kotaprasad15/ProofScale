/**
 * Conservative default safety limits for test plans and runs.
 *
 * The API must reject anything exceeding these caps. Per-organization limits
 * may tighten them but never raise them.
 */
export const TEST_EXEC_LIMITS = {
  /** Maximum virtual users per run. */
  MAX_VIRTUAL_USERS: 50,
  /** Maximum run duration in seconds. */
  MAX_DURATION_SECONDS: 300,
  /** Maximum sustained request rate (requests/second). */
  MAX_REQUESTS_PER_SECOND: 100,
  /** Maximum per-request timeout in milliseconds. */
  MAX_REQUEST_TIMEOUT_MS: 30_000,
  /** Maximum saved HTTP requests per test plan. */
  MAX_REQUESTS_PER_PLAN: 25,
  /** Minimum per-request timeout in milliseconds. */
  MIN_REQUEST_TIMEOUT_MS: 250,
  /** Maximum serialized size of a single request body in bytes. */
  MAX_REQUEST_BODY_BYTES: 64 * 1024,
  /** Maximum size of any single response body the worker will buffer. */
  MAX_RESPONSE_BODY_BYTES: 64 * 1024,
  /** Maximum number of HTTP redirects the worker follows (validated hop-by-hop). */
  MAX_REDIRECTS: 3,
  /** Maximum number of samples retained per run (bounds memory & DB size). */
  MAX_SAMPLES_PER_RUN: 100_000
} as const;

/**
 * Local development targets allowed to use plain HTTP (non-HTTPS).
 * Remote targets must always use HTTPS.
 */
export const LOCAL_DEV_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "0.0.0.0"
]);
