/**
 * urlValidator.ts — SSRF protection for HTTP tools.
 *
 * Blocks private IPs, internal hostnames, and dangerous schemes.
 */

import * as dns from "node:dns";
import * as net from "node:net";
import { SecurityError } from "./SecurityError.js";
import { getSecurityConfig } from "./config.js";

export interface UrlValidationOpts {
  /** Allow requests to private/internal IPs (for known internal services) */
  allowPrivate?: boolean;
  /** Additional blocked hostnames */
  blockedHostnames?: string[];
}

// Hostnames that are always blocked (cloud metadata endpoints)
const BLOCKED_HOSTNAMES = [
  "metadata.google.internal",
  "metadata.google.com",
  "169.254.169.254",
  "100.100.100.200", // Alibaba Cloud metadata
];

// Allowed URL schemes
const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts[0] === 10) return true; // 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
    if (parts[0] === 127) return true; // 127.0.0.0/8
    if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16 (link-local)
    if (parts[0] === 0) return true; // 0.0.0.0/8
  }

  // IPv6 private ranges
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true; // loopback
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7
    if (lower.startsWith("fe80")) return true; // fe80::/10
  }

  return false;
}

/**
 * Validate a URL for SSRF safety.
 *
 * @throws SecurityError if URL targets private infrastructure
 * @returns The validated URL string
 */
export function safeUrl(url: string, opts?: UrlValidationOpts): string {
  const config = getSecurityConfig();
  if (config.mode === "permissive") return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SecurityError("URL_BAD_SCHEME", `Invalid URL: ${url.substring(0, 100)}`);
  }

  // Scheme check
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new SecurityError(
      "URL_BAD_SCHEME",
      `Blocked URL scheme "${parsed.protocol}" — only http: and https: are allowed`,
    );
  }

  // Skip private IP checks if explicitly allowed
  if (opts?.allowPrivate) return url;

  const hostname = parsed.hostname.toLowerCase();

  // Block known metadata endpoints
  const allBlocked = [...BLOCKED_HOSTNAMES, ...(opts?.blockedHostnames ?? [])];
  if (allBlocked.includes(hostname)) {
    throw new SecurityError(
      "URL_PRIVATE_IP",
      `Blocked request to internal service: ${hostname}`,
    );
  }

  // Check if hostname is already an IP
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      if (config.mode === "audit_only") return url;
      throw new SecurityError(
        "URL_PRIVATE_IP",
        `Blocked request to private IP: ${hostname}`,
      );
    }
  }

  // For hostnames that look like "localhost" or similar
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    if (config.mode === "audit_only") return url;
    throw new SecurityError(
      "URL_PRIVATE_IP",
      `Blocked request to local hostname: ${hostname}`,
    );
  }

  return url;
}

/**
 * Async version that also checks DNS resolution for rebinding attacks.
 * Use this for user-facing tools where the hostname isn't known-safe.
 */
export async function safeUrlWithDnsCheck(
  url: string,
  opts?: UrlValidationOpts,
): Promise<string> {
  // First do synchronous checks
  const validated = safeUrl(url, opts);

  const config = getSecurityConfig();
  if (config.mode === "permissive" || opts?.allowPrivate) return validated;

  const parsed = new URL(validated);
  const hostname = parsed.hostname;

  // Skip DNS check if already an IP
  if (net.isIP(hostname)) return validated;

  // Resolve hostname and check the actual IP
  try {
    const { address } = await dns.promises.lookup(hostname);
    if (isPrivateIP(address)) {
      if (config.mode === "audit_only") return validated;
      throw new SecurityError(
        "URL_DNS_REBIND",
        `DNS rebinding detected: ${hostname} resolves to private IP ${address}`,
      );
    }
  } catch (e) {
    if (e instanceof SecurityError) throw e;
    // DNS lookup failed — allow (could be transient)
  }

  return validated;
}
