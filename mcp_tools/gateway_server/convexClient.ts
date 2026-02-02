/**
 * Convex HTTP client for MCP gateway.
 * Calls Convex queries, mutations, and actions via the public HTTP API.
 */

const CONVEX_URL = process.env.CONVEX_URL || process.env.CONVEX_BASE_URL;
const CONVEX_ADMIN_KEY = process.env.CONVEX_ADMIN_KEY;

if (!CONVEX_URL) {
  console.error("WARNING: CONVEX_URL not set. Gateway will fail on Convex calls.");
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
