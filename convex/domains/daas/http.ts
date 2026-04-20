// DaaS HTTP endpoint — POST /api/daas/ingest
//
// Accepts a CanonicalTrace-shaped payload and calls ingestTrace.
// Lets any agent (Python pipeline, external webhook, curl) push traces
// without pulling in the Convex client SDK.
//
// Agentic reliability (per .claude/rules/agentic_reliability.md):
//   [BOUND_READ] Request body capped at MAX_BODY_BYTES (256 KB)
//   [HONEST_STATUS] Returns 400 on malformed, 413 on oversize, 500 on
//                   internal error. Never 2xx on failure paths.
//   [HONEST_SCORES] All numeric fields passed through unmodified (no
//                   silent coercion / floors)
//   [ERROR_BOUNDARY] try/catch with !res.headersSent guard equivalent
//                    (httpAction returns new Response on each branch)
//
// NOT YET IMPLEMENTED (follow-up):
//   Rate limiting (per-IP, per-session). Convex Rate Limiter component
//   should be wired once the endpoint sees real external traffic.

import { httpAction } from "../../_generated/server";
import { api, internal } from "../../_generated/api";

const MAX_BODY_BYTES = 256 * 1024; // 256 KB

// Rate limit config — DB-backed (daasRateBuckets table + mutation) so
// limits persist across serverless containers.
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_UNAUTHED = 10; // per minute per IP
const RATE_LIMIT_AUTHED = 120; // per minute per API key

function deriveClientKey(req: Request): { key: string; authed: boolean } {
  // Prefer explicit API key header — authed callers get higher quota.
  const apiKey = req.headers.get("x-daas-api-key");
  if (apiKey && apiKey.length >= 16) {
    return { key: `key:${apiKey.slice(0, 48)}`, authed: true };
  }
  // Fall back to forwarded-for IP, with explicit fallback marker so we
  // never collapse every request into a single shared bucket.
  const xff =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "";
  const ip = xff.split(",")[0].trim();
  return { key: ip ? `ip:${ip}` : "ip:unknown", authed: false };
}

function assertApiKeyIfRequired(req: Request): Response | null {
  // REQUIRE_API_KEY env flag: when set to any non-empty value, the
  // endpoint rejects unauthed calls entirely. Default: allow-unauthed
  // but rate-limited hard (10/min/IP) so we can iterate without
  // locking out the smoke tests.
  const required = (process.env.DAAS_REQUIRE_API_KEY ?? "").toLowerCase();
  if (required !== "true" && required !== "1") return null;
  const allowedKeys = (process.env.DAAS_INGEST_API_KEYS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length >= 16);
  const provided = (req.headers.get("x-daas-api-key") ?? "").trim();
  if (!provided) {
    return new Response(
      JSON.stringify({ error: "unauthorized", hint: "provide x-daas-api-key" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  if (allowedKeys.length === 0) {
    // Fail closed — if DAAS_REQUIRE_API_KEY=true but no keys configured,
    // refuse to let anyone in. HONEST_STATUS: never silently accept.
    return new Response(
      JSON.stringify({ error: "server_misconfigured", detail: "no allowed keys configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
  if (!allowedKeys.includes(provided)) {
    return new Response(
      JSON.stringify({ error: "unauthorized", hint: "api key not recognized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  return null;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export const ingestHttp = httpAction(async (ctx, req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed", hint: "POST only" });
  }

  // Auth gate — only enforced when DAAS_REQUIRE_API_KEY=true in env.
  // Rate limit is enforced unconditionally.
  const authReject = assertApiKeyIfRequired(req);
  if (authReject) return authReject;

  // Rate limit — per-IP for unauthed, per-key for authed callers.
  // DB-backed via checkAndIncrementRateBucket mutation so the limit
  // holds across serverless containers (in-memory state doesn't).
  const client = deriveClientKey(req);
  const limit = client.authed ? RATE_LIMIT_AUTHED : RATE_LIMIT_UNAUTHED;
  const rate = await ctx.runMutation(
    internal.domains.daas.mutations.checkAndIncrementRateBucket,
    { bucketKey: client.key, limit, windowMs: RATE_WINDOW_MS },
  );
  const rateHeaders = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(rate.remaining),
    "X-RateLimit-Reset": String(Math.floor(rate.resetAt / 1000)),
  };
  if (!rate.allowed) {
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        limit,
        window_ms: RATE_WINDOW_MS,
        retry_at: new Date(rate.resetAt).toISOString(),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          ...rateHeaders,
        },
      },
    );
  }

  // BOUND_READ: reject payloads larger than MAX_BODY_BYTES by
  // reading the body directly and checking length (Convex doesn't
  // expose a Content-Length guard natively — must check after read).
  let rawText: string;
  try {
    rawText = await req.text();
  } catch (err) {
    return jsonResponse(400, { error: "body_read_failed", detail: String(err) });
  }
  if (rawText.length > MAX_BODY_BYTES) {
    return jsonResponse(413, {
      error: "payload_too_large",
      limit_bytes: MAX_BODY_BYTES,
      received: rawText.length,
    });
  }

  let body: any;
  try {
    body = JSON.parse(rawText);
  } catch (err) {
    return jsonResponse(400, { error: "invalid_json", detail: String(err) });
  }

  // Required fields — reject early so we don't silently create a
  // broken row that dashboards would then try to render.
  const required = [
    "sessionId",
    "sourceModel",
    "query",
    "finalAnswer",
    "totalCostUsd",
    "totalTokens",
    "durationMs",
  ];
  for (const k of required) {
    if (body[k] === undefined || body[k] === null) {
      return jsonResponse(400, { error: "missing_required_field", field: k });
    }
  }

  // Shape the args for ingestTrace (omit None-valued optionals).
  const args: Record<string, unknown> = {
    sessionId: String(body.sessionId),
    sourceModel: String(body.sourceModel),
    query: String(body.query),
    finalAnswer: String(body.finalAnswer),
    totalCostUsd: Number(body.totalCostUsd),
    totalTokens: Number(body.totalTokens),
    durationMs: Number(body.durationMs),
  };
  if (body.advisorModel) args.advisorModel = String(body.advisorModel);
  if (body.sourceSystem) args.sourceSystem = String(body.sourceSystem);
  if (body.repoContextJson) args.repoContextJson = String(body.repoContextJson);
  if (body.stepsJson) args.stepsJson = String(body.stepsJson);

  // Numeric sanity — matches the mutation's own guards.
  if (!Number.isFinite(args.totalCostUsd as number) || (args.totalCostUsd as number) < 0) {
    return jsonResponse(400, { error: "invalid_totalCostUsd" });
  }
  if (!Number.isFinite(args.totalTokens as number) || (args.totalTokens as number) < 0) {
    return jsonResponse(400, { error: "invalid_totalTokens" });
  }
  if (!Number.isFinite(args.durationMs as number) || (args.durationMs as number) < 0) {
    return jsonResponse(400, { error: "invalid_durationMs" });
  }

  try {
    const traceId = await ctx.runMutation(
      api.domains.daas.mutations.ingestTrace,
      args as any,
    );
    return new Response(
      JSON.stringify({ ok: true, traceId, sessionId: args.sessionId }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          ...rateHeaders,
        },
      },
    );
  } catch (err) {
    return jsonResponse(500, { error: "ingest_failed", detail: String(err) });
  }
});
