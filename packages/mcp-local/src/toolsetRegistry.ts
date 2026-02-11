/**
 * Toolset Registry — Side-effect-free TOOLSET_MAP
 *
 * Centralizes all tool imports and the TOOLSET_MAP definition.
 * Both index.ts (server) and scripts/toolDeepDive.ts (analysis) import from here
 * without triggering CLI parsing, DB init, or MCP server startup.
 */

import { verificationTools } from "./tools/verificationTools.js";
import { evalTools } from "./tools/evalTools.js";
import { qualityGateTools } from "./tools/qualityGateTools.js";
import { learningTools } from "./tools/learningTools.js";
import { flywheelTools } from "./tools/flywheelTools.js";
import { reconTools } from "./tools/reconTools.js";
import { uiCaptureTools } from "./tools/uiCaptureTools.js";
import { visionTools } from "./tools/visionTools.js";
import { webTools } from "./tools/webTools.js";
import { githubTools } from "./tools/githubTools.js";
import { documentationTools } from "./tools/documentationTools.js";
import { agentBootstrapTools } from "./tools/agentBootstrapTools.js";
import { selfEvalTools } from "./tools/selfEvalTools.js";
import { parallelAgentTools } from "./tools/parallelAgentTools.js";
import { llmTools } from "./tools/llmTools.js";
import { securityTools } from "./tools/securityTools.js";
import { platformTools } from "./tools/platformTools.js";
import { researchWritingTools } from "./tools/researchWritingTools.js";
import { flickerDetectionTools } from "./tools/flickerDetectionTools.js";
import { figmaFlowTools } from "./tools/figmaFlowTools.js";
import { localFileTools, gaiaMediaSolvers } from "./tools/localFileTools.js";
import { boilerplateTools } from "./tools/boilerplateTools.js";
import { cCompilerBenchmarkTools } from "./tools/cCompilerBenchmarkTools.js";
import { sessionMemoryTools } from "./tools/sessionMemoryTools.js";
import { patternTools } from "./tools/patternTools.js";
import { gitWorkflowTools } from "./tools/gitWorkflowTools.js";
import { seoTools } from "./tools/seoTools.js";
import { voiceBridgeTools } from "./tools/voiceBridgeTools.js";
import { critterTools } from "./tools/critterTools.js";
import { emailTools } from "./tools/emailTools.js";
import { rssTools } from "./tools/rssTools.js";
import { architectTools } from "./tools/architectTools.js";
import { toonTools } from "./tools/toonTools.js";
import { uiUxDiveTools } from "./tools/uiUxDiveTools.js";
import { mcpBridgeTools } from "./tools/mcpBridgeTools.js";
import { uiUxDiveAdvancedTools } from "./tools/uiUxDiveAdvancedTools.js";
import type { McpTool } from "./types.js";

export const TOOLSET_MAP: Record<string, McpTool[]> = {
  verification: verificationTools,
  eval: evalTools,
  quality_gate: qualityGateTools,
  learning: learningTools,
  flywheel: flywheelTools,
  recon: reconTools,
  ui_capture: uiCaptureTools,
  vision: visionTools,
  local_file: localFileTools,
  web: webTools,
  github: githubTools,
  docs: documentationTools,
  bootstrap: agentBootstrapTools,
  self_eval: selfEvalTools,
  parallel: parallelAgentTools,
  llm: llmTools,
  security: securityTools,
  platform: platformTools,
  research_writing: researchWritingTools,
  flicker_detection: flickerDetectionTools,
  figma_flow: figmaFlowTools,
  boilerplate: boilerplateTools,
  benchmark: cCompilerBenchmarkTools,
  session_memory: sessionMemoryTools,
  gaia_solvers: gaiaMediaSolvers,
  toon: toonTools,
  pattern: patternTools,
  git_workflow: gitWorkflowTools,
  seo: seoTools,
  voice_bridge: voiceBridgeTools,
  critter: critterTools,
  email: emailTools,
  rss: rssTools,
  architect: architectTools,
  ui_ux_dive: uiUxDiveTools,
  mcp_bridge: mcpBridgeTools,
  ui_ux_dive_v2: uiUxDiveAdvancedTools,
};

// Pre-computed tool name → toolset name lookup
export const TOOL_TO_TOOLSET = new Map<string, string>();
for (const [tsName, tools] of Object.entries(TOOLSET_MAP)) {
  for (const tool of tools) {
    TOOL_TO_TOOLSET.set(tool.name, tsName);
  }
}
