#!/usr/bin/env node
/**
 * NodeBench MCP — Development Methodology Edition
 *
 * Zero-config, fully local MCP server backed by SQLite.
 * Packages the 6-Phase Verification, Eval-Driven Development, AI Flywheel,
 * Quality Gates, and Learnings methodologies as MCP tools that guide agents
 * to work more rigorously.
 *
 * Data stored in ~/.nodebench/nodebench.db
 *
 * Uses the low-level Server class to register tools with raw JSON Schema
 * (the high-level McpServer.tool() requires Zod schemas in SDK >=1.17).
 *
 * Usage:
 *   npx @nodebench/mcp          (stdio transport)
 *   npx tsx src/index.ts         (dev mode)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import Database from "better-sqlite3";
import { getDb, genId } from "./db.js";
import { getAnalyticsDb, closeAnalyticsDb, clearOldRecords } from "./analytics/index.js";
import { AnalyticsTracker } from "./analytics/toolTracker.js";
import { generateSmartPreset, formatPresetRecommendation, listPresets } from "./analytics/index.js";
import { getProjectUsageSummary, exportUsageStats, formatStatsDisplay } from "./analytics/index.js";
import { TOOLSET_MAP, TOOL_TO_TOOLSET } from "./toolsetRegistry.js";
import { createMetaTools } from "./tools/metaTools.js";
import { createProgressiveDiscoveryTools } from "./tools/progressiveDiscoveryTools.js";
import { getQuickRef, ALL_REGISTRY_ENTRIES, TOOL_REGISTRY, getToolComplexity, _setDbAccessor, hybridSearch } from "./tools/toolRegistry.js";
import type { McpTool } from "./types.js";

// TOON format — ~40% token savings on tool responses
import { encode as toonEncode } from "@toon-format/toon";
// Embedding provider — neural semantic search
import { initEmbeddingIndex } from "./tools/embeddingProvider.js";

 // ── CLI argument parsing ──────────────────────────────────────────────
 const cliArgs = process.argv.slice(2);
 const useToon = !cliArgs.includes("--no-toon");
 const useEmbedding = !cliArgs.includes("--no-embedding");
 const useSmartPreset = cliArgs.includes("--smart-preset");
 const showStats = cliArgs.includes("--stats");
 const exportStats = cliArgs.includes("--export-stats");
 const resetStats = cliArgs.includes("--reset-stats");
 const listPresetsFlag = cliArgs.includes("--list-presets");

export { TOOLSET_MAP };

const DEFAULT_TOOLSETS = ["verification", "eval", "quality_gate", "learning", "flywheel", "recon", "security", "boilerplate"];

const PRESETS: Record<string, string[]> = {
  default: DEFAULT_TOOLSETS,
  // Themed presets — bridge between default (50 tools) and full (175 tools)
  web_dev:      [...DEFAULT_TOOLSETS, "ui_capture", "vision", "web", "seo", "git_workflow", "architect", "ui_ux_dive"],
  research:     [...DEFAULT_TOOLSETS, "web", "llm", "rss", "email", "docs"],
  data:         [...DEFAULT_TOOLSETS, "local_file", "llm", "web"],
  devops:       [...DEFAULT_TOOLSETS, "git_workflow", "session_memory", "benchmark", "pattern"],
  mobile:       [...DEFAULT_TOOLSETS, "ui_capture", "vision", "flicker_detection", "ui_ux_dive"],
  academic:     [...DEFAULT_TOOLSETS, "research_writing", "llm", "web", "local_file"],
  multi_agent:  [...DEFAULT_TOOLSETS, "parallel", "self_eval", "session_memory", "pattern", "toon"],
  content:      [...DEFAULT_TOOLSETS, "llm", "critter", "email", "rss", "platform", "architect"],
  full: Object.keys(TOOLSET_MAP),
};

const PRESET_DESCRIPTIONS: Record<string, string> = {
  default:     "Core AI Flywheel — verification, eval, quality gates, learning, recon",
  web_dev:     "Web projects — adds visual QA, SEO audit, git workflow, code architecture",
  research:    "Research workflows — adds web search, LLM calls, RSS feeds, email, docs",
  data:        "Data analysis — adds CSV/XLSX/PDF/JSON parsing, LLM extraction, web fetch",
  devops:      "CI/CD & ops — adds git compliance, session memory, benchmarks, pattern mining",
  mobile:      "Mobile apps — adds screenshot capture, vision analysis, flicker detection",
  academic:    "Academic papers — adds polish, review, translate, logic check, data analysis",
  multi_agent: "Multi-agent teams — adds task locking, messaging, roles, oracle testing",
  content:     "Content & publishing — adds LLM, accountability, email, RSS, platform queue",
  full:        "Everything — all toolsets for maximum coverage",
};

   function parseToolsets(): McpTool[] {
    if (cliArgs.includes("--help")) {
      const lines = [
        "nodebench-mcp v2.17.0 — Development Methodology MCP Server",
        "",
        "Usage: nodebench-mcp [options]",
        "",
        "Options:",
        "  --toolsets <list>   Comma-separated toolsets to enable (default: default)",
        "  --exclude <list>    Comma-separated toolsets to exclude",
        "  --preset <name>     Use a preset: default or full",
        "  --smart-preset      Generate smart preset recommendation based on project type and usage history",
        "  --stats             Show usage statistics for current project",
        "  --export-stats      Export usage statistics to JSON",
        "  --reset-stats       Clear all usage analytics data",
        "  --list-presets      List all available presets with descriptions",
        "  --dynamic           Enable dynamic toolset loading (Search+Load pattern from arxiv 2509.20386)",
        "  --no-toon           Disable TOON encoding (TOON is on by default for ~40% token savings)",
        "  --no-embedding      Disable neural embedding search (uses local HuggingFace model or API keys)",
        "  --help              Show this help and exit",
        "",
        "Available toolsets:",
        ...Object.entries(TOOLSET_MAP).map(([k, v]) => `  ${k.padEnd(16)} ${v.length} tools`),
        "",
        "Presets:",
        ...Object.entries(PRESETS).map(([k, v]) => {
          const count = v.reduce((s, ts) => s + (TOOLSET_MAP[ts]?.length ?? 0), 0) + 12;
          return `  ${k.padEnd(14)} ${String(count).padStart(3)} tools  ${PRESET_DESCRIPTIONS[k] ?? ''}`;
        }),
        "",
        "Examples:",
        "  npx nodebench-mcp                    # Default (50 tools) - core AI Flywheel",
        "  npx nodebench-mcp --preset web_dev   # Web development (+ vision, SEO, git)",
        "  npx nodebench-mcp --preset research  # Research workflows (+ web, LLM, RSS, email)",
        "  npx nodebench-mcp --preset data      # Data analysis (+ local file parsing, LLM)",
        "  npx nodebench-mcp --preset academic  # Academic writing (+ paper tools, LLM)",
        "  npx nodebench-mcp --preset full      # All 175 tools",
        "  npx nodebench-mcp --smart-preset     # Get AI-powered preset recommendation",
        "  npx nodebench-mcp --stats            # Show usage statistics",
        "  npx nodebench-mcp --toolsets verification,eval,recon",
        "  npx nodebench-mcp --exclude vision,ui_capture,parallel",
        "",
        "Pro tip: Use findTools and getMethodology at runtime for dynamic tool discovery.",
        "See: https://www.anthropic.com/engineering/code-execution-with-mcp",
      ];
      console.error(lines.join("\n"));
      process.exit(0);
    }

  const presetIdx = cliArgs.indexOf("--preset");
  if (presetIdx !== -1 && cliArgs[presetIdx + 1]) {
    const presetName = cliArgs[presetIdx + 1];
    const presetKeys = PRESETS[presetName];
    if (!presetKeys) {
      console.error(`Unknown preset: ${presetName}. Available: ${Object.keys(PRESETS).join(", ")}`);
      process.exit(1);
    }
    return presetKeys.flatMap((k) => TOOLSET_MAP[k] ?? []);
  }

  const tsIdx = cliArgs.indexOf("--toolsets");
  if (tsIdx !== -1 && cliArgs[tsIdx + 1]) {
    const requested = cliArgs[tsIdx + 1].split(",").map((s) => s.trim());
    const invalid = requested.filter((k) => !TOOLSET_MAP[k]);
    if (invalid.length) {
      console.error(`Unknown toolsets: ${invalid.join(", ")}. Available: ${Object.keys(TOOLSET_MAP).join(", ")}`);
      process.exit(1);
    }
    return requested.flatMap((k) => TOOLSET_MAP[k]);
  }

  const exIdx = cliArgs.indexOf("--exclude");
  if (exIdx !== -1 && cliArgs[exIdx + 1]) {
    const excluded = new Set(cliArgs[exIdx + 1].split(",").map((s) => s.trim()));
    const invalid = [...excluded].filter((k) => !TOOLSET_MAP[k]);
    if (invalid.length) {
      console.error(`Unknown toolsets: ${invalid.join(", ")}. Available: ${Object.keys(TOOLSET_MAP).join(", ")}`);
      process.exit(1);
    }
    return Object.entries(TOOLSET_MAP)
      .filter(([k]) => !excluded.has(k))
      .flatMap(([, v]) => v);
  }

   // Default to default preset (50 tools - complete AI Flywheel)
   return PRESETS.default.flatMap((k) => TOOLSET_MAP[k] ?? []);
}

// ── Analytics CLI flag handling ─────────────────────────────────────────
// Handle --list-presets
if (listPresetsFlag) {
  const presets = listPresets(TOOLSET_MAP);
  console.log(JSON.stringify(presets, null, 2));
  process.exit(0);
}

// ── Analytics CLI handlers (run-and-exit) ───────────────────────────────
if (resetStats || useSmartPreset || showStats || exportStats) {
  const aDb = getAnalyticsDb();
  try {
    if (resetStats) {
      clearOldRecords(aDb, 0);
      console.error("Usage analytics data cleared (tool_usage + cache). Project context and preset history preserved.");
    } else if (useSmartPreset) {
      const recommendation = generateSmartPreset(aDb, TOOLSET_MAP);
      console.error(formatPresetRecommendation(recommendation, TOOLSET_MAP));
    } else if (showStats) {
      const summary = getProjectUsageSummary(aDb, process.cwd(), 30);
      if (summary) {
        console.error(formatStatsDisplay(summary, process.cwd()));
      } else {
        console.error("No usage data available for this project in the last 30 days.");
      }
    } else if (exportStats) {
      console.log(exportUsageStats(aDb, process.cwd(), 30));
    }
  } finally {
    closeAnalyticsDb(aDb);
  }
  process.exit(0);
}

// Initialize DB (creates ~/.nodebench/ and schema on first run)
getDb();

// Wire up DB accessor for execution trace edges (avoids circular import)
_setDbAccessor(getDb);

// Assemble tools (filtered by --toolsets / --exclude / --preset if provided)
let domainTools: McpTool[] = parseToolsets();

// Determine current preset name for analytics
let currentPreset: string = 'default';
const presetIdx = cliArgs.indexOf("--preset");
if (presetIdx !== -1 && cliArgs[presetIdx + 1]) {
  currentPreset = cliArgs[presetIdx + 1];
} else if (cliArgs.includes("--toolsets") || cliArgs.includes("--exclude")) {
  currentPreset = 'custom';
}

// Dynamic loading: --dynamic flag enables Search+Load architecture
// (arxiv 2509.20386 "Dynamic ReAct" winning pattern)
const useDynamicLoading = cliArgs.includes("--dynamic");

// Track which toolsets are currently active (mutable for dynamic loading)
const initialToolsetNames = new Set(
  PRESETS[currentPreset] ?? PRESETS.default
);
const activeToolsets = new Set(initialToolsetNames);

// Tools to skip auto-logging (avoid infinite recursion and noise)
const SKIP_AUTO_LOG = new Set(["log_tool_call", "get_trajectory_analysis", "get_self_eval_report", "get_improvement_recommendations", "cleanup_stale_runs", "synthesize_recon_to_learnings", "load_toolset", "unload_toolset", "list_available_toolsets"]);

// Initialize analytics tracker singleton (handles DB, project context, retention cleanup)
const tracker = AnalyticsTracker.init({
  projectPath: process.cwd(),
  preset: currentPreset,
  toolCount: domainTools.length + 6,
  toolToToolset: TOOL_TO_TOOLSET,
  skipTools: SKIP_AUTO_LOG,
});
const metaTools = createMetaTools(domainTools);
let allToolsWithoutDiscovery = [...domainTools, ...metaTools];
// Progressive discovery tools need the full tool list for hybrid search
// Pass dynamic loading callbacks so discover_tools can suggest load_toolset for unloaded toolsets
const discoveryTools = createProgressiveDiscoveryTools(
  allToolsWithoutDiscovery.map((t) => ({ name: t.name, description: t.description })),
  {
    getLoadedToolNames: () => new Set(allTools.map(t => t.name)),
    getToolToToolset: () => TOOL_TO_TOOLSET,
  },
);

// ── Dynamic Loading Tools (Search+Load pattern) ────────────────────────
// Based on Dynamic ReAct (arxiv 2509.20386) — the winning architecture.
// Agent starts with default preset, discovers tools via discover_tools,
// then calls load_toolset to activate them. Server sends
// notifications/tools/list_changed so the client re-fetches the tool list.
const dynamicLoadingTools: McpTool[] = [
  {
    name: "load_toolset",
    description:
      'Dynamically load a toolset into the current session. After loading, the tools become immediately available for use. Based on the "Search+Load" architecture from Dynamic ReAct (arxiv 2509.20386) — the winning pattern for scalable MCP tool selection. Use discover_tools first to find which toolset you need, then call this to activate it.',
    inputSchema: {
      type: "object",
      properties: {
        toolset: {
          type: "string",
          description: `Toolset name to load. Available: ${Object.keys(TOOLSET_MAP).filter(k => !activeToolsets.has(k)).join(", ") || "(all loaded)"}`,
        },
      },
      required: ["toolset"],
    },
    handler: async (args) => {
      const { toolset } = args as { toolset: string };
      if (!TOOLSET_MAP[toolset]) {
        return { error: true, message: `Unknown toolset: ${toolset}`, available: Object.keys(TOOLSET_MAP) };
      }
      if (activeToolsets.has(toolset)) {
        return { alreadyLoaded: true, toolset, message: `Toolset '${toolset}' is already active.`, activeToolCount: allTools.length };
      }

      const startMs = Date.now();
      const toolsBefore = allTools.length;

      // Add toolset to active set
      activeToolsets.add(toolset);
      const newTools = TOOLSET_MAP[toolset];

      // Rebuild domain tools from active toolsets
      domainTools = [...activeToolsets].flatMap(k => TOOLSET_MAP[k] ?? []);
      const newMetaTools = createMetaTools(domainTools);
      allToolsWithoutDiscovery = [...domainTools, ...newMetaTools];

      // Rebuild allTools (keep discovery + dynamic loading tools stable)
      rebuildAllTools();

      // Track A/B event
      try {
        const db = getDb();
        db.prepare(
          "INSERT INTO ab_tool_events (id, session_id, event_type, toolset_name, tools_before, tools_after, latency_ms, created_at) VALUES (?, ?, 'load', ?, ?, ?, ?, datetime('now'))"
        ).run(genId("abe"), SESSION_ID, toolset, toolsBefore, allTools.length, Date.now() - startMs);
      } catch { /* instrumentation must not break tool dispatch */ }

      // Notify client that tool list changed (MCP spec)
      try {
        await server.notification({ method: "notifications/tools/list_changed" });
      } catch { /* client may not support notifications */ }

      return {
        loaded: true,
        toolset,
        toolsAdded: newTools.length,
        toolNames: newTools.map(t => t.name),
        activeToolCount: allTools.length,
        activeToolsets: [...activeToolsets],
        _hint: `${newTools.length} tools from '${toolset}' are now available. You can use them directly.`,
      };
    },
  },
  {
    name: "unload_toolset",
    description:
      "Remove a dynamically loaded toolset from the current session to free up context. Cannot unload toolsets from the initial preset.",
    inputSchema: {
      type: "object",
      properties: {
        toolset: {
          type: "string",
          description: "Toolset name to unload.",
        },
      },
      required: ["toolset"],
    },
    handler: async (args) => {
      const { toolset } = args as { toolset: string };
      if (!activeToolsets.has(toolset)) {
        return { error: true, message: `Toolset '${toolset}' is not currently loaded.` };
      }
      if (initialToolsetNames.has(toolset)) {
        return { error: true, message: `Cannot unload '${toolset}' — it's part of the initial preset (${currentPreset}).` };
      }

      const toolsBefore = allTools.length;
      activeToolsets.delete(toolset);

      // Rebuild
      domainTools = [...activeToolsets].flatMap(k => TOOLSET_MAP[k] ?? []);
      const newMetaTools = createMetaTools(domainTools);
      allToolsWithoutDiscovery = [...domainTools, ...newMetaTools];
      rebuildAllTools();

      try {
        const db = getDb();
        db.prepare(
          "INSERT INTO ab_tool_events (id, session_id, event_type, toolset_name, tools_before, tools_after, created_at) VALUES (?, ?, 'unload', ?, ?, ?, datetime('now'))"
        ).run(genId("abe"), SESSION_ID, toolset, toolsBefore, allTools.length);
      } catch { /* instrumentation */ }

      try {
        await server.notification({ method: "notifications/tools/list_changed" });
      } catch { /* client may not support notifications */ }

      return {
        unloaded: true,
        toolset,
        activeToolCount: allTools.length,
        activeToolsets: [...activeToolsets],
      };
    },
  },
  {
    name: "list_available_toolsets",
    description:
      "List all available toolsets showing which are currently loaded and which can be dynamically added. Includes tool counts and descriptions for each toolset.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const toolsets = Object.entries(TOOLSET_MAP).map(([name, tools]) => ({
        name,
        toolCount: tools.length,
        loaded: activeToolsets.has(name),
        isInitialPreset: initialToolsetNames.has(name),
        description: PRESET_DESCRIPTIONS[name] ?? null,
        tools: tools.map(t => t.name),
      }));

      const loaded = toolsets.filter(t => t.loaded);
      const available = toolsets.filter(t => !t.loaded);

      return {
        mode: useDynamicLoading ? "dynamic" : "static",
        currentPreset,
        activeToolCount: allTools.length,
        loaded: { count: loaded.length, toolsets: loaded },
        available: { count: available.length, toolsets: available },
        _hint: available.length > 0
          ? `${available.length} toolsets available to load. Call load_toolset("<name>") to activate.`
          : "All toolsets are loaded.",
      };
    },
  },
  {
    name: "call_loaded_tool",
    description:
      'Call a dynamically loaded tool by name. Use this after load_toolset when your client does not automatically refresh the tool list. Pass the tool name and its arguments. Example: call_loaded_tool({ tool: "analyze_screenshot", args: { imagePath: "screenshot.png" } }). This is a fallback — if the loaded tool appears in your tool list directly, call it directly instead.',
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          description: "Name of the dynamically loaded tool to call.",
        },
        args: {
          type: "object",
          description: "Arguments to pass to the tool (same as its inputSchema).",
          additionalProperties: true,
        },
      },
      required: ["tool"],
    },
    handler: async (callArgs) => {
      const { tool: toolName, args: toolArgs } = callArgs as { tool: string; args?: Record<string, unknown> };
      const target = allTools.find(t => t.name === toolName);
      if (!target) {
        return {
          error: true,
          message: `Tool '${toolName}' not found. It may not be loaded yet.`,
          _hint: "Call list_available_toolsets to see what's available, then load_toolset to activate it.",
          loadedTools: allTools.map(t => t.name),
        };
      }
      // Dispatch to the target tool's handler
      return target.handler(toolArgs ?? {});
    },
  },
  {
    name: "smart_select_tools",
    description:
      'LLM-powered tool selection: sends your task description + a compact tool catalog to a fast model (Gemini 3 Flash, GPT-5-mini, or Claude Haiku 4.5) to pick the best 5-10 tools. Much more accurate than keyword search for ambiguous queries like "call an AI model" or "analyze my data". Requires GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY. Falls back to heuristic discover_tools if no API key is set.',
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "Describe what you want to accomplish. Be specific. Example: 'I need to parse a PDF, extract tables, and email a summary'",
        },
        maxTools: {
          type: "number",
          description: "Maximum tools to return (default: 8)",
        },
        provider: {
          type: "string",
          enum: ["auto", "gemini", "openai", "anthropic"],
          description: "Which LLM provider to use. 'auto' (default) picks the first available API key.",
        },
      },
      required: ["task"],
    },
    handler: async (args) => {
      const task = args.task as string;
      const maxTools = (args.maxTools as number) ?? 8;
      const provider = (args.provider as string) ?? "auto";

      // Build compact tool catalog: name + category + tags (no descriptions — saves tokens)
      const catalog = ALL_REGISTRY_ENTRIES.map(e =>
        `${e.name} [${e.category}] ${e.tags.slice(0, 5).join(",")}`
      ).join("\n");

      const systemPrompt = `You are a tool selection assistant. Given a task description and a catalog of ${ALL_REGISTRY_ENTRIES.length} tools, pick the ${maxTools} most relevant tools. Return ONLY a JSON array of tool names, nothing else. Example: ["tool_a","tool_b"]`;
      const userPrompt = `Task: ${task}\n\nTool catalog (name [category] tags):\n${catalog}`;

      // Try LLM providers in order
      const geminiKey = process.env.GEMINI_API_KEY;
      const openaiKey = process.env.OPENAI_API_KEY;
      const anthropicKey = process.env.ANTHROPIC_API_KEY;

      let selectedProvider = provider;
      if (selectedProvider === "auto") {
        if (geminiKey) selectedProvider = "gemini";
        else if (openaiKey) selectedProvider = "openai";
        else if (anthropicKey) selectedProvider = "anthropic";
        else selectedProvider = "none";
      }

      if (selectedProvider === "none") {
        // Fallback: run heuristic discover_tools (search full registry for dynamic mode)
        const heuristicResults = hybridSearch(task, allTools.map(t => ({ name: t.name, description: t.description })), {
          limit: maxTools,
          mode: "hybrid",
          searchFullRegistry: useDynamicLoading,
        });
        return {
          method: "heuristic_fallback",
          reason: "No API key found. Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY for LLM-powered selection.",
          tools: heuristicResults.map((r: { name: string; category: string; score: number; quickRef: any }) => ({
            name: r.name,
            category: r.category,
            score: r.score,
            quickRef: r.quickRef,
          })),
          _hint: "For better accuracy on ambiguous queries, set an API key to enable LLM-powered selection.",
        };
      }

      try {
        let responseText = "";

        if (selectedProvider === "gemini" && geminiKey) {
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
                generationConfig: { temperature: 0, maxOutputTokens: 512 },
              }),
            }
          );
          const data = await resp.json() as any;
          responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        } else if (selectedProvider === "openai" && openaiKey) {
          const resp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
            body: JSON.stringify({
              model: "gpt-5-mini",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: 0,
              max_tokens: 512,
            }),
          });
          const data = await resp.json() as any;
          responseText = data?.choices?.[0]?.message?.content ?? "";
        } else if (selectedProvider === "anthropic" && anthropicKey) {
          const resp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": anthropicKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-3-5-haiku-latest",
              max_tokens: 512,
              system: systemPrompt,
              messages: [{ role: "user", content: userPrompt }],
            }),
          });
          const data = await resp.json() as any;
          responseText = data?.content?.[0]?.text ?? "";
        }

        // Parse the JSON array from the response
        const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
        if (!jsonMatch) {
          return { error: true, message: "LLM did not return a valid JSON array", raw: responseText.slice(0, 200) };
        }
        const selectedNames: string[] = JSON.parse(jsonMatch[0]);

        // Enrich with registry metadata
        const enriched = selectedNames
          .map(name => {
            const entry = TOOL_REGISTRY.get(name);
            if (!entry) return null;
            return {
              name: entry.name,
              category: entry.category,
              phase: entry.phase,
              tags: entry.tags,
              quickRef: entry.quickRef,
              loaded: allTools.some(t => t.name === name),
            };
          })
          .filter(Boolean);

        // Identify toolsets to load
        const unloadedToolsets = new Map<string, string[]>();
        for (const tool of enriched) {
          if (tool && !tool.loaded) {
            const ts = TOOL_TO_TOOLSET.get(tool.name);
            if (ts) {
              const list = unloadedToolsets.get(ts) ?? [];
              list.push(tool.name);
              unloadedToolsets.set(ts, list);
            }
          }
        }

        return {
          method: `llm_${selectedProvider}`,
          task,
          selectedTools: enriched,
          toolCount: enriched.length,
          ...(unloadedToolsets.size > 0 ? {
            _loadSuggestions: [...unloadedToolsets.entries()].map(([ts, tools]) => ({
              toolset: ts,
              matchingTools: tools,
              action: `Call load_toolset("${ts}") to activate ${tools.length} tool(s).`,
            })),
          } : {}),
          _hint: enriched.length > 0
            ? `Top pick: ${enriched[0]!.name}. ${enriched[0]!.quickRef.nextAction}`
            : "No tools selected. Try rephrasing your task.",
        };
      } catch (err: any) {
        return {
          error: true,
          method: `llm_${selectedProvider}`,
          message: `LLM call failed: ${err.message}`,
          _hint: "Falling back to heuristic search. Check your API key.",
        };
      }
    },
  },
  {
    name: "get_ab_test_report",
    description:
      "Generate an A/B test comparison report for static vs dynamic toolset loading. Shows session counts, tool counts, load events, error rates, and per-toolset load frequency. Use after running sessions in both modes to evaluate the impact of dynamic loading.",
    inputSchema: {
      type: "object",
      properties: {
        detailed: {
          type: "boolean",
          description: "Include per-session breakdown (default: false, summary only)",
        },
      },
    },
    handler: async (args) => {
      const db = getDb();
      const detailed = args.detailed === true;

      // Session-level aggregates by mode
      const sessionSummary = db.prepare(`
        SELECT
          mode,
          COUNT(*) as sessions,
          ROUND(AVG(initial_tool_count), 1) as avg_initial_tools,
          ROUND(AVG(COALESCE(final_tool_count, initial_tool_count)), 1) as avg_final_tools,
          ROUND(AVG(COALESCE(total_tool_calls, 0)), 1) as avg_tool_calls,
          ROUND(AVG(COALESCE(total_load_events, 0)), 1) as avg_load_events,
          ROUND(AVG(COALESCE(session_duration_ms, 0)) / 1000.0, 1) as avg_duration_sec,
          SUM(COALESCE(total_tool_calls, 0)) as total_calls,
          SUM(COALESCE(total_load_events, 0)) as total_loads
        FROM ab_test_sessions
        GROUP BY mode
      `).all() as any[];

      // Error rate by mode (join with tool_call_log)
      const errorRates = db.prepare(`
        SELECT
          s.mode,
          COUNT(CASE WHEN t.result_status = 'error' THEN 1 END) as errors,
          COUNT(*) as total_calls,
          ROUND(100.0 * COUNT(CASE WHEN t.result_status = 'error' THEN 1 END) / MAX(COUNT(*), 1), 2) as error_pct
        FROM tool_call_log t
        JOIN ab_test_sessions s ON t.session_id = s.id
        GROUP BY s.mode
      `).all() as any[];

      // Top loaded toolsets (dynamic mode)
      const topToolsets = db.prepare(`
        SELECT
          toolset_name,
          COUNT(*) as load_count,
          ROUND(AVG(latency_ms), 1) as avg_latency_ms
        FROM ab_tool_events
        WHERE event_type = 'load'
        GROUP BY toolset_name
        ORDER BY load_count DESC
        LIMIT 10
      `).all() as any[];

      // Current session info
      const currentSession = {
        sessionId: SESSION_ID,
        mode: useDynamicLoading ? "dynamic" : "static",
        preset: currentPreset,
        toolCalls: _abToolCallCount,
        loadEvents: _abLoadEventCount,
        activeTools: allTools.length,
        durationSec: Math.round((Date.now() - _abStartMs) / 1000),
        dynamicallyLoaded: [...activeToolsets].filter(ts => !initialToolsetNames.has(ts)),
      };

      // Optional per-session detail
      let sessions: any[] = [];
      if (detailed) {
        sessions = db.prepare(`
          SELECT id, mode, initial_preset, initial_tool_count, final_tool_count,
                 toolsets_loaded, total_tool_calls, total_load_events,
                 session_duration_ms, created_at, ended_at
          FROM ab_test_sessions
          ORDER BY created_at DESC
          LIMIT 50
        `).all() as any[];
      }

      // Build verdict
      const staticSummary = sessionSummary.find((s: any) => s.mode === "static");
      const dynamicSummary = sessionSummary.find((s: any) => s.mode === "dynamic");
      let verdict = "Insufficient data. Run sessions in both modes to compare.";
      if (staticSummary && dynamicSummary) {
        const toolDiff = (staticSummary.avg_final_tools ?? 0) - (dynamicSummary.avg_final_tools ?? 0);
        const staticErr = errorRates.find((e: any) => e.mode === "static");
        const dynamicErr = errorRates.find((e: any) => e.mode === "dynamic");
        const errDiff = (staticErr?.error_pct ?? 0) - (dynamicErr?.error_pct ?? 0);
        verdict = [
          `Static: ${staticSummary.sessions} sessions, avg ${staticSummary.avg_final_tools} tools, ${staticErr?.error_pct ?? "?"}% error rate.`,
          `Dynamic: ${dynamicSummary.sessions} sessions, avg ${dynamicSummary.avg_final_tools} tools, ${dynamicErr?.error_pct ?? "?"}% error rate.`,
          toolDiff > 0 ? `Dynamic uses ${toolDiff.toFixed(1)} fewer tools on average.` : "",
          errDiff > 0 ? `Dynamic has ${errDiff.toFixed(2)}pp lower error rate.` : errDiff < 0 ? `Static has ${(-errDiff).toFixed(2)}pp lower error rate.` : "",
          dynamicSummary.avg_load_events > 0 ? `Agents loaded ${dynamicSummary.avg_load_events} toolsets per session on average.` : "",
        ].filter(Boolean).join(" ");
      }

      return {
        verdict,
        sessionSummary,
        errorRates,
        topLoadedToolsets: topToolsets,
        currentSession,
        ...(detailed ? { sessions } : {}),
        _hint: sessionSummary.length < 2
          ? "Run sessions with both `npx nodebench-mcp` (static) and `npx nodebench-mcp --dynamic` (dynamic) to compare."
          : "Compare avg_final_tools and error_pct between modes to evaluate dynamic loading impact.",
      };
    },
  },
];

