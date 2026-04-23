/**
 * Universal Research API
 *
 * POST /v1/research/runs - Start a research run
 * GET  /v1/research/runs/:id - Get run status/result
 * GET  /v1/angles/catalog - List available research angles
 *
 * Thin adapter over the Convex research.run action.
 * Follows the spec: universal primitive, not job-specific.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { runConvexAction } from "../lib/convex-client.js";

const router = Router();

// ── Schemas ────────────────────────────────────────────────────────────────

const goalSpecSchema = z.object({
  objective: z.string().min(1).max(500),
  mode: z.enum(["auto", "analyze", "prepare", "monitor", "compare", "decision_support", "summarize"]),
  decision_type: z.enum([
    "auto", "job", "event", "vendor", "customer", "market",
    "founder", "topic", "regulatory", "technical", "investment"
  ]).optional(),
});

const subjectRefSchema = z.object({
  type: z.enum(["email", "person", "company", "event", "topic", "repo", "document", "url", "text"]),
  id: z.string().optional(),
  name: z.string().optional(),
  url: z.string().url().optional(),
  raw: z.record(z.any()).optional(),
  hints: z.array(z.string()).optional().default([]),
});

const constraintsSchema = z.object({
  freshness_days: z.number().int().min(0).max(365).optional().default(30),
  latency_budget_ms: z.number().int().min(1000).max(120000).optional().default(12000),
  prefer_cache: z.boolean().optional().default(true),
  max_external_calls: z.number().int().min(0).max(100).optional().default(12),
  evidence_min_sources_per_major_claim: z.number().int().min(1).max(10).optional().default(2),
}).optional();

const researchRunRequestSchema = z.object({
  preset: z.string().optional(),
  goal: goalSpecSchema,
  subjects: z.array(subjectRefSchema).min(1).max(10),
  angle_strategy: z.enum(["auto", "explicit", "preset_bias", "preset_only"]).optional().default("auto"),
  angles: z.array(z.string()).optional(),
  depth: z.enum(["quick", "standard", "comprehensive", "exhaustive"]).default("standard"),
  constraints: constraintsSchema,
  deliverables: z.array(
    z.enum([
      "json_full",
      "compact_alert",
      "ntfy_brief",
      "notion_markdown",
      "executive_brief",
      "dossier_markdown",
      "email_digest",
      "ui_card_bundle",
    ])
  ).min(1).max(5),
  context: z.record(z.any()).optional(),
});

// In-memory run store (production: use Convex/Redis)
const runStore = new Map<string, { status: string; result?: any; createdAt: number }>();

// ── POST /v1/research/runs ─────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 45_000; // Higher for comprehensive/exhaustive

router.post("/runs", async (req: Request, res: Response) => {
  const routeStartTime = Date.now();

  try {
    const parsed = researchRunRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "validation_error",
        details: parsed.error.issues,
        requestId: req.requestId,
      });
      return;
    }

    // Determine sync vs async based on depth
    const isAsync = parsed.data.depth === "exhaustive";
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Store initial state
    runStore.set(runId, {
      status: "running",
      createdAt: Date.now(),
    });

    if (isAsync) {
      // Return 202 Accepted for async processing
      res.status(202).json({
        run_id: runId,
        status: "queued",
        message: "Research run queued. Poll GET /v1/research/runs/{run_id} for results.",
        estimated_seconds: 60,
        requestId: req.requestId,
      });

      // Fire-and-forget the actual processing
      processResearchRun(runId, parsed.data, req.requestId).catch((err) => {
        console.error(`[ResearchRun] Async error for ${runId}:`, err);
        runStore.set(runId, {
          status: "failed",
          result: { error: String(err) },
          createdAt: Date.now(),
        });
      });
      return;
    }

    // Synchronous: call Convex action directly
    const result = await runConvexAction(
      "domains/research/researchRunAction:runResearch",
      parsed.data
    );

    runStore.set(runId, {
      status: "completed",
      result,
      createdAt: Date.now(),
    });

    res.json({
      run_id: runId,
      status: "completed",
      ...result,
      requestId: req.requestId,
      api_latency_ms: Date.now() - routeStartTime,
    });
  } catch (error) {
    console.error("[ResearchRun] Error:", error);

    if (!res.headersSent) {
      res.status(502).json({
        error: "research_unavailable",
        message:
          error instanceof Error ? error.message : "Research service unavailable",
        requestId: req.requestId,
        elapsedMs: Date.now() - routeStartTime,
      });
    }
  }
});

// ── GET /v1/research/runs/:id ──────────────────────────────────────────────

router.get("/runs/:id", async (req: Request, res: Response) => {
  const runId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const run = runStore.get(runId);

  if (!run) {
    res.status(404).json({
      error: "not_found",
      message: `Run ${runId} not found`,
      requestId: req.requestId,
    });
    return;
  }

  res.json({
    run_id: runId,
    status: run.status,
    ...(run.status === "completed" ? run.result : {}),
    created_at: run.createdAt,
    requestId: req.requestId,
  });
});

// ── GET /v1/angles/catalog ─────────────────────────────────────────────────

router.get("/angles/catalog", async (_req: Request, res: Response) => {
  // Return static catalog (could be loaded from Convex in production)
  const catalog = {
    angles: [
      {
        angle_id: "entity_profile",
        display_name: "Entity Profile",
        supports: ["company", "person", "product", "repo"],
        good_for: ["prep", "diligence", "comparison"],
        freshness_sensitivity: "medium",
        cost_tier: "low",
        precompute_policy: "always",
      },
      {
        angle_id: "public_signals",
        display_name: "Public Signals",
        supports: ["company", "person", "event", "topic"],
        good_for: ["prep", "monitoring", "alert"],
        freshness_sensitivity: "high",
        cost_tier: "medium",
        precompute_policy: "watchlist_or_hot",
      },
      {
        angle_id: "funding_intelligence",
        display_name: "Funding Intelligence",
        supports: ["company"],
        good_for: ["diligence", "decision", "prep"],
        freshness_sensitivity: "high",
        cost_tier: "low",
        precompute_policy: "watchlist_or_hot",
      },
      {
        angle_id: "financial_health",
        display_name: "Financial Health",
        supports: ["company"],
        good_for: ["diligence", "decision"],
        freshness_sensitivity: "critical",
        cost_tier: "medium",
        precompute_policy: "on_demand",
      },
      {
        angle_id: "narrative_tracking",
        display_name: "Narrative Tracking",
        supports: ["company", "person", "topic"],
        good_for: ["monitoring", "diligence", "prep"],
        freshness_sensitivity: "medium",
        cost_tier: "medium",
        precompute_policy: "watchlist_or_hot",
      },
      {
        angle_id: "people_graph",
        display_name: "People Graph",
        supports: ["company", "person"],
        good_for: ["prep", "diligence"],
        freshness_sensitivity: "high",
        cost_tier: "medium",
        precompute_policy: "watchlist_or_hot",
      },
      {
        angle_id: "competitive_intelligence",
        display_name: "Competitive Intelligence",
        supports: ["company", "product"],
        good_for: ["diligence", "comparison", "prep"],
        freshness_sensitivity: "medium",
        cost_tier: "medium",
        precompute_policy: "on_demand",
      },
      {
        angle_id: "github_ecosystem",
        display_name: "GitHub Ecosystem",
        supports: ["company", "person", "repo", "product"],
        good_for: ["diligence", "comparison", "prep"],
        freshness_sensitivity: "high",
        cost_tier: "low",
        precompute_policy: "watchlist_or_hot",
      },
      {
        angle_id: "executive_brief",
        display_name: "Executive Brief",
        supports: ["company", "person", "event", "topic"],
        good_for: ["prep", "decision"],
        freshness_sensitivity: "high",
        cost_tier: "medium",
        precompute_policy: "watchlist_or_hot",
      },
      {
        angle_id: "daily_brief",
        display_name: "Daily Brief",
        supports: ["company", "person", "event", "topic"],
        good_for: ["monitoring", "alert"],
        freshness_sensitivity: "critical",
        cost_tier: "low",
        precompute_policy: "always",
      },
      {
        angle_id: "deep_research",
        display_name: "Deep Research",
        supports: ["company", "person", "topic", "product"],
        good_for: ["diligence", "decision"],
        freshness_sensitivity: "medium",
        cost_tier: "high",
        precompute_policy: "on_demand",
      },
      {
        angle_id: "regulatory_monitoring",
        display_name: "Regulatory Monitoring",
        supports: ["company", "topic", "product"],
        good_for: ["diligence", "monitoring", "decision"],
        freshness_sensitivity: "high",
        cost_tier: "high",
        precompute_policy: "watchlist_or_hot",
      },
      {
        angle_id: "patent_intelligence",
        display_name: "Patent Intelligence",
        supports: ["company", "person", "product"],
        good_for: ["diligence", "comparison"],
        freshness_sensitivity: "medium",
        cost_tier: "high",
        precompute_policy: "on_demand",
      },
      {
        angle_id: "academic_research",
        display_name: "Academic Research",
        supports: ["person", "topic", "product"],
        good_for: ["diligence", "prep", "comparison"],
        freshness_sensitivity: "low",
        cost_tier: "medium",
        precompute_policy: "on_demand",
      },
      {
        angle_id: "market_dynamics",
        display_name: "Market Dynamics",
        supports: ["company", "topic", "product"],
        good_for: ["diligence", "decision", "prep"],
        freshness_sensitivity: "medium",
        cost_tier: "medium",
        precompute_policy: "on_demand",
      },
      {
        angle_id: "document_discovery",
        display_name: "Document Discovery",
        supports: ["company", "person", "topic", "product"],
        good_for: ["diligence", "prep", "decision"],
        freshness_sensitivity: "low",
        cost_tier: "high",
        precompute_policy: "on_demand",
      },
      {
        angle_id: "world_monitor",
        display_name: "World Monitor",
        supports: ["company", "person", "event", "topic"],
        good_for: ["monitoring", "prep", "decision"],
        freshness_sensitivity: "high",
        cost_tier: "medium",
        precompute_policy: "watchlist_or_hot",
      },
    ],
    presets: [
      { id: "job_inbound_v1", name: "Job Inbound", description: "Prepare for job interviews and recruiter conversations" },
      { id: "founder_diligence_v1", name: "Founder Diligence", description: "Deep diligence on a startup and founding team" },
      { id: "event_prep_v1", name: "Event Prep", description: "Prepare for demo days, conferences, and networking events" },
      { id: "sales_account_prep_v1", name: "Sales Account Prep", description: "Research for enterprise sales conversations" },
      { id: "vendor_eval_v1", name: "Vendor Evaluation", description: "Evaluate a vendor, tool, or service provider" },
      { id: "market_map_v1", name: "Market Map", description: "Map a market space with competitors and dynamics" },
      { id: "daily_monitor_v1", name: "Daily Monitor", description: "Daily intelligence across watchlist" },
      { id: "topic_deep_dive_v1", name: "Topic Deep Dive", description: "Deep research on a topic, trend, or technology" },
    ],
  };

  res.json(catalog);
});

// ── Helper: Async processing ─────────────────────────────────────────────────

async function processResearchRun(
  runId: string,
  data: z.infer<typeof researchRunRequestSchema>,
  requestId?: string
): Promise<void> {
  try {
    const result = await runConvexAction(
      "domains/research/researchRunAction:runResearch",
      data
    );

    runStore.set(runId, {
      status: "completed",
      result,
      createdAt: Date.now(),
    });
  } catch (err) {
    runStore.set(runId, {
      status: "failed",
      result: {
        error: err instanceof Error ? err.message : String(err),
        requestId,
      },
      createdAt: Date.now(),
    });
  }
}

export default router;
