import assert from "node:assert";
import { describe, test, before } from "node:test";
import { appRouter } from "../routers/index.js";
import { createContext } from "../context.js";
import { db, emailCodes, sessions, users } from "@proofscale/db";
import { and, eq, isNull } from "drizzle-orm";
import { EmailService } from "../services/EmailService.js";
import { PasswordService, SessionSecurity } from "@proofscale/shared";

describe("email OTP verification and password recovery", () => {
  const email = `otp_${Date.now()}@proofscale.dev`;
  const userId = `usr_otp_${Date.now()}`;
  const password = "OriginalPassword123!";
  const caller = appRouter.createCaller(async () => createContext({ req: { ip: "198.51.100.42", headers: {} } }));

  before(async () => {
    EmailService.clearTestOutbox();
    await db.insert(users).values({
      id: userId,
      email,
      passwordHash: PasswordService.hashPassword(password),
      emailVerifiedAt: new Date(),
      failedLoginAttempts: 0
    });
  });

  test("reset requests have an identical response for known and unknown email addresses", async () => {
    const known = await caller.auth.requestPasswordReset({ email });
    const unknown = await caller.auth.requestPasswordReset({ email: `missing_${Date.now()}@proofscale.dev` });
    assert.deepStrictEqual(known, unknown);
    assert.strictEqual(known.message, "If an account exists for that email, we've sent a code.");
  });

  test("a replacement request consumes the earlier code", async () => {
    const firstCode = EmailService.getTestOutbox().at(-1)?.code;
    assert.ok(firstCode);
    await caller.auth.requestPasswordReset({ email });
    const secondCode = EmailService.getTestOutbox().at(-1)?.code;
    assert.ok(secondCode && secondCode !== firstCode);

    await assert.rejects(
      async () => caller.auth.verifyResetCode({ email, code: firstCode! }),
      (err: any) => err.message === "Invalid or expired code."
    );
  });

  test("a reset token can be used once, revokes all sessions, and sends a security email", async () => {
    const code = EmailService.getTestOutbox().at(-1)?.code;
    assert.ok(code);
    const verified = await caller.auth.verifyResetCode({ email, code: code! });
    assert.ok(verified.resetToken);

    const now = new Date();
    const sessionIds = [`sess_otp_a_${Date.now()}`, `sess_otp_b_${Date.now()}`];
    await db.insert(sessions).values(sessionIds.map((id) => ({
      id,
      userId,
      sessionTokenHash: SessionSecurity.hashSessionToken(SessionSecurity.generateSessionToken()),
      csrfToken: SessionSecurity.generateCsrfToken(),
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: now,
      lastActiveAt: now
    })));

    await caller.auth.resetPassword({ resetToken: verified.resetToken, newPassword: "ReplacementPassword123!" });
    const activeSessions = await db.select().from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
    assert.strictEqual(activeSessions.length, 0, "Password reset must revoke every active session");
    assert.match(EmailService.getTestOutbox().at(-1)?.subject || "", /password was changed/i);

    await assert.rejects(async () => caller.auth.resetPassword({ resetToken: verified.resetToken, newPassword: "AnotherPassword123!" }));
  });

  test("the fifth wrong code attempt consumes the code before a sixth try", async () => {
    await caller.auth.requestPasswordReset({ email });
    const [rowBefore] = await db.select().from(emailCodes)
      .where(and(eq(emailCodes.email, email), isNull(emailCodes.consumedAt)));
    assert.ok(rowBefore);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await assert.rejects(async () => caller.auth.verifyResetCode({ email, code: "111111" }));
    }
    const [rowAfter] = await db.select().from(emailCodes).where(eq(emailCodes.id, rowBefore.id));
    assert.strictEqual(rowAfter.attempts, 5);
    assert.ok(rowAfter.consumedAt, "The fifth wrong attempt must invalidate the code");
    await assert.rejects(async () => caller.auth.verifyResetCode({ email, code: "111111" }));
  });
});
