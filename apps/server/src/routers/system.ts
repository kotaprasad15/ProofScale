import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { PresetDefinitions, SCORING_VERSION, SAFETY_CAPS, KillSwitch } from "@proofscale/shared";
import { z } from "zod";

export const systemRouter = router({
  health: publicProcedure.query(() => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "ProofScale Control Plane API",
      scoringVersion: SCORING_VERSION,
      killSwitchActive: KillSwitch.isActivated()
    };
  }),

  presets: publicProcedure.query(() => {
    return PresetDefinitions;
  }),

  limits: publicProcedure.query(() => {
    return SAFETY_CAPS;
  }),

  killSwitchStatus: publicProcedure.query(() => {
    return KillSwitch.getState();
  }),

  toggleKillSwitch: protectedProcedure
    .input(z.object({
      enabled: z.boolean(),
      reason: z.string().max(250).optional()
    }))
    .mutation(({ ctx, input }) => {
      if (input.enabled) {
        return KillSwitch.activate(input.reason || "Emergency system operation", ctx.user.email);
      } else {
        return KillSwitch.deactivate();
      }
    })
});
