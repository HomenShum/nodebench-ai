/**
 * NodeBench MCP — Local Daily Brief Dashboard Server
 *
 * Serves a local-first dashboard at port 6275 showing:
 *   1. Daily Brief (metrics, features, source summary)
 *   2. Narrative Lanes (threads by phase, events, claims)
 *   3. Ops View (sync status, tool frequency, verification cycles)
 *
 * All data from local SQLite (~/.nodebench/nodebench.db).
 * Zero Convex dependency at runtime — works fully offline.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type Database from "better-sqlite3";
import { getBriefDashboardHtml } from "./briefHtml.js";

let _server: ReturnType<typeof createServer> | null = null;
let _port = 0;

/** Start the brief dashboard HTTP server. Returns the port it's listening on. */
export function startBriefDashboardServer(db: Database.Database, preferredPort = 6275): Promise<number> {
  return new Promise((resolve, reject) => {
    if (_server) {
      resolve(_port);
      return;
    }

    _server = createServer((req, res) => handleRequest(db, req, res));

    let attempts = 0;
    const maxRetries = 5;

    function tryListen(port: number) {
      _server!.once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE" && attempts < maxRetries) {
          attempts++;
          tryListen(port + 1);
        } else {
          reject(err);
        }
      });

      _server!.listen(port, "127.0.0.1", () => {
        _port = port;
        resolve(port);
      });
    }

    tryListen(preferredPort);
  });
}

/** Stop the brief dashboard server */
export function stopBriefDashboardServer(): void {
  if (_server) {
    _server.close();
    _server = null;
    _port = 0;
  }
}

/** Get the current brief dashboard URL */
export function getBriefDashboardUrl(): string | null {
  return _port ? `http://127.0.0.1:${_port}` : null;
}

// ── Helpers ────────────────────────────────────────────────────────────

