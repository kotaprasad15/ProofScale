import crypto from "node:crypto";

/**
 * Cryptographic primitives shared by sign-up verification and password reset
 * OTP flows. Persistence and delivery intentionally live in the server app.
 */
export class EmailCodeService {
  public static readonly CODE_TTL_MS = 10 * 60 * 1000;
  public static readonly MAX_ATTEMPTS = 5;

  static generateCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  static hashCode(code: string): string {
    return crypto
      .createHmac("sha256", this.getSecret())
      .update(code)
      .digest("hex");
  }

  static hashesMatch(code: string, storedHash: string): boolean {
    const expected = Buffer.from(this.hashCode(code), "hex");
    const stored = Buffer.from(storedHash, "hex");
    return expected.length === stored.length && crypto.timingSafeEqual(expected, stored);
  }

  static expiresAt(): Date {
    return new Date(Date.now() + this.CODE_TTL_MS);
  }

  private static getSecret(): string {
    const configured = process.env.OTP_SECRET;
    if (configured) return configured;
    if (process.env.NODE_ENV === "production") {
      throw new Error("OTP_SECRET must be configured in production.");
    }
    // Local/test-only fallback so a missing secret can never reach production unnoticed.
    return "ratecap-local-development-otp-secret";
  }
}
