import crypto from "node:crypto";

export class PasswordResetService {
  public static readonly RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
  public static readonly GENERIC_RESET_RESPONSE =
    "If an account exists for this email, password reset instructions have been dispatched.";
  public static readonly GENERIC_AUTH_ERROR = "Invalid email or password.";

  /**
   * Generates a raw reset token for the link, and its SHA-256 hash for database storage.
   */
  static generateResetToken(): { rawToken: string; tokenHash: string; expiresAt: Date } {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + this.RESET_TOKEN_TTL_MS);
    return { rawToken, tokenHash, expiresAt };
  }

  /**
   * Hashes the raw token supplied by the user in the reset link.
   */
  static hashRawToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
  }

  /**
   * Verifies whether a token is still valid (not expired, not already used).
   */
  static isTokenValid(expiresAt: Date | number, usedAt: Date | number | null): boolean {
    if (usedAt) return false; // Single-use constraint
    const expiryTime = typeof expiresAt === "number" ? expiresAt : expiresAt.getTime();
    return Date.now() < expiryTime;
  }
}
