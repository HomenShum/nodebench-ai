/**
 * Pre-seeded OpenClaw security gotchas.
 * Based on ClawHavoc 2026 incident analysis, CrowdStrike advisories,
 * and OpenClaw community security best practices.
 * Loaded into SQLite FTS5 on first run.
 */
export const OPENCLAW_GOTCHAS = [
  // ═══ SECURITY — ClawHavoc 2026 ═══
  {
    key: "skill_marketplace_unsigned",
    content:
      "NEVER install unsigned or unverified skills. In January 2026, 341 malicious skills " +
      "on the OpenClaw marketplace compromised over 9,000 installations (ClawHavoc incident). " +
      "Only install skills from verified publishers with established track records. " +
      "Review source code before installation when possible.",
    category: "security",
    severity: "critical",
    tags: "skills,marketplace,unsigned,clawhavoc,malicious,supply-chain",
  },
  {
    key: "sandbox_mode_default_off",
    content:
      "OpenClaw sandbox mode is OFF by default. Always enable sandbox mode explicitly " +
      "before running any untrusted workflows. Without sandbox mode, the agent has full " +
      "access to your filesystem, network, and credentials.",
    category: "sandbox",
    severity: "critical",
    tags: "sandbox,default,configuration,security",
  },
  {
    key: "credential_in_prompt",
    content:
      "Never pass API keys, passwords, or tokens directly in prompt text. " +
      "Prompts are logged and may be sent to LLM providers. " +
      "Use environment variables on the gateway host instead.",
    category: "security",
    severity: "critical",
    tags: "credentials,prompt,api-key,password,token,security",
  },
  {
    key: "memory_persistence_risk",
    content:
      "OpenClaw remembers everything from previous sessions by default. " +
      "Clear session memory before switching between tasks with different security contexts. " +
      "Sensitive data from one session can leak into another if memory is not cleared.",
    category: "security",
    severity: "warning",
    tags: "memory,persistence,context,leak,sessions",
  },
  {
    key: "osc52_clipboard_injection",
    content:
      "OpenClaw can receive OSC 52 escape sequences that silently copy data to clipboard. " +
      "Run terminal-based agents in a terminal emulator that blocks OSC 52, " +
      "or use the MCP stdio transport which doesn't interpret escape sequences.",
    category: "security",
    severity: "warning",
    tags: "terminal,osc52,clipboard,injection,escape-sequence",
  },
  {
    key: "prompt_injection_via_web",
    content:
      "When OpenClaw fetches web content, the page may contain prompt injection payloads. " +
      "Never let the agent execute instructions found in web content without human review. " +
      "Use read-only web skills and validate extracted data.",
    category: "security",
    severity: "critical",
    tags: "prompt-injection,web,fetch,content,validation",
  },

  // ═══ SANDBOX CONFIGURATION ═══
  {
    key: "concurrent_session_race",
    content:
      "Multiple OpenClaw sessions can conflict when accessing shared resources " +
      "(files, databases, APIs with rate limits). Set maxConcurrent=1 in sandbox policy " +
      "unless you've verified resource isolation between sessions.",
    category: "sandbox",
    severity: "warning",
    tags: "concurrent,sessions,race-condition,resources,isolation",
  },
  {
    key: "allowlist_over_blocklist",
    content:
      "Always prefer tool allowlists over blocklists for security. " +
      "Blocklists are incomplete by definition — new dangerous skills can be added. " +
      "Allowlists guarantee only approved skills can run.",
    category: "sandbox",
    severity: "warning",
    tags: "allowlist,blocklist,policy,principle-of-least-privilege",
  },
  {
    key: "docker_no_root",
    content:
      "Never run OpenClaw containers as root. Use a non-root user, drop ALL Linux capabilities, " +
      "and set no-new-privileges. Even inside a container, root access can lead to escape.",
    category: "sandbox",
    severity: "critical",
    tags: "docker,root,container,capabilities,security",
  },
  {
    key: "network_isolation_default",
    content:
      "Docker sandbox should use network_mode: none by default. " +
      "Only enable network access when the workflow explicitly requires it. " +
      "This prevents data exfiltration even if the agent is compromised.",
    category: "sandbox",
    severity: "warning",
    tags: "docker,network,isolation,exfiltration",
  },
  {
    key: "read_only_filesystem",
    content:
      "Use read_only: true in Docker for the root filesystem. " +
      "Mount /tmp as tmpfs with size limits. This prevents persistent backdoors " +
      "and limits filesystem-based attacks.",
    category: "sandbox",
    severity: "warning",
    tags: "docker,filesystem,read-only,tmpfs,security",
  },

  // ═══ WORKFLOW DESIGN ═══
  {
    key: "workflow_timeout_required",
    content:
      "Always set a timeoutMs on workflow definitions. Without timeouts, " +
      "a stuck agent can consume resources indefinitely. Recommended: 30-60 seconds " +
      "for simple workflows, 5 minutes for complex multi-step flows.",
    category: "workflow",
    severity: "warning",
    tags: "workflow,timeout,resource,runaway",
  },
  {
    key: "workflow_error_handling",
    content:
      "Add error handlers to every workflow step. Without them, a single failure " +
      "silently aborts the entire workflow. Use retry logic (maxRetries: 2-3) " +
      "and fallback actions for critical steps.",
    category: "workflow",
    severity: "warning",
    tags: "workflow,error,retry,fallback,resilience",
  },
  {
    key: "workflow_wait_between_navigation",
    content:
      "Add explicit wait conditions between navigation and click steps. " +
      "Pages need time to load, and rapid navigation causes flaky workflows. " +
      "Use waitForSelector or waitForNavigation instead of fixed delays.",
    category: "workflow",
    severity: "info",
    tags: "workflow,wait,navigation,flaky,stability",
  },
  {
    key: "workflow_hardcoded_selectors",
    content:
      "Avoid hardcoded CSS selectors that break when the target site updates. " +
      "Prefer data-testid attributes, ARIA labels, or semantic selectors. " +
      "Monitor selector stability with periodic workflow health checks.",
    category: "workflow",
    severity: "info",
    tags: "workflow,selector,css,stability,maintenance",
  },

  // ═══ DEPLOYMENT ═══
  {
    key: "openclawd_vs_selfhosted",
    content:
      "OpenClawd AI provides pre-hardened cloud environments with managed security updates. " +
      "Self-hosted OpenClaw requires manual security hardening (Docker, firewall, TLS). " +
      "For production workloads, consider managed deployment unless you have dedicated DevSecOps.",
    category: "deployment",
    severity: "info",
    tags: "openclawd,self-hosted,managed,deployment,production",
  },
  {
    key: "tensol_vm_isolation",
    content:
      "Tensol deploys OpenClaw in isolated VMs, providing stronger isolation than Docker. " +
      "For high-security workloads (financial, healthcare, PII), VM isolation is recommended " +
      "over container isolation. Tensol handles credential rotation and access control.",
    category: "deployment",
    severity: "info",
    tags: "tensol,vm,isolation,security,enterprise",
  },
  {
    key: "env_var_not_args",
    content:
      "Pass configuration to OpenClaw via environment variables, not command-line arguments. " +
      "CLI args appear in process listings (ps aux) and shell history. " +
      "Use .env files with restrictive permissions (chmod 600).",
    category: "deployment",
    severity: "warning",
    tags: "env,environment,args,cli,secrets,deployment",
  },

  // ═══ PERMISSIONS ═══
  {
    key: "broad_permission_scope",
    content:
      "OpenClaw skills requesting 'filesystem', 'shell', 'network', and 'credentials' " +
      "permissions should be treated as HIGH RISK. These permissions enable full system access. " +
      "Prefer skills with narrow, specific permissions (e.g. 'read_file' vs 'filesystem').",
    category: "permissions",
    severity: "critical",
    tags: "permissions,scope,filesystem,shell,network,credentials,risk",
  },
  {
    key: "skill_version_pinning",
    content:
      "Always pin skill versions in your configuration. Auto-updating skills " +
      "can introduce breaking changes or, worse, compromised updates. " +
      "Use audit_openclaw_skills regularly to check for security advisories.",
    category: "permissions",
    severity: "warning",
    tags: "skills,version,pinning,update,security",
  },

  // ═══ COMPATIBILITY ═══
  {
    key: "mcp_protocol_version",
    content:
      "OpenClaw's MCP server support (PR #5121) targets MCP protocol 2025-11-25. " +
      "Ensure your MCP client SDK version matches. Mismatched protocol versions " +
      "can cause silent tool discovery failures.",
    category: "compatibility",
    severity: "warning",
    tags: "mcp,protocol,version,compatibility,sdk",
  },
  {
    key: "windows_wsl2_required",
    content:
      "Docker-based OpenClaw sandboxes on Windows require Docker Desktop with WSL2 backend. " +
      "Hyper-V mode has known issues with stdio transport. " +
      "Alternative: use Podman with WSL2 for rootless containers.",
    category: "compatibility",
    severity: "info",
    tags: "windows,wsl2,docker,podman,compatibility",
  },

  // ═══ PERFORMANCE ═══
  {
    key: "audit_log_rotation",
    content:
      "The SQLite audit log grows with every call. For long-running deployments, " +
      "periodically export and archive old audit entries. " +
      "Query performance degrades above ~100K entries without pagination.",
    category: "performance",
    severity: "info",
    tags: "audit,log,sqlite,rotation,performance",
  },
  {
    key: "embedding_search_cold_start",
    content:
      "First-time embedding index initialization can take 5-10 seconds. " +
      "Subsequent searches are cached. For latency-sensitive setups, " +
      "pre-warm the index by calling search_openclaw_gotchas on startup.",
    category: "performance",
    severity: "info",
    tags: "embedding,search,cold-start,latency,cache",
  },

  // ═══ GENERAL ═══
  {
    key: "agent_contract_required",
    content:
      "When using OpenClaw with NodeBench, the agent contract MUST be followed: " +
      "front-door (search_all_knowledge + getMethodology + discover_tools) → " +
      "self-setup → pre-implementation → parallel coordination → ship gates → learn. " +
      "Skipping the contract degrades compliance scores.",
    category: "general",
    severity: "warning",
    tags: "agent-contract,nodebench,methodology,compliance",
  },
  {
    key: "audit_before_trust",
    content:
      "NEVER trust OpenClaw output without reviewing the audit trail. " +
      "AI agents can be manipulated via prompt injection, hallucinate file contents, " +
      "or silently fail. Always verify with get_openclaw_audit after sessions.",
    category: "general",
    severity: "critical",
    tags: "audit,trust,verification,prompt-injection,hallucination",
  },
  {
    key: "two_action_save_rule",
    content:
      "After every 2 web_search or fetch_url calls within OpenClaw, " +
      "save findings with record_openclaw_gotcha or save_session_note. " +
      "Context compaction can erase in-flight discoveries.",
    category: "general",
    severity: "warning",
    tags: "save,context,compaction,session,memory",
  },
  {
    key: "three_strike_error_protocol",
    content:
      "If OpenClaw fails 3 times on the same task: " +
      "Strike 1: Diagnose root cause, apply targeted fix. " +
      "Strike 2: Try different method or skill. " +
      "Strike 3: Stop, save all attempts, escalate to human.",
    category: "general",
    severity: "warning",
    tags: "error,retry,escalation,protocol,resilience",
  },
];
