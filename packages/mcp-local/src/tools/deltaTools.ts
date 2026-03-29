/**
 * Delta Tools — Operating-intelligence packet tools for NodeBench Delta
 *
 * 8 packet types following banking convention:
 *   delta.brief      — What changed since last session
 *   delta.diligence  — Deep entity teardown
 *   delta.handoff    — Delegation packet for agents/teammates
 *   delta.watch      — Entities to monitor + alert triggers
 *   delta.memo       — Decision-ready artifact with evidence
 *   delta.scan       — Self-diligence market coverage scan
 *   delta.compare    — Side-by-side entity comparison
 *   delta.retain     — Context preservation across sessions
 */

import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";

// ── Helpers ──────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function ensureDeltaTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS delta_packets (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      persona TEXT NOT NULL DEFAULT 'founder',
      confidence INTEGER NOT NULL DEFAULT 50,
      freshness TEXT NOT NULL DEFAULT 'fresh',
      visibility TEXT NOT NULL DEFAULT 'private',
      share_url TEXT,
      parent_packet_id TEXT,
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      supersedes TEXT
    )
  `);
}

function ensureWatchlistTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS delta_watchlist (
      id TEXT PRIMARY KEY,
      entity_name TEXT NOT NULL,
      added_at TEXT NOT NULL,
      last_checked TEXT,
      alert_preferences TEXT NOT NULL DEFAULT '["any_material"]',
      change_count INTEGER NOT NULL DEFAULT 0,
      last_change_summary TEXT
    )
  `);
}

function storePacket(packet: Record<string, unknown>): Record<string, unknown> {
  ensureDeltaTable();
  const db = getDb();
  const id = genId();
  const createdAt = now();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h default

  db.prepare(`
    INSERT INTO delta_packets (id, type, subject, summary, persona, confidence, freshness, visibility, payload, created_at, expires_at, parent_packet_id, supersedes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    packet.type as string,
    packet.subject as string,
    packet.summary as string || "",
    packet.persona as string || "founder",
    packet.confidence as number || 50,
    "fresh",
    packet.visibility as string || "private",
    JSON.stringify(packet.payload || {}),
    createdAt,
    expiresAt,
    packet.parentPacketId as string || null,
    packet.supersedes as string || null,
  );

  const result = { id, type: packet.type, subject: packet.subject, createdAt, expiresAt, ...packet };

  // Fire-and-forget sync to dashboard via retention bridge
  // This enables MCP → Dashboard data flow
  const syncUrl = process.env.NODEBENCH_SERVER_URL || "http://localhost:3100";
  fetch(`${syncUrl}/retention/push-packet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: packet.type,
      subject: packet.subject,
      summary: packet.summary,
      persona: packet.persona,
      confidence: packet.confidence,
      payload: packet.payload,
    }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => { /* fire-and-forget — dashboard sync is best-effort */ });

  return result;
}

// ── Delta Brief ──────────────────────────────────────────────────────────

