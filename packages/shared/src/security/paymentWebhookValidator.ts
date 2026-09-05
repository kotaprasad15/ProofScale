import crypto from "node:crypto";

export interface WebhookValidationResult {
  valid: boolean;
  error?: string;
  parsedPayload?: any;
  eventId?: string;
}

export class PaymentWebhookValidator {
  public static readonly REPLAY_TOLERANCE_SECONDS = 300; // 5 minutes

  /**
   * Computes the HMAC-SHA256 signature for a raw payload string.
   */
  static computeSignature(payload: string, secret: string, timestamp?: number | string): string {
    const dataToSign = timestamp !== undefined ? `${timestamp}.${payload}` : payload;
    return crypto.createHmac("sha256", secret).update(dataToSign).digest("hex");
  }

  /**
   * Verifies an incoming webhook's HMAC signature and checks replay window timestamp.
   *
   * @param rawBody The unparsed raw body string or buffer.
   * @param signatureHeader The signature header (e.g. "t=1700000000,v1=hexsignature" or "hexsignature")
   * @param secret The shared webhook signing secret.
   * @param toleranceSeconds Maximum permissible timestamp divergence (defaults to 300s).
   */
  static verifyWebhook(
    rawBody: string | Buffer,
    signatureHeader: string | undefined | null,
    secret: string | undefined | null,
    toleranceSeconds: number = this.REPLAY_TOLERANCE_SECONDS
  ): WebhookValidationResult {
    if (!secret) {
      return { valid: false, error: "Payment webhook secret is not configured." };
    }
    if (!signatureHeader) {
      return { valid: false, error: "Missing webhook signature header." };
    }
    if (!rawBody || (typeof rawBody === "string" && rawBody.trim().length === 0)) {
      return { valid: false, error: "Webhook body is empty." };
    }

    const bodyString = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");

    let timestamp: number | undefined;
    let expectedSignature: string = signatureHeader;

    // Parse stripe-style format "t=123456,v1=abcdef..." if present
    if (signatureHeader.includes("t=") && signatureHeader.includes("v1=")) {
      const parts = signatureHeader.split(",");
      const tPart = parts.find(p => p.startsWith("t="));
      const vPart = parts.find(p => p.startsWith("v1="));

      if (!tPart || !vPart) {
        return { valid: false, error: "Malformed webhook signature header components." };
      }

      timestamp = parseInt(tPart.slice(2), 10);
      expectedSignature = vPart.slice(3);
    }

    // 1. Replay attack check if timestamp is provided
    if (timestamp !== undefined) {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const diff = Math.abs(nowSeconds - timestamp);
      if (diff > toleranceSeconds) {
        return {
          valid: false,
          error: `Webhook timestamp divergence (${diff}s) exceeds replay tolerance window (${toleranceSeconds}s).`
        };
      }
    }

    // 2. Cryptographic signature check
    const computedHex = this.computeSignature(bodyString, secret, timestamp);
    try {
      const computedBuf = Buffer.from(computedHex, "hex");
      const expectedBuf = Buffer.from(expectedSignature, "hex");

      if (computedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(computedBuf, expectedBuf)) {
        return { valid: false, error: "Webhook signature verification failed." };
      }
    } catch {
      return { valid: false, error: "Invalid signature formatting." };
    }

    // 3. Payload integrity and JSON validation
    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(bodyString);
    } catch {
      return { valid: false, error: "Malformed JSON payload in webhook body." };
    }

    if (!parsedPayload || typeof parsedPayload !== "object") {
      return { valid: false, error: "Invalid webhook payload structure." };
    }

    const eventId = parsedPayload.id || parsedPayload.eventId || `evt_${crypto.createHash("sha256").update(bodyString).digest("hex").slice(0, 16)}`;

    return {
      valid: true,
      parsedPayload,
      eventId
    };
  }
}
