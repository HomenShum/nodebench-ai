/**
 * Progressive Disclosure Tools — Smart tool discovery with hybrid search,
 * quick refs, and workflow chains.
 *
 * 3 tools:
 * - discover_tools: Hybrid search with relevance scoring (replaces basic findTools keyword matching)
 * - get_tool_quick_ref: Get the quick ref for a specific tool (what to do next)
 * - get_workflow_chain: Get a recommended tool sequence for a common workflow
 */

import type { McpTool } from "../types.js";
import {
  hybridSearch,
  TOOL_REGISTRY,
  ALL_REGISTRY_ENTRIES,
  WORKFLOW_CHAINS,
  SEARCH_MODES,
  getToolsByCategory,
  getToolsByPhase,
} from "./toolRegistry.js";
import type { SearchMode } from "./toolRegistry.js";
import { embedQuery, isEmbeddingReady } from "./embeddingProvider.js";

export interface DiscoveryOptions {
  getLoadedToolNames?: () => Set<string>;
  getToolToToolset?: () => Map<string, string>;
}

export function createProgressiveDiscoveryTools(
  allRegisteredTools: Array<{ name: string; description: string }>,
  options?: DiscoveryOptions,
): McpTool[] {
  return [
    // ── discover_tools ─────────────────────────────────────────────────
    {
      name: "discover_tools",
      description:
        "Multi-modal tool search engine with 14 scoring strategies: keyword, fuzzy (typo-tolerant), n-gram (partial words), prefix, semantic (synonym expansion), TF-IDF (rare tags score higher), regex, bigram (phrase matching), domain cluster boosting, dense (TF-IDF cosine), neural embedding tool RRF, domain RRF (Agent-as-a-Graph bipartite graph), upward traversal (tool→domain→siblings), and execution trace edges (co-occurrence mining). Returns ranked results with quick refs. Use mode='hybrid' (default) for best results, or 'regex'/'fuzzy'/'prefix'/'semantic'/'exact'/'dense'/'embedding' for targeted search.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              'Natural language description of what you want to do (e.g. "verify my implementation", "search past findings", "run tests", "write academic paper")',
          },
          category: {
            type: "string",
            enum: [
              "verification", "eval", "quality_gate", "learning", "flywheel",
              "reconnaissance", "ui_capture", "vision", "local_file", "web",
              "github", "documentation", "bootstrap", "self_eval",
              "parallel_agents", "llm", "security", "platform",
              "research_writing", "flicker_detection", "figma_flow",
              "boilerplate", "benchmark", "session_memory", "gaia_solvers",
              "toon", "pattern", "git_workflow", "seo", "voice_bridge",
              "critter", "email", "rss", "architect", "ui_ux_dive", "progressive_discovery", "meta",
            ],
            description: "Filter by tool category (optional)",
          },
          phase: {
            type: "string",
            enum: ["research", "implement", "test", "verify", "ship", "meta", "utility"],
            description: "Filter by workflow phase (optional)",
          },
          limit: {
            type: "number",
            description: "Max results to return (default: 10)",
          },
          includeChains: {
            type: "boolean",
            description: "Also return matching workflow chains (default: true)",
          },
          mode: {
            type: "string",
            enum: ["hybrid", "fuzzy", "regex", "prefix", "semantic", "exact", "dense", "embedding"],
            description: "Search mode. 'hybrid' (default) runs all strategies including neural embeddings when available. 'fuzzy' tolerates typos. 'regex' accepts patterns. 'prefix' matches tool name starts. 'semantic' expands synonyms. 'exact' requires exact match. 'dense' uses TF-IDF cosine similarity. 'embedding' uses neural embedding similarity only.",
          },
          explain: {
            type: "boolean",
            description: "Include matchReasons array showing which search strategies contributed to each result's score (default: false)",
          },
          intent: {
            type: "string",
            enum: [
              "file_processing", "web_research", "code_quality", "security_audit",
              "academic_writing", "data_analysis", "llm_interaction", "visual_qa",
              "devops_ci", "team_coordination", "communication", "seo_audit",
              "design_review", "voice_ui", "project_setup",
            ],
            description: "High-level intent hint. Narrows the search to the most relevant toolsets BEFORE running hybrid search. Use this when you know the domain but not the exact tool. Reduces noise and improves accuracy.",
          },
          compact: {
            type: "boolean",
            description: "Return compact results with just name, category, and a one-line hint (saves ~60% tokens in the response). Default: false.",
          },
        },
        required: ["query"],
      },
      handler: async (args) => {
        const query = args.query ?? "";
        const limit = args.limit ?? 10;
        const includeChains = args.includeChains !== false;
        const mode: SearchMode = args.mode ?? "hybrid";
        const explain = args.explain === true;
        const compact = args.compact === true;

        // Intent-based pre-filter: narrow search scope to relevant categories
        const INTENT_CATEGORIES: Record<string, string[]> = {
          file_processing: ["local_file", "documentation"],
          web_research: ["web", "reconnaissance", "github", "rss"],
          code_quality: ["verification", "eval", "quality_gate", "flywheel", "pattern"],
          security_audit: ["security"],
          academic_writing: ["research_writing", "llm"],
          data_analysis: ["local_file", "llm", "benchmark"],
          llm_interaction: ["llm"],
          visual_qa: ["ui_capture", "vision", "flicker_detection", "ui_ux_dive"],
          devops_ci: ["git_workflow", "boilerplate", "bootstrap", "platform"],
          team_coordination: ["parallel_agents", "session_memory"],
          communication: ["email", "rss", "critter"],
          seo_audit: ["seo", "web"],
          design_review: ["figma_flow", "vision", "ui_capture"],
          voice_ui: ["voice_bridge"],
          project_setup: ["bootstrap", "boilerplate", "self_eval"],
        };
        const intentCategories = args.intent ? INTENT_CATEGORIES[args.intent as string] : undefined;

        // Pre-compute query embedding (async) before passing to sync hybridSearch
        let embeddingQueryVec: Float32Array | undefined;
        if ((mode === "hybrid" || mode === "embedding") && isEmbeddingReady()) {
          const vec = await embedQuery(query);
          if (vec) embeddingQueryVec = vec;
        }

        // Multi-modal search with scoring
        // If intent is set, run search once per intent category and merge results
        let results;
        if (intentCategories && !args.category) {
          const perCategoryResults = intentCategories.map(cat =>
            hybridSearch(query, allRegisteredTools, {
              category: cat,
              phase: args.phase,
              limit: Math.ceil(limit / intentCategories.length) + 2,
              mode,
              explain,
              embeddingQueryVec,
              searchFullRegistry: !!options?.getLoadedToolNames,
            })
          );
          // Merge, dedupe, re-sort by score
          const seen = new Set<string>();
          const merged: typeof perCategoryResults[0] = [];
          for (const batch of perCategoryResults) {
            for (const r of batch) {
              if (!seen.has(r.name)) { seen.add(r.name); merged.push(r); }
            }
          }
          merged.sort((a, b) => b.score - a.score);
          results = merged.slice(0, limit);
        } else {
          results = hybridSearch(query, allRegisteredTools, {
            category: args.category,
            phase: args.phase,
            limit,
            mode,
            explain,
            embeddingQueryVec,
            searchFullRegistry: !!options?.getLoadedToolNames,
          });
        }

        // Find matching workflow chains
        let matchingChains: Array<{ name: string; chainKey: string; description: string; stepCount: number }> = [];
        if (includeChains) {
          const queryLower = query.toLowerCase();
          matchingChains = Object.entries(WORKFLOW_CHAINS)
            .filter(([key, chain]) => {
              const text = `${key} ${chain.name} ${chain.description}`.toLowerCase();
              return queryLower.split(/\s+/).some((w: string) => text.includes(w));
            })
            .map(([key, chain]) => ({
              name: chain.name,
              chainKey: key,
              description: chain.description,
              stepCount: chain.steps.length,
            }))
            .slice(0, 3);
        }

        // Category summary: how many tools per category matched
        const categoryCounts: Record<string, number> = {};
        for (const r of results) {
          categoryCounts[r.category] = (categoryCounts[r.category] ?? 0) + 1;
        }

        return {
          query,
          searchMode: mode,
          resultCount: results.length,
          totalToolsSearched: options?.getLoadedToolNames ? ALL_REGISTRY_ENTRIES.length : allRegisteredTools.length,
          availableModes: SEARCH_MODES,
          results: results.map((r) => compact
            ? { name: r.name, category: r.category, hint: r.quickRef.nextAction }
            : {
              name: r.name,
              description: r.description,
              category: r.category,
              phase: r.phase,
              relevanceScore: r.score,
              ...(explain ? { matchReasons: r.matchReasons } : {}),
              quickRef: r.quickRef,
            }),
          categorySummary: categoryCounts,
          matchingWorkflows: matchingChains,
          // Dynamic loading suggestions: when results include tools from unloaded toolsets
          ...((() => {
            if (!options?.getLoadedToolNames || !options?.getToolToToolset) return {};
            const loaded = options.getLoadedToolNames();
            const t2ts = options.getToolToToolset();
            const unloadedToolsets = new Map<string, string[]>();
            for (const r of results) {
              if (!loaded.has(r.name)) {
                const ts = t2ts.get(r.name);
                if (ts) {
                  const list = unloadedToolsets.get(ts) ?? [];
                  list.push(r.name);
                  unloadedToolsets.set(ts, list);
                }
              }
            }
            if (unloadedToolsets.size === 0) return {};
            return {
              _loadSuggestions: [...unloadedToolsets.entries()].map(([ts, tools]) => ({
                toolset: ts,
                matchingTools: tools,
                action: `Call load_toolset("${ts}") to activate ${tools.length} matching tool(s).`,
              })),
            };
          })()),
          _progressiveHint: results.length > 0
            ? `Top match: ${results[0].name}. ${results[0].quickRef.nextAction}`
            : "No matches found. Try broader keywords or call getMethodology('overview') for all available methodologies.",
        };
      },
    },

    // ── get_tool_quick_ref ─────────────────────────────────────────────
    {
      name: "get_tool_quick_ref",
      description:
        "Get the quick reference for a specific tool: what to do next, related tools, methodology, and tips. Call this after using any tool to understand the recommended next step in the workflow.",
      inputSchema: {
        type: "object",
        properties: {
          toolName: {
            type: "string",
            description: "The name of the tool to get quick ref for",
          },
          includeRelatedDetails: {
            type: "boolean",
            description: "Also return quick refs for the recommended next tools (default: false)",
          },
        },
        required: ["toolName"],
      },
      handler: async (args) => {
        const entry = TOOL_REGISTRY.get(args.toolName);
        if (!entry) {
          // Try fuzzy match
          const candidates = ALL_REGISTRY_ENTRIES
            .filter((e) => e.name.includes(args.toolName) || args.toolName.includes(e.name))
            .map((e) => e.name);

          return {
            error: true,
            message: `Tool '${args.toolName}' not found in registry.`,
            didYouMean: candidates.slice(0, 5),
            tip: "Use discover_tools to search for tools by description.",
          };
        }

        const result: Record<string, unknown> = {
          tool: entry.name,
          category: entry.category,
          phase: entry.phase,
          tags: entry.tags,
          quickRef: entry.quickRef,
        };

        // Optionally include quick refs for next tools
        if (args.includeRelatedDetails) {
          const relatedRefs: Record<string, unknown> = {};
          for (const nextTool of entry.quickRef.nextTools) {
            const nextEntry = TOOL_REGISTRY.get(nextTool);
            if (nextEntry) {
              relatedRefs[nextTool] = {
                category: nextEntry.category,
                phase: nextEntry.phase,
                quickRef: nextEntry.quickRef,
              };
            }
          }
          result.relatedToolDetails = relatedRefs;
        }

        return result;
      },
    },

    // ── get_workflow_chain ──────────────────────────────────────────────
    {
      name: "get_workflow_chain",
      description:
        'Get a recommended tool sequence for a common workflow. Returns step-by-step tool chain with actions for each step. 25 chains available covering feature dev, debugging, security, deployment, research, academic writing, CI/CD, multi-agent coordination, and more. Call with chain="list" to see all.',
      inputSchema: {
        type: "object",
        properties: {
          chain: {
            type: "string",
            enum: [
              "new_feature", "fix_bug", "ui_change", "parallel_project",
              "research_phase", "academic_paper", "c_compiler_benchmark",
              "security_audit", "code_review", "deployment", "migration",
              "coordinator_spawn", "self_setup", "flicker_detection",
              "figma_flow_analysis", "agent_eval", "contract_compliance",
              "ablation_eval", "session_recovery", "attention_refresh",
              "task_bank_setup", "pr_review", "seo_audit", "voice_pipeline",
              "intentionality_check", "research_digest", "email_assistant", "list",
            ],
            description: 'Which workflow chain to retrieve. Use "list" to see all available chains with descriptions.',
          },
        },
        required: ["chain"],
      },
      handler: async (args) => {
        if (args.chain === "list") {
          return {
            availableChains: Object.entries(WORKFLOW_CHAINS).map(([key, chain]) => ({
              key,
              name: chain.name,
              description: chain.description,
              stepCount: chain.steps.length,
            })),
            tip: "Call get_workflow_chain with a specific chain key to get the full step-by-step sequence.",
          };
        }

        const chain = WORKFLOW_CHAINS[args.chain];
        if (!chain) {
          return {
            error: true,
            message: `Unknown chain: ${args.chain}`,
            available: Object.keys(WORKFLOW_CHAINS),
          };
        }

        // Enrich steps with quick refs
        const enrichedSteps = chain.steps.map((step, i) => {
          const entry = TOOL_REGISTRY.get(step.tool);
          return {
            stepNumber: i + 1,
            tool: step.tool,
            action: step.action,
            category: entry?.category ?? "unknown",
            phase: entry?.phase ?? "unknown",
            quickRef: entry?.quickRef ?? null,
          };
        });

        return {
          chain: args.chain,
          name: chain.name,
          description: chain.description,
          totalSteps: enrichedSteps.length,
          steps: enrichedSteps,
          _hint: `Start with step 1: call ${chain.steps[0].tool}. Each step's quickRef tells you what to do after.`,
        };
      },
    },
  ];
}
