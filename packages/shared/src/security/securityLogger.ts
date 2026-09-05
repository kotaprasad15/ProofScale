export type SecurityEventType =
  | "auth.login_failed"
  | "auth.login_success"
  | "auth.account_locked"
  | "auth.password_changed"
  | "auth.password_reset_requested"
  | "auth.password_reset_completed"
  | "auth.session_revoked"
  | "auth.session_rotated"
  | "auth.permission_denied"
  | "upload.rejected"
  | "upload.accepted"
  | "webhook.signature_failed"
  | "webhook.replay_rejected"
  | "webhook.processed"
  | "rate_limit.exceeded"
  | "ai.injection_attempt"
  | "ai.usage_capped"
  | "ai.output_policy_violation"
  | "admin.action";

export interface SecurityEventPayload {
  eventType: SecurityEventType;
  userId?: string | null;
  organizationId?: string | null;
  projectId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any>;
  message: string;
}

export class SecurityLogger {
  // Sensitive keys that must be strictly redacted
  private static readonly REDACT_KEYS = new Set([
    "password",
    "passwordhash",
    "currentpassword",
    "newpassword",
    "token",
    "rawtoken",
    "tokenhash",
    "sessiontoken",
    "csrftoken",
    "cookie",
    "cookies",
    "secret",
    "webhooksecret",
    "authorization",
    "creditcard",
    "cvv",
    "cardnumber",
    "pan"
  ]);

  /**
   * Sanitizes metadata by recursively redacting sensitive keys and values.
   */
  static sanitizeMetadata(data?: Record<string, any>): Record<string, any> {
    if (!data || typeof data !== "object") return {};

    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z]/g, "");
      if (this.REDACT_KEYS.has(lowerKey)) {
        clean[key] = "[REDACTED]";
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        clean[key] = this.sanitizeMetadata(value);
      } else if (Array.isArray(value)) {
        clean[key] = value.map(item => (typeof item === "object" ? this.sanitizeMetadata(item) : item));
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }

  /**
   * Logs a structured JSON security audit event.
   */
  static log(event: SecurityEventPayload): string {
    const record = {
      timestamp: new Date().toISOString(),
      type: "SECURITY_AUDIT",
      eventType: event.eventType,
      userId: event.userId || "anonymous",
      organizationId: event.organizationId || null,
      projectId: event.projectId || null,
      ipAddress: event.ipAddress || "unknown",
      userAgent: event.userAgent ? event.userAgent.slice(0, 150) : "unknown",
      message: event.message,
      metadata: this.sanitizeMetadata(event.metadata)
    };

    const serialized = JSON.stringify(record);
    // In production or tests, write to stderr/stdout in structured JSON format
    console.warn(`[SECURITY] ${serialized}`);
    return serialized;
  }
}
