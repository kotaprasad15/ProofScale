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
import { EmailCodeManager } from "../services/EmailCodeManager.js";
import { OtpRateLimiter } from "../services/OtpRateLimiter.js";
import { NotificationFanOutService } from "../services/notifications/NotificationFanOutService.js";

const GENERIC_INVALID_CODE = "Invalid or expired code.";

async function consumeOtpRequestAllowance(email: string, ip: string): Promise<void> {
  try {
    const allowed = await OtpRateLimiter.consume(email, ip);
    if (allowed) return;
  } catch (error) {
    // Do not issue security codes if the production rate limiter is unavailable.
    SecurityLogger.log({
      eventType: "rate_limit.exceeded",
      ipAddress: ip,
      message: "OTP request rejected because rate-limit infrastructure was unavailable"
    });
  }
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: "Too many code requests. Please try again in 15 minutes."
  });
}

async function resetPasswordWithToken(ctx: any, resetToken: string, newPassword: string) {
  const tokenHash = PasswordResetService.hashRawToken(resetToken);
  const now = new Date();
  const [tokenRecord] = await ctx.db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash));

  if (!tokenRecord || !PasswordResetService.isTokenValid(tokenRecord.expiresAt, tokenRecord.usedAt)) {
    SecurityLogger.log({
      eventType: "auth.login_failed",
      ipAddress: ctx.req?.ip,
      message: "Password reset completion failed: invalid, expired, or previously used token"
    });
    throw new TRPCError({ code: "BAD_REQUEST", message: "This password reset token is invalid or has expired." });
  }

  const complexity = PasswordService.validateComplexity(newPassword);
  if (!complexity.valid) {
    throw new TRPCError({ code: "BAD_REQUEST", message: complexity.reason || "Invalid password complexity." });
  }

  const [user] = await ctx.db.select().from(users).where(eq(users.id, tokenRecord.userId));
  if (!user) throw new TRPCError({ code: "BAD_REQUEST", message: "This password reset token is invalid or has expired." });

  await (ctx.db as any).transaction(async (tx: any) => {
    // One-time use is consumed before the password is changed, preventing replay.
    const consumed = await tx.update(passwordResetTokens).set({ usedAt: now })
      .where(and(eq(passwordResetTokens.id, tokenRecord.id), isNull(passwordResetTokens.usedAt)))
      .returning({ id: passwordResetTokens.id });
    if (!consumed[0]) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This password reset token is invalid or has expired." });
    }
    await tx.update(users).set({
      passwordHash: PasswordService.hashPassword(newPassword),
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: now
    }).where(eq(users.id, tokenRecord.userId));
    await tx.update(sessions).set({ revokedAt: now })
      .where(and(eq(sessions.userId, tokenRecord.userId), isNull(sessions.revokedAt)));
  });

  SecurityLogger.log({
    eventType: "auth.password_reset_completed",
    userId: tokenRecord.userId,
    ipAddress: ctx.req?.ip,
    message: "Password reset completed successfully. All existing sessions were revoked."
  });

  // Notification delivery must not roll back an already-secure password reset.
  await NotificationFanOutService.notifyPasswordChanged(tokenRecord.userId, user.email).catch(() => {
    SecurityLogger.log({
      eventType: "auth.password_reset_completed",
      userId: tokenRecord.userId,
      message: "Password reset completed but password-changed email delivery failed"
    });
  });

  return { success: true, message: "Your password has been successfully reset. Please sign in with your new password." };
}


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
   * Real-time check if email is already registered
   */
  checkEmailAvailability: publicProcedure
    .input(
      z.object({
        email: z.string().email()
      })
    )
    .query(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      const [existing] = await ctx.db.select().from(users).where(eq(users.email, email));
      return {
        exists: !!existing,
        message: existing ? "already this email exists" : "Email is available"
      };
    }),

  /**
   * Sign up new user with email, password, confirmPassword (encrypted in Supabase)
   */
  signup: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(10, "Password must be at least 10 characters long"),
        confirmPassword: z.string().min(1, "Password confirmation is required"),
        displayName: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      const ip = ctx.req?.ip || "unknown_ip";

      // 1. Validate password === confirmPassword
      if (input.password !== input.confirmPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Passwords do not match."
        });
      }

      // 2. Validate Password Complexity
      const complexity = PasswordService.validateComplexity(input.password);
      if (!complexity.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: complexity.reason || "Password does not meet complexity requirements."
        });
      }

      // 3. Check if user already exists
      const [existing] = await ctx.db.select().from(users).where(eq(users.email, email));
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "already this email exists"
        });
      }

      await consumeOtpRequestAllowance(email, ip);

      // 4. Hash password with salted scrypt (strong cryptographic hashing)
      const passwordHash = PasswordService.hashPassword(input.password);
      const userId = `usr_${crypto.randomUUID().slice(0, 8)}`;
      const displayName = input.displayName?.trim() || email.split("@")[0];

      // 5. Insert new user into database (Supabase PostgreSQL)
      await ctx.db.insert(users).values({
        id: userId,
        email,
        displayName,
        role: "member",
        onboardingStatus: "required", // User must create an org or join an org next
        passwordHash,
        emailVerifiedAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null
      });

      // 6. Verification is required before a session can be issued.
      await EmailCodeManager.issue({ email, userId, purpose: "signup_verification", requestIp: ip });

      // 8. Log security event
      SecurityLogger.log({
        eventType: "auth.login_success",
        userId,
        ipAddress: ip,
        message: "New user registered; email verification code issued before session creation"
      });

      return {
        success: true,
        verificationRequired: true,
        user: {
          id: userId,
          email,
          displayName,
          role: "member",
          onboardingStatus: "required",
          lastWorkspaceId: null
        }
      };
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
      const isDemoAccount = email === "lead@acme.dev" || email === "qa.tester@acme.dev";

      // 1. Fetch user by email
      let [user] = await ctx.db.select().from(users).where(eq(users.email, email));

      // Self-heal demo account if missing or without password hash
      if (isDemoAccount) {
        const demoPasswordHash = PasswordService.hashPassword("Password123!Secure");
        if (!user) {
          const demoUserId = email === "lead@acme.dev" ? "usr_admin_01" : "usr_tester_01";
          const demoName = email === "lead@acme.dev" ? "Alex Rivera (Org Owner)" : "Sam Taylor (Tester)";
          const demoRole = email === "lead@acme.dev" ? "admin" : "member";
          await ctx.db.insert(users).values({
            id: demoUserId,
            email,
            displayName: demoName,
            role: demoRole,
            onboardingStatus: "completed",
            lastWorkspaceId: "org_default_01",
            passwordHash: demoPasswordHash,
            failedLoginAttempts: 0,
            lockedUntil: null
          }).onConflictDoNothing();
          [user] = await ctx.db.select().from(users).where(eq(users.email, email));
        } else if (!user.passwordHash) {
          await ctx.db.update(users).set({
            passwordHash: demoPasswordHash,
            failedLoginAttempts: 0,
            lockedUntil: null
          }).where(eq(users.id, user.id));
          user.passwordHash = demoPasswordHash;
          user.failedLoginAttempts = 0;
          user.lockedUntil = null;
        }
        if (user && !user.emailVerifiedAt) {
          await ctx.db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
            .where(eq(users.id, user.id));
          user.emailVerifiedAt = new Date();
        }
      }

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
      // Public demo accounts with correct demo credentials bypass denial so one visitor cannot lock the demo for all users
      const isDemoWithValidPassword = isDemoAccount && (input.password === "Password123!Secure" || (user.passwordHash ? PasswordService.verifyPassword(input.password, user.passwordHash) : false));

      const lockout = PasswordService.checkLockout(user.failedLoginAttempts, user.lockedUntil);
      if (lockout.isLocked && !isDemoWithValidPassword) {
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
      const isValid = isDemoWithValidPassword || (user.passwordHash
        ? PasswordService.verifyPassword(input.password, user.passwordHash)
        : false);

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
      if (!user.emailVerifiedAt) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Please verify your email address before signing in."
        });
      }

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
        eventType: "auth.email_verification_requested",
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
          role: user.role,
          onboardingStatus: user.onboardingStatus,
          lastWorkspaceId: user.lastWorkspaceId
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

      await consumeOtpRequestAllowance(email, ip);

      const [user] = await ctx.db.select().from(users).where(eq(users.email, email));

      if (user) {
        // A fresh recovery request supersedes any previously issued reset token too.
        await ctx.db.update(passwordResetTokens).set({ usedAt: new Date() })
          .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
        await EmailCodeManager.issue({ email, userId: user.id, purpose: "password_reset", requestIp: ip });

        SecurityLogger.log({
          eventType: "auth.password_reset_requested",
          userId: user.id,
          ipAddress: ip,
          message: "Password reset OTP issued with 10-minute expiration"
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

  verifyResetCode: publicProcedure
    .input(z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/) }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      const result = await EmailCodeManager.consumeIfValid(email, "password_reset", input.code);
      if (!result?.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: GENERIC_INVALID_CODE });
      }
      const userId = result.userId;

      const now = new Date();
      const { rawToken, tokenHash, expiresAt } = PasswordResetService.generateResetToken();
      await (ctx.db as any).transaction(async (tx: any) => {
        await tx.update(passwordResetTokens).set({ usedAt: now })
          .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
        await tx.insert(passwordResetTokens).values({
          id: `rst_${crypto.randomUUID().slice(0, 12)}`,
          userId,
          tokenHash,
          expiresAt,
          ipAddress: ctx.req?.ip || "unknown_ip",
          createdAt: now
        });
      });
      return { success: true, resetToken: rawToken };
    }),

  resetPassword: publicProcedure
    .input(z.object({ resetToken: z.string().min(16), newPassword: z.string().min(10) }))
    .mutation(async ({ ctx, input }) => resetPasswordWithToken(ctx, input.resetToken, input.newPassword)),

  verifyEmail: publicProcedure
    .input(z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/) }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      const result = await EmailCodeManager.consumeIfValid(email, "signup_verification", input.code);
      if (!result?.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: GENERIC_INVALID_CODE });
      }
      const userId = result.userId;
      await ctx.db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, userId));
      SecurityLogger.log({
        eventType: "auth.email_verified",
        userId,
        ipAddress: ctx.req?.ip,
        message: "Email address verified successfully"
      });
      return { success: true };
    }),

  resendVerificationEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      const ip = ctx.req?.ip || "unknown_ip";
      await consumeOtpRequestAllowance(email, ip);
      const [user] = await ctx.db.select().from(users).where(eq(users.email, email));
      if (user && !user.emailVerifiedAt) {
        await EmailCodeManager.issue({ email, userId: user.id, purpose: "signup_verification", requestIp: ip });
      } else {
        PasswordService.runDummyVerification();
      }
      return { success: true, message: "If an account needs verification, we've sent a code." };
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
    .mutation(async ({ ctx, input }) => resetPasswordWithToken(ctx, input.token, input.newPassword)),

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
