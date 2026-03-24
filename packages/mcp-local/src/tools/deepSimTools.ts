import type { McpTool } from "../types.js";

// ---------------------------------------------------------------------------
// Gateway helpers — same pattern as dimensionTools.ts
// TIMEOUT / BOUND_READ / ERROR_BOUNDARY on every external call
// ---------------------------------------------------------------------------

type GatewaySuccess<T> = { success: true; data: T };
type GatewayFailure = { success: false; error: string };
type GatewayResult<T> = GatewaySuccess<T> | GatewayFailure;

function normalizeGatewayBaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.replace(/\/$/, "");
  if (trimmed.includes(".convex.cloud")) {
    return trimmed.replace(".convex.cloud", ".convex.site");
  }
  return trimmed;
}

function getDeepSimConfig(): { siteUrl: string; secret: string } | null {
  const siteUrl = normalizeGatewayBaseUrl(
    process.env.CONVEX_SITE_URL || process.env.VITE_CONVEX_URL || process.env.CONVEX_URL,
  );
  const secret = process.env.MCP_SECRET;
  if (!siteUrl || !secret) return null;
  return { siteUrl, secret };
}

/** TIMEOUT: Gateway call timeout in ms */
const GATEWAY_TIMEOUT_MS = 30_000;
/** BOUND_READ: Max response body size (2 MB) */
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

async function callGateway<T>(fn: string, args: Record<string, unknown>): Promise<GatewayResult<T>> {
  const config = getDeepSimConfig();
  if (!config) {
    return {
      success: false,
      error: "Missing CONVEX_SITE_URL, VITE_CONVEX_URL, or CONVEX_URL, or MCP_SECRET. Cannot call Deep Sim backend.",
    };
  }

  // ERROR_BOUNDARY: Wrap entire fetch+parse in try/catch
  try {
    // TIMEOUT: AbortController with budget gate
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);

    const res = await fetch(`${config.siteUrl}/api/mcpGateway`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mcp-secret": config.secret,
      },
      body: JSON.stringify({ fn, args }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // BOUND_READ: Cap response body size before parsing
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
      return {
        success: false,
        error: `Response too large (${contentLength} bytes, max ${MAX_RESPONSE_BYTES}). Reduce scope or use pagination.`,
      };
    }

    const text = await res.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      return {
        success: false,
        error: `Response body too large (${text.length} chars, max ${MAX_RESPONSE_BYTES}). Reduce scope or use pagination.`,
      };
    }

    let payload: GatewayResult<T> & { message?: string };
    try {
      payload = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: `Deep Sim backend returned non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`,
      };
    }

    if (!res.ok) {
      const errorMessage =
        ("error" in payload ? payload.error : undefined) ||
        payload.message ||
        `Deep Sim backend returned HTTP ${res.status}`;
      return { success: false, error: errorMessage };
    }
    return payload;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("abort")) {
      return { success: false, error: `Deep Sim gateway timed out after ${GATEWAY_TIMEOUT_MS}ms for ${fn}` };
    }
    return { success: false, error: `Deep Sim gateway call failed for ${fn}: ${message}` };
  }
}

function successOrError<T>(result: GatewayResult<T>, latencyMs: number) {
  if (!result.success) {
    return { error: true, message: result.error, latencyMs };
  }
  return { success: true, latencyMs, data: result.data };
}

// ---------------------------------------------------------------------------
// 7 Deep Sim MCP Tools
// ---------------------------------------------------------------------------

