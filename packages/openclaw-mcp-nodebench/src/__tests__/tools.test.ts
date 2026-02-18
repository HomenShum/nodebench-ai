import { describe, it, expect, beforeAll } from "vitest";
import { getDb, seedGotchasIfEmpty } from "../db.js";
import { sandboxTools } from "../tools/sandboxTools.js";
import { sessionTools } from "../tools/sessionTools.js";
import { proxyTools } from "../tools/proxyTools.js";
import { auditTools } from "../tools/auditTools.js";
import { workflowAuditTools } from "../tools/workflowAuditTools.js";
import { scaffoldTools } from "../tools/scaffoldTools.js";
import { gotchaTools } from "../tools/gotchaTools.js";
import { OPENCLAW_GOTCHAS } from "../gotchaSeed.js";
import { REGISTRY } from "../tools/toolRegistry.js";

const ALL_TOOLS = [
  ...sandboxTools,
  ...sessionTools,
  ...proxyTools,
  ...auditTools,
  ...workflowAuditTools,
  ...scaffoldTools,
  ...gotchaTools,
];

beforeAll(() => {
  getDb();
  seedGotchasIfEmpty(
    OPENCLAW_GOTCHAS as unknown as Array<{
      key: string;
      content: string;
      category: string;
      severity: string;
      tags: string;
    }>
  );
});

// ═══ STATIC VALIDATION ═══

describe("Static Validation", () => {
  it("should have 18 tools total", () => {
    expect(ALL_TOOLS.length).toBe(18);
  });

  it("every tool should have name, description, inputSchema, handler", () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeTruthy();
      expect(typeof tool.handler).toBe("function");
    }
  });

  it("no duplicate tool names", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("every tool should have a registry entry", () => {
    for (const tool of ALL_TOOLS) {
      const entry = REGISTRY.find((e) => e.name === tool.name);
      expect(entry).toBeDefined();
    }
  });

  it("registry should have entries for all tools and no extras", () => {
    expect(REGISTRY.length).toBe(ALL_TOOLS.length);
  });

  it("gotcha seed should have 28+ entries", () => {
    expect(OPENCLAW_GOTCHAS.length).toBeGreaterThanOrEqual(28);
  });
});

// ═══ SANDBOX POLICY TOOLS ═══

describe("Sandbox Policy Tools", () => {
  it("configure_sandbox_policy creates a policy", async () => {
    const tool = sandboxTools.find((t) => t.name === "configure_sandbox_policy")!;
    const result = (await tool.handler({
      policyName: "test-policy",
      allowedTools: ["web_search", "read_file"],
      maxCalls: 50,
      monitoringLevel: "strict",
    })) as any;

    expect(result.success).toBe(true);
    expect(result.action).toBe("created");
    expect(result.summary.allowedTools).toBe(2);
    expect(result.summary.maxCalls).toBe(50);
  });

  it("configure_sandbox_policy rejects wildcard allowlist", async () => {
    const tool = sandboxTools.find((t) => t.name === "configure_sandbox_policy")!;
    const result = (await tool.handler({
      policyName: "bad-policy",
      allowedTools: ["*"],
    })) as any;

    expect(result.error).toBeTruthy();
    expect(result.error).toContain("*");
  });

  it("list_sandbox_policies returns policies", async () => {
    const tool = sandboxTools.find((t) => t.name === "list_sandbox_policies")!;
    const result = (await tool.handler({})) as any;

    expect(result.totalPolicies).toBeGreaterThanOrEqual(1);
    expect(result.policies[0].policyName).toBe("test-policy");
  });

  it("get_policy_detail shows effective blocklist", async () => {
    const tool = sandboxTools.find((t) => t.name === "get_policy_detail")!;
    const result = (await tool.handler({ policyName: "test-policy" })) as any;

    expect(result.allowedTools).toEqual(["web_search", "read_file"]);
    expect(result.blockedTools.length).toBeGreaterThan(0);
    expect(result.defaultBlocklistIncluded).toBeTruthy();
  });
});

// ═══ SESSION TOOLS ═══

