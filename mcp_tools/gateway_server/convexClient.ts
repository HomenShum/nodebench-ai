/**
 * Convex client for MCP gateway.
 *
 * Calls the single /api/mcpGateway endpoint authenticated via x-mcp-secret.
 * The Convex-side dispatcher validates the secret, resolves the function from
 * a static allowlist, injects userId where needed, and dispatches.
 *
 * The admin key is NOT used — auth boundary is at the Convex httpAction level.
 */

const CONVEX_URL = process.env.CONVEX_URL || process.env.CONVEX_BASE_URL;
const MCP_SECRET = process.env.MCP_SECRET;

if (!CONVEX_URL) {
  console.error("WARNING: CONVEX_URL not set. Gateway will fail on Convex calls.");
}
if (!MCP_SECRET) {
  console.error("WARNING: MCP_SECRET not set. Gateway will fail on Convex calls.");
}

/**
 * Call the Convex MCP gateway dispatcher.
 * @param fn - Function name matching the dispatcher's allowlist key
 * @param args - Arguments to pass to the function
 */
export async function callGateway(
  fn: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  if (!CONVEX_URL) throw new Error("Missing CONVEX_URL environment variable");
  if (!MCP_SECRET) throw new Error("Missing MCP_SECRET environment variable");

  const url = `${CONVEX_URL.replace(/\/$/, "")}/api/mcpGateway`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-mcp-secret": MCP_SECRET,
    },
    body: JSON.stringify({ fn, args }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gateway call ${fn} failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  return (json as any).data ?? json;
}

// ── Backward-compat shims ──────────────────────────────────────────────────
// Existing tool files call convexQuery("domain/module:funcName", args).
// These shims extract the function name and forward to callGateway.

function extractFuncName(path: string): string {
  const colonIdx = path.lastIndexOf(":");
  return colonIdx >= 0 ? path.slice(colonIdx + 1) : path;
}

export async function convexQuery(
  path: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  return callGateway(extractFuncName(path), args);
}

export async function convexMutation(
  path: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  return callGateway(extractFuncName(path), args);
}

export async function convexAction(
  path: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  return callGateway(extractFuncName(path), args);
}
