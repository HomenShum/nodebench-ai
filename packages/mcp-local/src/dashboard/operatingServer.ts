/**
 * NodeBench MCP — Operating Dashboard Server (Phase 10/11)
 *
 * Serves the ambient intelligence dashboard at port 6276 showing:
 *   1. Session Delta ("Since Your Last Session")
 *   2. Trajectory Scores (sparkline + dimensions)
 *   3. Event Ledger (causal events)
 *   4. Important Changes (with resolution)
 *   5. Path Replay (session navigation)
 *   6. Time Rollups (day/week/month/quarter/year)
 *   7. Packet Readiness (staleness tracking)
 *   8. Recent Actions (from tracking tools)
 *
 * All data from local SQLite (~/.nodebench/nodebench.db).
 * Zero external dependency at runtime — works fully offline.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type Database from "better-sqlite3";

// ── Founder Business Schema ───────────────────────────────────────────

function ensureFounderSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS founder_company (
      id TEXT PRIMARY KEY DEFAULT 'default',
      name TEXT NOT NULL,
      canonicalMission TEXT,
      wedge TEXT,
      companyState TEXT DEFAULT 'operating',
      identityConfidence REAL DEFAULT 0.7,
      updatedAt INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS founder_initiatives (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      objective TEXT,
      status TEXT DEFAULT 'active',
      ownerType TEXT DEFAULT 'founder',
      riskLevel TEXT DEFAULT 'medium',
      priorityScore REAL DEFAULT 5,
      latestSummary TEXT,
      updatedAt INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS founder_interventions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      priorityScore REAL DEFAULT 5,
      confidence REAL DEFAULT 0.5,
      status TEXT DEFAULT 'suggested',
      expectedImpact TEXT,
      updatedAt INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS founder_agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      agentType TEXT DEFAULT 'claude_code',
      status TEXT DEFAULT 'healthy',
      currentGoal TEXT,
      lastHeartbeatAt INTEGER,
      updatedAt INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS founder_competitors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      threat TEXT,
      opportunity TEXT,
      lastSignalAt INTEGER,
      updatedAt INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS founder_contradictions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT DEFAULT 'medium',
      affectedEntities TEXT,
      status TEXT DEFAULT 'active',
      detectedAt INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS founder_decisions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      rationale TEXT,
      status TEXT DEFAULT 'accepted',
      decidedAt INTEGER DEFAULT (strftime('%s','now') * 1000)
    );
  `);
}

function seedDemoDataIfEmpty(db: Database.Database): void {
  const row = safeGet(db, `SELECT COUNT(*) as count FROM founder_company`);
  if (row && (row as any).count > 0) return;

  const now = Date.now();

  // Company
  db.prepare(`INSERT INTO founder_company (id, name, canonicalMission, wedge, companyState, identityConfidence, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    'default', 'NodeBench AI',
    'Ambient operating intelligence for founders',
    'Entity-context layer for agent-native businesses',
    'operating', 0.78, now,
  );

  // Initiatives
  const initiatives = [
    { id: 'init-causal-memory', title: 'Phase 10: Causal Memory', objective: 'Build event-driven causal graph for entity state tracking', status: 'completed', ownerType: 'founder', riskLevel: 'low', priorityScore: 9.2, latestSummary: 'Shipped: causal events, state diffs, path replay, time rollups all live in local SQLite' },
    { id: 'init-ambient-intel', title: 'Phase 11: Ambient Intelligence', objective: 'Session delta, packet readiness, trajectory scoring from local data', status: 'active', ownerType: 'founder', riskLevel: 'medium', priorityScore: 9.0, latestSummary: 'Dashboard live at :6276, auto-refresh working, needs business layer' },
    { id: 'init-mcp-distribution', title: 'MCP Distribution', objective: 'Publish to npm, MCP Registry, cursor.directory, mcpservers.org', status: 'active', ownerType: 'founder', riskLevel: 'medium', priorityScore: 8.5, latestSummary: 'npm 2.31.0 published, Registry submission pending, SEO infra done' },
    { id: 'init-benchmark-suite', title: 'Benchmark Suite', objective: 'Comprehensive eval harness: SWE-bench, BFCL, GAIA, HumanEval, MCP-AgentBench', status: 'active', ownerType: 'founder', riskLevel: 'low', priorityScore: 7.8, latestSummary: '1510+ tests passing, 5 dataset adapters, comparative bench operational' },
    { id: 'init-dashboard-polish', title: 'Local Dashboard Polish', objective: 'Add business intelligence layer to operating dashboard', status: 'in_progress', ownerType: 'founder', riskLevel: 'low', priorityScore: 7.5, latestSummary: 'System intelligence sections complete, business layer in progress' },
  ];
  const initStmt = db.prepare(`INSERT INTO founder_initiatives (id, title, objective, status, ownerType, riskLevel, priorityScore, latestSummary, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const i of initiatives) {
    initStmt.run(i.id, i.title, i.objective, i.status, i.ownerType, i.riskLevel, i.priorityScore, i.latestSummary, now);
  }

  // Interventions
  const interventions = [
    { id: 'intv-live-demo', title: 'Ship live investigation on first click', description: 'Run Live Demo should trigger a real DeepTrace investigation, not navigate to static receipts', priorityScore: 9.5, confidence: 0.82, status: 'suggested', expectedImpact: 'Time-to-value drops from 30s to 5s, unlocks viral screenshot moments' },
    { id: 'intv-share-memo', title: 'One-click shareable Decision Memos', description: 'Generate a public URL that renders the memo without auth — the viral artifact', priorityScore: 8.8, confidence: 0.75, status: 'in_progress', expectedImpact: 'Each shared memo becomes a distribution channel, est. 3-5x referral lift' },
    { id: 'intv-daily-brief', title: 'Connect Research Hub to live signals', description: 'Daily brief with real news/signal feeds so there is always fresh content on return', priorityScore: 8.2, confidence: 0.68, status: 'suggested', expectedImpact: 'Return hook: users check daily, DAU/MAU ratio improves 2-3x' },
    { id: 'intv-voice-commands', title: 'Voice-first core actions', description: 'Investigate Acme AI or Run diligence on this company via voice — the OpenClaw pattern', priorityScore: 7.5, confidence: 0.55, status: 'suggested', expectedImpact: 'Hands-free use case opens mobile-first segment, differentiates from text-only tools' },
  ];
  const intvStmt = db.prepare(`INSERT INTO founder_interventions (id, title, description, priorityScore, confidence, status, expectedImpact, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const v of interventions) {
    intvStmt.run(v.id, v.title, v.description, v.priorityScore, v.confidence, v.status, v.expectedImpact, now);
  }

  // Agents
  const agents = [
    { id: 'agent-claude-code', name: 'Claude Code', agentType: 'claude_code', status: 'healthy', currentGoal: 'Building business intelligence dashboard layer', lastHeartbeatAt: now },
    { id: 'agent-background', name: 'Background Jobs', agentType: 'background_worker', status: 'healthy', currentGoal: 'Syncing daily brief and narrative from Convex', lastHeartbeatAt: now - 120_000 },
    { id: 'agent-openclaw', name: 'OpenClaw Bridge', agentType: 'openclaw', status: 'waiting', currentGoal: 'Awaiting command bridge connection', lastHeartbeatAt: now - 3_600_000 },
  ];
  const agentStmt = db.prepare(`INSERT INTO founder_agents (id, name, agentType, status, currentGoal, lastHeartbeatAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const a of agents) {
    agentStmt.run(a.id, a.name, a.agentType, a.status, a.currentGoal, a.lastHeartbeatAt, now);
  }

  // Competitors
  const competitors = [
    { id: 'comp-supermemory', name: 'Supermemory', description: 'Memory substrate for AI agents — persistent context across sessions', threat: 'Direct competitor on memory layer positioning, well-funded', opportunity: 'Their focus is generic memory; NodeBench is founder-specific operating intelligence', lastSignalAt: now - 86_400_000 * 3 },
    { id: 'comp-mastra', name: 'Mastra', description: 'Observational memory and workflow orchestration for agents', threat: 'Strong developer community, good DX, TypeScript-native', opportunity: 'Mastra is workflow-first; NodeBench is judgment-first with entity context', lastSignalAt: now - 86_400_000 * 5 },
    { id: 'comp-agentchattr', name: 'AgentChattr', description: 'Multi-agent coordination bus with shared state', threat: 'Novel coordination primitives, growing mindshare in multi-agent space', opportunity: 'Coordination without judgment is noise; NodeBench adds the decision layer', lastSignalAt: now - 86_400_000 * 7 },
  ];
  const compStmt = db.prepare(`INSERT INTO founder_competitors (id, name, description, threat, opportunity, lastSignalAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const c of competitors) {
    compStmt.run(c.id, c.name, c.description, c.threat, c.opportunity, c.lastSignalAt, now);
  }

  // Contradictions
  const contradictions = [
    { id: 'contra-positioning', title: 'Positioning vs build priorities', description: 'Marketing says Operating Intelligence for Founders but current build focuses on MCP tooling and benchmarks — the founder surface has demo data only', severity: 'high', affectedEntities: JSON.stringify(['founder_platform', 'mcp_distribution', 'landing_page']), status: 'active' },
    { id: 'contra-memory-scope', title: 'Memory layer scope creep', description: 'Entity-context layer keeps expanding (causal memory, tracking, packets, session delta) — risk of building infrastructure nobody uses', severity: 'medium', affectedEntities: JSON.stringify(['causal_memory', 'tracking', 'ambient_intelligence']), status: 'resolved' },
  ];
  const contraStmt = db.prepare(`INSERT INTO founder_contradictions (id, title, description, severity, affectedEntities, status, detectedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const x of contradictions) {
    contraStmt.run(x.id, x.title, x.description, x.severity, x.affectedEntities, x.status, now);
  }

  // Decisions
  const decisions = [
    { id: 'dec-local-first', title: 'Local-first SQLite over cloud-only Convex', rationale: 'Zero-dependency offline operation is the wedge — cloud sync is additive, not required', status: 'accepted' },
    { id: 'dec-304-tools', title: 'Ship 304 tools with progressive discovery', rationale: 'Large tool count signals depth; progressive discovery prevents overwhelm; toolset gating lets agents see only what they need', status: 'accepted' },
    { id: 'dec-founder-positioning', title: 'Reposition from Agent Trust to Operating Intelligence', rationale: 'Agent Trust Infrastructure is too abstract — Operating Intelligence for Founders is specific, testable, and resonates with ICP', status: 'accepted' },
    { id: 'dec-glass-card-dna', title: 'Glass card design DNA as brand signature', rationale: 'Consistent visual identity across all surfaces — dark bg, glass cards, terracotta accent — creates instant recognition', status: 'accepted' },
  ];
  const decStmt = db.prepare(`INSERT INTO founder_decisions (id, title, rationale, status, decidedAt) VALUES (?, ?, ?, ?, ?)`);
  for (const d of decisions) {
    decStmt.run(d.id, d.title, d.rationale, d.status, now - Math.floor(Math.random() * 86_400_000 * 14));
  }
}

let _server: ReturnType<typeof createServer> | null = null;
let _port = 0;
let _getHtml: (() => string) | null = null;

/** Start the operating dashboard server. Returns the port. */
export function startOperatingDashboardServer(
  db: Database.Database,
  preferredPort = 6276,
): Promise<number> {
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

/** Stop the operating dashboard server. */
export function stopOperatingDashboardServer(): void {
  if (_server) {
    _server.close();
    _server = null;
    _port = 0;
  }
}

/** Get the current operating dashboard URL. */
export function getOperatingDashboardUrl(): string | null {
  return _port ? `http://127.0.0.1:${_port}` : null;
}

// ── Helpers ────────────────────────────────────────────────────────────

function json(res: ServerResponse, data: unknown) {
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

function safeQuery(db: Database.Database, sql: string, params: any[] = []): any[] {
  try {
    return db.prepare(sql).all(...params);
  } catch {
    return [];
  }
}

function safeGet(db: Database.Database, sql: string, params: any[] = []): any | null {
  try {
    return db.prepare(sql).get(...params) ?? null;
  } catch {
    return null;
  }
}

// ── Request Router ─────────────────────────────────────────────────────

let _founderSchemaReady = false;

function handleRequest(db: Database.Database, req: IncomingMessage, res: ServerResponse) {
  // Ensure founder business tables exist (once per server lifetime)
  if (!_founderSchemaReady) {
    try {
      ensureFounderSchema(db);
      seedDemoDataIfEmpty(db);
      _founderSchemaReady = true;
    } catch {
      // Schema creation failed — continue serving system routes
    }
  }

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
    // ── HTML ──
    if (path === "/" || path === "/index.html") {
      serveHtml(res);
      return;
    }

    // ── Causal Memory API ──
    if (path === "/api/causal/events") return apiCausalEvents(db, url, res);
    if (path === "/api/causal/trajectory") return apiCausalTrajectory(db, res);
    if (path === "/api/causal/changes") return apiCausalChanges(db, url, res);
    if (path === "/api/causal/path") return apiCausalPath(db, url, res);
    if (path === "/api/causal/diffs") return apiCausalDiffs(db, url, res);
    if (path === "/api/causal/rollups") return apiCausalRollups(db, url, res);

    // ── Tracking API ──
    if (path === "/api/tracking/actions") return apiTrackingActions(db, url, res);
    if (path === "/api/tracking/milestones") return apiTrackingMilestones(db, res);

    // ── Ambient API ──
    if (path === "/api/ambient/session-delta") return apiSessionDelta(db, res);
    if (path === "/api/ambient/packets") return apiPacketReadiness(db, res);
    if (path === "/api/ambient/stats") return apiStats(db, res);

    // ── Business Intelligence API ──
    if (path === "/api/business/company") return apiBusinessCompany(db, res);
    if (path === "/api/business/initiatives") return apiBusinessInitiatives(db, res);
    if (path === "/api/business/interventions") return apiBusinessInterventions(db, res);
    if (path === "/api/business/agents") return apiBusinessAgents(db, res);
    if (path === "/api/business/competitors") return apiBusinessCompetitors(db, res);
    if (path === "/api/business/contradictions") return apiBusinessContradictions(db, res);
    if (path === "/api/business/decisions") return apiBusinessDecisions(db, res);
    if (path === "/api/business/summary") return apiBusinessSummary(db, res);

    // ── 404 ──
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

// ── HTML Serving ───────────────────────────────────────────────────────

async function serveHtml(res: ServerResponse) {
  if (!_getHtml) {
    try {
      const mod = await import("./operatingDashboardHtml.js");
      _getHtml = mod.getOperatingDashboardHtml;
    } catch {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Dashboard HTML module not found");
      return;
    }
  }
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache",
  });
  res.end(_getHtml());
}

// ── Causal Events API ──────────────────────────────────────────────────

function apiCausalEvents(db: Database.Database, url: URL, res: ServerResponse) {
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "30"), 100);
  const eventType = url.searchParams.get("eventType");

  let rows;
  if (eventType) {
    rows = safeQuery(
      db,
      `SELECT * FROM causal_events WHERE eventType = ? ORDER BY timestamp DESC LIMIT ?`,
      [eventType, limit],
    );
  } else {
    rows = safeQuery(
      db,
      `SELECT * FROM causal_events ORDER BY timestamp DESC LIMIT ?`,
      [limit],
    );
  }

  json(res, {
    events: rows.map((r: any) => ({
      id: r.eventId,
      eventType: r.eventType,
      actorType: r.actorType,
      entityType: r.entityType,
      entityId: r.entityId,
      summary: r.summary,
      details: r.details ? tryParseJson(r.details) : null,
      causedByEventId: r.causedByEventId,
      correlationId: r.correlationId,
      createdAt: r.timestamp,
    })),
    total: rows.length,
  });
}