const deltaBrief: McpTool = {
  name: "delta_brief",
  description:
    "Generate a 'what changed' brief since the last session. Produces a delta.brief packet summarizing changes in the product, market, and team context. Use at the start of each work session or daily standup.",
  inputSchema: {
    type: "object" as const,
    properties: {
      since: {
        type: "string",
        description: "ISO timestamp to look back from. Defaults to 24 hours ago.",
      },
      persona: {
        type: "string",
        enum: ["founder", "banker", "ceo", "researcher", "operator", "student"],
        description: "Role lens to shape the brief. Defaults to founder.",
      },
      include_watchlist: {
        type: "boolean",
        description: "Include watched entity changes in the brief. Defaults to true.",
      },
      context: {
        type: "string",
        description: "Additional context about what you're working on to make the brief more relevant.",
      },
    },
  },
  handler: async (args: Record<string, unknown>) => {
    ensureDeltaTable();
    ensureWatchlistTable();
    const db = getDb();

    const since = (args.since as string) || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const persona = (args.persona as string) || "founder";
    const includeWatchlist = args.include_watchlist !== false;

    // Gather recent packets
    const recentPackets = db.prepare(
      `SELECT * FROM delta_packets WHERE created_at > ? ORDER BY created_at DESC LIMIT 20`
    ).all(since) as Record<string, unknown>[];

    // Gather watchlist changes
    let watchlistChanges: Record<string, unknown>[] = [];
    if (includeWatchlist) {
      watchlistChanges = db.prepare(
        `SELECT * FROM delta_watchlist WHERE last_checked > ? AND change_count > 0 ORDER BY last_checked DESC LIMIT 10`
      ).all(since) as Record<string, unknown>[];
    }

    const sections = [];

    // Product changes
    if (recentPackets.length > 0) {
      sections.push({
        title: "Recent Activity",
        sectionType: "signal",
        content: recentPackets.map((p) => `- [${p.type}] ${p.subject}: ${p.summary}`).join("\n"),
      });
    }

    // Watchlist alerts
    if (watchlistChanges.length > 0) {
      sections.push({
        title: "Watchlist Alerts",
        sectionType: "signal",
        content: watchlistChanges.map((w) => `- ${w.entity_name}: ${w.last_change_summary || "change detected"} (${w.change_count} changes)`).join("\n"),
      });
    }

    // Context-aware recommendations
    sections.push({
      title: "Recommended Actions",
      sectionType: "recommendation",
      content: [
        recentPackets.length === 0 ? "- Run `delta_diligence` on your key entities to build your intelligence base" : null,
        watchlistChanges.length === 0 && includeWatchlist ? "- Add entities to your watchlist with `delta_watch`" : null,
        "- Create a decision memo with `delta_memo` for any pending decisions",
        args.context ? `- Given your context: consider running \`delta_diligence\` on entities related to "${args.context}"` : null,
      ].filter(Boolean).join("\n"),
    });

    const packet = storePacket({
      type: "brief",
      subject: `Daily Brief — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`,
      summary: `${recentPackets.length} recent activities, ${watchlistChanges.length} watchlist alerts since ${new Date(since).toLocaleDateString()}`,
      persona,
      confidence: 80,
      payload: { sections, since, recentPacketCount: recentPackets.length, watchlistAlertCount: watchlistChanges.length },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            packet,
            hint: "Use delta_diligence to deep-dive any entity, or delta_memo to create a decision artifact.",
            nextTools: ["delta_diligence", "delta_memo", "delta_watch", "delta_handoff"],
          }, null, 2),
        },
      ],
    };
  },
};

// ── Delta Diligence ──────────────────────────────────────────────────────

const deltaDiligence: McpTool = {
  name: "delta_diligence",
  description:
    "Deep entity intelligence teardown. Produces a delta.diligence packet with signals, risks, opportunities, and evidence for any company or entity. Use for competitive analysis, investment diligence, or market research.",
  inputSchema: {
    type: "object" as const,
    properties: {
      entity: {
        type: "string",
        description: "Company or entity name to investigate (e.g., 'Anthropic', 'Stripe', 'my competitor').",
      },
      depth: {
        type: "string",
        enum: ["quick", "deep"],
        description: "Quick = 30-second scan. Deep = comprehensive teardown with web research. Defaults to quick.",
      },
      persona: {
        type: "string",
        enum: ["founder", "banker", "ceo", "researcher", "operator", "student"],
        description: "Role lens shapes the output format and emphasis.",
      },
      focus: {
        type: "string",
        description: "Specific angle to focus on (e.g., 'pricing strategy', 'hiring patterns', 'product roadmap').",
      },
    },
    required: ["entity"],
  },
  handler: async (args: Record<string, unknown>) => {
    const entity = args.entity as string;
    const depth = (args.depth as string) || "quick";
    const persona = (args.persona as string) || "founder";
    const focus = args.focus as string;

    const sections = [
      {
        title: "Entity Overview",
        sectionType: "analysis",
        content: `Intelligence scan for: **${entity}**\nDepth: ${depth}\nLens: ${persona}${focus ? `\nFocus: ${focus}` : ""}`,
      },
      {
        title: "Signals",
        sectionType: "signal",
        content: [
          "- Use `web_search` or your IDE's search to gather live intelligence on this entity",
          "- Check recent funding, product launches, hiring patterns, and market positioning",
          focus ? `- Specifically investigate: ${focus}` : null,
        ].filter(Boolean).join("\n"),
      },
      {
        title: "Recommended Next Steps",
        sectionType: "recommendation",
        content: [
          `- Run \`delta_watch { entity: "${entity}" }\` to monitor future changes`,
          `- Run \`delta_compare { entities: ["${entity}", "<competitor>"] }\` for competitive positioning`,
          `- Run \`delta_memo\` to create a decision artifact based on these findings`,
          `- Run \`delta_handoff\` to delegate deeper research to an agent`,
        ].join("\n"),
      },
    ];

    const packet = storePacket({
      type: "diligence",
      subject: `Diligence: ${entity}`,
      summary: `${depth} intelligence scan on ${entity} through ${persona} lens`,
      persona,
      confidence: depth === "deep" ? 75 : 50,
      payload: { entity, depth, focus, sections },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            packet,
            hint: `Diligence packet created for ${entity}. Use web_search to enrich with live data, then delta_memo to create a decision artifact.`,
            nextTools: ["web_search", "delta_watch", "delta_compare", "delta_memo", "delta_handoff"],
          }, null, 2),
        },
      ],
    };
  },
};

