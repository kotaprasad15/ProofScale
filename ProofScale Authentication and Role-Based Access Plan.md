# ProofScale Authentication and Role-Based Access Plan

## 1. Goal

Add a complete authentication and account-onboarding experience to ProofScale so users can sign in or create an account, select how they intend to use the platform, and receive a dashboard that reflects their actual organization and project permissions.

The feature must support three practical account experiences:

1. **Organization owner:** creates and controls an organization, invites members, manages organization settings, creates projects, and can access all organization-owned test data.
2. **Project owner:** owns or manages one or more projects within an organization, including targets, test plans, runs, reports, and project members, but cannot change organization-wide settings unless separately granted that permission.
3. **Tester:** can run approved test plans and view the results allowed by the project, but cannot create organizations, manage members, change ownership, or alter safety policy.

The implementation should use the application’s existing OAuth-based authentication foundation rather than introducing an independent password database in the first release. In this architecture, “signup” means a first-time successful sign-in creates the ProofScale user profile and starts onboarding. A future email/password or additional identity-provider option can be added behind an authentication-provider interface if product requirements demand it.

## 2. Product decisions and assumptions

| Decision | Recommendation for this feature |
|---|---|
| Authentication method | Reuse the existing Manus OAuth flow and session cookie. Do not hand-roll a second OAuth callback or store passwords in the MVP. |
| Signup behavior | A new OAuth identity is created as a user record after callback, then sent to onboarding. Existing identities go directly to their last permitted workspace. |
| Permission model | Use organization memberships and project memberships. Do not use one global `user.role` field to represent organization owner, project owner, and tester. |
| Organization owner | One organization owner is created when a user completes “Create organization.” Ownership transfer is an explicit protected action. |
| Project owner | A project can have one primary owner plus project members. Project ownership is scoped to the organization and project. |
| Tester access | A tester receives a project membership with run/view permissions only. The tester cannot create or modify test plans unless a later permission is granted. |
| First-time users | Show a choice between “Create an organization,” “Join with an invitation,” and “I’m here to test an application.” The third option still requires membership or an invitation before accessing protected project data. |
| Account reflection | Navigation, dashboard cards, actions, and server procedures are all derived from server-returned permissions, not from client-selected labels. |
| Public reports | Read-only report links remain token-based and do not require a full account, but they must not grant project mutation access. |

If the product later needs independent public testers who can test their own application without joining an organization, implement that as a separate workspace type with its own quota and safety policy. Do not weaken organization authorization to support it.

## 3. Roles and permissions

Use two scopes of membership. Organization roles answer “what can this user do for the company or workspace?” Project roles answer “what can this user do for this particular project?” The effective permission is the union of the user’s organization and project permissions, constrained by the most restrictive safety policies.

### Organization roles

| Role | Permissions |
|---|---|
| `owner` | Manage organization profile, members, invitations, ownership transfer, organization quotas, all projects, and all reports. |
| `admin` | Manage members and projects, view organization reports, and manage most settings; cannot transfer ownership or delete the organization unless explicitly allowed. |
| `member` | Access projects to which the user is assigned; no organization membership or quota administration. |
| `tester` | Join assigned projects primarily to execute approved tests and view permitted reports; no organization administration. |

### Project roles

| Role | Permissions |
|---|---|
| `owner` | Edit project settings, manage project membership, register targets, create and edit test plans, run tests, cancel own project runs, view reports, and share reports. |
| `editor` | Register or update targets, create and edit test plans, run tests, and view reports; cannot change project ownership or remove the project owner. |
| `tester` | View targets and approved plans, start permitted runs, cancel runs they started, and view run results and reports. |
| `viewer` | View project summaries and reports only; cannot create targets, plans, or runs. |

A user with organization `owner` or `admin` access may receive administrative visibility across projects, but every server procedure should still evaluate organization membership, project membership, and the requested action. Do not rely on a frontend-hidden button as an authorization control.

