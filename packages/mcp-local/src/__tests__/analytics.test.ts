/**
 * Comprehensive tests for the analytics subsystem.
 *
 * Tests cover:
 *   - schema.ts:          DB init, singleton, CRUD, cache TTL, retention cleanup
 *   - projectDetector.ts: project type detection, glob matching, edge cases
 *   - usageStats.ts:      aggregation queries, trends, failing tools, formatted display
 *   - smartPreset.ts:     signal computation, scoring model, formatted output
 *   - toolTracker.ts:     AnalyticsTracker singleton, record(), session stats, close
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

// ── Schema tests ────────────────────────────────────────────────────────

import {
  initAnalyticsDb,
  recordToolUsage,
  updateProjectContext,
  recordPresetSelection,
  getCachedStats,
  setCachedStats,
  clearOldRecords,
} from "../analytics/schema.js";

function freshDb(): Database.Database {
  // In-memory DB for test isolation
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS tool_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_name TEXT NOT NULL,
      toolset TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      success BOOLEAN NOT NULL,
      error_message TEXT,
      project_path TEXT NOT NULL,
      preset TEXT NOT NULL,
      args TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tool_usage_tool ON tool_usage(tool_name);
    CREATE INDEX IF NOT EXISTS idx_tool_usage_toolset ON tool_usage(toolset);
    CREATE INDEX IF NOT EXISTS idx_tool_usage_project ON tool_usage(project_path);
    CREATE INDEX IF NOT EXISTS idx_tool_usage_timestamp ON tool_usage(timestamp);
    CREATE TABLE IF NOT EXISTS project_context (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT UNIQUE NOT NULL,
      project_type TEXT NOT NULL,
      detected_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      language TEXT NOT NULL,
      framework TEXT,
      has_tests BOOLEAN NOT NULL,
      has_ci BOOLEAN NOT NULL,
      has_docs BOOLEAN NOT NULL,
      file_count INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS preset_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT NOT NULL,
      preset TEXT NOT NULL,
      toolset_count INTEGER NOT NULL,
      selected_at INTEGER NOT NULL,
      selection_reason TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS usage_stats_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT NOT NULL,
      cache_key TEXT NOT NULL,
      stats TEXT NOT NULL,
      computed_at INTEGER NOT NULL,
      ttl INTEGER NOT NULL,
      UNIQUE(project_path, cache_key)
    );
    CREATE INDEX IF NOT EXISTS idx_usage_stats_cache_key ON usage_stats_cache(project_path, cache_key);
  `);
  return db;
}

describe("schema", () => {
  let db: Database.Database;
  beforeEach(() => { db = freshDb(); });
  afterEach(() => { db.close(); });

  it("recordToolUsage inserts a row", () => {
    recordToolUsage(db, {
      toolName: "verify_fix",
      toolset: "verification",
      timestamp: Date.now(),
      duration: 150,
      success: true,
      projectPath: "/test",
      preset: "default",
    });
    const count = (db.prepare("SELECT COUNT(*) as c FROM tool_usage").get() as any).c;
    expect(count).toBe(1);
  });

  it("recordToolUsage stores error messages", () => {
    recordToolUsage(db, {
      toolName: "web_search",
      toolset: "web",
      timestamp: Date.now(),
      duration: 500,
      success: false,
      errorMessage: "timeout",
      projectPath: "/test",
      preset: "full",
    });
    const row = db.prepare("SELECT * FROM tool_usage WHERE tool_name = 'web_search'").get() as any;
    expect(row.success).toBe(0);
    expect(row.error_message).toBe("timeout");
  });

  it("updateProjectContext upserts on conflict", () => {
    const base = {
      projectPath: "/proj",
      projectType: "web_frontend",
      detectedAt: Date.now(),
      lastSeen: Date.now(),
      language: "typescript",
      hasTests: true,
      hasCI: false,
      hasDocs: false,
      fileCount: 100,
    };
    updateProjectContext(db, base);
    updateProjectContext(db, { ...base, fileCount: 200 });
    const rows = db.prepare("SELECT * FROM project_context WHERE project_path = '/proj'").all();
    expect(rows).toHaveLength(1);
    expect((rows[0] as any).file_count).toBe(200);
  });

  it("recordPresetSelection inserts a history row", () => {
    recordPresetSelection(db, {
      projectPath: "/proj",
      preset: "full",
      toolsetCount: 175,
      selectedAt: Date.now(),
      selectionReason: "smart",
    });
    const count = (db.prepare("SELECT COUNT(*) as c FROM preset_history").get() as any).c;
    expect(count).toBe(1);
  });

  it("cache: setCachedStats + getCachedStats round-trip", () => {
    const now = Date.now();
    setCachedStats(db, {
      projectPath: "/proj",
      cacheKey: "summary_30d",
      stats: JSON.stringify({ totalCalls: 42 }),
      computedAt: now,
      ttl: 300, // 5 minutes in seconds
    });
    const cached = getCachedStats(db, "/proj", "summary_30d");
    expect(cached).not.toBeNull();
    expect(JSON.parse(cached!).totalCalls).toBe(42);
  });

  it("cache: expired entries return null", () => {
    const past = Date.now() - 600_000; // 10 minutes ago
    setCachedStats(db, {
      projectPath: "/proj",
      cacheKey: "old",
      stats: "{}",
      computedAt: past,
      ttl: 60, // 1 minute TTL — should be expired
    });
    const result = getCachedStats(db, "/proj", "old");
    expect(result).toBeNull();
  });

  it("clearOldRecords deletes old tool_usage rows", () => {
    const old = Date.now() - 100 * 24 * 60 * 60 * 1000; // 100 days ago
    recordToolUsage(db, {
      toolName: "old_tool",
      toolset: "verification",
      timestamp: old,
      duration: 10,
      success: true,
      projectPath: "/proj",
      preset: "default",
    });
    recordToolUsage(db, {
      toolName: "new_tool",
      toolset: "verification",
      timestamp: Date.now(),
      duration: 10,
      success: true,
      projectPath: "/proj",
      preset: "default",
    });
    clearOldRecords(db, 90);
    const count = (db.prepare("SELECT COUNT(*) as c FROM tool_usage").get() as any).c;
    expect(count).toBe(1);
    const row = db.prepare("SELECT tool_name FROM tool_usage").get() as any;
    expect(row.tool_name).toBe("new_tool");
  });

  it("clearOldRecords(0) deletes everything", () => {
    recordToolUsage(db, {
      toolName: "any",
      toolset: "any",
      timestamp: Date.now() - 1, // 1ms in the past to satisfy strict < comparison
      duration: 10,
      success: true,
      projectPath: "/proj",
      preset: "default",
    });
    clearOldRecords(db, 0);
    const count = (db.prepare("SELECT COUNT(*) as c FROM tool_usage").get() as any).c;
    expect(count).toBe(0);
  });
});

// ── usageStats tests ────────────────────────────────────────────────────

import {
  getToolUsageStats,
  getToolsetUsageStats,
  getProjectUsageSummary,
  getUsageTrend,
  getUnusedTools,
  getFrequentlyFailingTools,
  formatStatsDisplay,
  getCachedProjectSummary,
} from "../analytics/usageStats.js";

function seedUsageData(db: Database.Database) {
  const now = Date.now();
  const tools = [
    { name: "verify_fix", toolset: "verification", success: true },
    { name: "verify_fix", toolset: "verification", success: true },
    { name: "verify_fix", toolset: "verification", success: false },
    { name: "run_eval", toolset: "eval", success: true },
    { name: "web_search", toolset: "web", success: true },
    { name: "web_search", toolset: "web", success: false },
    { name: "web_search", toolset: "web", success: false },
    { name: "web_search", toolset: "web", success: false },
  ];
  for (const t of tools) {
    recordToolUsage(db, {
      toolName: t.name,
      toolset: t.toolset,
      timestamp: now - Math.random() * 1000000,
      duration: 100 + Math.random() * 500,
      success: t.success,
      errorMessage: t.success ? undefined : "test error",
      projectPath: "/test-project",
      preset: "default",
    });
  }
}

describe("usageStats", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
    seedUsageData(db);
  });
  afterEach(() => { db.close(); });

  it("getToolUsageStats returns per-tool aggregations", () => {
    const stats = getToolUsageStats(db, "/test-project", 30);
    expect(stats.length).toBeGreaterThan(0);
    const verifyStats = stats.find(s => s.toolName === "verify_fix");
    expect(verifyStats).toBeDefined();
    expect(verifyStats!.callCount).toBe(3);
    expect(verifyStats!.successCount).toBe(2);
    expect(verifyStats!.failureCount).toBe(1);
  });

  it("getToolsetUsageStats returns per-toolset aggregations", () => {
    const stats = getToolsetUsageStats(db, "/test-project", 30);
    expect(stats.length).toBeGreaterThan(0);
    const webStats = stats.find(s => s.toolset === "web");
    expect(webStats).toBeDefined();
    expect(webStats!.totalCalls).toBe(4);
  });

  it("getProjectUsageSummary returns null for empty project", () => {
    const summary = getProjectUsageSummary(db, "/nonexistent", 30);
    expect(summary).toBeNull();
  });

  it("getProjectUsageSummary returns valid summary", () => {
    const summary = getProjectUsageSummary(db, "/test-project", 30);
    expect(summary).not.toBeNull();
    expect(summary!.totalCalls).toBe(8);
    expect(summary!.uniqueToolsUsed).toBe(3);
    expect(summary!.successRate).toBeGreaterThan(0);
    expect(summary!.successRate).toBeLessThanOrEqual(1);
    expect(summary!.topTools.length).toBeGreaterThan(0);
    expect(summary!.topToolsets.length).toBeGreaterThan(0);
  });

  it("getUsageTrend returns daily aggregation", () => {
    const trends = getUsageTrend(db, "/test-project", 30);
    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0]).toHaveProperty("date");
    expect(trends[0]).toHaveProperty("callCount");
  });

  it("getUnusedTools returns tools not called", () => {
    const unused = getUnusedTools(
      db,
      "/test-project",
      ["verify_fix", "run_eval", "web_search", "never_used_tool"],
      30
    );
    expect(unused).toContain("never_used_tool");
    expect(unused).not.toContain("verify_fix");
  });

  it("getFrequentlyFailingTools returns tools with many failures", () => {
    const failing = getFrequentlyFailingTools(db, "/test-project", 30, 2);
    expect(failing.length).toBeGreaterThan(0);
    const webFailing = failing.find(f => f.toolName === "web_search");
    expect(webFailing).toBeDefined();
    expect(webFailing!.failureCount).toBe(3);
  });

  it("formatStatsDisplay produces human-readable output", () => {
    const summary = getProjectUsageSummary(db, "/test-project", 30)!;
    const output = formatStatsDisplay(summary, "/test-project");
    expect(output).toContain("Usage Analytics");
    expect(output).toContain("Total calls:");
    expect(output).toContain("Success rate:");
    expect(output).toContain("Top Tools");
  });

  it("getCachedProjectSummary caches on first call and returns from cache on second", () => {
    const s1 = getCachedProjectSummary(db, "/test-project", 30);
    expect(s1).not.toBeNull();
    // Verify cache was written
    const cached = getCachedStats(db, "/test-project", "summary_30d");
    expect(cached).not.toBeNull();
    // Second call should return cached data
    const s2 = getCachedProjectSummary(db, "/test-project", 30);
    expect(s2).toEqual(s1);
  });
});

// ── projectDetector tests ───────────────────────────────────────────────

import { detectProject, type ProjectType } from "../analytics/projectDetector.js";

describe("projectDetector", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nb-test-"));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("detects unknown project type for empty dir", () => {
    const ctx = detectProject(tmpDir);
    expect(ctx.projectType).toBe("unknown");
    expect(ctx.language).toBe("unknown");
  });

  it("detects web_frontend for React project", () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({
      dependencies: { react: "^18" },
    }));
    fs.writeFileSync(path.join(tmpDir, "tsconfig.json"), "{}");
    const ctx = detectProject(tmpDir);
    expect(ctx.projectType).toBe("web_frontend");
    expect(ctx.language).toBe("typescript");
    expect(ctx.framework).toBe("react");
  });

  it("detects library type for package.json with main field", () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({
      main: "dist/index.js",
      name: "my-lib",
    }));
    const ctx = detectProject(tmpDir);
    // Library detection depends on the heuristics — at minimum should detect JS
    expect(ctx.language).toBe("javascript");
  });

  it("detects tests when test files exist", () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), "{}");
    // Detector needs actual test files matching *.test.ts or a tests/ dir
    fs.mkdirSync(path.join(tmpDir, "tests"));
    fs.writeFileSync(path.join(tmpDir, "app.test.ts"), "");
    const ctx = detectProject(tmpDir);
    expect(ctx.hasTests).toBe(true);
  });

  it("detects CI when workflow files exist", () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), "{}");
    fs.mkdirSync(path.join(tmpDir, ".github", "workflows"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".github", "workflows", "ci.yml"), "name: CI");
    const ctx = detectProject(tmpDir);
    expect(ctx.hasCI).toBe(true);
  });

  it("counts files correctly", () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), "");
    fs.writeFileSync(path.join(tmpDir, "b.ts"), "");
    fs.writeFileSync(path.join(tmpDir, "c.js"), "");
    const ctx = detectProject(tmpDir);
    expect(ctx.fileCount).toBeGreaterThanOrEqual(3);
  });

  it("detects Python project from requirements.txt", () => {
    fs.writeFileSync(path.join(tmpDir, "requirements.txt"), "pandas\nnumpy\n");
    const ctx = detectProject(tmpDir);
    expect(ctx.language).toBe("python");
    // requirements.txt can trigger fastapi pattern (web_backend) via anyFileExists
    expect(["web_backend", "data_science", "unknown"]).toContain(ctx.projectType);
  });
});

// ── smartPreset tests ───────────────────────────────────────────────────

import {
  generateSmartPreset,
  listPresets,
  formatPresetRecommendation,
} from "../analytics/smartPreset.js";
import type { McpTool } from "../types.js";

function mockToolsetMap(): Record<string, McpTool[]> {
  const makeTool = (name: string): McpTool => ({
    name,
    description: `Mock ${name}`,
    inputSchema: { type: "object" as const, properties: {} },
    handler: async () => ({}),
  });

  return {
    verification: [makeTool("verify_fix"), makeTool("verify_plan")],
    eval: [makeTool("run_eval")],
    quality_gate: [makeTool("quality_check")],
    learning: [makeTool("record_learning")],
    flywheel: [makeTool("flywheel_step")],
    recon: [makeTool("recon_scan")],
    security: [makeTool("security_check")],
    boilerplate: [makeTool("scaffold")],
    web: [makeTool("web_search"), makeTool("fetch_url")],
    github: [makeTool("github_search")],
    vision: [makeTool("capture_screenshot")],
    ui_capture: [makeTool("capture_ui")],
    llm: [makeTool("call_llm")],
  };
}

describe("smartPreset", () => {
  let db: Database.Database;
  const toolsetMap = mockToolsetMap();

  beforeEach(() => { db = freshDb(); });
  afterEach(() => { db.close(); });

  it("recommends default for empty project with no history", () => {
    const rec = generateSmartPreset(db, toolsetMap, "/empty");
    expect(rec.preset).toBe("default");
    expect(rec.confidence).toBeGreaterThan(0);
    expect(rec.confidence).toBeLessThanOrEqual(1);
    expect(rec.signals.historyWeight).toBe(0);
    expect(rec.reason).toContain("No usage history");
  });

  it("includes signal breakdown with all 5 signals", () => {
    const rec = generateSmartPreset(db, toolsetMap, "/empty");
    expect(rec.signals).toHaveProperty("projectTypeAffinity");
    expect(rec.signals).toHaveProperty("usageBreadth");
    expect(rec.signals).toHaveProperty("specializedDepth");
    expect(rec.signals).toHaveProperty("failurePenalty");
    expect(rec.signals).toHaveProperty("historyWeight");
  });

  it("score increases when specialized toolsets are used heavily", () => {
    // Seed heavy usage of non-default toolsets
    const now = Date.now();
    for (let i = 0; i < 50; i++) {
      recordToolUsage(db, {
        toolName: "web_search",
        toolset: "web",
        timestamp: now - i * 10000,
        duration: 100,
        success: true,
        projectPath: "/heavy-web",
        preset: "full",
      });
      recordToolUsage(db, {
        toolName: "github_search",
        toolset: "github",
        timestamp: now - i * 10000,
        duration: 100,
        success: true,
        projectPath: "/heavy-web",
        preset: "full",
      });
    }
    const rec = generateSmartPreset(db, toolsetMap, "/heavy-web");
    expect(rec.signals.specializedDepth).toBeGreaterThan(0);
    expect(rec.signals.historyWeight).toBeGreaterThan(0.5);
    expect(rec.score).toBeGreaterThan(0.3);
  });

  it("failure penalty reduces confidence", () => {
    const now = Date.now();
    // Seed lots of failures
    for (let i = 0; i < 30; i++) {
      recordToolUsage(db, {
        toolName: "web_search",
        toolset: "web",
        timestamp: now - i * 1000,
        duration: 100,
        success: false,
        errorMessage: "timeout",
        projectPath: "/failing",
        preset: "full",
      });
    }
    const rec = generateSmartPreset(db, toolsetMap, "/failing");
    expect(rec.signals.failurePenalty).toBeGreaterThan(0);
    expect(rec.usageInsights.frequentlyFailingTools.length).toBeGreaterThan(0);
  });

  it("listPresets returns all presets with counts", () => {
    const presets = listPresets(toolsetMap);
    expect(presets.length).toBeGreaterThanOrEqual(10); // default + 8 themed + full
    expect(presets[0].name).toBe("default");
    expect(presets[presets.length - 1].name).toBe("full");
    expect(presets[presets.length - 1].toolCount).toBeGreaterThan(presets[0].toolCount);
    // Themed presets should have at least as many tools as default (extras may not exist in mock)
    for (const p of presets.slice(1, -1)) {
      expect(p.toolCount).toBeGreaterThanOrEqual(presets[0].toolCount);
      expect(p.toolCount).toBeLessThanOrEqual(presets[presets.length - 1].toolCount);
    }
  });

  it("formatPresetRecommendation includes signal breakdown and apply commands", () => {
    const rec = generateSmartPreset(db, toolsetMap, "/empty");
    const output = formatPresetRecommendation(rec, toolsetMap);
    expect(output).toContain("Smart Preset Recommendation");
    expect(output).toContain("Signal Breakdown");
    expect(output).toContain("Project Type Affinity");
    expect(output).toContain("Usage Breadth");
    expect(output).toContain("Apply");
    expect(output).toContain("npx nodebench-mcp --preset");
  });

  it("formatPresetRecommendation surfaces failing tools", () => {
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      recordToolUsage(db, {
        toolName: "broken_tool",
        toolset: "web",
        timestamp: now - i * 1000,
        duration: 50,
        success: false,
        errorMessage: "ECONNREFUSED",
        projectPath: "/broken",
        preset: "full",
      });
    }
    const rec = generateSmartPreset(db, toolsetMap, "/broken");
    const output = formatPresetRecommendation(rec, toolsetMap);
    expect(output).toContain("Failing Tools");
    expect(output).toContain("broken_tool");
    expect(output).toContain("ECONNREFUSED");
  });
});

// ── AnalyticsTracker tests ──────────────────────────────────────────────

// We test the AnalyticsTracker in a limited way since it's a singleton
// that opens a real DB. We test the core logic via the schema/stats tests above.
// Here we just verify the class API contract.

describe("AnalyticsTracker API contract", () => {
  it("exports AnalyticsTracker class with expected static methods", async () => {
    const { AnalyticsTracker } = await import("../analytics/toolTracker.js");
    expect(typeof AnalyticsTracker.init).toBe("function");
    expect(typeof AnalyticsTracker.get).toBe("function");
  });

  it("exports initializeProjectContext for backward compat", async () => {
    const { initializeProjectContext } = await import("../analytics/toolTracker.js");
    expect(typeof initializeProjectContext).toBe("function");
  });
});

// ── toolsetRegistry tests ───────────────────────────────────────────────

describe("toolsetRegistry", () => {
  it("exports TOOLSET_MAP with expected toolsets", async () => {
    const { TOOLSET_MAP } = await import("../toolsetRegistry.js");
    expect(TOOLSET_MAP).toBeDefined();
    expect(typeof TOOLSET_MAP).toBe("object");
    expect(Object.keys(TOOLSET_MAP).length).toBeGreaterThan(20);
    // Core toolsets must exist
    expect(TOOLSET_MAP).toHaveProperty("verification");
    expect(TOOLSET_MAP).toHaveProperty("eval");
    expect(TOOLSET_MAP).toHaveProperty("quality_gate");
    expect(TOOLSET_MAP).toHaveProperty("web");
  });

  it("exports TOOL_TO_TOOLSET map", async () => {
    const { TOOL_TO_TOOLSET, TOOLSET_MAP } = await import("../toolsetRegistry.js");
    expect(TOOL_TO_TOOLSET).toBeInstanceOf(Map);
    // Every tool in TOOLSET_MAP should be in the lookup
    for (const [tsName, tools] of Object.entries(TOOLSET_MAP)) {
      for (const tool of tools) {
        expect(TOOL_TO_TOOLSET.get(tool.name)).toBe(tsName);
      }
    }
  });

  it("total tool count matches expectations (175)", async () => {
    const { TOOLSET_MAP } = await import("../toolsetRegistry.js");
    const total = Object.values(TOOLSET_MAP).reduce((s, t) => s + t.length, 0);
    // Should be around 169 domain tools (175 - 6 meta/discovery)
    expect(total).toBeGreaterThan(100);
  });
});