describe("Session Tools", () => {
  it("connect_openclaw requires existing policy", async () => {
    const tool = sessionTools.find((t) => t.name === "connect_openclaw")!;
    const result = (await tool.handler({
      policyName: "nonexistent",
    })) as any;

    expect(result.error).toBeTruthy();
    expect(result.error).toContain("not found");
  });

  it("connect_openclaw creates a session with valid policy", async () => {
    const tool = sessionTools.find((t) => t.name === "connect_openclaw")!;
    const result = (await tool.handler({
      policyName: "test-policy",
      sessionLabel: "test-session",
    })) as any;

    expect(result.success).toBe(true);
    expect(result.sessionId).toBeTruthy();
    expect(result.policy.name).toBe("test-policy");
    expect(result.availableSkills).toEqual(["web_search", "read_file"]);
  });

  it("check_openclaw_status returns system info", async () => {
    const tool = sessionTools.find((t) => t.name === "check_openclaw_status")!;
    const result = (await tool.handler({ checkDocker: false })) as any;

    expect(result.platform).toBeTruthy();
    expect(result.sessions).toBeDefined();
    expect(result.sessions.active).toBeGreaterThanOrEqual(0);
  });
});

// ═══ PROXY ENFORCEMENT ═══

describe("Proxy Enforcement", () => {
  it("call_openclaw_skill blocks skills not in allowlist", async () => {
    const tool = proxyTools.find((t) => t.name === "call_openclaw_skill")!;
    const result = (await tool.handler({
      skill: "exec_shell",
      args: { cmd: "ls" },
      justification: "Testing allowlist enforcement",
    })) as any;

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("not in the policy allowlist");
  });

  it("call_openclaw_skill allows skills in allowlist", async () => {
    const tool = proxyTools.find((t) => t.name === "call_openclaw_skill")!;
    const result = (await tool.handler({
      skill: "web_search",
      args: { q: "test query" },
      justification: "Testing web search",
    })) as any;

    expect(result.success).toBe(true);
    expect(result.skill).toBe("web_search");
    expect(result.budget).toBeDefined();
    expect(result.budget.callsUsed).toBeGreaterThanOrEqual(1);
  });

  it("call_openclaw_skill blocks forbidden patterns in args", async () => {
    const tool = proxyTools.find((t) => t.name === "call_openclaw_skill")!;
    const result = (await tool.handler({
      skill: "web_search",
      args: { q: "rm -rf /" },
      justification: "Testing pattern detection",
    })) as any;

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("forbidden pattern");
  });

  it("call_openclaw_skill requires justification in strict mode", async () => {
    const tool = proxyTools.find((t) => t.name === "call_openclaw_skill")!;
    const result = (await tool.handler({
      skill: "web_search",
      args: { q: "test" },
      // No justification — strict mode should block
    })) as any;

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("justification");
  });
});

// ═══ AUDIT TOOLS ═══

describe("Audit Tools", () => {
  it("get_openclaw_audit returns audit entries", async () => {
    const tool = auditTools.find((t) => t.name === "get_openclaw_audit")!;
    const result = (await tool.handler({ sinceDaysAgo: 1 })) as any;

    expect(result.entries).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.summary.totalEntries).toBeGreaterThanOrEqual(1);
  });

  it("get_openclaw_audit filters violations only", async () => {
    const tool = auditTools.find((t) => t.name === "get_openclaw_audit")!;
    const result = (await tool.handler({ onlyViolations: true })) as any;

    // Should only contain entries with violation_type
    for (const entry of result.entries) {
      expect(entry.violationType).toBeTruthy();
    }
  });

  it("get_session_compliance returns a grade", async () => {
    const tool = auditTools.find((t) => t.name === "get_session_compliance")!;
    const result = (await tool.handler({})) as any;

    expect(result.compliance).toBeDefined();
    expect(result.compliance.grade).toMatch(/^[A-F]$/);
    expect(result.compliance.score).toBeGreaterThanOrEqual(0);
    expect(result.compliance.score).toBeLessThanOrEqual(100);
  });

  it("export_audit_report generates markdown", async () => {
    const tool = auditTools.find((t) => t.name === "export_audit_report")!;
    const result = (await tool.handler({})) as any;

    expect(result.markdown).toBeTruthy();
    expect(result.markdown).toContain("# OpenClaw Session Audit Report");
    expect(result.format).toBe("markdown");
  });
});

// ═══ WORKFLOW AUDIT TOOLS ═══

