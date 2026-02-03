/**
 * MCP Gateway Dispatcher — single Convex HTTP endpoint for all gateway tools.
 *
 * Validates x-mcp-secret server-side (matching core_agent_server pattern).
 * The gateway server no longer needs the admin key — only MCP_SECRET.
 *
 * Accepts: POST /api/mcpGateway { fn: string, args: Record<string, unknown> }
 * Returns: { success: true, data: <result> } or { success: false, error: <msg> }
 */

import { httpAction } from "../../_generated/server";
import { api, internal } from "../../_generated/api";
import {
  requireMcpSecret,
  readJson,
  ok,
  badRequest,
  serverError,
} from "./mcpHttpAuth";
import type { Id } from "../../_generated/dataModel";

// ── Types ───────────────────────────────────────────────────────────────────

type FnType = "query" | "mutation" | "action";

type AllowlistEntry = {
  ref: any;
  type: FnType;
  injectUserId?: boolean;
};

// ── Service user ID (Convex environment variable) ──────────────────────────

function getMcpServiceUserId(): Id<"users"> {
  const uid = process.env.MCP_SERVICE_USER_ID;
  if (!uid) {
    throw new Error(
      "MCP_SERVICE_USER_ID not set. Run: npx convex env set MCP_SERVICE_USER_ID <user_id>"
    );
  }
  return uid as Id<"users">;
}

// ── Allowlist ──────────────────────────────────────────────────────────────
// Keys = function name extracted from the Convex path (the part after ':').
// The gateway client shim extracts this from paths like "domain/module:funcName".