// ── Trajectory API ─────────────────────────────────────────────────────

function apiCausalTrajectory(db: Database.Database, res: ServerResponse) {
  // Get trajectory from tracking milestones and actions as proxy
  const actions = safeQuery(
    db,
    `SELECT * FROM tracking_actions ORDER BY timestamp DESC LIMIT 30`,
  );

  const milestones = safeQuery(
    db,
    `SELECT * FROM tracking_milestones ORDER BY timestamp DESC LIMIT 10`,
  );

  // Build trajectory from action data
  const byDay: Record<string, { count: number; categories: Record<string, number> }> = {};
  for (const a of actions as any[]) {
    const day = new Date(a.timestamp).toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { count: 0, categories: {} };
    byDay[day].count++;
    const cat = a.category || "unknown";
    byDay[day].categories[cat] = (byDay[day].categories[cat] || 0) + 1;
  }

  const scores = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      actionsCount: data.count,
      categories: data.categories,
      // Heuristic score based on activity level
      score: Math.min(1, data.count / 10),
    }));

  json(res, { scores, milestones: milestones.length, totalActions: actions.length });
}

// ── Important Changes API ──────────────────────────────────────────────

function apiCausalChanges(db: Database.Database, url: URL, res: ServerResponse) {
  const status = url.searchParams.get("status");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);

  let rows;
  if (status) {
    rows = safeQuery(
      db,
      `SELECT * FROM causal_important_changes WHERE status = ? ORDER BY timestamp DESC LIMIT ?`,
      [status, limit],
    );
  } else {
    rows = safeQuery(
      db,
      `SELECT * FROM causal_important_changes ORDER BY timestamp DESC LIMIT ?`,
      [limit],
    );
  }

  // Count by status
  const statusCounts = safeQuery(
    db,
    `SELECT status, COUNT(*) as count FROM causal_important_changes GROUP BY status`,
  );

  json(res, {
    changes: rows.map((r: any) => ({
      id: r.changeId,
      changeCategory: r.changeCategory,
      impactScore: r.impactScore,
      impactReason: r.impactReason,
      affectedEntities: tryParseJson(r.affectedEntities) || [],
      suggestedAction: r.suggestedAction,
      status: r.status,
      createdAt: r.timestamp,
    })),
    statusCounts: Object.fromEntries(
      (statusCounts as any[]).map((r) => [r.status, r.count]),
    ),
    total: rows.length,
  });
}

