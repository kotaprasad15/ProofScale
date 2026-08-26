import { initTRPC, TRPCError } from "@trpc/server";
import { Context } from "./context.js";
import { CapabilityName } from "@proofscale/shared";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Ensures user is logged in
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this operation."
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});

// Ensures user has completed onboarding
export const onboardedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.onboardingStatus === "required") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Account onboarding required before accessing workspace features."
    });
  }
  return next({ ctx });
});

// Ensures user belongs to the active organization
export const tenantProcedure = onboardedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.organizationId || !ctx.orgRole) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have an active membership in this organization."
    });
  }
  return next({
    ctx: {
      ...ctx,
      organizationId: ctx.organizationId,
      orgRole: ctx.orgRole
    }
  });
});

// Middleware helper to require specific organization capability
export function requireOrgPermission(capability: CapabilityName) {
  return tenantProcedure.use(async ({ ctx, next }) => {
    if (!ctx.permissions[capability]) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Insufficient permissions: '${capability}' capability required.`
      });
    }
    return next({ ctx });
  });
}

// Middleware helper to require specific project capability
export function requireProjectPermission(capability: CapabilityName) {
  return tenantProcedure.use(async ({ ctx, next }) => {
    if (!ctx.permissions[capability]) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Insufficient permissions: '${capability}' capability required.`
      });
    }
    return next({ ctx });
  });
}
