export interface PlanTier {
  id: string;
  name: string;
  basePriceCents: number;
  monthlyTestRuns: number;
  maxVirtualUsers: number;
}

export interface AddOnItem {
  id: string;
  name: string;
  priceCents: number;
}

export interface OrderCalculationInput {
  planId: string;
  addOnIds?: string[];
  discountCode?: string;
  quantity?: number;
}

export interface OrderCalculationResult {
  planId: string;
  planName: string;
  basePriceCents: number;
  addOns: { id: string; name: string; priceCents: number }[];
  addOnsTotalCents: number;
  discountAppliedCents: number;
  discountCode?: string;
  subtotalCents: number;
  totalCents: number;
  currency: "usd";
}

export class PricingEngine {
  // Authoritative server-side plan definitions
  public static readonly PLANS: Record<string, PlanTier> = {
    starter: {
      id: "starter",
      name: "Starter Workspace",
      basePriceCents: 4900, // $49.00
      monthlyTestRuns: 100,
      maxVirtualUsers: 50
    },
    growth: {
      id: "growth",
      name: "Growth Team",
      basePriceCents: 14900, // $149.00
      monthlyTestRuns: 500,
      maxVirtualUsers: 250
    },
    enterprise: {
      id: "enterprise",
      name: "Enterprise Dedicated",
      basePriceCents: 49900, // $499.00
      monthlyTestRuns: 5000,
      maxVirtualUsers: 2000
    }
  };

  // Authoritative server-side add-on catalog
  public static readonly ADD_ONS: Record<string, AddOnItem> = {
    extra_runs_500: {
      id: "extra_runs_500",
      name: "500 Additional Test Executions",
      priceCents: 2900 // $29.00
    },
    extra_vus_200: {
      id: "extra_vus_200",
      name: "200 Extra Virtual Users Envelope",
      priceCents: 3900 // $39.00
    },
    extended_retention_90d: {
      id: "extended_retention_90d",
      name: "90-Day Evidence & Artifact Retention",
      priceCents: 1900 // $19.00
    }
  };

  // Server-side discount codes
  private static readonly DISCOUNTS: Record<string, { type: "percent" | "fixed"; value: number }> = {
    SECURITY20: { type: "percent", value: 20 }, // 20% discount
    FOUNDER10: { type: "fixed", value: 1000 }, // $10.00 discount
    PROOFSCALE50: { type: "percent", value: 50 } // 50% discount
  };

  /**
   * Calculates order totals strictly from server catalog.
   * Rejects any client-supplied totals or pricing amounts.
   */
  static calculateOrder(input: OrderCalculationInput): OrderCalculationResult {
    const plan = this.PLANS[input.planId];
    if (!plan) {
      throw new Error(`Invalid plan identifier '${input.planId}'. Must be one of: ${Object.keys(this.PLANS).join(", ")}`);
    }

    const quantity = Math.max(1, Math.min(100, Math.floor(input.quantity || 1)));
    const basePriceCents = plan.basePriceCents * quantity;

    // Resolve add-ons against authoritative catalog
    const resolvedAddOns: { id: string; name: string; priceCents: number }[] = [];
    let addOnsTotalCents = 0;

    if (input.addOnIds && Array.isArray(input.addOnIds)) {
      for (const addOnId of input.addOnIds) {
        const item = this.ADD_ONS[addOnId];
        if (item) {
          resolvedAddOns.push(item);
          addOnsTotalCents += item.priceCents;
        }
      }
    }

    const subtotalCents = basePriceCents + addOnsTotalCents;

    // Apply server-verified discount
    let discountAppliedCents = 0;
    let validDiscountCode: string | undefined;

    if (input.discountCode) {
      const cleanCode = input.discountCode.trim().toUpperCase();
      const promo = this.DISCOUNTS[cleanCode];
      if (promo) {
        validDiscountCode = cleanCode;
        if (promo.type === "percent") {
          discountAppliedCents = Math.round((subtotalCents * promo.value) / 100);
        } else if (promo.type === "fixed") {
          discountAppliedCents = Math.min(subtotalCents, promo.value);
        }
      }
    }

    const totalCents = Math.max(0, subtotalCents - discountAppliedCents);

    return {
      planId: plan.id,
      planName: plan.name,
      basePriceCents,
      addOns: resolvedAddOns,
      addOnsTotalCents,
      discountAppliedCents,
      discountCode: validDiscountCode,
      subtotalCents,
      totalCents,
      currency: "usd"
    };
  }
}