// ── Path Replay API ────────────────────────────────────────────────────

function apiCausalPath(db: Database.Database, url: URL, res: ServerResponse) {
  const sessionId = url.searchParams.get("sessionId");

  let rows;
  if (sessionId) {
    rows = safeQuery(
      db,
      `SELECT * FROM causal_path_steps WHERE sessionId = ? ORDER BY stepIndex ASC`,
      [sessionId],
    );
  } else {
    // Get latest session
    const latestSession = safeGet(
      db,
      `SELECT sessionId FROM causal_path_steps ORDER BY timestamp DESC LIMIT 1`,
    );

    if (latestSession) {
      rows = safeQuery(
        db,
        `SELECT * FROM causal_path_steps WHERE sessionId = ? ORDER BY stepIndex ASC`,
        [(latestSession as any).sessionId],
      );
    } else {
      rows = [];
    }
  }

  json(res, {
    path: rows.map((r: any) => ({
      stepIndex: r.stepIndex,
      surfaceType: r.surfaceType,
      surfaceRef: r.surfaceRef,
      surfaceLabel: r.surfaceLabel,
      entityType: r.entityType,
      entityId: r.entityId,
      durationMs: r.durationMs,
      transitionFrom: r.transitionFrom,
      createdAt: r.timestamp,
    })),
    sessionId: rows.length > 0 ? (rows[0] as any).sessionId : null,
    totalSteps: rows.length,
  });
}

