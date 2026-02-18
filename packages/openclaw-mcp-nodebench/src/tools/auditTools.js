import { getDb } from "../db.js";
export const auditTools = [
    {
        name: "get_openclaw_audit",
        description: "View the activity log for OpenClaw sessions. Shows every skill call " +
            "with arguments, results, rule breaks, and resource usage. " +
            "Use for safety review, debugging, and security incident investigation.",
        inputSchema: {
            type: "object",
            properties: {
                sessionId: {
                    type: "string",
                    description: "Filter by session (omit for all sessions)",
                },
                sinceDaysAgo: {
                    type: "number",
                    description: "Only show entries from last N days (default: 7)",
                },
                onlyViolations: {
                    type: "boolean",
                    description: "Only show policy violations (default: false)",
                },
                limit: {
                    type: "number",
                    description: "Max entries to return (default: 50)",
                },
            },
        },
        handler: async (args) => {
            const db = getDb();
            const sessionId = args.sessionId ?? null;
            const sinceDaysAgo = args.sinceDaysAgo ?? 7;
            const onlyViolations = args.onlyViolations ?? false;
            const limit = Math.min(args.limit ?? 50, 200);
            let query = `SELECT al.*, s.policy_name, s.deployment, s.session_label
        FROM openclaw_audit_log al
        JOIN openclaw_sessions s ON al.session_id = s.id
        WHERE al.created_at >= datetime('now', ?)`;
            const params = [`-${sinceDaysAgo} days`];
            if (sessionId) {
                query += " AND al.session_id = ?";
                params.push(sessionId);
            }
            if (onlyViolations) {
                query += " AND al.violation_type IS NOT NULL";
            }
            query += " ORDER BY al.created_at DESC LIMIT ?";
            params.push(limit);
            const entries = db.prepare(query).all(...params);
            // Summary stats
            const totalEntries = entries.length;
            const violations = entries.filter((e) => e.violation_type).length;
            const successCalls = entries.filter((e) => e.result_status === "success").length;
            const blockedCalls = entries.filter((e) => e.result_status === "blocked").length;
            // Violation breakdown
            const violationTypes = {};
            for (const e of entries) {
                if (e.violation_type) {
                    violationTypes[e.violation_type] = (violationTypes[e.violation_type] || 0) + 1;
                }
            }
            return {
                entries: entries.map((e) => ({
                    id: e.id,
                    sessionId: e.session_id,
                    policyName: e.policy_name,
                    deployment: e.deployment,
                    skillName: e.skill_name,
                    resultStatus: e.result_status,
                    violationType: e.violation_type,
                    violationDetail: e.violation_detail,
                    durationMs: e.duration_ms,
                    justification: e.justification,
                    createdAt: e.created_at,
                })),
                summary: {
                    totalEntries,
                    successCalls,
                    blockedCalls,
                    violations,
                    violationTypes,
                },
                filters: { sessionId, sinceDaysAgo, onlyViolations, limit },
                quickRef: {
                    nextAction: violations > 0
                        ? "Review violations and address security concerns."
                        : "Audit trail clean. Continue or disconnect.",
                    nextTools: ["get_session_compliance", "disconnect_openclaw", "export_audit_report"],
                    methodology: "agent_security",
                },
            };
        },
    },
    {
        name: "get_session_compliance",
        description: "Score an OpenClaw session against its security policy. " +
            "Returns A-F grade based on approved tool usage, budget usage, " +
            "number of rule breaks, and unusual activity detected.",
        inputSchema: {
            type: "object",
            properties: {
                sessionId: {
                    type: "string",
                    description: "Session to score (omit for most recent)",
                },
            },
        },
        handler: async (args) => {
            const db = getDb();
            let sessionId = args.sessionId;
            if (!sessionId) {
                const latest = db
                    .prepare("SELECT id FROM openclaw_sessions ORDER BY started_at DESC LIMIT 1")
                    .get();
                if (!latest) {
                    return { error: "No sessions found." };
                }
                sessionId = latest.id;
            }
            const session = db
                .prepare("SELECT * FROM openclaw_sessions WHERE id = ?")
                .get(sessionId);
            if (!session) {
                return { error: `Session '${sessionId}' not found.` };
            }
            const policy = db
                .prepare("SELECT * FROM openclaw_policies WHERE policy_name = ?")
                .get(session.policy_name);
            // Audit stats
            const stats = db
                .prepare(`SELECT
            COUNT(*) as total,
            SUM(CASE WHEN result_status = 'success' THEN 1 ELSE 0 END) as success,
            SUM(CASE WHEN result_status = 'blocked' THEN 1 ELSE 0 END) as blocked,
            SUM(CASE WHEN violation_type = 'not_in_allowlist' THEN 1 ELSE 0 END) as allowlistViolations,
            SUM(CASE WHEN violation_type = 'forbidden_pattern' THEN 1 ELSE 0 END) as patternViolations,
            SUM(CASE WHEN violation_type = 'anomaly_detected' THEN 1 ELSE 0 END) as anomalies,
            SUM(CASE WHEN violation_type = 'budget_exceeded' THEN 1 ELSE 0 END) as budgetViolations,
            SUM(CASE WHEN violation_type IS NOT NULL THEN 1 ELSE 0 END) as totalViolations
          FROM openclaw_audit_log WHERE session_id = ?`)
                .get(sessionId);
            const total = stats?.total ?? 0;
            const maxCalls = policy?.max_calls ?? 100;
            // Scoring dimensions (each 0-25, total 0-100)
            const allowlistAdherence = total > 0
                ? Math.round(25 * (1 - (stats.allowlistViolations ?? 0) / total))
                : 25;
            const budgetUsage = total <= maxCalls
                ? Math.round(25 * (1 - total / maxCalls))
                : 0;
            const violationPenalty = Math.max(0, 25 - (stats.totalViolations ?? 0) * 5);
            const anomalyPenalty = Math.max(0, 25 - (stats.anomalies ?? 0) * 10);
            const score = allowlistAdherence + budgetUsage + violationPenalty + anomalyPenalty;
            const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 55 ? "D" : "F";
            const violations = [];
            const recommendations = [];
            if (stats.allowlistViolations > 0) {
                violations.push(`${stats.allowlistViolations} allowlist violation(s)`);
                recommendations.push("Review which skills are being called outside the allowlist.");
            }
            if (stats.patternViolations > 0) {
                violations.push(`${stats.patternViolations} forbidden pattern match(es)`);
                recommendations.push("Inspect arguments for credential leaks or dangerous commands.");
            }
            if (stats.anomalies > 0) {
                violations.push(`${stats.anomalies} anomaly detection(s)`);
                recommendations.push("CRITICAL: Review anomaly details — possible data exfiltration.");
            }
            if (stats.budgetViolations > 0) {
                violations.push("Budget exceeded — session was auto-terminated");
                recommendations.push("Increase maxCalls in policy or reduce tool call frequency.");
            }
            if (violations.length === 0) {
                recommendations.push("Clean session. No violations detected.");
            }
            return {
                sessionId,
                policyName: session.policy_name,
                compliance: {
                    grade,
                    score,
                    dimensions: {
                        allowlistAdherence,
                        budgetUsage,
                        violationCount: violationPenalty,
                        anomalyDetections: anomalyPenalty,
                    },
                    violations,
                    recommendations,
                },
                sessionStats: {
                    totalCalls: total,
                    successCalls: stats.success ?? 0,
                    blockedCalls: stats.blocked ?? 0,
                    status: session.status,
                },
                quickRef: {
                    nextAction: grade === "F" || grade === "D"
                        ? "CRITICAL: Address violations before continuing."
                        : "Session compliance acceptable.",
                    nextTools: ["get_openclaw_audit", "export_audit_report"],
                    methodology: "agent_security",
                },
            };
        },
    },
    {
        name: "export_audit_report",
        description: "Export a session activity log as formatted markdown for pull request reports, " +
            "safety documentation, or incident investigation.",
        inputSchema: {
            type: "object",
            properties: {
                sessionId: {
                    type: "string",
                    description: "Session to export (omit for most recent)",
                },
            },
        },
        handler: async (args) => {
            const db = getDb();
            let sessionId = args.sessionId;
            if (!sessionId) {
                const latest = db
                    .prepare("SELECT id FROM openclaw_sessions ORDER BY started_at DESC LIMIT 1")
                    .get();
                if (!latest)
                    return { error: "No sessions found." };
                sessionId = latest.id;
            }
            const session = db
                .prepare("SELECT * FROM openclaw_sessions WHERE id = ?")
                .get(sessionId);
            if (!session)
                return { error: `Session '${sessionId}' not found.` };
            const entries = db
                .prepare("SELECT * FROM openclaw_audit_log WHERE session_id = ? ORDER BY created_at ASC")
                .all(sessionId);
            const violations = entries.filter((e) => e.violation_type);
            // Build markdown
            let md = `# OpenClaw Session Audit Report\n\n`;
            md += `**Session ID**: ${sessionId}\n`;
            md += `**Policy**: ${session.policy_name}\n`;
            md += `**Deployment**: ${session.deployment}\n`;
            md += `**Status**: ${session.status}\n`;
            md += `**Started**: ${session.started_at}\n`;
            md += `**Ended**: ${session.ended_at ?? "ongoing"}\n`;
            md += `**Total Calls**: ${session.total_calls}\n`;
            md += `**Violations**: ${session.violations}\n\n`;
            if (violations.length > 0) {
                md += `## Violations (${violations.length})\n\n`;
                md += `| # | Skill | Type | Detail | Time |\n`;
                md += `|---|-------|------|--------|------|\n`;
                violations.forEach((v, i) => {
                    md += `| ${i + 1} | ${v.skill_name} | ${v.violation_type} | ${v.violation_detail ?? "-"} | ${v.created_at} |\n`;
                });
                md += "\n";
            }
            md += `## Call Timeline (${entries.length} calls)\n\n`;
            md += `| # | Skill | Status | Duration | Time |\n`;
            md += `|---|-------|--------|----------|------|\n`;
            entries.forEach((e, i) => {
                md += `| ${i + 1} | ${e.skill_name} | ${e.result_status} | ${e.duration_ms ? `${e.duration_ms}ms` : "-"} | ${e.created_at} |\n`;
            });
            return {
                sessionId,
                markdown: md,
                format: "markdown",
                entryCount: entries.length,
                violationCount: violations.length,
            };
        },
    },
];
//# sourceMappingURL=auditTools.js.map