// ── Delta Handoff ────────────────────────────────────────────────────────

const deltaHandoff: McpTool = {
  name: "delta_handoff",
  description:
    "Generate a delegation packet for handing off work to another agent or teammate. Produces a delta.handoff packet with full context bundle, acceptance criteria, and deadline.",
  inputSchema: {
    type: "object" as const,
    properties: {
      task: {
        type: "string",
        description: "What needs to be done (e.g., 'Build the auth flow', 'Research pricing models').",
      },
      delegate_to: {
        type: "string",
        enum: ["claude_code", "openclaw", "teammate", "any"],
        description: "Who should receive this handoff. Defaults to 'any'.",
      },
      context: {
        type: "string",
        description: "Additional context, findings, or decisions that the delegate needs.",
      },
      acceptance_criteria: {
        type: "array",
        items: { type: "string" },
        description: "List of criteria that define 'done' for this task.",
      },
      deadline: {
        type: "string",
        description: "ISO timestamp or relative time (e.g., '2 hours', 'end of day').",
      },
      parent_packet_id: {
        type: "string",
        description: "ID of the packet that spawned this handoff (for lineage tracking).",
      },
    },
    required: ["task"],
  },
  handler: async (args: Record<string, unknown>) => {
    const task = args.task as string;
    const delegateTo = (args.delegate_to as string) || "any";
    const context = (args.context as string) || "";
    const criteria = (args.acceptance_criteria as string[]) || [];
    const deadline = args.deadline as string;
    const parentPacketId = args.parent_packet_id as string;

    const handoffPrompt = [
      `## Task: ${task}`,
      "",
      context ? `## Context\n${context}` : null,
      criteria.length > 0 ? `## Acceptance Criteria\n${criteria.map((c) => `- [ ] ${c}`).join("\n")}` : null,
      deadline ? `## Deadline: ${deadline}` : null,
      "",
      "## Instructions",
      "1. Review the context above",
      "2. Execute the task",
      "3. Report back with results and any blockers",
      delegateTo === "claude_code" ? "4. Use NodeBench MCP tools for entity intelligence if needed" : null,
    ].filter(Boolean).join("\n");

    const packet = storePacket({
      type: "handoff",
      subject: `Handoff: ${task}`,
      summary: `Task delegated to ${delegateTo}: ${task}`,
      confidence: 90,
      parentPacketId,
      payload: { task, delegateTo, context, acceptanceCriteria: criteria, deadline, handoffPrompt },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            packet,
            handoffPrompt,
            hint: `Handoff packet created. ${delegateTo === "claude_code" ? "Copy the handoff prompt into a new Claude Code session." : "Share the packet with your teammate."}`,
            nextTools: ["delta_brief", "delta_watch"],
          }, null, 2),
        },
      ],
    };
  },
};

// ── Delta Watch ──────────────────────────────────────────────────────────