// ── State Diffs API ────────────────────────────────────────────────────

function apiCausalDiffs(db: Database.Database, url: URL, res: ServerResponse) {
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
  const entityType = url.searchParams.get("entityType");

  let rows;
  if (entityType) {
    rows = safeQuery(
      db,
      `SELECT * FROM causal_state_diffs WHERE entityType = ? ORDER BY timestamp DESC LIMIT ?`,
      [entityType, limit],
    );
  } else {
    rows = safeQuery(
      db,
      `SELECT * FROM causal_state_diffs ORDER BY timestamp DESC LIMIT ?`,
      [limit],
    );
  }

  json(res, {
    diffs: rows.map((r: any) => ({
      id: r.diffId,
      entityType: r.entityType,
      entityId: r.entityId,
      changeType: r.changeType,
      beforeState: tryParseJson(r.beforeState),
      afterState: tryParseJson(r.afterState),
      changedFields: tryParseJson(r.changedFields) || [],
      reason: r.reason,
      createdAt: r.timestamp,
    })),
    total: rows.length,
  });
}

// ── Time Rollups API ───────────────────────────────────────────────────

function apiCausalRollups(db: Database.Database, url: URL, res: ServerResponse) {
  // Compute rollups from tracking data
  const now = Date.now();
  const dayMs = 86_400_000;

  // Today's actions
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayActions = safeQuery(
    db,
    `SELECT category, COUNT(*) as count FROM tracking_actions WHERE timestamp >= ? GROUP BY category`,
    [todayStart],
  );

  // Yesterday's actions
  const yesterdayActions = safeQuery(
    db,
    `SELECT category, COUNT(*) as count FROM tracking_actions WHERE timestamp >= ? AND timestamp < ? GROUP BY category`,
    [todayStart - dayMs, todayStart],
  );

  // This week (last 7 days)
  const weekActions = safeQuery(
    db,
    `SELECT category, COUNT(*) as count FROM tracking_actions WHERE timestamp >= ? GROUP BY category`,
    [now - 7 * dayMs],
  );

  // Events today
  const todayEvents = safeGet(
    db,
    `SELECT COUNT(*) as count FROM causal_events WHERE timestamp >= ?`,
    [todayStart],
  );

  // Events yesterday
  const yesterdayEvents = safeGet(
    db,
    `SELECT COUNT(*) as count FROM causal_events WHERE timestamp >= ? AND timestamp < ?`,
    [todayStart - dayMs, todayStart],
  );

  // Changes today
  const todayChanges = safeGet(
    db,
    `SELECT COUNT(*) as count FROM causal_important_changes WHERE timestamp >= ?`,
    [todayStart],
  );

  // Diffs today
  const todayDiffs = safeGet(
    db,
    `SELECT COUNT(*) as count FROM causal_state_diffs WHERE timestamp >= ?`,
    [todayStart],
  );

  json(res, {
    daily: {
      current: {
        key: new Date().toISOString().slice(0, 10),
        actions: Object.fromEntries((todayActions as any[]).map((r) => [r.category, r.count])),
        totalActions: (todayActions as any[]).reduce((s, r) => s + r.count, 0),
        events: (todayEvents as any)?.count ?? 0,
        changes: (todayChanges as any)?.count ?? 0,
        diffs: (todayDiffs as any)?.count ?? 0,
      },
      prior: {
        key: new Date(todayStart - dayMs).toISOString().slice(0, 10),
        actions: Object.fromEntries((yesterdayActions as any[]).map((r) => [r.category, r.count])),
        totalActions: (yesterdayActions as any[]).reduce((s, r) => s + r.count, 0),
        events: (yesterdayEvents as any)?.count ?? 0,
      },
    },
    weekly: {
      actions: Object.fromEntries((weekActions as any[]).map((r) => [r.category, r.count])),
      totalActions: (weekActions as any[]).reduce((s, r) => s + r.count, 0),
    },
  });
}

