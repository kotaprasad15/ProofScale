import * as sqliteSchema from "./schema/index.js";
import * as pgSchema from "./schemaPg/index.js";
import { isPostgres } from "./client.js";

export * from "./client.js";

// Export tables dynamically based on dialect
export const users = (isPostgres ? pgSchema.users : sqliteSchema.users) as typeof sqliteSchema.users;
export const organizations = (isPostgres ? pgSchema.organizations : sqliteSchema.organizations) as typeof sqliteSchema.organizations;
export const organizationMembers = (isPostgres ? pgSchema.organizationMembers : sqliteSchema.organizationMembers) as typeof sqliteSchema.organizationMembers;
export const projects = (isPostgres ? pgSchema.projects : sqliteSchema.projects) as typeof sqliteSchema.projects;
export const projectMembers = (isPostgres ? pgSchema.projectMembers : sqliteSchema.projectMembers) as typeof sqliteSchema.projectMembers;
export const invitations = (isPostgres ? pgSchema.invitations : sqliteSchema.invitations) as typeof sqliteSchema.invitations;
export const accessRequests = (isPostgres ? pgSchema.accessRequests : sqliteSchema.accessRequests) as typeof sqliteSchema.accessRequests;
export const auditEvents = (isPostgres ? pgSchema.auditEvents : sqliteSchema.auditEvents) as typeof sqliteSchema.auditEvents;
export const targets = (isPostgres ? pgSchema.targets : sqliteSchema.targets) as typeof sqliteSchema.targets;
export const testPlans = (isPostgres ? pgSchema.testPlans : sqliteSchema.testPlans) as typeof sqliteSchema.testPlans;
export const testRuns = (isPostgres ? pgSchema.testRuns : sqliteSchema.testRuns) as typeof sqliteSchema.testRuns;
export const runEvents = (isPostgres ? pgSchema.runEvents : sqliteSchema.runEvents) as typeof sqliteSchema.runEvents;
export const findings = (isPostgres ? pgSchema.findings : sqliteSchema.findings) as typeof sqliteSchema.findings;
export const artifacts = (isPostgres ? pgSchema.artifacts : sqliteSchema.artifacts) as typeof sqliteSchema.artifacts;
export const reportShares = (isPostgres ? pgSchema.reportShares : sqliteSchema.reportShares) as typeof sqliteSchema.reportShares;
export const sessions = (isPostgres ? pgSchema.sessions : sqliteSchema.sessions) as typeof sqliteSchema.sessions;
export const passwordResetTokens = (isPostgres ? pgSchema.passwordResetTokens : sqliteSchema.passwordResetTokens) as typeof sqliteSchema.passwordResetTokens;
export const emailCodes = (isPostgres ? pgSchema.emailCodes : sqliteSchema.emailCodes) as typeof sqliteSchema.emailCodes;
export const processedWebhooks = (isPostgres ? pgSchema.processedWebhooks : sqliteSchema.processedWebhooks) as typeof sqliteSchema.processedWebhooks;
export const aiUsageRecords = (isPostgres ? pgSchema.aiUsageRecords : sqliteSchema.aiUsageRecords) as typeof sqliteSchema.aiUsageRecords;
export const notificationPreferences = (isPostgres ? pgSchema.notificationPreferences : sqliteSchema.notificationPreferences) as typeof sqliteSchema.notificationPreferences;
export const pushSubscriptions = (isPostgres ? pgSchema.pushSubscriptions : sqliteSchema.pushSubscriptions) as typeof sqliteSchema.pushSubscriptions;
export const notifications = (isPostgres ? pgSchema.notifications : sqliteSchema.notifications) as typeof sqliteSchema.notifications;
export const notificationDeliveries = (isPostgres ? pgSchema.notificationDeliveries : sqliteSchema.notificationDeliveries) as typeof sqliteSchema.notificationDeliveries;
