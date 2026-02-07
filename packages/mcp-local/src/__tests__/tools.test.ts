/**
 * Automated tests for NodeBench MCP tools.
 * Covers: static, unit, integration layers.
 * Live E2E layer is tested via bash pipe in the flywheel step.
 */
import { describe, it, expect } from "vitest";
import os from "node:os";
import path from "node:path";
import { mkdtemp, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { verificationTools } from "../tools/verificationTools.js";
import { reconTools } from "../tools/reconTools.js";
import { uiCaptureTools } from "../tools/uiCaptureTools.js";
import { visionTools } from "../tools/visionTools.js";
import { evalTools } from "../tools/evalTools.js";
import { qualityGateTools } from "../tools/qualityGateTools.js";
import { flywheelTools } from "../tools/flywheelTools.js";
import { learningTools } from "../tools/learningTools.js";
import { createMetaTools } from "../tools/metaTools.js";
import { webTools } from "../tools/webTools.js";
import { githubTools } from "../tools/githubTools.js";
import { documentationTools } from "../tools/documentationTools.js";
import { agentBootstrapTools } from "../tools/agentBootstrapTools.js";
import { selfEvalTools } from "../tools/selfEvalTools.js";
import { parallelAgentTools } from "../tools/parallelAgentTools.js";
import { llmTools } from "../tools/llmTools.js";
import { securityTools } from "../tools/securityTools.js";
import { platformTools } from "../tools/platformTools.js";
import { localFileTools } from "../tools/localFileTools.js";
import { researchWritingTools } from "../tools/researchWritingTools.js";
import { flickerDetectionTools } from "../tools/flickerDetectionTools.js";
import { figmaFlowTools } from "../tools/figmaFlowTools.js";
import { createProgressiveDiscoveryTools } from "../tools/progressiveDiscoveryTools.js";
import { boilerplateTools } from "../tools/boilerplateTools.js";
import { cCompilerBenchmarkTools } from "../tools/cCompilerBenchmarkTools.js";
import { getQuickRef, hybridSearch, TOOL_REGISTRY, SEARCH_MODES, ALL_REGISTRY_ENTRIES, WORKFLOW_CHAINS } from "../tools/toolRegistry.js";
import type { McpTool } from "../types.js";

// Assemble all tools like index.ts does
const domainTools: McpTool[] = [
  ...verificationTools,
  ...evalTools,
  ...qualityGateTools,
  ...learningTools,
  ...flywheelTools,
  ...reconTools,
  ...uiCaptureTools,
  ...visionTools,
  ...localFileTools,
  ...webTools,
  ...githubTools,
  ...documentationTools,
  ...agentBootstrapTools,
  ...selfEvalTools,
  ...parallelAgentTools,
  ...llmTools,
  ...securityTools,
  ...platformTools,
  ...researchWritingTools,
  ...flickerDetectionTools,
  ...figmaFlowTools,
  ...boilerplateTools,
  ...cCompilerBenchmarkTools,
];
const metaTools = createMetaTools(domainTools);
const allToolsWithoutDiscovery = [...domainTools, ...metaTools];
const discoveryTools = createProgressiveDiscoveryTools(
  allToolsWithoutDiscovery.map((t) => ({ name: t.name, description: t.description }))
);
const allTools = [...allToolsWithoutDiscovery, ...discoveryTools];

// ═══════════════════════════════════════════════════════════════════════════
// STATIC LAYER — structure validation
// ═══════════════════════════════════════════════════════════════════════════

describe("Static: tool structure", () => {
  it("should have 132 tools total", () => {
    // 127 domain tools + 2 meta tools (findTools, getMethodology) + 3 progressive discovery tools
    expect(allTools.length).toBe(132);
  });

  it("every tool has name, description, inputSchema, handler", () => {
    for (const tool of allTools) {
      expect(tool.name).toBeTruthy();
      expect(typeof tool.name).toBe("string");
      expect(tool.description).toBeTruthy();
      expect(typeof tool.description).toBe("string");
      expect(tool.inputSchema).toBeTruthy();
      expect(typeof tool.handler).toBe("function");
    }
  });

  it("tool names are unique", () => {
    const names = allTools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("abandon_cycle tool exists in verificationTools", () => {
    const tool = verificationTools.find((t) => t.name === "abandon_cycle");
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain("cycleId");
  });
});

describe("Static: ui_ux_qa preset", () => {
  it("should return 8 rules from get_gate_preset", async () => {
    const tool = findTool("get_gate_preset");
    const result = (await tool.handler({ preset: "ui_ux_qa" })) as any;
    expect(result.preset).toBe("ui_ux_qa");
    expect(result.ruleCount).toBe(8);
    expect(result.rules.map((r: any) => r.name)).toContain("component_renders");
    expect(result.rules.map((r: any) => r.name)).toContain("keyboard_navigable");
    expect(result.rules.map((r: any) => r.name)).toContain("aria_labels_present");
    expect(result.rules.map((r: any) => r.name)).toContain("storybook_story_exists");
  });

  it("should accept ui_ux_qa gate results via run_quality_gate", async () => {
    const tool = findTool("run_quality_gate");
    const result = (await tool.handler({
      gateName: "ui_ux_qa",
      target: "TestComponent",
      rules: [
        { name: "component_renders", passed: true },
        { name: "responsive_check", passed: true },
        { name: "keyboard_navigable", passed: false },
        { name: "aria_labels_present", passed: true },
        { name: "loading_states_handled", passed: true },
        { name: "no_console_errors", passed: true },
        { name: "visual_consistency", passed: true },
        { name: "storybook_story_exists", passed: false },
      ],
    })) as any;
    expect(result.passed).toBe(false);
    expect(result.totalRules).toBe(8);
    expect(result.passedCount).toBe(6);
    expect(result.failures).toContain("keyboard_navigable");
    expect(result.failures).toContain("storybook_story_exists");
  });
});

describe("Static: ui capture tools", () => {
  it("should include capture_ui_screenshot and capture_responsive_suite", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("capture_ui_screenshot");
    expect(names).toContain("capture_responsive_suite");
  });

  it("capture_ui_screenshot requires url parameter", () => {
    const tool = allTools.find((t) => t.name === "capture_ui_screenshot")!;
    expect(tool.inputSchema.required).toContain("url");
  });

  it("capture_responsive_suite requires url and label", () => {
    const tool = allTools.find((t) => t.name === "capture_responsive_suite")!;
    expect(tool.inputSchema.required).toContain("url");
    expect(tool.inputSchema.required).toContain("label");
  });

  it("capture_ui_screenshot has viewport enum with expected presets", () => {
    const tool = allTools.find((t) => t.name === "capture_ui_screenshot")!;
    const viewportProp = (tool.inputSchema as any).properties.viewport;
    expect(viewportProp.enum).toContain("mobile");
    expect(viewportProp.enum).toContain("tablet");
    expect(viewportProp.enum).toContain("desktop");
    expect(viewportProp.enum).toContain("wide");
    expect(viewportProp.enum).toContain("custom");
  });
});

describe("Static: vision tools", () => {
  it("should include discover_vision_env, analyze_screenshot, manipulate_screenshot", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("discover_vision_env");
    expect(names).toContain("analyze_screenshot");
    expect(names).toContain("manipulate_screenshot");
  });

  it("analyze_screenshot requires imageBase64 and has rawContent", () => {
    const tool = allTools.find((t) => t.name === "analyze_screenshot")!;
    expect(tool.inputSchema.required).toContain("imageBase64");
    expect(tool.rawContent).toBe(true);
  });

  it("manipulate_screenshot requires imageBase64 and operation", () => {
    const tool = allTools.find((t) => t.name === "manipulate_screenshot")!;
    expect(tool.inputSchema.required).toContain("imageBase64");
    expect(tool.inputSchema.required).toContain("operation");
    expect(tool.rawContent).toBe(true);
  });

  it("discover_vision_env has no required params", () => {
    const tool = allTools.find((t) => t.name === "discover_vision_env")!;
    const required = (tool.inputSchema as any).required;
    expect(required ?? []).toEqual([]);
  });
});

describe("Unit: discover_vision_env", () => {
  // Skip in CI - dynamic imports for SDK detection can timeout unpredictably
  it.skip("should return environment scan without errors", async () => {
    const tool = allTools.find((t) => t.name === "discover_vision_env")!;
    const result = (await tool.handler({})) as any;
    expect(result).toHaveProperty("apiKeys");
    expect(result).toHaveProperty("sdks");
    expect(result).toHaveProperty("providers");
    expect(result).toHaveProperty("canAnalyze");
    expect(result).toHaveProperty("canManipulate");
    expect(result).toHaveProperty("canCapture");
    expect(typeof result.canAnalyze).toBe("boolean");
  }, 30000);
});

describe("Static: agentic_vision methodology", () => {
  it("should return agentic_vision methodology from getMethodology", async () => {
    const tool = allTools.find((t) => t.name === "getMethodology")!;
    const result = (await tool.handler({ topic: "agentic_vision" })) as any;
    expect(result.title).toContain("Agentic Vision");
    expect(result.steps.length).toBe(6);
    expect(result.steps[0].name).toBe("Discover");
    expect(result.steps[2].name).toBe("Analyze");
  });
});

describe("Static: web tools", () => {
  it("should include web_search and fetch_url tools", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("web_search");
    expect(names).toContain("fetch_url");
  });

  it("web_search requires query parameter", () => {
    const tool = allTools.find((t) => t.name === "web_search")!;
    expect(tool.inputSchema.required).toContain("query");
  });

  it("fetch_url requires url parameter", () => {
    const tool = allTools.find((t) => t.name === "fetch_url")!;
    expect(tool.inputSchema.required).toContain("url");
  });
});

describe("Static: github tools", () => {
  it("should include search_github and analyze_repo tools", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("search_github");
    expect(names).toContain("analyze_repo");
  });

  it("search_github requires query parameter", () => {
    const tool = allTools.find((t) => t.name === "search_github")!;
    expect(tool.inputSchema.required).toContain("query");
  });

  it("analyze_repo requires repoUrl parameter", () => {
    const tool = allTools.find((t) => t.name === "analyze_repo")!;
    expect(tool.inputSchema.required).toContain("repoUrl");
  });
});

describe("Static: documentation tools", () => {
  it("should include update_agents_md, research_job_market, and setup_local_env tools", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("update_agents_md");
    expect(names).toContain("research_job_market");
    expect(names).toContain("setup_local_env");
  });

  it("update_agents_md requires operation parameter", () => {
    const tool = allTools.find((t) => t.name === "update_agents_md")!;
    expect(tool.inputSchema.required).toContain("operation");
  });

  it("research_job_market requires role parameter", () => {
    const tool = allTools.find((t) => t.name === "research_job_market")!;
    expect(tool.inputSchema.required).toContain("role");
  });
});