// ── Tracking Actions API ───────────────────────────────────────────────

function apiTrackingActions(db: Database.Database, url: URL, res: ServerResponse) {
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "15"), 50);

  const rows = safeQuery(
    db,
    `SELECT * FROM tracking_actions ORDER BY timestamp DESC LIMIT ?`,
    [limit],
  );

  json(res, {
    actions: rows.map((r: any) => ({
      id: r.actionId,
      action: r.action,
      category: r.category,
      beforeState: r.beforeState,
      afterState: r.afterState,
      reasoning: r.reasoning,
      filesChanged: r.filesChanged,
      impactLevel: r.impactLevel,
      sessionId: r.sessionId,
      createdAt: r.timestamp,
    })),
    total: rows.length,
  });
}

// ── Tracking Milestones API ────────────────────────────────────────────

function apiTrackingMilestones(db: Database.Database, res: ServerResponse) {
  const rows = safeQuery(
    db,
    `SELECT * FROM tracking_milestones ORDER BY timestamp DESC LIMIT 10`,
  );

  json(res, {
    milestones: rows.map((r: any) => ({
      id: r.milestoneId,
      milestone: r.milestone,
      category: r.category,
      evidence: r.evidence,
      metrics: r.metrics,
      createdAt: r.timestamp,
    })),
    total: rows.length,
  });
}

