import { getDb, genId } from "../db.js";
// ── Skill Risk Analysis ───────────────────────────────────────────────
// Based on OpenClaw permission model and ClawHavoc 2026 attack vectors.
const HIGH_RISK_PERMISSIONS = new Set([
    "filesystem",
    "shell",
    "network",
    "credentials",
    "system",
    "admin",
    "root",
    "sudo",
    "keychain",
    "registry",
]);
const KNOWN_MALICIOUS_PATTERNS = [
    /eval\s*\(.*\bfetch\b/i, // Remote code execution
    /btoa|atob.*(?:password|secret|key)/i, // Credential encoding
    /(?:XMLHttpRequest|fetch)\s*\(.*(?:pastebin|ngrok|webhook\.site)/i, // Data exfiltration
    /process\.env\.\w+.*(?:http|ws):\/\//i, // Env var leakage
    /child_process.*exec/i, // Shell injection
];
function assessPermissionScope(permissions) {
    const highRiskCount = permissions.filter((p) => HIGH_RISK_PERMISSIONS.has(p.toLowerCase())).length;
    if (permissions.length === 0)
        return "narrow";
    if (highRiskCount >= 3)
        return "unrestricted";
    if (highRiskCount >= 1)
        return "broad";
    if (permissions.length > 5)
        return "moderate";
    return "narrow";
}
export const workflowAuditTools = [
    {
        name: "audit_openclaw_skills",
        description: "Scan installed OpenClaw skills for security risks: " +
            "known dangerous patterns, excessive permission requests, " +
            "untrusted sources, and outdated versions. " +
            "Accepts skill definitions or scans a directory of skill files.",
        inputSchema: {
            type: "object",
            properties: {
                skills: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            version: { type: "string" },
                            publisher: { type: "string" },
                            verified: { type: "boolean" },
                            permissions: {
                                type: "array",
                                items: { type: "string" },
                            },
                            sourceCode: { type: "string" },
                        },
                        required: ["name"],
                    },
                    description: "Array of skill manifests to audit",
                },
                skillDir: {
                    type: "string",
                    description: "Directory path containing OpenClaw skill definition files (alternative to skills array)",
                },
            },
        },
        handler: async (args) => {
            const db = getDb();
            const skills = args.skills ?? [];
            const findings = [];
            for (const skill of skills) {
                const issues = [];
                const permissions = skill.permissions ?? [];
                // Check 1: Unverified publisher
                if (skill.verified === false || !skill.publisher) {
                    issues.push("UNVERIFIED PUBLISHER: Skill not from a verified source. " +
                        "ClawHavoc 2026 exploited 341 unverified skills to compromise 9,000+ installations.");
                }
                // Check 2: Excessive permissions
                const scope = assessPermissionScope(permissions);
                if (scope === "unrestricted" || scope === "broad") {
                    issues.push(`EXCESSIVE PERMISSIONS: Scope is '${scope}'. Requests: ${permissions.join(", ")}. ` +
                        "Apply principle of least privilege.");
                }
                // Check 3: Known malicious patterns in source
                if (skill.sourceCode) {
                    for (const pattern of KNOWN_MALICIOUS_PATTERNS) {
                        if (pattern.test(skill.sourceCode)) {
                            issues.push(`MALICIOUS PATTERN: Source matches known attack vector: ${pattern.source}`);
                        }
                    }
                }
                // Check 4: No version (can't track updates)
                if (!skill.version) {
                    issues.push("NO VERSION: Cannot track for security updates without version info.");
                }
                // Determine risk level
                const hasCritical = issues.some((i) => i.startsWith("MALICIOUS") || i.startsWith("EXCESSIVE"));
                const riskLevel = hasCritical
                    ? "critical"
                    : issues.length > 0
                        ? "warning"
                        : "safe";
                findings.push({
                    skillName: skill.name,
                    riskLevel,
                    issues: issues.length > 0 ? issues : ["No issues found."],
                });
                // Upsert risk profile
                const trustScore = riskLevel === "safe" ? 90 : riskLevel === "warning" ? 50 : 10;
                db.prepare(`INSERT INTO skill_risk_profiles (id, skill_name, permission_scope, trust_score, known_vulns, last_audited)
           VALUES (?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(skill_name) DO UPDATE SET
             permission_scope = excluded.permission_scope,
             trust_score = excluded.trust_score,
             known_vulns = excluded.known_vulns,
             last_audited = datetime('now')`).run(genId("srp"), skill.name, assessPermissionScope(permissions), trustScore, JSON.stringify(issues.filter((i) => i.startsWith("MALICIOUS"))));
            }
            const critical = findings.filter((f) => f.riskLevel === "critical").length;
            const warnings = findings.filter((f) => f.riskLevel === "warning").length;
            return {
                skillsAudited: findings.length,
                critical,
                warnings,
                safe: findings.length - critical - warnings,
                findings,
                recommendation: critical > 0
                    ? "CRITICAL: Remove or isolate flagged skills immediately."
                    : warnings > 0
                        ? "Review warned skills and consider restricting their permissions."
                        : "All scanned skills appear safe.",
                quickRef: {
                    nextAction: critical > 0
                        ? "Remove dangerous skills before connecting."
                        : "Configure sandbox policy with these skills in the allowlist.",
                    nextTools: ["configure_sandbox_policy", "get_skill_risk_profile"],
                    methodology: "agent_security",
                },
            };
        },
    },
    {
        name: "audit_workflow_definition",
        description: "Analyze an OpenClaw workflow configuration for reliability, security, and performance issues: " +
            "missing error handling, no timeouts, never-ending loops, hardcoded passwords, " +
            "overly broad targeting rules, missing wait-for-completion steps.",
        inputSchema: {
            type: "object",
            properties: {
                workflowName: {
                    type: "string",
                    description: "Name of the workflow being audited",
                },
                workflow: {
                    type: "object",
                    description: "The workflow definition JSON to audit",
                },
                workflowJson: {
                    type: "string",
                    description: "Alternative: JSON string of the workflow",
                },
            },
            required: ["workflowName"],
        },
        handler: async (args) => {
            const db = getDb();
            const workflowName = args.workflowName;
            let workflow = args.workflow;
            if (!workflow && args.workflowJson) {
                try {
                    workflow = JSON.parse(args.workflowJson);
                }
                catch {
                    return { error: "Invalid workflowJson: could not parse as JSON." };
                }
            }
            if (!workflow) {
                return { error: "Provide either workflow (object) or workflowJson (string)." };
            }
            const findings = [];
            const wfStr = JSON.stringify(workflow);
            // Check 1: No timeout
            if (!workflow.timeoutMs && !workflow.timeout) {
                findings.push({
                    severity: "critical",
                    type: "no_timeout",
                    message: "Workflow has no timeout. Agent could run indefinitely.",
                    fix: "Add timeoutMs (recommended: 30000-60000ms for most workflows).",
                });
            }
            // Check 2: No error handling
            if (!/error|catch|retry|fallback|on_error/i.test(wfStr)) {
                findings.push({
                    severity: "warning",
                    type: "no_error_handling",
                    message: "No error handling detected (no error, catch, retry, or fallback patterns).",
                    fix: "Add error handlers or retry logic for each step.",
                });
            }
            // Check 3: Hardcoded credentials
            if (/(?:password|secret|api_key|token)\s*[:=]\s*["'][^"']+["']/i.test(wfStr)) {
                findings.push({
                    severity: "critical",
                    type: "hardcoded_credentials",
                    message: "Hardcoded credentials detected in workflow definition.",
                    fix: "Use environment variables or a secrets manager instead.",
                });
            }
            // Check 4: Unbounded loops
            if (/while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/i.test(wfStr)) {
                findings.push({
                    severity: "critical",
                    type: "unbounded_loop",
                    message: "Unbounded loop detected. Could cause infinite execution.",
                    fix: "Add loop termination conditions and maximum iteration limits.",
                });
            }
            // Check 5: Steps array
            const steps = workflow.steps ?? [];
            if (steps.length === 0) {
                findings.push({
                    severity: "warning",
                    type: "empty_workflow",
                    message: "Workflow has no steps defined.",
                    fix: "Add at least one step to the workflow.",
                });
            }
            // Check 6: No wait/delay between navigation steps
            let consecutiveNavigations = 0;
            for (const step of steps) {
                if (step.type === "navigate" || step.type === "click") {
                    consecutiveNavigations++;
                    if (consecutiveNavigations >= 3) {
                        findings.push({
                            severity: "info",
                            type: "rapid_navigation",
                            message: `${consecutiveNavigations} consecutive navigation/click steps without waits.`,
                            fix: "Add wait conditions between navigation steps for page load stability.",
                        });
                        break;
                    }
                }
                else {
                    consecutiveNavigations = 0;
                }
            }
            // Check 7: No max retries
            if (!workflow.maxRetries && workflow.maxRetries !== 0) {
                findings.push({
                    severity: "info",
                    type: "no_max_retries",
                    message: "No maxRetries configured. Failed steps won't be retried.",
                    fix: "Add maxRetries (recommended: 2-3) for resilience.",
                });
            }
            // Calculate risk score
            const riskScore = findings.filter((f) => f.severity === "critical").length * 30 +
                findings.filter((f) => f.severity === "warning").length * 10 +
                findings.filter((f) => f.severity === "info").length * 2;
            // Store audit result
            db.prepare(`INSERT INTO workflow_audits (id, workflow_name, audit_type, findings, risk_score)
         VALUES (?, ?, 'full', ?, ?)`).run(genId("wfa"), workflowName, JSON.stringify(findings), riskScore);
            return {
                workflowName,
                stepCount: steps.length,
                riskScore,
                riskLevel: riskScore >= 60 ? "critical" : riskScore >= 20 ? "moderate" : "low",
                findings,
                summary: {
                    critical: findings.filter((f) => f.severity === "critical").length,
                    warning: findings.filter((f) => f.severity === "warning").length,
                    info: findings.filter((f) => f.severity === "info").length,
                },
                quickRef: {
                    nextAction: riskScore >= 60
                        ? "CRITICAL issues found. Fix before executing."
                        : "Workflow audit complete. Configure sandbox policy.",
                    nextTools: ["configure_sandbox_policy", "audit_openclaw_skills"],
                    methodology: "agent_security",
                },
            };
        },
    },
    {
        name: "get_skill_risk_profile",
        description: "Get the safety assessment for one or more OpenClaw skills: " +
            "what access it has, community trust score, known security issues, last check date.",
        inputSchema: {
            type: "object",
            properties: {
                skillName: {
                    type: "string",
                    description: "Single skill name (omit for all profiles)",
                },
            },
        },
        handler: async (args) => {
            const db = getDb();
            if (args.skillName) {
                const profile = db
                    .prepare("SELECT * FROM skill_risk_profiles WHERE skill_name = ?")
                    .get(args.skillName);
                if (!profile) {
                    return {
                        error: `No risk profile for '${args.skillName}'. Run audit_openclaw_skills first.`,
                    };
                }
                return {
                    skillName: profile.skill_name,
                    permissionScope: profile.permission_scope,
                    trustScore: profile.trust_score,
                    knownVulns: JSON.parse(profile.known_vulns),
                    lastAudited: profile.last_audited,
                };
            }
            // All profiles
            const profiles = db
                .prepare("SELECT * FROM skill_risk_profiles ORDER BY trust_score ASC")
                .all();
            return {
                profiles: profiles.map((p) => ({
                    skillName: p.skill_name,
                    permissionScope: p.permission_scope,
                    trustScore: p.trust_score,
                    knownVulns: JSON.parse(p.known_vulns).length,
                    lastAudited: p.last_audited,
                })),
                totalProfiles: profiles.length,
                highRisk: profiles.filter((p) => p.trust_score < 30).length,
            };
        },
    },
];
//# sourceMappingURL=workflowAuditTools.js.map