#!/usr/bin/env node
import { getDb } from "./dist/db.js";
import { getOperatingDashboardHtml } from "./dist/dashboard/operatingDashboardHtml.js";
import { createServer } from "node:http";

const db = getDb();
const html = getOperatingDashboardHtml();

function safeQuery(sql, params = []) {
  try { return db.prepare(sql).all(...params); } catch { return []; }
}
function safeGet(sql, params = []) {
  try { return db.prepare(sql).get(...params) ?? null; } catch { return null; }
}
function tryParseJson(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return str; }
}

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:6292");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  if (url.pathname === "/api/ambient/session-delta") {
    const now = Date.now();
    const since = now - 8 * 3600000;
    const events = safeQuery("SELECT eventType, COUNT(*) as count FROM causal_events WHERE timestamp >= ? GROUP BY eventType", [since]);
    const actions = safeQuery("SELECT category, COUNT(*) as count FROM tracking_actions WHERE timestamp >= ? GROUP BY category", [since]);
    const changes = safeQuery("SELECT * FROM causal_important_changes WHERE timestamp >= ? ORDER BY impactScore DESC", [since]);
    const diffs = safeGet("SELECT COUNT(*) as count FROM causal_state_diffs WHERE timestamp >= ?", [since]);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      sinceTimestamp: since,
      totalChanges: events.reduce((s, r) => s + r.count, 0) + actions.reduce((s, r) => s + r.count, 0) + (diffs?.count ?? 0),
      eventsByType: Object.fromEntries(events.map(r => [r.eventType, r.count])),
      actionsByCategory: Object.fromEntries(actions.map(r => [r.category, r.count])),
      importantChanges: changes.map(r => ({ id: r.changeId, category: r.changeCategory, impactScore: r.impactScore, reason: r.impactReason, status: r.status })),
      diffsCount: diffs?.count ?? 0,
      eventsCount: events.reduce((s, r) => s + r.count, 0),
      actionsCount: actions.reduce((s, r) => s + r.count, 0),
    }));
    return;
  }

  if (url.pathname === "/api/causal/events") {
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "30"), 100);
    const rows = safeQuery("SELECT * FROM causal_events ORDER BY timestamp DESC LIMIT ?", [limit]);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ events: rows.map(r => ({ id: r.eventId, eventType: r.eventType, actorType: r.actorType, entityType: r.entityType, entityId: r.entityId, summary: r.summary, createdAt: r.timestamp })), total: rows.length }));
    return;
  }

  if (url.pathname === "/api/causal/trajectory") {
    const actions = safeQuery("SELECT * FROM tracking_actions ORDER BY timestamp DESC LIMIT 30");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ scores: [], milestones: 0, totalActions: actions.length }));
    return;
  }

  if (url.pathname === "/api/causal/changes") {
    const rows = safeQuery("SELECT * FROM causal_important_changes ORDER BY timestamp DESC LIMIT 20");
    const counts = safeQuery("SELECT status, COUNT(*) as count FROM causal_important_changes GROUP BY status");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ changes: rows.map(r => ({ id: r.changeId, changeCategory: r.changeCategory, impactScore: r.impactScore, impactReason: r.impactReason, affectedEntities: tryParseJson(r.affectedEntities) || [], suggestedAction: r.suggestedAction, status: r.status, createdAt: r.timestamp })), statusCounts: Object.fromEntries(counts.map(r => [r.status, r.count])), total: rows.length }));
    return;
  }

  if (url.pathname === "/api/causal/path") {
    const latest = safeGet("SELECT sessionId FROM causal_path_steps ORDER BY timestamp DESC LIMIT 1");
    const rows = latest ? safeQuery("SELECT * FROM causal_path_steps WHERE sessionId = ? ORDER BY stepIndex ASC", [latest.sessionId]) : [];
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ path: rows.map(r => ({ stepIndex: r.stepIndex, surfaceType: r.surfaceType, surfaceRef: r.surfaceRef, surfaceLabel: r.surfaceLabel, durationMs: r.durationMs, createdAt: r.timestamp })), totalSteps: rows.length }));
    return;
  }

  if (url.pathname === "/api/causal/rollups") {
    const todayStart = new Date().setHours(0,0,0,0);
    const todayActions = safeQuery("SELECT category, COUNT(*) as count FROM tracking_actions WHERE timestamp >= ? GROUP BY category", [todayStart]);
    const todayEvents = safeGet("SELECT COUNT(*) as count FROM causal_events WHERE timestamp >= ?", [todayStart]);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ daily: { current: { key: new Date().toISOString().slice(0,10), actions: Object.fromEntries(todayActions.map(r=>[r.category,r.count])), totalActions: todayActions.reduce((s,r)=>s+r.count,0), events: todayEvents?.count ?? 0 }, prior: { key: "yesterday", totalActions: 0, events: 0 } } }));
    return;
  }

  if (url.pathname === "/api/tracking/actions") {
    const rows = safeQuery("SELECT * FROM tracking_actions ORDER BY timestamp DESC LIMIT 15");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ actions: rows.map(r => ({ id: r.actionId, action: r.action, category: r.category, beforeState: r.beforeState, afterState: r.afterState, reasoning: r.reasoning, impactLevel: r.impactLevel, createdAt: r.timestamp })), total: rows.length }));
    return;
  }

  if (url.pathname === "/api/ambient/packets") {
    const ac = safeGet("SELECT COUNT(*) as c FROM tracking_actions WHERE timestamp >= ?", [Date.now()-7*86400000]);
    const ec = safeGet("SELECT COUNT(*) as c FROM causal_events WHERE timestamp >= ?", [Date.now()-7*86400000]);
    const total = (ac?.c ?? 0) + (ec?.c ?? 0);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ packets: [
      { type: "weekly_reset", changeCount: total, threshold: 10, readiness: Math.min(1, total/10), reason: total > 5 ? `${total} actions/events this week` : null },
      { type: "agent_brief", changeCount: ec?.c ?? 0, threshold: 5, readiness: Math.min(1, (ec?.c??0)/5), reason: null },
    ]}));
    return;
  }

  if (url.pathname === "/api/ambient/stats") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      events: (safeGet("SELECT COUNT(*) as c FROM causal_events"))?.c ?? 0,
      actions: (safeGet("SELECT COUNT(*) as c FROM tracking_actions"))?.c ?? 0,
      milestones: (safeGet("SELECT COUNT(*) as c FROM tracking_milestones"))?.c ?? 0,
      diffs: (safeGet("SELECT COUNT(*) as c FROM causal_state_diffs"))?.c ?? 0,
      changes: (safeGet("SELECT COUNT(*) as c FROM causal_important_changes"))?.c ?? 0,
      version: "2.34.0", toolCount: 326, tableCount: 30,
    }));
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ data: [], total: 0 }));
});

server.listen(6292, "127.0.0.1", () => {
  console.log("Operating Dashboard: http://127.0.0.1:6292");
});
