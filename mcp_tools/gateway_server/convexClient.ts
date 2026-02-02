/**
 * Convex HTTP client for MCP gateway.
 * Calls Convex queries, mutations, and actions via the HTTP API with admin key.
 *
 * Internal functions (internalQuery/internalMutation) are callable via admin key,
 * enabling MCP-safe endpoints that accept explicit userId parameters.
 */

const CONVEX_URL = process.env.CONVEX_URL || process.env.CONVEX_BASE_URL;
const CONVEX_ADMIN_KEY = process.env.CONVEX_ADMIN_KEY;
const MCP_SERVICE_USER_ID = process.env.MCP_SERVICE_USER_ID;

if (!CONVEX_URL) {
  console.error("WARNING: CONVEX_URL not set. Gateway will fail on Convex calls.");
}
if (!MCP_SERVICE_USER_ID) {
  console.error("WARNING: MCP_SERVICE_USER_ID not set. Document tools will fail.");
}

/**
 * Returns the configured service user ID for MCP gateway operations.
 * This is injected into internal function calls that require a userId parameter.
 */
export function getServiceUserId(): string {
  if (!MCP_SERVICE_USER_ID) {
    throw new Error("MCP_SERVICE_USER_ID environment variable is required for document operations");
  }
  return MCP_SERVICE_USER_ID;
}

function getBaseUrl(): string {
  if (!CONVEX_URL) throw new Error("Missing CONVEX_URL environment variable");
  // Normalize: remove trailing slash
  return CONVEX_URL.replace(/\/$/, "");
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (CONVEX_ADMIN_KEY) {
    h["Authorization"] = `Convex ${CONVEX_ADMIN_KEY}`;
  }
  return h;
}

export async function convexQuery(
  path: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  const url = `${getBaseUrl()}/api/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ path, args }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex query ${path} failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  return (json as any).value ?? json;
}

export async function convexMutation(
  path: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  const url = `${getBaseUrl()}/api/mutation`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ path, args }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex mutation ${path} failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  return (json as any).value ?? json;
}

export async function convexAction(
  path: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  const url = `${getBaseUrl()}/api/action`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ path, args }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex action ${path} failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  return (json as any).value ?? json;
}
