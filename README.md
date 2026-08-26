# ProofScale — Application Readiness & Load Validation Platform

> **Disclaimer:** ProofScale is an authorized HTTP/API performance assessment platform designed for development and engineering teams. It produces evidence-backed readiness scores based on synthetic load test envelopes. ProofScale results show observed performance metrics under declared test conditions and do not serve as a legal guarantee, warranty, or formal certification of live user capacity.

---

## 🚀 Product Overview

ProofScale is an application readiness and load validation platform built for software teams. It allows developers, consultancy agencies, and clients to submit HTTP API endpoints, define bounded load test scenarios, execute controlled performance checks on isolated workers, and receive transparent, explainable reports with versioned readiness scores and downloadable raw evidence.

---

## 🏗️ Technical Architecture

ProofScale uses a clean two-plane architecture:

```text
  +-------------------------------------------------------------------+
  |                       CONTROL PLANE (Dashboard)                   |
  |  React 19 + Tailwind CSS UI  <-->  Express + tRPC v11 Server      |
  |  Drizzle ORM (MySQL/SQLite)  <-->  Database Queue Scheduler       |
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

1. **Control Plane (`apps/server`, `apps/web`)**: A full-stack web application providing authentication, organization/project tenancy, target endpoint registration, test plan building with presets, run monitoring, deterministic scoring, report generation, and token-hashed report sharing.
2. **Execution Plane (`apps/worker`)**: Isolated, sandboxed load test workers that pull queued jobs from the database using atomic lease locks, execute k6 or Node.js HTTP load scripts under strict safety caps, normalize metrics, and upload evidence.
3. **Staging Fixture (`apps/fixture-target`)**: A local staging HTTP server (`http://localhost:4000`) for testing and validating load profiles.

---

## 📦 Workspace Package Structure

```text
ProofScale/
  ├── apps/
  │   ├── web/              # React 19 + Tailwind CSS + Recharts Dashboard
  │   ├── server/           # Express + tRPC v11 Control Plane API Router
  │   ├── worker/           # Execution Plane Worker Daemon & k6 Runner Adapter
  │   └── fixture-target/   # Local HTTP Target Application (port 4000)
  ├── packages/
  │   ├── shared/           # Zod schemas, Scoring Engine, SSRF Guard, Report Exporters
  │   └── db/               # Drizzle ORM Schema, SQLite Client, Seed script
  ├── proofscale.sqlite     # SQLite Database File
  └── README.md
```

---

## ⚙️ Quick Start Local Setup

### Prerequisites
- Node.js `v20+` or `v24+`
- npm `v10+`

### 1. Installation
Clone the repository and install dependencies:
```bash
cd ProofScale
npm install
```

### 2. Database Migration & Seeding
Initialize the SQLite database schema and seed default fixture data (default Org, Project, Target Endpoint, and Smoke Test Plan):
```bash
npm run db:push
npm run db:seed
```

### 3. Run Development Services
You can run individual services in separate terminals:

```bash
# Terminal 1: Start Staging Target Fixture (http://localhost:4000)
npm run dev:fixture

# Terminal 2: Start Control Plane API (http://localhost:3001)
npm run dev:server

# Terminal 3: Start Execution Worker Daemon
npm run dev:worker

# Terminal 4: Start Web Dashboard (http://localhost:3000)
npm run dev:web
```

---

## 📊 Deterministic Scoring Model (`mvp-1`)

Scores are versioned, explainable, and calculated from measured empirical data—never produced by an uncalibrated LLM:

| Category | Description | Weight |
|---|---|---:|
| **Reliability** | HTTP error rate and request failure evaluation | **30%** |
| **Latency** | $p50$, $p95$, and $p99$ response times relative to plan thresholds | **25%** |
| **Capacity Behavior** | Sustained RPS throughput vs target minimum RPS | **20%** |
| **Stability** | Request timeouts and response time variance | **15%** |
| **Readiness Hygiene** | Health endpoint verification and configuration safety | **10%** |

### Hard Safety Caps & Labels
- **Critical Failure Penalty**: If HTTP error rate $> 5\%$, overall score is capped to a maximum of **49** (**Not ready**).
- **Readiness Labels**: $90-100$ (**Ready**), $75-89$ (**Conditionally ready**), $50-74$ (**Needs investigation**), $0-49$ (**Not ready**).

---

## 🔒 Security & Abuse Prevention

- **SSRF & Network Guard**: Blocks loopback (`127.0.0.0/8`), private IPv4 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), Link-Local (`169.254.0.0/16`), and AWS/Cloud Metadata IPs (`169.254.169.254`).
- **Authorization Acknowledgement**: Requires explicit user ownership confirmation before registering targets.
- **Global Emergency Kill Switch**: System-wide kill switch disabling run creation and aborting active workers.
- **Hashed Report Share Links**: Share tokens are hashed using SHA-256 in the database; raw tokens are never stored, and links support expiry dates and instant revocation.

---

## 🧪 Testing

Run the automated test suite across all workspace packages:
```bash
# Run all unit and integration tests
npm test

# Build all packages
npm run build
```

---

## 📜 License
MIT License. Created for application readiness validation.