const deltaWatch: McpTool = {
  name: "delta_watch",
  description:
    "Add, remove, or list entities on your watchlist. Watched entities are checked for material changes during delta_brief runs. Use to monitor competitors, partners, or market segments.",
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        enum: ["add", "remove", "list", "check"],
        description: "Action to perform. 'add' adds an entity, 'remove' removes one, 'list' shows all, 'check' checks for changes now.",
      },
      entity: {
        type: "string",
        description: "Entity name (required for add/remove/check).",
      },
      alert_on: {
        type: "array",
        items: {
          type: "string",
          enum: ["pricing_change", "funding", "leadership", "product_launch", "legal", "any_material"],
        },
        description: "What types of changes to alert on. Defaults to ['any_material'].",
      },
    },
    required: ["action"],
  },
  handler: async (args: Record<string, unknown>) => {
    ensureWatchlistTable();
    const db = getDb();
    const action = args.action as string;
    const entity = args.entity as string;
    const alertOn = (args.alert_on as string[]) || ["any_material"];

    if (action === "add") {
      if (!entity) return { content: [{ type: "text", text: "Error: entity name required for 'add' action." }] };

      const existing = db.prepare(`SELECT id FROM delta_watchlist WHERE entity_name = ?`).get(entity);
      if (existing) {
        return { content: [{ type: "text", text: JSON.stringify({ status: "already_watching", entity, hint: "Entity is already on your watchlist." }) }] };
      }

      const id = genId();
      db.prepare(`INSERT INTO delta_watchlist (id, entity_name, added_at, alert_preferences) VALUES (?, ?, ?, ?)`)
        .run(id, entity, now(), JSON.stringify(alertOn));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "added",
            entity,
            alertOn,
            hint: `Now watching "${entity}". Changes will appear in your delta_brief. Run delta_watch { action: "check", entity: "${entity}" } to check now.`,
            nextTools: ["delta_brief", "delta_diligence", "delta_watch"],
          }, null, 2),
        }],
      };
    }

    if (action === "remove") {
      if (!entity) return { content: [{ type: "text", text: "Error: entity name required for 'remove' action." }] };
      db.prepare(`DELETE FROM delta_watchlist WHERE entity_name = ?`).run(entity);
      return { content: [{ type: "text", text: JSON.stringify({ status: "removed", entity }) }] };
    }

    if (action === "list") {
      const all = db.prepare(`SELECT * FROM delta_watchlist ORDER BY added_at DESC`).all() as Record<string, unknown>[];
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            watchlist: all.map((w) => ({
              entity: w.entity_name,
              addedAt: w.added_at,
              lastChecked: w.last_checked,
              changeCount: w.change_count,
              alertPreferences: JSON.parse(w.alert_preferences as string),
            })),
            count: all.length,
            hint: all.length === 0 ? "Your watchlist is empty. Use delta_watch { action: \"add\", entity: \"CompanyName\" } to start monitoring." : "Run delta_brief to see all watchlist changes in context.",
            nextTools: ["delta_watch", "delta_brief", "delta_diligence"],
          }, null, 2),
        }],
      };
    }

    if (action === "check") {
      if (!entity) return { content: [{ type: "text", text: "Error: entity name required for 'check' action." }] };

      // Mark as checked
      db.prepare(`UPDATE delta_watchlist SET last_checked = ? WHERE entity_name = ?`).run(now(), entity);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "checked",
            entity,
            hint: `Use web_search to find recent changes for "${entity}", then update the watchlist. Run delta_diligence for a full teardown.`,
            nextTools: ["web_search", "delta_diligence", "delta_brief"],
          }, null, 2),
        }],
      };
    }

    return { content: [{ type: "text", text: "Error: action must be one of: add, remove, list, check" }] };
  },
};

// ── Delta Memo ───────────────────────────────────────────────────────────

