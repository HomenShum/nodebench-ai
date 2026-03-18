import type { McpTool } from "../types.js";

type GatewaySuccess<T> = {
  success: true;
  data: T;
};

type GatewayFailure = {
  success: false;
  error: string;
};

type GatewayResult<T> = GatewaySuccess<T> | GatewayFailure;

function normalizeGatewayBaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.replace(/\/$/, "");
  if (trimmed.includes(".convex.cloud")) {
    return trimmed.replace(".convex.cloud", ".convex.site");
  }
  return trimmed;
}

function getDimensionConfig(): { siteUrl: string; secret: string } | null {
  const siteUrl = normalizeGatewayBaseUrl(
    process.env.CONVEX_SITE_URL || process.env.VITE_CONVEX_URL || process.env.CONVEX_URL,
  );
  const secret = process.env.MCP_SECRET;
  if (!siteUrl || !secret) return null;
  return { siteUrl, secret };
}

async function callGateway<T>(fn: string, args: Record<string, unknown>): Promise<GatewayResult<T>> {
  const config = getDimensionConfig();
  if (!config) {
    return {
      success: false,
      error: "Missing CONVEX_SITE_URL, VITE_CONVEX_URL, or CONVEX_URL, or MCP_SECRET. Cannot call DeepTrace dimension backend.",
    };
  }

  const res = await fetch(`${config.siteUrl}/api/mcpGateway`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-mcp-secret": config.secret,
    },
    body: JSON.stringify({ fn, args }),
  });

  const payload = (await res.json()) as GatewayResult<T> & { message?: string };
  if (!res.ok) {
    const errorMessage = ("error" in payload ? payload.error : undefined)
      || payload.message
      || `DeepTrace dimension backend returned HTTP ${res.status}`;
    return {
      success: false,
      error: errorMessage,
    };
  }
  return payload;
}

function successOrError<T>(result: GatewayResult<T>, latencyMs: number) {
  if (!result.success) {
    return { error: true, message: result.error, latencyMs };
  }
  return { success: true, latencyMs, data: result.data };
}

