import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { createApp } from "./app.js";
import { startScheduler, schedulerTick } from "./services/schedulerService.js";

const PORT = process.env.PORT || 3001;

const app = createApp();

app.listen(PORT, () => {
  console.log(`🚀 ProofScale Control Plane API running on http://localhost:${PORT}`);
  console.log(`📡 tRPC endpoint available at http://localhost:${PORT}/trpc`);
});

// Phase 3: durable assessment scheduler.
// Runs inside the control-plane process (dev + Render web service). The DB
// occurrence-unique index makes multiple instances safe; SCHEDULER_ENABLED
// can force-disable it (e.g. dedicated scheduler deployment).
if (process.env.SCHEDULER_ENABLED !== "false" && process.env.NODE_ENV !== "test") {
  const intervalMs = parseInt(process.env.SCHEDULER_INTERVAL_MS || "30000", 10);
  startScheduler(intervalMs);
  // Restart-recovery sweep shortly after boot (catch up on missed occurrences).
  setTimeout(() => {
    schedulerTick().catch(() => {});
  }, 3000);
}