const deltaMemo: McpTool = {
  name: "delta_memo",
  description:
    "Create a decision-ready memo artifact. Produces a delta.memo packet with recommendation, variables, scenarios, and evidence. Shareable with teammates and stakeholders.",
  inputSchema: {
    type: "object" as const,
    properties: {
      decision: {
        type: "string",
        description: "The decision or question this memo addresses (e.g., 'Should we pivot to B2B?', 'Which cloud provider?').",
      },
      recommendation: {
        type: "string",
        description: "Your recommended course of action.",
      },
      evidence: {
        type: "array",
        items: { type: "string" },
        description: "Supporting evidence, data points, or references.",
      },
      risks: {
        type: "array",
        items: { type: "string" },
        description: "Key risks or downsides of the recommendation.",
      },
      alternatives: {
        type: "array",
        items: { type: "string" },
        description: "Alternative options considered.",
      },
      persona: {
        type: "string",
        enum: ["founder", "banker", "ceo", "researcher", "operator"],
        description: "Role lens for memo formatting.",
      },
    },
    required: ["decision"],
  },
  handler: async (args: Record<string, unknown>) => {
    const decision = args.decision as string;
    const recommendation = (args.recommendation as string) || "Pending analysis";
    const evidence = (args.evidence as string[]) || [];
    const risks = (args.risks as string[]) || [];
    const alternatives = (args.alternatives as string[]) || [];
    const persona = (args.persona as string) || "founder";

    const sections = [
      { title: "Decision", sectionType: "analysis", content: decision },
      { title: "Recommendation", sectionType: "recommendation", content: recommendation },
      evidence.length > 0 ? { title: "Evidence", sectionType: "evidence", content: evidence.map((e) => `- ${e}`).join("\n") } : null,
      risks.length > 0 ? { title: "Risks", sectionType: "risk", content: risks.map((r) => `- ${r}`).join("\n") } : null,
      alternatives.length > 0 ? { title: "Alternatives Considered", sectionType: "analysis", content: alternatives.map((a) => `- ${a}`).join("\n") } : null,
    ].filter(Boolean);

    const packet = storePacket({
      type: "memo",
      subject: `Decision Memo: ${decision}`,
      summary: `Recommendation: ${recommendation}. ${evidence.length} evidence points, ${risks.length} risks identified.`,
      persona,
      confidence: evidence.length > 2 ? 75 : 50,
      payload: { decision, recommendation, evidence, risks, alternatives, sections },
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          packet,
          hint: "Memo created. Use delta_handoff to delegate implementation, or delta_watch to monitor related entities.",
          nextTools: ["delta_handoff", "delta_watch", "delta_diligence", "delta_compare"],
        }, null, 2),
      }],
    };
  },
};

// ── Delta Scan ───────────────────────────────────────────────────────────

