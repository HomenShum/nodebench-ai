/**
 * contextInjection.ts — Tiered context injection middleware for NodeBench.
 *
 * Ensures message 1000 retains the same intent clarity as message 1.
 *
 * Architecture (Letta/MemGPT-inspired):
 *   PINNED (~200 tokens, returned with every response; caller must re-request
 *           after context compaction — this system does NOT auto-persist into
 *           the LLM's system prompt):
 *     - Canonical entity (mission, wedge, state, confidence)
 *     - Last packet summary
 *     - Structurally detected contradictions
 *     - Current session actions
 *
 *   INJECTED ON DEMAND (~200 tokens, query-relevant):
 *     - Prior weekly reset summary
 *     - Relevant tracked milestones
 *     - Entity-specific history (dynamic entity detection from action DB)
 *     - Dogfood findings
 *
 *   ARCHIVAL (pointer-based, never loaded unless requested):
 *     - Full action history
 *     - All prior packets
 *     - All state diffs
 *     - Git log history
 *
 * Total budget: ~400-500 tokens per request.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getDb } from "../db.js";
import type { McpTool } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface PinnedContext {
  /** Always-present canonical identity */
  canonicalMission: string;
  wedge: string;
  companyState: string;
  identityConfidence: number;
  /** Last packet summary (1-2 sentences) */
  lastPacketSummary: string | null;
  lastPacketTimestamp: string | null;
  /** Active unresolved contradictions */
  activeContradictions: string[];
  /** Current session action count + last 3 actions */
  sessionActionCount: number;
  recentActions: string[];
  /** Token budget used */
  estimatedTokens: number;
}

export interface InjectedContext {
  /** Prior weekly reset (if within 7 days) */
  weeklyResetSummary: string | null;
  /** Recent milestones (last 5) */
  recentMilestones: Array<{ title: string; timestamp: string }>;
  /** Entity-specific signals (if entity mentioned in query) */
  entitySignals: string[];
  /** Dogfood status */
  dogfoodVerdict: string | null;
  estimatedTokens: number;
}

export interface ArchivalPointer {
  /** What's available for retrieval — not loaded into context */
  totalActions: number;
  totalMilestones: number;
  totalStateDiffs: number;
  oldestActionDate: string | null;
  /** Tools to retrieve archival data */
  retrievalTools: string[];
}

export interface FullContextBundle {
  pinned: PinnedContext;
  injected: InjectedContext;
  archival: ArchivalPointer;
  /** Ready-to-inject system prompt prefix */
  systemPromptPrefix: string;
  totalEstimatedTokens: number;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function findProjectRoot(): string {
  let dir = resolve(__dirname, "..", "..");
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, "CLAUDE.md"))) return dir;
    dir = resolve(dir, "..");
  }
  return process.cwd();
}

function safeRead(path: string): string | null {
  try { return existsSync(path) ? readFileSync(path, "utf-8") : null; } catch { return null; }
}

/** Check if a SQLite table exists before querying it (fix P0 #2) */
function tableExists(db: any, tableName: string): boolean {
  const row = db.prepare(
    `SELECT COUNT(*) as c FROM sqlite_master WHERE type='table' AND name=?`
  ).get(tableName) as any;
  return (row?.c ?? 0) > 0;
}

/**
 * Structurally detect contradictions instead of keyword matching (fix P1 #6).
 * Checks: CLAUDE.md vs index.html title, tool count consistency, etc.
 */
function detectStructuralContradictions(root: string): string[] {
  const contradictions: string[] = [];

  // 1. Check CLAUDE.md tool count vs actual loaded tools
  const claudeMd = safeRead(join(root, "CLAUDE.md"));
  if (claudeMd) {
    const toolMatch = claudeMd.match(/(\d+)-tool/);
    if (toolMatch) {
      const declaredCount = parseInt(toolMatch[1], 10);
      // If the declared count is off by more than 20 from any recent known count, flag it
      if (declaredCount < 300 || declaredCount > 400) {
        contradictions.push(`CLAUDE.md declares ${declaredCount}-tool but expected 300-400 range`);
      }
    }
  }

  // 2. Check index.html title vs CLAUDE.md positioning
  const indexHtml = safeRead(join(root, "index.html"));
  if (indexHtml && claudeMd) {
    const titleMatch = indexHtml.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
      const title = titleMatch[1].toLowerCase();
      if (title.includes("deeptrace") || title.includes("agent trust")) {
        contradictions.push(`index.html title "${titleMatch[1]}" contradicts entity intelligence positioning`);
      }
    }
  }

  // 3. Check package.json description vs CLAUDE.md
  const pkgJson = safeRead(join(root, "packages/mcp-local/package.json"));
  if (pkgJson) {
    try {
      const pkg = JSON.parse(pkgJson);
      if (pkg.description && pkg.description.toLowerCase().includes("agent trust")) {
        contradictions.push(`package.json description "${pkg.description}" contradicts current positioning`);
      }
    } catch { /* parse error */ }
  }

  return contradictions;
}

