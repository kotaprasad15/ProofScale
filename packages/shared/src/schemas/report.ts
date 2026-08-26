import { z } from "zod";
import { ConfidenceLevelEnum, ReadinessLabelEnum } from "./common.js";

export const CreateReportShareSchema = z.object({
  runId: z.string(),
  expiresInDays: z.number().int().min(1).max(90).default(30)
});
export type CreateReportShareInput = z.infer<typeof CreateReportShareSchema>;

export const RevokeReportShareSchema = z.object({
  shareId: z.string()
});
export type RevokeReportShareInput = z.infer<typeof RevokeReportShareSchema>;

export const CategoryScoreSchema = z.object({
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(1),
  weightedScore: z.number().min(0).max(100),
  passed: z.boolean(),
  notes: z.string().optional()
});
export type CategoryScore = z.infer<typeof CategoryScoreSchema>;

export const ScoreBreakdownSchema = z.object({
  scoringVersion: z.string().default("mvp-1"),
  overallScore: z.number().min(0).max(100),
  label: ReadinessLabelEnum,
  confidence: ConfidenceLevelEnum,
  categories: z.object({
    reliability: CategoryScoreSchema,
    latency: CategoryScoreSchema,
    capacityBehavior: CategoryScoreSchema,
    stability: CategoryScoreSchema,
    readinessHygiene: CategoryScoreSchema
  }),
  criticalFailures: z.array(z.string()),
  limitations: z.array(z.string())
});
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;