// ── Session Delta API ──────────────────────────────────────────────────

function apiSessionDelta(db: Database.Database, res: ServerResponse) {
  const now = Date.now();
  const eightHoursAgo = now - 8 * 3_600_000;

  // Recent events
  const recentEvents = safeQuery(
    db,
    `SELECT eventType, COUNT(*) as count FROM causal_events WHERE timestamp >= ? GROUP BY eventType`,
    [eightHoursAgo],
  );

  // Recent changes
  const recentChanges = safeQuery(
    db,
    `SELECT * FROM causal_important_changes WHERE timestamp >= ? ORDER BY impactScore DESC`,
    [eightHoursAgo],
  );

  // Recent actions
  const recentActions = safeQuery(
    db,
    `SELECT category, COUNT(*) as count FROM tracking_actions WHERE timestamp >= ? GROUP BY category`,
    [eightHoursAgo],
  );

  // Recent diffs
  const recentDiffs = safeGet(
    db,
    `SELECT COUNT(*) as count FROM causal_state_diffs WHERE timestamp >= ?`,
    [eightHoursAgo],
  );

  // Total counts
  const totalEvents = (recentEvents as any[]).reduce((s, r) => s + r.count, 0);
  const totalActions = (recentActions as any[]).reduce((s, r) => s + r.count, 0);

  json(res, {
    sinceTimestamp: eightHoursAgo,
    totalChanges: totalEvents + totalActions + ((recentDiffs as any)?.count ?? 0),
    eventsByType: Object.fromEntries((recentEvents as any[]).map((r) => [r.eventType, r.count])),
    actionsByCategory: Object.fromEntries((recentActions as any[]).map((r) => [r.category, r.count])),
    importantChanges: recentChanges.map((r: any) => ({
      id: r.changeId,
      category: r.changeCategory,
      impactScore: r.impactScore,
      reason: r.impactReason,
      status: r.status,
    })),
    diffsCount: (recentDiffs as any)?.count ?? 0,
    eventsCount: totalEvents,
    actionsCount: totalActions,
  });
}

