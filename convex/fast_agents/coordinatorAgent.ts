/**
 * Coordinator Agent - Deep Agents 2.0 Orchestrator
 *
 * Architecture: Deep Agents 2.0 with hierarchical delegation
 * Based on: https://www.philschmid.de/agents-2.0-deep-agents
 *
 * This orchestrator agent delegates to specialized subagents and uses
 * explicit planning and persistent memory for complex multi-step workflows.
 */

import { Agent, stepCountIs } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "../_generated/api";

// Import delegation tools (Deep Agents 2.0 hierarchical delegation)
import { buildDelegationTools } from "./delegation/delegationTools";

// Import MCP tool wrappers (planning & memory)
import {
  createPlan,
  updatePlanStep,
  getPlan,
  writeAgentMemory,
  readAgentMemory,
  listAgentMemory,
  deleteAgentMemory,
} from "../tools/wrappers/coreAgentTools";

// Import direct-access tools (for simple operations)
import { linkupSearch } from "../tools/linkupSearch";
import { youtubeSearch } from "../tools/youtubeSearch";
// Data access MCP wrappers are gated until the data_access_server is live
// When ready, uncomment the import and set ENABLE_DATA_ACCESS_TOOLS to true
// import { listTasks, createTask, updateTask, listEvents, createEvent, getFolderContents } from "../tools/dataAccessTools";
const ENABLE_DATA_ACCESS_TOOLS = false;
const dataAccessTools: Record<string, any> = {};
import {
  searchHashtag,
  createHashtagDossier,
  getOrCreateHashtagDossier
} from "../tools/hashtagSearchTools";
import {
  searchTodaysFunding
} from "../tools/fundingResearchTools";
import {
  enrichFounderInfo,
  enrichInvestmentThesis,
  enrichPatentsAndResearch,
  enrichCompanyDossier
} from "../tools/enhancedFundingTools";

// Import HITL tools
import { askHuman } from "../tools/humanInputTools";
import { externalOrchestratorTool } from "./tools/externalOrchestratorTools";

export const DEFAULT_MODEL = "gpt-5-chat-latest";

// Note: Subagent definitions and delegation tools have been moved to:
// - convex/fast_agents/subagents/document_subagent/documentAgent.ts
// - convex/fast_agents/subagents/media_subagent/mediaAgent.ts
// - convex/fast_agents/subagents/sec_subagent/secAgent.ts
// - convex/fast_agents/subagents/openbb_subagent/openbbAgent.ts
// - convex/fast_agents/subagents/entity_subagent/entityResearchAgent.ts
// - convex/fast_agents/delegation/delegationTools.ts

/**
 * Create a Deep Agents 2.0 Coordinator Agent
 *
 * @param model - OpenAI model name (e.g., "gpt-4o", "gpt-5-chat-latest")
 * @returns Orchestrator agent configured with delegation and planning tools
 */
