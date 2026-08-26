import { router, tenantProcedure, requireOrgPermission, onboardedProcedure } from "../trpc.js";
import {
  CreateOrganizationSchema,
  InviteMemberSchema,
  ChangeMemberRoleSchema
} from "@proofscale/shared";
import { organizations, organizationMembers, invitations, auditEvents } from "@proofscale/db";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "node:crypto";
import { z } from "zod";

export const organizationsRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(organizations);
  }),

  listMine: onboardedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db
      .select({
        organization: organizations,
        membership: organizationMembers
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(
        and(
          eq(organizationMembers.userId, ctx.user.id),
          eq(organizationMembers.status, "active")
        )
      );

    return memberships.map(m => ({
      ...m.organization,
      role: m.membership.role
    }));
  }),

  create: onboardedProcedure
    .input(CreateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = `org_${crypto.randomUUID().slice(0, 8)}`;
      const slug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      const [org] = await ctx.db
        .insert(organizations)
        .values({
          id: orgId,
          name: input.name,
          slug,
          ownerId: ctx.user.id,
          ownerUserId: ctx.user.id,
          status: "active"
        })
        .returning();

      await ctx.db.insert(organizationMembers).values({
        id: `mem_${crypto.randomUUID().slice(0, 8)}`,
        organizationId: orgId,
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        role: "owner",
        status: "active"
      });

      return org;
    }),

  listMembers: tenantProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, ctx.organizationId),
          eq(organizationMembers.status, "active")
        )
      );
  }),

  inviteMember: requireOrgPermission("manageMembers")
    .input(InviteMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const rawToken = `ps_inv_${crypto.randomBytes(24).toString("hex")}`;
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      const inviteId = `inv_${crypto.randomUUID().slice(0, 8)}`;

      await ctx.db.insert(invitations).values({
        id: inviteId,
        organizationId: input.organizationId,
        projectId: input.projectId,
        email: input.email,
        role: input.role,
        tokenHash,
        invitedByUserId: ctx.user.id,
        expiresAt
      });

      // Audit Log
      await ctx.db.insert(auditEvents).values({
        id: `audit_${crypto.randomUUID().slice(0, 8)}`,
        actorUserId: ctx.user.id,
        organizationId: input.organizationId,
        action: "organization.member_invited",
        subject: `Invited '${input.email}' as '${input.role}'`
      });

      return {
        inviteId,
        rawToken,
        expiresAt: expiresAt.toISOString()
      };
    }),

  changeMemberRole: requireOrgPermission("manageMembers")
    .input(ChangeMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const [targetMember] = await ctx.db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.id, input.memberId),
            eq(organizationMembers.organizationId, input.organizationId)
          )
        );

      if (!targetMember) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
      }

      if (targetMember.role === "owner" && ctx.orgRole !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the organization owner can change an owner's role." });
      }

      await ctx.db
        .update(organizationMembers)
        .set({ role: input.newRole })
        .where(eq(organizationMembers.id, input.memberId));

      return { success: true };
    }),

  transferOwnership: requireOrgPermission("manageOrganization")
    .input(z.object({ newOwnerUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [newOwnerMember] = await ctx.db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, ctx.organizationId),
            eq(organizationMembers.userId, input.newOwnerUserId),
            eq(organizationMembers.status, "active")
          )
        );

      if (!newOwnerMember) {
        throw new TRPCError({ code: "NOT_FOUND", message: "New owner must be an active member of the organization." });
      }

      // Update organization owner
      await ctx.db
        .update(organizations)
        .set({
          ownerId: input.newOwnerUserId,
          ownerUserId: input.newOwnerUserId,
          updatedAt: new Date()
        })
        .where(eq(organizations.id, ctx.organizationId));

      // Promote new owner
      await ctx.db
        .update(organizationMembers)
        .set({ role: "owner" })
        .where(eq(organizationMembers.id, newOwnerMember.id));

      // Demote previous owner to admin
      await ctx.db
        .update(organizationMembers)
        .set({ role: "admin" })
        .where(
          and(
            eq(organizationMembers.organizationId, ctx.organizationId),
            eq(organizationMembers.userId, ctx.user.id)
          )
        );

      return { success: true };
    })
});
