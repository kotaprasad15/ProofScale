import { z } from "zod";
import { RunStatusEnum } from "./common.js";

export const CreateTestRunSchema = z.object({
  planId: z.string(),
  targetId: z.string(),
  targetVersionLabel: z.string().max(50).optional().default("v1.0.0"),
  region: z.string().max(50).optional().default("local-us-east")
});
export type CreateTestRunInput = z.infer<typeof CreateTestRunSchema>;

export const CancelTestRunSchema = z.object({
  runId: z.string(),
  reason: z.string().max(250).optional()
});
export type CancelTestRunInput = z.infer<typeof CancelTestRunSchema>;

export const SummaryMetricsSchema = z.object({
  totalRequests: z.number().int().min(0),
  successfulRequests: z.number().int().min(0),
  failedRequests: z.number().int().min(0),
  throughputRps: z.number().min(0),
  p50Ms: z.number().min(0),
  p95Ms: z.number().min(0),
  p99Ms: z.number().min(0),
  minMs: z.number().min(0).optional(),
  maxMs: z.number().min(0).optional(),
  avgMs: z.number().min(0).optional(),
  errorRate: z.number().min(0).max(1),
  statusCodes: z.record(z.number().int()).default({}),
  timeouts: z.number().int().min(0).default(0)
});
export type SummaryMetrics = z.infer<typeof SummaryMetricsSchema>;

export const WorkerCallbackSchema = z.object({
  runId: z.string(),
  status: RunStatusEnum,
  workerId: z.string(),
  summaryMetrics: SummaryMetricsSchema.optional(),
  errorMessage: z.string().optional(),
  artifactKey: z.string().optional()
});
export type WorkerCallbackInput = z.infer<typeof WorkerCallbackSchema>;
