import { z } from "zod";

export const RoleEnum = z.enum(["owner", "admin", "member", "viewer"]);
export type Role = z.infer<typeof RoleEnum>;

export const EnvironmentEnum = z.enum(["development", "staging", "production", "testing"]);
export type Environment = z.infer<typeof EnvironmentEnum>;

export const TestProfileEnum = z.enum(["smoke", "baseline", "ramp", "spike", "short_soak"]);
export type TestProfile = z.infer<typeof TestProfileEnum>;

export const RunStatusEnum = z.enum([
  "queued",
  "starting",
  "running",
  "cancelling",
  "completed",
  "cancelled",
  "failed",
  "expired"
]);
export type RunStatus = z.infer<typeof RunStatusEnum>;

export const FindingSeverityEnum = z.enum(["critical", "high", "medium", "low", "info"]);
export type FindingSeverity = z.infer<typeof FindingSeverityEnum>;

export const FindingCategoryEnum = z.enum([
  "reliability",
  "latency",
  "capacity_behavior",
  "stability",
  "readiness_hygiene"
]);
export type FindingCategory = z.infer<typeof FindingCategoryEnum>;

export const ConfidenceLevelEnum = z.enum(["high", "medium", "low"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelEnum>;

export const ReadinessLabelEnum = z.enum([
  "Ready",
  "Conditionally ready",
  "Needs investigation",
  "Not ready"
]);
export type ReadinessLabel = z.infer<typeof ReadinessLabelEnum>;