function json(res: ServerResponse, data: unknown) {
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

// ── Request Router ─────────────────────────────────────────────────────

function handleRequest(db: Database.Database, req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || "/", `http://127.0.0.1:${_port}`);
  const path = url.pathname;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (path === "/" || path === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(getBriefDashboardHtml());

    } else if (path === "/api/brief/latest") {
      apiBriefLatest(db, res);

    } else if (path.startsWith("/api/brief/date/")) {
      const date = decodeURIComponent(path.split("/api/brief/date/")[1]);
      apiBriefByDate(db, date, res);

    } else if (path.startsWith("/api/brief/memories/")) {
      const date = decodeURIComponent(path.split("/api/brief/memories/")[1]);
      apiBriefMemories(db, date, res);

    } else if (path === "/api/narrative/threads") {
      const phase = url.searchParams.get("phase") || undefined;
      apiNarrativeThreads(db, res, phase);

    } else if (path.startsWith("/api/narrative/thread/")) {
      const id = decodeURIComponent(path.split("/api/narrative/thread/")[1]);
      apiNarrativeThread(db, id, res);

    } else if (path === "/api/narrative/events/recent") {
      const limit = parseInt(url.searchParams.get("limit") || "30", 10);
      apiRecentEvents(db, limit, res);

    } else if (path === "/api/ops/sync-status") {
      apiSyncStatus(db, res);

    } else if (path === "/api/ops/stats") {
      apiOpsStats(db, res);

    } else if (path === "/api/audience/event" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          apiLogAudienceEvent(db, data, res);
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;

    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  } catch (err: any) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// ── Brief APIs ─────────────────────────────────────────────────────────

function apiBriefLatest(db: Database.Database, res: ServerResponse) {
  const row = db.prepare(
    "SELECT * FROM brief_snapshots ORDER BY generated_at DESC LIMIT 1"
  ).get() as any;

  if (!row) {
    json(res, { empty: true, message: "No brief snapshots synced yet. Run: npm run local:sync" });
    return;
  }

  json(res, {
    ...row,
    dashboard_metrics: safeParseJson(row.dashboard_metrics),
    source_summary: safeParseJson(row.source_summary),
  });
}

function apiBriefByDate(db: Database.Database, date: string, res: ServerResponse) {
  const row = db.prepare(
    "SELECT * FROM brief_snapshots WHERE date_string = ? ORDER BY version DESC LIMIT 1"
  ).get(date) as any;

  if (!row) {
    json(res, { empty: true, date });
    return;
  }

  json(res, {
    ...row,
    dashboard_metrics: safeParseJson(row.dashboard_metrics),
    source_summary: safeParseJson(row.source_summary),
  });
}

function apiBriefMemories(db: Database.Database, date: string, res: ServerResponse) {
  const memories = db.prepare(
    "SELECT * FROM brief_memories WHERE date_string = ? ORDER BY rowid DESC"
  ).all() as any[];

  const memoryIds = memories.map((m: any) => m.id);
  let tasks: any[] = [];
  if (memoryIds.length > 0) {
    const placeholders = memoryIds.map(() => "?").join(",");
    tasks = db.prepare(
      `SELECT * FROM brief_task_results WHERE memory_id IN (${placeholders}) ORDER BY rowid`
    ).all(...memoryIds) as any[];
  }

  json(res, {
    memories: memories.map((m: any) => ({
      ...m,
      features: safeParseJson(m.features),
      progress_log: safeParseJson(m.progress_log),
    })),
    tasks: tasks.map((t: any) => ({
      ...t,
      citations: safeParseJson(t.citations),
      artifacts: safeParseJson(t.artifacts),
    })),
  });
}

// ── Narrative APIs ─────────────────────────────────────────────────────

function apiNarrativeThreads(db: Database.Database, res: ServerResponse, phase?: string) {
  const query = phase
    ? "SELECT * FROM narrative_threads_local WHERE current_phase = ? ORDER BY latest_event_at DESC"
    : "SELECT * FROM narrative_threads_local ORDER BY latest_event_at DESC";

  const rows = phase
    ? db.prepare(query).all(phase) as any[]
    : db.prepare(query).all() as any[];

  json(res, rows.map((r: any) => ({
    ...r,
    entity_keys: safeParseJson(r.entity_keys),
    topic_tags: safeParseJson(r.topic_tags),
    quality: safeParseJson(r.quality),
  })));
}

function apiNarrativeThread(db: Database.Database, id: string, res: ServerResponse) {
  const thread = db.prepare(
    "SELECT * FROM narrative_threads_local WHERE id = ? OR slug = ?"
  ).get(id, id) as any;

  if (!thread) {
    json(res, { empty: true, id });
    return;
  }

  const events = db.prepare(
    "SELECT * FROM narrative_events_local WHERE thread_id = ? ORDER BY occurred_at DESC LIMIT 50"
  ).all(thread.id) as any[];

  json(res, {
    thread: {
      ...thread,
      entity_keys: safeParseJson(thread.entity_keys),
      topic_tags: safeParseJson(thread.topic_tags),
      quality: safeParseJson(thread.quality),
    },
    events: events.map((e: any) => ({
      ...e,
      source_urls: safeParseJson(e.source_urls),
      citation_ids: safeParseJson(e.citation_ids),
      claim_set: safeParseJson(e.claim_set),
    })),
  });
}

function apiRecentEvents(db: Database.Database, limit: number, res: ServerResponse) {
  const events = db.prepare(
    "SELECT * FROM narrative_events_local ORDER BY occurred_at DESC LIMIT ?"
  ).all(Math.min(limit, 100)) as any[];

  json(res, events.map((e: any) => ({
    ...e,
    source_urls: safeParseJson(e.source_urls),
    citation_ids: safeParseJson(e.citation_ids),
    claim_set: safeParseJson(e.claim_set),
  })));
}

// ── Ops APIs ───────────────────────────────────────────────────────────

function apiSyncStatus(db: Database.Database, res: ServerResponse) {
  const latest = db.prepare(
    "SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT 1"
  ).get() as any;

  const history = db.prepare(
    "SELECT id, started_at, status, duration_ms, tables_synced FROM sync_runs ORDER BY started_at DESC LIMIT 10"
  ).all() as any[];

  json(res, {
    latest: latest ? { ...latest, tables_synced: safeParseJson(latest.tables_synced) } : null,
    history: history.map((r: any) => ({ ...r, tables_synced: safeParseJson(r.tables_synced) })),
  });
}

function apiOpsStats(db: Database.Database, res: ServerResponse) {
  // Tool call frequency (last 24h)
  let toolStats: any[] = [];
  try {
    toolStats = db.prepare(`
      SELECT tool_name, COUNT(*) as count, AVG(duration_ms) as avg_duration,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
      FROM tool_call_log
      WHERE created_at > datetime('now', '-1 day')
      GROUP BY tool_name
      ORDER BY count DESC
      LIMIT 20
    `).all() as any[];
  } catch { /* tool_call_log may not exist */ }

  // Active verification cycles
  let activeCycles: any[] = [];
  try {
    activeCycles = db.prepare(`
      SELECT id, title, status, created_at
      FROM verification_cycles
      WHERE status NOT IN ('completed', 'abandoned')
      ORDER BY created_at DESC
      LIMIT 5
    `).all() as any[];
  } catch { /* verification_cycles may not exist */ }

  // Audience events today
  let audienceStats: any = null;
  try {
    const todayEvents = db.prepare(`
      SELECT COUNT(*) as count,
        SUM(CASE WHEN is_public = 1 THEN 1 ELSE 0 END) as public_triggers
      FROM audience_events
      WHERE created_at > datetime('now', '-1 day')
    `).get() as any;

    if (todayEvents && todayEvents.count > 0) {
      audienceStats = {
        triggeredToday: todayEvents.public_triggers ?? 0,
        totalEvents: todayEvents.count,
      };
    }
  } catch { /* audience_events may not exist */ }

  // Brief + thread counts
  let briefCount = 0;
  let threadCount = 0;
  let eventCount = 0;
  try {
    briefCount = (db.prepare("SELECT COUNT(*) as c FROM brief_snapshots").get() as any)?.c ?? 0;
    threadCount = (db.prepare("SELECT COUNT(*) as c FROM narrative_threads_local").get() as any)?.c ?? 0;
    eventCount = (db.prepare("SELECT COUNT(*) as c FROM narrative_events_local").get() as any)?.c ?? 0;
  } catch { /* tables may not exist */ }

  json(res, {
    toolCallFrequency: toolStats,
    activeCycles,
    privacyMode: audienceStats,
    dataCounts: { briefs: briefCount, threads: threadCount, events: eventCount },
  });
}

// ── Audience Event Logging ──────────────────────────────────────────────

function apiLogAudienceEvent(db: Database.Database, data: any, res: ServerResponse) {
  const id = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    db.prepare(`
      INSERT INTO audience_events (id, event_type, viewer_count, is_public)
      VALUES (?, ?, ?, ?)
    `).run(id, data.event_type ?? "unknown", data.viewer_count ?? 0, data.is_public ? 1 : 0);
    json(res, { success: true, id });
  } catch (err: any) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// ── Utilities ──────────────────────────────────────────────────────────

function safeParseJson(s: string | null | undefined): unknown {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return s; }
}
