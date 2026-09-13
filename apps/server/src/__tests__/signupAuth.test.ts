import assert from "node:assert";
import { test, describe } from "node:test";
import { appRouter } from "../routers/index.js";
import { createContext } from "../context.js";
import { db, users, emailCodes } from "@proofscale/db";
import { eq } from "drizzle-orm";
import { EmailService } from "../services/EmailService.js";

describe("Enhanced Sign-In & Sign-Up with Supabase Storage", () => {
  const caller = appRouter.createCaller(async () => createContext({ req: {} as any }));

  const testEmail = `user_${Date.now()}@proofscale.io`;
  const strongPassword = "Password123!Secure";

  test("checkEmailAvailability detects non-existent email as available", async () => {
    const res = await caller.auth.checkEmailAvailability({ email: testEmail });
    assert.strictEqual(res.exists, false);
    assert.strictEqual(res.message, "Email is available");
  });

  test("signup rejects mismatched confirmPassword", async () => {
    await assert.rejects(
      async () => {
        await caller.auth.signup({
          email: testEmail,
          password: strongPassword,
          confirmPassword: "DifferentPassword123!",
          displayName: "Test User"
        });
      },
      (err: any) => {
        assert.strictEqual(err.code, "BAD_REQUEST");
        assert.match(err.message, /Passwords do not match/i);
        return true;
      }
    );
  });

  test("signup rejects weak password failing complexity", async () => {
    await assert.rejects(
      async () => {
        await caller.auth.signup({
          email: testEmail,
          password: "weak",
          confirmPassword: "weak",
          displayName: "Test User"
        });
      },
      (err: any) => {
        assert.strictEqual(err.code, "BAD_REQUEST");
        return true;
      }
    );
  });

  test("signup registers an unverified user, stores a hashed OTP, and does not create a session", async () => {
    EmailService.clearTestOutbox();
    const res = await caller.auth.signup({
      email: testEmail,
      password: strongPassword,
      confirmPassword: strongPassword,
      displayName: "Supabase Tester"
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.verificationRequired, true);
    assert.strictEqual(res.user.email, testEmail);
    assert.strictEqual(res.user.onboardingStatus, "required");

    // Verify persisted directly in database
    const [dbUser] = await db.select().from(users).where(eq(users.email, testEmail));
    assert.ok(dbUser);
    assert.ok(dbUser.passwordHash);
    assert.ok(dbUser.passwordHash.includes(":"), "Password hash must be salted format (salt:keyHex)");
    assert.notStrictEqual(dbUser.passwordHash, strongPassword, "Password must be cryptographically hashed");
    assert.strictEqual(dbUser.emailVerifiedAt, null);

    const [code] = await db.select().from(emailCodes).where(eq(emailCodes.email, testEmail));
    assert.ok(code, "A verification code must be persisted");
    assert.match(code.codeHash, /^[a-f0-9]{64}$/i, "OTP must be stored as an HMAC hash");
    const sent = EmailService.getTestOutbox().at(-1);
    assert.ok(sent?.code, "The local transport must receive the raw OTP");
    assert.notStrictEqual(code.codeHash, sent.code, "Database must never store the raw OTP");
  });

  test("checkEmailAvailability detects existing email with exact message 'already this email exists'", async () => {
    const res = await caller.auth.checkEmailAvailability({ email: testEmail });
    assert.strictEqual(res.exists, true);
    assert.strictEqual(res.message, "already this email exists");
  });

  test("signup rejects duplicate registration with 'already this email exists'", async () => {
    await assert.rejects(
      async () => {
        await caller.auth.signup({
          email: testEmail,
          password: strongPassword,
          confirmPassword: strongPassword
        });
      },
      (err: any) => {
        assert.strictEqual(err.code, "CONFLICT");
        assert.strictEqual(err.message, "already this email exists");
        return true;
      }
    );
  });

  test("unverified users cannot log in; verifying the emailed code unlocks login", async () => {
    await assert.rejects(
      async () => caller.auth.login({ email: testEmail, password: strongPassword }),
      (err: any) => err.code === "FORBIDDEN"
    );

    const sent = EmailService.getTestOutbox().at(-1);
    assert.ok(sent?.code);
    const verify = await caller.auth.verifyEmail({ email: testEmail, code: sent.code! });
    assert.strictEqual(verify.success, true);

    const loginRes = await caller.auth.login({
      email: testEmail,
      password: strongPassword
    });

    assert.strictEqual(loginRes.success, true);
    assert.ok(loginRes.sessionToken);
    assert.strictEqual(loginRes.user.email, testEmail);
    assert.strictEqual(loginRes.user.onboardingStatus, "required");
  });
});
