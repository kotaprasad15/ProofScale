export interface AiUsageLimits {
  maxRequestsPerMinute: number;
  maxTokensPerHour: number;
}

export interface UserUsageBucket {
  minuteWindowStart: number;
  requestsInCurrentMinute: number;
  hourWindowStart: number;
  tokensInCurrentHour: number;
}

export class AiRateLimiter {
  public static readonly DEFAULT_LIMITS: AiUsageLimits = {
    maxRequestsPerMinute: 20,
    maxTokensPerHour: 50000
  };

  // In-memory sliding buckets for high-performance rate checking
  private static userBuckets: Map<string, UserUsageBucket> = new Map();

  /**
   * Checks if user has exceeded usage caps. If allowed, increments usage.
   * Returns remaining allowances and whether request is permitted.
   */
  static checkAndRecordUsage(
    userId: string,
    estimatedTokens: number,
    limits: AiUsageLimits = this.DEFAULT_LIMITS
  ): { allowed: boolean; error?: string; remainingRequests: number; remainingTokens: number } {
    const now = Date.now();
    const oneMinuteMs = 60 * 1000;
    const oneHourMs = 60 * 60 * 1000;

    let bucket = this.userBuckets.get(userId);
    if (!bucket) {
      bucket = {
        minuteWindowStart: now,
        requestsInCurrentMinute: 0,
        hourWindowStart: now,
        tokensInCurrentHour: 0
      };
      this.userBuckets.set(userId, bucket);
    }

    // Reset minute window if expired
    if (now - bucket.minuteWindowStart >= oneMinuteMs) {
      bucket.minuteWindowStart = now;
      bucket.requestsInCurrentMinute = 0;
    }

    // Reset hour window if expired
    if (now - bucket.hourWindowStart >= oneHourMs) {
      bucket.hourWindowStart = now;
      bucket.tokensInCurrentHour = 0;
    }

    // Check request count cap
    if (bucket.requestsInCurrentMinute >= limits.maxRequestsPerMinute) {
      const retryAfterSec = Math.ceil((bucket.minuteWindowStart + oneMinuteMs - now) / 1000);
      return {
        allowed: false,
        error: `AI request rate limit exceeded. Please retry in ${retryAfterSec} seconds.`,
        remainingRequests: 0,
        remainingTokens: Math.max(0, limits.maxTokensPerHour - bucket.tokensInCurrentHour)
      };
    }

    // Check token usage cap
    if (bucket.tokensInCurrentHour + estimatedTokens > limits.maxTokensPerHour) {
      const retryAfterMinutes = Math.ceil((bucket.hourWindowStart + oneHourMs - now) / 60000);
      return {
        allowed: false,
        error: `Hourly AI token quota exceeded. Reset in ${retryAfterMinutes} minutes.`,
        remainingRequests: Math.max(0, limits.maxRequestsPerMinute - bucket.requestsInCurrentMinute),
        remainingTokens: 0
      };
    }

    // Record usage
    bucket.requestsInCurrentMinute += 1;
    bucket.tokensInCurrentHour += estimatedTokens;

    return {
      allowed: true,
      remainingRequests: limits.maxRequestsPerMinute - bucket.requestsInCurrentMinute,
      remainingTokens: limits.maxTokensPerHour - bucket.tokensInCurrentHour
    };
  }

  /**
   * Resets usage for testing or administrator override.
   */
  static resetUsage(userId?: string): void {
    if (userId) {
      this.userBuckets.delete(userId);
    } else {
      this.userBuckets.clear();
    }
  }
}
