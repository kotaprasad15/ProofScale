import { z } from "zod";
import { TestProfileEnum } from "./common.js";

export const HttpMethodEnum = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);
export type HttpMethod = z.infer<typeof HttpMethodEnum>;

export const ScenarioStepSchema = z.object({
  name: z.string().min(1),
  method: HttpMethodEnum.default("GET"),
  path: z.string().startsWith("/", "Path must start with '/'"),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  weight: z.number().int().min(1).max(100).default(1)
});
export type ScenarioStep = z.infer<typeof ScenarioStepSchema>;

export const LoadProfileSchema = z.object({
  virtualUsers: z.number().int().min(1).max(100, "MVP virtual users capped at 100"),
  durationSeconds: z.number().int().min(5).max(600, "MVP duration capped at 600s (10 min)"),
  rampUpSeconds: z.number().int().min(0).max(120).default(10),
  targetRps: z.number().int().min(1).max(500).optional(),
  timeoutMs: z.number().int().min(500).max(30000).default(5000)
});
export type LoadProfile = z.infer<typeof LoadProfileSchema>;

export const ThresholdsSchema = z.object({
  maxP95Ms: z.number().int().min(10).max(30000).default(2000),
  maxP99Ms: z.number().int().min(10).max(60000).default(5000),
  maxErrorRate: z.number().min(0).max(1).default(0.01), // 1%
  minRps: z.number().min(0).optional()
});
export type Thresholds = z.infer<typeof ThresholdsSchema>;

export const SafetyLimitsSchema = z.object({
  maxVirtualUsers: z.number().int().max(100).default(50),
  maxDurationSeconds: z.number().int().max(600).default(300),
  allowRedirects: z.boolean().default(false)
});
export type SafetyLimits = z.infer<typeof SafetyLimitsSchema>;

export const CreateTestPlanSchema = z.object({
  projectId: z.string(),
  name: z.string().min(2, "Plan name must be at least 2 characters").max(100),
  profile: TestProfileEnum.default("smoke"),
  scenarios: z.array(ScenarioStepSchema).min(1, "At least one scenario step required"),
  loadProfile: LoadProfileSchema,
  thresholds: ThresholdsSchema,
  safetyLimits: SafetyLimitsSchema.optional()
});
export type CreateTestPlanInput = z.infer<typeof CreateTestPlanSchema>;

export const UpdateTestPlanSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Plan name must be at least 2 characters").max(100).optional(),
  profile: TestProfileEnum.optional(),
  scenarios: z.array(ScenarioStepSchema).min(1).optional(),
  loadProfile: LoadProfileSchema.optional(),
  thresholds: ThresholdsSchema.optional(),
  safetyLimits: SafetyLimitsSchema.optional()
});
export type UpdateTestPlanInput = z.infer<typeof UpdateTestPlanSchema>;

export const PresetDefinitions: Record<z.infer<typeof TestProfileEnum>, {
  name: string;
  description: string;
  loadProfile: LoadProfile;
  thresholds: Thresholds;
}> = {
  smoke: {
    name: "Smoke Test",
    description: "Low concurrency check to verify endpoint health and system connectivity.",
    loadProfile: { virtualUsers: 2, durationSeconds: 30, rampUpSeconds: 5, timeoutMs: 5000 },
    thresholds: { maxP95Ms: 1000, maxP99Ms: 2500, maxErrorRate: 0.00 }
  },
  baseline: {
    name: "Baseline Performance Test",
    description: "Moderate sustained load to measure standard response times and throughput.",
    loadProfile: { virtualUsers: 10, durationSeconds: 120, rampUpSeconds: 15, timeoutMs: 5000 },
    thresholds: { maxP95Ms: 1500, maxP99Ms: 3000, maxErrorRate: 0.01 }
  },
  ramp: {
    name: "Ramp-Up Capacity Test",
    description: "Gradually increasing virtual users to observe concurrency degradation boundaries.",
    loadProfile: { virtualUsers: 30, durationSeconds: 300, rampUpSeconds: 60, timeoutMs: 5000 },
    thresholds: { maxP95Ms: 2000, maxP99Ms: 4000, maxErrorRate: 0.02 }
  },
  spike: {
    name: "Spike Test",
    description: "Brief high-concurrency surge to test burst resilience and recovery.",
    loadProfile: { virtualUsers: 50, durationSeconds: 60, rampUpSeconds: 5, timeoutMs: 5000 },
    thresholds: { maxP95Ms: 3000, maxP99Ms: 6000, maxErrorRate: 0.05 }
  },
  short_soak: {
    name: "Short Soak Test",
    description: "Sustained moderate load over 10 minutes to detect memory leaks or queue buildup.",
    loadProfile: { virtualUsers: 15, durationSeconds: 600, rampUpSeconds: 30, timeoutMs: 5000 },
    thresholds: { maxP95Ms: 1500, maxP99Ms: 3500, maxErrorRate: 0.01 }
  }
};
