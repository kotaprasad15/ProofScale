import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import {
  CreateOrganizationSchema,
  AcceptInvitationSchema,
  RequestTesterAccessSchema,
  SelectWorkspaceSchema,
  UpdateProfileSchema
} from "@proofscale/shared";
import {
  users,
  organizations,
  organizationMembers,
  projects,
  projectMembers,
  invitations,
  accessRequests,
  auditEvents
} from "@proofscale/db";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "node:crypto";
import { z } from "zod";

export const authRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    // 1. Fetch user's organizations
    const orgMemberships = await ctx.db
      .select({
        membership: organizationMembers,
        organization: organizations
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(
        and(
          eq(organizationMembers.userId, ctx.user.id),
          eq(organizationMembers.status, "active")
        )
      );

    // 2. Fetch accessible projects across organizations
    const userProjects = await ctx.db
      .select({
        project: projects,
        memberRole: projectMembers.role
      })
      .from(projects)
      .leftJoin(
        projectMembers,
        and(
          eq(projectMembers.projectId, projects.id),
          eq(projectMembers.userId, ctx.user.id)
        )
      );

    return {
      user: ctx.user,
      activeOrganizationId: ctx.organizationId,
      activeProjectId: ctx.projectId,
      orgRole: ctx.orgRole,
      projectRole: ctx.projectRole,
      permissions: ctx.permissions,
      organizations: orgMemberships.map(m => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.membership.role
      })),
      projects: userProjects.map(p => ({
        ...p.project,
        memberRole: p.memberRole || (ctx.orgRole === "owner" || ctx.orgRole === "admin" ? "owner" : null)
      }))
    };
  }),

  getOnboardingState: protectedProcedure.query(async ({ ctx }) => {
    const pendingInvites = await ctx.db
      .select({
        invitation: invitations,
        organization: organizations
      })
      .from(invitations)
      .innerJoin(organizations, eq(invitations.organizationId, organizations.id))
      .where(
        and(
          eq(invitations.email, ctx.user.email),
          eq(invitations.acceptedAt, null as any),
          eq(invitations.revokedAt, null as any)
        )
      );

    return {
      onboardingStatus: ctx.user.onboardingStatus,
      pendingInvitations: pendingInvites.map(i => ({
        id: i.invitation.id,
        organizationName: i.organization.name,
        role: i.invitation.role,
        expiresAt: i.invitation.expiresAt
      }))
    };
  }),

  createOrganizationOnboarding: protectedProcedure
    .input(CreateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const orgId = `org_${crypto.randomUUID().slice(0, 8)}`;
      const slug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      // 1. Create Organization
      await ctx.db.insert(organizations).values({
        id: orgId,
        name: input.name,
        slug,
        ownerId: ctx.user.id,
        ownerUserId: ctx.user.id,
        status: "active"
      });

      // 2. Add User as Organization Owner
      await ctx.db.insert(organizationMembers).values({
        id: `mem_${crypto.randomUUID().slice(0, 8)}`,
        organizationId: orgId,
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        role: "owner",
        status: "active"
      });

      // 3. Create initial Project if specified
      let createdProjectId = null;
      if (input.initialProjectName) {
        createdProjectId = `proj_${crypto.randomUUID().slice(0, 8)}`;
        await ctx.db.insert(projects).values({
          id: createdProjectId,
          organizationId: orgId,
          ownerUserId: ctx.user.id,
          name: input.initialProjectName,
          environment: "staging",
          status: "active"
        });

        await ctx.db.insert(projectMembers).values({
          id: `pmem_${crypto.randomUUID().slice(0, 8)}`,
          projectId: createdProjectId,
          userId: ctx.user.id,
          role: "owner",
          status: "active"
        });
      }

      // 4. Update user onboardingStatus and lastWorkspaceId
      await ctx.db
        .update(users)
        .set({
          displayName: input.displayName || ctx.user.displayName,
          onboardingStatus: "completed",
          lastWorkspaceId: orgId,
          updatedAt: now
        })
        .where(eq(users.id, ctx.user.id));

      // 5. Record Audit Event
      await ctx.db.insert(auditEvents).values({
        id: `audit_${crypto.randomUUID().slice(0, 8)}`,
        actorUserId: ctx.user.id,
        organizationId: orgId,
        action: "organization.created",
        subject: `Created organization '${input.name}' during onboarding`,
        metadataJson: JSON.stringify({ slug, initialProjectId: createdProjectId })
      });

      return {
        organizationId: orgId,
        projectId: createdProjectId
      };
    }),

  acceptInvitation: protectedProcedure
    .input(AcceptInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");

      const [invite] = await ctx.db
        .select()
        .from(invitations)
        .where(eq(invitations.tokenHash, tokenHash));

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invitation link or token." });
      }

      if (invite.revokedAt) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This invitation has been revoked." });
      }

      if (invite.acceptedAt) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This invitation has already been accepted." });
      }

      if (now > invite.expiresAt) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This invitation has expired." });
      }

      // Add to organization members
      await ctx.db
        .insert(organizationMembers)
        .values({
          id: `mem_${crypto.randomUUID().slice(0, 8)}`,
          organizationId: invite.organizationId,
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          role: invite.role as any,
          status: "active",
          invitedByUserId: invite.invitedByUserId
        })
        .onConflictDoNothing();

      // If scoped to a project, add to project members
      if (invite.projectId) {
        await ctx.db
          .insert(projectMembers)
          .values({
            id: `pmem_${crypto.randomUUID().slice(0, 8)}`,
            projectId: invite.projectId,
            userId: ctx.user.id,
            role: (invite.role === "tester" ? "tester" : "editor") as any,
            status: "active",
            invitedByUserId: invite.invitedByUserId
          })
          .onConflictDoNothing();
      }

      // Mark invitation as accepted
      await ctx.db
        .update(invitations)
        .set({ acceptedAt: now })
        .where(eq(invitations.id, invite.id));

      // Mark user onboarding completed
      await ctx.db
        .update(users)
        .set({
          onboardingStatus: "completed",
          lastWorkspaceId: invite.organizationId,
          updatedAt: now
        })
        .where(eq(users.id, ctx.user.id));

      // Audit Log
      await ctx.db.insert(auditEvents).values({
        id: `audit_${crypto.randomUUID().slice(0, 8)}`,
        actorUserId: ctx.user.id,
        organizationId: invite.organizationId,
        projectId: invite.projectId,
        action: "invitation.accepted",
        subject: `User accepted invitation with role '${invite.role}'`
      });

      return {
        success: true,
        organizationId: invite.organizationId,
        projectId: invite.projectId
      };
    }),

  requestTesterAccess: protectedProcedure
    .input(RequestTesterAccessSchema)
    .mutation(async ({ ctx, input }) => {
      const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;

      await ctx.db.insert(accessRequests).values({
        id: requestId,
        organizationId: input.organizationId,
        projectId: input.projectId,
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        message: input.message,
        status: "pending"
      });

      return { success: true, requestId };
    }),

  selectWorkspace: protectedProcedure
    .input(SelectWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({
          lastWorkspaceId: input.organizationId,
          updatedAt: new Date()
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  updateProfile: protectedProcedure
    .input(UpdateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({
          displayName: input.displayName,
          updatedAt: new Date()
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    })
});
