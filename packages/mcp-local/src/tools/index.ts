/**
 * tools/ — NodeBench MCP Tool Registry (260 tools across 11 domains)
 *
 * Domain grouping for discoverability. All tools remain in flat files
 * for import simplicity — this index provides the logical organization.
 *
 * ┌─────────────┬──────────────────────────────────────────────────────────┐
 * │ Domain      │ Files                                                    │
 * ├─────────────┼──────────────────────────────────────────────────────────┤
 * │ discovery   │ progressiveDiscoveryTools, toolRegistry, metaTools       │
 * │ agent       │ agentBootstrap, parallelAgent, sessionMemory             │
 * │ code        │ architect, boilerplate, gitWorkflow, prReport            │
 * │ research    │ researchOptimizer, researchWriting, rss, web             │
 * │ eval        │ evalTools, selfEval, critter, cCompilerBenchmark         │
 * │ content     │ toon, pattern, seo, skillUpdate, thompsonProtocol, docs  │
 * │ media       │ vision, visualQa, uiCapture, flickerDetection, figmaFlow│
 * │ data        │ localFile, email, scrapling, forecasting                 │
 * │ ops         │ qualityGate, verification, localDashboard, observability │
 * │             │ flywheel, learning, recon, security, designGovernance    │
 * │ bridge      │ mcpBridge, voiceBridge, webmcp, llm, openclaw, platform │
 * │ sandbox     │ contextSandbox, contextTools                            │
 * └─────────────┴──────────────────────────────────────────────────────────┘
 *
 * Infrastructure:
 *   embeddingProvider — Semantic search index (HuggingFace → Google → OpenAI)
 *   toolRegistry      — 175-entry catalog with nextTools/relatedTools graph
 *   overstoryTools    — Agent trajectory & narrative tools
 */

// ─── Discovery ──────────────────────────────────────────────────────────────
export { createProgressiveDiscoveryTools } from "./progressiveDiscoveryTools.js";
export {
  TOOL_REGISTRY,
  hybridSearch,
  getToolComplexity,
  getToolAnnotations,
  computeRelatedTools,
  getCooccurrenceEdges,
} from "./toolRegistry.js";
export { createMetaTools, createMetaTools as metaTools } from "./metaTools.js";

// ─── Agent ──────────────────────────────────────────────────────────────────
export { agentBootstrapTools } from "./agentBootstrapTools.js";
export { parallelAgentTools } from "./parallelAgentTools.js";
export { sessionMemoryTools } from "./sessionMemoryTools.js";

// ─── Code ───────────────────────────────────────────────────────────────────
export { architectTools } from "./architectTools.js";
export { boilerplateTools } from "./boilerplateTools.js";
export { gitWorkflowTools } from "./gitWorkflowTools.js";
export { prReportTools } from "./prReportTools.js";

// ─── Research ───────────────────────────────────────────────────────────────
export { researchOptimizerTools } from "./researchOptimizerTools.js";
export { researchWritingTools } from "./researchWritingTools.js";
export { rssTools } from "./rssTools.js";
export { webTools } from "./webTools.js";

// ─── Eval ───────────────────────────────────────────────────────────────────
export { evalTools } from "./evalTools.js";
export { selfEvalTools } from "./selfEvalTools.js";
export { critterTools } from "./critterTools.js";
export { cCompilerBenchmarkTools } from "./cCompilerBenchmarkTools.js";

// ─── Content ────────────────────────────────────────────────────────────────
export { toonTools } from "./toonTools.js";
export { patternTools } from "./patternTools.js";
export { seoTools } from "./seoTools.js";
export { skillUpdateTools } from "./skillUpdateTools.js";
export {
  createThompsonProtocolTools,
  createThompsonProtocolTools as thompsonProtocolTools,
} from "./thompsonProtocolTools.js";
export { documentationTools } from "./documentationTools.js";

// ─── Media ──────────────────────────────────────────────────────────────────
export { visionTools } from "./visionTools.js";
export { visualQaTools } from "./visualQaTools.js";
export { uiCaptureTools } from "./uiCaptureTools.js";
export { flickerDetectionTools } from "./flickerDetectionTools.js";
export { figmaFlowTools } from "./figmaFlowTools.js";

// ─── Data ───────────────────────────────────────────────────────────────────
export { localFileTools, gaiaMediaSolvers } from "./localFileTools.js";
export { emailTools } from "./emailTools.js";
export { scraplingTools } from "./scraplingTools.js";
export { forecastingTools } from "./forecastingTools.js";
export { temporalIntelligenceTools } from "./temporalIntelligenceTools.js";
export { executionTraceTools } from "./executionTraceTools.js";
export { dimensionTools } from "./dimensionTools.js";

// ─── Ops ────────────────────────────────────────────────────────────────────
export { qualityGateTools } from "./qualityGateTools.js";
export { verificationTools } from "./verificationTools.js";
export { localDashboardTools } from "./localDashboardTools.js";
export { observabilityTools } from "./observabilityTools.js";
export { flywheelTools } from "./flywheelTools.js";
export { learningTools } from "./learningTools.js";
export { reconTools } from "./reconTools.js";
export { securityTools } from "./securityTools.js";
export { designGovernanceTools } from "./designGovernanceTools.js";
export { autonomousDeliveryTools } from "./autonomousDeliveryTools.js";
export { syncBridgeTools } from "./syncBridgeTools.js";

// ─── Bridge ─────────────────────────────────────────────────────────────────
export { mcpBridgeTools } from "./mcpBridgeTools.js";
export { voiceBridgeTools } from "./voiceBridgeTools.js";
export { webmcpTools } from "./webmcpTools.js";
export { llmTools } from "./llmTools.js";
export { openclawTools } from "./openclawTools.js";
export { platformTools } from "./platformTools.js";

// ─── Sandbox ────────────────────────────────────────────────────────────────
export { contextSandboxTools } from "./contextSandboxTools.js";
export { contextTools } from "./contextTools.js";

// ─── Harness ──────────────────────────────────────────────────────────────────
export { missionHarnessTools } from "./missionHarnessTools.js";

// ─── Plan Synthesis ─────────────────────────────────────────────────────
export { planSynthesisTools } from "./planSynthesisTools.js";

// ─── Specialized ────────────────────────────────────────────────────────────
export { uiUxDiveTools } from "./uiUxDiveTools.js";
export { uiUxDiveAdvancedTools } from "./uiUxDiveAdvancedTools.js";
export { overstoryTools } from "./overstoryTools.js";
export { githubTools } from "./githubTools.js";

// ─── Infrastructure ─────────────────────────────────────────────────────────
export {
  initEmbeddingIndex,
  embedQuery,
  embedQuery as getQueryEmbedding,
} from "./embeddingProvider.js";
