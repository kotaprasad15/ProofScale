export function isIPv4(ip: string): boolean {
  if (typeof ip !== "string") return false;
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every(part => {
    if (!/^\d+$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255 && (part === "0" || !part.startsWith("0"));
  });
}

export function isIPv6(ip: string): boolean {
  if (typeof ip !== "string") return false;
  if (ip === "::1" || ip === "::") return true;
  return /^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$/.test(ip) || ip.includes("::");
}

/**
 * Checks if a given IPv4 address falls within private, loopback, link-local, or cloud metadata ranges.
 */
export function isPrivateIPv4(ip: string): boolean {
  if (!isIPv4(ip)) return false;

  const parts = ip.split(".").map(Number);
  const [a, b, c, d] = parts;

  // 0.0.0.0/8 (This network)
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-Local & Cloud Metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (Carrier Grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (Documentation/TEST-NET)
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (a >= 224) return true;

  return false;
}

/**
 * Checks if a given IPv6 address falls within private, loopback, link-local, or IPv4-mapped private ranges.
 */
export function isPrivateIPv6(ip: string): boolean {
  if (!isIPv6(ip)) return false;

  const normalized = ip.toLowerCase();

  // ::1 (Loopback) or :: (Unspecified)
  if (normalized === "::1" || normalized === "::") return true;

  // fe80::/10 (Link-Local)
  if (normalized.startsWith("fe80:") || normalized.startsWith("fe9:") || normalized.startsWith("fea:") || normalized.startsWith("feb:")) {
    return true;
  }

  // fc00::/7 (Unique Local Address)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  // IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1, ::ffff:10.0.0.1)
  if (normalized.includes("::ffff:")) {
    const ipv4Part = normalized.split("::ffff:")[1];
    if (ipv4Part && isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
  }

  return false;
}

/**
 * Validates if an IP address (v4 or v6) is private or blocked for outbound production load testing.
 */
export function isBlockedIP(ip: string, allowPrivate = false): boolean {
  if (allowPrivate) return false;
  if (isIPv4(ip)) return isPrivateIPv4(ip);
  if (isIPv6(ip)) return isPrivateIPv6(ip);
  // Invalid IP format is blocked
  return true;
}
