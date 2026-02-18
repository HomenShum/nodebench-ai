import type { ToolRegistryEntry } from "../types.js";

export const REGISTRY: ToolRegistryEntry[] = [
  // ═══ SANDBOX — Policy management ═══
  {
    name: "configure_sandbox_policy",
    category: "sandbox",
    tags: ["sandbox", "policy", "allowlist", "blocklist", "budget", "security", "configure", "agent"],
    quickRef: {
      nextAction: "Policy configured. Connect with connect_openclaw.",
      nextTools: ["connect_openclaw", "check_openclaw_status"],
      methodology: "agent_security",
      relatedGotchas: ["allowlist_over_blocklist", "sandbox_mode_default_off"],
      tip: "Always use explicit allowlists. Never use '*'.",
    },
    phase: "configure",
    complexity: "medium",
  },
  {
    name: "list_sandbox_policies",
    category: "sandbox",
    tags: ["sandbox", "policy", "list", "overview"],
    quickRef: {
      nextAction: "Select a policy or create a new one.",
      nextTools: ["get_policy_detail", "configure_sandbox_policy"],
      methodology: "agent_security",
    },
    phase: "configure",
    complexity: "low",
  },
  {
    name: "get_policy_detail",
    category: "sandbox",
    tags: ["sandbox", "policy", "detail", "inspect", "review"],
    quickRef: {
      nextAction: "Review effective blocklist. Connect if satisfied.",
      nextTools: ["connect_openclaw", "configure_sandbox_policy"],
      methodology: "agent_security",
    },
    phase: "configure",
    complexity: "low",
  },
  {
    name: "delete_sandbox_policy",
    category: "sandbox",
    tags: ["sandbox", "policy", "delete", "cleanup"],
    quickRef: {
      nextAction: "Policy deleted. Create a new one if needed.",
      nextTools: ["configure_sandbox_policy"],
      methodology: "agent_security",
    },
    phase: "configure",
    complexity: "low",
  },

  // ═══ SESSION — Connection management ═══
  {
    name: "connect_openclaw",
    category: "session",
    tags: ["openclaw", "connect", "session", "mcp", "spawn", "openclawd", "tensol", "local"],
    quickRef: {
      nextAction: "Session active. Use call_openclaw_skill to invoke skills.",
      nextTools: ["call_openclaw_skill", "get_openclaw_audit"],
      methodology: "agent_security",
      relatedGotchas: ["concurrent_session_race", "memory_persistence_risk"],
      tip: "Tool list is filtered by policy. Blocked skills are invisible.",
    },
    phase: "connect",
    complexity: "high",
  },
  {
    name: "disconnect_openclaw",
    category: "session",
    tags: ["openclaw", "disconnect", "session", "end", "cleanup", "compliance"],
    quickRef: {
      nextAction: "Session ended. Review audit and record learnings.",
      nextTools: ["get_openclaw_audit", "record_openclaw_gotcha"],
      methodology: "agent_security",
    },
    phase: "audit",
    complexity: "medium",
  },
  {
    name: "check_openclaw_status",
    category: "session",
    tags: ["openclaw", "status", "check", "setup", "docker", "installation", "probe"],
    quickRef: {
      nextAction: "Review readiness. Follow setup instructions if needed.",
      nextTools: ["scaffold_openclaw_sandbox", "configure_sandbox_policy"],
      methodology: "agent_security",
      relatedGotchas: ["windows_wsl2_required", "mcp_protocol_version"],
    },
    phase: "configure",
    complexity: "low",
  },

  // ═══ PROXY — Enforcement point ═══
  {
    name: "call_openclaw_skill",
    category: "proxy",
    tags: ["openclaw", "skill", "call", "invoke", "proxy", "enforce", "sandbox", "agent"],
    quickRef: {
      nextAction: "Check remaining budget. Log results if significant.",
      nextTools: ["call_openclaw_skill", "get_openclaw_audit", "record_openclaw_gotcha"],
      methodology: "agent_security",
      relatedGotchas: ["prompt_injection_via_web", "audit_before_trust"],
      tip: "In strict mode, justification is required. Every call is logged.",
    },
    phase: "invoke",
    complexity: "high",
  },

  // ═══ AUDIT — Compliance & review ═══
  {
    name: "get_openclaw_audit",
    category: "audit",
    tags: ["openclaw", "audit", "log", "compliance", "violations", "security", "review", "trail"],
    quickRef: {
      nextAction: "Review violations. Address issues before continuing.",
      nextTools: ["get_session_compliance", "disconnect_openclaw", "export_audit_report"],
      methodology: "agent_security",
      relatedGotchas: ["audit_before_trust", "audit_log_rotation"],
    },
    phase: "audit",
    complexity: "medium",
  },
  {
    name: "get_session_compliance",
    category: "audit",
    tags: ["openclaw", "compliance", "grade", "score", "session", "security"],
    quickRef: {
      nextAction: "Grade D or F = address violations. Grade A-C = acceptable.",
      nextTools: ["get_openclaw_audit", "export_audit_report"],
      methodology: "agent_security",
    },
    phase: "audit",
    complexity: "medium",
  },
  {
    name: "export_audit_report",
    category: "audit",
    tags: ["openclaw", "audit", "export", "report", "markdown", "compliance", "documentation"],
    quickRef: {
      nextAction: "Report exported. Include in PR or compliance docs.",
      nextTools: ["disconnect_openclaw", "record_openclaw_gotcha"],
      methodology: "agent_security",
    },
    phase: "audit",
    complexity: "low",
  },

  // ═══ WORKFLOW AUDIT — Risk analysis ═══
  {
    name: "audit_openclaw_skills",
    category: "workflow_audit",
    tags: ["openclaw", "skills", "audit", "security", "malicious", "clawhavoc", "risk"],
    quickRef: {
      nextAction: "Remove critical-risk skills. Configure policy with safe skills.",
      nextTools: ["configure_sandbox_policy", "get_skill_risk_profile"],
      methodology: "agent_security",
      relatedGotchas: ["skill_marketplace_unsigned", "broad_permission_scope"],
    },
    phase: "configure",
    complexity: "high",
  },
  {
    name: "audit_workflow_definition",
    category: "workflow_audit",
    tags: ["openclaw", "workflow", "audit", "reliability", "timeout", "error-handling"],
    quickRef: {
      nextAction: "Fix critical findings before executing workflow.",
      nextTools: ["configure_sandbox_policy", "audit_openclaw_skills"],
      methodology: "agent_security",
      relatedGotchas: ["workflow_timeout_required", "workflow_error_handling"],
    },
    phase: "configure",
    complexity: "medium",
  },
  {
    name: "get_skill_risk_profile",
    category: "workflow_audit",
    tags: ["openclaw", "skill", "risk", "profile", "trust", "permissions", "vulnerabilities"],
    quickRef: {
      nextAction: "Review risk profiles. Exclude high-risk skills from allowlist.",
      nextTools: ["configure_sandbox_policy", "audit_openclaw_skills"],
      methodology: "agent_security",
      relatedGotchas: ["skill_version_pinning", "broad_permission_scope"],
    },
    phase: "configure",
    complexity: "low",
  },

  // ═══ SCAFFOLD — Project setup ═══
  {
    name: "scaffold_openclaw_sandbox",
    category: "scaffold",
    tags: ["openclaw", "scaffold", "docker", "container", "sandbox", "setup", "wsl2", "podman"],
    quickRef: {
      nextAction: "Build Docker image, then connect with connect_openclaw.",
      nextTools: ["connect_openclaw", "check_openclaw_status"],
      methodology: "agent_security",
      relatedGotchas: ["docker_no_root", "network_isolation_default", "read_only_filesystem"],
      tip: "Dry run by default. Review Dockerfile and security policies before writing.",
    },
    phase: "scaffold",
    complexity: "medium",
  },
  {
    name: "scaffold_openclaw_project",
    category: "scaffold",
    tags: ["openclaw", "scaffold", "project", "setup", "starter", "mcp-config", "agents-md"],
    quickRef: {
      nextAction: "Install dependencies and configure sandbox policy.",
      nextTools: ["configure_sandbox_policy", "check_openclaw_status"],
      methodology: "agent_security",
    },
    phase: "scaffold",
    complexity: "low",
  },

  // ═══ GOTCHA — Knowledge base ═══
  {
    name: "record_openclaw_gotcha",
    category: "gotcha",
    tags: ["openclaw", "gotcha", "record", "knowledge", "learning", "pitfall"],
    quickRef: {
      nextAction: "Gotcha recorded. Search with search_openclaw_gotchas.",
      nextTools: ["search_openclaw_gotchas"],
      methodology: "agent_security",
    },
    phase: "learn",
    complexity: "low",
  },
  {
    name: "search_openclaw_gotchas",
    category: "gotcha",
    tags: ["openclaw", "gotcha", "search", "knowledge", "fts5", "pitfall", "best-practice"],
    quickRef: {
      nextAction: "Apply gotcha learnings to your workflow.",
      nextTools: ["record_openclaw_gotcha", "configure_sandbox_policy"],
      methodology: "agent_security",
      relatedGotchas: ["embedding_search_cold_start"],
    },
    phase: "learn",
    complexity: "low",
  },
];

