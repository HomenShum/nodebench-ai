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
import { api } from "../../_generated/api";

const MAX_BODY_BYTES = 256 * 1024; // 256 KB

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
    return jsonResponse(201, {
      ok: true,
      traceId,
      sessionId: args.sessionId,
    });
  } catch (err) {
    return jsonResponse(500, { error: "ingest_failed", detail: String(err) });
  }
});
