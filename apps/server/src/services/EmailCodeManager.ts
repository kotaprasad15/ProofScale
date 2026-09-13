import { db, emailCodes } from "@proofscale/db";
import { EmailCodeService } from "@proofscale/shared";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import crypto from "node:crypto";
import { EmailService } from "./EmailService.js";

export type EmailCodePurpose = "signup_verification" | "password_reset";

export class EmailCodeManager {
  static async issue(params: {
    email: string;
    userId: string | null;
    purpose: EmailCodePurpose;
    requestIp: string;
  }): Promise<void> {
    const now = new Date();
    const code = EmailCodeService.generateCode();

    await (db as any).transaction(async (tx: any) => {
      // A resend consumes all active codes before the replacement becomes valid.
      await tx.update(emailCodes)
        .set({ consumedAt: now })
        .where(and(
          eq(emailCodes.email, params.email),
          eq(emailCodes.purpose, params.purpose),
          isNull(emailCodes.consumedAt)
        ));
      await tx.insert(emailCodes).values({
        id: `emc_${crypto.randomUUID().slice(0, 12)}`,
        email: params.email,
        userId: params.userId,
        purpose: params.purpose,
        codeHash: EmailCodeService.hashCode(code),
        expiresAt: EmailCodeService.expiresAt(),
        attempts: 0,
        requestIp: params.requestIp,
        createdAt: now
      });
    });

    await EmailService.sendOtp({ email: params.email, code, purpose: params.purpose });
  }

  static async consumeIfValid(email: string, purpose: EmailCodePurpose, code: string): Promise<{ userId: string | null } | null> {
    const now = new Date();
    const [record] = await db
      .select()
      .from(emailCodes)
      .where(and(
        eq(emailCodes.email, email),
        eq(emailCodes.purpose, purpose),
        isNull(emailCodes.consumedAt),
        gt(emailCodes.expiresAt, now)
      ))
      .orderBy(desc(emailCodes.createdAt))
      .limit(1);

    if (!record || record.attempts >= EmailCodeService.MAX_ATTEMPTS) return null;

    if (!EmailCodeService.hashesMatch(code, record.codeHash)) {
      const attempts = record.attempts + 1;
      await db.update(emailCodes)
        .set({
          attempts,
          // The fifth wrong attempt invalidates the code immediately.
          consumedAt: attempts >= EmailCodeService.MAX_ATTEMPTS ? now : null
        })
        .where(and(eq(emailCodes.id, record.id), isNull(emailCodes.consumedAt)));
      return null;
    }

    const result = await (db as any).update(emailCodes)
      .set({ consumedAt: now })
      .where(and(eq(emailCodes.id, record.id), isNull(emailCodes.consumedAt)))
      .returning({ id: emailCodes.id });
    // A simultaneous verification may have consumed it between select and update.
    if (!result[0]) return null;
    return { userId: record.userId };
  }
}