const ALLOWLIST: Record<string, AllowlistEntry> = {
  // ── GROUP A: Public queries — no auth needed ─────────────────────────────

  // Research (8)
  getPublicForYouFeed: {
    ref: api.domains.research.forYouFeed.getPublicForYouFeed,
    type: "query",
  },
  getLatestDashboardSnapshot: {
    ref: api.domains.research.dashboardQueries.getLatestDashboardSnapshot,
    type: "query",
  },
  getTrendingRepos: {
    ref: api.domains.research.githubExplorer.getTrendingRepos,
    type: "query",
  },
  getFastestGrowingRepos: {
    ref: api.domains.research.githubExplorer.getFastestGrowingRepos,
    type: "query",
  },
  getLatestPublicDossier: {
    ref: api.domains.research.publicDossierQueries.getLatestPublicDossier,
    type: "query",
  },
  getDealFlow: {
    ref: api.domains.research.dealFlowQueries.getDealFlow,
    type: "query",
  },
  getSignalTimeseries: {
    ref: api.domains.research.signalTimeseries.getSignalTimeseries,
    type: "query",
  },

  // Narrative — public (6)
  getPublicThreads: {
    ref: api.domains.narrative.queries.threads.getPublicThreads,
    type: "query",
  },
  getThread: {
    ref: api.domains.narrative.queries.threads.getThread,
    type: "query",
  },
  searchThreads: {
    ref: api.domains.narrative.queries.threads.searchThreads,
    type: "query",
  },
  getThreadsByEntity: {
    ref: api.domains.narrative.queries.threads.getThreadsByEntity,
    type: "query",
  },
  getThreadsWithEvents: {
    ref: api.domains.narrative.queries.threads.getThreadsWithEvents,
    type: "query",
  },
  getThreadStats: {
    ref: api.domains.narrative.queries.threads.getThreadStats,
    type: "query",
  },

  // Verification — public (3)
  getCalibrationStats: {
    ref: api.domains.verification.calibration.getCalibrationStats,
    type: "query",
  },
  getFactById: {
    ref: api.domains.verification.facts.getFactById,
    type: "query",
  },
  getSloMetricsSummary: {
    ref: api.domains.verification.calibration.getSloMetricsSummary,
    type: "query",
  },

  // Knowledge — public (8)
  searchEntityContexts: {
    ref: api.domains.knowledge.entityContexts.searchEntityContexts,
    type: "query",
  },
  getEntityContext: {
    ref: api.domains.knowledge.entityContexts.getEntityContext,
    type: "query",
  },
  getEntityContextByName: {
    ref: api.domains.knowledge.entityContexts.getEntityContextByName,
    type: "query",
  },
  listEntityContexts: {
    ref: api.domains.knowledge.entityContexts.listEntityContexts,
    type: "query",
  },
  getEntityContextStats: {
    ref: api.domains.knowledge.entityContexts.getEntityContextStats,
    type: "query",
  },
  getGraphBySource: {
    ref: api.domains.knowledge.knowledgeGraph.getGraphBySource,
    type: "query",
  },
  getGraphClaims: {
    ref: api.domains.knowledge.knowledgeGraph.getGraphClaims,
    type: "query",
  },
  getRegistryForDomain: {
    ref: api.domains.knowledge.sourceRegistry.getRegistryForDomain,
    type: "query",
  },

  // ── GROUP B: Internal MCP variants — need userId injection ───────────────

  // Research (1 action)
  getEntityInsights: {
    ref: internal.domains.mcp.mcpResearchEndpoints.mcpGetEntityInsights,
    type: "action",
    injectUserId: true,
  },

  // Narrative (3 queries)
  getThreadPosts: {
    ref: internal.domains.mcp.mcpNarrativeEndpoints.mcpGetThreadPosts,
    type: "query",
    injectUserId: true,
  },
  getOpenDisputes: {
    ref: internal.domains.mcp.mcpNarrativeEndpoints.mcpGetOpenDisputes,
    type: "query",
    injectUserId: true,
  },
  getContradictoryPosts: {
    ref: internal.domains.mcp.mcpNarrativeEndpoints.mcpGetContradictoryPosts,
    type: "query",
    injectUserId: true,
  },

  // Verification (4 queries)
  getVerificationSummary: {
    ref: internal.domains.mcp.mcpVerificationEndpoints.mcpGetVerificationSummary,
    type: "query",
    injectUserId: true,
  },
  getVerificationsForFact: {
    ref: internal.domains.mcp.mcpVerificationEndpoints.mcpGetVerificationsForFact,
    type: "query",
    injectUserId: true,
  },
  getArtifactsWithHealth: {
    ref: internal.domains.mcp.mcpVerificationEndpoints.mcpGetArtifactsWithHealth,
    type: "query",
    injectUserId: true,
  },
  getFactsByRun: {
    ref: internal.domains.mcp.mcpVerificationEndpoints.mcpGetFactsByRun,
    type: "query",
    injectUserId: true,
  },

  // ── GROUP C: Document internal endpoints — already accept userId ─────────

  mcpCreateDocument: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpCreateDocument,
    type: "mutation",
    injectUserId: true,
  },
  mcpGetDocument: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpGetDocument,
    type: "query",
  },
  mcpUpdateDocument: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpUpdateDocument,
    type: "mutation",
    injectUserId: true,
  },
  mcpArchiveDocument: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpArchiveDocument,
    type: "mutation",
    injectUserId: true,
  },
  mcpRestoreDocument: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpRestoreDocument,
    type: "mutation",
    injectUserId: true,
  },
  mcpToggleFavorite: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpToggleFavorite,
    type: "mutation",
    injectUserId: true,
  },
  mcpDuplicateDocument: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpDuplicateDocument,
    type: "mutation",
    injectUserId: true,
  },
  mcpSearchDocuments: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpSearchDocuments,
    type: "query",
    injectUserId: true,
  },
  mcpListDocuments: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpListDocuments,
    type: "query",
    injectUserId: true,
  },
  mcpExportToMarkdown: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpExportToMarkdown,
    type: "query",
    injectUserId: true,
  },
  mcpCreateFolder: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpCreateFolder,
    type: "mutation",
    injectUserId: true,
  },
  mcpListFolders: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpListFolders,
    type: "query",
    injectUserId: true,
  },
  mcpGetFolderWithDocuments: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpGetFolderWithDocuments,
    type: "query",
    injectUserId: true,
  },
  mcpAddDocumentToFolder: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpAddDocumentToFolder,
    type: "mutation",
    injectUserId: true,
  },
  mcpRemoveDocumentFromFolder: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpRemoveDocumentFromFolder,
    type: "mutation",
    injectUserId: true,
  },
  mcpCreateSpreadsheet: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpCreateSpreadsheet,
    type: "mutation",
    injectUserId: true,
  },
  mcpListSpreadsheets: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpListSpreadsheets,
    type: "query",
    injectUserId: true,
  },
  mcpGetSpreadsheetRange: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpGetSpreadsheetRange,
    type: "query",
  },
  mcpApplySpreadsheetOperations: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpApplySpreadsheetOperations,
    type: "mutation",
    injectUserId: true,
  },
  mcpListFiles: {
    ref: internal.domains.documents.mcpDocumentEndpoints.mcpListFiles,
    type: "query",
    injectUserId: true,
  },

  // ── GROUP D: Agent Planning ─────────────────────────────────────────────────

  createPlan: {
    ref: internal.domains.mcp.mcpPlans.createPlan,
    type: "mutation",
  },
  getPlan: {
    ref: internal.domains.mcp.mcpPlans.getPlan,
    type: "query",
  },
  updatePlan: {
    ref: internal.domains.mcp.mcpPlans.updatePlan,
    type: "mutation",
  },
  listPlans: {
    ref: internal.domains.mcp.mcpPlans.listPlans,
    type: "query",
  },
  deletePlan: {
    ref: internal.domains.mcp.mcpPlans.deletePlan,
    type: "mutation",
  },

  // ── GROUP E: Agent Memory ───────────────────────────────────────────────────

  writeMemory: {
    ref: internal.domains.mcp.mcpMemory.writeMemory,
    type: "mutation",
  },
  readMemory: {
    ref: internal.domains.mcp.mcpMemory.readMemory,
    type: "query",
  },
  listMemory: {
    ref: internal.domains.mcp.mcpMemory.listMemory,
    type: "query",
  },
  deleteMemory: {
    ref: internal.domains.mcp.mcpMemory.deleteMemory,
    type: "mutation",
  },
  getMemoryById: {
    ref: internal.domains.mcp.mcpMemory.getMemoryById,
    type: "query",
  },
  deleteMemoryById: {
    ref: internal.domains.mcp.mcpMemory.deleteMemoryById,
    type: "mutation",
  },

  // ── GROUP F: Search / Research ──────────────────────────────────────────────

  quickSearch: {
    ref: api.domains.search.fusion.actions.quickSearch,
    type: "action",
  },
  fusionSearch: {
    ref: api.domains.search.fusion.actions.fusionSearch,
    type: "action",
  },
  getMigrationStats: {
    ref: api.domains.agents.mcp_tools.models.migration.getMigrationStats,
    type: "query",
  },
};

