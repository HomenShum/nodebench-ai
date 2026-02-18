import type { McpTool, SandboxPolicy } from "../types.js";
import { getDb, genId } from "../db.js";

// ── Default Security Constants ────────────────────────────────────────
// These skills are ALWAYS blocked unless explicitly overridden via allowedTools.
// Based on known agent security attack vectors and OWASP guidelines.

export const DEFAULT_BLOCKED_SKILLS = [
  // File system destruction
  "exec_shell",
  "exec_command",
  "run_script",
  "eval_code",
  // File manipulation
  "file_delete",
  "file_move",
  "rmdir",
  "format_disk",
  // Supply chain (package installs)
  "install_package",
  "pip_install",
  "npm_install",
  // System modification
  "modify_system_settings",
  "change_permissions",
  "modify_registry",
  // Credential access
  "read_keychain",
  "get_stored_passwords",
  "access_credentials",
  // Network exfiltration
  "upload_file",
];

export const SUSPICIOUS_ARG_PATTERNS: RegExp[] = [
  /rm\s+-rf/i,
  /password|passwd|secret|token|api_key|apikey/i,
  /\/(etc\/passwd|etc\/shadow)/,
  /curl\s+.*\|\s*sh/i,
  /base64\s+--decode/i,
  /eval\s*\(/i,
  /wget\s+.*-O\s*-\s*\|/i,
  /powershell\s+-enc/i,
];

// ── Helper: compute effective blocklist ───────────────────────────────

export function computeEffectiveBlocklist(
  customBlocked: string[],
  allowedTools: string[]
): string[] {
  // Default blocklist + custom blocklist, minus anything explicitly allowed
  const allowedSet = new Set(allowedTools);
  const merged = new Set([...DEFAULT_BLOCKED_SKILLS, ...customBlocked]);
  // If user explicitly allows a skill, it overrides the default blocklist
  for (const tool of allowedSet) {
    merged.delete(tool);
  }
  return [...merged];
}

// ── Tools ─────────────────────────────────────────────────────────────

export const sandboxTools: McpTool[] = [
  {
    name: "configure_sandbox_policy",
    description:
      "Create or update a security policy for OpenClaw agent sessions. " +
      "Defines approved skills, blocked skills, resource limits (max calls, duration, concurrent sessions), " +
      "monitoring level (strict/standard/relaxed), dangerous input patterns to block, and skills needing your approval. " +
      "Must be configured BEFORE calling connect_openclaw. 18 dangerous skills are blocked by default.",
    inputSchema: {
      type: "object",
      properties: {
        policyName: {
          type: "string",
          description:
            "Unique policy identifier (e.g. 'email-assistant', 'code-reviewer', 'web-researcher')",
        },
        allowedTools: {
          type: "array",
          items: { type: "string" },
          description:
            "Approved skills list. Only these OpenClaw skills can be used. " +
            "If a skill is both approved here and on the default blocked list, approval wins.",
        },
        blockedTools: {
          type: "array",
          items: { type: "string" },
          description:
            "Additional skills to block beyond the default blocked list. Combined with defaults.",
        },
        maxCalls: {
          type: "number",
          description: "Maximum total tool invocations before auto-disconnect (default: 100)",
        },
        maxDurationMin: {
          type: "number",
          description: "Maximum session duration in minutes before auto-disconnect (default: 30)",
        },
        maxConcurrent: {
          type: "number",
          description: "Maximum parallel OpenClaw sessions (default: 1)",
        },
        monitoringLevel: {
          type: "string",
          enum: ["strict", "standard", "relaxed"],
          description:
            "strict = log + block suspicious patterns in results. " +
            "standard = log all calls. relaxed = log errors only. (default: standard)",
        },
        forbiddenPatterns: {
          type: "array",
          items: { type: "string" },
          description:
            "Additional regex patterns to block in tool arguments (merged with defaults). " +
            "Example: ['\\\\b(DROP|DELETE|TRUNCATE)\\\\b']",
        },
        requireApproval: {
          type: "array",
          items: { type: "string" },
          description:
            "Tools that pause for human approval before execution. " +
            "Returns approval_required status instead of executing.",
        },
      },
      required: ["policyName", "allowedTools"],
    },
    handler: async (args: any) => {
      const db = getDb();
      const policyName: string = args.policyName;
      const allowedTools: string[] = args.allowedTools ?? [];
      const blockedTools: string[] = args.blockedTools ?? [];
      const maxCalls: number = args.maxCalls ?? 100;
      const maxDurationMin: number = args.maxDurationMin ?? 30;
      const maxConcurrent: number = args.maxConcurrent ?? 1;
      const monitoringLevel: string = args.monitoringLevel ?? "standard";
      const forbiddenPatterns: string[] = args.forbiddenPatterns ?? [];
      const requireApproval: string[] = args.requireApproval ?? [];

      // Validate: no wildcard allowlists
      if (allowedTools.includes("*")) {
        return {
          error: "SECURITY: allowedTools cannot contain '*'. Always use explicit tool names.",
          tip: "List specific skills like ['web_search', 'read_file'] instead of '*'.",
        };
      }

      // Compute effective blocklist
      const effectiveBlocklist = computeEffectiveBlocklist(blockedTools, allowedTools);

      // Upsert policy
      const existing = db
        .prepare("SELECT id FROM openclaw_policies WHERE policy_name = ?")
        .get(policyName) as any;

      if (existing) {
        db.prepare(
          `UPDATE openclaw_policies SET
            allowed_tools = ?, blocked_tools = ?, max_calls = ?,
            max_duration_min = ?, max_concurrent = ?, monitoring_level = ?,
            forbidden_patterns = ?, require_approval = ?, updated_at = datetime('now')
          WHERE policy_name = ?`
        ).run(
          JSON.stringify(allowedTools),
          JSON.stringify(effectiveBlocklist),
          maxCalls,
          maxDurationMin,
          maxConcurrent,
          monitoringLevel,
          JSON.stringify(forbiddenPatterns),
          JSON.stringify(requireApproval),
          policyName
        );
      } else {
        db.prepare(
          `INSERT INTO openclaw_policies
            (id, policy_name, allowed_tools, blocked_tools, max_calls,
             max_duration_min, max_concurrent, monitoring_level,
             forbidden_patterns, require_approval)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          genId("pol"),
          policyName,
          JSON.stringify(allowedTools),
          JSON.stringify(effectiveBlocklist),
          maxCalls,
          maxDurationMin,
          maxConcurrent,
          monitoringLevel,
          JSON.stringify(forbiddenPatterns),
          JSON.stringify(requireApproval)
        );
      }

      return {
        success: true,
        action: existing ? "updated" : "created",
        policyName,
        summary: {
          allowedTools: allowedTools.length,
          effectiveBlocklist: effectiveBlocklist.length,
          maxCalls,
          maxDurationMin,
          maxConcurrent,
          monitoringLevel,
          forbiddenPatterns: forbiddenPatterns.length + SUSPICIOUS_ARG_PATTERNS.length,
          requireApproval: requireApproval.length,
        },
        effectiveBlocklist,
        quickRef: {
          nextAction: "Policy configured. Now connect with connect_openclaw to start a sandboxed session.",
          nextTools: ["connect_openclaw", "check_openclaw_status"],
          methodology: "agent_security",
          tip: "Review effectiveBlocklist to ensure no dangerous skills leak through.",
        },
      };
    },
  },

  {
    name: "list_sandbox_policies",
    description:
      "List all configured sandbox policies with session stats (active sessions, total violations triggered).",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      const db = getDb();
      const policies = db
        .prepare("SELECT * FROM openclaw_policies ORDER BY updated_at DESC")
        .all() as any[];

      const enriched = policies.map((p: any) => {
        const activeSessions = db
          .prepare(
            "SELECT COUNT(*) as cnt FROM openclaw_sessions WHERE policy_name = ? AND status = 'active'"
          )
          .get(p.policy_name) as any;

        const totalViolations = db
          .prepare(
            `SELECT COUNT(*) as cnt FROM openclaw_audit_log al
             JOIN openclaw_sessions s ON al.session_id = s.id
             WHERE s.policy_name = ? AND al.violation_type IS NOT NULL`
          )
          .get(p.policy_name) as any;

        return {
          policyName: p.policy_name,
          allowedTools: JSON.parse(p.allowed_tools).length,
          blockedTools: JSON.parse(p.blocked_tools).length,
          maxCalls: p.max_calls,
          maxDurationMin: p.max_duration_min,
          monitoringLevel: p.monitoring_level,
          activeSessions: activeSessions?.cnt ?? 0,
          totalViolations: totalViolations?.cnt ?? 0,
          updatedAt: p.updated_at,
        };
      });

      return {
        policies: enriched,
        totalPolicies: enriched.length,
        quickRef: {
          nextAction: "Select a policy and connect with connect_openclaw.",
          nextTools: ["get_policy_detail", "configure_sandbox_policy", "connect_openclaw"],
          methodology: "agent_security",
        },
      };
    },
  },

  {
    name: "get_policy_detail",
    description:
      "View full details of a sandbox policy including effective allowlist/blocklist after merging defaults.",
    inputSchema: {
      type: "object",
      properties: {
        policyName: { type: "string", description: "Policy name to inspect" },
      },
      required: ["policyName"],
    },
    handler: async (args: any) => {
      const db = getDb();
      const policy = db
        .prepare("SELECT * FROM openclaw_policies WHERE policy_name = ?")
        .get(args.policyName) as any;

      if (!policy) {
        return { error: `Policy '${args.policyName}' not found.` };
      }

      return {
        policyName: policy.policy_name,
        allowedTools: JSON.parse(policy.allowed_tools),
        blockedTools: JSON.parse(policy.blocked_tools),
        maxCalls: policy.max_calls,
        maxDurationMin: policy.max_duration_min,
        maxConcurrent: policy.max_concurrent,
        monitoringLevel: policy.monitoring_level,
        forbiddenPatterns: JSON.parse(policy.forbidden_patterns),
        requireApproval: JSON.parse(policy.require_approval),
        defaultBlocklistIncluded: DEFAULT_BLOCKED_SKILLS,
        createdAt: policy.created_at,
        updatedAt: policy.updated_at,
        quickRef: {
          nextAction: "Connect with connect_openclaw using this policy.",
          nextTools: ["connect_openclaw", "configure_sandbox_policy"],
          methodology: "agent_security",
        },
      };
    },
  },

  {
    name: "delete_sandbox_policy",
    description:
      "Delete a sandbox policy. Fails if any active sessions are using it.",
    inputSchema: {
      type: "object",
      properties: {
        policyName: { type: "string", description: "Policy name to delete" },
      },
      required: ["policyName"],
    },
    handler: async (args: any) => {
      const db = getDb();

      const activeSessions = db
        .prepare(
          "SELECT COUNT(*) as cnt FROM openclaw_sessions WHERE policy_name = ? AND status = 'active'"
        )
        .get(args.policyName) as any;

      if (activeSessions?.cnt > 0) {
        return {
          error: `Cannot delete policy '${args.policyName}': ${activeSessions.cnt} active session(s) using it. Disconnect first.`,
        };
      }

      const result = db
        .prepare("DELETE FROM openclaw_policies WHERE policy_name = ?")
        .run(args.policyName);

      return {
        success: result.changes > 0,
        deleted: result.changes > 0,
        message: result.changes > 0
          ? `Policy '${args.policyName}' deleted.`
          : `Policy '${args.policyName}' not found.`,
      };
    },
  },
];
