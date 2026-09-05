# ProofScale (Ratecap) Security Policy & Architecture

This document details the security posture, threat model, hardened defensive controls, and operational guidelines for the **ProofScale** (Ratecap) Control Plane and Execution Plane.

---

## 1. Threat Model & Security Assumptions

- **Untrusted Network Context**: All inbound network requests from public clients (web browsers, CLI tools, automated webhooks) are treated as untrusted.
- **Untrusted Client Data**: All client-supplied payloads, query parameters, headers, file uploads, and discount codes are untrusted. Product pricing is never trusted from the client.
- **AI Boundary**: Inputs supplied to LLM features and third-party document context are treated as potentially malicious prompt-injection vectors designed to hijack control flow or exfiltrate directives.
- **Tenant Isolation**: Dual-scope role-based access control (Organization-level and Project-level RBAC) ensures strict tenant boundaries. No user can access or manipulate resources outside their authorized tenant scope.
- **Database Boundary**: Database connections must operate under least privilege. Application runtime workloads must never run with administrative or DDL privileges.

---

## 2. Required Production Environment Variables

Configure the following environment variables in production:

| Variable | Description | Recommended Production Value |
|---|---|---|
| `NODE_ENV` | Runtime environment mode | `production` |
| `PORT` | API server listen port | `3001` (or provider assigned) |
| `ALLOWED_ORIGINS` | Comma-delimited list of exact allowed CORS origins | `https://app.proofscale.dev,https://proofscale.com` |
| `PAYMENT_WEBHOOK_SECRET` | HMAC-SHA256 signing secret from payment provider | Cryptographically random string (min 32 bytes) |
| `DATABASE_URL` | PostgreSQL connection string with least-privilege role | `postgresql://ratecap_app:<password>@<host>:5432/<db>` |
| `HSTS_ENABLED` | Force HTTP Strict Transport Security header | `true` |
| `VITE_APP_URL` | Canonical frontend domain URL | `https://app.proofscale.dev` |

---

## 3. Cookie & Session Security (#3, #19)

- **Cookie Flags**: All session cookies (`ps_session`) are issued with `HttpOnly: true`, `Secure: true` (in production), `SameSite: "lax"`, and narrow path `path: "/"`.
- **Session ID Rotation**: A fresh session identifier and CSRF token are generated upon authentication, preventing session fixation.
- **Session Revocation on Password Change**: When a user changes their password or completes an account recovery reset, all previously active sessions across all devices are immediately marked `revoked_at = NOW()`.
- **Logout**: Explicit logout invalidates the session in the database and clears the client cookie.

---

## 4. Password Security, Reset & Anti-Enumeration (#4, #5, #12, #17)

- **Password Hashing**: Passwords are cryptographically salted and hashed using `scrypt` with constant-time `timingSafeEqual` comparison.
- **Password Complexity**: Minimum 10 characters, requiring uppercase, lowercase, digit, and special character.
- **Anti-Enumeration**:
  - In login and password reset flows, error responses are strictly generic: `"Invalid email or password."` and `"If an account exists for this email, password reset instructions have been dispatched."`
  - When an unassigned email is queried, constant-time dummy cryptographic work is executed to prevent timing side-channel enumeration.
- **Single-Use & Fast Expiration**: Password reset tokens are valid for **15 minutes** and are invalidated immediately upon first consumption.
- **Account Lockout & Progressive Backoff**: After **5 consecutive failed attempts**, accounts are locked for **15 minutes**. A progressive backoff delay (200ms per failed attempt) is introduced to defeat automated credential stuffing.

---

## 5. File Upload Restrictions (#6, #11)

- **Allowed Extensions**: Whitelist of `.json`, `.csv`, `.log`, `.txt`, `.pdf`, `.png`, `.jpg`, `.jpeg`.
- **Prohibited Executables**: Strict blocking of `.exe`, `.bat`, `.cmd`, `.sh`, `.bin`, `.elf`, `.js`, `.py`, `.php`, `.svg`, etc.
- **Magic Byte Inspection**: The server inspects file headers to verify genuine binary signatures (PNG `\x89PNG`, JPEG `\xFF\xD8\xFF`, PDF `%PDF-`, and validates UTF-8 / absence of null bytes in plain text).
- **Randomized Storage Keys**: User-provided filenames are discarded for disk/object storage. All files receive a UUID-based randomized object key (`uploads/<timestamp>_<uuid>.<ext>`) to prevent directory traversal and name collisions.
- **Size Limit**: Enforced maximum of **10MB** per file.

---

## 6. Payment Webhook Verification & Idempotency (#7, #8)

