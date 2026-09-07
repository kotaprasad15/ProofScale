import assert from "node:assert";
import { test, describe } from "node:test";
import { appRouter } from "../routers/index.js";
import { createContext } from "../context.js";
import { db, users } from "@proofscale/db";
import { eq } from "drizzle-orm";

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

  test("signup registers user, hashes password with salted scrypt, and creates active session in Supabase", async () => {
    const res = await caller.auth.signup({
      email: testEmail,
      password: strongPassword,
      confirmPassword: strongPassword,
      displayName: "Supabase Tester"
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.sessionToken);
    assert.ok(res.csrfToken);
    assert.strictEqual(res.user.email, testEmail);
    assert.strictEqual(res.user.onboardingStatus, "required");

    // Verify persisted directly in database
    const [dbUser] = await db.select().from(users).where(eq(users.email, testEmail));
    assert.ok(dbUser);
    assert.ok(dbUser.passwordHash);
    assert.ok(dbUser.passwordHash.includes(":"), "Password hash must be salted format (salt:keyHex)");
    assert.notStrictEqual(dbUser.passwordHash, strongPassword, "Password must be cryptographically hashed");
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

  test("login authenticates the newly registered user with email and password", async () => {
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
