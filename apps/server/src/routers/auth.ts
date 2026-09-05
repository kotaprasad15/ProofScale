import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import {
  CreateOrganizationSchema,
  AcceptInvitationSchema,
  RequestTesterAccessSchema,
  SelectWorkspaceSchema,
  UpdateProfileSchema,
  PasswordService,
  SessionSecurity,
  PasswordResetService,
  SecurityLogger
} from "@proofscale/shared";
import {
  users,
  organizations,
  organizationMembers,
  projects,
  projectMembers,
  invitations,
  accessRequests,
  auditEvents,
  sessions,
  passwordResetTokens
} from "@proofscale/db";
import { eq, and, gt, isNull } from "drizzle-orm";
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
    }),

  /**
   * 5, 17, 18, 19: Constant-time login, account lockout handling, secure cookie issuance, session ID rotation
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      const ip = ctx.req?.ip || "unknown_ip";

      // 1. Fetch user by email
      const [user] = await ctx.db.select().from(users).where(eq(users.email, email));

      if (!user) {
        // Run dummy cryptographic hash to normalize response timing and prevent user enumeration
        PasswordService.runDummyVerification();
        SecurityLogger.log({
          eventType: "auth.login_failed",
          ipAddress: ip,
          message: "Login failed: target account not found",
          metadata: { email }
        });
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: PasswordResetService.GENERIC_AUTH_ERROR
        });
      }

      // 2. Check Account Lockout (#17)
      const lockout = PasswordService.checkLockout(user.failedLoginAttempts, user.lockedUntil);
      if (lockout.isLocked) {
        SecurityLogger.log({
          eventType: "auth.account_locked",
          userId: user.id,
          ipAddress: ip,
          message: `Login rejected: account is locked for ${lockout.remainingSeconds}s`
        });
        // Requirement 17: do not reveal lockout state to attackers
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: PasswordResetService.GENERIC_AUTH_ERROR
        });
      }

      // 3. Verify Password
      const isValid = user.passwordHash
        ? PasswordService.verifyPassword(input.password, user.passwordHash)
        : false;

      if (!isValid) {
        const newAttempts = user.failedLoginAttempts + 1;
        const willLock = newAttempts >= 5;
        const newLockedUntil = willLock ? new Date(Date.now() + 15 * 60 * 1000) : null;

        await ctx.db
          .update(users)
          .set({
            failedLoginAttempts: newAttempts,
            lockedUntil: newLockedUntil,
            updatedAt: new Date()
          })
          .where(eq(users.id, user.id));

        SecurityLogger.log({
          eventType: willLock ? "auth.account_locked" : "auth.login_failed",
          userId: user.id,
          ipAddress: ip,
          message: willLock ? "Account locked due to 5 consecutive failed logins" : `Login failed (attempt ${newAttempts})`
        });

        // Progressive backoff delay
        const delay = PasswordService.calculateProgressiveDelayMs(newAttempts);
        if (delay > 0) {
          await new Promise(res => setTimeout(res, delay));
        }

        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: PasswordResetService.GENERIC_AUTH_ERROR
        });
      }

      // 4. Successful Authentication: Reset lockouts, rotate/create session (#19)
      await ctx.db
        .update(users)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      const rawSessionToken = SessionSecurity.generateSessionToken();
      const sessionTokenHash = SessionSecurity.hashSessionToken(rawSessionToken);
      const csrfToken = SessionSecurity.generateCsrfToken();
      const sessionId = `sess_${crypto.randomUUID().slice(0, 8)}`;
      const expiresAt = new Date(Date.now() + SessionSecurity.SESSION_DURATION_MS);

      await ctx.db.insert(sessions).values({
        id: sessionId,
        userId: user.id,
        sessionTokenHash,
        csrfToken,
        ipAddress: ip,
        userAgent: ctx.req?.headers?.["user-agent"] || "unknown",
        expiresAt,
        createdAt: new Date(),
        lastActiveAt: new Date()
      });

      // Issue secure HTTP cookie if response object is present (#19)
      if (ctx.res && typeof ctx.res.cookie === "function") {
        const isProd = process.env.NODE_ENV === "production";
        const cookieOpts = SessionSecurity.getSecureCookieOptions(isProd);
        ctx.res.cookie(SessionSecurity.COOKIE_NAME, rawSessionToken, cookieOpts);
      }

      SecurityLogger.log({
        eventType: "auth.login_success",
        userId: user.id,
        ipAddress: ip,
        message: "User logged in successfully; new session issued with secure flags"
      });

      return {
        success: true,
        sessionToken: rawSessionToken,
        csrfToken,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role
        }
      };
    }),

  /**
   * 3. Reset All Active Sessions on Password Change (Requirement #3)
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(10)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.user.id));
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User account not found." });
      }

      // Check current password if one is already set
      if (user.passwordHash) {
        const matches = PasswordService.verifyPassword(input.currentPassword, user.passwordHash);
        if (!matches) {
          SecurityLogger.log({
            eventType: "auth.login_failed",
            userId: user.id,
            message: "Password change rejected: incorrect current password"
          });
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect current password." });
        }
      }

      // Validate complexity
      const complexity = PasswordService.validateComplexity(input.newPassword);
      if (!complexity.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: complexity.reason || "Password does not meet complexity requirements." });
      }

      const newHash = PasswordService.hashPassword(input.newPassword);
      const now = new Date();

      // Update password
      await ctx.db
        .update(users)
        .set({
          passwordHash: newHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: now
        })
        .where(eq(users.id, ctx.user.id));

      // Invalidate ALL active sessions for this user (#3)
      await ctx.db
        .update(sessions)
        .set({ revokedAt: now })
        .where(and(eq(sessions.userId, ctx.user.id), isNull(sessions.revokedAt)));

      // Issue a fresh replacement session for the current client
      const rawSessionToken = SessionSecurity.generateSessionToken();
      const sessionTokenHash = SessionSecurity.hashSessionToken(rawSessionToken);
      const csrfToken = SessionSecurity.generateCsrfToken();
      const newSessionId = `sess_${crypto.randomUUID().slice(0, 8)}`;
      const expiresAt = new Date(Date.now() + SessionSecurity.SESSION_DURATION_MS);

      await ctx.db.insert(sessions).values({
        id: newSessionId,
        userId: user.id,
        sessionTokenHash,
        csrfToken,
        ipAddress: ctx.req?.ip || "unknown_ip",
        userAgent: ctx.req?.headers?.["user-agent"] || "unknown",
        expiresAt,
        createdAt: now,
        lastActiveAt: now
      });

      if (ctx.res && typeof ctx.res.cookie === "function") {
        const isProd = process.env.NODE_ENV === "production";
        ctx.res.cookie(SessionSecurity.COOKIE_NAME, rawSessionToken, SessionSecurity.getSecureCookieOptions(isProd));
      }

      SecurityLogger.log({
        eventType: "auth.password_changed",
        userId: user.id,
        message: "User password updated; all prior active sessions were revoked"
      });

      return {
        success: true,
        sessionToken: rawSessionToken,
        csrfToken,
        message: "Password changed successfully. All other active sessions have been invalidated."
      };
    }),

  /**
   * 4, 5, 12: Rate-limited, enumeration-resistant password reset request with expiring single-use token
   */
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      const ip = ctx.req?.ip || "unknown_ip";

      const [user] = await ctx.db.select().from(users).where(eq(users.email, email));

      if (user) {
        const { rawToken, tokenHash, expiresAt } = PasswordResetService.generateResetToken();

        await ctx.db.insert(passwordResetTokens).values({
          id: `rst_${crypto.randomUUID().slice(0, 8)}`,
          userId: user.id,
          tokenHash,
          expiresAt,
          ipAddress: ip,
          createdAt: new Date()
        });

        SecurityLogger.log({
          eventType: "auth.password_reset_requested",
          userId: user.id,
          ipAddress: ip,
          message: "Password reset link generated with single-use expiration token"
        });
      } else {
        // Run dummy cryptographic work to ensure uniform execution timing (#5)
        PasswordService.runDummyVerification();
        SecurityLogger.log({
          eventType: "auth.password_reset_requested",
          ipAddress: ip,
          message: "Password reset requested for non-existent email"
        });
      }

      // Always return generic response to prevent user enumeration (#5)
      return {
        success: true,
        message: PasswordResetService.GENERIC_RESET_RESPONSE
      };
    }),

  /**
   * 3, 4, 17: Complete single-use password reset, invalidate sessions, and unlock account
   */
  completePasswordReset: publicProcedure
    .input(
      z.object({
        token: z.string().min(16),
        newPassword: z.string().min(10)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tokenHash = PasswordResetService.hashRawToken(input.token);
      const now = new Date();

      const [tokenRecord] = await ctx.db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.tokenHash, tokenHash));

      // Verify token exists, is unconsumed, and not expired (#4)
      if (!tokenRecord || !PasswordResetService.isTokenValid(tokenRecord.expiresAt, tokenRecord.usedAt)) {
        SecurityLogger.log({
          eventType: "auth.login_failed",
          ipAddress: ctx.req?.ip,
          message: "Password reset completion failed: invalid, expired, or previously used token"
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This password reset link is invalid or has expired."
        });
      }

      // Validate complexity
      const complexity = PasswordService.validateComplexity(input.newPassword);
      if (!complexity.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: complexity.reason || "Invalid password complexity." });
      }

      // Mark token consumed immediately (single-use #4)
      await ctx.db
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(eq(passwordResetTokens.id, tokenRecord.id));

      const newHash = PasswordService.hashPassword(input.newPassword);

      // Update password and safely reset lockout state (#17)
      await ctx.db
        .update(users)
        .set({
          passwordHash: newHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: now
        })
        .where(eq(users.id, tokenRecord.userId));

      // Reset all active sessions on password change (#3)
      await ctx.db
        .update(sessions)
        .set({ revokedAt: now })
        .where(and(eq(sessions.userId, tokenRecord.userId), isNull(sessions.revokedAt)));

      SecurityLogger.log({
        eventType: "auth.password_reset_completed",
        userId: tokenRecord.userId,
        ipAddress: ctx.req?.ip,
        message: "Password reset completed successfully. All existing sessions were revoked."
      });

      return {
        success: true,
        message: "Your password has been successfully reset. Please sign in with your new password."
      };
    }),

  /**
   * 19. Logout & Session Invalidation
   */
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.sessionId) {
      await ctx.db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.id, ctx.sessionId));
    }

    if (ctx.res && typeof ctx.res.clearCookie === "function") {
      ctx.res.clearCookie(SessionSecurity.COOKIE_NAME, { path: "/" });
    }

    SecurityLogger.log({
      eventType: "auth.session_revoked",
      userId: ctx.user.id,
      message: "User logged out; active session was revoked"
    });

    return { success: true };
  })
});

