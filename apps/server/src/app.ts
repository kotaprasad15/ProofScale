import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./routers/index.js";
import { createContext } from "./context.js";
import {
  hstsSecurityHeaders,
  configureCorsOrigins,
  preventSensitiveFileExposure,
  verifyCsrfProtection,
  parseCookies
} from "./middleware/securityMiddleware.js";
import {
  PaymentWebhookValidator,
  UploadValidator,
  SecurityLogger,
  SessionSecurity
} from "@proofscale/shared";
import { db, processedWebhooks, sessions } from "@proofscale/db";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

export function createApp() {
  const app = express();

  // 1. HSTS and Defense-in-Depth Security Headers (#1)
  app.use(hstsSecurityHeaders);

  // 14. Locked-Down CORS to exact origins (#14)
  app.use(configureCorsOrigins());

  // 15. Disable directory listing & block sensitive file access (#15)
  app.use(preventSensitiveFileExposure);

  // 2. CSRF token verification middleware on mutating requests (#2)
  app.use(verifyCsrfProtection);

  // 7 & 11. Payment Webhook with raw 256KB body parsing (#7, #11)
  app.post(
    "/api/webhooks/payment",
    express.raw({ type: "application/json", limit: "256kb" }),
    async (req, res) => {
      const sigRaw = req.headers["stripe-signature"] || req.headers["x-webhook-signature"];
      const signatureHeader = Array.isArray(sigRaw) ? sigRaw[0] : sigRaw;
      const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || "whsec_test_secret_for_validation";



      const rawBody = req.body;
      const validation = PaymentWebhookValidator.verifyWebhook(
        rawBody,
        signatureHeader,
        webhookSecret
      );

      if (!validation.valid) {
        SecurityLogger.log({
          eventType: validation.error?.includes("replay") ? "webhook.replay_rejected" : "webhook.signature_failed",
          ipAddress: req.ip,
          message: `Payment webhook verification failed: ${validation.error}`
        });
        return res.status(400).json({ error: validation.error });
      }

      const eventId = validation.eventId!;
      const payloadHash = crypto
        .createHash("sha256")
        .update(typeof rawBody === "string" ? rawBody : rawBody.toString("utf8"))
        .digest("hex");

      // Idempotency check: Reject duplicate / replayed events
      try {
        const [existing] = await db
          .select()
          .from(processedWebhooks)
          .where(eq(processedWebhooks.eventId, eventId));

        if (existing) {
          SecurityLogger.log({
            eventType: "webhook.processed",
            ipAddress: req.ip,
            message: `Webhook event '${eventId}' already processed (idempotent duplicate)`
          });
          return res.status(200).json({ received: true, idempotentDuplicate: true });
        }

        // Record processed webhook event
        await db.insert(processedWebhooks).values({
          id: `wh_${crypto.randomUUID().slice(0, 8)}`,
          eventId,
          provider: "stripe",
          payloadHash,
          processedAt: new Date()
        });

        SecurityLogger.log({
          eventType: "webhook.processed",
          ipAddress: req.ip,
          message: `Payment webhook event '${eventId}' processed successfully`
        });

        return res.status(200).json({ received: true, eventId });
      } catch (err: any) {
        return res.status(500).json({ error: "Failed to persist webhook idempotency status." });
      }
    }
  );

  // 6 & 11. Secure File Upload with 10MB raw limit, signature & MIME validation (#6, #11)
  app.post(
    "/api/uploads",
    express.raw({ type: "*/*", limit: "10mb" }),
    async (req, res) => {
      const filenameHeader = (req.headers["x-file-name"] as string) || "unnamed_upload.bin";
      const rawMime = req.headers["content-type"];
      const claimedMime = Array.isArray(rawMime) ? rawMime[0] : (rawMime || "application/octet-stream");
      const buffer = req.body as Buffer;


      if (!buffer || !Buffer.isBuffer(buffer)) {
        return res.status(400).json({ error: "Missing or invalid binary file body." });
      }

      const result = UploadValidator.validateUpload(buffer, filenameHeader, claimedMime);

      if (!result.valid) {
        SecurityLogger.log({
          eventType: "upload.rejected",
          ipAddress: req.ip,
          message: `Upload rejected: ${result.error}`,
          metadata: { filename: filenameHeader, size: buffer.length }
        });
        return res.status(400).json({ error: result.error });
      }

      SecurityLogger.log({
        eventType: "upload.accepted",
        ipAddress: req.ip,
        message: `Upload validated and accepted: ${result.sanitizedFilename}`,
        metadata: { objectKey: result.objectKey, mime: result.detectedMimeType, size: buffer.length }
      });

      return res.status(201).json({
        success: true,
        objectKey: result.objectKey,
        sanitizedFilename: result.sanitizedFilename,
        mimeType: result.detectedMimeType,
        sizeBytes: buffer.length
      });
    }
  );

  // 11. Global JSON Body Parser limited to 100KB (#11)
  app.use(express.json({ limit: "100kb" }));

  // 2. CSRF Token Issuance Endpoint (#2)
  app.get("/api/csrf-token", async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies[SessionSecurity.COOKIE_NAME];

    if (sessionToken) {
      const hash = SessionSecurity.hashSessionToken(sessionToken);
      const [sess] = await db.select().from(sessions).where(eq(sessions.sessionTokenHash, hash));
      if (sess && !sess.revokedAt) {
        return res.json({ csrfToken: sess.csrfToken });
      }
    }

    // Guest or pre-login CSRF token
    const guestCsrf = SessionSecurity.generateCsrfToken();
    return res.json({ csrfToken: guestCsrf });
  });

  // Mount tRPC API handler
  app.use(
    "/trpc",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );

  // REST Health Check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "Ratecap Control Plane API" });
  });

  // 11. Global Payload Too Large error handler (#11)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && (err.type === "entity.too.large" || err.status === 413)) {
      SecurityLogger.log({
        eventType: "rate_limit.exceeded",
        ipAddress: req.ip,
        message: `Payload Too Large rejected: ${err.message}`
      });
      return res.status(413).json({ error: "Payload Too Large: Request body exceeds maximum allowable limit." });
    }
    next(err);
  });

  return app;
}