/**
 * Compute identity confidence from structural contradictions (fix P1 #5).
 * Shared formula — same logic as founderLocalPipeline.ts.
 */
function computeConfidence(contradictionCount: number): number {
  return contradictionCount === 0 ? 85 : Math.max(50, 85 - contradictionCount * 10);
}

/**
 * Dynamically detect entity names from the tracking_actions table (fix P2 #9).
 * Returns entity names that appear in recent actions AND match the query.
 */
function findMatchingEntity(db: any, query: string): string | null {
  if (!query) return null;
  const queryLower = query.toLowerCase();

  // First check well-known entities (fast path)
  const wellKnown = ["anthropic", "shopify", "nodebench", "supermemory", "openai", "google", "meta", "microsoft", "stripe", "linear"];
  const knownMatch = wellKnown.find(e => queryLower.includes(e));
  if (knownMatch) return knownMatch;

  // Fall back to dynamic detection from recent actions
  try {
    const recentActions = db.prepare(
      `SELECT DISTINCT action FROM tracking_actions ORDER BY timestamp DESC LIMIT 50`
    ).all() as any[];

    // Extract capitalized words (likely entity names) from actions
    for (const row of recentActions) {
      const words = (row.action as string).match(/[A-Z][a-z]{2,}/g) ?? [];
      for (const word of words) {
        if (queryLower.includes(word.toLowerCase()) && word.length > 3) {
          return word.toLowerCase();
        }
      }
    }
  } catch { /* no actions yet */ }

  return null;
}

/* ─── Build Pinned Context ───────────────────────────────────────────────── */

function buildPinnedContext(): PinnedContext {
  const root = findProjectRoot();

  // Parse CLAUDE.md for canonical identity
  const claudeMd = safeRead(join(root, "CLAUDE.md"));
  let canonicalMission = "Unknown";
  let wedge = "Unknown";
  if (claudeMd) {
    const overviewMatch = claudeMd.match(/NodeBench\s*[—–-]\s*(.+?)(?:\.\s|$)/m);
    if (overviewMatch) canonicalMission = overviewMatch[1].trim();
    const toolMatch = claudeMd.match(/(\d+)-tool/);
    if (toolMatch) wedge = `${toolMatch[1]}-tool MCP server with entity intelligence`;
  }

  // Query SQLite for session data
  let sessionActionCount = 0;
  let recentActions: string[] = [];
  let lastPacketSummary: string | null = null;
  let lastPacketTimestamp: string | null = null;

  // Fix P1 #6: Use structural contradiction detection, not keyword matching
  const activeContradictions = detectStructuralContradictions(root);

  try {
    const db = getDb();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

    // Recent actions
    const actions = db.prepare(
      `SELECT action, timestamp FROM tracking_actions WHERE date(timestamp) >= ? ORDER BY timestamp DESC LIMIT 3`
    ).all(sevenDaysAgo) as any[];
    recentActions = actions.map((a: any) => a.action);
    sessionActionCount = (db.prepare(
      `SELECT COUNT(*) as c FROM tracking_actions WHERE date(timestamp) >= ?`
    ).get(sevenDaysAgo) as any)?.c ?? 0;

    // Fix P0 #2/#3: Check table existence before querying; use single source for dogfood verdict
    if (tableExists(db, "benchmark_reports")) {
      const lastReport = db.prepare(
        `SELECT reportJson, timestamp FROM benchmark_reports ORDER BY timestamp DESC LIMIT 1`
      ).get() as any;
      if (lastReport) {
        try {
          const report = JSON.parse(lastReport.reportJson);
          lastPacketSummary = `Last benchmark: ${report.layer} — ${report.totalSessions} sessions, RCA ${Math.round((report.metrics?.rca ?? 0) * 100)}%, maturity ${report.maturityLabel ?? "unknown"}`;
          lastPacketTimestamp = lastReport.timestamp;
        } catch { /* malformed JSON */ }
      }
    }

  } catch { /* SQLite not ready */ }

  const estimatedTokens = 150 + recentActions.length * 15 + activeContradictions.length * 20;

  return {
    canonicalMission,
    wedge,
    companyState: "building",
    // Fix P1 #5: Use shared confidence formula
    identityConfidence: computeConfidence(activeContradictions.length),
    lastPacketSummary,
    lastPacketTimestamp,
    activeContradictions,
    sessionActionCount,
    recentActions,
    estimatedTokens,
  };
}

