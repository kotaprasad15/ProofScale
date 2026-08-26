import { z } from "zod";

export const OrgRoleEnum = z.enum(["owner", "admin", "member", "tester"]);
export type OrgRole = z.infer<typeof OrgRoleEnum>;

export const ProjectRoleEnum = z.enum(["owner", "editor", "tester", "viewer"]);
export type ProjectRole = z.infer<typeof ProjectRoleEnum>;

export const OnboardingStatusEnum = z.enum(["required", "completed"]);
export type OnboardingStatus = z.infer<typeof OnboardingStatusEnum>;

export interface UserPermissions {
  // Organization level
  manageOrganization: boolean;
  manageMembers: boolean;
  createProject: boolean;
  viewAuditLogs: boolean;

  // Project level
  viewProject: boolean;
  manageProjectSettings: boolean;
  manageProjectMembers: boolean;
  manageTargets: boolean;
  editTestPlans: boolean;
  createRuns: boolean;
  cancelOwnRuns: boolean;
  cancelAnyRun: boolean;
  viewReports: boolean;
  shareReports: boolean;
}

export const AcceptInvitationSchema = z.object({
  token: z.string().min(10, "Valid invitation token required")
});
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;

export const RequestTesterAccessSchema = z.object({
  organizationId: z.string().optional(),
  projectId: z.string().optional(),
  message: z.string().max(500).optional()
});
export type RequestTesterAccessInput = z.infer<typeof RequestTesterAccessSchema>;

export const InviteMemberSchema = z.object({
  organizationId: z.string(),
  projectId: z.string().optional(),
  email: z.string().email("Valid email address required"),
  role: z.string().min(1)
});
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;

export const ChangeMemberRoleSchema = z.object({
  organizationId: z.string(),
  memberId: z.string(),
  newRole: OrgRoleEnum
});
export type ChangeMemberRoleInput = z.infer<typeof ChangeMemberRoleSchema>;

export const SelectWorkspaceSchema = z.object({
  organizationId: z.string(),
  projectId: z.string().optional()
});
export type SelectWorkspaceInput = z.infer<typeof SelectWorkspaceSchema>;

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1, "Display name cannot be empty").max(60)
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