### Effective permission examples

| User state | Result |
|---|---|
| Organization owner, no project membership | Can see and manage all organization projects according to owner policy. |
| Organization member, project owner | Can manage the assigned project but not organization-wide members or quotas. |
| Organization tester, project tester | Can execute approved test plans and view permitted reports only. |
| Authenticated user with no organization | Sees onboarding and cannot access project data. |
| User with a revoked membership | Session remains valid, but protected procedures return `FORBIDDEN` and the UI removes that workspace. |
| User with a public report token | Can read the shared report if unexpired and unrevoked, but cannot enter the project workspace or mutate data. |

## 4. Authentication and onboarding flow

### Returning user

1. The user visits the login page and selects **Continue with OAuth**.
2. The frontend starts the existing OAuth flow using `window.location.origin` to construct the redirect URI.
3. The existing nonce-bound state and callback validate the login response before exchanging the authorization code.
4. The server upserts the user identity and session.
5. The application loads the user profile, organization memberships, project memberships, and effective permissions.
6. The user is redirected to the last valid workspace, or to the workspace selector if multiple organizations are available.

The frontend must not build login URLs during render, manipulate session cookies directly, or introduce a second callback implementation. The callback must continue to fail closed on malformed or mismatched OAuth state.

### First-time user

1. The OAuth callback creates the identity and a minimal user profile with `onboardingStatus = 'required'`.
2. The user sees the onboarding screen with three choices: create an organization, accept an invitation, or join an existing project as a tester.
3. “Create an organization” asks for organization name, user’s display name, and optional first project name. The transaction creates the organization, owner membership, and optional project owner membership together.
4. “Accept an invitation” asks for an invitation token. The server validates the token, email or identity binding if configured, expiry, and organization status before creating the membership.
5. “I’m here to test an application” explains that testing access must be granted by an organization or project owner. The user can enter an invitation code or request access; the request is stored without granting permissions.
6. After a successful onboarding action, the server marks onboarding complete and returns the default workspace and permissions.

### Logout and session expiration

Keep the existing logout mutation and session-cookie handling. When a session expires, preserve the intended destination in memory or a safe internal path and return the user to it after re-authentication. Never accept an arbitrary external redirect URL from query parameters.

## 5. Database changes

The current user record can continue to represent identity, but its global `role` field must not be used for organization-owner, project-owner, or tester authorization. Retain a separate platform-level role only if an internal platform administrator is required.

Add or extend the following tables:

| Table | Key fields and purpose |
|---|---|
| `users` | Existing identity record; add `onboardingStatus`, `displayName` if needed, and `lastWorkspaceId` only if safe and useful. |
| `organizations` | `id`, `name`, `slug`, `ownerUserId`, `createdAt`, `updatedAt`, `status`. |
| `organizationMembers` | `organizationId`, `userId`, `role`, `status`, `invitedBy`, `joinedAt`, unique organization/user pair. |
| `projects` | Existing project record extended with `organizationId`, `ownerUserId`, `name`, `environment`, and `status`. |
| `projectMembers` | `projectId`, `userId`, `role`, `status`, `invitedBy`, `joinedAt`, unique project/user pair. |
| `invitations` | `organizationId`, optional `projectId`, email or identity binding, role, hashed token, expiry, inviter, acceptedAt, revokedAt. |
| `accessRequests` | Optional tester access request with organization/project, requester, message, status, reviewer, and timestamps. |
| `auditEvents` | Actor, organization/project, action, subject, metadata, IP or request context where permitted, and UTC timestamp. |
| `userPreferences` | Optional selected organization/project, onboarding completion, and UI preferences. |

Use database constraints for uniqueness and referential integrity. Store invitation tokens only as hashes. Keep organization and project membership status explicit, for example `pending`, `active`, `suspended`, or `revoked`. Use UTC timestamps for invitations, memberships, sessions, and audit events.