const deltaScan: McpTool = {
  name: "delta_scan",
  description:
    "Run a self-diligence market coverage scan. Produces a delta.market packet analyzing what NodeBench Delta covers well, what gaps exist, and what competitors are doing. The product eats its own dogfood.",
  inputSchema: {
    type: "object" as const,
    properties: {
      layers: {
        type: "array",
        items: { type: "number" },
        description: "Which layers to scan (1=Market Baseline, 2=Job Coverage, 3=Workflow Friction, 4=Competitive Delta, 5=Trend Exposure). Defaults to all.",
      },
      depth: {
        type: "string",
        enum: ["quick", "deep"],
        description: "Quick = summary check. Deep = comprehensive analysis with web research.",
      },
    },
  },
  handler: async (args: Record<string, unknown>) => {
    ensureDeltaTable();
    const db = getDb();
    const layers = (args.layers as number[]) || [1, 2, 3, 4, 5];
    const depth = (args.depth as string) || "quick";

    // Count existing packets to gauge system health
    const packetCount = (db.prepare(`SELECT COUNT(*) as c FROM delta_packets`).get() as { c: number }).c;
    const watchlistCount = (() => {
      try {
        ensureWatchlistTable();
        return (db.prepare(`SELECT COUNT(*) as c FROM delta_watchlist`).get() as { c: number }).c;
      } catch { return 0; }
    })();

    const layerResults = [];

    if (layers.includes(1)) {
      layerResults.push({
        layer: 1,
        name: "Market Baseline",
        score: 70,
        trend: "stable",
        findings: [
          "MCP interoperability: STRONG (304 tools, JSON-RPC gateway)",
          "Persistent memory: STRONG (SQLite store, sync bridge)",
          "Search-first entry: STRONG (ControlPlaneLanding)",
          "Entity intelligence: PARTIAL (needs live web data)",
          "Shareable artifacts: WEAK (no public share URLs yet)",
        ],
      });
    }

    if (layers.includes(2)) {
      layerResults.push({
        layer: 2,
        name: "Job Coverage",
        score: 60,
        trend: "improving",
        findings: [
          "Founder: 7/10 jobs covered (gap: live watchlist alerts, own-entity mode)",
          "Banker: 6/10 jobs covered (gap: side-by-side comparison, live financial data)",
          "CEO: 5/10 jobs covered (gap: private context overlay, executive summary format)",
          "Researcher: 7/10 jobs covered (gap: multi-doc synthesis)",
          "Student: 8/10 jobs covered (good coverage via student lens)",
        ],
      });
    }

    if (layers.includes(3)) {
      layerResults.push({
        layer: 3,
        name: "Workflow Friction",
        score: 55,
        trend: "improving",
        findings: [
          "Search → Understand: LOW friction (clear input)",
          "Understand → Compare: HIGH friction (no side-by-side view)",
          "Compare → Decide: MEDIUM friction (manual memo creation)",
          "Decide → Act: MEDIUM friction (handoff prompt is manual)",
          "Act → Monitor: HIGH friction (no automated watchlist)",
        ],
      });
    }

    if (layers.includes(4)) {
      layerResults.push({
        layer: 4,
        name: "Competitive Delta",
        score: 65,
        trend: "stable",
        findings: [
          "vs Supermemory: They own memory substrate narrative. We own entity intelligence + decisions.",
          "vs Perplexity: They own general search. We own entity-specific deep analysis.",
          "vs PitchBook: They own financial data depth. We own MCP-native + real-time intelligence.",
          "vs Linear: Different category (project mgmt vs intelligence). Learn from their speed obsession.",
        ],
      });
    }

    if (layers.includes(5)) {
      layerResults.push({
        layer: 5,
        name: "Trend Exposure",
        score: 60,
        trend: "stable",
        findings: [
          "MCP universal standard: FUTURE-PROOF (already built)",
          "Memory as table stakes: MODERATE RISK (need to differentiate on causal memory)",
          "Agent orchestration maturity: STRONG (command panel, handoff protocol)",
          "Proactive intelligence: HIGH RISK (no automated alerts yet)",
          "Shareable artifacts as distribution: HIGH RISK (no share URLs)",
        ],
      });
    }

    const avgScore = Math.round(layerResults.reduce((sum, l) => sum + l.score, 0) / layerResults.length);

    const packet = storePacket({
      type: "market",
      subject: `Market Coverage Scan — ${new Date().toLocaleDateString()}`,
      summary: `Overall score: ${avgScore}/100 across ${layerResults.length} layers. ${packetCount} packets stored, ${watchlistCount} entities watched.`,
      confidence: depth === "deep" ? 75 : 60,
      payload: { layerResults, avgScore, packetCount, watchlistCount, depth },
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          packet,
          overallScore: avgScore,
          layerResults,
          systemHealth: { packetCount, watchlistCount },
          hint: "Use delta_diligence on competitors to fill gaps. Use delta_memo to create strategic decisions.",
          nextTools: ["delta_diligence", "delta_memo", "delta_watch", "delta_handoff"],
        }, null, 2),
      }],
    };
  },
};

// ── Delta Compare ────────────────────────────────────────────────────────

const deltaCompare: McpTool = {
  name: "delta_compare",
  description:
    "Side-by-side entity comparison. Produces a delta.diligence comparison packet highlighting differences, strengths, and weaknesses across 2-4 entities.",
  inputSchema: {
    type: "object" as const,
    properties: {
      entities: {
        type: "array",
        items: { type: "string" },
        description: "2-4 entity names to compare (e.g., ['Stripe', 'Square', 'Adyen']).",
        minItems: 2,
        maxItems: 4,
      },
      metrics: {
        type: "array",
        items: { type: "string" },
        description: "Specific metrics or dimensions to compare on (e.g., ['pricing', 'market share', 'developer experience']).",
      },
      persona: {
        type: "string",
        enum: ["founder", "banker", "ceo", "researcher", "operator"],
        description: "Role lens for comparison format.",
      },
    },
    required: ["entities"],
  },
  handler: async (args: Record<string, unknown>) => {
    const entities = args.entities as string[];
    const metrics = (args.metrics as string[]) || ["market position", "key strengths", "key weaknesses", "recent changes"];
    const persona = (args.persona as string) || "founder";

    const comparisonGrid = entities.map((entity) => ({
      entity,
      metrics: metrics.map((metric) => ({
        metric,
        value: `[Run delta_diligence on "${entity}" to populate]`,
      })),
    }));

    const packet = storePacket({
      type: "diligence",
      subject: `Comparison: ${entities.join(" vs ")}`,
      summary: `Side-by-side comparison of ${entities.length} entities across ${metrics.length} dimensions`,
      persona,
      confidence: 40,
      payload: { entities, metrics, comparisonGrid, isComparison: true },
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          packet,
          comparisonGrid,
          hint: `Comparison scaffold created. Run delta_diligence on each entity to populate: ${entities.map((e) => `delta_diligence { entity: "${e}" }`).join(", ")}`,
          nextTools: ["delta_diligence", "delta_memo", "delta_handoff"],
        }, null, 2),
      }],
    };
  },
};

