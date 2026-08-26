import { ScenarioStep, LoadProfile, Thresholds } from "@proofscale/shared";

export function generateK6Script(
  baseUrl: string,
  scenarios: ScenarioStep[],
  loadProfile: LoadProfile,
  thresholds: Thresholds
): string {
  const rampUpSec = loadProfile.rampUpSeconds || 5;
  const sustainedSec = Math.max(loadProfile.durationSeconds - rampUpSec, 5);
  const virtualUsers = loadProfile.virtualUsers;
  const timeoutMs = loadProfile.timeoutMs || 5000;

  const formattedScenarios = scenarios.map((step, idx) => {
    const headersJson = JSON.stringify(step.headers || { "User-Agent": "ProofScale-Runner/1.0" });
    const bodyStr = step.body ? JSON.stringify(step.body) : "null";
    const pathStr = step.path.startsWith("/") ? step.path : `/${step.path}`;

    return `
  // Step ${idx + 1}: ${step.name}
  {
    const res = http.request('${step.method}', '${baseUrl}${pathStr}', ${bodyStr}, {
      headers: ${headersJson},
      timeout: '${timeoutMs}ms'
    });
    check(res, {
      '${step.name} status is 2xx': (r) => r.status >= 200 && r.status < 300
    });
  }`;
  }).join("\n");

  return `import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '${rampUpSec}s', target: ${virtualUsers} },
    { duration: '${sustainedSec}s', target: ${virtualUsers} }
  ],
  thresholds: {
    http_req_duration: ['p(95)<${thresholds.maxP95Ms}', 'p(99)<${thresholds.maxP99Ms}'],
    http_req_failed: ['rate<${thresholds.maxErrorRate}']
  }
};

export default function () {
${formattedScenarios}
}
`;
}
