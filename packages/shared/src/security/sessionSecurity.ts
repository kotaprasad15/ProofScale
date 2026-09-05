import crypto from "node:crypto";

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
}

export class SessionSecurity {
  public static readonly COOKIE_NAME = "ps_session";
  public static readonly CSRF_HEADER_NAME = "x-csrf-token";
  public static readonly SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Generates a cryptographically strong random session token.
   */
  static generateSessionToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Hashes session token before storage in the database (SHA-256).
   */
  static hashSessionToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Generates a cryptographically strong CSRF token.
   */
  static generateCsrfToken(): string {
    return crypto.randomBytes(24).toString("hex");
  }

  /**
   * Validates a provided CSRF token against the session CSRF token in constant time.
   */
  static verifyCsrfToken(providedToken?: string | null, expectedToken?: string | null): boolean {
    if (!providedToken || !expectedToken) return false;
    try {
      const provBuffer = Buffer.from(providedToken, "utf8");
      const expBuffer = Buffer.from(expectedToken, "utf8");
      if (provBuffer.length !== expBuffer.length) return false;
      return crypto.timingSafeEqual(provBuffer, expBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Returns secure cookie configuration conforming to requirement 19.
   */
  static getSecureCookieOptions(isProduction: boolean): CookieOptions {
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: this.SESSION_DURATION_MS
    };
  }
}