### Migration order

1. Add organization and membership tables without removing the existing user role.
2. Backfill an initial organization and owner membership for existing data, using a reviewed deterministic mapping.
3. Backfill project ownership and project membership for existing projects.
4. Update procedures to check memberships and permissions.
5. Update the UI to use effective permissions.
6. Only after all access paths are migrated, deprecate any feature code that reads the old global role for workspace authorization.

## 6. Authorization service design

Create a reusable server-side authorization service rather than repeating role checks inside every router. It should expose functions similar to:

```ts
canOrganization(userId, organizationId, permission)
canProject(userId, projectId, permission)
getEffectiveAccess(userId, organizationId, projectId)
requireOrganizationPermission(ctx, organizationId, permission)
requireProjectPermission(ctx, projectId, permission)
```

Permissions should be capability names, such as `organization.manageMembers`, `project.manageSettings`, `target.manage`, `testPlan.edit`, `run.create`, `run.cancelOwn`, `report.view`, and `report.share`. The authorization service should return a normalized access object for the UI, but the server must independently enforce each mutation.

### Example access object

```ts
{
  userId: 42,
  organizationId: 7,
  organizationRole: "member",
  projectId: 19,
  projectRole: "tester",
  permissions: {
    viewProject: true,
    manageProject: false,
    manageMembers: false,
    manageTargets: false,
    editTestPlans: false,
    createRuns: true,
    cancelOwnRuns: true,
    viewReports: true,
    shareReports: false
  }
}
```

Do not accept `organizationRole`, `projectRole`, or permission flags from the browser as authoritative input. The client may request a role during onboarding, but the server decides whether the requested role can be granted.

## 7. API and procedure changes

Extend the typed API with the following groups:

| Procedure group | Required procedures |
|---|---|
| `auth` | `me`, `logout`, `getOnboardingState`, `completeProfile`, `selectWorkspace`. |
| `organizations` | `listMine`, `create`, `get`, `update`, `inviteMember`, `listMembers`, `changeMemberRole`, `suspendMember`, `transferOwnership`, `leave`. |
| `projects` | `listMine`, `create`, `get`, `update`, `archive`, `inviteMember`, `listMembers`, `changeMemberRole`, `removeMember`. |
| `invitations` | `preview`, `accept`, `decline`, `revoke`, `resend`. |
| `accessRequests` | `create`, `listForReview`, `approve`, `deny`, `cancel`. |
| `workspaces` | `getCurrent`, `setCurrent`, `getAccessibleProjects`. |

Update existing `targets`, `testPlans`, `runs`, and `reports` procedures to require project-level permissions. For example, creating a run requires `run.create`, editing a test plan requires `testPlan.edit`, and sharing a report requires `report.share`.

Return stable error codes such as `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INVITATION_EXPIRED`, `INVITATION_REVOKED`, `MEMBERSHIP_SUSPENDED`, and `ONBOARDING_REQUIRED`. Avoid revealing whether another email address has an account when accepting or requesting access.

## 8. Frontend pages and account reflection

Add the following routes and page states:

| Route or state | Behavior |
|---|---|
| `/login` | Branded login page with OAuth button, short explanation, and links to acceptable use and privacy information. |
| `/signup` | Signup-oriented copy that uses the same OAuth action; explains that first-time sign-in creates an account. |
| `/onboarding` | Organization creation, invitation acceptance, tester access request, and profile completion. |
| `/workspaces` | Lists organizations and projects the user can access, with role badges and last-used workspace selection. |
| `/settings/account` | Display name, account identity, session/logout controls, and personal preferences. |
| `/settings/organization` | Owner/admin-only organization profile, members, invitations, and ownership controls. |
| `/projects/:id/settings` | Project owner/editor controls, project members, target configuration, and project archive action. |
| Protected route wrapper | Shows loading state while auth is resolved, redirects unauthenticated users to login, redirects new users to onboarding, and displays a clear forbidden state for insufficient permissions. |

