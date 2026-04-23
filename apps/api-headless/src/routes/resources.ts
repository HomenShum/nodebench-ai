/**
 * Resources API (v1)
 *
 * POST /v1/resources/expand — expand a Nodebench resource URI by one ring
 *                             using the requested lens + depth.
 *
 * Thin adapter over the Convex `domains/research/expandResource:expand`
 * query. Returns ExpandResponse shaped per shared/research/resourceCards.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { runConvexQuery } from "../lib/convex-client.js";

const router = Router();

const expandRequestSchema = z.object({
  uri: z.string().min(1).max(500),
  expand_mode: z
    .enum(["ring_plus_one", "ring_two", "single_card"])
    .optional()
    .default("ring_plus_one"),
  lens_id: z.string().optional().default("company_dossier"),
  depth: z.enum(["quick", "standard"]).optional().default("standard"),
  constraints: z
    .object({
      prefer_cache: z.boolean().optional().default(true),
      latency_budget_ms: z.number().int().min(200).max(30_000).optional().default(2_000),
    })
    .optional(),
});

function parseNodebenchUri(
  uri: string,
): { kind: string; path: string } | null {
  const m = uri.match(/^nodebench:\/\/([^/]+)\/(.+)$/);
  if (!m) return null;
  return { kind: m[1], path: m[2] };
}

// ── POST /v1/resources/expand ──────────────────────────────────────────────
router.post("/expand", async (req: Request, res: Response) => {
  try {
    const parsed = expandRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "invalid_request",
        issues: parsed.error.issues,
      });
    }
    const args = parsed.data;
    const uri = parseNodebenchUri(args.uri);
    if (!uri) {
      return res.status(400).json({
        error: "invalid_uri",
        message:
          "URI must be of the form nodebench://{kind}/{id}. See docs/UNIVERSAL_RESEARCH_API.md.",
      });
    }
    // v1 accepts org/company URIs only (matches company_dossier lens scope).
    if (uri.kind !== "org" && uri.kind !== "company") {
      return res.status(400).json({
        error: "unsupported_uri_kind",
        message:
          "v1 resources/expand supports org/company URIs only. Other kinds ship in v2.",
        acceptedKinds: ["org", "company"],
      });
    }

    const result = await runConvexQuery(
      "domains/research/expandResource:expand",
      {
        entityKey: uri.path,
        lensId: args.lens_id,
        depth: args.depth,
      },
    );
    if (result?.status === "not_found") {
      return res.status(404).json({
        error: "entity_not_found",
        rootUri: args.uri,
      });
    }
    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return res.status(502).json({
      error: "convex_call_failed",
      message,
    });
  }
});

export default router;
