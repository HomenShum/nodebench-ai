/**
 * Local Dashboard Tests
 *
 * Tests for: schema tables, tool structure, handler behavior, audience events.
 */
import { describe, it, expect, beforeAll } from "vitest";
import Database from "better-sqlite3";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { localDashboardTools } from "../tools/localDashboardTools.js";
import { getBriefDashboardHtml } from "../dashboard/briefHtml.js";
import { ALL_REGISTRY_ENTRIES, WORKFLOW_CHAINS } from "../tools/toolRegistry.js";

// Create a temporary database for schema tests
let db: Database.Database;

beforeAll(() => {
  const tmpDir = mkdtempSync(join(tmpdir(), "nodebench-dashboard-test-"));
  db = new Database(join(tmpDir, "test.db"));
  db.pragma("journal_mode = WAL");

  // Create the tables (mirrors db.ts schema)
  db.exec(`
    CREATE TABLE IF NOT EXISTS brief_snapshots (
      id TEXT PRIMARY KEY, date_string TEXT NOT NULL, generated_at INTEGER NOT NULL,
      dashboard_metrics TEXT NOT NULL, source_summary TEXT, version INTEGER NOT NULL DEFAULT 1,
      synced_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(date_string, version)
    );
    CREATE TABLE IF NOT EXISTS brief_memories (
      id TEXT PRIMARY KEY, snapshot_id TEXT, date_string TEXT NOT NULL,
      goal TEXT, features TEXT, progress_log TEXT,
      synced_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS brief_task_results (
      id TEXT PRIMARY KEY, memory_id TEXT NOT NULL, task_id TEXT,
      result_markdown TEXT, citations TEXT, artifacts TEXT,
      synced_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS narrative_threads_local (
      id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, name TEXT NOT NULL, slug TEXT NOT NULL,
      thesis TEXT NOT NULL, counter_thesis TEXT, entity_keys TEXT NOT NULL, topic_tags TEXT NOT NULL,
      current_phase TEXT NOT NULL, first_event_at INTEGER, latest_event_at INTEGER,
      event_count INTEGER DEFAULT 0, plot_twist_count INTEGER DEFAULT 0, quality TEXT,
      synced_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS narrative_events_local (
      id TEXT PRIMARY KEY, event_id TEXT NOT NULL, thread_id TEXT NOT NULL, headline TEXT NOT NULL,
      summary TEXT NOT NULL, significance TEXT NOT NULL, occurred_at INTEGER NOT NULL,
      source_urls TEXT, citation_ids TEXT, claim_set TEXT, is_verified INTEGER DEFAULT 0,
      synced_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sync_runs (
      id TEXT PRIMARY KEY, started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT, status TEXT NOT NULL DEFAULT 'running',
      tables_synced TEXT, error TEXT, duration_ms INTEGER
    );
    CREATE TABLE IF NOT EXISTS audience_events (
      id TEXT PRIMARY KEY, event_type TEXT NOT NULL,
      viewer_count INTEGER, is_public INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Local Dashboard: schema", () => {
  it("brief_snapshots table created", () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='brief_snapshots'").get() as any;
    expect(row).toBeTruthy();
    expect(row.name).toBe("brief_snapshots");
  });

  it("narrative_threads_local table created", () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='narrative_threads_local'").get() as any;
    expect(row).toBeTruthy();
  });

  it("sync_runs table created", () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sync_runs'").get() as any;
    expect(row).toBeTruthy();
  });

  it("audience_events table created", () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='audience_events'").get() as any;
    expect(row).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TOOL STRUCTURE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Local Dashboard: tool structure", () => {
  it("exports 5 tools", () => {
    expect(localDashboardTools).toHaveLength(5);
  });

  it("each has name/description/inputSchema/handler", () => {
    for (const tool of localDashboardTools) {
      expect(typeof tool.name).toBe("string");
      expect(typeof tool.description).toBe("string");
      expect(tool.inputSchema).toBeDefined();
      expect(typeof tool.handler).toBe("function");
    }
  });

  it.skip("each has a toolRegistry entry with category=dashboard", () => {
    const dashboardEntries = ALL_REGISTRY_ENTRIES.filter(e => e.category === "dashboard");
    expect(dashboardEntries.length).toBe(5);
    const names = dashboardEntries.map(e => e.name);
    expect(names).toContain("sync_daily_brief");
    expect(names).toContain("get_daily_brief_summary");
    expect(names).toContain("get_narrative_status");
    expect(names).toContain("get_ops_dashboard");
    expect(names).toContain("open_local_dashboard");
  });

  it("workflow chain daily_review exists", () => {
    expect(WORKFLOW_CHAINS["daily_review"]).toBeDefined();
    expect(WORKFLOW_CHAINS["daily_review"].steps.length).toBe(5);
  });

  it("tool names match between tools and registry", () => {
    const toolNames = new Set(localDashboardTools.map(t => t.name));
    const registryNames = ALL_REGISTRY_ENTRIES
      .filter(e => e.category === "dashboard")
      .map(e => e.name);
    for (const name of registryNames) {
      expect(toolNames.has(name)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER BEHAVIOR TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Local Dashboard: handler behavior", () => {
  it("sync_daily_brief returns error without CONVEX_SITE_URL", async () => {
    const tool = localDashboardTools.find(t => t.name === "sync_daily_brief")!;
    // Clear env vars for this test
    const origUrl = process.env.CONVEX_SITE_URL;
    const origVite = process.env.VITE_CONVEX_URL;
    delete process.env.CONVEX_SITE_URL;
    delete process.env.VITE_CONVEX_URL;
    try {
      const result = await tool.handler({});
      expect(result.error).toBe(true);
      expect(result.message).toContain("Missing");
    } finally {
      if (origUrl) process.env.CONVEX_SITE_URL = origUrl;
      if (origVite) process.env.VITE_CONVEX_URL = origVite;
    }
  });

  it("get_daily_brief_summary returns empty when no data", async () => {
    const tool = localDashboardTools.find(t => t.name === "get_daily_brief_summary")!;
    const result = await tool.handler({});
    expect(result.empty || result.dashboardMetrics != null).toBe(true);
  });

  it("get_narrative_status returns empty or data", async () => {
    const tool = localDashboardTools.find(t => t.name === "get_narrative_status")!;
    const result = await tool.handler({});
    expect(result.empty || result.threads != null).toBe(true);
  });

  it("get_ops_dashboard returns structure", async () => {
    const tool = localDashboardTools.find(t => t.name === "get_ops_dashboard")!;
    const result = await tool.handler({});
    expect(result).toHaveProperty("dataCounts");
    expect(result).toHaveProperty("dashboardUrl");
  });

  it("open_local_dashboard returns url", async () => {
    const tool = localDashboardTools.find(t => t.name === "open_local_dashboard")!;
    const result = await tool.handler({});
    expect(result.url || result.error).toBeTruthy();
    if (result.url) {
      expect(result.views).toBeDefined();
      expect(result.views.length).toBe(3);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AUDIENCE EVENT TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Local Dashboard: audience events", () => {
  it("audience_events insertable", () => {
    db.prepare(`
      INSERT INTO audience_events (id, event_type, viewer_count, is_public)
      VALUES (?, ?, ?, ?)
    `).run("test_aud_1", "mode_switch", 2, 1);

    const row = db.prepare("SELECT * FROM audience_events WHERE id = ?").get("test_aud_1") as any;
    expect(row).toBeTruthy();
    expect(row.event_type).toBe("mode_switch");
    expect(row.viewer_count).toBe(2);
    expect(row.is_public).toBe(1);
  });

  it("multiple event types insertable", () => {
    db.prepare(`
      INSERT INTO audience_events (id, event_type, viewer_count, is_public)
      VALUES (?, ?, ?, ?)
    `).run("test_aud_2", "presence_change", 0, 0);

    db.prepare(`
      INSERT INTO audience_events (id, event_type, viewer_count, is_public)
      VALUES (?, ?, ?, ?)
    `).run("test_aud_3", "session_start", 1, 0);

    const count = (db.prepare("SELECT COUNT(*) as c FROM audience_events").get() as any).c;
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HTML GENERATION TEST
// ═══════════════════════════════════════════════════════════════════════════

describe("Local Dashboard: HTML", () => {
  it("generates valid HTML with required sections", () => {
    const html = getBriefDashboardHtml();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Daily Brief");
    expect(html).toContain("panel-brief");
    expect(html).toContain("panel-narrative");
    expect(html).toContain("panel-ops");
    expect(html).toContain("privacyToggle");
  });

  it("contains privacy detection infrastructure", () => {
    const html = getBriefDashboardHtml();
    expect(html).toContain("privacyVideo");
    expect(html).toContain("privacyCanvas");
    expect(html).toContain("checkPresence");
    expect(html).toContain("isPublicMode");
  });

  it("contains auto-refresh logic", () => {
    const html = getBriefDashboardHtml();
    expect(html).toContain("setInterval");
    expect(html).toContain("refreshData");
  });
});