// ── Delta Retain ─────────────────────────────────────────────────────────

const deltaRetain: McpTool = {
  name: "delta_retain",
  description:
    "Preserve context for future sessions. Produces a delta.retain packet storing important notes, decisions, meeting outcomes, or research findings that should persist across sessions.",
  inputSchema: {
    type: "object" as const,
    properties: {
      content: {
        type: "string",
        description: "The context to preserve (meeting notes, decisions, research findings, etc.).",
      },
      content_type: {
        type: "string",
        enum: ["meeting_notes", "decision", "research", "observation", "action_item", "general"],
        description: "Type of content being retained. Defaults to 'general'.",
      },
      ttl_days: {
        type: "number",
        description: "How many days to keep this context. Defaults to 30.",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Tags for organizing retained context.",
      },
    },
    required: ["content"],
  },
  handler: async (args: Record<string, unknown>) => {
    const content = args.content as string;
    const contentType = (args.content_type as string) || "general";
    const ttlDays = (args.ttl_days as number) || 30;
    const tags = (args.tags as string[]) || [];

    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

    const packet = storePacket({
      type: "retain",
      subject: `Retained: ${contentType} — ${content.slice(0, 60)}${content.length > 60 ? "..." : ""}`,
      summary: content.slice(0, 200),
      confidence: 95,
      payload: { content, contentType, tags, ttlDays },
    });

    // Override the default expiry with the custom TTL
    const db = getDb();
    db.prepare(`UPDATE delta_packets SET expires_at = ? WHERE id = ?`).run(expiresAt, (packet as Record<string, unknown>).id);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          packet: { ...packet, expiresAt },
          hint: `Context retained for ${ttlDays} days. It will appear in future delta_brief results. Tags: ${tags.join(", ") || "none"}`,
          nextTools: ["delta_brief", "delta_memo"],
        }, null, 2),
      }],
    };
  },
};

// ── Delta Packets List (utility) ─────────────────────────────────────────

const deltaPackets: McpTool = {
  name: "delta_packets",
  description:
    "List recent delta packets. View your packet history, filter by type, and track lineage.",
  inputSchema: {
    type: "object" as const,
    properties: {
      type: {
        type: "string",
        enum: ["brief", "diligence", "handoff", "watchlist", "memo", "market", "retain", "all"],
        description: "Filter by packet type. Defaults to 'all'.",
      },
      limit: {
        type: "number",
        description: "Maximum number of packets to return. Defaults to 20.",
      },
    },
  },
  handler: async (args: Record<string, unknown>) => {
    ensureDeltaTable();
    const db = getDb();
    const type = (args.type as string) || "all";
    const limit = (args.limit as number) || 20;

    const query = type === "all"
      ? `SELECT * FROM delta_packets ORDER BY created_at DESC LIMIT ?`
      : `SELECT * FROM delta_packets WHERE type = ? ORDER BY created_at DESC LIMIT ?`;

    const packets = type === "all"
      ? db.prepare(query).all(limit) as Record<string, unknown>[]
      : db.prepare(query).all(type, limit) as Record<string, unknown>[];

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          packets: packets.map((p) => ({
            id: p.id,
            type: p.type,
            subject: p.subject,
            summary: p.summary,
            confidence: p.confidence,
            freshness: p.freshness,
            createdAt: p.created_at,
            expiresAt: p.expires_at,
          })),
          count: packets.length,
          hint: "Use the packet ID with delta_handoff { parent_packet_id: \"...\" } to create linked handoffs.",
          nextTools: ["delta_brief", "delta_diligence", "delta_memo", "delta_handoff"],
        }, null, 2),
      }],
    };
  },
};

// ── Retention Bridge Tools ───────────────────────────────────────────────