describe("Static: new methodology topics", () => {
  it("should return project_ideation methodology with 6 steps", async () => {
    const tool = allTools.find((t) => t.name === "getMethodology")!;
    const result = (await tool.handler({ topic: "project_ideation" })) as any;
    expect(result.title).toContain("Project Ideation");
    expect(result.steps.length).toBe(6);
    expect(result.steps[0].name).toBe("Define Concept");
  });

  it("should return tech_stack_2026 methodology with 5 steps", async () => {
    const tool = allTools.find((t) => t.name === "getMethodology")!;
    const result = (await tool.handler({ topic: "tech_stack_2026" })) as any;
    expect(result.title).toContain("Tech Stack");
    expect(result.steps.length).toBe(5);
  });

  it("should return telemetry_setup methodology with 5 steps", async () => {
    const tool = allTools.find((t) => t.name === "getMethodology")!;
    const result = (await tool.handler({ topic: "telemetry_setup" })) as any;
    expect(result.title).toContain("Telemetry");
    expect(result.steps.length).toBe(5);
  });

  it("should return agents_md_maintenance methodology with 5 steps", async () => {
    const tool = allTools.find((t) => t.name === "getMethodology")!;
    const result = (await tool.handler({ topic: "agents_md_maintenance" })) as any;
    expect(result.title).toContain("AGENTS.md");
    expect(result.steps.length).toBe(5);
  });

  it("overview should include all 16 methodology topics", async () => {
    const tool = allTools.find((t) => t.name === "getMethodology")!;
    const result = (await tool.handler({ topic: "overview" })) as any;
    const topics = Object.keys(result.steps[0].topics);
    expect(topics).toContain("project_ideation");
    expect(topics).toContain("tech_stack_2026");
    expect(topics).toContain("telemetry_setup");
    expect(topics).toContain("agents_md_maintenance");
    expect(topics).toContain("agent_bootstrap");
    expect(topics).toContain("autonomous_maintenance");
    expect(topics).toContain("parallel_agent_teams");
    expect(topics.length).toBe(20); // All topics listed in overview
  });
});

describe("Unit: setup_local_env", () => {
  it("should return environment status without errors", async () => {
    const tool = allTools.find((t) => t.name === "setup_local_env")!;
    // Skip SDK checks to avoid timeout from dynamic imports
    const result = (await tool.handler({ checkSdks: false })) as any;
    expect(result).toHaveProperty("environment");
    expect(result).toHaveProperty("apiKeys");
    expect(result).toHaveProperty("capabilities");
    expect(result).toHaveProperty("recommendation");
    expect(result.environment).toHaveProperty("nodeVersion");
    expect(result.environment).toHaveProperty("packageManager");
  });
});

describe("Unit: research_job_market", () => {
  it("should return job market data for known roles", async () => {
    const tool = allTools.find((t) => t.name === "research_job_market")!;
    const result = (await tool.handler({ role: "AI Engineer" })) as any;
    expect(result.role).toBe("AI Engineer");
    expect(result).toHaveProperty("commonRequirements");
    expect(result).toHaveProperty("emergingSkills");
    expect(result).toHaveProperty("salaryRange");
    expect(result).toHaveProperty("recommendation");
    expect(result.commonRequirements.length).toBeGreaterThan(0);
  });
});

describe("Static: autonomous maintenance tools", () => {
  it("should include all autonomous tools", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("assess_risk");
    expect(names).toContain("decide_re_update");
    expect(names).toContain("run_self_maintenance");
    expect(names).toContain("scaffold_directory");
    expect(names).toContain("run_autonomous_loop");
  });

  it("assess_risk requires action parameter", () => {
    const tool = allTools.find((t) => t.name === "assess_risk")!;
    expect(tool.inputSchema.required).toContain("action");
  });

  it("decide_re_update requires targetContent and contentType", () => {
    const tool = allTools.find((t) => t.name === "decide_re_update")!;
    expect(tool.inputSchema.required).toContain("targetContent");
    expect(tool.inputSchema.required).toContain("contentType");
  });

  it("scaffold_directory requires component", () => {
    const tool = allTools.find((t) => t.name === "scaffold_directory")!;
    expect(tool.inputSchema.required).toContain("component");
  });

  it("run_autonomous_loop requires goal", () => {
    const tool = allTools.find((t) => t.name === "run_autonomous_loop")!;
    expect(tool.inputSchema.required).toContain("goal");
  });
});

describe("Unit: assess_risk", () => {
  it("should classify known high-risk actions", async () => {
    const tool = allTools.find((t) => t.name === "assess_risk")!;
    const result = (await tool.handler({ action: "push_to_remote" })) as any;
    expect(result.assessment.tier).toBe("high");
    expect(result.assessment.recommendation).toBe("require_confirmation");
  });

  it("should classify known low-risk actions", async () => {
    const tool = allTools.find((t) => t.name === "assess_risk")!;
    const result = (await tool.handler({ action: "read_file" })) as any;
    expect(result.assessment.tier).toBe("low");
    expect(result.assessment.recommendation).toBe("auto_approve");
  });

  it("should use heuristics for unknown actions", async () => {
    const tool = allTools.find((t) => t.name === "assess_risk")!;
    const result = (await tool.handler({ action: "delete everything" })) as any;
    expect(result.assessment.tier).toBe("high");
    expect(result.reasoning).toContain("Heuristic");
  });
});

describe("Unit: decide_re_update", () => {
  it("should recommend update_existing for instruction files", async () => {
    const tool = allTools.find((t) => t.name === "decide_re_update")!;
    const result = (await tool.handler({
      targetContent: "New agent instructions",
      contentType: "instructions",
      existingFiles: ["AGENTS.md", "README.md"],
    })) as any;
    expect(result.action).toBe("update_existing");
    expect(result.existingFile).toBe("AGENTS.md");
  });

  it("should recommend create_new when no matching files exist", async () => {
    const tool = allTools.find((t) => t.name === "decide_re_update")!;
    const result = (await tool.handler({
      targetContent: "Some random config",
      contentType: "config",
      existingFiles: [],
    })) as any;
    expect(result.action).toBe("create_new");
  });
});

describe("Unit: run_self_maintenance", () => {
  it("should return maintenance report with quick scope", async () => {
    const tool = allTools.find((t) => t.name === "run_self_maintenance")!;
    const result = (await tool.handler({ scope: "quick" })) as any;
    expect(result).toHaveProperty("checksPerformed");
    expect(result).toHaveProperty("issuesFound");
    expect(result).toHaveProperty("actionsExecuted");
    expect(result).toHaveProperty("updatesRecommended");
    expect(result).toHaveProperty("nextScheduledCheck");
    expect(result.checksPerformed.length).toBeGreaterThan(0);
  });
});

describe("Unit: scaffold_directory", () => {
  it("should return scaffold structure for agent_loop", async () => {
    const tool = allTools.find((t) => t.name === "scaffold_directory")!;
    const result = (await tool.handler({ component: "agent_loop" })) as any;
    expect(result.component).toBe("agent_loop");
    expect(result.structure.files.length).toBeGreaterThan(0);
    expect(result.createCommands.length).toBeGreaterThan(0);
    expect(result.nextSteps.length).toBeGreaterThan(0);
  });

  it("should throw for unknown component", async () => {
    const tool = allTools.find((t) => t.name === "scaffold_directory")!;
    await expect(
      tool.handler({ component: "unknown_component" })
    ).rejects.toThrow("Unknown component");
  });
});

describe("Unit: run_autonomous_loop", () => {
  it("should complete loop with goal", async () => {
    const tool = allTools.find((t) => t.name === "run_autonomous_loop")!;
    const result = (await tool.handler({
      goal: "Test autonomous verification",
      maxIterations: 3,
      maxDurationMs: 5000,
    })) as any;
    expect(result.goal).toBe("Test autonomous verification");
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.iterations).toBeLessThanOrEqual(3);
    expect(["completed", "stopped", "timeout", "failed"]).toContain(result.status);
    expect(result.results.length).toBeGreaterThan(0);
  });
});

describe("Static: autonomous_maintenance methodology", () => {
  it("should return autonomous_maintenance methodology with 5 steps", async () => {
    const tool = allTools.find((t) => t.name === "getMethodology")!;
    const result = (await tool.handler({ topic: "autonomous_maintenance" })) as any;
    expect(result.title).toContain("Autonomous Self-Maintenance");
    expect(result.steps.length).toBe(5);
    expect(result.steps[0].name).toBe("Assess Risk Before Action");
    expect(result.steps[1].name).toBe("Re-Update Before Create");
    expect(result).toHaveProperty("riskTiers");
    expect(result).toHaveProperty("patterns");
  });
});

describe("Static: self-eval tools", () => {
  it("should include all 6 self-eval tools", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("log_tool_call");
    expect(names).toContain("get_trajectory_analysis");
    expect(names).toContain("get_self_eval_report");
    expect(names).toContain("get_improvement_recommendations");
    expect(names).toContain("cleanup_stale_runs");
    expect(names).toContain("synthesize_recon_to_learnings");
  });

  it("log_tool_call requires sessionId and toolName", () => {
    const tool = allTools.find((t) => t.name === "log_tool_call")!;
    expect(tool.inputSchema.required).toContain("sessionId");
    expect(tool.inputSchema.required).toContain("toolName");
  });

  it("get_improvement_recommendations has focus enum", () => {
    const tool = allTools.find((t) => t.name === "get_improvement_recommendations")!;
    const focusProp = (tool.inputSchema as any).properties.focus;
    expect(focusProp.enum).toContain("tools");
    expect(focusProp.enum).toContain("process");
    expect(focusProp.enum).toContain("quality");
    expect(focusProp.enum).toContain("knowledge");
    expect(focusProp.enum).toContain("all");
  });
});