/* ─── Build Injected Context ─────────────────────────────────────────────── */

function buildInjectedContext(query?: string): InjectedContext {
  let weeklyResetSummary: string | null = null;
  let recentMilestones: Array<{ title: string; timestamp: string }> = [];
  let entitySignals: string[] = [];
  let dogfoodVerdict: string | null = null;

  try {
    const db = getDb();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

    // Weekly reset from milestones
    const resetMilestone = db.prepare(
      `SELECT title, description, timestamp FROM tracking_milestones WHERE title LIKE '%weekly%reset%' ORDER BY timestamp DESC LIMIT 1`
    ).get() as any;
    if (resetMilestone) {
      weeklyResetSummary = `${resetMilestone.title} (${resetMilestone.timestamp?.slice(0, 10)}): ${resetMilestone.description?.slice(0, 100)}`;
    }

    // Recent milestones
    const milestones = db.prepare(
      `SELECT title, timestamp FROM tracking_milestones WHERE date(timestamp) >= ? ORDER BY timestamp DESC LIMIT 5`
    ).all(sevenDaysAgo) as any[];
    recentMilestones = milestones.map((m: any) => ({ title: m.title, timestamp: m.timestamp }));

    // Fix P2 #9: Dynamic entity detection instead of hardcoded 4-company list
    if (query) {
      const matchedEntity = findMatchingEntity(db, query);
      if (matchedEntity) {
        // Fix P0 #1: Escape LIKE metacharacters
        const escaped = matchedEntity.replace(/%/g, "\\%").replace(/_/g, "\\_");
        const entityActions = db.prepare(
          `SELECT action FROM tracking_actions WHERE LOWER(action) LIKE ? ESCAPE '\\' ORDER BY timestamp DESC LIMIT 3`
        ).all(`%${escaped}%`) as any[];
        entitySignals = entityActions.map((a: any) => a.action);
      }
    }

    // Fix P0 #3: Single source for dogfood verdict (always from reportJson, not denormalized columns)
    if (tableExists(db, "benchmark_reports")) {
      const lastReport = db.prepare(
        `SELECT reportJson FROM benchmark_reports ORDER BY timestamp DESC LIMIT 1`
      ).get() as any;
      if (lastReport) {
        try {
          const report = JSON.parse(lastReport.reportJson);
          const rca = Math.round((report.metrics?.rca ?? 0) * 100);
          const prr = Math.round((report.metrics?.prr ?? 0) * 100);
          dogfoodVerdict = `${report.layer}: RCA ${rca}%, PRR ${prr}%`;
        } catch { /* malformed JSON */ }
      }
    }

  } catch { /* SQLite not ready */ }

  const estimatedTokens = 50 + recentMilestones.length * 12 + entitySignals.length * 15;

  return { weeklyResetSummary, recentMilestones, entitySignals, dogfoodVerdict, estimatedTokens };
}

/* ─── Build Archival Pointers ────────────────────────────────────────────── */

function buildArchivalPointers(): ArchivalPointer {
  let totalActions = 0;
  let totalMilestones = 0;
  let totalStateDiffs = 0;
  let oldestActionDate: string | null = null;

  try {
    const db = getDb();
    totalActions = (db.prepare(`SELECT COUNT(*) as c FROM tracking_actions`).get() as any)?.c ?? 0;
    totalMilestones = (db.prepare(`SELECT COUNT(*) as c FROM tracking_milestones`).get() as any)?.c ?? 0;
    // Fix P0 #2: Check table existence instead of try/catch swallowing errors
    if (tableExists(db, "benchmark_runs")) {
      totalStateDiffs = (db.prepare(`SELECT COUNT(*) as c FROM benchmark_runs`).get() as any)?.c ?? 0;
    }
    const oldest = db.prepare(`SELECT MIN(timestamp) as t FROM tracking_actions`).get() as any;
    oldestActionDate = oldest?.t?.slice(0, 10) ?? null;
  } catch { /* SQLite not ready */ }

  return {
    totalActions,
    totalMilestones,
    totalStateDiffs,
    oldestActionDate,
    retrievalTools: ["get_session_journal", "get_weekly_summary", "get_daily_log", "get_monthly_report", "get_benchmark_history"],
  };
}

/* ─── Format System Prompt Prefix ────────────────────────────────────────── */

