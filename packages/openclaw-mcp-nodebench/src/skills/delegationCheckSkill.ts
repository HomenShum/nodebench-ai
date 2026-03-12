/**
 * deeptrace-delegation-check — ClawHub skill for agent passport & permission checking.
 *
 * Lets any OpenClaw agent create agent passports with scoped permissions,
 * check tool authorization before execution, and audit delegation history.
 * Pre-flight permission checks prevent unauthorized actions.
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

function ensureDelegationTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS deeptrace_passports (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      trust_tier TEXT NOT NULL DEFAULT 'sandbox',
      allowed_tools TEXT NOT NULL DEFAULT '[]',
      denied_tools TEXT NOT NULL DEFAULT '[]',
      escalated_tools TEXT NOT NULL DEFAULT '[]',
      spend_limit REAL NOT NULL DEFAULT 0,
      data_scope TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_passports_agent ON deeptrace_passports(agent_id);
    CREATE INDEX IF NOT EXISTS idx_passports_tier ON deeptrace_passports(trust_tier);

    CREATE TABLE IF NOT EXISTS deeptrace_delegation_log (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      decision TEXT NOT NULL,
      reason TEXT NOT NULL,
      checked_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_delegation_agent ON deeptrace_delegation_log(agent_id);
  `);
}

type TrustTier = "sandbox" | "supervised" | "autonomous";

function getTierDefault(tier: TrustTier): "deny" | "escalate" | "allow" {
  switch (tier) {
    case "sandbox":
      return "deny";
    case "supervised":
      return "escalate";
    case "autonomous":
      return "allow";
  }
}

export const delegationCheckSkill: McpTool[] = [
  {
    name: "deeptrace_create_passport",
    description:
      "Create or update an agent passport — the scoped identity that defines what an agent can read, spend, sign, and execute. Passports enforce trust tiers (sandbox/supervised/autonomous) with explicit tool-level overrides.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Unique agent identifier" },
        displayName: { type: "string", description: "Human-readable agent name" },
        trustTier: {
          type: "string",
          enum: ["sandbox", "supervised", "autonomous"],
          description: "Trust tier — sandbox (deny-by-default), supervised (escalate-by-default), autonomous (allow-by-default)",
        },
        allowedTools: {
          type: "array",
          items: { type: "string" },
          description: "Tools explicitly allowed (overrides tier default)",
        },
        deniedTools: {
          type: "array",
          items: { type: "string" },
          description: "Tools explicitly denied (overrides tier default)",
        },
        escalatedTools: {
          type: "array",
          items: { type: "string" },
          description: "Tools requiring human approval before execution",
        },
        spendLimit: { type: "number", description: "Max spend per action in USD (0 = no spend)" },
        dataScope: {
          type: "array",
          items: { type: "string" },
          description: "Data domains this agent can access",
        },
      },
      required: ["agentId", "displayName", "trustTier"],
    },
    handler: async (args: any) => {
      ensureDelegationTables();
      const db = getDb();

      const existing = db
        .prepare("SELECT id FROM deeptrace_passports WHERE agent_id = ?")
        .get(args.agentId) as any;

      if (existing) {
        db.prepare(
          `UPDATE deeptrace_passports SET
            display_name = ?, trust_tier = ?, allowed_tools = ?, denied_tools = ?,
            escalated_tools = ?, spend_limit = ?, data_scope = ?, revoked_at = NULL
          WHERE agent_id = ?`,
        ).run(
          args.displayName,
          args.trustTier,
          JSON.stringify(args.allowedTools ?? []),
          JSON.stringify(args.deniedTools ?? []),
          JSON.stringify(args.escalatedTools ?? []),
          args.spendLimit ?? 0,
          JSON.stringify(args.dataScope ?? []),
          args.agentId,
        );
        return { passportId: existing.id, agentId: args.agentId, action: "updated" };
      }

      const id = genId("pass");
      db.prepare(
        `INSERT INTO deeptrace_passports (id, agent_id, display_name, trust_tier, allowed_tools, denied_tools, escalated_tools, spend_limit, data_scope)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        args.agentId,
        args.displayName,
        args.trustTier,
        JSON.stringify(args.allowedTools ?? []),
        JSON.stringify(args.deniedTools ?? []),
        JSON.stringify(args.escalatedTools ?? []),
        args.spendLimit ?? 0,
        JSON.stringify(args.dataScope ?? []),
      );

      return { passportId: id, agentId: args.agentId, action: "created" };
    },
  },

  {
    name: "deeptrace_check_permission",
    description:
      "Pre-flight permission check — can this agent use this tool? Resolves the agent's passport, applies trust tier defaults, checks explicit overrides, and logs the decision. Call this BEFORE executing any tool to enforce delegation boundaries.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Agent to check" },
        toolName: { type: "string", description: "Tool the agent wants to use" },
      },
      required: ["agentId", "toolName"],
    },
    handler: async (args: any) => {
      ensureDelegationTables();
      const db = getDb();

      const passport = db
        .prepare("SELECT * FROM deeptrace_passports WHERE agent_id = ? AND revoked_at IS NULL")
        .get(args.agentId) as any;

      if (!passport) {
        const logId = genId("dlg");
        db.prepare(
          "INSERT INTO deeptrace_delegation_log (id, agent_id, tool_name, decision, reason) VALUES (?, ?, ?, ?, ?)",
        ).run(logId, args.agentId, args.toolName, "denied", "No active passport found");
        return {
          decision: "denied",
          reason: "No active passport found for this agent",
          agentId: args.agentId,
          toolName: args.toolName,
        };
      }

      const denied: string[] = JSON.parse(passport.denied_tools || "[]");
      const allowed: string[] = JSON.parse(passport.allowed_tools || "[]");
      const escalated: string[] = JSON.parse(passport.escalated_tools || "[]");
      const tier = passport.trust_tier as TrustTier;

      let decision: "allowed" | "denied" | "escalated";
      let reason: string;

      if (denied.includes(args.toolName)) {
        decision = "denied";
        reason = `Tool '${args.toolName}' is explicitly denied in passport`;
      } else if (escalated.includes(args.toolName)) {
        decision = "escalated";
        reason = `Tool '${args.toolName}' requires human approval`;
      } else if (allowed.includes(args.toolName)) {
        decision = "allowed";
        reason = `Tool '${args.toolName}' is explicitly allowed in passport`;
      } else {
        const tierDefault = getTierDefault(tier);
        decision = tierDefault === "deny" ? "denied" : tierDefault === "escalate" ? "escalated" : "allowed";
        reason = `No explicit rule — falling back to '${tier}' tier default (${tierDefault})`;
      }

      const logId = genId("dlg");
      db.prepare(
        "INSERT INTO deeptrace_delegation_log (id, agent_id, tool_name, decision, reason) VALUES (?, ?, ?, ?, ?)",
      ).run(logId, args.agentId, args.toolName, decision, reason);

      return {
        decision,
        reason,
        agentId: args.agentId,
        toolName: args.toolName,
        trustTier: tier,
        displayName: passport.display_name,
        spendLimit: passport.spend_limit,
      };
    },
  },

  {
    name: "deeptrace_get_passport",
    description:
      "Retrieve an agent's full passport — trust tier, tool permissions, spend limits, data scope, and delegation history.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Agent identifier" },
      },
      required: ["agentId"],
    },
    handler: async (args: any) => {
      ensureDelegationTables();
      const db = getDb();

      const passport = db
        .prepare("SELECT * FROM deeptrace_passports WHERE agent_id = ?")
        .get(args.agentId) as any;

      if (!passport) {
        return { error: "Passport not found", agentId: args.agentId };
      }

      const recentChecks = db
        .prepare(
          "SELECT tool_name, decision, reason, checked_at FROM deeptrace_delegation_log WHERE agent_id = ? ORDER BY checked_at DESC LIMIT 20",
        )
        .all(args.agentId) as any[];

      return {
        passportId: passport.id,
        agentId: passport.agent_id,
        displayName: passport.display_name,
        trustTier: passport.trust_tier,
        active: !passport.revoked_at,
        allowedTools: JSON.parse(passport.allowed_tools || "[]"),
        deniedTools: JSON.parse(passport.denied_tools || "[]"),
        escalatedTools: JSON.parse(passport.escalated_tools || "[]"),
        spendLimit: passport.spend_limit,
        dataScope: JSON.parse(passport.data_scope || "[]"),
        createdAt: passport.created_at,
        revokedAt: passport.revoked_at,
        recentDelegationChecks: recentChecks.map((c: any) => ({
          toolName: c.tool_name,
          decision: c.decision,
          reason: c.reason,
          checkedAt: c.checked_at,
        })),
      };
    },
  },

  {
    name: "deeptrace_revoke_passport",
    description:
      "Revoke an agent's passport — immediately denies all future tool calls for this agent until a new passport is issued.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Agent whose passport to revoke" },
        reason: { type: "string", description: "Reason for revocation" },
      },
      required: ["agentId"],
    },
    handler: async (args: any) => {
      ensureDelegationTables();
      const db = getDb();

      const result = db
        .prepare("UPDATE deeptrace_passports SET revoked_at = datetime('now') WHERE agent_id = ? AND revoked_at IS NULL")
        .run(args.agentId);

      if (result.changes === 0) {
        return { revoked: false, reason: "No active passport found" };
      }

      const logId = genId("dlg");
      db.prepare(
        "INSERT INTO deeptrace_delegation_log (id, agent_id, tool_name, decision, reason) VALUES (?, ?, ?, ?, ?)",
      ).run(logId, args.agentId, "*", "revoked", args.reason ?? "Passport revoked");

      return { revoked: true, agentId: args.agentId, reason: args.reason ?? "Passport revoked" };
    },
  },
];
