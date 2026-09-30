import crypto from "node:crypto";

export interface AccountLockoutStatus {
  isLocked: boolean;
  lockedUntil: Date | null;
  remainingSeconds: number;
}

export class PasswordService {
  private static readonly SCRYPT_KEYLEN = 64;
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Hashes a password using scrypt with a cryptographic salt.
   * Format: salt:derivedKeyHex
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString("hex");
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(password, salt, this.SCRYPT_KEYLEN, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
    return `${salt}:${derivedKey.toString("hex")}`;
  }

  static hashPasswordSync(password: string): string {
    const salt = crypto.randomBytes(16).toString("hex");
    const derivedKey = crypto.scryptSync(password, salt, this.SCRYPT_KEYLEN, { N: 16384, r: 8, p: 1 });
    return `${salt}:${derivedKey.toString("hex")}`;
  }

  /**
   * Constant-time password verification to prevent timing side-channel attacks.
   */
  static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
      const [salt, keyHex] = storedHash.split(":");
      if (!salt || !keyHex) return false;

      const keyBuffer = Buffer.from(keyHex, "hex");
      const derivedKey = await new Promise<Buffer>((resolve, reject) => {
        crypto.scrypt(password, salt, keyBuffer.length, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        });
      });
      return crypto.timingSafeEqual(keyBuffer, derivedKey);
    } catch {
      return false;
    }
  }

  /**
   * Runs a dummy cryptographic hash calculation to ensure constant response timing
   * when an unknown email is supplied, preventing user enumeration via timing attacks.
   */
  static async runDummyVerification(): Promise<void> {
    const dummySalt = "0123456789abcdef0123456789abcdef";
    const dummyKey = Buffer.alloc(this.SCRYPT_KEYLEN, 0);
    const derived = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt("dummy_password_timing_pad", dummySalt, this.SCRYPT_KEYLEN, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
    crypto.timingSafeEqual(dummyKey, derived);
  }

  /**
   * Validates password complexity: at least 10 chars, uppercase, lowercase, digit, symbol.
   */
  static validateComplexity(password: string): { valid: boolean; reason?: string } {
    if (!password || password.length < 10) {
      return { valid: false, reason: "Password must be at least 10 characters long." };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, reason: "Password must contain at least one uppercase letter." };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, reason: "Password must contain at least one lowercase letter." };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, reason: "Password must contain at least one digit." };
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return { valid: false, reason: "Password must contain at least one special character." };
    }
    return { valid: true };
  }

  /**
   * Evaluates account lockout status based on failed attempts and locked_until timestamp.
   */
  static checkLockout(failedAttempts: number, lockedUntil: Date | null): AccountLockoutStatus {
    const now = new Date();
    if (lockedUntil && lockedUntil > now) {
      const remainingSeconds = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);
      return { isLocked: true, lockedUntil, remainingSeconds };
    }

    if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      const newLockedUntil = new Date(now.getTime() + this.LOCKOUT_DURATION_MS);
      return {
        isLocked: true,
        lockedUntil: newLockedUntil,
        remainingSeconds: Math.ceil(this.LOCKOUT_DURATION_MS / 1000)
      };
    }

    return { isLocked: false, lockedUntil: null, remainingSeconds: 0 };
  }

  /**
   * Calculates progressive backoff delay (in milliseconds) based on failed attempt count.
   */
  static calculateProgressiveDelayMs(failedAttempts: number): number {
    if (failedAttempts <= 1) return 0;
    return Math.min(2000, failedAttempts * 200); // 400ms, 600ms, ..., max 2000ms
  }
}