// ── Packet Readiness API ───────────────────────────────────────────────

function apiPacketReadiness(db: Database.Database, res: ServerResponse) {
  // Compute readiness from action/event counts
  const now = Date.now();
  const weekMs = 7 * 86_400_000;

  const weeklyActions = safeGet(
    db,
    `SELECT COUNT(*) as count FROM tracking_actions WHERE timestamp >= ?`,
    [now - weekMs],
  );

  const weeklyEvents = safeGet(
    db,
    `SELECT COUNT(*) as count FROM causal_events WHERE timestamp >= ?`,
    [now - weekMs],
  );

  const weeklyChanges = safeGet(
    db,
    `SELECT COUNT(*) as count FROM causal_important_changes WHERE timestamp >= ?`,
    [now - weekMs],
  );

  const actionCount = (weeklyActions as any)?.count ?? 0;
  const eventCount = (weeklyEvents as any)?.count ?? 0;
  const changeCount = (weeklyChanges as any)?.count ?? 0;

  const packets = [
    {
      type: "weekly_reset",
      changeCount: actionCount + eventCount,
      threshold: 10,
      readiness: Math.min(1, (actionCount + eventCount) / 10),
      reason: actionCount + eventCount > 5
        ? `${actionCount + eventCount} actions/events this week — time for a weekly reset`
        : null,
    },
    {
      type: "agent_brief",
      changeCount: eventCount,
      threshold: 5,
      readiness: Math.min(1, eventCount / 5),
      reason: eventCount > 3 ? `${eventCount} events since last brief` : null,
    },
    {
      type: "competitor_readout",
      changeCount: changeCount,
      threshold: 8,
      readiness: Math.min(1, changeCount / 8),
      reason: changeCount > 3 ? `${changeCount} important changes detected` : null,
    },
  ];

  json(res, { packets });
}

// ── Stats API ──────────────────────────────────────────────────────────