- **Cryptographic Signatures**: Inbound webhooks must supply an HMAC-SHA256 signature matching the secret.
- **Replay Protection**: The webhook timestamp header is verified against a **5-minute (300 seconds) tolerance window**. Events older than 300 seconds are rejected.
- **Idempotent Processing**: Processed event IDs and payload hashes are recorded in `processed_webhooks`. Duplicate event deliveries return HTTP 200 with `{ idempotentDuplicate: true }` without re-executing transactions.
- **Authoritative Server Pricing**: Client-supplied prices, totals, or discounts are never trusted. All orders, subscriptions, and quotes are computed strictly from the server-side catalog in `PricingEngine`.

---

## 7. AI Guardrails & Prompt Injection Defenses (#9, #10)

- **Delimiter Isolation**: Untrusted inputs (user prompts and retrieved document context) are isolated inside `<untrusted_input>` and `<untrusted_context>` XML tags. Any inner closing delimiter collisions are safely escaped.
- **Injection Pattern Scanning**: Prompts are scanned for known jailbreak, instruction override, persona bypass, and directive extraction patterns.
- **Tool Call Whitelist**: AI tool calls are validated against a strict authorized registry (`ALLOWED_TOOLS`). Any invocation outside the whitelist or attempting prototype manipulation is rejected.
- **Output Content Policy**: Generated model output is scanned for unintended secrets, private API keys, or leaked credentials prior to transmission.
- **Usage Capping**: Usage is capped per user per time window (default 20 requests/minute, 50,000 tokens/hour) returning safe HTTP 429 errors without leaking internal token counts.

---

## 8. Network, CORS & Request Limits (#1, #11, #14, #15)

- **HSTS**: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` header sent on all production/HTTPS traffic.
- **CORS Lockdown**: Only exact allowed origins defined in `ALLOWED_ORIGINS` are granted CORS headers. Wildcard origins (`*`) with credentials are completely disabled.
- **Directory Listing & Static Protection**: Access to hidden files (`.env`, `.git`), source files (`.ts`, `.map`), database files (`.sqlite`), and logs is unconditionally blocked with HTTP 403.
- **Body Size Caps**:
  - Global JSON API: **100KB**
  - Webhooks: **256KB**
  - AI analysis: **64KB**
  - File uploads: **10MB**
  - Excess payloads return **HTTP 413 Payload Too Large**.

---

## 9. Database Roles & Grants (#20)

Follow the SQL script in `packages/db/src/dbPermissions.sql`:

1. **`ratecap_app` (Application Runtime)**:
   - Grants: `SELECT, INSERT, UPDATE, DELETE` on application tables.
   - Revocations: `CREATE`, `DROP`, `ALTER`, `TRUNCATE`, `TRIGGER` revoked.
2. **`ratecap_migrator` (Deployment / CI only)**:
   - Grants: Full schema DDL and table management permissions.

---

## 10. Security Audit Logging & Incident Response (#18)

- **Structured JSON Logs**: Security events are emitted with schema `{ timestamp, type: "SECURITY_AUDIT", eventType, userId, ipAddress, message, metadata }`.
- **Sensitive Data Redaction**: Automatic recursive redaction of passwords, hashes, session tokens, CSRF tokens, cookies, authorization headers, webhook secrets, and credit card numbers.
- **Monitored Events**:
  - `auth.login_failed`, `auth.account_locked`, `auth.login_success`
  - `auth.password_changed`, `auth.password_reset_requested`, `auth.password_reset_completed`
  - `auth.session_revoked`, `auth.permission_denied`
  - `upload.rejected`, `upload.accepted`
  - `webhook.signature_failed`, `webhook.replay_rejected`, `webhook.processed`
  - `rate_limit.exceeded`
  - `ai.injection_attempt`, `ai.usage_capped`, `ai.output_policy_violation`
  - `admin.action`

---

## 11. Deployment & Migration Runbook

1. **Pre-deployment**: Ensure production secrets (`PAYMENT_WEBHOOK_SECRET`, `DATABASE_URL`, `ALLOWED_ORIGINS`) are provisioned in the secret manager.
2. **Database Migration**:
   - For SQLite: Migrations execute automatically on startup via `packages/db/src/migrate.ts`.
   - For PostgreSQL: Run `npm run db:migrate:pg` using the `ratecap_migrator` role before deploying the new application container.
3. **Application Rollout**: Deploy server containers. Verify `/health` returns HTTP 200.
4. **Post-deployment Verification**:
   - Verify CORS from production frontend.
   - Verify HSTS headers.
   - Test login and session cookie attributes.
