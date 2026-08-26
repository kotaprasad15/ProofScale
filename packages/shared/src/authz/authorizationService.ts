import { OrgRole, ProjectRole, UserPermissions } from "../schemas/auth.js";

/**
 * Pure authorization evaluation function.
 * Computes granular capability flags from the user's organization and project role.
 */
export function evaluatePermissions(
  orgRole?: string | null,
  projectRole?: string | null
): UserPermissions {
  const isOrgOwner = orgRole === "owner";
  const isOrgAdmin = orgRole === "admin";
  const isOrgMember = orgRole === "member";
  const isOrgTester = orgRole === "tester";

  const isProjectOwner = projectRole === "owner";
  const isProjectEditor = projectRole === "editor";
  const isProjectTester = projectRole === "tester";
  const isProjectViewer = projectRole === "viewer";

  // Effective permissions
  return {
    // Organization administration
    manageOrganization: isOrgOwner,
    manageMembers: isOrgOwner || isOrgAdmin,
    createProject: isOrgOwner || isOrgAdmin,
    viewAuditLogs: isOrgOwner || isOrgAdmin,

    // Project permissions
    viewProject: isOrgOwner || isOrgAdmin || !!projectRole,
    manageProjectSettings: isOrgOwner || isOrgAdmin || isProjectOwner,
    manageProjectMembers: isOrgOwner || isOrgAdmin || isProjectOwner,
    manageTargets: isOrgOwner || isOrgAdmin || isProjectOwner || isProjectEditor,
    editTestPlans: isOrgOwner || isOrgAdmin || isProjectOwner || isProjectEditor,
    createRuns: isOrgOwner || isOrgAdmin || isProjectOwner || isProjectEditor || isProjectTester || (isOrgTester && !!projectRole),
    cancelOwnRuns: isOrgOwner || isOrgAdmin || isProjectOwner || isProjectEditor || isProjectTester || !!projectRole,
    cancelAnyRun: isOrgOwner || isOrgAdmin || isProjectOwner || isProjectEditor,
    viewReports: isOrgOwner || isOrgAdmin || !!projectRole || isOrgMember || isOrgTester,
    shareReports: isOrgOwner || isOrgAdmin || isProjectOwner || isProjectEditor
  };
}

export type CapabilityName = keyof UserPermissions;

export function canOrganization(orgRole: string | null | undefined, capability: CapabilityName): boolean {
  const perms = evaluatePermissions(orgRole, null);
  return perms[capability];
}

export function canProject(
  orgRole: string | null | undefined,
  projectRole: string | null | undefined,
  capability: CapabilityName
): boolean {
  const perms = evaluatePermissions(orgRole, projectRole);
  return perms[capability];
}
