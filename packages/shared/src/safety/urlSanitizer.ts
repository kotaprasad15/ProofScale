import { isBlockedIP, isIPv4, isIPv6 } from "./ipGuard.js";

export interface UrlValidationResult {
  isValid: boolean;
  normalizedUrl?: string;
  allowedHost?: string;
  resolvedIps?: string[];
  reason?: string;
}

/**
 * Sanitizes and validates a target URL against SSRF attack vectors and protocol restrictions.
 */
export function sanitizeTargetUrl(rawUrl: string): UrlValidationResult {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch (err) {
    return { isValid: false, reason: "Malformed URL syntax." };
  }

  // 1. Enforce HTTP / HTTPS scheme strictly
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { isValid: false, reason: `Unsupported protocol '${parsed.protocol}'. Only HTTP and HTTPS targets are allowed.` };
  }

  // 2. Reject embedded credentials (http://user:pass@host)
  if (parsed.username || parsed.password) {
    return { isValid: false, reason: "Target URL must not contain embedded username or password credentials." };
  }

  // 3. Strip URL fragment & hash
  parsed.hash = "";

  // 4. Reject non-standard dangerous ports if needed (e.g. SSH 22, SMTP 25, MySQL 3306, Redis 6379)
  const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === "https:" ? 443 : 80);
  const blockedInternalPorts = [21, 22, 23, 25, 53, 110, 143, 3306, 5432, 6379, 11211, 27017];
  if (blockedInternalPorts.includes(port)) {
    return { isValid: false, reason: `Port ${port} is a restricted system service port and cannot be targeted.` };
  }

  return {
    isValid: true,
    normalizedUrl: parsed.toString(),
    allowedHost: parsed.host
  };
}

/**
 * Resolves a target hostname via DNS and checks whether any resolved IPs are in blocked private/SSRF ranges.
 */
export async function validateTargetHostDns(
  hostname: string,
  options: { allowPrivateIPs?: boolean } = {}
): Promise<{ isValid: boolean; resolvedIps: string[]; reason?: string }> {
  // Extract hostname if port is included
  const host = hostname.includes(":") && !hostname.startsWith("[") ? hostname.split(":")[0] : hostname;

  // Direct IP address check
  if (isIPv4(host) || isIPv6(host)) {
    if (isBlockedIP(host, options.allowPrivateIPs)) {
      return {
        isValid: false,
        resolvedIps: [host],
        reason: `Destination IP address '${host}' is in a private, loopback, or restricted network range.`
      };
    }
    return { isValid: true, resolvedIps: [host] };
  }

  // Handle localhost explicitly
  if (host === "localhost") {
    const localhostIp = "127.0.0.1";
    if (isBlockedIP(localhostIp, options.allowPrivateIPs)) {
      return {
        isValid: false,
        resolvedIps: [localhostIp],
        reason: `Destination host '${host}' resolves to restricted loopback address '${localhostIp}'.`
      };
    }
    return { isValid: true, resolvedIps: [localhostIp] };
  }

  // Domain resolution via Node.js DNS lookup
  try {
    const dnsModule = await import("node:dns");
    const dnsPromises = dnsModule.default?.promises || dnsModule.promises;

    const records = await dnsPromises.lookup(host, { all: true });
    if (!records || records.length === 0) {
      return { isValid: false, resolvedIps: [], reason: `Unable to resolve DNS for domain '${host}'.` };
    }

    const addresses = records.map(r => r.address);
    const blocked = addresses.filter((ip: string) => isBlockedIP(ip, options.allowPrivateIPs));

    if (blocked.length > 0) {
      return {
        isValid: false,
        resolvedIps: addresses,
        reason: `Domain '${host}' resolved to restricted IP address '${blocked[0]}'. Target is blocked by SSRF protection policy.`
      };
    }

    return { isValid: true, resolvedIps: addresses };
  } catch (err: any) {
    return {
      isValid: false,
      resolvedIps: [],
      reason: `DNS resolution failed for host '${host}': ${err?.message || "Lookup error"}`
    };
  }
}
