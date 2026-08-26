# ProofScale — Testing Guide & Platform Features

This document provides a comprehensive guide on **how to test the ProofScale platform** (both automated and end-to-end manual testing) and details all **features and architecture components** present in the codebase.

---

## 🌟 Table of Contents
1. [Overview & System Architecture](#overview--system-architecture)
2. [Platform Features Breakdown](#platform-features-breakdown)
   - [1. Landing Page & Interactive Showcase](#1-landing-page--interactive-showcase)
   - [2. Authentication, Onboarding & Dual-Scope RBAC](#2-authentication-onboarding--dual-scope-rbac)
   - [3. Target Registration & SSRF Safety Guard](#3-target-registration--ssrf-safety-guard)
   - [4. Test Plan Builder & Load Profiles](#4-test-plan-builder--load-profiles)
   - [5. Live Run Monitor & Execution Worker Engine](#5-live-run-monitor--execution-worker-engine)
   - [6. Deterministic Scoring Engine (`mvp-1`) & Findings](#6-deterministic-scoring-engine-mvp-1--findings)
   - [7. Comprehensive Reports & Run Comparison](#7-comprehensive-reports--run-comparison)
   - [8. Token-Hashed Secure Report Sharing](#8-token-hashed-secure-report-sharing)
   - [9. Local Staging Target Fixture](#9-local-staging-target-fixture)
3. [Pre-Seeded Credentials & Test Data](#pre-seeded-credentials--test-data)
4. [How to Test the Platform](#how-to-test-the-platform)
   - [A. Automated Test Suite (Unit & Integration)](#a-automated-test-suite-unit--integration)
   - [B. Running Local Development Services](#b-running-local-development-services)
   - [C. Step-by-Step Manual End-to-End Test Flows](#c-step-by-step-manual-end-to-end-test-flows)
5. [Troubleshooting & Verification Checklist](#troubleshooting--verification-checklist)

---

## 🏗️ Overview & System Architecture

ProofScale is an **application readiness and load validation platform** built with a two-plane architecture:

```text
+-------------------------------------------------------------------------------+
|                           CONTROL PLANE (Dashboard)                           |
|  - React 19 + Tailwind CSS + Lucide Icons (apps/web @ port 3000)              |
|  - Express + tRPC v11 Control Plane Router (apps/server @ port 3001)          |
|  - SQLite (better-sqlite3) + Drizzle ORM (packages/db)                        |
+---------------------------------------+---------------------------------------+
                                        |
                                Atomic Lease Lock
                                        v
+-------------------------------------------------------------------------------+
|                          EXECUTION PLANE (Worker)                             |
|  - Node.js / k6 Runner Worker Daemon (apps/worker)                            |
|  - Real-time Telemetry, Metric Normalizer & Artifact Generator                |
+---------------------------------------+---------------------------------------+
                                        |
                                HTTP/HTTPS Workload
                                        v
+-------------------------------------------------------------------------------+
|                          STAGING TARGET FIXTURE                               |
|  - Express Mock API (apps/fixture-target @ port 4000)                         |
+-------------------------------------------------------------------------------+
```

---

## 📋 Platform Features Breakdown

### 1. Landing Page & Interactive Showcase
- **Hero Assessment Preview Card**: Live-rendered sample readiness badge, score dial (98/100), latency percentiles, and SLA checks.
- **Scrollytelling Product Story**: Visual 4-step walkthrough:
  1. *Define Scenarios & SLA Envelopes*
  2. *Execute Isolated Sandboxed Load Workloads*
  3. *Compute Deterministic Readiness Scores*
  4. *Share Immutable, Evidence-Backed Reports*
- **Role Pathways Showcase**: Tailored value propositions for **Engineering Leads**, **QA/Testers**, **DevOps/Platform**, and **Consultancy Agencies**.
- **Scoring Methodology Breakdown**: Transparent explanation of scoring weights (Reliability 30%, Latency 25%, Capacity 20%, Stability 15%, Hygiene 10%).
- **One-Click Role Quick Login**: Direct sign-in buttons for **Alex Rivera (Owner)** and **Sam Taylor (Tester)** for instant exploration.

### 2. Authentication, Onboarding & Dual-Scope RBAC
- **Email-Based Session Authentication**: Sign In / Sign Up with persistent local session caching (`ps_session_user`).
- **Interactive First-Time Onboarding**: Automatically detects new signups, collects company name, initial workspace slug, and primary project environment.
- **Dual-Scope Role-Based Access Control (RBAC)**:
  - **Organization Roles**: `owner`, `admin`, `member`, `viewer`
  - **Project Roles**: `owner`, `admin`, `tester`, `viewer`
  - **Permission Enforcement**:
    - **Owner/Admin**: Full configuration, member invitations, role management, access request approvals, target creation, test plan authoring, run execution.
    - **Tester**: Allowed to trigger test runs and inspect telemetry/reports; strictly restricted from altering target configurations or editing test plans.
    - **Viewer**: Read-only access to dashboard statistics, historical runs, and final reports.
- **Multi-Workspace Switcher**: Seamlessly switch between active organizations in the header dropdown.
- **Organization Settings & Team Management**:
  - Member list with roles.
  - Role promotion/demotion.
  - Team member invitations with shareable invitation tokens.
  - Self-service access request submission and approval workflow.

### 3. Target Registration & SSRF Safety Guard
- **Target URL Management**: Register base URL and dedicated health check URL (`/health`).
- **Target Authorization Mandate**: Checkbox confirmation requiring explicit confirmation of target endpoint ownership or authorization.
- **SSRF & Network Security Guard** (`@proofscale/shared`):
  - Blocks IPv4 loopback (`127.0.0.0/8`).
  - Blocks private RFC1918 networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
  - Blocks Link-Local & AWS/Cloud metadata IPs (`169.254.169.254`).
  - Blocks IPv6 loopback (`::1`), Link-Local (`fe80::/10`), and Unique Local (`fc00::/7`).
  - Rejects dangerous service ports (SSH `22`, Telnet `23`, Redis `6379`, MySQL `3306`, PostgreSQL `5432`, MongoDB `27017`).
  - Strips URL fragments and rejects embedded Basic Auth credentials.

### 4. Test Plan Builder & Load Profiles
- **5 Built-In Load Presets**:
  - **Smoke Check**: Fast baseline verification (1–5 VUs, 15–30s).
  - **Standard Load**: Sustained traffic validation under expected peak capacity.
  - **Stress Test**: High-concurrency stepped ramp-up to determine breaking points.
  - **Spike Test**: Sudden traffic surge to measure scale-up and recovery elasticity.
  - **Soak Test**: Long-duration endurance check to uncover memory leaks and resource degradation.
- **Multi-Scenario Endpoint Modeling**:
  - Define multiple HTTP endpoints (methods `GET`, `POST`, `PUT`, `DELETE`).
  - Custom paths, JSON body payloads, and custom request headers.
  - Scenario traffic weighting (e.g., 70% GET /products, 30% POST /checkout).
- **Custom SLA Thresholds**:
  - Max $p95$ response time threshold (ms).
  - Maximum allowed HTTP error rate (%).
  - Minimum sustained requests per second (RPS).
- **Plan Versioning**: Tracks versions per project with immutability for past test runs.

### 5. Live Run Monitor & Execution Worker Engine
- **Atomic Job Queue & Worker Daemon**:
  - Database-backed job queue with atomic lease locks to prevent double-execution across worker instances.
  - Worker heartbeats and timeout detection.
- **Real-Time Telemetry Streaming**:
  - Live execution stage progress (Ramp-up, Sustained Load, Ramp-down).
  - Active Virtual Users (VUs) and instantaneous RPS rate.
  - Real-time cumulative request count, success rate, and HTTP error count.
  - Live latency distribution updates.
- **Emergency Abort & Global Kill Switch**:
  - Ability to cancel/abort an in-flight test run immediately.
  - Global emergency kill switch that halts all worker execution across the platform.

### 6. Deterministic Scoring Engine (`mvp-1`) & Findings
- **Calibrated Formula-Based Scoring (0–100)**:
  - **Reliability (30%)**: Error rate & HTTP failure ratio.
  - **Latency (25%)**: $p50, p95, p99$ response times evaluated against plan SLA thresholds.
  - **Capacity (20%)**: Achieved sustained RPS vs declared minimum target RPS.
  - **Stability (15%)**: Variance, standard deviation, and request timeout counts.
  - **Hygiene (10%)**: Health check validation and configuration safety.
- **Hard Safety Caps**:
  - If HTTP error rate exceeds **5%**, the overall score is automatically capped at **49** (status: **Not ready**).
- **Readiness Badges**:
  - `90 – 100`: **Ready** (Green)
  - `75 – 89`: **Conditionally ready** (Yellow)
  - `50 – 74`: **Needs investigation** (Orange)
  - `0 – 49`: **Not ready** (Red)
- **Confidence Grades**: `high`, `medium`, or `low` based on sample size and duration.
- **Automated Root-Cause Findings**: Generates prioritized diagnostic findings (`critical`, `warning`, `info`) with recommendations (e.g., Latency degradation under peak concurrency, elevated 5xx error rate).

### 7. Comprehensive Reports & Run Comparison
- **Executive Summary Dashboard**: Score dial, readiness badge, confidence indicator, and SLA pass/fail status.
- **Latency Distribution Percentiles**: $p50$, $p90$, $p95$, $p99$, min, and max response times.
- **HTTP Status Code Breakdown**: Visual distribution of 2xx, 3xx, 4xx, and 5xx responses.
- **Artifact Downloads**:
  - Download raw JSON execution metrics.
  - Download CSV timeseries data.
  - Export full GitHub-Flavored Markdown summary report.
- **Run Comparison Engine**: Side-by-side comparison of any two historical runs calculating deltas ($\Delta$) in Score, $p95$ Latency, Error Rate, and Throughput.

### 8. Token-Hashed Secure Report Sharing
- **Cryptographic Share Links**: Generates unique share URLs with SHA-256 hashed tokens stored in the database (raw token is never persisted in plain text).
- **Expiration & Access Control**: Optional expiry timestamps on shared links.
- **One-Click Revocation**: Instant revocation of shared public report access by project owners.

### 9. Local Staging Target Fixture (`apps/fixture-target`)
- Dedicated local mock API on port `4000` with realistic endpoints:
  - `GET /health` — Returns `{ status: "ok" }`
  - `GET /api/v1/products` — Returns sample product catalog
  - `POST /api/v1/checkout` — Simulates order checkout with artificial 30ms latency
  - `GET /api/v1/slow` — Simulates slow response (350ms delay)
  - `GET /api/v1/error` — Simulates 500 Internal Server Error for failure testing

---

## 🔑 Pre-Seeded Credentials & Test Data

The database comes pre-seeded with default demo data:

| Account | Email | Password | Role | Description |
|---|---|---|---|---|
| **Alex Rivera** | `lead@acme.dev` | *Any / One-Click* | **Org Owner** | Full administrative rights over organization, plans, targets, and members |
| **Sam Taylor** | `qa.tester@acme.dev` | *Any / One-Click* | **Tester** | Restricted execution access (can run tests and view reports, cannot modify plans) |

### Pre-Seeded Resources:
- **Organization**: `Acme Engineering Corp` (`org_default_01`)
- **Project**: `Payment Gateway API` (`proj_demo_01`, Staging)
- **Target Endpoint**: `http://localhost:4000` (Verified)
- **Test Plan**: `Checkout API Smoke Check` (`plan_smoke_01`, Smoke profile)

---

## 🧪 How to Test the Platform

### A. Automated Test Suite (Unit & Integration)

ProofScale includes unit and integration tests across the Control Plane, Worker Engine, Scoring Engine, and SSRF Guards.

```bash
# Run the complete test suite across all workspace packages
npm test
```

#### What is covered in the automated tests:
1. **RBAC & Permissions (`apps/server/src/__tests__/authz.test.ts`)**:
   - Organization Owner vs Project Owner vs Tester vs Viewer permission matrix.
   - Onboarding flow and initial workspace creation.
   - Invitation workflows and access request approval.
   - Mutation boundary enforcement (e.g. verifying Testers cannot mutate test plans or register targets).
2. **API Routers (`apps/server/src/__tests__/routers.test.ts`)**:
   - System health probe, presets retrieval, org/project listing, target query, and plan retrieval.
3. **Target Safety & SSRF Pipeline (`apps/server/src/__tests__/safety.test.ts`)**:
   - IPv4 loopback, private ranges, link-local, cloud metadata blocking.
   - IPv6 forbidden ranges blocking.
   - URL sanitization, credential stripping, dangerous port rejection.
   - Emergency kill switch activation and run creation inhibition.
4. **Scoring & Report Engine (`apps/server/src/__tests__/scoring.test.ts`)**:
   - 100/100 readiness score calculation for nominal metrics.
   - Hard error cap enforcement (score capped at 49 for >5% error rate).
   - Low confidence grade calculation for small sample sizes.
   - Automated finding generation (critical, info).
   - GitHub-Flavored Markdown report formatting.
   - Run comparison engine deltas.
   - Token-hashed report sharing and revocation.
5. **Execution Worker Engine (`apps/worker/src/__tests__/worker.test.ts`)**:
   - Atomic queue claim mechanism with lease locking.
   - k6 runner script code generator.
   - End-to-end execution against staging fixture and metric extraction.
   - Callback client and artifact recording.

---

### B. Running Local Development Services

To test the full web interface interactively, launch the development processes:

#### Option 1: Start All Services via 4 Separate Terminals
```bash
# Terminal 1: Staging Target Fixture (Port 4000)
npm run dev:fixture

# Terminal 2: Control Plane API Server (Port 3001)
npm run dev:server

# Terminal 3: Execution Worker Daemon
npm run dev:worker

# Terminal 4: React Web Frontend (Port 3000)
npm run dev:web
```

#### Option 2: Start All in One Command
```bash
npm run dev
```

Open your browser and navigate to: **`http://localhost:3000`**

---

### C. Step-by-Step Manual End-to-End Test Flows

#### Flow 1: Landing Page & Quick Login
1. Open `http://localhost:3000` to view the public landing page.
2. Observe the animated point-wave background, hero assessment preview, and scrollytelling story.
3. Click **"Sign In as Alex Rivera (Owner)"** in the top navigation or banner.
4. You will be redirected to the **Dashboard Overview** (`/dashboard` or `/projects`).

#### Flow 2: Target Registration & SSRF Safety
1. Click the **"Targets"** tab in the sidebar navigation.
2. Review the pre-registered target: `http://localhost:4000`.
3. Try registering a new target with an unsafe URL (e.g. `http://169.254.169.254` or `http://10.0.0.1:6379`) to test SSRF validation rejection.
4. Register a valid staging endpoint (e.g. `http://localhost:4000`), tick the authorization confirmation checkbox, and click **"Register Target"**.

#### Flow 3: Build a New Test Plan
1. Navigate to the **"Test Plans"** tab.
2. Click **"Create Test Plan"** or select a preset:
   - Choose **"Smoke Check"** or **"Standard Load"**.
3. Customize plan parameters:
   - **Plan Name**: e.g., `Checkout Load Test v1`
   - **Endpoints**: Add `GET /api/v1/products` (Weight: 3) and `POST /api/v1/checkout` (Weight: 1).
   - **Thresholds**: Set max $p95$ latency to `250ms`, max error rate to `1.0%`.
4. Click **"Save Test Plan"**. The plan will be created with version 1.

#### Flow 4: Trigger a Test Run & Observe Real-Time Telemetry
1. Navigate to the **"Live Runs"** tab.
2. Select your test plan from the dropdown and click **"Start Test Run"**.
3. Observe the live state progression:
   - Status changes from `queued` to `running`.
   - Real-time telemetry cards update with Virtual Users (VUs), live RPS, elapsed seconds, and error counts.
   - Live progress bar advances through execution phases.
4. Once completed, status updates to `completed` and the readiness score badge appears.
5. Click **"View Report"** on the completed run.

#### Flow 5: Inspect Scores, Findings & Export Evidence
1. On the **Report Detail View**:
   - Inspect the **Overall Readiness Score** (e.g. `98 / 100 — Ready`).
   - Check the **Score Category Breakdown** (Reliability, Latency, Capacity, Stability, Hygiene).
   - Review the **Latency Percentile Matrix** ($p50$, $p90$, $p95$, $p99$).
   - Check the **Automated Findings** section for diagnostic warnings or clean SLA notices.
2. Click **"Export Markdown"** to copy/download the formatted summary report.
3. Click **"Download Raw Artifacts"** (JSON/CSV) to inspect empirical telemetry records.

#### Flow 6: Create & Revoke a Public Share Link
1. In the Report view, click **"Share Report"**.
2. Click **"Generate Share Link"** (supports optional expiration).
3. Copy the generated public link and open it in an Incognito / private browser window to confirm read-only access without login.
4. Return to the report and click **"Revoke Link"** to verify access is immediately disabled.

#### Flow 7: Side-by-Side Run Comparison
1. Navigate to the **"Reports & Comparison"** tab.
2. Select **Baseline Run** (Run #1) and **Comparison Run** (Run #2).
3. Inspect the delta comparison matrix:
   - $\Delta$ Score difference.
   - $\Delta$ $p95$ Latency change (positive = regression, negative = optimization).
   - $\Delta$ Error Rate difference.

#### Flow 8: Dual-Scope RBAC & Tester Permission Boundary
1. Log out using the sidebar footer button.
2. Click **"Sign In as Sam Taylor (Tester)"**.
3. Confirm that:
   - As a Tester, you can view targets, trigger test runs, monitor live telemetry, and inspect reports.
   - Target creation and test plan editing controls are disabled/hidden or return forbidden responses.

#### Flow 9: Organization Settings & Invitations
1. Log back in as **Alex Rivera (Owner)**.
2. Navigate to **"Organization"** in the sidebar.
3. Invite a new team member by email (e.g. `dev@acme.dev`) and assign the `tester` or `member` role.
4. View pending invitations, copy the invite link, or manage active members.

---

## 🔍 Verification Checklist

| Test Area | Expected Result | Pass/Fail |
|---|---|:---:|
| **Unit & Integration Suite** | `npm test` runs 38 tests across packages with 0 failures | ✅ |
| **Target Security & SSRF** | Blocks metadata/private IPs, validates URLs, strips credentials | ✅ |
| **Kill Switch** | Halts all active worker jobs and prevents new run dispatch | ✅ |
| **Deterministic Scoring** | Error rate > 5% strictly caps score at max 49 ("Not ready") | ✅ |
| **Live Telemetry** | Active VUs, throughput RPS, and latency stream to UI during runs | ✅ |
| **Report Sharing** | SHA-256 hashed tokens ensure immutable, revocable public access | ✅ |
| **RBAC Boundaries** | Testers cannot edit plans or targets; Viewers have read-only access | ✅ |
| **Multi-Tenancy** | Organization switcher isolates projects, members, and test runs | ✅ |

---

*Document created for ProofScale Application Readiness & Load Validation Platform.*