// Combine all tools (mutable for dynamic loading)
let allTools = [...allToolsWithoutDiscovery, ...discoveryTools, ...dynamicLoadingTools];

// Background: initialize embedding index for semantic search (non-blocking)
// Uses Agent-as-a-Graph bipartite corpus: tool nodes + domain nodes for graph-aware retrieval
if (useEmbedding) {
  const descMap = new Map(allTools.map((t) => [t.name, t.description]));

  // Tool nodes: individual tools with full metadata text
  const toolCorpus = ALL_REGISTRY_ENTRIES.map((entry) => ({
    name: entry.name,
    text: `${entry.name} ${entry.tags.join(" ")} ${entry.category} ${entry.phase} ${descMap.get(entry.name) ?? ""}`,
    nodeType: "tool" as const,
  }));

  // Domain nodes: aggregate category descriptions for upward traversal
  // When a domain matches, all tools in that domain get a sibling boost
  const categoryTools = new Map<string, string[]>();
  for (const entry of ALL_REGISTRY_ENTRIES) {
    const list = categoryTools.get(entry.category) ?? [];
    list.push(entry.name);
    categoryTools.set(entry.category, list);
  }
  const domainCorpus = [...categoryTools.entries()].map(([category, toolNames]) => {
    const allTags = new Set<string>();
    const descs: string[] = [];
    for (const tn of toolNames) {
      const e = ALL_REGISTRY_ENTRIES.find((r) => r.name === tn);
      if (e) e.tags.forEach((t) => allTags.add(t));
      const d = descMap.get(tn);
      if (d) descs.push(d);
    }
    // Domain text includes tool descriptions for richer semantic signal
    return {
      name: `domain:${category}`,
      text: `${category} domain: ${toolNames.join(" ")} ${[...allTags].join(" ")} ${descs.map(d => d.slice(0, 80)).join(" ")}`,
      nodeType: "domain" as const,
    };
  });

  const embeddingCorpus = [...toolCorpus, ...domainCorpus];
  initEmbeddingIndex(embeddingCorpus).catch(() => {
    /* Embedding init failed — semantic search stays disabled, no impact on other features */
  });
}

