# ProofScale / Ratecap Architecture

This document captures the as-built system architecture of the repository.

## 1) Monorepo structure

- **apps/web**: React 19 + Vite SPA (dashboard, onboarding, plans, runs, reports, schedules, notifications).
- **apps/server**: Express + tRPC control plane API + REST test-execution API.
- **apps/worker**: Background execution plane (job polling, run execution, scoring/report persistence).
- **apps/fixture-target**: Local mock target API for safe testing.
- **packages/shared**: Shared domain contracts, validation, security/safety guards, scoring, scheduling engine.
- **packages/db**: Drizzle ORM schemas, repositories, migrations, DB client (SQLite or Postgres).

---

## 2) Core architecture pattern

The system follows a **two-plane design**:

1. **Control Plane (web + server)**  
   User-facing workflows: auth, org/project RBAC, target/plan setup, run triggering, monitoring, reports, scheduling, notifications configuration.

2. **Execution Plane (worker)**  
   Pulls queued runs from DB, executes load checks under safety limits, persists metrics/results/findings, updates lifecycle state.

The database is the contract between planes (queue + state + history).

---

## 3) High-level runtime diagram

```text
[Browser SPA]
   |  (tRPC + REST)
   v
[Control Plane API: Express + tRPC + REST]
   |  (Drizzle ORM)
   v
[Postgres/SQLite: source of truth + queue tables]
   ^
   |  (claim/lease/update runs)
[Worker Service]
   |
   v
[Target HTTP API]
```

---

## 4) API surface split

- **tRPC (`/trpc`)**: Most product domain APIs  
  (auth, orgs/projects/targets, runs query, reports, policies, baselines, schedules, notifications, admin/system).
- **REST (`/api/test-*`)**: Server-side test execution lifecycle  
  - `POST /api/test-plans`, `PUT /api/test-plans/:id`, `POST /api/test-plans/:id/approve`
  - `POST /api/test-runs` (returns `202 queued`)
  - `GET /api/test-runs/:id`, `POST /api/test-runs/:id/cancel`
- **SSE endpoint**: `/api/notifications/stream` for real-time in-app events.
- **Presence heartbeat**: `/api/presence/heartbeat`.

---

## 5) Data model (key domains)

- **Identity/Tenancy**: users, organizations, org members, projects, project members, sessions.
- **Testing**: test_plans, test_runs, run_events, findings, artifacts.
- **Reporting/Sharing**: report_shares (hashed token model).
- **Governance**: readiness_policies, baselines.
- **Scheduling**: assessment_schedules, schedule_executions, scheduler_state.
- **Notifications**: notifications, notification_rules, preferences, push_subscriptions, deliveries.
- **Auditability**: audit_events across critical operations.

---

## 6) End-to-end run lifecycle

1. User creates/updates plan (validated envelope + safety checks).
2. Plan approval is required before execution.
3. Run request is queued (DB row, status `queued`).
4. Worker atomically claims run (lease/attempt tracking).
5. Worker executes:
   - server-side HTTP execution engine (primary path),
   - k6/native runner path still exists as legacy-compatible worker flow.
6. Worker writes progress/events/status transitions.
7. On completion:
   - metrics + deterministic score (`mvp-1`),
   - findings/artifacts,
   - policy snapshot evaluation (active policy + optional baseline),
   - report retrieval/export enabled.

---

## 7) Scheduling architecture

- Schedules are **durable DB rows** (not browser timers).
- Scheduler loop runs inside control-plane API process.
- Claims due occurrences via unique `occurrence_key` to keep multi-instance safe.
- Each scheduled occurrence uses the same safe run-creation path as manual runs.
- Revalidates at execution time (plan/target/safety/kill switch), preventing stale unsafe runs.

---

## 8) Notification architecture

- Notification generation is based on **durable run/schedule truth**, not transient memory.
- Recipient resolution uses org/project membership.
- Per-user rule filtering + dedup key strategy.
- Delivery channels:
  - in-app inbox rows,
  - SSE live toasts,
  - web push when user is not actively watching (presence-aware).

---

## 9) Security and safety model

- Session + CSRF protections, secure cookies, lockout/rate-limit logic.
- Strict CORS policy, HSTS/security headers, sensitive-path blocking.
- SSRF controls:
  - URL sanitization,
  - DNS/IP private-range blocking,
  - restricted ports.
- Workload safety caps (VU, duration, timeout, request limits).
- Global kill switch (currently process-local).
- Webhook verification + idempotency tracking.

---

## 10) Deployment model

- **Web**: Vercel-style SPA deployment.
- **Server + Worker**: separate services (Railway/Render style).
- **DB**: Postgres in production, SQLite fallback in local/dev.
- DB migrations auto-run on startup via `packages/db`.

---

## 11) Practical mental model

ProofScale is:

- a **multi-tenant control plane** (what to test, when, and who can do it),
- plus a **deterministic execution engine** (runs checks safely),
- with **database-backed durability** for queueing, scheduling, reporting, and notifications.