The dashboard should reflect access in four ways:

1. **Workspace context:** show the active organization and project in the header or sidebar.
2. **Role identity:** show the user’s organization and project role in the profile menu or workspace switcher.
3. **Navigation:** show only relevant sections, such as Organization Settings for owners/admins and Test Runs for testers.
4. **Actions:** disable or hide actions the user cannot perform, while still relying on server authorization for enforcement.

### Role-specific landing dashboards

| Account experience | Dashboard emphasis |
|---|---|
| Organization owner | Organization health, projects, member activity, latest assessments, quotas, and organization settings. Primary actions: create project and invite member. |
| Project owner | Project readiness score, targets, test plans, recent runs, reports, project members, and project settings. Primary actions: register target and create test plan. |
| Tester | Assigned projects, approved test plans, run-test action, current run status, and reports. Primary actions: start an allowed run and inspect evidence. |
| No workspace | Onboarding card with create organization, accept invitation, or request tester access. |

Use a shared dashboard layout, but derive cards and actions from the permission object returned by the server. Avoid duplicating role logic across pages.

## 9. Login and signup UX requirements

The login and signup pages should be intentionally simple and trustworthy. The login page should contain one primary OAuth action, an explanation of what happens on first sign-in, a visible loading state, and an error state for cancelled or failed authentication. The signup page can reuse the same mechanism but use onboarding-oriented copy such as “Create your ProofScale workspace.”

The onboarding form must be mobile responsive, keyboard accessible, and explicit about the difference between creating an organization and requesting permission to test someone else’s project. If an invitation is present, show the organization and project context before acceptance without exposing sensitive information.

The UI must not promise access before the server confirms membership. It must also handle users who belong to multiple organizations, users whose only membership was revoked, expired invitations, and an incomplete onboarding record.

## 10. Security requirements

- Preserve the existing nonce-bound OAuth state flow and use `window.location.origin` for redirect construction.
- Use secure, HTTP-only session cookies with the existing application cookie policy; do not read or write session cookies in React.
- Protect every organization and project procedure with server-side membership checks.
- Hash invitation tokens and make them single-use, expiring, revocable, and bound to the intended organization/project.
- Prevent privilege escalation through client-supplied roles, organization IDs, project IDs, or hidden form fields.
- Require owner confirmation for ownership transfer and organization deletion; record both actions in the audit log.
- Rate-limit login initiation, invitation sending, invitation acceptance, access requests, and role changes.
- Avoid account enumeration in invitation and access-request responses.
- Record audit events for sign-in, signup completion, organization creation, invitations, membership changes, role changes, ownership transfer, access requests, and logout where operationally appropriate.
- Invalidate or re-evaluate access on every protected request so revoked memberships take effect promptly.
- Ensure public report links never inherit authenticated mutation permissions.
- Add CSRF protection appropriate to the session and mutation model, especially for any non-tRPC form or browser callback.

## 11. Implementation phases

### Phase 1: Permission design and migration preparation

Finalize role names, permission capabilities, onboarding choices, invitation policy, ownership-transfer rules, and default project access. Write a permission matrix and map every current ProofScale procedure to a required capability. Prepare database migrations and a reviewed backfill for existing users and projects.

### Phase 2: Authentication and account state

Add the login and signup routes, connect them to the existing OAuth flow, implement first-time user detection, complete the account profile, preserve logout behavior, and add the protected route wrapper. Cover loading, callback failure, session expiry, and onboarding-required states.

### Phase 3: Organization and project membership

Add organization creation, organization owner membership, project creation, project ownership, invitation records, invitation acceptance, membership listing, and workspace selection. Add server-side authorization helpers and update existing project-scoped procedures.

### Phase 4: Role-aware dashboard