describe("Workflow Audit Tools", () => {
  it("audit_openclaw_skills detects unverified publishers", async () => {
    const tool = workflowAuditTools.find((t) => t.name === "audit_openclaw_skills")!;
    const result = (await tool.handler({
      skills: [
        { name: "sketchy_skill", verified: false, permissions: ["filesystem", "shell", "network"] },
        { name: "safe_skill", verified: true, publisher: "verified-corp", permissions: ["read_file"] },
      ],
    })) as any;

    expect(result.skillsAudited).toBe(2);
    expect(result.critical).toBeGreaterThanOrEqual(1);
    expect(result.findings[0].riskLevel).toBe("critical");
    expect(result.findings[1].riskLevel).not.toBe("critical");
  });

  it("audit_workflow_definition detects missing timeout", async () => {
    const tool = workflowAuditTools.find(
      (t) => t.name === "audit_workflow_definition"
    )!;
    const result = (await tool.handler({
      workflowName: "test-workflow",
      workflow: {
        steps: [
          { id: "step1", type: "navigate", config: {} },
          { id: "step2", type: "extract", config: {} },
        ],
        // No timeoutMs
      },
    })) as any;

    expect(result.findings.length).toBeGreaterThanOrEqual(1);
    expect(result.findings.some((f: any) => f.type === "no_timeout")).toBe(true);
    expect(result.riskScore).toBeGreaterThan(0);
  });
});

// ═══ SCAFFOLD TOOLS ═══

describe("Scaffold Tools", () => {
  it("scaffold_openclaw_sandbox dry run returns preview", async () => {
    const tool = scaffoldTools.find((t) => t.name === "scaffold_openclaw_sandbox")!;
    const result = (await tool.handler({
      projectPath: "/tmp/test-scaffold",
      dryRun: true,
    })) as any;

    expect(result.dryRun).toBe(true);
    expect(result.fileCount).toBeGreaterThanOrEqual(4);
    expect(result.securityFeatures).toBeDefined();
    expect(result.securityFeatures).toContain("Non-root user (openclaw)");
  });

  it("scaffold_openclaw_project dry run returns preview", async () => {
    const tool = scaffoldTools.find((t) => t.name === "scaffold_openclaw_project")!;
    const result = (await tool.handler({
      projectPath: "/tmp/test-project",
      projectName: "test-project",
      dryRun: true,
    })) as any;

    expect(result.dryRun).toBe(true);
    expect(result.fileCount).toBeGreaterThanOrEqual(3);
  });
});

// ═══ GOTCHA TOOLS ═══

describe("Gotcha Tools", () => {
  it("search_openclaw_gotchas finds seeded entries", async () => {
    const tool = gotchaTools.find((t) => t.name === "search_openclaw_gotchas")!;
    const result = (await tool.handler({ query: "sandbox" })) as any;

    expect(result.totalResults).toBeGreaterThanOrEqual(1);
    expect(result.results[0].key).toBeTruthy();
  });

  it("record_openclaw_gotcha creates a new entry", async () => {
    const recordTool = gotchaTools.find((t) => t.name === "record_openclaw_gotcha")!;
    const result = (await recordTool.handler({
      key: "test_gotcha_from_tests",
      content: "This is a test gotcha created by the test suite.",
      category: "general",
      severity: "info",
      tags: "test,automated",
    })) as any;

    expect(result.success).toBe(true);
    expect(["created", "updated"]).toContain(result.action);
  });

  it("search_openclaw_gotchas can filter by category", async () => {
    const tool = gotchaTools.find((t) => t.name === "search_openclaw_gotchas")!;
    const result = (await tool.handler({ category: "security" })) as any;

    expect(result.totalResults).toBeGreaterThanOrEqual(1);
    for (const r of result.results) {
      expect(r.category).toBe("security");
    }
  });
});

// ═══ DISCONNECT & CLEANUP ═══

describe("Session Disconnect", () => {
  it("disconnect_openclaw ends session with compliance summary", async () => {
    const tool = sessionTools.find((t) => t.name === "disconnect_openclaw")!;
    const result = (await tool.handler({
      reason: "test_complete",
    })) as any;

    expect(result.success).toBe(true);
    expect(result.summary).toBeDefined();
    expect(result.summary.complianceGrade).toMatch(/^[A-F]$/);
  });

  it("delete_sandbox_policy removes the test policy", async () => {
    const tool = sandboxTools.find((t) => t.name === "delete_sandbox_policy")!;
    const result = (await tool.handler({
      policyName: "test-policy",
    })) as any;

    expect(result.success).toBe(true);
    expect(result.deleted).toBe(true);
  });
});
