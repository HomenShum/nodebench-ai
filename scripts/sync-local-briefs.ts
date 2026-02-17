/**
 * Sync Daily Brief + Narrative data from Convex → local SQLite.
 *
 * Calls the MCP Gateway HTTP endpoint (POST /api/mcpGateway) and upserts
 * results into the local ~/.nodebench/nodebench.db database.
 *
 * Usage:
 *   npm run local:sync
 *   npm run local:sync -- --days 30 --force
 *
 * Env vars:
 *   CONVEX_SITE_URL — Convex deployment site URL (e.g. https://xxx.convex.site)
 *   MCP_SECRET      — MCP gateway auth secret
 */

import dotenv from "dotenv";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

// Resolve better-sqlite3 from mcp-local's node_modules (not installed at root)
const require = createRequire(join(process.cwd(), "packages", "mcp-local", "package.json"));
const Database = require("better-sqlite3") as typeof import("better-sqlite3").default;

dotenv.config({ path: ".env.local" });
dotenv.config();

// ── CLI Helpers ──────────────────────────────────────────────────────────

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function tryReadConvexEnvVar(name: string): string | null {
  const local = process.env[name];
  if (local && local.trim()) return local.trim();

  const cli = join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "convex.cmd" : "convex");
  const res =
    process.platform === "win32"
      ? spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", `& '${cli}' env get ${name}`], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        })
      : spawnSync(cli, ["env", "get", name], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        });
  if (res.status !== 0) return null;
  const value = String(res.stdout ?? "").trim();
  return value.length ? value : null;
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ── Gateway Client ───────────────────────────────────────────────────────

