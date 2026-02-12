/**
 * NodeBench MCP — Local Dashboard Server
 *
 * Serves a local web dashboard showing the full UI Dive flywheel cycle:
 * explored routes, components, interactions, screenshots, bugs,
 * code locations, fixes, changelogs, generated tests, code reviews.
 *
 * Inspired by Serena MCP's local dashboard. Zero external deps — uses
 * Node's built-in http module + reads from existing SQLite DB.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type Database from "better-sqlite3";
import { getDashboardHtml } from "./html.js";

let _server: ReturnType<typeof createServer> | null = null;
let _port = 0;

/** Start the dashboard HTTP server. Returns the port it's listening on. */
export function startDashboardServer(db: Database.Database, preferredPort = 6274): Promise<number> {
  return new Promise((resolve, reject) => {
    if (_server) {
      resolve(_port);
      return;
    }

    _server = createServer((req, res) => handleRequest(db, req, res));

    _server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        // Try next port
        _server!.listen(preferredPort + 1, "127.0.0.1");
        _port = preferredPort + 1;
      } else {
        reject(err);
      }
    });

    _server.listen(preferredPort, "127.0.0.1", () => {
      _port = preferredPort;
      resolve(_port);
    });
  });
}

/** Stop the dashboard server */
export function stopDashboardServer(): void {
  if (_server) {
    _server.close();
    _server = null;
    _port = 0;
  }
}

/** Get the current dashboard URL */
export function getDashboardUrl(): string | null {
  return _port ? `http://127.0.0.1:${_port}` : null;
}

// ── Request Router ──────────────────────────────────────────────────

function handleRequest(db: Database.Database, req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || "/", `http://127.0.0.1:${_port}`);
  const path = url.pathname;

  // CORS for local dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (path === "/" || path === "/index.html") {
      serveHtml(res);
    } else if (path === "/api/sessions") {
      apiSessions(db, res);
    } else if (path.startsWith("/api/session/")) {
      const sessionId = decodeURIComponent(path.split("/api/session/")[1].split("/")[0]);
      const sub = path.split(sessionId + "/")[1] || "overview";
      apiSessionDetail(db, sessionId, sub, res);
    } else if (path === "/api/latest") {
      apiLatestSession(db, res);
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  } catch (err: any) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// ── HTML ────────────────────────────────────────────────────────────

function serveHtml(res: ServerResponse) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(getDashboardHtml());
}

// ── API: List sessions ──────────────────────────────────────────────

function apiSessions(db: Database.Database, res: ServerResponse) {
  const rows = db.prepare(`
    SELECT s.id, s.app_url, s.app_name, s.status, s.created_at, s.completed_at,
      (SELECT COUNT(*) FROM ui_dive_components WHERE session_id = s.id) as component_count,
      (SELECT COUNT(*) FROM ui_dive_bugs WHERE session_id = s.id) as bug_count,
      (SELECT COUNT(*) FROM ui_dive_bugs WHERE session_id = s.id AND status = 'resolved') as bugs_resolved,
      (SELECT COUNT(*) FROM ui_dive_interactions WHERE session_id = s.id) as interaction_count,
      (SELECT COUNT(*) FROM ui_dive_fix_verifications WHERE session_id = s.id) as fix_count,
      (SELECT COUNT(*) FROM ui_dive_code_reviews WHERE session_id = s.id) as review_count
    FROM ui_dive_sessions s
    ORDER BY s.created_at DESC
    LIMIT 50
  `).all();
  json(res, rows);
}

// ── API: Latest session redirect ────────────────────────────────────

function apiLatestSession(db: Database.Database, res: ServerResponse) {
  const row = db.prepare(`
    SELECT id FROM ui_dive_sessions ORDER BY created_at DESC LIMIT 1
  `).get() as { id: string } | undefined;

  if (!row) {
    json(res, { error: "No sessions found" }, 404);
    return;
  }

  // Return full overview for latest
  apiSessionDetail(db, row.id, "overview", res);
}

// ── API: Session detail ─────────────────────────────────────────────

function apiSessionDetail(db: Database.Database, sessionId: string, sub: string, res: ServerResponse) {
  switch (sub) {
    case "overview":
      return apiOverview(db, sessionId, res);
    case "components":
      return apiComponents(db, sessionId, res);
    case "bugs":
      return apiBugs(db, sessionId, res);
    case "interactions":
      return apiInteractions(db, sessionId, res);
    case "screenshots":
      return apiScreenshots(db, sessionId, res);
    case "code-locations":
      return apiCodeLocations(db, sessionId, res);
    case "fixes":
      return apiFixes(db, sessionId, res);
    case "changelogs":
      return apiChangelogs(db, sessionId, res);
    case "tests":
      return apiTests(db, sessionId, res);
    case "reviews":
      return apiReviews(db, sessionId, res);
    case "design-issues":
      return apiDesignIssues(db, sessionId, res);
    default:
      json(res, { error: `Unknown sub-route: ${sub}` }, 404);
  }
}

