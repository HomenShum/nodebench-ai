/**
 * subAgents.ts — Named specialist agents (DeerFlow pattern).
 *
 * Instead of flat tool dispatch, the harness can dispatch to specialist
 * agents that each own a domain of tools and context.
 *
 * Agents:
 * - ResearchAgent: web_search, linkup, recon, sweep
 * - AnalysisAgent: extract_variables, build_claim_graph, countermodels
 * - SynthesisAgent: render_decision_memo, export_artifact
 * - ProfilerAgent: log_tool_call, suggest_optimizations
 */

export interface SubAgent {
  name: string;
  role: string;
  tools: string[];
  systemPrompt: string;
}

export const RESEARCH_AGENT: SubAgent = {
  name: "ResearchAgent",
  role: "Gather intelligence from web, databases, and local context",
  tools: ["web_search", "linkup_search", "run_recon", "enrich_entity", "founder_local_gather", "run_signal_sweep"],
  systemPrompt: "You are a research agent. Gather comprehensive intelligence about the target entity. Search multiple sources in parallel. Return structured findings with sources, confidence scores, and key data points.",
};

export const ANALYSIS_AGENT: SubAgent = {
  name: "AnalysisAgent",
  role: "Analyze gathered data — extract variables, build claim graphs, generate counter-models",
  tools: ["extract_variables", "build_claim_graph", "generate_countermodels", "rank_interventions", "score_compounding"],
  systemPrompt: "You are an analysis agent. Take raw research data and extract structured intelligence: key variables with direction/impact, claims with evidence chains, alternative explanations, and ranked interventions.",
};

export const SYNTHESIS_AGENT: SubAgent = {
  name: "SynthesisAgent",
  role: "Combine analysis into decision-ready packets, memos, and briefs",
  tools: ["render_decision_memo", "export_artifact_packet", "founder_local_synthesize", "founder_direction_assessment"],
  systemPrompt: "You are a synthesis agent. Take analyzed intelligence and produce decision-ready artifacts: executive summaries, VC scorecards, risk registers, competitive landscapes, and actionable next steps.",
};

export const PROFILER_AGENT: SubAgent = {
  name: "ProfilerAgent",
  role: "Monitor execution, log costs, suggest optimizations",
  tools: ["log_tool_call", "get_session_profile", "suggest_optimizations", "get_usage_insights"],
  systemPrompt: "You are a profiler agent. Monitor every tool call for cost, latency, and redundancy. Suggest cheaper valid paths and reusable workflow templates.",
};

export const ALL_AGENTS = [RESEARCH_AGENT, ANALYSIS_AGENT, SYNTHESIS_AGENT, PROFILER_AGENT];

/**
 * Select the best agent for a given task based on tool requirements.
 */
export function selectAgent(toolName: string): SubAgent | null {
  return ALL_AGENTS.find(a => a.tools.includes(toolName)) ?? null;
}

/**
 * Plan a multi-agent workflow for a complex query.
 * Returns ordered agent assignments.
 */
export function planAgentWorkflow(toolChain: string[]): Array<{ agent: SubAgent; tools: string[] }> {
  const assignments = new Map<string, string[]>();

  for (const tool of toolChain) {
    const agent = selectAgent(tool);
    const agentName = agent?.name ?? "HarnessDefault";
    if (!assignments.has(agentName)) assignments.set(agentName, []);
    assignments.get(agentName)!.push(tool);
  }

  return Array.from(assignments.entries()).map(([name, tools]) => ({
    agent: ALL_AGENTS.find(a => a.name === name) ?? RESEARCH_AGENT,
    tools,
  }));
}
