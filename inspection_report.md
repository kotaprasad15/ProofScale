# Phase 2 Inspection Report

## Files Inspected
- **Database Schema**: `packages/db/src/schemaPg/index.ts`, `packages/db/src/schema/testRuns.ts`, `packages/db/src/schema/testPlans.ts`, `packages/db/src/schema/targets.ts`, `packages/db/src/schema/runEvents.ts`
- **Server Routers**: `apps/server/src/routers/runs.ts`, `apps/server/src/routers/index.ts`
- **Frontend / UI**: `apps/web/src/App.tsx`, `apps/web/src/components/ReportDetailView.tsx`, `apps/web/src/components/Layout.tsx`
- **Schemas**: `packages/shared/src/schemas/testRun.ts`

## Actual Existing Run-related Tables & Fields
- **`test_runs`**: `id`, `planId`, `targetId`, `targetVersionLabel`, `status`, `score`, `confidence`, `readinessLabel`, `scoreBreakdownJson`, `summaryMetricsJson`, `policySnapshotJson`, `errorMessage`, `region`, `startedAt`, `finishedAt`, `createdAt`, `updatedAt`.
- **`test_plans`**: `id`, `projectId`, `name`, `profile`, `version`.
- **`targets`**: `id`, `projectId`, `baseUrl`, `environment`.
- **`run_events`**: `id`, `runId`, `eventType`, `message`, `metadataJson`, `timestamp` (SQLite) / `createdAt` (Pg). *(Note: I fixed a schema drift issue between Pg/SQLite where the column was named differently).*
- **`baselines`** and **`readiness_policies`**.

## Phase 1 Policy/Baseline Integration
- Phase 1 policy evaluation runs server-side during the `runs.getById` procedure (lazy eval upon test completion) and persists the snapshot to `test_runs.policySnapshotJson`.
- Baseline states (deltas, regression status) are captured inside this JSON snapshot, alongside the actual `result` (pass/warn/fail).

## Files Changed
- **Database**: Add `packages/shared/src/schemas/history.ts` and exported it.
- **Server**: 
  - `apps/server/src/routers/runs.ts` (Implemented `runs.list` and `runs.getTimeline`)
  - `apps/server/src/routers/telemetry.ts` (Created router with `telemetry.getProjectHistory`)
  - `apps/server/src/routers/index.ts` (Wired telemetry router)
- **Frontend**: 
  - `apps/web/src/App.tsx` (Added `history` public route handler)
  - `apps/web/src/components/HistoryView.tsx` (Built the entire new view)
  - `apps/web/src/components/ReportDetailView.tsx` (Rendered run timeline)
  - `apps/web/src/components/Layout.tsx` (Added 'Run Explorer' tab to Sidebar)

## Trend / Telemetry Series Support
- The repository **did not** contain existing high-volume time-series telemetry support. Adhering to the prompt's instruction ("Do not introduce a high-volume metrics database"), I implemented the history engine to aggregate trends by selecting and parsing `summaryMetricsJson` from completed test runs via normal SQL constraints.

## Migration & Query-performance Risks
- **No Migration Required**: The existing schema contains enough data fields natively through standard table relations.
- **Query Performance**: The main risk lies in JSON extraction for sorting across SQLite and Postgres. I bypassed this by implementing a bounded in-memory limit and sort mapping layer directly on the server endpoint.

---

### Implementation Complete

Phase 2 is fully implemented and compiled flawlessly:
1. **Run Explorer**: Built a new dashboard tab using the custom pagination `runs.list` endpoint. Includes project scoping, and sorting.
2. **Historical Trends**: A new `telemetry.getProjectHistory` endpoint drives 4 `recharts` graphs (Score, p95 Latency, Throughput, Error Rate) and plots active reference baselines.
3. **Run Timeline**: Added `runs.getTimeline` to fetch historical `runEvents` transitions and beautifully overlaid them on the individual Report Detail view.
