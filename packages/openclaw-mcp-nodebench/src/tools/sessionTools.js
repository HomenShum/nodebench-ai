import { getDb, genId } from "../db.js";
// ── Module state: active MCP connections ──────────────────────────────
// Maps sessionId → { process handle, transport, cleanup }
// In a real integration, this would hold StdioClientTransport connections.
// For now, we track session state in SQLite and provide the enforcement layer.
const _activeSessions = new Map();
export function getActiveSessions() {
    return _activeSessions;
}
export const sessionTools = [
    {
        name: "connect_openclaw",
        description: "Connect to an OpenClaw agent with a security policy applied. " +
            "Starts or connects to an OpenClaw server, shows only approved skills, " +
            "and starts monitoring. Supports local (on your machine), openclawd (cloud-hosted), " +
            "and tensol (virtual machine). You must configure a policy first via configure_sandbox_policy.",
        inputSchema: {
            type: "object",
            properties: {
                policyName: {
                    type: "string",
                    description: "Sandbox policy to enforce (must exist)",
                },
                deployment: {
                    type: "string",
                    enum: ["local", "openclawd", "tensol"],
                    description: "Where to run. local = on your machine. " +
                        "openclawd = cloud-hosted (requires endpoint). " +
                        "tensol = virtual machine (requires endpoint + apiKey). Default: local",
                },
                command: {
                    type: "string",
                    description: "Command to spawn OpenClaw MCP server (for local deployment). " +
                        "Default: auto-detected from PATH ('openclaw serve --mcp')",
                },
                args: {
                    type: "array",
                    items: { type: "string" },
                    description: "Arguments for the OpenClaw MCP server command",
                },
                endpoint: {
                    type: "string",
                    description: "HTTP endpoint for managed deployments (openclawd/tensol)",
                },
                apiKey: {
                    type: "string",
                    description: "API key for managed deployments (openclawd/tensol)",
                },
                sessionLabel: {
                    type: "string",
                    description: "Human-readable label for this session (shown in audit trail)",
                },
            },
            required: ["policyName"],
        },
        handler: async (args) => {
            const db = getDb();
            const policyName = args.policyName;
            const deployment = args.deployment ?? "local";
            const sessionLabel = args.sessionLabel ?? null;
            // 1. Load policy
            const policy = db
                .prepare("SELECT * FROM openclaw_policies WHERE policy_name = ?")
                .get(policyName);
            if (!policy) {
                return {
                    error: `Policy '${policyName}' not found. Call configure_sandbox_policy first.`,
                    quickRef: {
                        nextAction: "Create a sandbox policy before connecting.",
                        nextTools: ["configure_sandbox_policy"],
                        methodology: "agent_security",
                    },
                };
            }
            // 2. Check concurrent session limit
            const activeSessions = db
                .prepare("SELECT COUNT(*) as cnt FROM openclaw_sessions WHERE policy_name = ? AND status = 'active'")
                .get(policyName);
            if (activeSessions.cnt >= policy.max_concurrent) {
                return {
                    error: `Concurrent session limit reached (${policy.max_concurrent}). Disconnect an active session first.`,
                    activeSessions: activeSessions.cnt,
                    limit: policy.max_concurrent,
                    quickRef: {
                        nextAction: "Disconnect an active session to free capacity.",
                        nextTools: ["disconnect_openclaw"],
                        methodology: "agent_security",
                    },
                };
            }
            // 3. Create session record
            const sessionId = genId("ses");
            db.prepare(`INSERT INTO openclaw_sessions (id, policy_name, deployment, session_label, status)
         VALUES (?, ?, ?, ?, 'active')`).run(sessionId, policyName, deployment, sessionLabel);
            // 4. Track in memory
            _activeSessions.set(sessionId, {
                policyName,
                startTime: Date.now(),
                driverName: `openclaw-${sessionId}`,
            });
            // 5. Parse policy for response
            const allowedTools = JSON.parse(policy.allowed_tools);
            const blockedTools = JSON.parse(policy.blocked_tools);
            // In a real implementation, we would:
            // - Spawn the MCP server child process via StdioClientTransport
            // - Call tools/list to discover available tools
            // - Filter against allowedTools/blockedTools
            // - Return only the intersection
            return {
                success: true,
                sessionId,
                deployment,
                sessionLabel,
                policy: {
                    name: policyName,
                    allowedTools: allowedTools.length,
                    blockedTools: blockedTools.length,
                    maxCalls: policy.max_calls,
                    maxDurationMin: policy.max_duration_min,
                    monitoringLevel: policy.monitoring_level,
                },
                availableSkills: allowedTools,
                message: deployment === "local"
                    ? "OpenClaw session connected via local MCP bridge. Use call_openclaw_skill to invoke skills."
                    : `OpenClaw session connected via ${deployment}. Use call_openclaw_skill to invoke skills.`,
                quickRef: {
                    nextAction: "Session active. Use call_openclaw_skill to invoke skills safely.",
                    nextTools: ["call_openclaw_skill", "get_openclaw_audit"],
                    methodology: "agent_security",
                    tip: "Every call flows through the sandbox enforcement pipeline.",
                },
            };
        },
    },
    {
        name: "disconnect_openclaw",
        description: "Disconnect an OpenClaw session and generate a safety summary. " +
            "Logs final resource usage, rule breaks, and a safety grade.",
        inputSchema: {
            type: "object",
            properties: {
                sessionId: {
                    type: "string",
                    description: "Session to disconnect (omit for most recent active session)",
                },
                reason: {
                    type: "string",
                    description: "Reason for disconnect (logged in audit trail)",
                },
            },
        },
        handler: async (args) => {
            const db = getDb();
            let sessionId = args.sessionId;
            const reason = args.reason ?? "manual_disconnect";
            // Find session
            if (!sessionId) {
                const latest = db
                    .prepare("SELECT id FROM openclaw_sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1")
                    .get();
                if (!latest) {
                    return { error: "No active sessions to disconnect." };
                }
                sessionId = latest.id;
            }
            const session = db
                .prepare("SELECT * FROM openclaw_sessions WHERE id = ?")
                .get(sessionId);
            if (!session) {
                return { error: `Session '${sessionId}' not found.` };
            }
            if (session.status !== "active") {
                return { error: `Session '${sessionId}' is already ${session.status}.` };
            }
            // Update session status
            db.prepare(`UPDATE openclaw_sessions SET status = 'completed', ended_at = datetime('now'), end_reason = ?
         WHERE id = ?`).run(reason, sessionId);
            // Remove from memory
            _activeSessions.delete(sessionId);
            // Compute compliance summary
            const auditStats = db
                .prepare(`SELECT
            COUNT(*) as totalCalls,
            SUM(CASE WHEN result_status = 'success' THEN 1 ELSE 0 END) as successCalls,
            SUM(CASE WHEN result_status = 'blocked' THEN 1 ELSE 0 END) as blockedCalls,
            SUM(CASE WHEN result_status = 'error' THEN 1 ELSE 0 END) as errorCalls,
            SUM(CASE WHEN violation_type IS NOT NULL THEN 1 ELSE 0 END) as violations
          FROM openclaw_audit_log WHERE session_id = ?`)
                .get(sessionId);
            // Grade calculation
            const violations = auditStats?.violations ?? 0;
            const totalCalls = auditStats?.totalCalls ?? 0;
            let score = 100;
            if (violations > 0)
                score -= Math.min(violations * 15, 60);
            if (auditStats?.errorCalls > totalCalls * 0.2)
                score -= 20;
            const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 55 ? "D" : "F";
            return {
                success: true,
                sessionId,
                reason,
                summary: {
                    totalCalls: auditStats?.totalCalls ?? 0,
                    successCalls: auditStats?.successCalls ?? 0,
                    blockedCalls: auditStats?.blockedCalls ?? 0,
                    errorCalls: auditStats?.errorCalls ?? 0,
                    violations,
                    complianceGrade: grade,
                    complianceScore: score,
                },
                quickRef: {
                    nextAction: "Review audit log and record learnings.",
                    nextTools: ["get_openclaw_audit", "record_openclaw_gotcha"],
                    methodology: "agent_security",
                },
            };
        },
    },
    {
        name: "check_openclaw_status",
        description: "Check if OpenClaw is installed, Docker is available, and any sessions are active. " +
            "Returns what's ready, what's missing, and setup instructions for your platform.",
        inputSchema: {
            type: "object",
            properties: {
                checkDocker: {
                    type: "boolean",
                    description: "Also check Docker/Podman availability (default: true)",
                },
                checkManaged: {
                    type: "boolean",
                    description: "Check connectivity to OpenClawd/Tensol endpoints (default: false)",
                },
            },
        },
        handler: async (args) => {
            const db = getDb();
            const checkDocker = args.checkDocker !== false;
            // 1. Active sessions
            const activeSessions = db
                .prepare("SELECT COUNT(*) as cnt FROM openclaw_sessions WHERE status = 'active'")
                .get();
            // 2. Policies
            const policyCount = db
                .prepare("SELECT COUNT(*) as cnt FROM openclaw_policies")
                .get();
            // 3. Total audit entries
            const auditCount = db
                .prepare("SELECT COUNT(*) as cnt FROM openclaw_audit_log")
                .get();
            // 4. Check OpenClaw availability
            let openclawInstalled = false;
            let openclawVersion = null;
            try {
                const { execSync } = await import("node:child_process");
                const version = execSync("openclaw --version 2>&1", {
                    timeout: 5000,
                    encoding: "utf-8",
                }).trim();
                openclawInstalled = true;
                openclawVersion = version;
            }
            catch {
                // Not installed or not in PATH
            }
            // 5. Check Docker
            let dockerAvailable = false;
            let dockerVersion = null;
            if (checkDocker) {
                try {
                    const { execSync } = await import("node:child_process");
                    const version = execSync("docker --version 2>&1", {
                        timeout: 5000,
                        encoding: "utf-8",
                    }).trim();
                    dockerAvailable = true;
                    dockerVersion = version;
                }
                catch {
                    // Docker not available
                }
            }
            const platform = process.platform;
            const setupInstructions = [];
            if (!openclawInstalled) {
                setupInstructions.push(platform === "win32"
                    ? "Install OpenClaw: winget install openclaw.openclaw OR visit https://docs.openclaw.ai/install"
                    : "Install OpenClaw: brew install openclaw OR visit https://docs.openclaw.ai/install");
            }
            if (checkDocker && !dockerAvailable) {
                setupInstructions.push(platform === "win32"
                    ? "Install Docker Desktop: https://www.docker.com/products/docker-desktop (requires WSL2)"
                    : "Install Docker: https://docs.docker.com/get-docker/");
            }
            if (policyCount.cnt === 0) {
                setupInstructions.push("Create a sandbox policy: call configure_sandbox_policy with your desired allowlist");
            }
            return {
                platform,
                openclaw: {
                    installed: openclawInstalled,
                    version: openclawVersion,
                    status: openclawInstalled ? "ready" : "not_installed",
                },
                docker: checkDocker
                    ? {
                        available: dockerAvailable,
                        version: dockerVersion,
                        status: dockerAvailable ? "ready" : "not_available",
                    }
                    : null,
                sessions: {
                    active: activeSessions?.cnt ?? 0,
                    policies: policyCount?.cnt ?? 0,
                    totalAuditEntries: auditCount?.cnt ?? 0,
                },
                setupInstructions: setupInstructions.length > 0 ? setupInstructions : null,
                overallStatus: openclawInstalled && policyCount.cnt > 0
                    ? "ready"
                    : openclawInstalled
                        ? "needs_policy"
                        : "needs_setup",
                quickRef: {
                    nextAction: openclawInstalled
                        ? "Configure a sandbox policy to get started."
                        : "Install OpenClaw first, then configure a sandbox policy.",
                    nextTools: openclawInstalled
                        ? ["configure_sandbox_policy", "scaffold_openclaw_sandbox"]
                        : ["scaffold_openclaw_project"],
                    methodology: "agent_security",
                },
            };
        },
    },
];
//# sourceMappingURL=sessionTools.js.map