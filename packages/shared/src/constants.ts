export const SCORING_VERSION = "mvp-1";

export const CATEGORY_WEIGHTS = {
  reliability: 0.30,
  latency: 0.25,
  capacityBehavior: 0.20,
  stability: 0.15,
  readinessHygiene: 0.10
} as const;

export const SAFETY_CAPS = {
  MAX_VIRTUAL_USERS: 100,
  MAX_DURATION_SECONDS: 600, // 10 mins
  MAX_RAMP_UP_SECONDS: 120,
  MAX_REQUEST_TIMEOUT_MS: 30000,
  MAX_BODY_SIZE_BYTES: 1024 * 1024 // 1 MB
} as const;

export const STANDARD_LIMITATIONS = [
  "Results are observed under synthetic load conditions and do not guarantee real-user end-to-end performance.",
  "Private network targets, third-party downstream APIs, and CDN caching behaviors may alter production baseline metrics.",
  "Resource saturation during testing is measured at the test generator boundary; target server telemetry should be correlated independently.",
  "Validity of this assessment is conditional on the declared target version, load envelope, and test parameters."
] as const;
