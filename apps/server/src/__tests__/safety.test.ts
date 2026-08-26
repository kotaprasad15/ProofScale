import assert from "node:assert";
import { test, describe, afterEach } from "node:test";
import {
  isPrivateIPv4,
  isPrivateIPv6,
  sanitizeTargetUrl,
  validateTargetHostDns,
  KillSwitch
} from "@proofscale/shared";
import { appRouter } from "../routers/index.js";
import { createContext } from "../context.js";

describe("Phase 2: Target Safety & SSRF Pipeline", () => {
  const mockReq = {
    headers: {
      "x-user-id": "usr_admin_01",
      "x-user-email": "lead@acme.dev",
      "x-organization-id": "org_default_01"
    }
  } as any;

  const caller = appRouter.createCaller(async () => createContext({ req: mockReq }));

  afterEach(() => {
    KillSwitch.deactivate();
  });

  describe("IP Guard Range Blocking", () => {
    test("blocks IPv4 loopback (127.0.0.1)", () => {
      assert.strictEqual(isPrivateIPv4("127.0.0.1"), true);
      assert.strictEqual(isPrivateIPv4("127.255.255.254"), true);
    });

    test("blocks IPv4 RFC1918 private ranges", () => {
      assert.strictEqual(isPrivateIPv4("10.0.0.1"), true);
      assert.strictEqual(isPrivateIPv4("172.16.0.1"), true);
      assert.strictEqual(isPrivateIPv4("172.31.255.255"), true);
      assert.strictEqual(isPrivateIPv4("192.168.1.1"), true);
    });

    test("blocks IPv4 Link-Local and Cloud Metadata (169.254.169.254)", () => {
      assert.strictEqual(isPrivateIPv4("169.254.169.254"), true);
      assert.strictEqual(isPrivateIPv4("169.254.1.1"), true);
    });

    test("allows public IPv4 addresses", () => {
      assert.strictEqual(isPrivateIPv4("8.8.8.8"), false);
      assert.strictEqual(isPrivateIPv4("1.1.1.1"), false);
      assert.strictEqual(isPrivateIPv4("93.184.216.34"), false);
    });

    test("blocks IPv6 loopback, link-local, and unique local", () => {
      assert.strictEqual(isPrivateIPv6("::1"), true);
      assert.strictEqual(isPrivateIPv6("fe80::1"), true);
      assert.strictEqual(isPrivateIPv6("fc00::1"), true);
      assert.strictEqual(isPrivateIPv6("fd00::1234"), true);
    });
  });

  describe("Target URL Sanitization & Protocol Validation", () => {
    test("accepts valid HTTP/HTTPS URLs", () => {
      const res = sanitizeTargetUrl("https://api.example.com/v1/checkout");
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.normalizedUrl, "https://api.example.com/v1/checkout");
      assert.strictEqual(res.allowedHost, "api.example.com");
    });

    test("strips URL fragments", () => {
      const res = sanitizeTargetUrl("https://api.example.com/v1/products#section-2");
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.normalizedUrl, "https://api.example.com/v1/products");
    });

    test("rejects unsupported schemes (ftp, file, ssh)", () => {
      assert.strictEqual(sanitizeTargetUrl("ftp://example.com").isValid, false);
      assert.strictEqual(sanitizeTargetUrl("file:///etc/passwd").isValid, false);
      assert.strictEqual(sanitizeTargetUrl("gopher://example.com").isValid, false);
    });

    test("rejects embedded user/password credentials", () => {
      const res = sanitizeTargetUrl("https://admin:secret@api.example.com/data");
      assert.strictEqual(res.isValid, false);
      assert.match(res.reason!, /embedded username/);
    });

    test("rejects system service ports (SSH 22, Redis 6379, MySQL 3306)", () => {
      assert.strictEqual(sanitizeTargetUrl("http://example.com:22").isValid, false);
      assert.strictEqual(sanitizeTargetUrl("http://example.com:6379").isValid, false);
      assert.strictEqual(sanitizeTargetUrl("http://example.com:3306").isValid, false);
    });
  });

  describe("Global Emergency Kill Switch", () => {
    test("prevents run creation when Kill Switch is active", async () => {
      // 1. Activate Kill Switch
      KillSwitch.activate("Security audit in progress", "admin@acme.dev");
      assert.strictEqual(KillSwitch.isActivated(), true);

      // 2. Attempt to create run should throw PRECONDITION_FAILED
      await assert.rejects(
        async () => {
          await caller.runs.create({
            planId: "plan_smoke_01",
            targetId: "target_fixture_01"
          });
        },
        (err: any) => {
          assert.strictEqual(err.code, "PRECONDITION_FAILED");
          assert.match(err.message, /Kill Switch is active/);
          return true;
        }
      );
    });

    test("allows run creation after Kill Switch is deactivated", async () => {
      KillSwitch.deactivate();
      assert.strictEqual(KillSwitch.isActivated(), false);

      const run = await caller.runs.create({
        planId: "plan_smoke_01",
        targetId: "target_fixture_01"
      });

      assert.ok(run.id);
      assert.strictEqual(run.status, "queued");
    });
  });
});