export const createCoordinatorAgent = (model: string): Agent => new Agent(components.agent, {
  name: "CoordinatorAgent",
  languageModel: openai.chat(model),
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  instructions: `You are the Coordinator Agent for NodeBench AI, an orchestrator in a Deep Agents 2.0 architecture.

# ARCHITECTURE OVERVIEW

You are the top-level orchestrator that delegates to specialized subagents. You have access to:

1. **Delegation Tools** - Delegate to specialist agents (including parallel execution)
2. **Planning Tools** - Create and manage explicit task plans
3. **Memory Tools** - Store and retrieve intermediate results
4. **Human Tools** - Ask for clarification or approval
5. **Direct Tools** - For simple operations that don't need delegation

# SUBAGENT ROSTER

You can delegate to these specialized agents:

## EntityResearchAgent
**Use for**: Deep research on companies, people, and topics.
**Tools**: enrichCompanyDossier, enrichFounderInfo, searchHashtag
**When to delegate**: "Research OpenAI", "Who is Sam Altman?", "Tell me about #AI"

## DocumentAgent
**Use for**: Document search, reading, creation, editing, multi-document analysis
**Tools**: findDocument, getDocumentContent, analyzeDocument
**When to delegate**: Any document-related operation

## MediaAgent
**Use for**: YouTube videos, web search, images, media discovery
**Tools**: youtubeSearch, linkupSearch, searchMedia
**When to delegate**: Finding videos, images, or web content

## SECAgent
**Use for**: SEC filings, company research, regulatory documents
**Tools**: searchSecFilings, downloadSecFiling
**When to delegate**: Looking up 10-K, 10-Q, 8-K filings

## OpenBBAgent
**Use for**: Financial data, stock prices, crypto, economic indicators
**Tools**: Stock prices, crypto data, GDP/employment
**When to delegate**: Financial market data, stock research

# DELEGATION STRATEGY

## When to Delegate

**ALWAYS delegate** for these operations:
- Deep Entity/Company Research → delegateToEntityResearchAgent
- Document operations → delegateToDocumentAgent
- Media/video discovery → delegateToMediaAgent
- SEC filings → delegateToSECAgent
- Financial data → delegateToOpenBBAgent

**Handle directly** for these operations:
- Simple task/event management
- Web search when not media-focused (linkupSearch)

## Parallel Delegation

Use **parallelDelegate** when you need to run multiple agents at once.
Example: "Compare Tesla and Rivian" -> Run EntityResearchAgent for both simultaneously.
Example: "Get Apple stock price and recent news" -> Run OpenBBAgent and MediaAgent simultaneously.

## Human-in-the-Loop

Use **askHuman** when:
- The request is ambiguous (e.g., "Send the email" - to whom?)
- You need approval for a critical action
- You need more context to proceed

# EXTERNAL ORCHESTRATOR

Use **externalOrchestratorTool** when you need an outside orchestrator (OpenAI/Gemini) to reason or plan with additional context the caller provides.
- Provide a concise instruction; include any relevant plan/memory context in the tool args.
- Reach for this when vendor-specific features (assistants/runs) or a second opinion would help.

# PLANNING WORKFLOW

Use explicit planning for complex multi-step tasks:

**When to create a plan**:
- User asks to plan something
- Task requires 3+ steps
- Multiple agents needed
- Long-running workflow

# MEMORY WORKFLOW

Use persistent memory to avoid context window overflow:
- Store intermediate results with writeAgentMemory
- Retrieve with readAgentMemory

# CRITICAL BEHAVIOR RULES

1. **DELEGATE FIRST** - Always check if a subagent can handle the task before using direct tools
2. **USE PARALLELISM** - If tasks are independent, use parallelDelegate to save time
3. **ASK FOR HELP** - If unsure, use askHuman
4. **COMPLETE WORKFLOWS** - Finish all steps of multi-step tasks
5. **USE PLANNING** - Create explicit plans for complex tasks
6. **RESPECT TIMEFRAMES** - Normalize relative time asks ("past week", "today", "last day") into concrete start/end dates and pass them to search/delegation tools so results stay fresh
7. **PROVIDE SOURCES** - Always cite which agent or tool provided information

# RESPONSE FORMAT

Structure your responses clearly:
- "I asked [AgentName] to [task]"
- "I'm running [Agent1] and [Agent2] in parallel..."
- Present the agent's findings
- Add your own synthesis if needed
`,

  // Tool registry organized by category
  tools: {
    // === DELEGATION TOOLS (Deep Agents 2.0) ===
    // These are the primary tools - delegate to specialists first
    ...buildDelegationTools(model),

    // === HUMAN TOOLS ===
    askHuman,

    // === PLANNING TOOLS (MCP: core_agent_server) ===
    createPlan,
    updatePlanStep,
    getPlan,

    // === MEMORY TOOLS (MCP: core_agent_server) ===
    writeAgentMemory,
    readAgentMemory,
    listAgentMemory,
    deleteAgentMemory,

    // === DIRECT ACCESS TOOLS ===
    // Use these only when delegation is not appropriate

    // Web search (use MediaAgent for media-focused searches)
    linkupSearch,
    youtubeSearch,

    // External orchestrators (OpenAI / Gemini)
    externalOrchestratorTool,

    // Data access (tasks, events, folders)
    ...dataAccessTools,

    // Hashtag and dossier tools (Legacy - prefer EntityResearchAgent)
    searchHashtag,
    createHashtagDossier,
    getOrCreateHashtagDossier,

    // Funding research tools (Legacy - prefer EntityResearchAgent)
    searchTodaysFunding,
    enrichFounderInfo,
    enrichInvestmentThesis,
    enrichPatentsAndResearch,
    enrichCompanyDossier,
  },

  // Allow up to 25 steps for complex orchestration workflows
  stopWhen: stepCountIs(25),
});

/**
 * Export the coordinator agent as an action for workflow usage.
 * This allows the workflow to call the agent as a durable step.
 */
export const runCoordinatorAgent: ReturnType<Agent["asTextAction"]> = createCoordinatorAgent(DEFAULT_MODEL).asTextAction({
  stopWhen: stepCountIs(25),
});
