import crypto from "node:crypto";

interface Counter {
  count: number;
  expiresAt: number;
}

const localCounters = new Map<string, Counter>();

/**
 * Redis-backed OTP request limiter. Upstash's REST API keeps this deployable on
 * Vercel/Railway without a TCP Redis connection. Local tests use an in-memory
 * stand-in only when Redis credentials are intentionally absent.
 */
export class OtpRateLimiter {
  private static readonly WINDOW_SECONDS = 15 * 60;
  private static readonly EMAIL_LIMIT = 3;
  private static readonly IP_LIMIT = 5;

  static async consume(email: string, ip: string): Promise<boolean> {
    const emailKey = `otp:request:email:${this.fingerprint(email)}`;
    const ipKey = `otp:request:ip:${this.fingerprint(ip)}`;
    const [emailCount, ipCount] = await Promise.all([
      this.increment(emailKey),
      this.increment(ipKey)
    ]);
    return emailCount <= this.EMAIL_LIMIT && ipCount <= this.IP_LIMIT;
  }

  private static fingerprint(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
  }

  private static async increment(key: string): Promise<number> {
    const baseUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (baseUrl && token) {
      const response = await fetch(`${baseUrl}/incr/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Redis rate limiter request failed.");
      const body = await response.json() as { result: number };
      if (body.result === 1) {
        const expiry = await fetch(`${baseUrl}/expire/${encodeURIComponent(key)}/${this.WINDOW_SECONDS}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!expiry.ok) throw new Error("Redis rate limiter expiry request failed.");
      }
      return body.result;
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production.");
    }
    const now = Date.now();
    const existing = localCounters.get(key);
    const record = !existing || existing.expiresAt <= now
      ? { count: 0, expiresAt: now + this.WINDOW_SECONDS * 1000 }
      : existing;
    record.count += 1;
    localCounters.set(key, record);
    return record.count;
  }
}