Build the workspace switcher, role badges, organization owner dashboard, project owner dashboard, tester dashboard, account settings, organization settings, project settings, and forbidden states. Derive visible navigation and actions from server-provided permissions.

### Phase 5: Tester workflow

Implement the tester onboarding path, invitation-based access, optional access requests, approved-plan visibility, run creation, run cancellation for owned runs, and report access. Keep test-plan editing and target registration restricted to project owners/editors unless intentionally expanded.

### Phase 6: Security, migration, and rollout

Run authorization tests, backfill existing data, verify revoked-membership behavior, audit all mutations, test OAuth edge cases, and deploy behind a feature flag or staged rollout. Monitor failed sign-ins, invitation failures, forbidden responses, and onboarding completion.

## 12. Testing plan

### Unit tests

Test permission evaluation for every organization/project role combination, inherited organization access, revoked and suspended memberships, ownership transfer rules, onboarding-state transitions, invitation hashing, expiry, single-use behavior, and safe redirect handling.

### Integration tests

Test OAuth user upsert, new-user onboarding, organization creation transaction, project ownership creation, invitation acceptance, membership changes, workspace selection, protected procedures, and logout. Verify that a user cannot read or mutate another organization’s projects by changing an ID in the request.

### End-to-end tests

Cover the following journeys:

| Journey | Expected result |
|---|---|
| New user creates an organization | Organization, owner membership, workspace, and optional project are created; owner dashboard appears. |
| Existing user signs in | User lands in the last valid workspace or workspace selector. |
| Owner invites a project tester | Invitation is created, token is delivered through the chosen channel, and tester can accept once. |
| Tester accepts invitation | Tester sees assigned project and approved test plans but not organization settings or project-owner actions. |
| Project owner manages project | Owner can manage targets, plans, runs, reports, and project members but not organization ownership. |
| Revoked member refreshes page | Protected requests fail with `FORBIDDEN`, and inaccessible workspace entries disappear. |
| Expired invitation is opened | Invitation is not accepted and the user receives a recovery path. |
| Public report link is opened | Report is read-only, respects expiry/revocation, and does not reveal workspace controls. |
| Cross-organization access is attempted | API returns `NOT_FOUND` or `FORBIDDEN` without leaking data. |

### Security tests

Test OAuth state mismatch, callback replay, unsafe redirect values, invitation token replay, role tampering, IDOR across organizations/projects, revoked-membership access, account enumeration behavior, rate limits, CSRF on mutations, and audit-event completeness.

## 13. Acceptance criteria

The feature is ready when an unauthenticated visitor can reach login/signup, a first-time OAuth user can complete onboarding, an organization owner can create a workspace and invite members, a project owner can manage only the project scope they own, and a tester can execute only the test actions granted to them.

The server must enforce every permission independently of the UI. Existing project, target, test-plan, run, and report procedures must be protected by the new authorization layer. Role-specific dashboards must reflect server-derived permissions, and the application must handle multiple workspaces, session expiry, revoked access, expired invitations, and forbidden states without exposing private data.

All authentication, membership, ownership, and role-change tests must pass. No production rollout should occur until the OAuth callback, invitation flow, cross-tenant authorization, and account-enumeration behavior have been reviewed.

## 14. Open risks and future extensions

The main product risk is confusing an identity account with a workspace role. Keeping organization and project memberships separate prevents that mistake and allows the same user to be an owner in one project and a tester in another.

A second risk is allowing “I’m here to test” to become an implicit permission grant. The tester path must remain an onboarding choice, not a role assignment. Permission comes only from an invitation, an approved access request, or an explicitly configured public-testing workspace with separate safety controls.

Future extensions may include SSO/SAML, email/password authentication, MFA, SCIM provisioning, custom roles, teams, service accounts for CI/CD, API keys, approval workflows for production tests, and organization-level quotas. These should be added without changing the core rule that identity, organization membership, project membership, and test permissions are separate concerns.