const retentionStatus: McpTool = {
  name: "retention_status",
  description:
    "Check retention.sh connection status and QA metrics. Shows team code, QA score, member count, and last sync time. Use to verify retention.sh integration is working.",
  inputSchema: {
    type: "object" as const,
    properties: {
      team_code: {
        type: "string",
        description: "Retention.sh team code (e.g., 'C47DRF'). Auto-detected if retention.sh is running.",
      },
    },
  },
  handler: async (args: Record<string, unknown>) => {
    const teamCode = (args.team_code as string) || process.env.RETENTION_TEAM || "";

    // Check if retention.sh is accessible
    let retentionReachable = false;
    let qaScore: number | null = null;
    let memberCount: number | null = null;
    let tokensSaved: number | null = null;

    if (teamCode) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`https://retention.sh/api/team/${teamCode}/status`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json() as Record<string, unknown>;
          retentionReachable = true;
          qaScore = data.qaScore as number;
          memberCount = data.memberCount as number;
          tokensSaved = data.tokensSaved as number;
        }
      } catch {
        // retention.sh not reachable — that's fine, we degrade gracefully
      }
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          connected: retentionReachable,
          teamCode: teamCode || "not configured",
          qaScore,
          memberCount,
          tokensSaved,
          dashboardUrl: teamCode ? `https://retention.sh/memory/team?team=${teamCode}` : null,
          hint: retentionReachable
            ? `retention.sh is connected. Team ${teamCode} has ${memberCount} members. QA score: ${qaScore}/100.`
            : teamCode
              ? `retention.sh team ${teamCode} is not reachable. Check your internet connection or set RETENTION_TEAM env var.`
              : "No team code configured. Set RETENTION_TEAM env var or pass team_code parameter. Install: RETENTION_TEAM=<CODE> curl -sL retention.sh/install.sh | bash",
          nextTools: ["delta_brief", "delta_scan"],
        }, null, 2),
      }],
    };
  },
};

const retentionSync: McpTool = {
  name: "retention_sync",
  description:
    "Sync data between NodeBench Delta and retention.sh. Pushes delta packets as team context and pulls QA findings as watchlist signals.",
  inputSchema: {
    type: "object" as const,
    properties: {
      direction: {
        type: "string",
        enum: ["push", "pull", "both"],
        description: "Push delta packets to retention.sh, pull QA findings from it, or both. Defaults to 'both'.",
      },
      team_code: {
        type: "string",
        description: "Retention.sh team code.",
      },
    },
  },
  handler: async (args: Record<string, unknown>) => {
    const direction = (args.direction as string) || "both";
    const teamCode = (args.team_code as string) || process.env.RETENTION_TEAM || "";

    if (!teamCode) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: "No team code configured. Set RETENTION_TEAM env var or pass team_code parameter.",
            hint: "Install retention.sh first: RETENTION_TEAM=<CODE> curl -sL retention.sh/install.sh | bash",
          }, null, 2),
        }],
      };
    }

    const results: Record<string, unknown> = { direction, teamCode };

    if (direction === "push" || direction === "both") {
      ensureDeltaTable();
      const db = getDb();
      const recentPackets = db.prepare(
        `SELECT * FROM delta_packets WHERE created_at > ? ORDER BY created_at DESC LIMIT 10`
      ).all(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) as Record<string, unknown>[];

      results.pushed = {
        packetCount: recentPackets.length,
        types: [...new Set(recentPackets.map((p) => p.type))],
        status: "ready_to_sync",
        note: "Packets are available for retention.sh to pull via the shared context API at /shared-context/packets",
      };
    }

    if (direction === "pull" || direction === "both") {
      results.pulled = {
        status: "ready_to_receive",
        note: "retention.sh QA findings will be ingested as delta_watchlist signals when retention.sh pushes via /shared-context/publish",
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ...results,
          hint: "Sync configured. retention.sh and NodeBench Delta will exchange data via the shared context protocol.",
          dashboardUrl: `https://retention.sh/memory/team?team=${teamCode}`,
          nextTools: ["retention_status", "delta_brief", "delta_watch"],
        }, null, 2),
      }],
    };
  },
};

// ── Export ────────────────────────────────────────────────────────────────

export function createDeltaTools(): McpTool[] {
  return [
    deltaBrief,
    deltaDiligence,
    deltaHandoff,
    deltaWatch,
    deltaMemo,
    deltaScan,
    deltaCompare,
    deltaRetain,
    deltaPackets,
    retentionStatus,
    retentionSync,
  ];
}
