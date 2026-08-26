import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import { SummaryMetrics, ScenarioStep, LoadProfile, Thresholds, KillSwitch } from "@proofscale/shared";
import { generateK6Script } from "./k6ScriptGenerator.js";

export interface ExecutionResult {
  metrics: SummaryMetrics;
  rawOutput: string;
  engineUsed: "k6" | "node-http-simulator";
}

/**
 * Checks if k6 CLI is available on PATH.
 */
export function isK6Available(): boolean {
  try {
    execSync("k6 version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Main execution entrypoint: runs load test via native k6 or Node.js HTTP simulator fallback.
 */
export async function executeLoadTest(
  baseUrl: string,
  scenarios: ScenarioStep[],
  loadProfile: LoadProfile,
  thresholds: Thresholds,
  checkCancellation?: () => Promise<boolean>
): Promise<ExecutionResult> {
  const useK6 = isK6Available();

  if (useK6) {
    try {
      return await executeNativeK6Test(baseUrl, scenarios, loadProfile, thresholds, checkCancellation);
    } catch (err: any) {
      console.warn("⚠️ Native k6 execution failed. Falling back to Node.js HTTP load simulator:", err?.message);
      return await executeNodeHttpLoadTest(baseUrl, scenarios, loadProfile, checkCancellation);
    }
  }

  return await executeNodeHttpLoadTest(baseUrl, scenarios, loadProfile, checkCancellation);
}

/**
 * Native k6 runner execution wrapper.
 */
async function executeNativeK6Test(
  baseUrl: string,
  scenarios: ScenarioStep[],
  loadProfile: LoadProfile,
  thresholds: Thresholds,
  checkCancellation?: () => Promise<boolean>
): Promise<ExecutionResult> {
  const scriptContent = generateK6Script(baseUrl, scenarios, loadProfile, thresholds);
  const tempDir = path.resolve(process.cwd(), "scratch");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const scriptPath = path.join(tempDir, `k6_script_${Date.now()}.js`);
  const summaryPath = path.join(tempDir, `k6_summary_${Date.now()}.json`);
  fs.writeFileSync(scriptPath, scriptContent, "utf8");

  return new Promise((resolve, reject) => {
    const k6Proc = spawn("k6", ["run", "--summary-export", summaryPath, scriptPath]);
    let rawOutput = "";

    k6Proc.stdout.on("data", data => { rawOutput += data.toString(); });
    k6Proc.stderr.on("data", data => { rawOutput += data.toString(); });

    const cancelInterval = setInterval(async () => {
      if (checkCancellation && await checkCancellation()) {
        k6Proc.kill("SIGTERM");
        clearInterval(cancelInterval);
        reject(new Error("Run cancelled by user request during execution."));
      }
    }, 1000);

    k6Proc.on("close", code => {
      clearInterval(cancelInterval);
      try {
        if (fs.existsSync(summaryPath)) {
          const summaryJson = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
          const metrics = parseK6SummaryJson(summaryJson);
          cleanupFiles([scriptPath, summaryPath]);
          resolve({ metrics, rawOutput, engineUsed: "k6" });
        } else {
          cleanupFiles([scriptPath]);
          // If k6 exited without summary, fallback
          resolve(executeNodeHttpLoadTest(baseUrl, scenarios, loadProfile, checkCancellation));
        }
      } catch (err) {
        cleanupFiles([scriptPath]);
        reject(err);
      }
    });
  });
}

function parseK6SummaryJson(summary: any): SummaryMetrics {
  const reqs = summary.metrics.http_reqs?.values?.count || 0;
  const duration = summary.metrics.http_req_duration?.values || {};
  const failed = summary.metrics.http_req_failed?.values?.passes || 0;
  const rate = summary.metrics.http_reqs?.values?.rate || 0;

  return {
    totalRequests: reqs,
    successfulRequests: reqs - failed,
    failedRequests: failed,
    throughputRps: Math.round(rate * 10) / 10,
    p50Ms: Math.round(duration["p(50)"] || duration.med || 0),
    p95Ms: Math.round(duration["p(95)"] || 0),
    p99Ms: Math.round(duration["p(99)"] || 0),
    minMs: Math.round(duration.min || 0),
    maxMs: Math.round(duration.max || 0),
    avgMs: Math.round(duration.avg || 0),
    errorRate: reqs > 0 ? Math.round((failed / reqs) * 10000) / 10000 : 0,
    statusCodes: { "200": reqs - failed, "500": failed },
    timeouts: 0
  };
}

/**
 * Native Node.js HTTP load simulator fallback.
 */
export async function executeNodeHttpLoadTest(
  baseUrl: string,
  scenarios: ScenarioStep[],
  loadProfile: LoadProfile,
  checkCancellation?: () => Promise<boolean>
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const durationMs = loadProfile.durationSeconds * 1000;
  const virtualUsers = loadProfile.virtualUsers;
  const timeoutMs = loadProfile.timeoutMs || 5000;

  const latencies: number[] = [];
  const statusCodes: Record<string, number> = {};
  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  let timeouts = 0;
  let logBuffer = `[Node.js HTTP Load Simulator] Starting execution targeting ${baseUrl}\n`;
  logBuffer += `[Config] Virtual Users: ${virtualUsers}, Duration: ${loadProfile.durationSeconds}s, Timeout: ${timeoutMs}ms\n`;

  const workers = Array.from({ length: virtualUsers }).map(async (_, vuId) => {
    while (Date.now() - startTime < durationMs) {
      if (KillSwitch.isActivated()) {
        throw new Error("Execution halted: Global Emergency Kill Switch activated.");
      }
      if (checkCancellation && await checkCancellation()) {
        throw new Error("Execution cancelled by user request.");
      }

      for (const step of scenarios) {
        const stepStart = Date.now();
        totalRequests++;

        try {
          const res = await makeHttpRequest(baseUrl, step, timeoutMs);
          const elapsed = Date.now() - stepStart;
          latencies.push(elapsed);

          const statusStr = res.statusCode.toString();
          statusCodes[statusStr] = (statusCodes[statusStr] || 0) + 1;

          if (res.statusCode >= 200 && res.statusCode < 400) {
            successfulRequests++;
          } else {
            failedRequests++;
          }
        } catch (err: any) {
          const elapsed = Date.now() - stepStart;
          latencies.push(elapsed);
          failedRequests++;

          if (err.message === "TIMEOUT") {
            timeouts++;
            statusCodes["408"] = (statusCodes["408"] || 0) + 1;
          } else {
            statusCodes["500"] = (statusCodes["500"] || 0) + 1;
          }
        }

        // Pacing delay between requests (20ms)
        await new Promise(r => setTimeout(r, 20));
      }
    }
  });

  try {
    await Promise.all(workers);
  } catch (err: any) {
    if (err.message.includes("cancelled") || err.message.includes("Kill Switch")) {
      throw err;
    }
  }

  const totalDurationSec = (Date.now() - startTime) / 1000;
  const sortedLatencies = latencies.sort((a, b) => a - b);

  const getPercentile = (p: number) => {
    if (sortedLatencies.length === 0) return 0;
    const idx = Math.floor((p / 100) * sortedLatencies.length);
    return sortedLatencies[Math.min(idx, sortedLatencies.length - 1)];
  };

  const metrics: SummaryMetrics = {
    totalRequests,
    successfulRequests,
    failedRequests,
    throughputRps: totalDurationSec > 0 ? Math.round((totalRequests / totalDurationSec) * 10) / 10 : 0,
    p50Ms: getPercentile(50),
    p95Ms: getPercentile(95),
    p99Ms: getPercentile(99),
    minMs: sortedLatencies[0] || 0,
    maxMs: sortedLatencies[sortedLatencies.length - 1] || 0,
    avgMs: sortedLatencies.length > 0 ? Math.round(sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length) : 0,
    errorRate: totalRequests > 0 ? Math.round((failedRequests / totalRequests) * 10000) / 10000 : 0,
    statusCodes,
    timeouts
  };

  logBuffer += `[Summary] Completed ${totalRequests} requests in ${totalDurationSec.toFixed(1)}s (${metrics.throughputRps} RPS)\n`;
  logBuffer += `[Latency] p50: ${metrics.p50Ms}ms, p95: ${metrics.p95Ms}ms, p99: ${metrics.p99Ms}ms, Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%\n`;

  return {
    metrics,
    rawOutput: logBuffer,
    engineUsed: "node-http-simulator"
  };
}

function makeHttpRequest(baseUrl: string, step: ScenarioStep, timeoutMs: number): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(step.path.startsWith("/") ? step.path : `/${step.path}`, baseUrl);
    const transport = fullUrl.protocol === "https:" ? https : http;

    const req = transport.request(fullUrl, {
      method: step.method || "GET",
      headers: step.headers || { "User-Agent": "ProofScale-Runner/1.0" },
      timeout: timeoutMs
    }, res => {
      let body = "";
      res.on("data", chunk => { body += chunk; });
      res.on("end", () => resolve({ statusCode: res.statusCode || 500, body }));
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("TIMEOUT"));
    });

    req.on("error", err => reject(err));

    if (step.body && (step.method === "POST" || step.method === "PUT" || step.method === "PATCH")) {
      req.write(step.body);
    }

    req.end();
  });
}

function cleanupFiles(filePaths: string[]) {
  for (const fp of filePaths) {
    if (fs.existsSync(fp)) {
      try { fs.unlinkSync(fp); } catch {}
    }
  }
}