describe("Static: self_reinforced_learning methodology", () => {
  it("should return self_reinforced_learning methodology with 6 steps", async () => {
    const tool = allTools.find((t) => t.name === "getMethodology")!;
    const result = (await tool.handler({ topic: "self_reinforced_learning" })) as any;
    expect(result.title).toContain("Self-Reinforced Learning");
    expect(result.steps.length).toBe(6);
    expect(result.steps[0].name).toBe("Instrument");
    expect(result.steps[4].name).toBe("Clean & Synthesize");
    expect(result.steps[5].name).toBe("Apply & Re-Analyze");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UNIT LAYER — individual tool behavior
// ═══════════════════════════════════════════════════════════════════════════

const findTool = (name: string) => allTools.find((t) => t.name === name)!;

describe("Unit: local file tools", () => {
  const findRepoFile = (relPath: string): string => {
    let dir = process.cwd();
    for (let i = 0; i < 10; i++) {
      const candidate = path.join(dir, relPath);
      if (existsSync(candidate)) return candidate;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    throw new Error(`Fixture not found: ${relPath}`);
  };

  it("tool registry should include quickRefs for all local_file tools", () => {
    const missing = localFileTools
      .map((t) => t.name)
      .filter((name) => !getQuickRef(name));
    expect(missing).toEqual([]);
  });

  it("read_csv_file should parse a bounded table", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nodebench-mcp-"));
    const csvPath = path.join(tmpDir, "sample.csv");
    await writeFile(csvPath, "name,age\nAlice,30\nBob,25\n", "utf8");

    const tool = findTool("read_csv_file");
    const result = (await tool.handler({
      path: csvPath,
      hasHeader: true,
      maxRows: 10,
      maxCols: 10,
    })) as any;

    expect(result.headers).toEqual(["name", "age"]);
    expect(result.rows.length).toBe(2);
    expect(result.rows[0][0]).toBe("Alice");
    expect(result.rows[0][1]).toBe("30");
  });

  it("read_xlsx_file should parse a bounded sheet preview", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nodebench-mcp-"));
    const xlsxPath = path.join(tmpDir, "sample.xlsx");

    const mod = await import("xlsx");
    const XLSX = (mod as any).default ?? mod;
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Title", "Year"],
      ["Movie A", 2009],
      ["Movie B", 2011],
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, "Sheet1");
    XLSX.writeFile(wb, xlsxPath);

    const tool = findTool("read_xlsx_file");
    const result = (await tool.handler({
      path: xlsxPath,
      headerRow: 1,
      maxRows: 10,
      maxCols: 10,
    })) as any;

    expect(result.sheets).toContain("Sheet1");
    expect(result.sheetName).toBe("Sheet1");
    expect(result.headers).toEqual(["Title", "Year"]);
    expect(result.rows.length).toBe(2);
    expect(result.rows[0][0]).toBe("Movie A");
    expect(result.rows[0][1]).toBe(2009);
  });

  it("csv_select_rows should filter rows and select columns", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nodebench-mcp-"));
    const csvPath = path.join(tmpDir, "sample.csv");
    await writeFile(csvPath, "name,age\nAlice,30\nBob,25\nCara,40\n", "utf8");

    const tool = findTool("csv_select_rows");
    const result = (await tool.handler({
      path: csvPath,
      hasHeader: true,
      where: [{ column: "age", op: "gt", value: 25 }],
      returnColumns: ["name"],
      limit: 10,
    })) as any;

    expect(result.headers).toEqual(["name"]);
    expect(result.rows.length).toBe(2);
    expect(result.rows[0].row[0]).toBe("Alice");
    expect(result.rows[1].row[0]).toBe("Cara");
  });

  it("csv_select_rows should support is_even on address-like strings", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nodebench-mcp-"));
    const csvPath = path.join(tmpDir, "sample.csv");
    await writeFile(csvPath, "name,address\nAlice,101 Main St\nBob,102 Main St\nCara,103 Main St\n", "utf8");

    const tool = findTool("csv_select_rows");
    const result = (await tool.handler({
      path: csvPath,
      hasHeader: true,
      where: [{ column: "address", op: "is_even" }],
      returnColumns: ["name"],
      limit: 10,
    })) as any;

    expect(result.headers).toEqual(["name"]);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].row[0]).toBe("Bob");
  });

  it("csv_aggregate should compute min and return bestRow", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nodebench-mcp-"));
    const csvPath = path.join(tmpDir, "sample.csv");
    await writeFile(csvPath, "name,age\nAlice,30\nBob,25\nCara,40\n", "utf8");

    const tool = findTool("csv_aggregate");
    const result = (await tool.handler({
      path: csvPath,
      hasHeader: true,
      operation: "min",
      value: { type: "column", column: "age" },
      returnColumns: ["name", "age"],
    })) as any;

    expect(result.result).toBe(25);
    expect(result.bestRow.headers).toEqual(["name", "age"]);
    expect(result.bestRow.row[0]).toBe("Bob");
  });

  it("xlsx_select_rows should filter rows and select columns", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nodebench-mcp-"));
    const xlsxPath = path.join(tmpDir, "sample.xlsx");

    const mod = await import("xlsx");
    const XLSX = (mod as any).default ?? mod;
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Title", "Year"],
      ["Movie A", 2009],
      ["Movie B", 2011],
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, "Sheet1");
    XLSX.writeFile(wb, xlsxPath);

    const tool = findTool("xlsx_select_rows");
    const result = (await tool.handler({
      path: xlsxPath,
      sheetName: "Sheet1",
      headerRow: 1,
      where: [{ column: "Year", op: "eq", value: 2009 }],
      returnColumns: ["Title"],
      limit: 10,
    })) as any;

    expect(result.headers).toEqual(["Title"]);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].row[0]).toBe("Movie A");
  });

  it("xlsx_select_rows should support is_odd on numeric columns", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nodebench-mcp-"));
    const xlsxPath = path.join(tmpDir, "sample.xlsx");

    const mod = await import("xlsx");
    const XLSX = (mod as any).default ?? mod;
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Title", "Year"],
      ["Movie A", 2009],
      ["Movie B", 2010],
      ["Movie C", 2011],
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, "Sheet1");
    XLSX.writeFile(wb, xlsxPath);

    const tool = findTool("xlsx_select_rows");
    const result = (await tool.handler({
      path: xlsxPath,
      sheetName: "Sheet1",
      headerRow: 1,
      where: [{ column: "Year", op: "is_odd" }],
      returnColumns: ["Title"],
      limit: 10,
    })) as any;

    expect(result.headers).toEqual(["Title"]);
    expect(result.rows.length).toBe(2);
    expect(result.rows[0].row[0]).toBe("Movie A");
    expect(result.rows[1].row[0]).toBe("Movie C");
  });

  it("xlsx_aggregate should compute min and return bestRow", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nodebench-mcp-"));
    const xlsxPath = path.join(tmpDir, "sample.xlsx");

    const mod = await import("xlsx");
    const XLSX = (mod as any).default ?? mod;
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Title", "Year"],
      ["Movie A", 2009],
      ["Movie B", 2011],
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, "Sheet1");
    XLSX.writeFile(wb, xlsxPath);

    const tool = findTool("xlsx_aggregate");
    const result = (await tool.handler({
      path: xlsxPath,
      sheetName: "Sheet1",
      headerRow: 1,
      operation: "min",
      value: { type: "column", column: "Year" },
      returnColumns: ["Title", "Year"],
    })) as any;

    expect(result.result).toBe(2009);
    expect(result.bestRow.headers).toEqual(["Title", "Year"]);
    expect(result.bestRow.row[0]).toBe("Movie A");
  });

  it("read_pdf_text should extract page text", async () => {
    const pdfPath = findRepoFile(path.join("test_assets", "Report_2025-12-25.pdf"));
    const tool = findTool("read_pdf_text");
    const result = (await tool.handler({
      path: pdfPath,
      pageStart: 1,
      pageEnd: 1,
      maxChars: 2000,
    })) as any;

    expect(result.pagesIncluded).toEqual([1]);
    expect(String(result.text)).toContain("Hello World");
  }, 20_000);

  it("pdf_search_text should find matches with snippets", async () => {
    const pdfPath = findRepoFile(path.join("test_assets", "Report_2025-12-25.pdf"));
    const tool = findTool("pdf_search_text");
    const result = (await tool.handler({
      path: pdfPath,
      query: "Hello",
      maxMatches: 5,
    })) as any;

    expect(result.matchCount).toBeGreaterThan(0);
    expect(result.matches[0].page).toBe(1);
    expect(String(result.matches[0].snippet)).toContain("Hello");
  });

  it("read_text_file should return bounded text slices", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nodebench-mcp-"));
    const filePath = path.join(tmpDir, "notes.txt");
    await writeFile(filePath, "Line1\nLine2\nLine3\n", "utf8");

    const tool = findTool("read_text_file");
    const result = (await tool.handler({
      path: filePath,
      startChar: 0,
      maxChars: 10,
    })) as any;

    expect(result.truncated).toBe(true);
    expect(String(result.text)).toContain("Line1");
  });

  it("read_json_file and json_select should parse and select values", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nodebench-mcp-"));
    const filePath = path.join(tmpDir, "data.json");
    await writeFile(filePath, JSON.stringify({ a: { b: [{ name: "alpha" }, { name: "beta" }] } }), "utf8");

    const readTool = findTool("read_json_file");
    const readResult = (await readTool.handler({
      path: filePath,
      maxDepth: 6,
      maxItems: 50,
      maxStringChars: 1000,
    })) as any;
    expect(readResult.rootType).toBe("object");
    expect(readResult.value.a.b.length).toBe(2);

    const selectTool = findTool("json_select");
    const selectResult = (await selectTool.handler({
      path: filePath,
      pointer: "/a/b/1/name",
      maxDepth: 3,
      maxItems: 10,
      maxStringChars: 100,
    })) as any;
    expect(selectResult.found).toBe(true);
    expect(selectResult.value).toBe("beta");
  });

  it("read_jsonl_file should parse lines and report errors", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nodebench-mcp-"));
    const filePath = path.join(tmpDir, "data.jsonl");
    await writeFile(filePath, '{"ok":1}\nnot-json\n{"ok":2}\n', "utf8");

    const tool = findTool("read_jsonl_file");
    const result = (await tool.handler({
      path: filePath,
      limitLines: 10,
      parseJson: true,
      maxDepth: 4,
      maxItems: 20,
      maxStringChars: 100,
    })) as any;

    expect(result.returnedLines).toBe(2);
    expect(result.errorCount).toBe(1);
    expect(result.lines[0].value.ok).toBe(1);
    expect(result.lines[1].value.ok).toBe(2);
  });

  it("zip_list_files and zip_read_text_file should read entries", async () => {
    const zipPath = findRepoFile(path.join("test_assets", "zip_fixture.zip"));

    const listTool = findTool("zip_list_files");
    const listResult = (await listTool.handler({ path: zipPath, maxEntries: 50 })) as any;
    const names = (listResult.entries ?? []).map((e: any) => e.fileName);
    expect(names).toContain("hello.txt");
    expect(names).toContain("folder/data.csv");

    const readTool = findTool("zip_read_text_file");
    const readResult = (await readTool.handler({
      path: zipPath,
      innerPath: "hello.txt",
      maxChars: 2000,
    })) as any;
    expect(String(readResult.text)).toContain("Hello from zip fixture");
  });

  it("zip_extract_file should safely extract to outputDir", async () => {
    const zipPath = findRepoFile(path.join("test_assets", "zip_fixture.zip"));
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nodebench-mcp-zip-"));

    const extractTool = findTool("zip_extract_file");
    const extracted = (await extractTool.handler({
      path: zipPath,
      innerPath: "folder/data.csv",
      outputDir: tmpDir,
      overwrite: true,
    })) as any;

    expect(typeof extracted.extractedPath).toBe("string");
    expect(existsSync(extracted.extractedPath)).toBe(true);

    const readTool = findTool("read_text_file");
    const text = (await readTool.handler({ path: extracted.extractedPath, maxChars: 2000 })) as any;
    expect(String(text.text)).toContain("alpha,1");
  });

  it("read_docx_text should extract document text", async () => {
    const docxPath = findRepoFile(path.join("test_assets", "docx_fixture.docx"));
    const tool = findTool("read_docx_text");
    const result = (await tool.handler({ path: docxPath, maxChars: 5000 })) as any;
    expect(String(result.text)).toContain("Hello DOCX");
    expect(String(result.text)).toContain("Second paragraph");
  });

  it("read_pptx_text should extract slide text with markers", async () => {
    const pptxPath = findRepoFile(path.join("test_assets", "pptx_fixture.pptx"));
    const tool = findTool("read_pptx_text");
    const result = (await tool.handler({ path: pptxPath, maxChars: 10000 })) as any;
    expect(result.slideCount).toBe(2);
    expect(String(result.text)).toContain("[SLIDE 1]");
    expect(String(result.text)).toContain("Hello PPTX Slide1");
    expect(String(result.text)).toContain("[SLIDE 2]");
    expect(String(result.text)).toContain("Slide2 Text");
  });
});