function apiOverview(db: Database.Database, sid: string, res: ServerResponse) {
  const session = db.prepare("SELECT * FROM ui_dive_sessions WHERE id = ?").get(sid);
  if (!session) { json(res, { error: "Session not found" }, 404); return; }

  const stats = {
    components: db.prepare("SELECT COUNT(*) as c FROM ui_dive_components WHERE session_id = ?").get(sid) as any,
    interactions: db.prepare("SELECT COUNT(*) as c FROM ui_dive_interactions WHERE session_id = ?").get(sid) as any,
    bugs: db.prepare("SELECT COUNT(*) as c FROM ui_dive_bugs WHERE session_id = ?").get(sid) as any,
    bugsOpen: db.prepare("SELECT COUNT(*) as c FROM ui_dive_bugs WHERE session_id = ? AND status = 'open'").get(sid) as any,
    bugsResolved: db.prepare("SELECT COUNT(*) as c FROM ui_dive_bugs WHERE session_id = ? AND status = 'resolved'").get(sid) as any,
    screenshots: db.prepare("SELECT COUNT(*) as c FROM ui_dive_screenshots WHERE session_id = ?").get(sid) as any,
    tests: db.prepare("SELECT COUNT(*) as c FROM ui_dive_interaction_tests WHERE session_id = ?").get(sid) as any,
    designIssues: db.prepare("SELECT COUNT(*) as c FROM ui_dive_design_issues WHERE session_id = ?").get(sid) as any,
    codeLocations: db.prepare("SELECT COUNT(*) as c FROM ui_dive_code_locations WHERE session_id = ?").get(sid) as any,
    fixes: db.prepare("SELECT COUNT(*) as c FROM ui_dive_fix_verifications WHERE session_id = ?").get(sid) as any,
    fixesVerified: db.prepare("SELECT COUNT(*) as c FROM ui_dive_fix_verifications WHERE session_id = ? AND verified = 1").get(sid) as any,
    changelogs: db.prepare("SELECT COUNT(*) as c FROM ui_dive_changelogs WHERE session_id = ?").get(sid) as any,
    generatedTests: db.prepare("SELECT COUNT(*) as c FROM ui_dive_generated_tests WHERE session_id = ?").get(sid) as any,
    codeReviews: db.prepare("SELECT COUNT(*) as c FROM ui_dive_code_reviews WHERE session_id = ?").get(sid) as any,
  };

  const latestReview = db.prepare(
    "SELECT score, summary, severity_counts, recommendations FROM ui_dive_code_reviews WHERE session_id = ? ORDER BY created_at DESC LIMIT 1"
  ).get(sid);

  json(res, {
    session,
    stats: Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, (v as any)?.c ?? 0])),
    latestReview,
  });
}

function apiComponents(db: Database.Database, sid: string, res: ServerResponse) {
  json(res, db.prepare(
    "SELECT * FROM ui_dive_components WHERE session_id = ? ORDER BY created_at"
  ).all(sid));
}

function apiBugs(db: Database.Database, sid: string, res: ServerResponse) {
  json(res, db.prepare(`
    SELECT b.*, c.name as component_name
    FROM ui_dive_bugs b
    LEFT JOIN ui_dive_components c ON b.component_id = c.id
    WHERE b.session_id = ?
    ORDER BY
      CASE b.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      b.created_at
  `).all(sid));
}

function apiInteractions(db: Database.Database, sid: string, res: ServerResponse) {
  json(res, db.prepare(`
    SELECT i.*, c.name as component_name
    FROM ui_dive_interactions i
    LEFT JOIN ui_dive_components c ON i.component_id = c.id
    WHERE i.session_id = ?
    ORDER BY i.sequence_num
  `).all(sid));
}

function apiScreenshots(db: Database.Database, sid: string, res: ServerResponse) {
  json(res, db.prepare(
    "SELECT id, session_id, component_id, label, route, file_path, width, height, created_at FROM ui_dive_screenshots WHERE session_id = ? ORDER BY created_at"
  ).all(sid));
}

function apiCodeLocations(db: Database.Database, sid: string, res: ServerResponse) {
  json(res, db.prepare(
    "SELECT * FROM ui_dive_code_locations WHERE session_id = ? ORDER BY created_at"
  ).all(sid));
}

function apiFixes(db: Database.Database, sid: string, res: ServerResponse) {
  json(res, db.prepare(`
    SELECT f.*, b.title as bug_title, b.severity as bug_severity, b.status as bug_status
    FROM ui_dive_fix_verifications f
    LEFT JOIN ui_dive_bugs b ON f.bug_id = b.id
    WHERE f.session_id = ?
    ORDER BY f.created_at
  `).all(sid));
}

function apiChangelogs(db: Database.Database, sid: string, res: ServerResponse) {
  json(res, db.prepare(
    "SELECT * FROM ui_dive_changelogs WHERE session_id = ? ORDER BY created_at DESC"
  ).all(sid));
}

function apiTests(db: Database.Database, sid: string, res: ServerResponse) {
  json(res, db.prepare(
    "SELECT * FROM ui_dive_generated_tests WHERE session_id = ? ORDER BY created_at"
  ).all(sid));
}

function apiReviews(db: Database.Database, sid: string, res: ServerResponse) {
  json(res, db.prepare(
    "SELECT * FROM ui_dive_code_reviews WHERE session_id = ? ORDER BY created_at DESC"
  ).all(sid));
}

function apiDesignIssues(db: Database.Database, sid: string, res: ServerResponse) {
  json(res, db.prepare(
    "SELECT * FROM ui_dive_design_issues WHERE session_id = ? ORDER BY created_at"
  ).all(sid));
}

// ── Helpers ─────────────────────────────────────────────────────────

function json(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}
