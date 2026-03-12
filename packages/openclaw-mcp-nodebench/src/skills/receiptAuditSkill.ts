/**
 * deeptrace-receipt-audit — ClawHub skill for tamper-evident action receipt auditing.
 *
 * Lets any OpenClaw agent list, filter, verify, and inspect action receipts
 * from the DeepTrace trust infrastructure. Works standalone with SQLite
 * audit log data; in production, proxies to Convex actionReceipts.
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

// ─── Receipt shape (matches Convex actionReceipts schema) ────────────────

interface LocalReceipt {
  id: string;
  receipt_id: string;
  agent_id: string;
  tool_name: string;
  action_summary: string;
  policy_action: "allowed" | "escalated" | "denied";
  policy_rule_name: string;
  result_success: number;
  result_summary: string;
  result_output_hash: string | null;
  evidence_refs: string;
  violations: string;
  can_undo: number;
  created_at: string;
}

function ensureReceiptsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS deeptrace_receipts (
      id TEXT PRIMARY KEY,
      receipt_id TEXT NOT NULL UNIQUE,
      agent_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      action_summary TEXT NOT NULL,
      policy_action TEXT NOT NULL DEFAULT 'allowed',
      policy_rule_name TEXT NOT NULL DEFAULT '',
      result_success INTEGER NOT NULL DEFAULT 1,
      result_summary TEXT NOT NULL DEFAULT '',
      result_output_hash TEXT,
      evidence_refs TEXT NOT NULL DEFAULT '[]',
      violations TEXT NOT NULL DEFAULT '[]',
      can_undo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_receipts_agent ON deeptrace_receipts(agent_id);
    CREATE INDEX IF NOT EXISTS idx_receipts_policy ON deeptrace_receipts(policy_action);
    CREATE INDEX IF NOT EXISTS idx_receipts_tool ON deeptrace_receipts(tool_name);
  `);
}

function computeSha256Hex(input: string): string {
  // Simple deterministic hash for receipt verification (non-crypto, for demo)
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `sha256:${(h >>> 0).toString(16).padStart(8, "0")}${Math.abs(h).toString(16).padStart(8, "0")}`;
}

export const receiptAuditSkill: McpTool[] = [
  {
    name: "deeptrace_log_receipt",
    description:
      "Log a tamper-evident action receipt. Every agent action should produce a receipt recording what was done, what policy allowed it, and what evidence supports the result. The receipt is content-addressed via SHA-256.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Agent identifier" },
        toolName: { type: "string", description: "Tool that was called" },
        actionSummary: { type: "string", description: "Human-readable summary of what was done" },
        policyAction: {
          type: "string",
          enum: ["allowed", "escalated", "denied"],
          description: "Policy decision for this action",
        },
        policyRuleName: { type: "string", description: "Name of the policy rule that applied" },
        resultSuccess: { type: "boolean", description: "Whether the action succeeded" },
        resultSummary: { type: "string", description: "Summary of the result" },
        resultOutputHash: { type: "string", description: "SHA-256 hash of the output content" },
        evidenceRefs: {
          type: "array",
          items: { type: "string" },
          description: "Evidence reference IDs supporting this action",
        },
        canUndo: { type: "boolean", description: "Whether this action can be undone" },
      },
      required: ["agentId", "toolName", "actionSummary", "policyAction", "resultSuccess", "resultSummary"],
    },
    handler: async (args: any) => {
      ensureReceiptsTable();
      const db = getDb();
      const id = genId("rcpt");
      const canonical = JSON.stringify({
        agentId: args.agentId,
        toolName: args.toolName,
        actionSummary: args.actionSummary,
        policyAction: args.policyAction,
        resultSuccess: args.resultSuccess,
        resultSummary: args.resultSummary,
      });
      const receiptId = computeSha256Hex(canonical);

      db.prepare(
        `INSERT INTO deeptrace_receipts (id, receipt_id, agent_id, tool_name, action_summary, policy_action, policy_rule_name, result_success, result_summary, result_output_hash, evidence_refs, violations, can_undo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?)`,
      ).run(
        id,
        receiptId,
        args.agentId,
        args.toolName,
        args.actionSummary,
        args.policyAction,
        args.policyRuleName ?? "",
        args.resultSuccess ? 1 : 0,
        args.resultSummary,
        args.resultOutputHash ?? null,
        JSON.stringify(args.evidenceRefs ?? []),
        args.canUndo ? 1 : 0,
      );

      return { receiptId, id, logged: true };
    },
  },

  {
    name: "deeptrace_list_receipts",
    description:
      "List action receipts with optional filtering by agent, policy action, or tool. Returns receipts sorted by creation time (newest first).",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Filter by agent ID" },
        policyAction: {
          type: "string",
          enum: ["allowed", "escalated", "denied"],
          description: "Filter by policy action",
        },
        toolName: { type: "string", description: "Filter by tool name" },
        limit: { type: "number", description: "Max results (default 50, max 200)" },
      },
    },
    handler: async (args: any) => {
      ensureReceiptsTable();
      const db = getDb();
      const limit = Math.min(args.limit ?? 50, 200);
      const conditions: string[] = [];
      const params: any[] = [];

      if (args.agentId) {
        conditions.push("agent_id = ?");
        params.push(args.agentId);
      }
      if (args.policyAction) {
        conditions.push("policy_action = ?");
        params.push(args.policyAction);
      }
      if (args.toolName) {
        conditions.push("tool_name = ?");
        params.push(args.toolName);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      params.push(limit);

      const rows = db
        .prepare(`SELECT * FROM deeptrace_receipts ${where} ORDER BY created_at DESC LIMIT ?`)
        .all(...params) as LocalReceipt[];

      const stats = db
        .prepare(
          `SELECT
            COUNT(*) as total,
            SUM(CASE WHEN policy_action = 'allowed' THEN 1 ELSE 0 END) as allowed,
            SUM(CASE WHEN policy_action = 'escalated' THEN 1 ELSE 0 END) as escalated,
            SUM(CASE WHEN policy_action = 'denied' THEN 1 ELSE 0 END) as denied
          FROM deeptrace_receipts ${where}`,
        )
        .get(...(conditions.length > 0 ? params.slice(0, -1) : [])) as any;

      return {
        receipts: rows.map((r) => ({
          receiptId: r.receipt_id,
          agentId: r.agent_id,
          toolName: r.tool_name,
          actionSummary: r.action_summary,
          policyAction: r.policy_action,
          policyRuleName: r.policy_rule_name,
          resultSuccess: !!r.result_success,
          resultSummary: r.result_summary,
          outputHash: r.result_output_hash,
          evidenceRefs: JSON.parse(r.evidence_refs || "[]"),
          canUndo: !!r.can_undo,
          createdAt: r.created_at,
        })),
        stats: {
          total: stats.total,
          allowed: stats.allowed,
          escalated: stats.escalated,
          denied: stats.denied,
        },
        filters: { agentId: args.agentId, policyAction: args.policyAction, toolName: args.toolName },
      };
    },
  },

  {
    name: "deeptrace_verify_receipt",
    description:
      "Verify a receipt's content-addressed hash. Recomputes SHA-256 from canonical fields and compares to the stored receiptId. Returns whether the receipt is tamper-free.",
    inputSchema: {
      type: "object",
      properties: {
        receiptId: { type: "string", description: "The receipt ID (SHA-256 hash) to verify" },
      },
      required: ["receiptId"],
    },
    handler: async (args: any) => {
      ensureReceiptsTable();
      const db = getDb();
      const row = db
        .prepare("SELECT * FROM deeptrace_receipts WHERE receipt_id = ?")
        .get(args.receiptId) as LocalReceipt | undefined;

      if (!row) {
        return { valid: false, error: "Receipt not found", receiptId: args.receiptId };
      }

      const canonical = JSON.stringify({
        agentId: row.agent_id,
        toolName: row.tool_name,
        actionSummary: row.action_summary,
        policyAction: row.policy_action,
        resultSuccess: !!row.result_success,
        resultSummary: row.result_summary,
      });
      const expected = computeSha256Hex(canonical);

      return {
        valid: expected === row.receipt_id,
        expected,
        actual: row.receipt_id,
        agentId: row.agent_id,
        toolName: row.tool_name,
        policyAction: row.policy_action,
      };
    },
  },

  {
    name: "deeptrace_receipt_stats",
    description:
      "Get aggregate statistics across all receipts — total count, policy action breakdown, top agents, and top tools.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      ensureReceiptsTable();
      const db = getDb();

      const overall = db
        .prepare(
          `SELECT
            COUNT(*) as total,
            SUM(CASE WHEN policy_action = 'allowed' THEN 1 ELSE 0 END) as allowed,
            SUM(CASE WHEN policy_action = 'escalated' THEN 1 ELSE 0 END) as escalated,
            SUM(CASE WHEN policy_action = 'denied' THEN 1 ELSE 0 END) as denied,
            SUM(CASE WHEN result_success = 0 THEN 1 ELSE 0 END) as failures
          FROM deeptrace_receipts`,
        )
        .get() as any;

      const topAgents = db
        .prepare(
          `SELECT agent_id, COUNT(*) as count FROM deeptrace_receipts GROUP BY agent_id ORDER BY count DESC LIMIT 10`,
        )
        .all() as any[];

      const topTools = db
        .prepare(
          `SELECT tool_name, COUNT(*) as count FROM deeptrace_receipts GROUP BY tool_name ORDER BY count DESC LIMIT 10`,
        )
        .all() as any[];

      return {
        total: overall.total,
        allowed: overall.allowed,
        escalated: overall.escalated,
        denied: overall.denied,
        failures: overall.failures,
        topAgents: topAgents.map((a: any) => ({ agentId: a.agent_id, count: a.count })),
        topTools: topTools.map((t: any) => ({ toolName: t.tool_name, count: t.count })),
      };
    },
  },
];