function apiStats(db: Database.Database, res: ServerResponse) {
  const eventCount = safeGet(db, `SELECT COUNT(*) as count FROM causal_events`);
  const actionCount = safeGet(db, `SELECT COUNT(*) as count FROM tracking_actions`);
  const milestoneCount = safeGet(db, `SELECT COUNT(*) as count FROM tracking_milestones`);
  const diffCount = safeGet(db, `SELECT COUNT(*) as count FROM causal_state_diffs`);
  const changeCount = safeGet(db, `SELECT COUNT(*) as count FROM causal_important_changes`);
  const pathCount = safeGet(db, `SELECT COUNT(*) as count FROM causal_path_steps`);

  json(res, {
    events: (eventCount as any)?.count ?? 0,
    actions: (actionCount as any)?.count ?? 0,
    milestones: (milestoneCount as any)?.count ?? 0,
    diffs: (diffCount as any)?.count ?? 0,
    changes: (changeCount as any)?.count ?? 0,
    pathSteps: (pathCount as any)?.count ?? 0,
    dashboardUrl: getOperatingDashboardUrl(),
    version: "2.34.0",
    toolCount: 325,
    tableCount: 30,
  });
}

// ── Business Intelligence API ──────────────────────────────────────────

function apiBusinessCompany(db: Database.Database, res: ServerResponse) {
  const row = safeGet(db, `SELECT * FROM founder_company WHERE id = 'default'`);
  json(res, { company: row || null });
}

function apiBusinessInitiatives(db: Database.Database, res: ServerResponse) {
  const rows = safeQuery(db, `SELECT * FROM founder_initiatives ORDER BY priorityScore DESC`);
  json(res, { initiatives: rows, total: rows.length });
}

function apiBusinessInterventions(db: Database.Database, res: ServerResponse) {
  const rows = safeQuery(db, `SELECT * FROM founder_interventions ORDER BY priorityScore DESC`);
  json(res, { interventions: rows, total: rows.length });
}

function apiBusinessAgents(db: Database.Database, res: ServerResponse) {
  const rows = safeQuery(db, `SELECT * FROM founder_agents ORDER BY updatedAt DESC`);
  json(res, { agents: rows, total: rows.length });
}

function apiBusinessCompetitors(db: Database.Database, res: ServerResponse) {
  const rows = safeQuery(db, `SELECT * FROM founder_competitors ORDER BY lastSignalAt DESC`);
  json(res, { competitors: rows, total: rows.length });
}

function apiBusinessContradictions(db: Database.Database, res: ServerResponse) {
  const rows = safeQuery(
    db,
    `SELECT * FROM founder_contradictions ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, detectedAt DESC`,
  );
  json(res, { contradictions: rows, total: rows.length });
}

function apiBusinessDecisions(db: Database.Database, res: ServerResponse) {
  const rows = safeQuery(db, `SELECT * FROM founder_decisions ORDER BY decidedAt DESC`);
  json(res, { decisions: rows, total: rows.length });
}

function apiBusinessSummary(db: Database.Database, res: ServerResponse) {
  const company = safeGet(db, `SELECT * FROM founder_company WHERE id = 'default'`);

  // Initiative counts by status
  const initCounts = safeQuery(
    db,
    `SELECT status, COUNT(*) as count FROM founder_initiatives GROUP BY status`,
  );
  const initiativesByStatus = Object.fromEntries(
    (initCounts as any[]).map((r) => [r.status, r.count]),
  );

  // Top 3 interventions
  const topInterventions = safeQuery(
    db,
    `SELECT id, title, priorityScore, confidence, status FROM founder_interventions ORDER BY priorityScore DESC LIMIT 3`,
  );

  // Agent health
  const agents = safeQuery(db, `SELECT id, name, status FROM founder_agents`);
  const healthyCount = (agents as any[]).filter((a) => a.status === "healthy").length;

  // Active contradictions
  const activeContradictions = safeGet(
    db,
    `SELECT COUNT(*) as count FROM founder_contradictions WHERE status = 'active'`,
  );

  // Competitor count
  const competitorCount = safeGet(
    db,
    `SELECT COUNT(*) as count FROM founder_competitors`,
  );

  json(res, {
    company: company || null,
    initiativesByStatus,
    topInterventions,
    agentHealth: { total: agents.length, healthy: healthyCount },
    activeContradictions: (activeContradictions as any)?.count ?? 0,
    competitorCount: (competitorCount as any)?.count ?? 0,
  });
}

// ── Utilities ──────────────────────────────────────────────────────────

function tryParseJson(str: string | null | undefined): any {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
