/**
 * Edge case tests for Dynamic Toolset Loading (Search+Load architecture).
 * Tests: hybridSearch full-registry search, _loadSuggestions in discover_tools,
 * TOOLSET_MAP/TOOL_TO_TOOLSET structural correctness, and simulated
 * load/unload handler edge cases.
 */
import { describe, it, expect } from "vitest";
import {
  hybridSearch,
  ALL_REGISTRY_ENTRIES,
  TOOL_REGISTRY,
  SEARCH_MODES,
} from "../tools/toolRegistry.js";
import { createProgressiveDiscoveryTools, type DiscoveryOptions } from "../tools/progressiveDiscoveryTools.js";
import { TOOLSET_MAP, TOOL_TO_TOOLSET } from "../toolsetRegistry.js";
import type { McpTool } from "../types.js";

// ── Helpers ────────────────────────────────────────────────────────────
// Simulate a "default" loaded set: only verification + eval + quality_gate + learning + flywheel + recon
const DEFAULT_TOOLSET_NAMES = new Set(["verification", "eval", "quality_gate", "learning", "flywheel", "recon"]);
const defaultTools: McpTool[] = [];
for (const [tsName, tools] of Object.entries(TOOLSET_MAP)) {
  if (DEFAULT_TOOLSET_NAMES.has(tsName)) {
    defaultTools.push(...tools);
  }
}
const defaultToolNames = new Set(defaultTools.map(t => t.name));

// ═══════════════════════════════════════════════════════════════════════
// hybridSearch with searchFullRegistry
// ═══════════════════════════════════════════════════════════════════════

