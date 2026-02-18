import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";
import { SUSPICIOUS_ARG_PATTERNS } from "./sandboxTools.js";
import { getActiveSessions } from "./sessionTools.js";

// ── Enforcement Pipeline ──────────────────────────────────────────────
// Every OpenClaw skill call flows through this single chokepoint.
// The pipeline: session → allowlist → patterns → budget → approval → proxy → audit → anomaly scan

function scanForSuspiciousPatterns(
  argsStr: string,
  customPatterns: string[]
): { match: boolean; pattern: string } | null {
  // Check default patterns
  for (const pattern of SUSPICIOUS_ARG_PATTERNS) {
    if (pattern.test(argsStr)) {
      return { match: true, pattern: pattern.source };
    }
  }
  // Check custom patterns
  for (const customStr of customPatterns) {
    try {
      const custom = new RegExp(customStr, "i");
      if (custom.test(argsStr)) {
        return { match: true, pattern: customStr };
      }
    } catch {
      // Invalid regex — skip silently
    }
  }
  return null;
}

function scanResultForAnomalies(result: any): string[] {
  const anomalies: string[] = [];
  const resultStr = typeof result === "string" ? result : JSON.stringify(result);

  // Check for credential leaks in response
  if (/(?:api[_-]?key|token|secret|password)\s*[:=]\s*["']?\w{8,}/i.test(resultStr)) {
    anomalies.push("Potential credential leak detected in response");
  }
  // Check for unexpected file paths
  if (/(?:\/etc\/|C:\\Windows\\|\/root\/|~\/\.ssh)/i.test(resultStr)) {
    anomalies.push("Sensitive file path detected in response");
  }
  // Check for base64 encoded content (potential data exfiltration)
  if (/[A-Za-z0-9+/]{100,}={0,2}/.test(resultStr)) {
    anomalies.push("Large base64 payload detected in response");
  }

  return anomalies;
}

export const proxyTools: McpTool[] = [
  {
    name: "call_openclaw_skill",
    description:
      "Run an OpenClaw skill safely through security checks. " +
      "Every call is validated against the session policy: approved/blocked list check, " +
      "checking for dangerous inputs, enforcing call and time limits, and steps needing your approval. " +
      "All calls are logged to the activity history regardless of outcome. " +
      "In strict mode, results are scanned for unusual activity (exposed passwords, access to sensitive folders).",
    inputSchema: {
      type: "object",
      properties: {
        skill: {
          type: "string",
          description: "OpenClaw skill name to invoke",
        },
        args: {
          type: "object",
          description: "Arguments for the skill",
        },
        sessionId: {
          type: "string",
          description: "Session ID (from connect_openclaw). Uses most recent active if omitted.",
        },
        justification: {
          type: "string",
          description:
            "Why this skill is needed (logged for audit trail, REQUIRED in strict monitoring mode)",
        },
      },
      required: ["skill"],
    },
    handler: async (args: any) => {
      const db = getDb();
      const skillName: string = args.skill;
      const skillArgs: any = args.args ?? {};
      let sessionId: string = args.sessionId;
      const justification: string | null = args.justification ?? null;
      const startTime = Date.now();

      // ── Step 1: Resolve session ─────────────────────────────────
      if (!sessionId) {
        const latest = db
          .prepare(
            "SELECT id FROM openclaw_sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1"
          )
          .get() as any;
        if (!latest) {
          return {
            error: "No active OpenClaw sessions. Call connect_openclaw first.",
            quickRef: {
              nextAction: "Connect to OpenClaw with a sandbox policy.",
              nextTools: ["connect_openclaw"],
              methodology: "agent_security",
            },
          };
        }
        sessionId = latest.id;
      }

      const session = db
        .prepare("SELECT * FROM openclaw_sessions WHERE id = ? AND status = 'active'")
        .get(sessionId) as any;

      if (!session) {
        return { error: `Session '${sessionId}' not found or not active.` };
      }

      // ── Step 2: Load policy ─────────────────────────────────────
      const policy = db
        .prepare("SELECT * FROM openclaw_policies WHERE policy_name = ?")
        .get(session.policy_name) as any;

      if (!policy) {
        return { error: `Policy '${session.policy_name}' not found. Session is orphaned.` };
      }

      const allowedTools: string[] = JSON.parse(policy.allowed_tools);
      const blockedTools: string[] = JSON.parse(policy.blocked_tools);
      const forbiddenPatterns: string[] = JSON.parse(policy.forbidden_patterns);
      const requireApproval: string[] = JSON.parse(policy.require_approval);
      const monitoringLevel: string = policy.monitoring_level;

      // Helper: log to audit trail
      const logAudit = (
        status: string,
        violationType?: string,
        violationDetail?: string
      ) => {
        const durationMs = Date.now() - startTime;
        db.prepare(
          `INSERT INTO openclaw_audit_log
            (id, session_id, skill_name, args, result_status, violation_type, violation_detail, duration_ms, justification)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          genId("aud"),
          sessionId,
          skillName,
          JSON.stringify(skillArgs),
          status,
          violationType ?? null,
          violationDetail ?? null,
          durationMs,
          justification
        );
        // Update session call count
        db.prepare(
          "UPDATE openclaw_sessions SET total_calls = total_calls + 1 WHERE id = ?"
        ).run(sessionId);
        if (violationType) {
          db.prepare(
            "UPDATE openclaw_sessions SET violations = violations + 1 WHERE id = ?"
          ).run(sessionId);
        }
      };

      // ── Step 3: Strict mode requires justification ──────────────
      if (monitoringLevel === "strict" && !justification) {
        logAudit("blocked", "missing_justification", "Strict mode requires justification");
        return {
          blocked: true,
          reason: "Strict monitoring mode requires a justification for every skill call.",
          skill: skillName,
          quickRef: {
            nextAction: "Re-call with justification parameter.",
            nextTools: ["call_openclaw_skill"],
            methodology: "agent_security",
          },
        };
      }

      // ── Step 4: Allowlist check ─────────────────────────────────
      if (!allowedTools.includes(skillName)) {
        logAudit("blocked", "not_in_allowlist", `Skill '${skillName}' not in allowlist`);
        return {
          blocked: true,
          reason: `Skill '${skillName}' is not in the policy allowlist.`,
          allowedSkills: allowedTools,
          skill: skillName,
        };
      }

      // ── Step 5: Blocklist check ─────────────────────────────────
      if (blockedTools.includes(skillName)) {
        logAudit("blocked", "in_blocklist", `Skill '${skillName}' is blocked`);
        return {
          blocked: true,
          reason: `Skill '${skillName}' is explicitly blocked by security policy.`,
          skill: skillName,
        };
      }

      // ── Step 6: Argument pattern scanning ───────────────────────
      const argsStr = JSON.stringify(skillArgs);
      const patternMatch = scanForSuspiciousPatterns(argsStr, forbiddenPatterns);
      if (patternMatch) {
        logAudit("blocked", "forbidden_pattern", `Matched pattern: ${patternMatch.pattern}`);
        return {
          blocked: true,
          reason: `Arguments contain a forbidden pattern: ${patternMatch.pattern}`,
          skill: skillName,
        };
      }

      // ── Step 7: Resource budget check ───────────────────────────
      if (session.total_calls >= policy.max_calls) {
        logAudit("blocked", "budget_exceeded", `Max calls (${policy.max_calls}) exceeded`);
        // Auto-disconnect
        db.prepare(
          "UPDATE openclaw_sessions SET status = 'completed', ended_at = datetime('now'), end_reason = 'budget_exceeded' WHERE id = ?"
        ).run(sessionId);
        getActiveSessions().delete(sessionId);
        return {
          blocked: true,
          reason: `Session budget exceeded: ${session.total_calls}/${policy.max_calls} calls used. Session auto-terminated.`,
          sessionTerminated: true,
          skill: skillName,
          quickRef: {
            nextAction: "Session terminated. Review audit and start a new session if needed.",
            nextTools: ["get_openclaw_audit", "connect_openclaw"],
            methodology: "agent_security",
          },
        };
      }

      // Duration check
      const sessionStart = new Date(session.started_at).getTime();
      const elapsedMin = (Date.now() - sessionStart) / 60000;
      if (elapsedMin >= policy.max_duration_min) {
        logAudit(
          "blocked",
          "duration_exceeded",
          `Max duration (${policy.max_duration_min}min) exceeded`
        );
        db.prepare(
          "UPDATE openclaw_sessions SET status = 'completed', ended_at = datetime('now'), end_reason = 'duration_exceeded' WHERE id = ?"
        ).run(sessionId);
        getActiveSessions().delete(sessionId);
        return {
          blocked: true,
          reason: `Session duration exceeded: ${Math.round(elapsedMin)}min / ${policy.max_duration_min}min. Session auto-terminated.`,
          sessionTerminated: true,
          skill: skillName,
        };
      }

      // ── Step 8: Approval gate ───────────────────────────────────
      if (requireApproval.includes(skillName)) {
        logAudit("approval_required", "requires_approval", `Skill '${skillName}' needs human approval`);
        return {
          approvalRequired: true,
          reason: `Skill '${skillName}' requires human approval before execution.`,
          skill: skillName,
          args: skillArgs,
          justification,
          tip: "To proceed, the human operator must approve this call. Re-call after approval.",
        };
      }

      // ── Step 9: Proxy to OpenClaw MCP ───────────────────────────
      // In a real implementation, this would call the connected MCP driver:
      //   call_driver_tool({ driver: `openclaw-${sessionId}`, tool: skillName, args: skillArgs })
      // For now, we simulate the proxy and log the call.

      let result: any;
      let resultStatus = "success";
      try {
        // Simulated proxy — in production, replace with actual MCP bridge call
        result = {
          _simulated: true,
          message: `Skill '${skillName}' would be proxied to OpenClaw MCP server.`,
          skill: skillName,
          args: skillArgs,
          note: "Connect a real OpenClaw MCP server for actual execution.",
        };
      } catch (error: any) {
        resultStatus = "error";
        result = { error: error.message || String(error) };
      }

      // ── Step 10: Anomaly scan (strict mode) ─────────────────────
      let anomalies: string[] = [];
      if (monitoringLevel === "strict" && resultStatus === "success") {
        anomalies = scanResultForAnomalies(result);
        if (anomalies.length > 0) {
          logAudit("success", "anomaly_detected", anomalies.join("; "));
        } else {
          logAudit("success");
        }
      } else {
        logAudit(resultStatus);
      }

      // ── Step 11: Return result + budget status ──────────────────
      const updatedSession = db
        .prepare("SELECT total_calls, violations FROM openclaw_sessions WHERE id = ?")
        .get(sessionId) as any;

      return {
        success: resultStatus === "success",
        skill: skillName,
        result,
        budget: {
          callsUsed: updatedSession?.total_calls ?? 0,
          callsRemaining: policy.max_calls - (updatedSession?.total_calls ?? 0),
          minutesElapsed: Math.round(elapsedMin),
          minutesRemaining: Math.max(0, policy.max_duration_min - Math.round(elapsedMin)),
        },
        anomalies: anomalies.length > 0 ? anomalies : undefined,
        warnings: anomalies.length > 0
          ? "Anomalies detected in response. Review the audit trail."
          : undefined,
        quickRef: {
          nextAction:
            anomalies.length > 0
              ? "ANOMALIES DETECTED. Review audit trail immediately."
              : "Skill executed. Continue or review audit.",
          nextTools:
            anomalies.length > 0
              ? ["get_openclaw_audit", "disconnect_openclaw"]
              : ["call_openclaw_skill", "get_openclaw_audit"],
          methodology: "agent_security",
        },
      };
    },
  },
];
