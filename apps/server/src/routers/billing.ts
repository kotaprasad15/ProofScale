import { router, tenantProcedure } from "../trpc.js";
import { PricingEngine, SecurityLogger } from "@proofscale/shared";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import crypto from "node:crypto";

export const billingRouter = router({
  /**
   * 8. Server-side quote calculation (Client prices/totals are NEVER trusted)
   */
  calculateQuote: tenantProcedure
    .input(
      z.object({
        planId: z.string(),
        addOnIds: z.array(z.string()).optional(),
        discountCode: z.string().optional(),
        quantity: z.number().int().min(1).max(100).optional()
      })
    )
    .query(({ input }) => {
      try {
        return PricingEngine.calculateOrder({
          planId: input.planId,
          addOnIds: input.addOnIds,
          discountCode: input.discountCode,
          quantity: input.quantity
        });
      } catch (err: any) {
        throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
      }
    }),

  /**
   * 8. Create verified checkout session calculated exclusively on the server
   */
  createCheckoutSession: tenantProcedure
    .input(
      z.object({
        planId: z.string(),
        addOnIds: z.array(z.string()).optional(),
        discountCode: z.string().optional(),
        quantity: z.number().int().min(1).max(100).optional(),
        // Note: If client attempts to send clientSuppliedPrice or clientTotal, we explicitly ignore it
        clientSuppliedPrice: z.number().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Calculate authoritative order totals exclusively on the server
      const order = PricingEngine.calculateOrder({
        planId: input.planId,
        addOnIds: input.addOnIds,
        discountCode: input.discountCode,
        quantity: input.quantity
      });

      const checkoutSessionId = `cs_${crypto.randomUUID().slice(0, 16)}`;

      SecurityLogger.log({
        eventType: "admin.action",
        userId: ctx.user.id,
        organizationId: ctx.organizationId,
        message: `Checkout session created for plan '${order.planId}' with server-verified total $${(order.totalCents / 100).toFixed(2)}`,
        metadata: {
          sessionId: checkoutSessionId,
          totalCents: order.totalCents,
          discountAppliedCents: order.discountAppliedCents
        }
      });

      return {
        sessionId: checkoutSessionId,
        order,
        checkoutUrl: `https://checkout.proofscale.dev/pay/${checkoutSessionId}`
      };
    })
});