// ── Workflow Chains ─────────────────────────────────────────────────

export const WORKFLOW_CHAINS: Record<string, {
  name: string;
  description: string;
  steps: Array<{ tool: string; action: string }>;
}> = {
  openclaw_agent: {
    name: "OpenClaw Agent Session",
    description:
      "Safely run an OpenClaw AI agent with security policy, resource limits, and activity logging",
    steps: [
      { tool: "check_openclaw_status", action: "Verify OpenClaw installation and Docker availability" },
      { tool: "audit_openclaw_skills", action: "Scan installed skills for security risks" },
      { tool: "configure_sandbox_policy", action: "Define approved skills, limits, and monitoring rules" },
      { tool: "connect_openclaw", action: "Start a secure OpenClaw session with policy applied" },
      { tool: "call_openclaw_skill", action: "Run skills through security checks (repeatable)" },
      { tool: "get_openclaw_audit", action: "Review activity log and rule compliance" },
      { tool: "get_session_compliance", action: "Get safety score (A-F grade)" },
      { tool: "disconnect_openclaw", action: "End session with safety summary" },
      { tool: "record_openclaw_gotcha", action: "Save lessons learned for future sessions" },
    ],
  },
  openclaw_sandbox_setup: {
    name: "OpenClaw Sandbox Setup",
    description: "Set up a Docker-based sandbox for OpenClaw with security hardening",
    steps: [
      { tool: "check_openclaw_status", action: "Check system readiness (OpenClaw + Docker)" },
      { tool: "scaffold_openclaw_sandbox", action: "Generate Docker sandbox files (dry run)" },
      { tool: "scaffold_openclaw_sandbox", action: "Write sandbox files (dryRun: false)" },
      { tool: "configure_sandbox_policy", action: "Define security policy for the sandbox" },
      { tool: "connect_openclaw", action: "Connect to OpenClaw in the Docker sandbox" },
    ],
  },
  openclaw_skill_audit: {
    name: "OpenClaw Skill Security Audit",
    description: "Full security check of installed OpenClaw skills",
    steps: [
      { tool: "audit_openclaw_skills", action: "Scan all installed skills" },
      { tool: "get_skill_risk_profile", action: "Review risk profiles" },
      { tool: "search_openclaw_gotchas", action: "Check for known issues with these skills" },
      { tool: "record_openclaw_gotcha", action: "Record any new findings" },
    ],
  },
  analyst_diagnostic: {
    name: "Analyst Diagnostic — Root Cause Over Bandaids",
    description: "When something fails, diagnose the root cause like an analyst, not slap on a bandaid like a junior dev",
    steps: [
      { tool: "search_openclaw_gotchas", action: "Check if this root cause is already known" },
      { tool: "get_openclaw_audit", action: "Review activity log for failure patterns" },
      { tool: "get_skill_risk_profile", action: "Check if the failing skill has known risk factors" },
      { tool: "record_openclaw_gotcha", action: "Record the root cause so it doesn't recur" },
    ],
  },
};