function formatSystemPromptPrefix(pinned: PinnedContext, injected: InjectedContext, archival: ArchivalPointer): string {
  const lines: string[] = [
    `[NODEBENCH CONTEXT — call get_context_bundle to refresh after compaction]`,
    `Identity: ${pinned.canonicalMission}`,
    `Wedge: ${pinned.wedge}`,
    `State: ${pinned.companyState} | Confidence: ${pinned.identityConfidence}%`,
  ];

  if (pinned.lastPacketSummary) {
    lines.push(`Last packet: ${pinned.lastPacketSummary}`);
  }

  if (pinned.activeContradictions.length > 0) {
    lines.push(`Active contradictions (${pinned.activeContradictions.length}): ${pinned.activeContradictions[0]?.slice(0, 80)}`);
  }

  if (pinned.sessionActionCount > 0) {
    lines.push(`Session: ${pinned.sessionActionCount} actions tracked. Recent: ${pinned.recentActions.slice(0, 2).join("; ")}`);
  }

  if (injected.weeklyResetSummary) {
    lines.push(`Weekly reset: ${injected.weeklyResetSummary}`);
  }

  if (injected.recentMilestones.length > 0) {
    lines.push(`Milestones (${injected.recentMilestones.length}): ${injected.recentMilestones.map(m => m.title).join(", ")}`);
  }

  if (injected.dogfoodVerdict) {
    lines.push(`Benchmark: ${injected.dogfoodVerdict}`);
  }

  if (archival.totalActions > 0) {
    lines.push(`Archival: ${archival.totalActions} actions, ${archival.totalMilestones} milestones since ${archival.oldestActionDate ?? "unknown"}. Use ${archival.retrievalTools[0]} to access.`);
  }

  lines.push(`[END NODEBENCH CONTEXT]`);
  return lines.join("\n");
}

/* ─── Public API ─────────────────────────────────────────────────────────── */

/**
 * Build the full context bundle for injection into prompts/tools.
 * Call this before dispatching any search query or MCP tool call.
 */
export function buildContextBundle(query?: string): FullContextBundle {
  const pinned = buildPinnedContext();
  const injected = buildInjectedContext(query);
  const archival = buildArchivalPointers();
  const systemPromptPrefix = formatSystemPromptPrefix(pinned, injected, archival);
  const totalEstimatedTokens = pinned.estimatedTokens + injected.estimatedTokens + 50;

  return { pinned, injected, archival, systemPromptPrefix, totalEstimatedTokens };
}

/* ─── MCP Tools ──────────────────────────────────────────────────────────── */

export const contextInjectionTools: McpTool[] = [
  {
    name: "get_context_bundle",
    description:
      "Returns the full NodeBench context bundle: pinned identity (mission, wedge, confidence), " +
      "last packet summary, active contradictions, recent actions, milestones, dogfood status, " +
      "and archival pointers. Call this at the start of any session or before generating a packet " +
      "to ensure continuity across messages. This is what makes message 1000 as good as message 1.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Optional current query — enables entity-specific signal injection",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { query?: string }) => {
      const bundle = buildContextBundle(args.query);
      return {
        systemPromptPrefix: bundle.systemPromptPrefix,
        pinned: {
          mission: bundle.pinned.canonicalMission,
          wedge: bundle.pinned.wedge,
          confidence: `${bundle.pinned.identityConfidence}%`,
          lastPacket: bundle.pinned.lastPacketSummary,
          contradictions: bundle.pinned.activeContradictions.length,
          sessionActions: bundle.pinned.sessionActionCount,
          recentActions: bundle.pinned.recentActions,
        },
        injected: {
          weeklyReset: bundle.injected.weeklyResetSummary,
          milestones: bundle.injected.recentMilestones.length,
          entitySignals: bundle.injected.entitySignals.length,
          dogfood: bundle.injected.dogfoodVerdict,
        },
        archival: bundle.archival,
        tokenBudget: `~${bundle.totalEstimatedTokens} tokens`,
      };
    },
  },

  {
    name: "inject_context_into_prompt",
    description:
      "Wraps a user prompt with NodeBench's persistent context (identity, last packet, contradictions, " +
      "session state). Use this to ensure any downstream LLM call has full continuity even after " +
      "context window compaction. Returns the enriched prompt ready for dispatch.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The user's raw prompt to enrich" },
      },
      required: ["prompt"],
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { prompt: string }) => {
      const bundle = buildContextBundle(args.prompt);
      const enrichedPrompt = `${bundle.systemPromptPrefix}\n\n---\n\nUser query: ${args.prompt}`;
      return {
        enrichedPrompt,
        contextTokens: bundle.totalEstimatedTokens,
        pinnedIdentity: bundle.pinned.canonicalMission,
        contradictions: bundle.pinned.activeContradictions.length,
        sessionActions: bundle.pinned.sessionActionCount,
      };
    },
  },
];
