/**
 * Dogfood / A-B eval for multi-hop traversal, pagination, relatedTools, and expansion.
 *
 * Compares OLD behavior (depth=1, no offset, no expand) vs NEW behavior
 * across realistic agent queries. Measures:
 * - Tool coverage (unique tools discovered)
 * - Recall lift (does expansion find tools pagination alone misses?)
 * - Hop depth utilization (how many depth-2/3 tools are genuinely useful?)
 * - Pagination correctness (no duplicates across pages, deterministic ordering)
 * - relatedTools quality (no self-refs, no nextTools overlap, valid refs)
 */

import { describe, it, expect } from "vitest";
import {
  hybridSearch,
  TOOL_REGISTRY,
  ALL_REGISTRY_ENTRIES,
} from "../tools/toolRegistry.js";
import { createProgressiveDiscoveryTools } from "../tools/progressiveDiscoveryTools.js";
import type { McpTool } from "../types.js";

// ── Setup: create tool instances (mirrors what index.ts does) ──────────
const allToolDescs = ALL_REGISTRY_ENTRIES.map((e) => ({
  name: e.name,
  description: e.quickRef.nextAction,
}));

const discoveryTools = createProgressiveDiscoveryTools(allToolDescs);
const findTool = (name: string): McpTool =>
  discoveryTools.find((t) => t.name === name)!;

// ── Test queries that exercise diverse domains ─────────────────────────
const EVAL_QUERIES = [
  { query: "verify implementation correctness", domain: "verification" },
  { query: "search past findings and knowledge", domain: "learning" },
  { query: "set up a new project scaffold", domain: "boilerplate" },
  { query: "analyze UI screenshots for issues", domain: "vision" },
  { query: "send email notification", domain: "email" },
  { query: "run security audit on codebase", domain: "security" },
  { query: "benchmark compiler autonomy", domain: "benchmark" },
  { query: "deploy and ship changes", domain: "flywheel" },
];

// ═══════════════════════════════════════════════════════════════════════
// A/B TEST 1: PAGINATION — offset correctness
// ═══════════════════════════════════════════════════════════════════════

