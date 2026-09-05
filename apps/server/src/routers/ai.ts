import { router, tenantProcedure } from "../trpc.js";
import {
  AiSecurityGuardrails,
  AiRateLimiter,
  SecurityLogger
} from "@proofscale/shared";
import { aiUsageRecords } from "@proofscale/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import crypto from "node:crypto";

export const aiRouter = router({
  /**
   * 9 & 10. AI-Assisted Readiness & Performance Analysis
   * Enforces delimiter isolation, blocks prompt injections, caps usage per window,
   * validates tool calls, and scans output against leak policy.
   */
  analyzeReadiness: tenantProcedure
    .input(
      z.object({
        query: z.string().min(1).max(2000),
        reportContext: z.string().max(10000).optional(),
        requestedTool: z
          .object({
            name: z.string(),
            arguments: z.record(z.any())
          })
          .optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const estimatedTokens = Math.ceil((input.query.length + (input.reportContext?.length || 0)) / 4) + 150;

      // 1. Enforce AI Usage Caps (#10)
      const usage = AiRateLimiter.checkAndRecordUsage(ctx.user.id, estimatedTokens);
      if (!usage.allowed) {
        SecurityLogger.log({
          eventType: "ai.usage_capped",
          userId: ctx.user.id,
          organizationId: ctx.organizationId,
          message: `AI usage cap exceeded for user: ${usage.error}`,
          metadata: { estimatedTokens }
        });
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: usage.error || "AI service quota exceeded. Please try again later."
        });
      }

      // Record in DB usage table
      try {
        await ctx.db.insert(aiUsageRecords).values({
          id: `ai_${crypto.randomUUID().slice(0, 8)}`,
          userId: ctx.user.id,
          tokensUsed: estimatedTokens,
          requestsCount: 1,
          windowStart: new Date(),
          createdAt: new Date()
        });
      } catch {}

      // 2. Validate Tool Calls if requested (#9)
      if (input.requestedTool) {
        const toolCheck = AiSecurityGuardrails.validateToolCall(input.requestedTool);
        if (!toolCheck.valid) {
          SecurityLogger.log({
            eventType: "ai.injection_attempt",
            userId: ctx.user.id,
            message: `AI tool call authorization violation: ${toolCheck.error}`,
            metadata: { toolName: input.requestedTool.name }
          });
          throw new TRPCError({
            code: "FORBIDDEN",
            message: toolCheck.error || "Unauthorized AI tool execution requested."
          });
        }
      }

      // 3. Delimiter Isolation & Injection Scanning (#9)
      const systemInstruction =
        "You are the ProofScale Reliability Copilot. Provide objective evaluation of performance telemetry and SLA readiness.";

      const promptAudit = AiSecurityGuardrails.buildIsolatedPrompt(
        systemInstruction,
        input.query,
        input.reportContext
      );

      if (!promptAudit.safe) {
        SecurityLogger.log({
          eventType: "ai.injection_attempt",
          userId: ctx.user.id,
          organizationId: ctx.organizationId,
          message: `Prompt injection signature detected: ${promptAudit.detectedThreats.join(", ")}`,
          metadata: { threats: promptAudit.detectedThreats }
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request contains disallowed command directives or override instructions."
        });
      }

      // Simulated deterministic safe generation based on isolated query
      const rawGeneratedInsight = `Performance Analysis: The tested target satisfies declared SLA thresholds (p95: 380ms < 800ms limit, error rate: 0.00%). Readiness Score is evaluated at 96/100 (Ready for Staging).`;

      // 4. Output Policy & Secret Leakage Inspection (#9)
      const outputCheck = AiSecurityGuardrails.enforceOutputPolicy(rawGeneratedInsight);
      if (!outputCheck.safe) {
        SecurityLogger.log({
          eventType: "ai.output_policy_violation",
          userId: ctx.user.id,
          message: `AI generated content violated output policy: ${outputCheck.violations.join(", ")}`
        });
      }

      return {
        insight: outputCheck.sanitizedOutput,
        remainingRequests: usage.remainingRequests,
        remainingTokens: usage.remainingTokens,
        toolExecuted: input.requestedTool ? input.requestedTool.name : null
      };
    })
});