// ── Dispatcher httpAction ──────────────────────────────────────────────────

export const mcpGatewayHandler = httpAction(async (ctx, request) => {
  // 1. Auth — validate x-mcp-secret
  const authErr = requireMcpSecret(request);
  if (authErr) return authErr;

  // 2. Parse request body
  const body = await readJson(request);
  if (!body || typeof body.fn !== "string") {
    return badRequest(
      'Request body must be JSON: { "fn": "<toolName>", "args": { ... } }'
    );
  }

  const fn: string = body.fn;
  const args: Record<string, unknown> = body.args ?? {};

  // 3. Lookup in allowlist
  const entry = ALLOWLIST[fn];
  if (!entry) {
    const available = Object.keys(ALLOWLIST).sort().join(", ");
    return badRequest(
      `Unknown function: "${fn}". ${Object.keys(ALLOWLIST).length} available: ${available}`
    );
  }

  // 4. Inject userId if needed
  const finalArgs = entry.injectUserId
    ? { ...args, userId: getMcpServiceUserId() }
    : { ...args };

  // 5. Dispatch
  try {
    let result: unknown;
    switch (entry.type) {
      case "query":
        result = await ctx.runQuery(entry.ref, finalArgs);
        break;
      case "mutation":
        result = await ctx.runMutation(entry.ref, finalArgs);
        break;
      case "action":
        result = await ctx.runAction(entry.ref, finalArgs);
        break;
    }
    return ok({ success: true, data: result });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[mcpGateway] Error dispatching ${fn}:`, message);
    return serverError(message);
  }
});

// ── CORS preflight handler ─────────────────────────────────────────────────

export const mcpGatewayCorsHandler = httpAction(async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-mcp-secret",
    },
  });
});