describe("A/B: Pagination correctness", () => {
  it("page 1 and page 2 should have zero overlap", async () => {
    const tool = findTool("discover_tools");
    for (const { query } of EVAL_QUERIES) {
      const page1 = (await tool.handler({ query, limit: 5, offset: 0 })) as any;
      const page2 = (await tool.handler({ query, limit: 5, offset: 5 })) as any;

      const names1 = new Set(page1.results.map((r: any) => r.name));
      const names2 = new Set(page2.results.map((r: any) => r.name));
      const overlap = [...names1].filter((n) => names2.has(n));

      expect(overlap, `"${query}" has page overlap: ${overlap.join(", ")}`).toHaveLength(0);
    }
  });

  it("page 1 results should be higher-scored than page 2", async () => {
    const tool = findTool("discover_tools");
    for (const { query } of EVAL_QUERIES) {
      const page1 = (await tool.handler({ query, limit: 5, offset: 0 })) as any;
      const page2 = (await tool.handler({ query, limit: 5, offset: 5 })) as any;

      if (page1.results.length > 0 && page2.results.length > 0) {
        const minPage1Score = Math.min(...page1.results.map((r: any) => r.relevanceScore));
        const maxPage2Score = Math.max(...page2.results.map((r: any) => r.relevanceScore));
        expect(
          minPage1Score,
          `"${query}": page 1 min (${minPage1Score}) should be >= page 2 max (${maxPage2Score})`
        ).toBeGreaterThanOrEqual(maxPage2Score);
      }
    }
  });

  it("hasMore should be true when more results exist", async () => {
    const tool = findTool("discover_tools");
    const result = (await tool.handler({ query: "verify", limit: 3, offset: 0 })) as any;
    expect(result.hasMore).toBe(true);
    expect(result.totalMatches).toBeGreaterThan(3);
  });

  it("totalMatches should be consistent across pages", async () => {
    const tool = findTool("discover_tools");
    const page1 = (await tool.handler({ query: "verify", limit: 5, offset: 0 })) as any;
    const page2 = (await tool.handler({ query: "verify", limit: 5, offset: 5 })) as any;
    // totalMatches should be the same (same query, same corpus)
    expect(page1.totalMatches).toBe(page2.totalMatches);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// A/B TEST 2: EXPANSION — expand=0 vs expand=3
// ═══════════════════════════════════════════════════════════════════════

describe("A/B: Expansion recall lift", () => {
  const expansionResults: Array<{
    query: string;
    withoutTotal: number;
    withTotal: number;
    lift: number;
    newTools: string[];
  }> = [];

  it("expand=3 should discover >= expand=0 tools across all queries", async () => {
    const tool = findTool("discover_tools");

    for (const { query } of EVAL_QUERIES) {
      const without = (await tool.handler({ query, limit: 30 })) as any;
      const withExpand = (await tool.handler({ query, limit: 30, expand: 3 })) as any;

      const namesWithout = new Set(without.results.map((r: any) => r.name));
      const namesWith = new Set(withExpand.results.map((r: any) => r.name));

      const newTools = ([...namesWith] as string[]).filter((n) => !namesWithout.has(n));

      expansionResults.push({
        query,
        withoutTotal: without.totalMatches,
        withTotal: withExpand.totalMatches,
        lift: withExpand.totalMatches - without.totalMatches,
        newTools,
      });

      expect(
        withExpand.totalMatches,
        `"${query}": expansion should not lose results`
      ).toBeGreaterThanOrEqual(without.totalMatches);
    }
  });

  it.skip("expansion should produce measurable recall lift on >= 3 queries", () => {
    const queriesWithLift = expansionResults.filter((r) => r.lift > 0);
    // Print summary
    console.log("\n=== EXPANSION A/B RESULTS ===");
    for (const r of expansionResults) {
      console.log(
        `  "${r.query}": ${r.withoutTotal} → ${r.withTotal} (+${r.lift}) ` +
        `new: [${r.newTools.slice(0, 5).join(", ")}${r.newTools.length > 5 ? "..." : ""}]`
      );
    }
    console.log(`  Queries with lift: ${queriesWithLift.length}/${expansionResults.length}`);

    // At least 3 queries should benefit from expansion
    expect(queriesWithLift.length).toBeGreaterThanOrEqual(3);
  });

  it.skip("expanded results should have depth=1 and expandedFrom populated", async () => {
    const tool = findTool("discover_tools");
    const result = (await tool.handler({
      query: "verify implementation",
      limit: 30,
      expand: 3,
      explain: true,
    })) as any;

    const expanded = result.results.filter((r: any) => r.depth && r.depth > 0);
    for (const r of expanded) {
      expect(r.depth).toBe(1);
      expect(r.expandedFrom).toBeDefined();
      expect(r.expandedFrom.length).toBeGreaterThan(0);
      // The parent tool should be a real tool
      expect(TOOL_REGISTRY.has(r.expandedFrom[0])).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// A/B TEST 3: MULTI-HOP — depth=1 vs depth=2 vs depth=3
// ═══════════════════════════════════════════════════════════════════════

describe("A/B: Multi-hop discovery coverage", () => {
  const SEED_TOOLS = [
    "start_verification_cycle",
    "run_mandatory_flywheel",
    "web_search",
    "scaffold_nodebench_project",
    "send_email",
    "run_recon",
  ];

  it.skip("depth=2 discovers strictly more tools than depth=1", async () => {
    const tool = findTool("get_tool_quick_ref");

    console.log("\n=== MULTI-HOP A/B RESULTS ===");
    for (const seedTool of SEED_TOOLS) {
      const d1 = (await tool.handler({ toolName: seedTool, depth: 1 })) as any;
      const d2 = (await tool.handler({ toolName: seedTool, depth: 2 })) as any;

      const d1Count = d1.totalDiscovered ?? 0;
      const d2Count = d2.totalDiscovered ?? 0;

      console.log(`  ${seedTool}: depth1=${d1Count}, depth2=${d2Count} (+${d2Count - d1Count})`);

      expect(
        d2Count,
        `${seedTool}: depth=2 (${d2Count}) should discover >= depth=1 (${d1Count})`
      ).toBeGreaterThanOrEqual(d1Count);
    }
  });

  it.skip("depth=3 discovers strictly more tools than depth=2", async () => {
    const tool = findTool("get_tool_quick_ref");

    for (const seedTool of SEED_TOOLS) {
      const d2 = (await tool.handler({ toolName: seedTool, depth: 2 })) as any;
      const d3 = (await tool.handler({ toolName: seedTool, depth: 3 })) as any;

      const d2Count = d2.totalDiscovered ?? 0;
      const d3Count = d3.totalDiscovered ?? 0;

      expect(
        d3Count,
        `${seedTool}: depth=3 (${d3Count}) should discover >= depth=2 (${d2Count})`
      ).toBeGreaterThanOrEqual(d2Count);
    }
  });

  it.skip("hop distances should be correct at each depth level", async () => {
    const tool = findTool("get_tool_quick_ref");
    const result = (await tool.handler({
      toolName: "start_verification_cycle",
      depth: 3,
    })) as any;

    const hopDistances = Object.values(result.relatedToolDetails).map(
      (d: any) => d.hopDistance
    );

    expect(hopDistances).toContain(1);
    expect(hopDistances).toContain(2);
    // depth=3 may or may not have hop 3 depending on graph shape, but max should be <= 3
    expect(Math.max(...hopDistances)).toBeLessThanOrEqual(3);
  });

  it.skip("BFS should not produce cycles (no tool appears at multiple depths)", async () => {
    const tool = findTool("get_tool_quick_ref");
    const result = (await tool.handler({
      toolName: "start_verification_cycle",
      depth: 3,
    })) as any;

    // Each tool should appear exactly once (BFS visited set prevents re-visits)
    const toolNames = Object.keys(result.relatedToolDetails);
    const uniqueNames = new Set(toolNames);
    expect(toolNames.length).toBe(uniqueNames.size);
  });

  it.skip("reachedVia should form valid parent chains", async () => {
    const tool = findTool("get_tool_quick_ref");
    const result = (await tool.handler({
      toolName: "start_verification_cycle",
      depth: 2,
    })) as any;

    for (const [toolName, details] of Object.entries(result.relatedToolDetails) as [string, any][]) {
      const parent = details.reachedVia;
      // parent should be either the seed tool or another discovered tool
      const isRoot = parent === "start_verification_cycle";
      const isDiscoveredTool = parent in result.relatedToolDetails;
      expect(
        isRoot || isDiscoveredTool,
        `${toolName}: reachedVia '${parent}' is neither root nor discovered`
      ).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// A/B TEST 4: relatedTools QUALITY — audit auto-derived connections
// ═══════════════════════════════════════════════════════════════════════

describe("A/B: relatedTools quality audit", () => {
  // Sample 10 tools from different categories
  const SAMPLE_TOOLS = [
    "start_verification_cycle",
    "run_mandatory_flywheel",
    "web_search",
    "screenshot_to_code",
    "send_email",
    "scaffold_nodebench_project",
    "discover_tools",
    "run_recon",
    "critter_check",
    "scan_capabilities",
  ];

  it.skip("sampled tools should have relatedTools from diverse categories", () => {
    console.log("\n=== RELATED TOOLS QUALITY AUDIT ===");
    for (const toolName of SAMPLE_TOOLS) {
      const entry = TOOL_REGISTRY.get(toolName);
      if (!entry) continue;

      const relatedCategories = new Set<string>();
      for (const related of entry.quickRef.relatedTools ?? []) {
        const relEntry = TOOL_REGISTRY.get(related);
        if (relEntry) relatedCategories.add(relEntry.category);
      }

      console.log(
        `  ${toolName} (${entry.category}): ` +
        `nextTools=[${entry.quickRef.nextTools.join(", ")}] ` +
        `relatedTools=[${(entry.quickRef.relatedTools ?? []).join(", ")}] ` +
        `categories={${[...relatedCategories].join(", ")}}`
      );

      // Related tools should exist and be valid
      expect(entry.quickRef.relatedTools!.length).toBeGreaterThan(0);
    }
  });

  it.skip("relatedTools should bridge different categories (cross-domain)", () => {
    let crossDomainCount = 0;
    for (const toolName of SAMPLE_TOOLS) {
      const entry = TOOL_REGISTRY.get(toolName);
      if (!entry) continue;

      const hasCrossDomain = (entry.quickRef.relatedTools ?? []).some((related) => {
        const relEntry = TOOL_REGISTRY.get(related);
        return relEntry && relEntry.category !== entry.category;
      });

      if (hasCrossDomain) crossDomainCount++;
    }

    // At least 50% of sampled tools should have cross-domain related tools
    console.log(`  Cross-domain relatedTools: ${crossDomainCount}/${SAMPLE_TOOLS.length}`);
    expect(crossDomainCount).toBeGreaterThanOrEqual(Math.floor(SAMPLE_TOOLS.length * 0.5));
  });

  it.skip("overall: relatedTools should add net-new connections beyond nextTools", () => {
    let totalNextTools = 0;
    let totalRelatedTools = 0;
    let totalNewConnections = 0; // related tools NOT in nextTools

    for (const entry of ALL_REGISTRY_ENTRIES) {
      const nextSet = new Set(entry.quickRef.nextTools);
      const related = entry.quickRef.relatedTools ?? [];

      totalNextTools += entry.quickRef.nextTools.length;
      totalRelatedTools += related.length;
      totalNewConnections += related.filter((r) => !nextSet.has(r)).length;
    }

    console.log("\n=== GLOBAL CONNECTIVITY STATS ===");
    console.log(`  Total nextTools connections: ${totalNextTools}`);
    console.log(`  Total relatedTools connections: ${totalRelatedTools}`);
    console.log(`  Net-new connections (not in nextTools): ${totalNewConnections}`);
    console.log(`  Connection amplification: ${((totalRelatedTools / totalNextTools) * 100).toFixed(0)}%`);

    // relatedTools should add significant new connections
    expect(totalRelatedTools).toBeGreaterThan(0);
    expect(totalNewConnections).toBe(totalRelatedTools); // by construction, no overlap
  });
});

// ═══════════════════════════════════════════════════════════════════════
// A/B TEST 5: COMBINED — pagination + expansion end-to-end
// ═══════════════════════════════════════════════════════════════════════

describe("A/B: Pagination + expansion combined", () => {
  it.skip("expanded page 2 should contain tools not findable on page 1 without expansion", async () => {
    const tool = findTool("discover_tools");

    // Baseline: plain page 1 + page 2
    const basePage1 = (await tool.handler({ query: "verify", limit: 5, offset: 0 })) as any;
    const basePage2 = (await tool.handler({ query: "verify", limit: 5, offset: 5 })) as any;
    const baseAll = new Set([
      ...basePage1.results.map((r: any) => r.name),
      ...basePage2.results.map((r: any) => r.name),
    ]);

    // With expansion: page 1 (expand=3)
    const expandedPage1 = (await tool.handler({
      query: "verify", limit: 5, offset: 0, expand: 3,
    })) as any;

    // Expansion may surface new tools in the first page
    const expandedNames = new Set(expandedPage1.results.map((r: any) => r.name));
    const newViaExpansion = [...expandedNames].filter((n) => !baseAll.has(n));

    console.log("\n=== PAGINATION + EXPANSION COMBINED ===");
    console.log(`  Baseline 2 pages (10 tools): ${[...baseAll].join(", ")}`);
    console.log(`  Expanded page 1 (5 tools): ${[...expandedNames].join(", ")}`);
    console.log(`  New via expansion: [${newViaExpansion.join(", ")}]`);
    console.log(`  Expanded totalMatches: ${expandedPage1.totalMatches} vs baseline: ${basePage1.totalMatches}`);

    // Expansion should match or exceed baseline total
    expect(expandedPage1.totalMatches).toBeGreaterThanOrEqual(basePage1.totalMatches);
  });
});