export const dimensionTools: McpTool[] = [
  {
    name: "compute_dimension_profile",
    description:
      "Recompute and persist the DeepTrace dimension profile for an entity. Use after new company evidence, relationship updates, or temporal signals land.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: { type: "string", description: "Canonical entity key, e.g. company/acme-ai" },
        entityName: { type: "string", description: "Optional display name when entity context is sparse" },
        entityType: { type: "string", description: "Optional entity type such as company or person" },
        triggerEventKey: { type: "string", description: "Optional event key or reason for recomputation" },
      },
      required: ["entityKey"],
    },
    handler: async (args: {
      entityKey: string;
      entityName?: string;
      entityType?: string;
      triggerEventKey?: string;
    }) => {
      const started = Date.now();
      const result = await callGateway<any>("refreshDimensionProfile", args);
      return successOrError(result, Date.now() - started);
    },
  },
  {
    name: "get_dimension_profile",
    description:
      "Fetch the latest persisted DeepTrace dimension profile, including regime label, policy context, confidence, and the normalized dimension state.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: { type: "string", description: "Canonical entity key" },
      },
      required: ["entityKey"],
    },
    handler: async (args: { entityKey: string }) => {
      const started = Date.now();
      const result = await callGateway<any>("getDimensionProfile", args);
      return successOrError(result, Date.now() - started);
    },
  },
  {
    name: "list_dimension_snapshots",
    description:
      "List historical DeepTrace dimension snapshots for an entity to inspect regime transitions over time.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: { type: "string", description: "Canonical entity key" },
        limit: { type: "number", description: "Maximum number of snapshots to return (default 12)" },
      },
      required: ["entityKey"],
    },
    handler: async (args: { entityKey: string; limit?: number }) => {
      const started = Date.now();
      const result = await callGateway<any>("listDimensionSnapshots", args);
      return successOrError(result, Date.now() - started);
    },
  },
  {
    name: "list_dimension_evidence",
    description:
      "List the durable evidence rows behind a DeepTrace dimension profile. Useful for auditing why a score or availability status was assigned.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: { type: "string", description: "Canonical entity key" },
        dimensionFamily: { type: "string", description: "Optional family such as capital, people, or narrative" },
        dimensionName: { type: "string", description: "Optional metric name within the family" },
        limit: { type: "number", description: "Maximum rows to return (default 40)" },
      },
      required: ["entityKey"],
    },
    handler: async (args: {
      entityKey: string;
      dimensionFamily?: string;
      dimensionName?: string;
      limit?: number;
    }) => {
      const started = Date.now();
      const result = await callGateway<any>("listDimensionEvidence", args);
      return successOrError(result, Date.now() - started);
    },
  },
  {
    name: "list_dimension_interactions",
    description:
      "List stored interaction effects for an entity, such as capital plus investor quality reducing execution fragility or narrative outpacing evidence.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: { type: "string", description: "Canonical entity key" },
        limit: { type: "number", description: "Maximum rows to return (default 16)" },
      },
      required: ["entityKey"],
    },
    handler: async (args: { entityKey: string; limit?: number }) => {
      const started = Date.now();
      const result = await callGateway<any>("listDimensionInteractions", args);
      return successOrError(result, Date.now() - started);
    },
  },
  {
    name: "export_dimension_bundle",
    description:
      "Export the full DeepTrace dimension bundle for an entity: latest profile, snapshots, evidence, and interaction effects in one response.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: { type: "string", description: "Canonical entity key" },
        snapshotLimit: { type: "number", description: "Maximum snapshots to include" },
        evidenceLimit: { type: "number", description: "Maximum evidence rows to include" },
        interactionLimit: { type: "number", description: "Maximum interaction rows to include" },
      },
      required: ["entityKey"],
    },
    handler: async (args: {
      entityKey: string;
      snapshotLimit?: number;
      evidenceLimit?: number;
      interactionLimit?: number;
    }) => {
      const started = Date.now();
      const result = await callGateway<any>("getDimensionBundle", args);
      return successOrError(result, Date.now() - started);
    },
  },
  {
    name: "run_research_cell",
    description:
      "Run a bounded re-analysis cell for a DeepTrace entity investigation. Queries existing DeepTrace state through parallel branches (evidence gap analysis, counter-hypothesis, dimension coverage, source diversification) to surface gaps and weaknesses. Does NOT acquire new external evidence — use due-diligence orchestrator for that. Triggers when confidence is low, coverage is sparse, or operator requests deeper analysis. Returns merged findings in standard DeepTrace format with receipts and dimension profile.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: { type: "string", description: "Canonical entity key, e.g. company/acme-ai" },
        entityName: { type: "string", description: "Optional display name" },
        confidence: { type: "number", description: "Current investigation confidence [0,1]. Cell auto-triggers below 0.65" },
        dimensionCoverage: { type: "number", description: "Current dimension coverage ratio [0,1]. Cell auto-triggers below 0.70" },
        durableSourceCount: { type: "number", description: "Number of durable evidence sources. Cell auto-triggers below 3" },
        operatorRequested: { type: "boolean", description: "Force-trigger the research cell regardless of thresholds" },
        existingFacts: { type: "array", items: { type: "string" }, description: "Known facts to avoid redundant research" },
        maxBranches: { type: "number", description: "Max parallel research branches (default 3, max 3)" },
        maxRefinementRounds: { type: "number", description: "Max refinement rounds (default 2, max 2)" },
      },
      required: ["entityKey", "confidence", "dimensionCoverage", "durableSourceCount"],
    },
    handler: async (args: {
      entityKey: string;
      entityName?: string;
      confidence: number;
      dimensionCoverage: number;
      durableSourceCount: number;
      operatorRequested?: boolean;
      existingFacts?: string[];
      maxBranches?: number;
      maxRefinementRounds?: number;
    }) => {
      const started = Date.now();
      const result = await callGateway<any>("runResearchCell", args);
      return successOrError(result, Date.now() - started);
    },
  },
  {
    name: "run_entity_intelligence_mission",
    description:
      "Run a full DeepTrace entity intelligence mission with optional bounded research cell. Unifies relationship mapping, ownership, supply chain, signals, and causal analysis. Pass researchCell=true for threshold-driven re-analysis when the investigation has gaps, or forceResearchCell=true to explicitly force the bounded cell.",
    inputSchema: {
      type: "object",
      properties: {
        entityKey: { type: "string", description: "Canonical entity key" },
        entityName: { type: "string", description: "Optional display name" },
        researchCell: { type: "boolean", description: "Enable threshold-driven autoresearch cell for low-confidence investigations" },
        forceResearchCell: { type: "boolean", description: "Force the bounded research cell even if thresholds are healthy" },
      },
      required: ["entityKey"],
    },
    handler: async (args: {
      entityKey: string;
      entityName?: string;
      researchCell?: boolean;
      forceResearchCell?: boolean;
    }) => {
      const started = Date.now();
      const result = await callGateway<any>("runEntityIntelligenceMission", args);
      return successOrError(result, Date.now() - started);
    },
  },
];

