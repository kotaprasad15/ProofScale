import { pgTable, text, integer, timestamp, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  role: text("role").notNull().default("member"),
  onboardingStatus: text("onboarding_status").notNull().default("completed"),
  lastWorkspaceId: text("last_workspace_id"),
  passwordHash: text("password_hash"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().default("default-org"),
  ownerId: text("owner_id").notNull().default("usr_admin_01"),
  ownerUserId: text("owner_user_id").notNull().default("usr_admin_01"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const organizationMembers = pgTable("organization_members", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("active"),
  invitedByUserId: text("invited_by_user_id"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  ownerUserId: text("owner_user_id"),
  name: text("name").notNull(),
  description: text("description"),
  environment: text("environment").notNull().default("staging"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const projectMembers = pgTable("project_members", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("tester"),
  status: text("status").notNull().default("active"),
  invitedByUserId: text("invited_by_user_id"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: text("project_id"),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  tokenHash: text("token_hash").notNull().unique(),
  invitedByUserId: text("invited_by_user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const accessRequests = pgTable("access_requests", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  projectId: text("project_id"),
  userId: text("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  reviewedByUserId: text("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const auditEvents = pgTable("audit_events", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id").notNull(),
  organizationId: text("organization_id"),
  projectId: text("project_id"),
  action: text("action").notNull(),
  subject: text("subject").notNull(),
  metadataJson: text("metadata_json"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const targets = pgTable("targets", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  baseUrl: text("base_url").notNull(),
  healthUrl: text("health_url"),
  environment: text("environment").notNull().default("staging"),
  authorizationStatus: text("authorization_status").notNull().default("unverified"),
  allowedHost: text("allowed_host").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const testPlans = pgTable("test_plans", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  version: integer("version").notNull().default(1),
  profile: text("profile").notNull().default("smoke"),
  scenariosJson: text("scenarios_json").notNull(),
  loadProfileJson: text("load_profile_json").notNull(),
  thresholdsJson: text("thresholds_json").notNull(),
  safetyLimitsJson: text("safety_limits_json"),
  scoringVersion: text("scoring_version").notNull().default("mvp-1"),
  // Server-side execution (v2) spec columns
  specJson: text("spec_json"),
  planStatus: text("plan_status").notNull().default("draft"),
  planEnvironment: text("plan_environment").notNull().default("staging"),
  targetBaseUrl: text("target_base_url"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  specVersion: integer("spec_version").notNull().default(0),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const testRuns = pgTable("test_runs", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => testPlans.id, { onDelete: "cascade" }),
  targetId: text("target_id").notNull().references(() => targets.id, { onDelete: "cascade" }),
  targetVersionLabel: text("target_version_label").notNull().default("v1.0.0"),
  status: text("status").notNull().default("queued"),
  score: integer("score"),
  confidence: text("confidence"),
  readinessLabel: text("readiness_label"),
  scoreBreakdownJson: text("score_breakdown_json"),
  summaryMetricsJson: text("summary_metrics_json"),
  policySnapshotJson: text("policy_snapshot_json"),
  errorMessage: text("error_message"),
  // Server-side execution (v2) result columns
  envelopeJson: text("envelope_json"),
  resultJson: text("result_json"),
  progressJson: text("progress_json"),
  cancelReason: text("cancel_reason"),
  runKind: text("run_kind").notNull().default("k6"),
  // Phase 3: trigger metadata
  triggerSource: text("trigger_source").notNull().default("manual"),
  scheduleId: text("schedule_id"),
  scheduleName: text("schedule_name"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  actualStartedAt: timestamp("actual_started_at", { withTimezone: true }),
  region: text("region").notNull().default("local-us-east"),
  workerId: text("worker_id"),
  leaseOwner: text("lease_owner"),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  attemptCount: integer("attempt_count").notNull().default(0),
  workerProfile: text("worker_profile").default("standard-runner-1"),
  leaseWorkerId: text("lease_worker_id"),
  leaseHeartbeatAt: timestamp("lease_heartbeat_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  requestedByUserId: text("requested_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const runEvents = pgTable("run_events", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => testRuns.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  message: text("message").notNull(),
  metadataJson: text("metadata_json"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow()
});

export const findings = pgTable("findings", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => testRuns.id, { onDelete: "cascade" }),
  severity: text("severity").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  evidence: text("evidence").notNull(),
  recommendation: text("recommendation").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const artifacts = pgTable("artifacts", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => testRuns.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("raw_runner_output"),
  objectKey: text("object_key").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  checksum: text("checksum").notNull(),
  retentionUntil: timestamp("retention_until", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const reportShares = pgTable("report_shares", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => testRuns.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdByUserId: text("created_by_user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionTokenHash: text("session_token_hash").notNull().unique(),
  csrfToken: text("csrf_token").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow()
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const processedWebhooks = pgTable("processed_webhooks", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  provider: text("provider").notNull(),
  payloadHash: text("payload_hash").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow()
});

export const emailCodes = pgTable("email_codes", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  requestIp: text("request_ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const aiUsageRecords = pgTable("ai_usage_records", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokensUsed: integer("tokens_used").notNull().default(0),
  requestsCount: integer("requests_count").notNull().default(1),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  eventCategory: text("event_category").notNull(), // 'run_results' | 'team_activity' | 'security_alerts'
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  pushEnabled: boolean("push_enabled").notNull().default(true),
  emailEnabled: boolean("email_enabled").notNull().default(false),
  runResultFilter: text("run_result_filter"), // 'all' | 'tier_change_only' | 'failures_only'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  isValid: boolean("is_valid").notNull().default(true)
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // lifecycle + Phase 3 event types
  title: text("title").notNull(),
  body: text("body").notNull(),
  severity: text("severity").notNull().default("info"), // 'info' | 'success' | 'warning' | 'critical'
  linkUrl: text("link_url"),
  // Phase 3: provenance + idempotency
  projectId: text("project_id"),
  runId: text("run_id"),
  scheduleId: text("schedule_id"),
  dedupKey: text("dedup_key"),
  metadataJson: text("metadata_json"),
  readAt: timestamp("read_at", { withTimezone: true }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  dedupIdx: uniqueIndex("idx_notifications_dedup_key").on(table.dedupKey),
  inboxIdx: index("idx_notifications_inbox").on(table.userId, table.orgId, table.isRead),
  createdIdx: index("idx_notifications_created").on(table.createdAt)
}));

export const notificationDeliveries = pgTable("notification_deliveries", {
  id: text("id").primaryKey(),
  notificationId: text("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(), // 'in_app' | 'push' | 'email'
  status: text("status").notNull(), // 'sent' | 'failed' | 'skipped_preference'
  errorDetail: text("error_detail"),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow()
});

export const readinessPolicies = pgTable("readiness_policies", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  testPlanId: text("test_plan_id").notNull().references(() => testPlans.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  minimumScore: integer("minimum_score"),
  maximumP95Ms: integer("maximum_p95_ms"),
  maximumP99Ms: integer("maximum_p99_ms"),
  maximumErrorRatePercent: integer("maximum_error_rate_percent"),
  minimumThroughputRps: integer("minimum_throughput_rps"),
  maximumTimeouts: integer("maximum_timeouts"),
  failOnHardCap: boolean("fail_on_hard_cap").notNull().default(false),
  minimumConfidence: text("minimum_confidence"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true })
});

export const assessmentSchedules = pgTable("assessment_schedules", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  testPlanId: text("test_plan_id").notNull().references(() => testPlans.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"), // active|paused|completed|cancelled|invalid
  scheduleType: text("schedule_type").notNull(), // one_time | recurring
  runAt: timestamp("run_at", { withTimezone: true }),
  cronExpression: text("cron_expression"),
  timezone: text("timezone").notNull().default("UTC"),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastRunId: text("last_run_id"),
  lastRunStatus: text("last_run_status"),
  lastError: text("last_error"),
  maxRuns: integer("max_runs"),
  runCount: integer("run_count").notNull().default(0),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  pausedBy: text("paused_by"),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  cancelledBy: text("cancelled_by"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  version: integer("version").notNull().default(1)
}, (table) => ({
  dueSchedulesIdx: index("idx_schedules_status_next_run").on(table.status, table.nextRunAt),
  orgProjectIdx: index("idx_schedules_org_project").on(table.organizationId, table.projectId),
  planIdx: index("idx_schedules_test_plan").on(table.testPlanId)
}));

export const scheduleExecutions = pgTable("schedule_executions", {
  id: text("id").primaryKey(),
  scheduleId: text("schedule_id").notNull().references(() => assessmentSchedules.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull(),
  projectId: text("project_id").notNull(),
  testPlanId: text("test_plan_id").notNull(),
  runId: text("run_id"),
  occurrenceKey: text("occurrence_key").notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: text("status").notNull().default("pending"), // pending|claimed|run_created|completed|skipped|failed
  failureCode: text("failure_code"),
  failureMessage: text("failure_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  occurrenceKeyIdx: uniqueIndex("idx_executions_occurrence_key").on(table.occurrenceKey),
  scheduleIdx: index("idx_executions_schedule").on(table.scheduleId),
  runIdx: index("idx_executions_run").on(table.runId),
  statusIdx: index("idx_executions_status").on(table.status)
}));

export const schedulerState = pgTable("scheduler_state", {
  id: text("id").primaryKey(), // 'singleton'
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
  lastTickAt: timestamp("last_tick_at", { withTimezone: true }),
  lastTickError: text("last_tick_error"),
  runningInstance: text("running_instance"),
  claimLeaseUntil: timestamp("claim_lease_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const notificationRules = pgTable("notification_rules", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: text("project_id"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  minimumSeverity: text("minimum_severity").notNull().default("info"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  ruleIdentityIdx: uniqueIndex("idx_notification_rules_identity").on(
    table.userId, table.organizationId, table.projectId, table.eventType
  ),
  lookupIdx: index("idx_notification_rules_lookup").on(table.organizationId, table.eventType, table.enabled)
}));

export const baselines = pgTable("baselines", {
  id: text("id").primaryKey(),
  testPlanId: text("test_plan_id").notNull().references(() => testPlans.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull(),
  runId: text("run_id").notNull().references(() => testRuns.id, { onDelete: "cascade" }),
  promotedBy: text("promoted_by").notNull(),
  promotedAt: timestamp("promoted_at", { withTimezone: true }).notNull().defaultNow(),
  reason: text("reason"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedBy: text("revoked_by")
});
