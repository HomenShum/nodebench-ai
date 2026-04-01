/**
 * NodeBench Profiler — Founder Operating Intelligence Layer
 *
 * Three subsystems:
 * 1. behaviorStore — SQLite tables for session/query/tool call logging
 * 2. eventCollector — Unified event schema across all integration paths
 * 3. mcpProxy — Transparent MCP tool proxy for zero-code-change observation
 */

export {
  initBehaviorTables,
  logSession,
  logQuery,
  logToolCall,
  logContextReuse,
  getSessionInsights,
  getAggregateInsights,
  findSimilarPriorQuery,
} from "./behaviorStore.js";

export {
  type UnifiedEvent,
  initEventCollectorTables,
  ingestEvent,
  estimateEventCost,
  logHookEvent,
  logMcpProxyEvent,
  logOtelSpan,
  logFrameworkEvent,
  getRecentEvents,
  getDuplicateRate,
  getCostByModel,
  getCostBySurface,
  getTopToolChains,
} from "./eventCollector.js";

export {
  wrapToolsWithProxy,
  createProfiledDispatcher,
} from "./mcpProxy.js";

export {
  type WorkflowTemplate,
  initWorkflowTemplateTables,
  saveTemplate,
  listTemplates,
  getTemplate,
  recordTemplateUse,
  deleteTemplate,
  validateTemplate,
} from "./workflowTemplates.js";

export {
  type ProofRun,
  initProofEngineTables,
  evaluateOptimization,
  getProofRuns,
} from "./proofEngine.js";

export {
  processOtelPayload,
} from "./otelReceiver.js";

export {
  type ModelRoutingSuggestion,
  initModelRoutingTables,
  suggestModelRoute,
  recordRoutingDecision,
  getRoutingSuggestions,
} from "./modelRouter.js";