export const deepSimTools: McpTool[] = [
  // -----------------------------------------------------------------------
  // 1. build_claim_graph
  // -----------------------------------------------------------------------
  {
    name: "build_claim_graph",
    description:
      "Extract claims from a source packet and link each claim to its evidence. Returns a directed graph of claims with supporting/contradicting evidence, confidence per claim, and whatWouldChangeMyMind for each.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: {
          type: "string",
          description: "Canonical entity key, e.g. company/acme-ai",
        },
        sources: {
          type: "array",
          items: { type: "string" },
          maxItems: 50,
          description: "Source texts, URLs, or document keys to extract claims from",
        },
        maxClaims: {
          type: "number",
          default: 20,
          maximum: 50,
          description: "Maximum number of claims to extract (default 20, max 50)",
        },
      },
      required: ["entityKey", "sources"],
    },
    handler: async (args: {
      entityKey: string;
      sources: string[];
      maxClaims?: number;
    }) => {
      const started = Date.now();
      const result = await callGateway<any>("buildClaimGraph", {
        entityKey: args.entityKey,
        sources: args.sources,
        maxClaims: Math.min(args.maxClaims ?? 20, 50),
      });
      return successOrError(result, Date.now() - started);
    },
  },

  // -----------------------------------------------------------------------
  // 2. extract_variables
  // -----------------------------------------------------------------------
  {
    name: "extract_variables",
    description:
      "Identify and weight the key variables driving an entity's trajectory across 6 categories (intrinsic, temporal, network, intervention, market, constraint). Returns ranked variables with sensitivity estimates, data completeness, and whatWouldChangeMyMind.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: {
          type: "string",
          description: "Canonical entity key",
        },
        claimGraphId: {
          type: "string",
          description: "ID from build_claim_graph output (optional, for context enrichment)",
        },
        variableCategories: {
          type: "array",
          items: {
            type: "string",
            enum: ["intrinsic", "temporal", "network", "intervention", "market", "constraint"],
          },
          default: ["intrinsic", "temporal", "network", "intervention", "market", "constraint"],
          description: "Which variable categories to analyze",
        },
        maxVariables: {
          type: "number",
          default: 15,
          maximum: 30,
          description: "Maximum variables to return (default 15, max 30)",
        },
      },
      required: ["entityKey"],
    },
    handler: async (args: {
      entityKey: string;
      claimGraphId?: string;
      variableCategories?: string[];
      maxVariables?: number;
    }) => {
      const started = Date.now();
      const result = await callGateway<any>("extractVariables", {
        entityKey: args.entityKey,
        claimGraphId: args.claimGraphId,
        variableCategories: args.variableCategories ?? [
          "intrinsic", "temporal", "network", "intervention", "market", "constraint",
        ],
        maxVariables: Math.min(args.maxVariables ?? 15, 30),
      });
      return successOrError(result, Date.now() - started);
    },
  },

  // -----------------------------------------------------------------------
  // 3. generate_countermodels
  // -----------------------------------------------------------------------
  {
    name: "generate_countermodels",
    description:
      "For every main thesis or scenario, generate serious alternative explanations with their own evidence and confidence. Forces intellectual honesty by surfacing counter-arguments and what would validate each.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: {
          type: "string",
          description: "Canonical entity key",
        },
        thesis: {
          type: "string",
          description: "The main claim or scenario to challenge",
        },
        claimGraphId: {
          type: "string",
          description: "Optional claim graph ID for context enrichment",
        },
        maxCounterModels: {
          type: "number",
          default: 3,
          maximum: 5,
          description: "Maximum counter-models to generate (default 3, max 5)",
        },
      },
      required: ["entityKey", "thesis"],
    },
    handler: async (args: {
      entityKey: string;
      thesis: string;
      claimGraphId?: string;
      maxCounterModels?: number;
    }) => {
      const started = Date.now();
      const result = await callGateway<any>("generateCounterModels", {
        entityKey: args.entityKey,
        thesis: args.thesis,
        claimGraphId: args.claimGraphId,
        maxCounterModels: Math.min(args.maxCounterModels ?? 3, 5),
      });
      return successOrError(result, Date.now() - started);
    },
  },

  // -----------------------------------------------------------------------
  // 4. run_deep_sim
  // -----------------------------------------------------------------------
  {
    name: "run_deep_sim",
    description:
      "Run a multi-agent scenario simulation with bounded branching and budget controls. Instantiates agents with personas and incentives, varies conditions across branches, and generates an analytical report with convergence metrics.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: {
          type: "string",
          description: "Canonical entity key",
        },
        workflow: {
          type: "string",
          enum: [
            "investor_diligence",
            "founder_strategy",
            "ceo_decision",
            "gtm_analysis",
            "creator_trajectory",
            "trend_forecast",
          ],
          description: "Which analysis workflow to run",
        },
        variableOverrides: {
          type: "object",
          description: "Override specific variable values for what-if analysis",
        },
        maxBranches: {
          type: "number",
          default: 3,
          maximum: 5,
          description: "Maximum scenario branches (default 3, max 5)",
        },
        maxRounds: {
          type: "number",
          default: 4,
          maximum: 6,
          description: "Maximum deliberation rounds per branch (default 4, max 6)",
        },
        budgetSeconds: {
          type: "number",
          default: 90,
          maximum: 180,
          description: "Total wall-clock budget in seconds (default 90, max 180)",
        },
      },
      required: ["entityKey", "workflow"],
    },
    handler: async (args: {
      entityKey: string;
      workflow: string;
      variableOverrides?: Record<string, unknown>;
      maxBranches?: number;
      maxRounds?: number;
      budgetSeconds?: number;
    }) => {
      const started = Date.now();
      const result = await callGateway<any>("runDeepSim", {
        entityKey: args.entityKey,
        workflow: args.workflow,
        variableOverrides: args.variableOverrides ?? {},
        maxBranches: Math.min(args.maxBranches ?? 3, 5),
        maxRounds: Math.min(args.maxRounds ?? 4, 6),
        budgetSeconds: Math.min(args.budgetSeconds ?? 90, 180),
      });
      return successOrError(result, Date.now() - started);
    },
  },

  // -----------------------------------------------------------------------
  // 5. rank_interventions
  // -----------------------------------------------------------------------
  {
    name: "rank_interventions",
    description:
      "Rank potential interventions by expected trajectory delta. Each intervention includes expected impact, confidence, cost, timeframe, and what evidence would confirm or deny its effect.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: {
          type: "string",
          description: "Canonical entity key",
        },
        scenarioId: {
          type: "string",
          description: "Scenario ID from run_deep_sim output to optimize for",
        },
        maxInterventions: {
          type: "number",
          default: 5,
          maximum: 10,
          description: "Maximum interventions to rank (default 5, max 10)",
        },
      },
      required: ["entityKey", "scenarioId"],
    },
    handler: async (args: {
      entityKey: string;
      scenarioId: string;
      maxInterventions?: number;
    }) => {
      const started = Date.now();
      const result = await callGateway<any>("rankInterventions", {
        entityKey: args.entityKey,
        scenarioId: args.scenarioId,
        maxInterventions: Math.min(args.maxInterventions ?? 5, 10),
      });
      return successOrError(result, Date.now() - started);
    },
  },

  // -----------------------------------------------------------------------
  // 6. score_compounding
  // -----------------------------------------------------------------------
  {
    name: "score_compounding",
    description:
      "Compute the full 8-dimension trajectory score for an entity. Returns trust-adjusted compounding, drift, adaptation velocity, and all sub-scores with explanations. Output includes TrajectoryScoreBreakdown and TrajectorySummaryData.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: {
          type: "string",
          description: "Canonical entity key",
        },
        entityType: {
          type: "string",
          enum: ["product", "startup", "founder", "workflow", "agent", "mission", "team"],
          description: "Entity type for scoring context",
        },
        windowDays: {
          type: "number",
          default: 90,
          minimum: 7,
          maximum: 365,
          description: "Lookback window in days for trajectory computation (default 90)",
        },
      },
      required: ["entityKey", "entityType"],
    },
    handler: async (args: {
      entityKey: string;
      entityType: string;
      windowDays?: number;
    }) => {
      const started = Date.now();
      const windowDays = Math.max(7, Math.min(args.windowDays ?? 90, 365));
      const result = await callGateway<any>("scoreCompounding", {
        entityKey: args.entityKey,
        entityType: args.entityType,
        windowDays,
      });
      return successOrError(result, Date.now() - started);
    },
  },

  // -----------------------------------------------------------------------
  // 7. render_decision_memo
  // -----------------------------------------------------------------------
  {
    name: "render_decision_memo",
    description:
      "Render a 1-page executive decision memo from a completed Deep Sim analysis. Combines claim graph, variables, scenarios, interventions, and compounding score into a structured memo with counter-models, forecast check date, and whatWouldChangeMyMind. Optionally attach source URLs for provenance tracking on claims.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: {
          type: "string",
          description: "Canonical entity key",
        },
        workflow: {
          type: "string",
          description: "Workflow name used in the Deep Sim run",
        },
        format: {
          type: "string",
          enum: ["markdown", "json", "html"],
          default: "markdown",
          description: "Output format for the rendered memo (default markdown)",
        },
        audienceRole: {
          type: "string",
          enum: ["ceo", "investor", "founder", "builder"],
          default: "founder",
          description: "Target audience role for tone and emphasis (default founder)",
        },
        sources: {
          type: "array",
          items: {
            type: "object",
            properties: {
              claimId: { type: "string", description: "ID or label of the claim this source supports" },
              url: { type: "string", description: "Source URL" },
              title: { type: "string", description: "Source title or description" },
              retrievedAt: { type: "string", description: "ISO timestamp when retrieved" },
              confidence: { type: "number", description: "0.0-1.0 confidence in source reliability" },
            },
          },
          description:
            "Source attributions for claims in the memo. Each claim should trace to at least one source.",
        },
      },
      required: ["entityKey", "workflow"],
    },
    handler: async (args: {
      entityKey: string;
      workflow: string;
      format?: string;
      audienceRole?: string;
      sources?: Array<{
        claimId: string;
        url: string;
        title?: string;
        retrievedAt?: string;
        confidence?: number;
      }>;
    }) => {
      const started = Date.now();
      const result = await callGateway<{
        memo?: string;
        claims?: Array<{ id?: string; label?: string; text?: string }>;
        [key: string]: unknown;
      }>("renderDecisionMemo", {
        entityKey: args.entityKey,
        workflow: args.workflow,
        format: args.format ?? "markdown",
        audienceRole: args.audienceRole ?? "founder",
      });

      const latencyMs = Date.now() - started;

      if (!result.success) {
        return { error: true, message: result.error, latencyMs };
      }

      const data = result.data;

      // --- Source provenance enrichment ---
      if (!args.sources || args.sources.length === 0) {
        return {
          success: true,
          latencyMs,
          data,
          provenance: {
            provenanceScore: 0,
            note: "No sources provided. Add sources for verifiable claims.",
          },
        };
      }

      // Build lookup: claimId → source entries (one claim can have multiple sources)
      const sourcesByClaimId = new Map<string, typeof args.sources>();
      for (const src of args.sources) {
        if (!src.claimId) continue;
        const existing = sourcesByClaimId.get(src.claimId) ?? [];
        existing.push(src);
        sourcesByClaimId.set(src.claimId, existing);
      }

      // Determine all claim IDs present in the memo
      const claims: Array<{ id: string; label?: string }> = [];
      if (Array.isArray(data.claims)) {
        for (const c of data.claims) {
          const id = c.id ?? c.label ?? "";
          if (id) claims.push({ id, label: c.label ?? c.text });
        }
      }
      // Also treat every unique claimId in the sources as a known claim
      // (the caller may reference claims by label even if the gateway doesn't return them)
      for (const cid of sourcesByClaimId.keys()) {
        if (!claims.some((c) => c.id === cid)) {
          claims.push({ id: cid });
        }
      }

      const attributedClaimIds = new Set<string>();
      const numberedRefs: Array<{
        index: number;
        claimId: string;
        url: string;
        title: string;
        retrievedAt?: string;
        confidence?: number;
      }> = [];

      let refIndex = 1;
      for (const [claimId, srcs] of sourcesByClaimId.entries()) {
        for (const s of srcs) {
          numberedRefs.push({
            index: refIndex++,
            claimId,
            url: s.url,
            title: s.title ?? s.url,
            retrievedAt: s.retrievedAt,
            confidence: s.confidence,
          });
          attributedClaimIds.add(claimId);
        }
      }

      const unattributedClaims = claims
        .filter((c) => !attributedClaimIds.has(c.id))
        .map((c) => c.id);

      const totalClaims = claims.length || 1; // avoid division by zero
      const provenanceScore = Math.round((attributedClaimIds.size / totalClaims) * 100) / 100;

      // Inject inline citation markers and Sources section into markdown memo
      let memo: string | undefined;
      if (typeof data.memo === "string") {
        memo = data.memo;

        // Add inline citation markers [N] next to referenced claims
        for (const ref of numberedRefs) {
          // Attempt to find the claim text or ID in the memo and append the marker
          const marker = `[${ref.index}]`;
          const escaped = ref.claimId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const pattern = new RegExp(`(${escaped})(?!\\s*\\[\\d+\\])`, "i");
          if (pattern.test(memo)) {
            memo = memo.replace(pattern, `$1 ${marker}`);
          }
        }

        // Append Sources section
        const sourcesSection = [
          "",
          "## Sources",
          "",
          ...numberedRefs.map((r) => {
            const conf = r.confidence != null ? ` (confidence: ${r.confidence})` : "";
            const date = r.retrievedAt ? ` — retrieved ${r.retrievedAt}` : "";
            return `[${r.index}] ${r.title} — ${r.url}${conf}${date}`;
          }),
        ].join("\n");

        memo += sourcesSection;
      }

      return {
        success: true,
        latencyMs,
        data: {
          ...data,
          ...(memo != null ? { memo } : {}),
        },
        provenance: {
          provenanceScore,
          totalClaims: claims.length,
          attributedClaims: attributedClaimIds.size,
          unattributedClaims,
          references: numberedRefs,
        },
      };
    },
  },
];
