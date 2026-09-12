import { z } from "zod";

export const RunLifecycleEventTypeEnum = z.enum([
  "run.completed",
  "run.failed",
  "run.aborted",
  "run.tier_changed"
]);
export type RunLifecycleEventType = z.infer<typeof RunLifecycleEventTypeEnum>;

export const RunLifecyclePayloadSchema = z.object({
  targetName: z.string(),
  scenario: z.string(),
  score: z.number().min(0).max(100).optional(),
  tier: z.enum(["ready", "conditionally_ready", "needs_investigation", "not_ready"]).optional(),
  previousTier: z.string().nullable().optional(),
  errorRate: z.number().min(0).max(1).optional(),
  p95LatencyMs: z.number().min(0).optional(),
  failureReason: z.string().optional()
});
export type RunLifecyclePayload = z.infer<typeof RunLifecyclePayloadSchema>;

export const RunLifecycleEventSchema = z.object({
  eventId: z.string(),
  eventType: RunLifecycleEventTypeEnum,
  occurredAt: z.string(),
  orgId: z.string(),
  projectId: z.string(),
  targetId: z.string(),
  runId: z.string(),
  payload: RunLifecyclePayloadSchema
});
export type RunLifecycleEvent = z.infer<typeof RunLifecycleEventSchema>;

export const NotificationCategoryEnum = z.enum([
  "run_results",
  "team_activity",
  "security_alerts"
]);
export type NotificationCategory = z.infer<typeof NotificationCategoryEnum>;

export const RunResultFilterEnum = z.enum([
  "all",
  "tier_change_only",
  "failures_only"
]);
export type RunResultFilter = z.infer<typeof RunResultFilterEnum>;

export const NotificationSeverityEnum = z.enum([
  "info",
  "warning",
  "critical"
]);
export type NotificationSeverity = z.infer<typeof NotificationSeverityEnum>;

export const NotificationChannelEnum = z.enum([
  "in_app",
  "push",
  "email"
]);
export type NotificationChannel = z.infer<typeof NotificationChannelEnum>;

export const NotificationPreferencesSchema = z.object({
  orgId: z.string(),
  eventCategory: NotificationCategoryEnum,
  inAppEnabled: z.boolean().default(true),
  pushEnabled: z.boolean().default(true),
  emailEnabled: z.boolean().default(false),
  runResultFilter: RunResultFilterEnum.nullable().optional()
});
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

export const UpdateNotificationPreferencesSchema = z.object({
  orgId: z.string(),
  eventCategory: NotificationCategoryEnum,
  inAppEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  runResultFilter: RunResultFilterEnum.nullable().optional()
});
export type UpdateNotificationPreferences = z.infer<typeof UpdateNotificationPreferencesSchema>;

export const PushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(10),
  auth: z.string().min(10)
});

export const PushSubscriptionInputSchema = z.object({
  endpoint: z.string().url(),
  keys: PushSubscriptionKeysSchema,
  userAgent: z.string().optional()
});
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionInputSchema>;

export const NotificationQuerySchema = z.object({
  orgId: z.string().optional(),
  isRead: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(30),
  cursor: z.string().optional()
});
export type NotificationQuery = z.infer<typeof NotificationQuerySchema>;

export const NotificationMarkReadSchema = z.object({
  id: z.string().optional(),
  all: z.boolean().optional(),
  orgId: z.string().optional()
});
export type NotificationMarkRead = z.infer<typeof NotificationMarkReadSchema>;