describe("Unit: abandon_cycle", () => {
  it("should abandon an active cycle", async () => {
    // Create a cycle first
    const startTool = findTool("start_verification_cycle");
    const cycle = (await startTool.handler({
      title: "test-abandon-cycle",
      description: "test cycle for abandon",
    })) as any;
    expect(cycle.cycleId).toBeTruthy();

    // Abandon it
    const abandonTool = findTool("abandon_cycle");
    const result = (await abandonTool.handler({
      cycleId: cycle.cycleId,
      reason: "test cleanup",
    })) as any;
    expect(result.abandoned).toBe(true);
    expect(result.reason).toBe("test cleanup");
  });

  it("should skip already-abandoned cycles", async () => {
    const startTool = findTool("start_verification_cycle");
    const cycle = (await startTool.handler({
      title: "test-double-abandon",
      description: "test",
    })) as any;

    const abandonTool = findTool("abandon_cycle");
    await abandonTool.handler({ cycleId: cycle.cycleId });

    const result2 = (await abandonTool.handler({
      cycleId: cycle.cycleId,
    })) as any;
    expect(result2.skipped).toBe(true);
  });

  it("should throw on nonexistent cycle", async () => {
    const abandonTool = findTool("abandon_cycle");
    await expect(
      abandonTool.handler({ cycleId: "nonexistent_cycle_id" })
    ).rejects.toThrow("Cycle not found");
  });
});