// Build a lookup map for fast tool dispatch (mutable for dynamic loading)
let toolMap = new Map<string, McpTool>();
for (const tool of allTools) {
  toolMap.set(tool.name, tool);
}

// Rebuild function for dynamic loading — reconstructs allTools + toolMap
function rebuildAllTools() {
  allTools = [...allToolsWithoutDiscovery, ...discoveryTools, ...dynamicLoadingTools];
  toolMap = new Map<string, McpTool>();
  for (const tool of allTools) {
    toolMap.set(tool.name, tool);
  }
}

// Auto-instrumentation: generate a session ID per MCP connection
const SESSION_ID = genId("mcp");

// A/B test session-level counters (mutable, finalized on exit)
let _abToolCallCount = 0;
let _abLoadEventCount = 0;
const _abStartMs = Date.now();

// ── Lightweight hooks: auto-save + attention refresh reminders ─────────
const _hookState = {
  totalCalls: 0,
  consecutiveWebCalls: 0, // web_search, fetch_url without save_session_note
  lastRefreshReminder: 0, // totalCalls at last reminder
};
const WEB_TOOL_NAMES = new Set(["web_search", "fetch_url"]);
const SAVE_TOOL_NAMES = new Set(["save_session_note", "record_learning"]);
const REFRESH_INTERVAL = 30; // remind after every 30 calls

