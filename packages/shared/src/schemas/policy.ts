import { z } from "zod";

export const ReadinessPolicyStatusEnum = z.enum(["draft", "active", "archived"]);
export type ReadinessPolicyStatus = z.infer<typeof ReadinessPolicyStatusEnum>;

export const ConfidenceEnum = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof ConfidenceEnum>;

export const ReadinessPolicySchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  projectId: z.string(),
  testPlanId: z.string(),
  version: z.number().int().min(1),
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  status: ReadinessPolicyStatusEnum,
  minimumScore: z.number().int().min(0).max(100).nullable().optional(),
  maximumP95Ms: z.number().int().min(0).nullable().optional(),
  maximumP99Ms: z.number().int().min(0).nullable().optional(),
  maximumErrorRatePercent: z.number().min(0).max(100).nullable().optional(),
  minimumThroughputRps: z.number().min(0).nullable().optional(),
  maximumTimeouts: z.number().int().min(0).nullable().optional(),
  failOnHardCap: z.boolean().default(false),
  minimumConfidence: ConfidenceEnum.nullable().optional(),
  createdBy: z.string(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
  activatedAt: z.date().or(z.string()).nullable().optional(),
  archivedAt: z.date().or(z.string()).nullable().optional()
});
export type ReadinessPolicy = z.infer<typeof ReadinessPolicySchema>;

export const CreatePolicyDraftSchema = z.object({
  projectId: z.string(),
  testPlanId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  minimumScore: z.number().int().min(0).max(100).optional(),
  maximumP95Ms: z.number().int().min(0).optional(),
  maximumP99Ms: z.number().int().min(0).optional(),
  maximumErrorRatePercent: z.number().min(0).max(100).optional(),
  minimumThroughputRps: z.number().min(0).optional(),
  maximumTimeouts: z.number().int().min(0).optional(),
  failOnHardCap: z.boolean().optional(),
  minimumConfidence: ConfidenceEnum.optional()
});
export type CreatePolicyDraftInput = z.infer<typeof CreatePolicyDraftSchema>;

export const RuleResultStatusEnum = z.enum(["pass", "warn", "fail", "not_configured"]);
export type RuleResultStatus = z.infer<typeof RuleResultStatusEnum>;

export const RuleResultSchema = z.object({
  key: z.enum(["minimumScore", "maximumP95Ms", "maximumP99Ms", "maximumErrorRatePercent", "minimumThroughputRps", "maximumTimeouts", "hardCap", "confidence"]),
  status: RuleResultStatusEnum,
  observed: z.union([z.number(), z.string()]).nullable(),
  threshold: z.union([z.number(), z.string()]).nullable(),
  message: z.string()
});
export type RuleResult = z.infer<typeof RuleResultSchema>;

export const BaselineComparisonSchema = z.object({
  baselineRunId: z.string().nullable(),
  scoreDelta: z.number().nullable(),
  p95DeltaMs: z.number().nullable(),
  p99DeltaMs: z.number().nullable(),
  throughputDeltaRps: z.number().nullable(),
  errorRateDeltaPercent: z.number().nullable(),
  regressionStatus: z.enum(["improved", "stable", "regressed", "not_available"])
});
export type BaselineComparison = z.infer<typeof BaselineComparisonSchema>;

export const PolicyEvaluationResultSchema = z.object({
  result: z.enum(["pass", "warn", "fail", "inconclusive"]),
  policyId: z.string(),
  policyVersion: z.number(),
  evaluatedAt: z.string(), // ISO string date
  rules: z.array(RuleResultSchema),
  baselineComparison: BaselineComparisonSchema,
  limitations: z.array(z.string())
});
export type PolicyEvaluationResult = z.infer<typeof PolicyEvaluationResultSchema>;

export const PromoteBaselineSchema = z.object({
  runId: z.string()
});
export type PromoteBaselineInput = z.infer<typeof PromoteBaselineSchema>;

export const RevokeBaselineSchema = z.object({
  planId: z.string()
});
export type RevokeBaselineInput = z.infer<typeof RevokeBaselineSchema>;
