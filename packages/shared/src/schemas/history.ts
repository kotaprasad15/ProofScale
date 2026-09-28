import { z } from "zod";
import { RunStatusEnum } from "./common.js";

// Run Explorer Schemas

export const RunSortFieldEnum = z.enum([
  "createdAt",
  "score",
  "p95Ms",
  "p99Ms",
  "throughputRps",
  "errorRate"
]);

export const ListRunsSchema = z.object({
  projectId: z.string(),
  limit: z.number().min(1).max(100).default(25),
  cursor: z.object({
    id: z.string(),
    sortFieldValue: z.any()
  }).optional(),
  
  // Filters
  testPlanId: z.string().optional(),
  targetId: z.string().optional(),
  environment: z.string().optional(),
  targetVersionLabel: z.string().optional(),
  status: RunStatusEnum.optional(),
  policyResult: z.enum(["pass", "warn", "fail", "inconclusive"]).optional(),
  regressionStatus: z.enum(["improved", "stable", "regressed"]).optional(),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).optional(),
  search: z.string().optional(), // search by runId or targetVersionLabel

  // Sort
  sortField: RunSortFieldEnum.default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc")
});

export type ListRunsInput = z.infer<typeof ListRunsSchema>;

export const RunSummarySchema = z.object({
  id: z.string(),
  shortId: z.string(),
  projectId: z.string(),
  testPlanId: z.string(),
  testPlanName: z.string(),
  targetId: z.string(),
  targetName: z.string(),
  environment: z.string(),
  targetVersionLabel: z.string(),
  status: z.string(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  durationSeconds: z.number().nullable(),
  score: z.number().nullable(),
  confidence: z.string().nullable(),
  readinessLabel: z.string().nullable(),
  policyResult: z.string().nullable(),
  policyVersion: z.number().nullable(),
  baselineRunId: z.string().nullable(),
  regressionStatus: z.string().nullable(),
  scoreDelta: z.number().nullable(),
  p95Ms: z.number().nullable(),
  p99Ms: z.number().nullable(),
  throughputRps: z.number().nullable(),
  errorRatePercent: z.number().nullable(),
  timeouts: z.number().nullable(),
});
export type RunSummary = z.infer<typeof RunSummarySchema>;

export const RunTimelineEventSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  eventType: z.string(),
  message: z.string(),
  metadata: z.any().optional()
});
export type RunTimelineEvent = z.infer<typeof RunTimelineEventSchema>;

export const GetRunTimelineSchema = z.object({
  runId: z.string(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional()
});

// Telemetry/Trend Schemas

export const GetProjectHistorySchema = z.object({
  projectId: z.string(),
  testPlanId: z.string().optional(),
  targetId: z.string().optional(),
  environment: z.string().optional(),
  targetVersionLabel: z.string().optional(),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).optional(),
  limit: z.number().min(1).max(500).default(100)
});

export const TrendPointSchema = z.object({
  runId: z.string(),
  timestamp: z.date(),
  environment: z.string().nullable(),
  targetVersionLabel: z.string().nullable(),
  score: z.number().nullable(),
  readinessLabel: z.string().nullable(),
  confidence: z.string().nullable(),
  policyResult: z.string().nullable(),
  regressionStatus: z.string().nullable(),
  p50Ms: z.number().nullable(),
  p95Ms: z.number().nullable(),
  p99Ms: z.number().nullable(),
  throughputRps: z.number().nullable(),
  errorRatePercent: z.number().nullable(),
  timeoutCount: z.number().nullable(),
});
export type TrendPoint = z.infer<typeof TrendPointSchema>;

export const ProjectHistoryResponseSchema = z.object({
  points: z.array(TrendPointSchema),
  baseline: z.object({
    runId: z.string(),
    timestamp: z.date(),
    score: z.number().nullable(),
    p95Ms: z.number().nullable(),
    p99Ms: z.number().nullable(),
    throughputRps: z.number().nullable(),
    errorRatePercent: z.number().nullable()
  }).nullable(),
  policy: z.object({
    id: z.string(),
    name: z.string(),
    version: z.number()
  }).nullable(),
  limitations: z.array(z.string())
});
export type ProjectHistoryResponse = z.infer<typeof ProjectHistoryResponseSchema>;