function getHookHint(toolName: string): string | null {
  _hookState.totalCalls++;

  // Track consecutive web calls
  if (WEB_TOOL_NAMES.has(toolName)) {
    _hookState.consecutiveWebCalls++;
  } else if (SAVE_TOOL_NAMES.has(toolName)) {
    _hookState.consecutiveWebCalls = 0;
  }

  const hints: string[] = [];

  // Auto-save reminder after 2+ consecutive web calls
  if (_hookState.consecutiveWebCalls >= 2) {
    hints.push("_hint: You've made " + _hookState.consecutiveWebCalls + " web calls without saving. Consider calling save_session_note to persist findings before context compaction.");
  }

  // Attention refresh reminder every 30 calls
  if (_hookState.totalCalls - _hookState.lastRefreshReminder >= REFRESH_INTERVAL) {
    hints.push("_hint: " + _hookState.totalCalls + " tool calls this session. Consider calling refresh_task_context to reload your bearings and prevent attention drift.");
    _hookState.lastRefreshReminder = _hookState.totalCalls;
  }

  return hints.length > 0 ? hints.join(" | ") : null;
}

// MCP Prompts — protocol-native agent instructions for onboarding
const PROMPTS = [
  {
    name: "onboarding",
    description:
      "Get started with NodeBench Development Methodology MCP. Shows first-time setup steps and key tools.",
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `You are connected to NodeBench MCP — tools that make you catch the bugs you'd normally ship.

WHAT THIS DOES:
In benchmarks across 9 real production prompts, agents with NodeBench MCP caught 13 issues (4 HIGH severity)
that bare agents shipped to production. 26 blind spots prevented. Knowledge compounds — by task 9,
the agent finds 2+ prior findings before writing a single line of code.

HOW IT WORKS:
Every task follows a pipeline: Research → Risk → Implement → Test (3 layers) → Eval → Gate → Learn → Ship.
Each step produces a concrete artifact (an issue found, a regression guarded, a pattern banked) that
compounds into future tasks.

FIRST TIME? Run these 3 steps:
1. Call bootstrap_project to register your project (tech stack, architecture, conventions)
2. Call getMethodology("overview") to see all available methodologies
3. Call search_all_knowledge("your current task") before starting any work

RETURNING? Your project context and all past learnings are persisted. Start with:
1. Call search_all_knowledge with your current task
2. Follow the methodology tools as you work — they'll guide you step by step

KEY TOOLS:
- search_all_knowledge — Search prior findings before starting (avoid repeating past mistakes)
- run_mandatory_flywheel — 6-step minimum verification before declaring work done
- getMethodology — Step-by-step guides for verification, eval, flywheel, recon
- findTools — Discover tools by keyword or category
- assess_risk — Assess risk before acting (HIGH = needs confirmation)

PARALLEL AGENTS? If using Claude Code subagents or multiple terminals:
- claim_agent_task / release_agent_task — Lock tasks to prevent duplicate work
- get_parallel_status — See what all agents are doing
- Use the "claude-code-parallel" prompt for step-by-step guidance`,
        },
      },
    ],
  },
  {
    name: "project-setup",
    description:
      "Guided project bootstrapping. Walks you through registering project context so the MCP has full project awareness.",
    arguments: [
      {
        name: "projectName",
        description: "Name of the project to set up",
        required: true,
      },
    ],
    messages: (args: Record<string, string>) => [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Help me set up NodeBench methodology tracking for project: ${args.projectName}

Please gather and record the following using the bootstrap_project tool:
1. Tech stack (languages, frameworks, runtimes)
2. Key dependency versions
3. Architecture overview
4. Build/test commands
5. Known conventions or patterns
6. Repository structure highlights

After bootstrapping, run a reconnaissance session with run_recon to check for latest updates on the project's key frameworks and SDKs.`,
        },
      },
    ],
  },
  {
    name: "ui-qa-checklist",
    description:
      "UI/UX QA checklist for frontend implementations. Run after any change that touches React components, layouts, or interactions. Guides the agent through component tests, accessibility, responsive checks, and E2E validation.",
    arguments: [
      {
        name: "componentName",
        description:
          "The component or feature that changed (e.g. 'AgentStatusCard', 'Settings page dark mode')",
        required: true,
      },
    ],
    messages: (args: Record<string, string>) => [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `You just implemented UI changes to: ${args.componentName}

Before declaring this work done, run the UI/UX QA checklist:

1. COMPONENT TESTS: Run \`npm run test:run\` — all component tests must pass
2. STORYBOOK: Run \`npm run storybook\` — verify the component renders in isolation
3. RESPONSIVE: Check at 375px, 768px, 1280px — layout must not break
4. ACCESSIBILITY: Tab through the UI, check aria-labels, run Storybook a11y panel
5. STATES: Verify loading, error, and empty states are handled
6. CONSOLE: Check browser devtools for errors/warnings
7. CAPTURE: Call capture_responsive_suite(url, label) to screenshot at 3 breakpoints
8. E2E: Run \`npm run test:e2e\` if relevant tests exist
9. LIGHTHOUSE: Run \`npm run perf:lighthouse\` for performance + accessibility scores

After checking each item, record results:
  call get_gate_preset("ui_ux_qa") to see the 8 evaluation rules
  evaluate each rule against ${args.componentName}
  call run_quality_gate(gateName: "ui_ux_qa", rules: [{name, passed}, ...]) with your boolean results
  call record_learning for any UI gotchas discovered

For the full step-by-step methodology, call getMethodology("ui_ux_qa").

Commands available:
  npm run test:run        — Vitest component tests
  npm run test:e2e        — Playwright E2E tests
  npm run storybook       — Storybook dev server (port 6006)
  npm run perf:lighthouse — Lighthouse audit
  npm run perf:bundle     — Bundle size analysis`,
        },
      },
    ],
  },
  {
    name: "parallel-agent-team",
    description:
      "Set up and coordinate a parallel agent team. Based on Anthropic's 'Building a C Compiler with Parallel Claudes' (Feb 2026). Guides multi-agent orchestration with task locking, role assignment, and progress tracking.",
    arguments: [
      {
        name: "projectGoal",
        description:
          "The overall project goal the team is working toward (e.g. 'Build REST API', 'Migrate auth system')",
        required: true,
      },
      {
        name: "agentCount",
        description:
          "Number of parallel agents (default: 4)",
        required: false,
      },
    ],
    messages: (args: Record<string, string>) => {
      const agentCount = parseInt(args.agentCount || "4", 10);
      return [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `You are coordinating a parallel agent team for: ${args.projectGoal}

This follows the pattern from Anthropic's "Building a C Compiler with Parallel Claudes" (Feb 2026).
Reference: https://www.anthropic.com/engineering/building-c-compiler

SETUP (run these in order):

1. ORIENT — Check what's already happening:
   call get_parallel_status({ includeHistory: true })
   call list_agent_tasks({ status: "all" })

2. PLAN ROLES — Assign ${agentCount} specialized agents:
   Recommended role split for ${agentCount} agents:
   ${agentCount >= 4 ? `- Agent 1: assign_agent_role({ role: "implementer", focusArea: "core features" })
   - Agent 2: assign_agent_role({ role: "test_writer", focusArea: "test coverage" })
   - Agent 3: assign_agent_role({ role: "code_quality_critic", focusArea: "refactoring" })
   - Agent 4: assign_agent_role({ role: "documentation_maintainer", focusArea: "docs and progress" })` :
   `- Agent 1: assign_agent_role({ role: "implementer" })
   - Agent 2: assign_agent_role({ role: "test_writer" })`}

3. BREAK DOWN WORK — Create task claims:
   For each independent piece of work:
   call claim_agent_task({ taskKey: "descriptive_snake_case", description: "What to do" })

4. WORK LOOP (each agent independently):
   a. claim_agent_task — Lock your task
   b. Do the work (implement, test, review)
   c. log_context_budget — Track context usage, avoid pollution
   d. run_oracle_comparison — Validate output against known-good reference
   e. release_agent_task — Release with progress note
   f. Pick next task (repeat)

5. ANTI-PATTERNS TO AVOID:
   - Two agents working on the same task (always claim first)
   - Dumping thousands of lines of test output (log to file, print summary)
   - Spending hours on one stuck problem (mark as blocked, move on)
   - Overwriting each other's changes (commit frequently, pull before push)

KEY INSIGHT from Anthropic: When all agents get stuck on the same bug (like compiling the Linux kernel),
use oracle-based testing to split the problem into independent sub-problems that each agent can solve in parallel.

For the full methodology: call getMethodology("parallel_agent_teams")`,
          },
        },
      ];
    },
  },
  {
    name: "oracle-test-harness",
    description:
      "Set up oracle-based testing for a component. Compares your implementation's output against a known-good reference to identify exactly which parts are broken. Enables parallel debugging by splitting failures into independent work items.",
    arguments: [
      {
        name: "componentName",
        description:
          "The component to validate (e.g. 'API response formatter', 'auth middleware', 'data pipeline')",
        required: true,
      },
      {
        name: "oracleSource",
        description:
          "Where the known-good reference comes from (e.g. 'production_v2', 'reference_impl', 'golden_files')",
        required: true,
      },
    ],
    messages: (args: Record<string, string>) => [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Set up oracle-based testing for: ${args.componentName}
Oracle source: ${args.oracleSource}

This follows the pattern from Anthropic's C Compiler project where GCC served as a
"known-good compiler oracle" to identify which specific files were broken.

SETUP:

1. DEFINE ORACLE — Capture known-good reference outputs:
   Run the reference implementation (${args.oracleSource}) on each test input.
   Save outputs as golden files or capture them in the oracle comparison tool.

2. RUN COMPARISONS — For each test case:
   call run_oracle_comparison({
     testLabel: "${args.componentName}_test_1",
     actualOutput: "<your implementation's output>",
     expectedOutput: "<oracle's output>",
     oracleSource: "${args.oracleSource}"
   })

3. TRIAGE FAILURES — Review diff summaries:
   Each failing comparison is an independent work item.
   Assign each to a different parallel agent via claim_agent_task.

4. BINARY SEARCH (for complex failures):
   If a test passes individually but fails when combined with others,
   use delta debugging: split the test set in half, test each half,
   narrow down to the minimal failing combination.
   (This is how Anthropic found pairs of files that failed together but worked independently.)

5. TRACK PROGRESS — Monitor convergence:
   call get_parallel_status to see how many oracle tests are still failing.
   As agents fix failures, the match percentage should trend toward 100%.

CONTEXT BUDGET TIP: Large test outputs pollute context. Instead of printing full output,
call log_context_budget to track usage and only show diff summaries (first 20 differing lines).

After all oracle tests pass:
  call record_learning with patterns discovered
  call run_mandatory_flywheel to verify the full change`,
        },
      },
    ],
  },
  {
    name: "claude-code-parallel",
    description:
      "Guide for using NodeBench MCP with Claude Code's native Task tool to run parallel subagents. Each subagent gets its own context window and can coordinate via shared NodeBench MCP tools (claim_agent_task, assign_agent_role, run_oracle_comparison). Use this when you want multiple Claude Code subagents working on independent tasks without duplicate effort.",
    arguments: [
      {
        name: "taskDescription",
        description:
          "The overall task to split across parallel subagents (e.g. 'Fix auth, add tests, update docs')",
        required: true,
      },
      {
        name: "subagentCount",
        description:
          "Number of parallel subagents to coordinate (default: 3)",
        required: false,
      },
    ],
    messages: (args: Record<string, string>) => {
      const count = parseInt(args.subagentCount || "3", 10);
      return [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `You are coordinating ${count} parallel Claude Code subagents for: ${args.taskDescription}

## How This Works

Claude Code's Task tool spawns subagents — each is an independent Claude instance with its own
context window. NodeBench MCP tools coordinate them via a shared SQLite database.

**Your role: COORDINATOR.** You break work into independent tasks and spawn subagents.
**Subagent role: WORKER.** Each claims a task, does work, releases with a progress note.

## Step-by-Step

### 1. PLAN — Break work into ${count} independent tasks
Identify ${count} pieces of work that can run in parallel without dependencies.
Each task should be independently completable and testable.

### 2. SPAWN — Launch subagents with coordination instructions
For each task, use the Task tool:

\`\`\`
Task tool call:
  prompt: "You have access to NodeBench MCP. Do the following:
    1. Call claim_agent_task({ taskKey: '<task_key>', description: '<what to do>' })
    2. Call assign_agent_role({ role: 'implementer', focusArea: '<area>' })
    3. Do the work
    4. Call log_context_budget({ eventType: 'checkpoint', tokensUsed: <estimate> })
    5. Call release_agent_task({ taskKey: '<task_key>', status: 'completed', progressNote: '<summary>' })
    6. Call record_learning({ key: '<key>', content: '<what you learned>', category: 'pattern' })"
\`\`\`

### 3. MONITOR — Check progress
After spawning all subagents:
  call get_parallel_status({ includeHistory: true })
  call list_agent_tasks({ status: "all" })

### 4. VALIDATE — Run oracle comparisons if applicable
If subagents produced outputs that should match a reference:
  call run_oracle_comparison for each output

### 5. GATE — Quality check the aggregate result
  call run_quality_gate with rules covering all ${count} tasks
  call run_mandatory_flywheel to verify the combined change

## Concrete IMPACT of This Workflow

| What NodeBench Adds             | Without It (bare subagents)           |
|---------------------------------|---------------------------------------|
| Task locks prevent duplicate work | Two subagents might fix the same bug |
| Role specialization             | All subagents do everything           |
| Context budget tracking         | Subagent runs out of context silently |
| Oracle comparisons              | No reference-based validation         |
| Progress notes for handoff      | Next session starts from scratch      |
| Learnings persisted             | Knowledge lost when subagent exits    |
| Quality gate on aggregate       | No validation that pieces fit together |

## Anti-Patterns
- DO NOT spawn subagents for work that has dependencies (sequential steps)
- DO NOT skip claim_agent_task — without it, two subagents may duplicate effort
- DO NOT dump large outputs into subagent context — use log_context_budget to track
- DO NOT forget release_agent_task — orphaned claims block future sessions

For the full parallel agent methodology: call getMethodology("parallel_agent_teams")`,
          },
        },
      ];
    },
  },
  {
    name: "bootstrap-parallel-agents",
    description:
      "Detect and scaffold parallel agent infrastructure for any project. Scans a target repo for 7 categories of parallel agent capabilities (task locking, roles, oracle testing, context budget, progress files, AGENTS.md, worktrees) and bootstraps what's missing. Uses the AI Flywheel closed loop: detect → scaffold → verify → fix → document.",
    arguments: [
      {
        name: "projectPath",
        description:
          "Absolute path to the target project root (e.g. '/home/user/their-project')",
        required: true,
      },
      {
        name: "techStack",
        description:
          "Target project's tech stack (e.g. 'TypeScript/React', 'Python/Django', 'Rust')",
        required: false,
      },
    ],
    messages: (args: Record<string, string>) => [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Bootstrap parallel agent infrastructure for: ${args.projectPath}
${args.techStack ? `Tech stack: ${args.techStack}` : ""}

This follows the AI Flywheel closed loop: detect → scaffold → verify → fix → document.

STEP 1 — DETECT (dry run first):
  call bootstrap_parallel_agents({
    projectRoot: "${args.projectPath}",
    dryRun: true,
    ${args.techStack ? `techStack: "${args.techStack}",` : ""}
    includeAgentsMd: true
  })

  Review the gap report. It scans 7 categories:
  - Task coordination (lock files, claim directories)
  - Role specialization (role configs, AGENTS.md mentions)
  - Oracle testing (golden files, reference outputs, snapshots)
  - Context budget tracking (budget configs, AGENTS.md mentions)
  - Progress files (PROGRESS.md, STATUS.md, claude-progress.txt)
  - AGENTS.md parallel section (parallel agent coordination protocol)
  - Git worktrees (for true parallel work)

STEP 2 — SCAFFOLD (create files):
  If gaps found, run with dryRun=false:
  call bootstrap_parallel_agents({
    projectRoot: "${args.projectPath}",
    dryRun: false,
    ${args.techStack ? `techStack: "${args.techStack}",` : ""}
    includeAgentsMd: true
  })

  This creates:
  - .parallel-agents/ directory with README, current_tasks/, oracle/, roles.json
  - progress.md template for agent orientation
  - AGENTS.md parallel section (or .parallel-append file for existing AGENTS.md)

STEP 3 — GENERATE AGENTS.MD (if needed):
  call generate_parallel_agents_md({
    ${args.techStack ? `techStack: "${args.techStack}",` : ""}
    projectName: "${args.projectPath.split("/").pop() || "project"}",
    maxAgents: 4,
    includeNodebenchSetup: true
  })

  Copy the output into the target repo's AGENTS.md.

STEP 4 — VERIFY (6-step flywheel):
  The bootstrap tool returns a flywheelPlan. Execute each step:
  1. Static analysis — verify scaffold files don't conflict
  2. Happy path — claim task → work → release → progress.md updated
  3. Conflict test — two claims on same task → second gets conflict
  4. Oracle test — create golden file → diff catches changes
  5. Gap re-scan — re-run bootstrap with dryRun=true → all gaps filled
  6. Document — record_learning with patterns discovered

STEP 5 — FIX (if anything fails):
  Fix the issue, then re-run from Step 4.

STEP 6 — DOCUMENT:
  call record_learning({
    key: "bootstrap_parallel_${args.projectPath.split("/").pop() || "project"}",
    content: "Bootstrapped parallel agent infrastructure for ${args.projectPath}. <summary of what was created and any issues found>",
    category: "pattern",
    tags: ["parallel-agents", "bootstrap", "external-repo"]
  })

For the full methodology: call getMethodology("parallel_agent_teams")`,
        },
      },
    ],
  },
  {
    name: "agent-contract",
    description:
      "The NodeBench Agent Contract — mandatory behavioral rules for any agent using NodeBench MCP. Embeds the 'front-door' pattern (4 meta-tools first), self-setup escalation, and the coordinator/subagent spawn template. Use this prompt to instruct an agent (or subagent) on HOW to use NodeBench tools correctly.",
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `## NodeBench MCP Agent Contract

You are connected to NodeBench MCP. Follow these rules EXACTLY.

### FRONT DOOR — Always start here (before writing any code)
1. search_all_knowledge("<your current task>") — Check if this was solved before
2. getMethodology("mandatory_flywheel") — Load the verification pipeline
3. discover_tools("<your task>", { explain: true }) — Find the right tools for this job
4. get_workflow_chain("<workflow>") — Get step-by-step sequence (fix_bug, new_feature, etc.)

### SELF-SETUP — If a capability is missing
When discover_tools returns nothing useful, or a tool says "not configured":
1. Escalate toolset: If started with --preset lite, switch to --preset core or targeted --toolsets
2. Resolve providers: Configure missing API keys (GEMINI_API_KEY, OPENAI_API_KEY, etc.)
3. Bootstrap infra: Run scaffold_nodebench_project or bootstrap_parallel_agents if repo lacks infra
4. Smoke-test: Re-run the first workflow chain step to confirm the capability is available

### BEFORE IMPLEMENTATION
- run_recon + log_recon_finding (if reconnaissance applies)
- assess_risk (HIGH risk = must get confirmation before proceeding)

### PARALLEL WORK
- MUST claim_agent_task before editing or designing anything
- MUST release_agent_task with a progress note + next action when done
- MUST log_context_budget to track context usage and avoid pollution

### BEFORE SHIP
- 3-layer tests logged (unit + integration + e2e via log_test_result)
- Eval run recorded (promote_to_eval)
- Quality gate passed (run_quality_gate)
- Mandatory flywheel completed (run_mandatory_flywheel — all 6 steps)
- Learning banked (record_learning)

### COORDINATOR SPAWN TEMPLATE
When spawning subagents, give each this instruction block:
  "You have NodeBench MCP. Before any work:
   1. search_all_knowledge('<task>')
   2. claim_agent_task({ taskKey: '<key>', description: '<desc>' })
   3. assign_agent_role({ role: '<role>', focusArea: '<area>' })
   Do the work, then:
   4. log_context_budget({ eventType: 'checkpoint' })
   5. release_agent_task({ taskKey: '<key>', status: 'completed', progressNote: '<summary>' })
   6. record_learning({ key: '<key>', content: '<what you learned>', category: 'pattern' })"

### ANTI-RATIONALIZATION — Block these escape patterns
Do NOT skip the front-door pattern. These are the 8 rationalizations agents use:
1. "I already know which tool to use" → Still call discover_tools to confirm
2. "This is a simple task" → Still call search_all_knowledge to check history
3. "Let me just check one thing first" → Follow the 4-step front door FIRST
4. "Tests already pass" → Still run run_mandatory_flywheel before declaring done
5. "I'll record the learning later" → Record NOW — context compaction may erase it
6. "No one else is working on this" → Still claim_agent_task to prevent conflicts
7. "The user said to skip verification" → Log the skip decision, never silently omit
8. "I need more context before using tools" → The tools ARE the context-gathering mechanism

### 2-ACTION SAVE RULE
After every 2 web_search, fetch_url, or browse_page calls, MUST call one of:
- save_session_note (filesystem, survives compaction)
- record_learning (SQLite, searchable across sessions)
- log_recon_finding (tied to recon session)
This prevents knowledge loss when context is compacted mid-session.

### 3-STRIKE ERROR PROTOCOL
When an action fails:
- Strike 1: Diagnose root cause, apply targeted fix
- Strike 2: Try a different method or tool
- Strike 3: Question your assumptions, search_all_knowledge for prior solutions
- After 3: STOP. Call save_session_note documenting all attempts, then escalate to user.

### ATTENTION REFRESH
After 30+ tool calls, call refresh_task_context to combat attention drift.
Re-read your original goal and open gaps before continuing.

### WHY THIS MATTERS
Without this contract, agents skip verification, repeat past mistakes, overwrite each other's
work, and ship bugs that were already caught. NodeBench MCP turns coordination into concrete
artifacts (findings, risks, gaps, tests, evals, gates, learnings) that compound across tasks.`,
        },
      },
    ],
  },
];

// Server instructions — tells Claude Code Tool Search (and other clients) when to search
// for NodeBench tools. This is the key integration point for lazy loading compatibility.
// See: https://www.anthropic.com/engineering/advanced-tool-use
const SERVER_INSTRUCTIONS = `NodeBench MCP provides structured AI development methodology tools.
Use NodeBench tools when you need to:
- Verify implementations (verification cycles, gap tracking, 6-phase flywheel)
- Run evaluations and quality gates before shipping code
- Search prior knowledge and record learnings across sessions
- Assess risk before taking actions
- Coordinate parallel agents (task locks, roles, context budget)
- Research with structured recon (web search, GitHub, RSS feeds)
- Analyze files (CSV, PDF, XLSX, images, audio, ZIP)
- Run security audits (dependency scanning, code analysis, secrets detection)
- Write and polish academic papers
- Audit SEO, analyze Figma flows, detect Android flicker
- Call LLMs (GPT, Claude, Gemini) for analysis and extraction
Start with discover_tools("<your task>") to find the right tool.`;

const server = new Server(
  { name: "nodebench-mcp-methodology", version: "2.19.1" },
  {
    capabilities: { tools: { listChanged: true }, prompts: {} },
    instructions: SERVER_INSTRUCTIONS,
  } as any, // SDK v1 may not type `instructions` but MCP spec supports it
);

// ── A/B Test Session Tracking ─────────────────────────────────────────
// Record session start for A/B comparison (static vs dynamic loading)
try {
  const db = getDb();
  db.prepare(
    "INSERT INTO ab_test_sessions (id, mode, initial_preset, initial_tool_count, created_at) VALUES (?, ?, ?, ?, datetime('now'))"
  ).run(SESSION_ID, useDynamicLoading ? 'dynamic' : 'static', currentPreset, allTools.length);
} catch { /* instrumentation must not block server start */ }

// Handle tools/list — return all tools with their JSON Schema inputSchemas
// Includes MCP 2025-11-25 spec annotations: category, phase, complexity (model tier hint)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map((t) => {
      const entry = TOOL_REGISTRY.get(t.name);
      return {
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        ...(entry ? {
          annotations: {
            title: t.name.replace(/_/g, " "),
            category: entry.category,
            phase: entry.phase,
            complexity: getToolComplexity(t.name),
          },
        } : {}),
      };
    }),
  };
});

// Handle tools/call — dispatch to the matching tool handler (auto-instrumented)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  _abToolCallCount++;
  if (name === "load_toolset" || name === "unload_toolset") _abLoadEventCount++;

  const tool = toolMap.get(name);
  if (!tool) {
    return {
      content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  const startMs = Date.now();
  let resultStatus = "success";
  let errorMsg: string | null = null;

  try {
    const result = await tool.handler(args ?? {});

    // Detect soft errors (tools that return { error: true } without throwing)
    if (result && typeof result === "object" && !Array.isArray(result) && (result as any).error) {
      resultStatus = "error";
      errorMsg = (result as any).message ?? "soft error";
    }

    // Auto-log to main DB (skip self-eval tools to avoid recursion/noise)
    if (!SKIP_AUTO_LOG.has(name)) {
      try {
        const db = getDb();
        db.prepare(
          "INSERT INTO tool_call_log (id, session_id, tool_name, result_status, duration_ms, error, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
        ).run(genId("tcl"), SESSION_ID, name, resultStatus, Date.now() - startMs, errorMsg);
      } catch { /* never let instrumentation break tool dispatch */ }
    }

    // Auto-log to analytics tracker
    tracker.record(name, startMs, resultStatus === "success", errorMsg, args as Record<string, unknown>);

    // Inline A/B session counter update (every 5 calls — amortized cost)
    if (_abToolCallCount % 5 === 0) {
      try {
        const db2 = getDb();
        const dynamicallyLoaded = [...activeToolsets].filter(ts => !initialToolsetNames.has(ts));
        db2.prepare(
          "UPDATE ab_test_sessions SET total_tool_calls = ?, total_load_events = ?, final_tool_count = ?, toolsets_loaded = ? WHERE id = ?"
        ).run(_abToolCallCount, _abLoadEventCount, allTools.length, JSON.stringify(dynamicallyLoaded), SESSION_ID);
      } catch { /* instrumentation */ }
    }

    // Tools with rawContent return ContentBlock[] directly (e.g. image captures)
    if (tool.rawContent && Array.isArray(result)) {
      return { content: result, isError: false };
    }

    // Auto-append quickRef from registry (progressive disclosure)
    let enrichedResult = result;
    if (result && typeof result === "object" && !Array.isArray(result)) {
      const quickRef = getQuickRef(name);
      if (quickRef && !(result as any)._quickRef) {
        enrichedResult = { ...(result as Record<string, unknown>), _quickRef: quickRef };
      }
    }

    // Lightweight hook: append save/refresh hints when thresholds are met
    const hookHint = getHookHint(name);

    // Serialize: TOON (~40% fewer tokens) or JSON
    let serialized: string;
    if (useToon) {
      try {
        serialized = toonEncode(enrichedResult);
      } catch {
        serialized = JSON.stringify(enrichedResult, null, 2);
      }
    } else {
      serialized = JSON.stringify(enrichedResult, null, 2);
    }

    const contentBlocks: Array<{ type: "text"; text: string }> = [
      { type: "text" as const, text: serialized },
    ];
    if (hookHint) {
      contentBlocks.push({ type: "text" as const, text: hookHint });
    }

    return {
      content: contentBlocks,
      isError: false,
    };
  } catch (err: any) {
    resultStatus = "error";
    errorMsg = err?.message || "Internal error";

    // Auto-log errors to main DB
    if (!SKIP_AUTO_LOG.has(name)) {
      try {
        const db = getDb();
        db.prepare(
          "INSERT INTO tool_call_log (id, session_id, tool_name, result_status, duration_ms, error, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
        ).run(genId("tcl"), SESSION_ID, name, resultStatus, Date.now() - startMs, errorMsg);
      } catch { /* never let instrumentation break tool dispatch */ }
    }

    // Auto-log error to analytics tracker
    tracker.record(name, startMs, false, errorMsg, args as Record<string, unknown>);

    return {
      content: [{ type: "text" as const, text: errorMsg }],
      isError: true,
    };
  }
});

// Handle prompts/list — return available prompts for agent discovery
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: PROMPTS.map((p) => ({
      name: p.name,
      description: p.description,
      ...(("arguments" in p && p.arguments) ? { arguments: p.arguments } : {}),
    })),
  };
});

// Handle prompts/get — return prompt messages
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const prompt = PROMPTS.find((p) => p.name === name);
  if (!prompt) {
    throw new Error(
      `Unknown prompt: ${name}. Available: ${PROMPTS.map((p) => p.name).join(", ")}`
    );
  }

  const messages =
    typeof prompt.messages === "function"
      ? prompt.messages(args ?? {})
      : prompt.messages;

  return {
    description: prompt.description,
    messages,
  };
});

// Graceful shutdown: close analytics tracker + finalize A/B session on exit
process.on('exit', () => {
  tracker.close();

  // Finalize A/B test session with aggregate metrics
  try {
    const db = getDb();
    const dynamicallyLoaded = [...activeToolsets].filter(ts => !initialToolsetNames.has(ts));
    db.prepare(
      `UPDATE ab_test_sessions SET
        final_tool_count = ?,
        toolsets_loaded = ?,
        total_tool_calls = ?,
        total_load_events = ?,
        session_duration_ms = ?,
        ended_at = datetime('now')
      WHERE id = ?`
    ).run(
      allTools.length,
      JSON.stringify(dynamicallyLoaded),
      _abToolCallCount,
      _abLoadEventCount,
      Date.now() - _abStartMs,
      SESSION_ID,
    );
  } catch { /* instrumentation must not block shutdown */ }
});

// Connect via stdio
const transport = new StdioServerTransport();
await server.connect(transport);

const toolsetInfo = cliArgs.includes("--toolsets") || cliArgs.includes("--exclude") || cliArgs.includes("--preset")
  ? ` [gated: ${domainTools.length} domain + 2 meta]`
  : "";
console.error(`nodebench-mcp ready (${allTools.length} tools, ${PROMPTS.length} prompts${toolsetInfo}, SQLite at ~/.nodebench/)`);