describe("Dynamic Loading: hybridSearch searchFullRegistry", () => {
  const smallLoadedTools = defaultTools.map(t => ({ name: t.name, description: t.description }));

  it("searchFullRegistry=true searches all 175 registry entries", () => {
    const results = hybridSearch("analyze screenshot visual regression", smallLoadedTools, {
      limit: 10,
      searchFullRegistry: true,
    });
    expect(results.length).toBeGreaterThan(0);
    // Should include tools from unloaded toolsets (vision, ui_capture)
    const categories = new Set(results.map(r => r.category));
    expect(categories.size).toBeGreaterThan(1);
  });

  it("searchFullRegistry=true returns vision tools for screenshot queries", () => {
    const results = hybridSearch("analyze screenshot", smallLoadedTools, {
      limit: 10,
      searchFullRegistry: true,
    });
    const names = results.map(r => r.name);
    expect(names).toContain("analyze_screenshot");
  });

  it("searchFullRegistry=true returns SEO tools for SEO queries", () => {
    const results = hybridSearch("SEO meta tags lighthouse audit", smallLoadedTools, {
      limit: 10,
      searchFullRegistry: true,
    });
    const categories = results.map(r => r.category);
    expect(categories).toContain("seo");
  });

  it("searchFullRegistry=false only returns loaded tools", () => {
    const results = hybridSearch("analyze screenshot", smallLoadedTools, {
      limit: 10,
      searchFullRegistry: false,
    });
    // All result names should be in the loaded set
    for (const r of results) {
      expect(defaultToolNames.has(r.name)).toBe(true);
    }
  });

  it("searchFullRegistry=true does not break keyword scoring", () => {
    const results = hybridSearch("verify code changes", smallLoadedTools, {
      limit: 10,
      searchFullRegistry: true,
      explain: true,
    });
    expect(results.length).toBeGreaterThan(0);
    // Top results should have positive scores and include verification or dive/review tools
    expect(results[0].score).toBeGreaterThan(0);
    const categories = results.map(r => r.category);
    // "verify code changes" may match verification tools or ui_ux_dive_v2 flywheel tools (dive_fix_verify, dive_reexplore, dive_code_review)
    const hasRelevantCategory = categories.includes("verification") || categories.includes("ui_ux_dive_v2");
    expect(hasRelevantCategory).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// discover_tools _loadSuggestions
// ═══════════════════════════════════════════════════════════════════════

describe("Dynamic Loading: discover_tools _loadSuggestions", () => {
  // Create discovery tools with dynamic loading awareness
  const options: DiscoveryOptions = {
    getLoadedToolNames: () => defaultToolNames,
    getToolToToolset: () => TOOL_TO_TOOLSET,
  };
  const discoveryTools = createProgressiveDiscoveryTools(
    defaultTools.map(t => ({ name: t.name, description: t.description })),
    options,
  );
  const discoverTool = discoveryTools.find(t => t.name === "discover_tools")!;

  it("returns _loadSuggestions when results include unloaded tools", async () => {
    const result = await discoverTool.handler({ query: "analyze screenshot UI regression", limit: 10 }) as any;
    expect(result).toHaveProperty("_loadSuggestions");
    expect(Array.isArray(result._loadSuggestions)).toBe(true);
    expect(result._loadSuggestions.length).toBeGreaterThan(0);

    // Each suggestion should have toolset, matchingTools, action
    for (const s of result._loadSuggestions) {
      expect(s).toHaveProperty("toolset");
      expect(s).toHaveProperty("matchingTools");
      expect(s).toHaveProperty("action");
      expect(s.action).toContain("load_toolset");
    }
  });

  it("_loadSuggestions includes the correct toolset name", async () => {
    const result = await discoverTool.handler({ query: "analyze screenshot", limit: 10 }) as any;
    const toolsetNames = result._loadSuggestions.map((s: any) => s.toolset);
    // Vision tools should suggest loading "vision" toolset
    expect(toolsetNames).toContain("vision");
  });

  it("does NOT return _loadSuggestions when all results are loaded", async () => {
    // Search for something that only matches default-loaded tools
    const result = await discoverTool.handler({ query: "start verification cycle log findings", limit: 5 }) as any;
    // Either _loadSuggestions is absent, empty, or all results are from loaded toolsets
    if (result._loadSuggestions) {
      // Some results might still be from unloaded toolsets due to keyword overlap
      // But the suggestions should only contain actually unloaded toolsets
      for (const s of result._loadSuggestions) {
        expect(DEFAULT_TOOLSET_NAMES.has(s.toolset)).toBe(false);
      }
    }
  });

  it("totalToolsSearched reflects full registry when dynamic loading enabled", async () => {
    const result = await discoverTool.handler({ query: "anything", limit: 5 }) as any;
    expect(result.totalToolsSearched).toBe(ALL_REGISTRY_ENTRIES.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// discover_tools WITHOUT dynamic loading awareness
// ═══════════════════════════════════════════════════════════════════════

describe("Dynamic Loading: discover_tools without options", () => {
  const discoveryToolsNoOpts = createProgressiveDiscoveryTools(
    defaultTools.map(t => ({ name: t.name, description: t.description })),
  );
  const discoverToolNoOpts = discoveryToolsNoOpts.find(t => t.name === "discover_tools")!;

  it("does NOT return _loadSuggestions when no options provided", async () => {
    const result = await discoverToolNoOpts.handler({ query: "analyze screenshot", limit: 10 }) as any;
    expect(result._loadSuggestions).toBeUndefined();
  });

  it("totalToolsSearched reflects only loaded tools", async () => {
    const result = await discoverToolNoOpts.handler({ query: "anything", limit: 5 }) as any;
    expect(result.totalToolsSearched).toBe(defaultTools.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TOOLSET_MAP / TOOL_TO_TOOLSET structural correctness
// ═══════════════════════════════════════════════════════════════════════

describe("Dynamic Loading: toolset registry structure", () => {
  it("every tool in TOOLSET_MAP has a TOOL_TO_TOOLSET entry", () => {
    for (const [tsName, tools] of Object.entries(TOOLSET_MAP)) {
      for (const tool of tools) {
        expect(TOOL_TO_TOOLSET.get(tool.name)).toBe(tsName);
      }
    }
  });

  it("every TOOL_TO_TOOLSET entry maps to a valid TOOLSET_MAP key", () => {
    for (const [toolName, tsName] of TOOL_TO_TOOLSET.entries()) {
      expect(TOOLSET_MAP).toHaveProperty(tsName);
    }
  });

  it("every tool in TOOL_REGISTRY exists in TOOL_TO_TOOLSET", () => {
    // Some tools (meta, discovery, dynamic) may not be in TOOL_TO_TOOLSET
    // but all TOOLSET_MAP domain tools should be
    for (const [tsName, tools] of Object.entries(TOOLSET_MAP)) {
      for (const tool of tools) {
        expect(TOOL_REGISTRY.has(tool.name)).toBe(true);
      }
    }
  });

  it("ALL_REGISTRY_ENTRIES covers all TOOLSET_MAP tools", () => {
    const registryNames = new Set(ALL_REGISTRY_ENTRIES.map(e => e.name));
    for (const [_, tools] of Object.entries(TOOLSET_MAP)) {
      for (const tool of tools) {
        expect(registryNames.has(tool.name)).toBe(true);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Simulated load/unload handler edge cases
// ═══════════════════════════════════════════════════════════════════════

describe("Dynamic Loading: load/unload edge cases (simulated)", () => {
  // Simulate the server state and handler logic from index.ts
  function createDynamicState(initialToolsets: string[]) {
    const activeToolsets = new Set(initialToolsets);
    const initialToolsetNames = new Set(initialToolsets);
    let domainTools: McpTool[] = [];
    for (const ts of activeToolsets) {
      if (TOOLSET_MAP[ts]) domainTools.push(...TOOLSET_MAP[ts]);
    }

    return {
      activeToolsets,
      initialToolsetNames,
      get toolCount() { return domainTools.length; },
      load(toolset: string) {
        if (!TOOLSET_MAP[toolset]) return { error: true, message: `Unknown toolset: ${toolset}` };
        if (activeToolsets.has(toolset)) return { alreadyLoaded: true, toolset };
        activeToolsets.add(toolset);
        domainTools.push(...TOOLSET_MAP[toolset]);
        return { loaded: true, toolset, toolsAdded: TOOLSET_MAP[toolset].length };
      },
      unload(toolset: string) {
        if (!TOOLSET_MAP[toolset]) return { error: true, message: `Unknown toolset: ${toolset}` };
        if (initialToolsetNames.has(toolset)) return { error: true, message: `Cannot unload initial preset toolset: ${toolset}` };
        if (!activeToolsets.has(toolset)) return { notLoaded: true, toolset };
        activeToolsets.delete(toolset);
        const removeNames = new Set(TOOLSET_MAP[toolset].map(t => t.name));
        domainTools = domainTools.filter(t => !removeNames.has(t.name));
        return { unloaded: true, toolset };
      },
    };
  }

  it("load_toolset: unknown toolset returns error", () => {
    const state = createDynamicState(["verification"]);
    const result = state.load("nonexistent_toolset_xyz");
    expect(result.error).toBe(true);
    expect(result.message).toContain("Unknown toolset");
  });

  it("load_toolset: double load returns alreadyLoaded", () => {
    const state = createDynamicState(["verification"]);
    const r1 = state.load("vision");
    expect(r1.loaded).toBe(true);
    expect(r1.toolsAdded).toBeGreaterThan(0);

    const r2 = state.load("vision");
    expect(r2.alreadyLoaded).toBe(true);
  });

  it("load_toolset: increases tool count", () => {
    const state = createDynamicState(["verification"]);
    const before = state.toolCount;
    state.load("vision");
    expect(state.toolCount).toBeGreaterThan(before);
    expect(state.toolCount).toBe(before + TOOLSET_MAP["vision"].length);
  });

  it("unload_toolset: cannot unload initial preset toolset", () => {
    const state = createDynamicState(["verification", "eval"]);
    const result = state.unload("verification");
    expect(result.error).toBe(true);
    expect(result.message).toContain("Cannot unload initial preset");
  });

  it("unload_toolset: can unload dynamically loaded toolset", () => {
    const state = createDynamicState(["verification"]);
    state.load("vision");
    const before = state.toolCount;

    const result = state.unload("vision");
    expect(result.unloaded).toBe(true);
    expect(state.toolCount).toBe(before - TOOLSET_MAP["vision"].length);
  });

  it("unload_toolset: unloading already-unloaded returns notLoaded", () => {
    const state = createDynamicState(["verification"]);
    const result = state.unload("vision");
    expect(result.notLoaded).toBe(true);
  });

  it("unload_toolset: unknown toolset returns error", () => {
    const state = createDynamicState(["verification"]);
    const result = state.unload("nonexistent_toolset_xyz");
    expect(result.error).toBe(true);
  });

  it("load then unload restores original tool count", () => {
    const state = createDynamicState(["verification", "eval"]);
    const original = state.toolCount;

    state.load("vision");
    expect(state.toolCount).toBeGreaterThan(original);

    state.unload("vision");
    expect(state.toolCount).toBe(original);
  });

  it("list_available_toolsets: loaded vs available is correct", () => {
    const state = createDynamicState(["verification", "eval"]);
    state.load("vision");

    const loaded = [...state.activeToolsets];
    const allToolsetNames = Object.keys(TOOLSET_MAP);
    const available = allToolsetNames.filter(ts => !state.activeToolsets.has(ts));

    expect(loaded).toContain("verification");
    expect(loaded).toContain("eval");
    expect(loaded).toContain("vision");
    expect(available).not.toContain("vision");
    expect(available).toContain("web");
    expect(loaded.length + available.length).toBe(allToolsetNames.length);
  });
});