describe("Unit: search_all_knowledge", () => {
  it("should return results structure with gaps field", async () => {
    const tool = findTool("search_all_knowledge");
    const result = (await tool.handler({
      query: "test",
    })) as any;
    expect(result).toHaveProperty("query");
    expect(result).toHaveProperty("totalResults");
    expect(result).toHaveProperty("learnings");
    expect(result).toHaveProperty("reconFindings");
    expect(result).toHaveProperty("gaps");
    expect(result).toHaveProperty("_contributeBack");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION LAYER — multi-tool chain
// ═══════════════════════════════════════════════════════════════════════════

describe("Integration: full verification cycle chain", () => {
  it("start → log_phase → log_gap → resolve_gap → abandon", async () => {
    // 1. Start cycle
    const cycle = (await findTool("start_verification_cycle").handler({
      title: "integration-test-cycle",
      description: "full chain test",
    })) as any;
    expect(cycle.cycleId).toBeTruthy();

    // 2. Log phase 1 findings
    const phase1 = (await findTool("log_phase_findings").handler({
      cycleId: cycle.cycleId,
      phaseNumber: 1,
      status: "passed",
      findings: { summary: "context gathered" },
    })) as any;
    expect(phase1.phaseRecorded).toBe(1);
    expect(phase1.phaseStatus).toBe("passed");

    // 3. Log a gap
    const gap = (await findTool("log_gap").handler({
      cycleId: cycle.cycleId,
      severity: "LOW",
      title: "test gap for integration",
      description: "This is a test gap",
      rootCause: "testing",
      fixStrategy: "resolve in test",
    })) as any;
    expect(gap.gapId).toBeTruthy();

    // 4. Resolve the gap
    const resolved = (await findTool("resolve_gap").handler({
      gapId: gap.gapId,
    })) as any;
    expect(resolved.status).toBe("resolved");

    // 5. Abandon the cycle (cleanup)
    const abandoned = (await findTool("abandon_cycle").handler({
      cycleId: cycle.cycleId,
      reason: "integration test cleanup",
    })) as any;
    expect(abandoned.abandoned).toBe(true);
  });
});

describe("Unit: log_tool_call", () => {
  it("should log a tool call and return confirmation", async () => {
    const tool = findTool("log_tool_call");
    const result = (await tool.handler({
      sessionId: "test-session-001",
      toolName: "run_recon",
      durationMs: 42,
      resultStatus: "success",
      phase: "recon",
    })) as any;
    expect(result.logged).toBe(true);
    expect(result.sessionId).toBe("test-session-001");
    expect(result.toolName).toBe("run_recon");
    expect(result.resultStatus).toBe("success");
  });

  it("should log error tool calls", async () => {
    const tool = findTool("log_tool_call");
    const result = (await tool.handler({
      sessionId: "test-session-001",
      toolName: "web_search",
      durationMs: 1500,
      resultStatus: "error",
      error: "API key not configured",
      phase: "recon",
    })) as any;
    expect(result.logged).toBe(true);
    expect(result.resultStatus).toBe("error");
  });
});

describe("Unit: get_trajectory_analysis", () => {
  it("should return trajectory analysis with logged data", async () => {
    // Log a few calls first
    const logTool = findTool("log_tool_call");
    await logTool.handler({ sessionId: "traj-test", toolName: "findTools", durationMs: 10, phase: "meta" });
    await logTool.handler({ sessionId: "traj-test", toolName: "run_recon", durationMs: 20, phase: "recon" });
    await logTool.handler({ sessionId: "traj-test", toolName: "log_recon_finding", durationMs: 15, phase: "recon" });

    const tool = findTool("get_trajectory_analysis");
    const result = (await tool.handler({ sessionId: "traj-test" })) as any;
    expect(result.totalCalls).toBeGreaterThanOrEqual(3);
    expect(result.uniqueTools).toBeGreaterThanOrEqual(3);
    expect(result.topTools.length).toBeGreaterThan(0);
  });

  it("should return empty message when no data exists for session", async () => {
    const tool = findTool("get_trajectory_analysis");
    const result = (await tool.handler({ sessionId: "nonexistent-session-xyz" })) as any;
    expect(result.totalCalls).toBe(0);
    expect(result.message).toBeTruthy();
  });
});

describe("Unit: get_self_eval_report", () => {
  it("should return health report with all sections", async () => {
    const tool = findTool("get_self_eval_report");
    const result = (await tool.handler({ sinceDaysAgo: 30 })) as any;
    expect(result).toHaveProperty("healthScore");
    expect(result).toHaveProperty("healthGrade");
    expect(result).toHaveProperty("verification");
    expect(result).toHaveProperty("gaps");
    expect(result).toHaveProperty("evalRuns");
    expect(result).toHaveProperty("qualityGates");
    expect(result).toHaveProperty("knowledge");
    expect(result).toHaveProperty("toolTrajectory");
    expect(typeof result.healthScore).toBe("number");
    expect(["A", "B", "C", "D", "F"]).toContain(result.healthGrade);
  });

  it("should include details when requested", async () => {
    const tool = findTool("get_self_eval_report");
    const result = (await tool.handler({ sinceDaysAgo: 30, includeDetails: true })) as any;
    expect(result).toHaveProperty("cycleDetails");
    expect(result).toHaveProperty("openGapDetails");
  });
});

describe("Unit: get_improvement_recommendations", () => {
  it("should return structured recommendations", async () => {
    const tool = findTool("get_improvement_recommendations");
    const result = (await tool.handler({ sinceDaysAgo: 30 })) as any;
    expect(typeof result.totalRecommendations).toBe("number");
    expect(typeof result.highPriority).toBe("number");
    expect(typeof result.mediumPriority).toBe("number");
    expect(typeof result.lowPriority).toBe("number");
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result).toHaveProperty("_selfReinforcement");
    expect(result._selfReinforcement.nextSteps.length).toBe(4);
  });

  it("should filter by focus area", async () => {
    const tool = findTool("get_improvement_recommendations");
    const result = (await tool.handler({ sinceDaysAgo: 30, focus: "quality" })) as any;
    expect(result.focus).toBe("quality");
    for (const rec of result.recommendations) {
      expect(rec.category).toBe("quality");
    }
  });
});

describe("Unit: cleanup_stale_runs", () => {
  it("should return dry run preview without modifying data", async () => {
    const tool = findTool("cleanup_stale_runs");
    const result = (await tool.handler({ staleDays: 7, dryRun: true })) as any;
    expect(result.dryRun).toBe(true);
    expect(result).toHaveProperty("staleEvalRuns");
    expect(result).toHaveProperty("staleCycles");
    expect(result).toHaveProperty("staleGaps");
    expect(result.staleEvalRuns).toHaveProperty("count");
    expect(result.staleCycles).toHaveProperty("count");
    expect(result.nextStep).toContain("dryRun=false");
  });

  it("should support closeStaleGaps option", async () => {
    const tool = findTool("cleanup_stale_runs");
    const result = (await tool.handler({ staleDays: 7, closeStaleGaps: true, dryRun: true })) as any;
    expect(result.staleGaps).toHaveProperty("count");
    expect(result.staleGaps.skipped).toBeUndefined();
  });

  it("should skip stale gaps by default", async () => {
    const tool = findTool("cleanup_stale_runs");
    const result = (await tool.handler({ staleDays: 7, dryRun: true })) as any;
    expect(result.staleGaps.skipped).toBe(true);
  });
});

describe("Unit: synthesize_recon_to_learnings", () => {
  it("should return dry run preview", async () => {
    const tool = findTool("synthesize_recon_to_learnings");
    const result = (await tool.handler({ sinceDaysAgo: 30, dryRun: true })) as any;
    expect(result.dryRun).toBe(true);
    expect(result).toHaveProperty("totalFindings");
    expect(result).toHaveProperty("alreadySynthesized");
    expect(result).toHaveProperty("newLearnings");
    expect(result).toHaveProperty("created");
    expect(result.created).toBe(0); // dry run doesn't create
    expect(result).toHaveProperty("preview");
    expect(result.nextStep).toContain("dryRun=false");
  });

  it("should support sessionId filter", async () => {
    const tool = findTool("synthesize_recon_to_learnings");
    const result = (await tool.handler({ sessionId: "nonexistent-session", dryRun: true })) as any;
    expect(result.totalFindings).toBe(0);
    expect(result.newLearnings).toBe(0);
  });
});

describe("Unit: get_self_eval_report excludeTestSessions", () => {
  it("should accept excludeTestSessions parameter", async () => {
    const tool = findTool("get_self_eval_report");
    const result = (await tool.handler({ sinceDaysAgo: 30, excludeTestSessions: true })) as any;
    expect(result).toHaveProperty("healthScore");
    expect(typeof result.healthScore).toBe("number");
  });

  it("should have excludeTestSessions default to true", async () => {
    const tool = findTool("get_self_eval_report");
    const schema = tool.inputSchema as any;
    expect(schema.properties.excludeTestSessions).toBeDefined();
    expect(schema.properties.excludeTestSessions.type).toBe("boolean");
  });
});

describe("Unit: web_search graceful fallback", () => {
  it("should return empty results with setup info when no provider", async () => {
    // Save and clear all API keys
    const saved = {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    };
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.PERPLEXITY_API_KEY;

    try {
      const tool = findTool("web_search");
      const result = (await tool.handler({ query: "test query" })) as any;
      expect(result.results).toEqual([]);
      expect(result.provider).toBe("none");
      expect(result.resultCount).toBe(0);
      expect(result).toHaveProperty("setup");
      expect(result.setup.options.length).toBe(3);
      // Verify no error flag
      expect(result.error).toBeUndefined();
    } finally {
      // Restore API keys
      for (const [key, val] of Object.entries(saved)) {
        if (val !== undefined) process.env[key] = val;
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// v2.2.0 — LLM, Security, and Diff tools
// ═══════════════════════════════════════════════════════════════════════════

describe("Static: llm tools", () => {
  it("should include call_llm and extract_structured_data", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("call_llm");
    expect(names).toContain("extract_structured_data");
  });

  it("call_llm requires prompt parameter", () => {
    const tool = findTool("call_llm");
    expect(tool.inputSchema.required).toContain("prompt");
  });

  it("extract_structured_data requires text and fields parameters", () => {
    const tool = findTool("extract_structured_data");
    expect(tool.inputSchema.required).toContain("text");
    expect(tool.inputSchema.required).toContain("fields");
  });
});

describe("Static: security tools", () => {
  it("should include scan_dependencies and run_code_analysis", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("scan_dependencies");
    expect(names).toContain("run_code_analysis");
  });

  it("run_code_analysis requires content parameter", () => {
    const tool = findTool("run_code_analysis");
    expect(tool.inputSchema.required).toContain("content");
  });

  it("scan_dependencies has no required parameters", () => {
    const tool = findTool("scan_dependencies");
    const required = (tool.inputSchema as any).required;
    expect(required ?? []).toEqual([]);
  });
});

describe("Unit: run_code_analysis", () => {
  it("should detect hardcoded API key in code", async () => {
    const tool = findTool("run_code_analysis");
    const result = (await tool.handler({
      content: 'const api_key = "FAKE_TEST_KEY_abcdefghijklmnopqrstuvwxyz1234567890";',
      checks: ["secrets"],
    })) as any;
    expect(result.totalFindings).toBeGreaterThanOrEqual(1);
    expect(result.bySeverity.HIGH).toBeGreaterThanOrEqual(1);
    expect(result.findings[0].check).toBe("secrets");
  });

  it("should detect zero-width characters (homograph check)", async () => {
    const tool = findTool("run_code_analysis");
    const result = (await tool.handler({
      content: "export API_KEY=sk-\u200bsecret123",
      checks: ["homograph"],
    })) as any;
    expect(result.totalFindings).toBeGreaterThanOrEqual(1);
    expect(result.bySeverity.HIGH).toBeGreaterThanOrEqual(1);
  });

  it("should return clean for safe code", async () => {
    const tool = findTool("run_code_analysis");
    const result = (await tool.handler({
      content: 'function add(a: number, b: number): number { return a + b; }',
      checks: ["secrets", "homograph", "urls"],
    })) as any;
    expect(result.totalFindings).toBe(0);
  });
});

describe("Unit: scan_dependencies", () => {
  it("should scan the mcp-local package.json", async () => {
    const tool = findTool("scan_dependencies");
    const result = (await tool.handler({
      projectRoot: path.resolve(__dirname, "../.."),
    })) as any;
    expect(result.totalPackages).toBeGreaterThan(0);
    expect(result.manifests.length).toBeGreaterThan(0);
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("dependencies");
  });

  it("should return error when no manifest found", async () => {
    const tool = findTool("scan_dependencies");
    const result = (await tool.handler({
      projectRoot: os.tmpdir(),
    })) as any;
    expect(result.error).toBe(true);
    expect(result.message).toContain("No package manifest");
  });
});

describe("Static: diff_outputs tool", () => {
  it("should exist in eval tools", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("diff_outputs");
  });

  it("requires baseline and candidate parameters", () => {
    const tool = findTool("diff_outputs");
    expect(tool.inputSchema.required).toContain("baseline");
    expect(tool.inputSchema.required).toContain("candidate");
  });
});

describe("Unit: diff_outputs", () => {
  it("should compute text diff with similarity score", async () => {
    const tool = findTool("diff_outputs");
    const result = (await tool.handler({
      baseline: "line one\nline two\nline three",
      candidate: "line one\nline TWO\nline three\nline four",
    })) as any;
    expect(result).toHaveProperty("similarity");
    expect(result.similarity).toBeGreaterThan(0);
    expect(result.similarity).toBeLessThan(1);
    expect(result.added.length).toBeGreaterThan(0);
    expect(result).toHaveProperty("summary");
  });

  it("should return 1.0 similarity for identical text", async () => {
    const tool = findTool("diff_outputs");
    const result = (await tool.handler({
      baseline: "identical content",
      candidate: "identical content",
    })) as any;
    expect(result.similarity).toBe(1);
    expect(result.added.length).toBe(0);
    expect(result.removed.length).toBe(0);
  });

  it("should diff JSON objects with field-level changes", async () => {
    const tool = findTool("diff_outputs");
    const result = (await tool.handler({
      baseline: '{"name":"Alice","age":30,"city":"NYC"}',
      candidate: '{"name":"Alice","age":31,"country":"USA"}',
      format: "json",
    })) as any;
    expect(result).toHaveProperty("changed");
    expect(result.changed.length).toBeGreaterThan(0);
    expect(result).toHaveProperty("removed");
    expect(result).toHaveProperty("added");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PLATFORM TOOLS — Convex bridge validation
// ═══════════════════════════════════════════════════════════════════════════

describe("Static: platform tools", () => {
  it("should export 4 platform tools", () => {
    expect(platformTools.length).toBe(4);
  });

  const expectedTools = [
    { name: "query_daily_brief", requiredParams: [] },
    { name: "query_funding_entities", requiredParams: [] },
    { name: "query_research_queue", requiredParams: [] },
    { name: "publish_to_queue", requiredParams: ["content", "postType"] },
  ];

  for (const { name, requiredParams } of expectedTools) {
    it(`${name} has valid schema`, () => {
      const tool = platformTools.find((t) => t.name === name);
      expect(tool).toBeDefined();
      expect(tool!.description.length).toBeGreaterThan(10);
      expect(tool!.inputSchema.type).toBe("object");
      if (requiredParams.length > 0) {
        expect(tool!.inputSchema.required).toEqual(expect.arrayContaining(requiredParams));
      }
    });
  }
});

describe("Unit: platform tools graceful fallback", () => {
  it("query_daily_brief returns error when CONVEX_SITE_URL not set", async () => {
    const tool = findTool("query_daily_brief");
    const result = (await tool.handler({})) as any;
    // Without CONVEX_SITE_URL, should return a platform-not-configured error
    expect(result).toHaveProperty("error");
    expect(result.message).toContain("Platform not configured");
  });

  it("query_funding_entities returns error when CONVEX_SITE_URL not set", async () => {
    const tool = findTool("query_funding_entities");
    const result = (await tool.handler({ query: "test" })) as any;
    expect(result).toHaveProperty("error");
    expect(result.message).toContain("Platform not configured");
  });

  it("query_research_queue returns error when CONVEX_SITE_URL not set", async () => {
    const tool = findTool("query_research_queue");
    const result = (await tool.handler({})) as any;
    expect(result).toHaveProperty("error");
    expect(result.message).toContain("Platform not configured");
  });

  it("publish_to_queue returns error when CONVEX_SITE_URL not set", async () => {
    const tool = findTool("publish_to_queue");
    const result = (await tool.handler({ content: "test", postType: "insight" })) as any;
    expect(result).toHaveProperty("error");
    expect(result.message).toContain("Platform not configured");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TIER 3 CAPABILITY TOOLS — new domains
// ═══════════════════════════════════════════════════════════════════════════

describe("Static: benchmark_models tool", () => {
  it("has valid schema with required prompt", () => {
    const tool = findTool("benchmark_models");
    expect(tool.inputSchema.required).toEqual(["prompt"]);
    expect(tool.inputSchema.properties).toHaveProperty("prompt");
    expect(tool.inputSchema.properties).toHaveProperty("system");
  });

  it("returns error when no providers available", async () => {
    const tool = findTool("benchmark_models");
    const result = (await tool.handler({ prompt: "test" })) as any;
    // No API keys set in test env
    expect(result).toHaveProperty("error");
    expect(result.message).toContain("No LLM providers available");
  });
});

describe("Static: generate_report tool", () => {
  it("has valid schema with required title and sections", () => {
    const tool = findTool("generate_report");
    expect(tool.inputSchema.required).toEqual(["title", "sections"]);
  });

  it("generates markdown report from sections", async () => {
    const tool = findTool("generate_report");
    const result = (await tool.handler({
      title: "Test Report",
      sections: [
        { heading: "Overview", content: "This is a test report." },
        { heading: "Findings", content: "- Finding 1\n- Finding 2" },
      ],
      metadata: { author: "test", project: "nodebench" },
    })) as any;
    expect(result).toHaveProperty("markdown");
    expect(result.markdown).toContain("# Test Report");
    expect(result.markdown).toContain("## Overview");
    expect(result.markdown).toContain("## Findings");
    expect(result.markdown).toContain("Table of Contents");
    expect(result.sections).toBe(2);
    expect(result.characters).toBeGreaterThan(100);
  });
});

describe("Static: monitor_repo tool", () => {
  it("has valid schema with required repo", () => {
    const tool = findTool("monitor_repo");
    expect(tool.inputSchema.required).toEqual(["repo"]);
  });

  it("rejects invalid repo format", async () => {
    const tool = findTool("monitor_repo");
    const result = (await tool.handler({ repo: "not-a-valid-repo" })) as any;
    expect(result).toHaveProperty("error");
    expect(result.message).toContain("Invalid repo format");
  });
});

describe("Static: run_tests_cli tool", () => {
  it("has valid schema with required command", () => {
    const tool = findTool("run_tests_cli");
    expect(tool.inputSchema.required).toEqual(["command"]);
    expect(tool.inputSchema.properties).toHaveProperty("cwd");
    expect(tool.inputSchema.properties).toHaveProperty("timeoutMs");
  });

  it("blocks dangerous commands", async () => {
    const tool = findTool("run_tests_cli");
    const result = (await tool.handler({ command: "rm -rf /" })) as any;
    expect(result).toHaveProperty("error");
    expect(result.message).toContain("blocked");
  });

  it("runs a simple command successfully", async () => {
    const tool = findTool("run_tests_cli");
    const result = (await tool.handler({ command: "node -e \"console.log('hello')\"" })) as any;
    expect(result.exitCode).toBe(0);
    expect(result.passed).toBe(true);
    expect(result.stdout).toContain("hello");
  });
});

describe("Static: diff_screenshots tool", () => {
  it("has valid schema with required baseline and candidate", () => {
    const tool = findTool("diff_screenshots");
    expect(tool.inputSchema.required).toEqual(["baseline", "candidate"]);
    expect(tool.inputSchema.properties).toHaveProperty("threshold");
    expect(tool.inputSchema.properties).toHaveProperty("outputPath");
  });
});

describe("Integration: search finds logged gaps", () => {
  it("should find gaps via search_all_knowledge after logging", async () => {
    const uniqueMarker = `vitest-marker-${Date.now()}`;

    // Create a cycle and gap with a unique marker
    const cycle = (await findTool("start_verification_cycle").handler({
      title: `search-test-${uniqueMarker}`,
      description: "test",
    })) as any;

    await findTool("log_gap").handler({
      cycleId: cycle.cycleId,
      severity: "LOW",
      title: `gap-${uniqueMarker}`,
      description: `Testing search finds this gap ${uniqueMarker}`,
      rootCause: "test",
      fixStrategy: "none",
    });

    // Search for it
    const results = (await findTool("search_all_knowledge").handler({
      query: uniqueMarker,
    })) as any;

    expect(results.gaps.length).toBeGreaterThanOrEqual(1);
    expect(results.gaps[0].title).toContain(uniqueMarker);
    expect(results.gaps[0].status).toBe("open");

    // Cleanup
    await findTool("abandon_cycle").handler({
      cycleId: cycle.cycleId,
      reason: "test cleanup",
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RESEARCH WRITING TOOLS — academic paper polishing
// ═══════════════════════════════════════════════════════════════════════════

describe("Static: research writing tools", () => {
  it("should export 8 research writing tools", () => {
    expect(researchWritingTools.length).toBe(8);
  });

  it("should include all 8 research writing tools in allTools", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("polish_academic_text");
    expect(names).toContain("translate_academic");
    expect(names).toContain("compress_or_expand_text");
    expect(names).toContain("remove_ai_signatures");
    expect(names).toContain("check_paper_logic");
    expect(names).toContain("generate_academic_caption");
    expect(names).toContain("analyze_experiment_data");
    expect(names).toContain("review_paper_as_reviewer");
  });

  it("polish_academic_text requires text parameter", () => {
    const tool = findTool("polish_academic_text");
    expect(tool.inputSchema.required).toContain("text");
    expect(tool.inputSchema.properties).toHaveProperty("targetVenue");
    expect(tool.inputSchema.properties).toHaveProperty("language");
  });

  it("translate_academic requires text, from, and to parameters", () => {
    const tool = findTool("translate_academic");
    expect(tool.inputSchema.required).toContain("text");
    expect(tool.inputSchema.required).toContain("from");
    expect(tool.inputSchema.required).toContain("to");
  });

  it("compress_or_expand_text requires text and mode parameters", () => {
    const tool = findTool("compress_or_expand_text");
    expect(tool.inputSchema.required).toContain("text");
    expect(tool.inputSchema.required).toContain("mode");
    const modeProp = (tool.inputSchema as any).properties.mode;
    expect(modeProp.enum).toContain("compress");
    expect(modeProp.enum).toContain("expand");
  });

  it("remove_ai_signatures requires text parameter", () => {
    const tool = findTool("remove_ai_signatures");
    expect(tool.inputSchema.required).toContain("text");
  });

  it("check_paper_logic requires text parameter", () => {
    const tool = findTool("check_paper_logic");
    expect(tool.inputSchema.required).toContain("text");
    expect(tool.inputSchema.properties).toHaveProperty("checkType");
  });

  it("generate_academic_caption requires description and figureType", () => {
    const tool = findTool("generate_academic_caption");
    expect(tool.inputSchema.required).toContain("description");
    expect(tool.inputSchema.required).toContain("figureType");
    const ftProp = (tool.inputSchema as any).properties.figureType;
    expect(ftProp.enum).toContain("figure");
    expect(ftProp.enum).toContain("table");
  });

  it("analyze_experiment_data requires data and goal parameters", () => {
    const tool = findTool("analyze_experiment_data");
    expect(tool.inputSchema.required).toContain("data");
    expect(tool.inputSchema.required).toContain("goal");
    expect(tool.inputSchema.properties).toHaveProperty("format");
  });

  it("review_paper_as_reviewer requires text and venue parameters", () => {
    const tool = findTool("review_paper_as_reviewer");
    expect(tool.inputSchema.required).toContain("text");
    expect(tool.inputSchema.required).toContain("venue");
    const strictProp = (tool.inputSchema as any).properties.strictness;
    expect(strictProp.enum).toContain("lenient");
    expect(strictProp.enum).toContain("moderate");
    expect(strictProp.enum).toContain("harsh");
  });
});

describe("Unit: remove_ai_signatures pattern detection", () => {
  it("should detect AI patterns in text with known signatures", async () => {
    const tool = findTool("remove_ai_signatures");
    const result = (await tool.handler({
      text: "We leverage advanced techniques to delve into the multifaceted landscape of deep learning. Furthermore, it is worth noting that our comprehensive approach utilizes a robust framework.",
    })) as any;
    expect(result.patternsFound).toBeGreaterThan(0);
    expect(result.detectedPatterns.length).toBeGreaterThan(0);
    expect(result.detectedPatterns.some((p: any) => p.label.includes("leverage"))).toBe(true);
  });

  it("should return clean verdict for natural text", async () => {
    const tool = findTool("remove_ai_signatures");
    const result = (await tool.handler({
      text: "We train a convolutional network on ImageNet for 90 epochs using SGD with momentum 0.9.",
    })) as any;
    expect(result.patternsFound).toBe(0);
    expect(result.verdict).toContain("No significant AI signatures");
  });
});

describe("Static: academic_paper_writing methodology", () => {
  it("should return academic_paper_writing methodology with 8 steps", async () => {
    const tool = allTools.find((t) => t.name === "getMethodology")!;
    const result = (await tool.handler({ topic: "academic_paper_writing" })) as any;
    expect(result.title).toContain("Academic Paper Writing");
    expect(result.steps.length).toBe(8);
    expect(result.steps[0].name).toBe("Polish Draft");
    expect(result.steps[6].name).toBe("Simulate Review");
  });
});

describe("Static: scan_terminal_security tool", () => {
  const tool = domainTools.find((t) => t.name === "scan_terminal_security");
  it("should exist", () => {
    expect(tool).toBeDefined();
  });
  it("should accept projectRoot and checks", () => {
    const props = tool!.inputSchema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("projectRoot");
    expect(props).toHaveProperty("checks");
  });
  it("should accept scanHome and verbose flags", () => {
    const props = tool!.inputSchema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("scanHome");
    expect(props).toHaveProperty("verbose");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// v2.8.0 — Progressive Discovery, Boilerplate, Benchmark tools
// ═══════════════════════════════════════════════════════════════════════════

describe("Static: progressive discovery tools", () => {
  it("should include discover_tools, get_tool_quick_ref, get_workflow_chain", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("discover_tools");
    expect(names).toContain("get_tool_quick_ref");
    expect(names).toContain("get_workflow_chain");
  });

  it("discover_tools requires query parameter", () => {
    const tool = findTool("discover_tools");
    expect(tool.inputSchema.required).toContain("query");
    expect(tool.inputSchema.properties).toHaveProperty("category");
    expect(tool.inputSchema.properties).toHaveProperty("phase");
    expect(tool.inputSchema.properties).toHaveProperty("limit");
  });

  it("get_tool_quick_ref requires toolName parameter", () => {
    const tool = findTool("get_tool_quick_ref");
    expect(tool.inputSchema.required).toContain("toolName");
  });

  it("get_workflow_chain requires chain parameter", () => {
    const tool = findTool("get_workflow_chain");
    expect(tool.inputSchema.required).toContain("chain");
  });
});

describe("Unit: discover_tools hybrid search", () => {
  it("should return ranked results for verification query", async () => {
    const tool = findTool("discover_tools");
    const result = (await tool.handler({ query: "verify implementation" })) as any;
    expect(result.resultCount).toBeGreaterThan(0);
    expect(result.results[0]).toHaveProperty("relevanceScore");
    expect(result.results[0]).toHaveProperty("quickRef");
    expect(result.results[0].relevanceScore).toBeGreaterThan(0);
  });

  it("should filter by category", async () => {
    const tool = findTool("discover_tools");
    const result = (await tool.handler({ query: "test", category: "eval" })) as any;
    for (const r of result.results) {
      expect(r.category).toBe("eval");
    }
  });

  it("should filter by phase", async () => {
    const tool = findTool("discover_tools");
    const result = (await tool.handler({ query: "search find", phase: "research" })) as any;
    for (const r of result.results) {
      expect(r.phase).toBe("research");
    }
  });

  it("should include matching workflow chains", async () => {
    const tool = findTool("discover_tools");
    const result = (await tool.handler({ query: "new feature build" })) as any;
    expect(result.matchingWorkflows.length).toBeGreaterThan(0);
  });

  it("should return progressive hint", async () => {
    const tool = findTool("discover_tools");
    const result = (await tool.handler({ query: "verify" })) as any;
    expect(result._progressiveHint).toBeTruthy();
  });
});

describe("Unit: get_tool_quick_ref", () => {
  it("should return quick ref for known tool", async () => {
    const tool = findTool("get_tool_quick_ref");
    const result = (await tool.handler({ toolName: "start_verification_cycle" })) as any;
    expect(result.tool).toBe("start_verification_cycle");
    expect(result.category).toBe("verification");
    expect(result.quickRef).toHaveProperty("nextAction");
    expect(result.quickRef).toHaveProperty("nextTools");
    expect(result.quickRef.nextTools.length).toBeGreaterThan(0);
  });

  it("should return error for unknown tool with suggestions", async () => {
    const tool = findTool("get_tool_quick_ref");
    const result = (await tool.handler({ toolName: "nonexistent_tool_xyz" })) as any;
    expect(result.error).toBe(true);
    expect(result).toHaveProperty("didYouMean");
  });

  it("should include related tool details when requested", async () => {
    const tool = findTool("get_tool_quick_ref");
    const result = (await tool.handler({
      toolName: "run_mandatory_flywheel",
      includeRelatedDetails: true,
    })) as any;
    expect(result).toHaveProperty("relatedToolDetails");
    expect(Object.keys(result.relatedToolDetails).length).toBeGreaterThan(0);
  });
});

describe("Unit: get_workflow_chain", () => {
  it("should list all available chains", async () => {
    const tool = findTool("get_workflow_chain");
    const result = (await tool.handler({ chain: "list" })) as any;
    expect(result.availableChains.length).toBeGreaterThan(0);
    const keys = result.availableChains.map((c: any) => c.key);
    expect(keys).toContain("new_feature");
    expect(keys).toContain("fix_bug");
    expect(keys).toContain("c_compiler_benchmark");
  });

  it("should return enriched chain steps", async () => {
    const tool = findTool("get_workflow_chain");
    const result = (await tool.handler({ chain: "new_feature" })) as any;
    expect(result.name).toBe("Build a New Feature");
    expect(result.totalSteps).toBeGreaterThan(5);
    expect(result.steps[0]).toHaveProperty("tool");
    expect(result.steps[0]).toHaveProperty("action");
    expect(result.steps[0]).toHaveProperty("quickRef");
  });

  it("should return error for unknown chain", async () => {
    const tool = findTool("get_workflow_chain");
    const result = (await tool.handler({ chain: "nonexistent_chain" as any })) as any;
    expect(result.error).toBe(true);
  });
});

describe("Static: boilerplate tools", () => {
  it("should include scaffold_nodebench_project and get_boilerplate_status", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("scaffold_nodebench_project");
    expect(names).toContain("get_boilerplate_status");
  });

  it("scaffold_nodebench_project requires projectPath, projectName, techStack", () => {
    const tool = findTool("scaffold_nodebench_project");
    expect(tool.inputSchema.required).toContain("projectPath");
    expect(tool.inputSchema.required).toContain("projectName");
    expect(tool.inputSchema.required).toContain("techStack");
  });

  it("get_boilerplate_status requires projectPath", () => {
    const tool = findTool("get_boilerplate_status");
    expect(tool.inputSchema.required).toContain("projectPath");
  });
});

describe("Unit: scaffold_nodebench_project dry run", () => {
  it("should preview files without creating them", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nodebench-scaffold-"));
    const tool = findTool("scaffold_nodebench_project");
    const result = (await tool.handler({
      projectPath: tmpDir,
      projectName: "test-project",
      techStack: "TypeScript, Node.js",
      dryRun: true,
    })) as any;
    expect(result.dryRun).toBe(true);
    expect(result.summary.totalFiles).toBeGreaterThan(5);
    expect(result.willCreate.length).toBeGreaterThan(0);
    expect(result.willCreate).toContain("AGENTS.md");
    expect(result.willCreate).toContain("package.json");
    expect(result.willCreate).toContain(".mcp.json");
    expect(result._quickRef).toBeDefined();
  });
});

describe("Unit: scaffold_nodebench_project actual creation", () => {
  it("should create all project files", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nodebench-scaffold-"));
    const tool = findTool("scaffold_nodebench_project");
    const result = (await tool.handler({
      projectPath: tmpDir,
      projectName: "real-project",
      techStack: "TypeScript, React",
      dryRun: false,
      includeParallelAgents: true,
      includeGithubActions: true,
    })) as any;
    expect(result.dryRun).toBe(false);
    expect(result.summary.created).toBeGreaterThan(5);

    // Verify key files exist
    const { existsSync } = await import("node:fs");
    expect(existsSync(path.join(tmpDir, "AGENTS.md"))).toBe(true);
    expect(existsSync(path.join(tmpDir, "package.json"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".mcp.json"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".parallel-agents"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".github", "workflows"))).toBe(true);
  });
});

describe("Unit: get_boilerplate_status", () => {
  it("should scan an empty directory and find everything missing", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nodebench-status-"));
    const tool = findTool("get_boilerplate_status");
    const result = (await tool.handler({ projectPath: tmpDir })) as any;
    expect(result.completionPercentage).toBe(0);
    expect(result.missing).toBeGreaterThan(0);
    expect(result.missingFiles).toContain("AGENTS.md");
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("should detect existing files after scaffolding", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "nodebench-status-"));
    // Scaffold first
    await findTool("scaffold_nodebench_project").handler({
      projectPath: tmpDir,
      projectName: "status-test",
      techStack: "TypeScript",
      dryRun: false,
    });
    // Then check status
    const tool = findTool("get_boilerplate_status");
    const result = (await tool.handler({ projectPath: tmpDir })) as any;
    expect(result.completionPercentage).toBeGreaterThan(50);
    expect(result.found).toBeGreaterThan(5);
  });

  it("should throw for nonexistent path", async () => {
    const tool = findTool("get_boilerplate_status");
    await expect(
      tool.handler({ projectPath: "/nonexistent/path/xyz123" })
    ).rejects.toThrow("does not exist");
  });
});

describe("Static: C-compiler benchmark tools", () => {
  it("should include all 3 benchmark tools", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("start_autonomy_benchmark");
    expect(names).toContain("log_benchmark_milestone");
    expect(names).toContain("complete_autonomy_benchmark");
  });

  it("start_autonomy_benchmark requires challenge parameter", () => {
    const tool = findTool("start_autonomy_benchmark");
    expect(tool.inputSchema.required).toContain("challenge");
    const challengeProp = (tool.inputSchema as any).properties.challenge;
    expect(challengeProp.enum).toContain("c_compiler");
    expect(challengeProp.enum).toContain("rest_api");
    expect(challengeProp.enum).toContain("fullstack_app");
    expect(challengeProp.enum).toContain("list");
  });

  it("log_benchmark_milestone requires benchmarkId, milestoneId, verificationPassed", () => {
    const tool = findTool("log_benchmark_milestone");
    expect(tool.inputSchema.required).toContain("benchmarkId");
    expect(tool.inputSchema.required).toContain("milestoneId");
    expect(tool.inputSchema.required).toContain("verificationPassed");
  });

  it("complete_autonomy_benchmark requires benchmarkId and reason", () => {
    const tool = findTool("complete_autonomy_benchmark");
    expect(tool.inputSchema.required).toContain("benchmarkId");
    expect(tool.inputSchema.required).toContain("reason");
  });
});

describe("Unit: start_autonomy_benchmark", () => {
  it("should list all available challenges", async () => {
    const tool = findTool("start_autonomy_benchmark");
    const result = (await tool.handler({ challenge: "list" })) as any;
    expect(result.availableChallenges.length).toBe(5);
    const keys = result.availableChallenges.map((c: any) => c.key);
    expect(keys).toContain("c_compiler");
    expect(keys).toContain("rest_api");
    expect(keys).toContain("fullstack_app");
    expect(keys).toContain("cli_tool");
    expect(keys).toContain("data_pipeline");
  });

  it("should start a cli_tool benchmark", async () => {
    const tool = findTool("start_autonomy_benchmark");
    const result = (await tool.handler({
      challenge: "cli_tool",
      notes: "test benchmark",
    })) as any;
    expect(result.benchmarkId).toBeTruthy();
    expect(result.challenge).toBe("cli_tool");
    expect(result.difficulty).toBe("easy");
    expect(result.totalPoints).toBe(100);
    expect(result.milestones.length).toBe(8);
    expect(result._quickRef).toBeDefined();
  });

  it("should throw for unknown challenge", async () => {
    const tool = findTool("start_autonomy_benchmark");
    await expect(
      tool.handler({ challenge: "nonexistent_challenge" })
    ).rejects.toThrow("Unknown challenge");
  });
});

describe("Integration: full benchmark lifecycle", () => {
  it("start → log milestone → complete", async () => {
    // 1. Start benchmark
    const benchmark = (await findTool("start_autonomy_benchmark").handler({
      challenge: "cli_tool",
      notes: "integration test",
    })) as any;
    expect(benchmark.benchmarkId).toBeTruthy();

    // 2. Log a milestone
    const milestone = (await findTool("log_benchmark_milestone").handler({
      benchmarkId: benchmark.benchmarkId,
      milestoneId: "project_setup",
      verificationPassed: true,
      toolsUsed: ["run_closed_loop", "bootstrap_project"],
      notes: "Project initialized",
    })) as any;
    expect(milestone.points).toBe(15);
    expect(milestone.progress.earnedPoints).toBe(15);
    expect(milestone.progress.milestonesCompleted).toBe(1);

    // 3. Log another milestone (failed)
    const milestone2 = (await findTool("log_benchmark_milestone").handler({
      benchmarkId: benchmark.benchmarkId,
      milestoneId: "arg_parsing",
      verificationPassed: false,
      notes: "Arg parsing failed tests",
    })) as any;
    expect(milestone2.points).toBe(0);
    expect(milestone2.progress.earnedPoints).toBe(15); // unchanged

    // 4. Complete benchmark
    const completed = (await findTool("complete_autonomy_benchmark").handler({
      benchmarkId: benchmark.benchmarkId,
      reason: "stuck",
      notes: "Integration test complete",
    })) as any;
    expect(completed.score.earnedPoints).toBe(15);
    expect(completed.score.percentage).toBe(15);
    expect(completed.score.grade).toContain("F");
    expect(completed.milestones.completed).toBe(1);
    expect(completed.milestones.failed).toBe(1);
    expect(completed.milestones.pending).toBe(6);
    expect(completed.analysis.strengths).toContain("Project Setup");
    expect(completed._quickRef).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Multi-modal search engine quality tests
// ═══════════════════════════════════════════════════════════════════════

const toolDescs = allTools.map((t) => ({ name: t.name, description: t.description }));

describe("Search engine: registry coverage", () => {
  it("should have a registry entry for every tool (129/129)", () => {
    const missing = allTools.filter((t) => !TOOL_REGISTRY.has(t.name));
    expect(missing.map((t) => t.name)).toEqual([]);
    expect(TOOL_REGISTRY.size).toBe(allTools.length);
  });

  it("should expose all 6 search modes", () => {
    expect(SEARCH_MODES).toEqual(["hybrid", "fuzzy", "regex", "prefix", "semantic", "exact", "dense"]);
  });

  it("should have quickRef for every registered tool", () => {
    for (const tool of allTools) {
      const qr = getQuickRef(tool.name);
      expect(qr, `Missing quickRef for ${tool.name}`).not.toBeNull();
      expect(qr!.nextAction.length).toBeGreaterThan(10);
      expect(qr!.nextTools.length).toBeGreaterThan(0);
    }
  });
});

describe("Search engine: hybrid mode (default)", () => {
  it("should find benchmark tools when searching 'benchmark'", () => {
    const results = hybridSearch("benchmark", toolDescs, { limit: 10 });
    const names = results.map((r) => r.name);
    expect(names).toContain("start_autonomy_benchmark");
    expect(names).toContain("complete_autonomy_benchmark");
    expect(names).toContain("benchmark_models");
    expect(names).toContain("log_benchmark_milestone");
  });

  it("should find scaffold tools when searching 'scaffold'", () => {
    const results = hybridSearch("scaffold", toolDescs, { limit: 10 });
    const names = results.map((r) => r.name);
    expect(names).toContain("scaffold_directory");
    expect(names).toContain("scaffold_nodebench_project");
  });

  it("should rank exact name matches highest", () => {
    const results = hybridSearch("web_search", toolDescs, { limit: 5 });
    expect(results[0].name).toBe("web_search");
  });

  it("should filter by category", () => {
    const results = hybridSearch("test", toolDescs, { category: "eval", limit: 10 });
    for (const r of results) {
      expect(r.category).toBe("eval");
    }
  });

  it("should filter by phase", () => {
    const results = hybridSearch("verify", toolDescs, { phase: "verify", limit: 10 });
    for (const r of results) {
      expect(r.phase).toBe("verify");
    }
  });

  it("should include matchReasons when explain=true", () => {
    const results = hybridSearch("verify", toolDescs, { limit: 3, explain: true });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].matchReasons.length).toBeGreaterThan(0);
    expect(results[0].matchReasons[0]).toMatch(/keyword|prefix|fuzzy|semantic|ngram|bigram|regex|domain/);
  });

  it("should return empty matchReasons when explain=false", () => {
    const results = hybridSearch("verify", toolDescs, { limit: 3, explain: false });
    expect(results[0].matchReasons).toEqual([]);
  });
});

describe("Search engine: fuzzy mode (typo tolerance)", () => {
  it("should find 'verify' tools when searching 'verifiy' (typo)", () => {
    const results = hybridSearch("verifiy", toolDescs, { mode: "fuzzy", limit: 10 });
    const names = results.map((r) => r.name);
    expect(names.some((n) => n.includes("verif"))).toBe(true);
  });

  it("should find 'benchmark' tools when searching 'benchmrk' (typo)", () => {
    const results = hybridSearch("benchmrk", toolDescs, { mode: "fuzzy", limit: 10 });
    const names = results.map((r) => r.name);
    expect(names.some((n) => n.includes("benchmark"))).toBe(true);
  });

  it("should find 'scaffold' when searching 'scafold' (typo)", () => {
    const results = hybridSearch("scafold", toolDescs, { mode: "fuzzy", limit: 10 });
    const names = results.map((r) => r.name);
    expect(names.some((n) => n.includes("scaffold"))).toBe(true);
  });
});

describe("Search engine: regex mode", () => {
  it("should match tools by regex pattern on name", () => {
    const results = hybridSearch("^capture_.*screenshot$", toolDescs, { mode: "regex", limit: 10 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe("capture_ui_screenshot");
  });

  it("should match tools by regex on tags", () => {
    const results = hybridSearch("c-compiler", toolDescs, { mode: "regex", limit: 10 });
    const names = results.map((r) => r.name);
    expect(names).toContain("start_autonomy_benchmark");
  });

  it("should handle invalid regex gracefully", () => {
    const results = hybridSearch("[invalid(", toolDescs, { mode: "regex", limit: 10 });
    expect(results).toEqual([]);
  });
});

describe("Search engine: prefix mode", () => {
  it("should find all 'run_' prefixed tools", () => {
    const results = hybridSearch("run_", toolDescs, { mode: "prefix", limit: 20 });
    for (const r of results) {
      expect(r.name.startsWith("run_")).toBe(true);
    }
    expect(results.length).toBeGreaterThanOrEqual(5);
  });

  it("should find 'cap' → capture_* tools", () => {
    const results = hybridSearch("cap", toolDescs, { mode: "prefix", limit: 10 });
    const names = results.map((r) => r.name);
    expect(names).toContain("capture_ui_screenshot");
    expect(names).toContain("capture_responsive_suite");
  });
});

describe("Search engine: semantic mode (synonym expansion)", () => {
  it("should expand 'check' to find 'verify' tools", () => {
    const results = hybridSearch("check", toolDescs, { mode: "semantic", limit: 10 });
    const names = results.map((r) => r.name);
    expect(names.some((n) => n.includes("verif") || n.includes("gate") || n.includes("quality"))).toBe(true);
  });

  it("should expand 'fix' to find 'resolve' tools", () => {
    const results = hybridSearch("fix", toolDescs, { mode: "semantic", limit: 10 });
    const names = results.map((r) => r.name);
    expect(names).toContain("resolve_gap");
  });

  it("should expand 'deploy' to find 'ship' phase tools", () => {
    const results = hybridSearch("deploy", toolDescs, { mode: "semantic", limit: 15 });
    const names = results.map((r) => r.name);
    expect(names.some((n) => n.includes("mandatory_flywheel") || n.includes("quality_gate"))).toBe(true);
  });
});

describe("Search engine: exact mode", () => {
  it("should return only exact name match", () => {
    const results = hybridSearch("web_search", toolDescs, { mode: "exact", limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe("web_search");
    expect(results[0].score).toBeGreaterThanOrEqual(100);
  });
});

describe("Search engine: bigram phrase matching", () => {
  it("should match 'quality gate' as a phrase", () => {
    const results = hybridSearch("quality gate", toolDescs, { limit: 5 });
    const names = results.map((r) => r.name);
    expect(names).toContain("run_quality_gate");
  });

  it("should match 'parallel agents' as a phrase", () => {
    const results = hybridSearch("parallel agents", toolDescs, { limit: 5 });
    const names = results.map((r) => r.name);
    expect(names.some((n) => n.includes("parallel") || n.includes("agent"))).toBe(true);
  });
});

// ── Contract Compliance Tool Tests ──────────────────────────────────────

describe("check_contract_compliance", () => {
  it("should return N/A score when no tool call data exists", async () => {
    const tool = findTool("check_contract_compliance");
    const result = (await tool.handler({ sessionId: "nonexistent-session-xyz-" + Date.now() })) as any;
    expect(result.score).toBe(0);
    expect(result.grade).toBe("N/A");
  });

  it("should score a perfect session with all contract phases", async () => {
    const sessionId = `compliance-test-perfect-${Date.now()}`;
    const logTool = findTool("log_tool_call");

    // Simulate a perfect agent session following the contract
    const perfectSequence = [
      // Front door (25pts)
      "search_all_knowledge",
      "getMethodology",
      "discover_tools",
      "get_workflow_chain",
      // Pre-impl (15pts)
      "run_recon",
      "log_recon_finding",
      "assess_risk",
      // Implementation
      "start_verification_cycle",
      "log_phase_findings",
      // Ship gates (30pts)
      "run_closed_loop",
      "log_test_result",
      "start_eval_run",
      "record_eval_result",
      "run_quality_gate",
      "run_mandatory_flywheel",
      "record_learning",
    ];

    for (const toolName of perfectSequence) {
      await logTool.handler({ sessionId, toolName, resultStatus: "success" });
    }

    const tool = findTool("check_contract_compliance");
    const result = (await tool.handler({ sessionId })) as any;

    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.grade).toMatch(/^[AB]/);
    expect(result.violations.length).toBeLessThanOrEqual(2);
    expect(result.dimensions.front_door.score).toBeGreaterThanOrEqual(20);
    expect(result.dimensions.ship_gates.score).toBeGreaterThanOrEqual(25);
  });

  it("should flag violations when agent skips front-door protocol", async () => {
    const sessionId = `compliance-test-no-frontdoor-${Date.now()}`;
    const logTool = findTool("log_tool_call");

    // Simulate an agent that jumps straight to implementation
    const badSequence = [
      "run_closed_loop",
      "log_test_result",
      "log_gap",
      "resolve_gap",
    ];

    for (const toolName of badSequence) {
      await logTool.handler({ sessionId, toolName, resultStatus: "success" });
    }

    const tool = findTool("check_contract_compliance");
    const result = (await tool.handler({ sessionId })) as any;

    expect(result.score).toBeLessThan(50);
    expect(result.grade).toMatch(/^[DF]/);
    expect(result.dimensions.front_door.score).toBeLessThanOrEqual(5);
    expect(result.violations.some((v: any) => v.dimension === "front_door")).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("should detect self-setup recovery from errors", async () => {
    const sessionId = `compliance-test-selfsetup-${Date.now()}`;
    const logTool = findTool("log_tool_call");

    await logTool.handler({ sessionId, toolName: "search_all_knowledge", resultStatus: "success" });
    await logTool.handler({ sessionId, toolName: "discover_tools", resultStatus: "error", error: "No provider available" });
    await logTool.handler({ sessionId, toolName: "setup_local_env", resultStatus: "success" });
    await logTool.handler({ sessionId, toolName: "bootstrap_project", resultStatus: "success" });
    await logTool.handler({ sessionId, toolName: "discover_tools", resultStatus: "success" });

    const tool = findTool("check_contract_compliance");
    const result = (await tool.handler({ sessionId })) as any;

    // Self-setup should get full credit since agent recovered from errors
    expect(result.dimensions.self_setup.score).toBe(10);
  });

  it("should give full parallel credit when no parallel tools used (N/A)", async () => {
    const sessionId = `compliance-test-noparallel-${Date.now()}`;
    const logTool = findTool("log_tool_call");

    await logTool.handler({ sessionId, toolName: "search_all_knowledge", resultStatus: "success" });
    await logTool.handler({ sessionId, toolName: "run_closed_loop", resultStatus: "success" });

    const tool = findTool("check_contract_compliance");
    const result = (await tool.handler({ sessionId })) as any;

    // No parallel tools = full credit (not applicable)
    expect(result.dimensions.parallel_coordination.score).toBe(10);
  });

  it("should support verbose mode with timeline", async () => {
    const sessionId = `compliance-test-verbose-${Date.now()}`;
    const logTool = findTool("log_tool_call");
    await logTool.handler({ sessionId, toolName: "search_all_knowledge", resultStatus: "success" });
    await logTool.handler({ sessionId, toolName: "getMethodology", resultStatus: "success" });

    const tool = findTool("check_contract_compliance");
    const result = (await tool.handler({ sessionId, verbose: true })) as any;

    expect(result.timeline).toBeDefined();
    expect(result.timeline.length).toBe(2);
    expect(result.timeline[0].tool).toBe("search_all_knowledge");
    expect(result.timeline[1].tool).toBe("getMethodology");
  });
});

describe("Registry: check_contract_compliance has quickRef", () => {
  it("should have quickRef with methodology agent_evaluation", () => {
    const entry = ALL_REGISTRY_ENTRIES.find((e) => e.name === "check_contract_compliance");
    expect(entry).toBeDefined();
    expect(entry!.quickRef).toBeDefined();
    expect(entry!.quickRef.methodology).toBe("agent_evaluation");
    expect(entry!.category).toBe("self_eval");
  });
});

describe("Workflow chains: agent_eval and contract_compliance", () => {
  it("should have agent_eval chain with 9 steps", () => {
    expect(WORKFLOW_CHAINS.agent_eval).toBeDefined();
    expect(WORKFLOW_CHAINS.agent_eval.steps.length).toBe(9);
    expect(WORKFLOW_CHAINS.agent_eval.steps[0].tool).toBe("check_contract_compliance");
  });

  it("should have contract_compliance chain with 5 steps", () => {
    expect(WORKFLOW_CHAINS.contract_compliance).toBeDefined();
    expect(WORKFLOW_CHAINS.contract_compliance.steps.length).toBe(5);
    expect(WORKFLOW_CHAINS.contract_compliance.steps[1].tool).toBe("check_contract_compliance");
  });
});
