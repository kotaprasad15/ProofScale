# Ratecap — Application Readiness & Bounded Load Validation Platform

[![Website](https://img.shields.io/badge/Live%20Website-ratecap.vercel.app-5B5FEF?style=for-the-badge&logo=vercel)](https://ratecap.vercel.app)
[![API Status](https://img.shields.io/badge/API%20Health-Active-2FD4A6?style=for-the-badge)](https://ratecap.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

> **Live Production URL:** [https://ratecap.vercel.app](https://ratecap.vercel.app)
> 
> **Disclaimer:** Ratecap is an authorized HTTP/API performance assessment platform designed for engineering teams and launch stakeholders. It produces evidence-backed readiness scores based on synthetic load test envelopes. Ratecap results show observed performance metrics under declared test conditions and do not serve as a legal guarantee, warranty, or formal certification of live user capacity.

---

## 🚀 Product Overview

**Ratecap** is an application readiness and load validation platform built for software teams. It allows developers, engineering leaders, and consultancy agencies to submit HTTP API endpoints, define bounded load test scenarios, execute controlled performance checks on isolated workers, and receive transparent, explainable reports with versioned readiness scores ($0–100$) and downloadable raw evidence (.MD / .JSON).

### Key Capabilities
- 🛡️ **Bounded Load Profiles**: Smoke, Baseline, Stress, and Soak testing presets with hard safety caps.
- 📐 **Deterministic Scoring Engine (`mvp-1`)**: Mathematical weighted scoring across Reliability, Latency ($p50$, $p95$, $p99$), Throughput (RPS), Stability, and Health verification.
- 🏢 **Multi-Tenant RBAC**: Organization & Project tenancy with Owner, Admin, Member, and Tester roles.
- 🔗 **Token-Hashed Report Sharing**: Cryptographic SHA-256 tokens for instant 7-day shareable reports with one-click revocation.
- 🛑 **Global Safety & Kill Switch**: Built-in SSRF protection (blocking loopback/private cloud metadata IPs) and a global emergency kill switch.

---

## 🌐 Live Production Deployments

| Component | Platform | URL / Endpoint | Details |
|---|---|---|---|
| **Frontend Web App** | **Vercel** | [https://ratecap.vercel.app](https://ratecap.vercel.app) | React 19 + Vite SPA with Tailwind CSS & Recharts |
| **Control Plane API** | **Railway** | `https://<railway-domain>/trpc` | Node.js Express + tRPC v11 Control Plane |
| **Execution Worker** | **Railway** | Background Service | Continuous poll & lease runner for synthetic load jobs |
| **Database** | **PostgreSQL / SQLite** | Managed DB | Drizzle ORM with auto-migrations and foreign key indexes |

---

## 🏗️ Technical Architecture

Ratecap employs a decoupled two-plane architecture:

```text
  +-------------------------------------------------------------------+
  |                       CONTROL PLANE (Dashboard)                   |
  |  React 19 + Tailwind CSS UI  <-->  Express + tRPC v11 Server      |
  |  Drizzle ORM (PostgreSQL/SQLite) <-->  Database Queue Scheduler   |
  +---------------------------------+---------------------------------+
                                    |
                            Atomic Lease Lock
                                    v
  +-------------------------------------------------------------------+
  |                      EXECUTION PLANE (Worker Engine)              |
  |  Sandboxed k6 Runner / Node.js Load Generator Simulator           |
  |  SSRF Network Guard  <-->  Metrics Normalizer & Artifact Handler  |
  +---------------------------------+---------------------------------+
                                    |
                            HTTP/HTTPS Workload
                                    v
  +-------------------------------------------------------------------+
  |                    TARGET APPLICATION ENDPOINT                    |
  |  Authorized HTTP API Target / Staging Fixture App                 |
  +-------------------------------------------------------------------+
```

1. **Control Plane (`apps/server`, `apps/web`)**: Provides authentication, workspace management, target registration, test plan configuration, live run monitoring, deterministic scoring calculations, and report sharing.
2. **Execution Plane (`apps/worker`)**: Sandboxed load test workers that pull queued jobs from the database using atomic lease locks, execute k6/HTTP load scripts under strict safety caps, normalize metrics, and persist findings.
3. **Staging Fixture (`apps/fixture-target`)**: A local staging HTTP server (`http://localhost:4000`) for validating target workloads.

---

## 📦 Monorepo Workspace Structure

```text
Ratecap/
  ├── apps/
  │   ├── web/              # React 19 + Tailwind CSS + Recharts Dashboard (Vercel)
  │   ├── server/           # Express + tRPC v11 Control Plane API Router (Railway)
  │   ├── worker/           # Execution Plane Worker Daemon & k6 Runner Adapter (Railway)
  │   └── fixture-target/   # Local HTTP Target Application (port 4000)
  ├── packages/
  │   ├── shared/           # Zod schemas, Scoring Engine, SSRF Guard, Report Exporters
  │   └── db/               # Drizzle ORM Schema, Auto-migration, Seed script
  ├── proofscale.sqlite     # Local SQLite Database File
  └── README.md
```

---

## ⚙️ Quick Start Local Setup

### Prerequisites
- Node.js `v20+` or `v22+`
- npm `v10+`

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/kotaprasad15/ProofScale.git
cd ProofScale
npm install
```

### 2. Database Initialization
Tables and seed data are automatically initialized on startup, or you can run:
```bash
npm run db:seed
```

### 3. Run Development Services
Run the full monorepo stack:
```bash
npm run dev
```

Or run individual services in separate terminals:
```bash
# Terminal 1: Staging Target Fixture (http://localhost:4000)
npm run dev:fixture

# Terminal 2: Control Plane API (http://localhost:3001)
npm run dev:server

# Terminal 3: Execution Worker Daemon
npm run dev:worker

# Terminal 4: Web Dashboard (http://localhost:3000)
npm run dev:web
```

---

## 📊 Deterministic Scoring Model (`mvp-1`)

Scores are mathematically versioned and computed from measured empirical telemetry:

| Category | Description | Weight |
|---|---|---:|
| **Reliability** | HTTP error rate and request failure evaluation | **30%** |
| **Latency** | $p50$, $p95$, and $p99$ response times relative to plan thresholds | **25%** |
| **Capacity Behavior** | Sustained RPS throughput vs target minimum RPS | **20%** |
| **Stability** | Request timeouts and response time variance | **15%** |
| **Readiness Hygiene** | Health endpoint verification and configuration safety | **10%** |

### Hard Safety Caps & Status Tiers
- **Critical Error Cap**: If HTTP error rate exceeds $5\%$, overall score is capped to a maximum of **49** (**Not ready**).
- **Readiness Labels**:
  - `90–100`: **Ready** (Passes declared SLA thresholds)
  - `75–89`: **Conditionally ready** (Passing with minor latency drift)
  - `50–74`: **Needs investigation** (Elevated latency or threshold breaches)
  - `0–49`: **Not ready** (High error rate or severe failure)

---

## 🔒 Security & Safety Controls

- **SSRF Network Guard**: Blocks loopback (`127.0.0.0/8`), private IPv4 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), Link-Local (`169.254.0.0/16`), and AWS/Cloud Metadata IPs (`169.254.169.254`).
- **Target Authorization**: Requires explicit user domain authorization confirmation.
- **Emergency Kill Switch**: Instant system-wide abort for all active and queued test runs.
- **Hashed Share Tokens**: Share tokens are securely hashed with SHA-256 with customizable 7-day expiration and instant one-click revocation.

---

## 🧪 Testing & Verification

Run the automated test suite across all workspace packages:
```bash
# Run unit & integration test suites
npm test

# Build all monorepo packages
npm run build
```

---

## 📜 License
MIT License. Developed for deterministic application readiness and load validation.