async function callGateway(siteUrl: string, secret: string, fn: string, args: Record<string, unknown> = {}): Promise<any> {
  const res = await fetch(`${siteUrl.replace(/\/$/, "")}/api/mcpGateway`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-mcp-secret": secret,
    },
    body: JSON.stringify({ fn, args }),
  });

  if (!res.ok) {
    throw new Error(`Gateway HTTP ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(`Gateway error for ${fn}: ${json.error ?? "unknown"}`);
  }
  return json.data;
}

// ── Sync Logic ───────────────────────────────────────────────────────────

async function main() {
  const siteUrl = process.env.CONVEX_SITE_URL || process.env.VITE_CONVEX_URL;
  if (!siteUrl) {
    throw new Error("Missing CONVEX_SITE_URL (or VITE_CONVEX_URL). Set in .env.local or environment.");
  }

  const secret = tryReadConvexEnvVar("MCP_SECRET");
  if (!secret) {
    throw new Error("Missing MCP_SECRET. Set via: npx convex env set MCP_SECRET <value>");
  }

  const days = parseInt(getArg("--days") || "7", 10);
  const force = process.argv.includes("--force");

  console.log(`[sync] Syncing last ${days} days${force ? " (force)" : ""}...`);

  // Open local SQLite
  const dir = join(homedir(), ".nodebench");
  mkdirSync(dir, { recursive: true });
  const db = new Database(join(dir, "nodebench.db"));
  db.pragma("journal_mode = WAL");

  // Ensure tables exist (they should from MCP server startup, but just in case)
  db.exec(`
    CREATE TABLE IF NOT EXISTS brief_snapshots (
      id TEXT PRIMARY KEY, date_string TEXT NOT NULL, generated_at INTEGER NOT NULL,
      dashboard_metrics TEXT NOT NULL, source_summary TEXT, version INTEGER NOT NULL DEFAULT 1,
      synced_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(date_string, version)
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
  `);

  // Start sync run
  const syncId = genId("sync");
  const startMs = Date.now();
  db.prepare("INSERT INTO sync_runs (id, status) VALUES (?, 'running')").run(syncId);

  const counts: Record<string, number> = {};

  try {
    // ── 1. Brief Snapshot ──
    console.log("[sync] Fetching latest dashboard snapshot...");
    const snapshot = await callGateway(siteUrl, secret, "getLatestDashboardSnapshot");
    if (snapshot) {
      const existing = db.prepare("SELECT id FROM brief_snapshots WHERE date_string = ? AND version = 1").get(
        snapshot.dateString ?? new Date().toISOString().slice(0, 10)
      );

      if (!existing || force) {
        db.prepare(`
          INSERT OR REPLACE INTO brief_snapshots (id, date_string, generated_at, dashboard_metrics, source_summary, version)
          VALUES (?, ?, ?, ?, ?, 1)
        `).run(
          snapshot._id ?? genId("snap"),
          snapshot.dateString ?? new Date().toISOString().slice(0, 10),
          snapshot.generatedAt ?? Date.now(),
          JSON.stringify(snapshot.dashboardMetrics ?? {}),
          JSON.stringify(snapshot.sourceSummary ?? null),
        );
        counts.brief_snapshots = 1;
        console.log("[sync]   ✓ Brief snapshot synced");
      } else {
        console.log("[sync]   → Brief snapshot already synced (use --force to re-sync)");
        counts.brief_snapshots = 0;
      }
    }

    await delay(100);

    // ── 2. Narrative Threads ──
    console.log("[sync] Fetching public threads...");
    const threads = await callGateway(siteUrl, secret, "getPublicThreads", { limit: 100 });
    if (Array.isArray(threads)) {
      const upsert = db.prepare(`
        INSERT OR REPLACE INTO narrative_threads_local
        (id, thread_id, name, slug, thesis, counter_thesis, entity_keys, topic_tags,
         current_phase, first_event_at, latest_event_at, event_count, plot_twist_count, quality)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const tx = db.transaction((items: any[]) => {
        for (const t of items) {
          upsert.run(
            t._id, t.threadId ?? t._id, t.name, t.slug ?? "",
            t.thesis, t.counterThesis ?? null,
            JSON.stringify(t.entityKeys ?? []), JSON.stringify(t.topicTags ?? []),
            t.currentPhase, t.firstEventAt ?? null, t.latestEventAt ?? null,
            t.eventCount ?? 0, t.plotTwistCount ?? 0,
            JSON.stringify(t.quality ?? null),
          );
        }
      });
      tx(threads);
      counts.narrative_threads = threads.length;
      console.log(`[sync]   ✓ ${threads.length} narrative threads synced`);
    }

    await delay(100);

    // ── 3. Thread Events ──
    console.log("[sync] Fetching threads with events...");
    try {
      const threadsWithEvents = await callGateway(siteUrl, secret, "getThreadsWithEvents", { limit: 50 });
      if (Array.isArray(threadsWithEvents)) {
        const upsertEvent = db.prepare(`
          INSERT OR REPLACE INTO narrative_events_local
          (id, event_id, thread_id, headline, summary, significance, occurred_at,
           source_urls, citation_ids, claim_set, is_verified)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let eventCount = 0;
        const tx = db.transaction((items: any[]) => {
          for (const thread of items) {
            const events = thread.events ?? thread.recentEvents ?? [];
            for (const e of events) {
              upsertEvent.run(
                e._id, e.eventId ?? e._id, thread._id ?? thread.threadId,
                e.headline, e.summary ?? "",
                e.significance, e.occurredAt ?? Date.now(),
                JSON.stringify(e.sourceUrls ?? []), JSON.stringify(e.citationIds ?? []),
                JSON.stringify(e.claimSet ?? null),
                e.isVerified ? 1 : 0,
              );
              eventCount++;
            }
          }
        });
        tx(threadsWithEvents);
        counts.narrative_events = eventCount;
        console.log(`[sync]   ✓ ${eventCount} narrative events synced`);
      }
    } catch (err: any) {
      // This endpoint may require userId injection (GROUP B) — fall back gracefully
      console.log(`[sync]   → Events fetch skipped: ${err.message}`);
      counts.narrative_events = 0;
    }

    await delay(100);

    // ── 4. Feed (ForYou) ──
    console.log("[sync] Fetching ForYou feed...");
    try {
      const feed = await callGateway(siteUrl, secret, "getPublicForYouFeed");
      if (feed) {
        counts.feed_items = Array.isArray(feed) ? feed.length : 1;
        console.log(`[sync]   ✓ Feed data fetched (${counts.feed_items} items)`);
      }
    } catch (err: any) {
      console.log(`[sync]   → Feed fetch skipped: ${err.message}`);
    }

    // ── Complete sync run ──
    const durationMs = Date.now() - startMs;
    db.prepare(`
      UPDATE sync_runs SET status = 'success', completed_at = datetime('now'),
        tables_synced = ?, duration_ms = ?
      WHERE id = ?
    `).run(JSON.stringify(counts), durationMs, syncId);

    console.log(`\n[sync] ✓ Sync complete in ${durationMs}ms`);
    console.log("[sync] Summary:", JSON.stringify(counts, null, 2));

  } catch (err: any) {
    const durationMs = Date.now() - startMs;
    db.prepare(`
      UPDATE sync_runs SET status = 'error', completed_at = datetime('now'),
        error = ?, duration_ms = ?
      WHERE id = ?
    `).run(err.message, durationMs, syncId);

    console.error(`\n[sync] ✗ Sync failed after ${durationMs}ms: ${err.message}`);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("[sync] Fatal:", err.message);
  process.exitCode = 1;
});
