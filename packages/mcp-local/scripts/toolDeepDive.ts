#!/usr/bin/env node
/**
 * Tool Deep Dive Script
 * 
 * Analyzes all MCP tools across 8 dimensions:
 * NOTE: This script imports TOOLSET_MAP from index.ts which has side effects.
 * Run with: npx tsx scripts/toolDeepDive.ts
 * - AI Flywheel Fit
 * - Essentiality
 * - Dependency Profile
 * - Token Cost
 * - Usage Frequency
 * - Interdependencies
 * - Error Rate
 * - Value Proposition
 */

import { ALL_REGISTRY_ENTRIES, TOOL_REGISTRY } from "../src/tools/toolRegistry.js";
import { TOOLSET_MAP } from "../src/toolsetRegistry.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";

interface ToolAnalysis {
  name: string;
  toolset: string;
  category: string;
  phase: string;
  aiFlywheelFit: {
    score: number;
    rationale: string;
  };
  essentiality: "Essential" | "Important" | "Optional";
  dependencies: {
    external: string[];
    internal: string[];
    apiKeys: string[];
  };
  tokenCost: number;
  usageFrequency: "High" | "Medium" | "Low";
  interdependencies: {
    dependsOn: string[];
    requiredBy: string[];
  };
  errorRate: {
    probability: "Low" | "Medium" | "High";
    commonErrors: string[];
  };
  valueProposition: string;
}

interface DeepDiveReport {
  timestamp: number;
  totalTools: number;
  toolsets: Record<string, {
    toolCount: number;
    essentialCount: number;
    importantCount: number;
    optionalCount: number;
  }>;
  tools: ToolAnalysis[];
  summary: {
    essentialCount: number;
    importantCount: number;
    optionalCount: number;
    highDependencyCount: number;
    recommendations: string[];
  };
}

// Tool to toolset mapping
const TOOL_TO_TOOLSET: Record<string, string> = {};

// Build tool to toolset mapping
for (const [toolsetName, tools] of Object.entries(TOOLSET_MAP)) {
  for (const tool of tools) {
    TOOL_TO_TOOLSET[tool.name] = toolsetName;
  }
}

// AI Flywheel methodology phases
const AI_FLYWHEEL_PHASES = [
  "research",
  "implement",
  "test",
  "verify",
  "ship",
  "meta",
  "utility",
];

// Essential tools for AI Flywheel (from AGENTS.md)
const AI_FLYWHEEL_ESSENTIAL_TOOLS = new Set([
  // Verification
  "start_verification_cycle",
  "log_phase_findings",
  "log_gap",
  "resolve_gap",
  "log_test_result",
  "get_verification_status",
  // Eval
  "start_eval_run",
  "record_eval_result",
  "complete_eval_run",
  "compare_eval_runs",
  // Quality Gate
  "run_quality_gate",
  "run_closed_loop",
  // Learning
  "record_learning",
  "search_learnings",
  // Flywheel
  "run_mandatory_flywheel",
  "promote_to_eval",
  // Recon
  "run_recon",
  "log_recon_finding",
  "search_all_knowledge",
  // Meta
  "findTools",
  "getMethodology",
  "discover_tools",
]);

// High-frequency tools (based on typical usage patterns)
const HIGH_FREQUENCY_TOOLS = new Set([
  "findTools",
  "getMethodology",
  "discover_tools",
  "search_learnings",
  "record_learning",
  "log_test_result",
  "run_quality_gate",
]);

// Tools with external dependencies
const EXTERNAL_DEPENDENCY_TOOLS: Record<string, {
  external: string[];
  apiKeys: string[];
}> = {
  // Web tools
  web_search: {
    external: ["@modelcontextprotocol/sdk"],
    apiKeys: ["GEMINI_API_KEY", "OPENAI_API_KEY", "PERPLEXITY_API_KEY"],
  },
  fetch_url: {
    external: ["cheerio"],
    apiKeys: [],
  },
  // Vision tools
  analyze_screenshot: {
    external: ["@modelcontextprotocol/sdk"],
    apiKeys: ["GEMINI_API_KEY", "OPENAI_API_KEY"],
  },
  // GitHub tools
  search_github: {
    external: [],
    apiKeys: ["GITHUB_TOKEN"],
  },
  analyze_repo: {
    external: [],
    apiKeys: ["GITHUB_TOKEN"],
  },
  // LLM tools
  call_llm: {
    external: [],
    apiKeys: ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"],
  },
  // Local file tools
  parse_csv: {
    external: ["papaparse"],
    apiKeys: [],
  },
  parse_xlsx: {
    external: ["xlsx"],
    apiKeys: [],
  },
  parse_pdf: {
    external: ["pdf-parse"],
    apiKeys: [],
  },
  parse_docx: {
    external: ["mammoth"],
    apiKeys: [],
  },
  parse_pptx: {
    external: [],
    apiKeys: [],
  },
  parse_zip: {
    external: ["yauzl"],
    apiKeys: [],
  },
  ocr_image: {
    external: ["tesseract.js"],
    apiKeys: [],
  },
  // UI capture
  capture_ui_screenshot: {
    external: ["playwright"],
    apiKeys: [],
  },
  // Flicker detection
  detect_flicker: {
    external: [],
    apiKeys: [],
  },
  // Figma flow
  analyze_figma_flow: {
    external: [],
    apiKeys: [],
  },
  // Email
  send_email: {
    external: ["nodemailer"],
    apiKeys: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"],
  },
  read_email: {
    external: ["imap-simple"],
    apiKeys: ["IMAP_HOST", "IMAP_USER", "IMAP_PASS"],
  },
  // RSS
  parse_rss: {
    external: ["rss-parser"],
    apiKeys: [],
  },
};

// Tool interdependencies (simplified)
const TOOL_DEPENDENCIES: Record<string, string[]> = {
  start_verification_cycle: ["log_phase_findings", "log_gap"],
  log_gap: ["start_verification_cycle"],
  resolve_gap: ["log_gap"],
  log_test_result: ["start_verification_cycle"],
  run_quality_gate: ["log_test_result"],
  run_closed_loop: ["log_test_result"],
  start_eval_run: ["record_eval_result"],
  record_eval_result: ["start_eval_run"],
  complete_eval_run: ["record_eval_result"],
  compare_eval_runs: ["start_eval_run"],
  run_mandatory_flywheel: ["start_verification_cycle", "run_quality_gate"],
  promote_to_eval: ["start_verification_cycle"],
  trigger_investigation: ["start_verification_cycle", "start_eval_run"],
  run_recon: ["log_recon_finding"],
  log_recon_finding: ["run_recon"],
  search_all_knowledge: ["record_learning"],
  record_learning: ["search_all_knowledge"],
  bootstrap_project: ["scaffold_nodebench_project"],
  discover_tools: ["findTools"],
  get_tool_quick_ref: ["discover_tools"],
  get_workflow_chain: ["getMethodology"],
};

function analyzeTool(toolName: string, entry: any): ToolAnalysis {
  const toolset = TOOL_TO_TOOLSET[toolName] || "unknown";
  const category = entry.category || "unknown";
  const phase = entry.phase || "utility";

  // AI Flywheel Fit
  const aiFlywheelFit = analyzeAiFlywheelFit(toolName, category, phase);

  // Essentiality
  const essentiality = analyzeEssentiality(toolName, aiFlywheelFit.score);

  // Dependencies
  const deps = EXTERNAL_DEPENDENCY_TOOLS[toolName] || { external: [], apiKeys: [] };
  const internalDeps = TOOL_DEPENDENCIES[toolName] || [];

  // Token Cost (estimate based on schema size)
  const tokenCost = estimateTokenCost(entry);

  // Usage Frequency
  const usageFrequency = analyzeUsageFrequency(toolName);

  // Interdependencies
  const interdependencies = analyzeInterdependencies(toolName);

  // Error Rate
  const errorRate = analyzeErrorRate(toolName, category);

  // Value Proposition
  const valueProposition = generateValueProposition(toolName, category, essentiality);

  return {
    name: toolName,
    toolset,
    category,
    phase,
    aiFlywheelFit,
    essentiality,
    dependencies: {
      external: deps.external,
      internal: internalDeps,
      apiKeys: deps.apiKeys,
    },
    tokenCost,
    usageFrequency,
    interdependencies,
    errorRate,
    valueProposition,
  };
}

function analyzeAiFlywheelFit(toolName: string, category: string, phase: string): {
  score: number;
  rationale: string;
} {
  // Essential AI Flywheel tools get highest score
  if (AI_FLYWHEEL_ESSENTIAL_TOOLS.has(toolName)) {
    return {
      score: 5,
      rationale: "Core tool for AI Flywheel methodology - essential for verification/eval/learning loops",
    };
  }

  // Tools in verification, eval, quality_gate, learning, flywheel, recon categories
  if (["verification", "eval", "quality_gate", "learning", "flywheel", "reconnaissance"].includes(category)) {
    return {
      score: 4,
      rationale: `Supports ${category} phase of AI Flywheel methodology`,
    };
  }

  // Tools in research, test, verify phases
  if (["research", "test", "verify"].includes(phase)) {
    return {
      score: 3,
      rationale: `Supports ${phase} phase of development workflow`,
    };
  }

  // Meta and utility tools
  if (["meta", "utility"].includes(phase)) {
    return {
      score: 2,
      rationale: "Supports tool discovery and methodology guidance",
    };
  }

  // Specialized tools
  return {
    score: 1,
    rationale: "Specialized tool for specific use cases",
  };
}

function analyzeEssentiality(toolName: string, aiFlywheelScore: number): "Essential" | "Important" | "Optional" {
  if (AI_FLYWHEEL_ESSENTIAL_TOOLS.has(toolName)) {
    return "Essential";
  }

  if (aiFlywheelScore >= 3) {
    return "Important";
  }

  // Score 1-2: specialized or utility tools
  return "Optional";
}

function estimateTokenCost(entry: any): number {
  // Rough estimate: description length + input schema size
  const descLength = (entry.description || "").length;
  const schemaSize = JSON.stringify(entry.inputSchema || {}).length;
  return Math.ceil((descLength + schemaSize) / 4); // ~4 chars per token
}

function analyzeUsageFrequency(toolName: string): "High" | "Medium" | "Low" {
  if (HIGH_FREQUENCY_TOOLS.has(toolName)) {
    return "High";
  }

  if (AI_FLYWHEEL_ESSENTIAL_TOOLS.has(toolName)) {
    return "High";
  }

  // Tools in core categories
  const toolset = TOOL_TO_TOOLSET[toolName];
  if (["verification", "eval", "quality_gate", "learning", "flywheel", "recon"].includes(toolset)) {
    return "Medium";
  }

  return "Low";
}

function analyzeInterdependencies(toolName: string): {
  dependsOn: string[];
  requiredBy: string[];
} {
  const dependsOn = TOOL_DEPENDENCIES[toolName] || [];
  const requiredBy: string[] = [];

  // Find tools that depend on this one
  for (const [otherTool, deps] of Object.entries(TOOL_DEPENDENCIES)) {
    if (deps.includes(toolName)) {
      requiredBy.push(otherTool);
    }
  }

  return { dependsOn, requiredBy };
}

function analyzeErrorRate(toolName: string, category: string): {
  probability: "Low" | "Medium" | "High";
  commonErrors: string[];
} {
  const deps = EXTERNAL_DEPENDENCY_TOOLS[toolName];

  // Tools with external dependencies have higher error probability
  if (deps && (deps.external.length > 0 || deps.apiKeys.length > 0)) {
    return {
      probability: "Medium",
      commonErrors: [
        "Missing external dependency",
        "API key not configured",
        "External service unavailable",
      ],
    };
  }

  // Tools with many internal dependencies
  const internalDeps = TOOL_DEPENDENCIES[toolName] || [];
  if (internalDeps.length > 2) {
    return {
      probability: "Medium",
      commonErrors: [
        "Dependent tool not available",
        "Invalid state from previous tool",
      ],
    };
  }

  // Core tools generally have low error rates
  if (AI_FLYWHEEL_ESSENTIAL_TOOLS.has(toolName)) {
    return {
      probability: "Low",
      commonErrors: ["Invalid input parameters", "Missing required context"],
    };
  }

  return {
    probability: "Low",
    commonErrors: ["Invalid input parameters"],
  };
}

function generateValueProposition(toolName: string, category: string, essentiality: string): string {
  const toolset = TOOL_TO_TOOLSET[toolName];

  // Generate value proposition based on tool name and category
  const valueProps: Record<string, string> = {
    // Verification
    start_verification_cycle: "Initiates structured 6-phase verification cycle with tracking",
    log_phase_findings: "Records findings from each verification phase for traceability",
    log_gap: "Documents implementation gaps with severity and fix strategy",
    resolve_gap: "Tracks gap resolution and marks issues as fixed",
    log_test_result: "Records test results across static, unit, and integration layers",
    get_verification_status: "Retrieves current status of active verification cycles",
    list_verification_cycles: "Lists all verification cycles with their status",
    // Eval
    start_eval_run: "Initiates an evaluation run for measuring system quality",
    record_eval_result: "Records evaluation results for comparison and tracking",
    complete_eval_run: "Finalizes an evaluation run and generates summary",
    compare_eval_runs: "Compares multiple evaluation runs to detect regressions",
    list_eval_runs: "Lists all evaluation runs with their results",
    diff_outputs: "Shows differences between evaluation run outputs",
    // Quality Gate
    run_quality_gate: "Enforces quality gate rules before deployment",
    get_gate_preset: "Retrieves quality gate preset configuration",
    get_gate_history: "Shows historical quality gate results",
    run_closed_loop: "Runs compile-lint-test cycle for rapid iteration",
    // Learning
    record_learning: "Persists learnings for future reference and knowledge compounding",
    search_learnings: "Searches past learnings to avoid repeating mistakes",
    list_learnings: "Lists all recorded learnings",
    delete_learning: "Removes a learning entry",
    // Flywheel
    get_flywheel_status: "Retrieves overall AI Flywheel health status",
    promote_to_eval: "Promotes verification findings to eval test cases",
    trigger_investigation: "Triggers investigation for eval regressions",
    run_mandatory_flywheel: "Runs mandatory 6-step flywheel verification",
    // Recon
    run_recon: "Initiates structured research with framework checks",
    log_recon_finding: "Records research findings with source attribution",
    get_recon_summary: "Retrieves summary of recon session findings",
    check_framework_updates: "Checks for framework/library updates",
    search_all_knowledge: "Searches across all knowledge bases",
    bootstrap_project: "Bootstraps NodeBench project infrastructure",
    get_project_context: "Retrieves project context and configuration",
    // Meta
    findTools: "Searches available tools by keyword or capability",
    getMethodology: "Provides step-by-step methodology guidance",
    check_mcp_setup: "Diagnostic wizard for MCP configuration",
    // Discovery
    discover_tools: "Multi-modal tool search with relevance scoring",
    get_tool_quick_ref: "Provides next-step guidance after tool use",
    get_workflow_chain: "Provides recommended tool sequences for workflows",
  };

  if (valueProps[toolName]) {
    return valueProps[toolName];
  }

  // Generic value proposition
  if (essentiality === "Essential") {
    return `Core ${category} tool required for AI Flywheel methodology`;
  }

  if (essentiality === "Important") {
    return `Enhances ${category} workflow with ${toolset} capabilities`;
  }

  return `Provides ${toolset} functionality for specific use cases`;
}

async function runDeepDive(): Promise<DeepDiveReport> {
  console.log("Starting Tool Deep Dive Analysis...");
  console.log(`Analyzing ${ALL_REGISTRY_ENTRIES.length} tools...\n`);

  const tools: ToolAnalysis[] = [];
  const toolsets: Record<string, {
    toolCount: number;
    essentialCount: number;
    importantCount: number;
    optionalCount: number;
  }> = {};

  // Analyze each tool
  for (const entry of ALL_REGISTRY_ENTRIES) {
    const analysis = analyzeTool(entry.name, entry);
    tools.push(analysis);

    // Track toolset stats
    const toolset = analysis.toolset;
    if (!toolsets[toolset]) {
      toolsets[toolset] = {
        toolCount: 0,
        essentialCount: 0,
        importantCount: 0,
        optionalCount: 0,
      };
    }
    toolsets[toolset].toolCount++;
    if (analysis.essentiality === "Essential") toolsets[toolset].essentialCount++;
    else if (analysis.essentiality === "Important") toolsets[toolset].importantCount++;
    else toolsets[toolset].optionalCount++;
  }

  // Generate summary
  const essentialCount = tools.filter(t => t.essentiality === "Essential").length;
  const importantCount = tools.filter(t => t.essentiality === "Important").length;
  const optionalCount = tools.filter(t => t.essentiality === "Optional").length;
  const highDependencyCount = tools.filter(t => 
    t.dependencies.external.length > 0 || t.dependencies.apiKeys.length > 0
  ).length;

  const recommendations = generateRecommendations(tools, toolsets);

  const report: DeepDiveReport = {
    timestamp: Date.now(),
    totalTools: tools.length,
    toolsets,
    tools,
    summary: {
      essentialCount,
      importantCount,
      optionalCount,
      highDependencyCount,
      recommendations,
    },
  };

  console.log(`Analysis complete!`);
  console.log(`  Total tools: ${report.totalTools}`);
  console.log(`  Essential: ${essentialCount}`);
  console.log(`  Important: ${importantCount}`);
  console.log(`  Optional: ${optionalCount}`);
  console.log(`  High dependency: ${highDependencyCount}\n`);

  return report;
}

function generateRecommendations(tools: ToolAnalysis[], toolsets: any): string[] {
  const recommendations: string[] = [];

  // Check default preset coverage
  const defaultPresetToolsets = new Set([
    "verification", "eval", "quality_gate", "learning", "flywheel", "recon", "security", "boilerplate"
  ]);

  const essentialToolsNotInDefault = tools.filter(t => 
    t.essentiality === "Essential" && !defaultPresetToolsets.has(t.toolset)
  );

  if (essentialToolsNotInDefault.length > 0) {
    recommendations.push(
      `⚠️  ${essentialToolsNotInDefault.length} essential tools not in default preset: ` +
      essentialToolsNotInDefault.map(t => t.name).join(", ")
    );
  }

  // Check for tools with high interdependencies
  const highInterdepTools = tools.filter(t => 
    t.interdependencies.dependsOn.length > 2 || t.interdependencies.requiredBy.length > 2
  );

  if (highInterdepTools.length > 0) {
    recommendations.push(
      `ℹ️  ${highInterdepTools.length} tools with high interdependencies: ` +
      highInterdepTools.map(t => t.name).join(", ")
    );
  }

  // Check for tools with high error rates
  const highErrorTools = tools.filter(t => t.errorRate.probability === "High");

  if (highErrorTools.length > 0) {
    recommendations.push(
      `⚠️  ${highErrorTools.length} tools with high error probability: ` +
      highErrorTools.map(t => t.name).join(", ")
    );
  }

  // Validate current preset configuration
  const defaultPresetTools = tools.filter(t => defaultPresetToolsets.has(t.toolset));
  const defaultEssentialCount = defaultPresetTools.filter(t => t.essentiality === "Essential").length;

  recommendations.push(
    `✅ Default preset includes ${defaultPresetTools.length} tools (${defaultEssentialCount} essential)`
  );

  // Suggest improvements
  if (essentialToolsNotInDefault.length > 0) {
    recommendations.push(
      `💡 Consider adding ${essentialToolsNotInDefault.map(t => t.toolset).join(", ")} to default preset`
    );
  }

  return recommendations;
}

async function main() {
  try {
    const report = await runDeepDive();

    // Write report to file
    const outputPath = path.join(process.cwd(), ".tmp", "tool-deep-dive-report.json");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2), "utf-8");

    console.log(`Report written to: ${outputPath}\n`);

    // Print summary
    console.log("=== RECOMMENDATIONS ===");
    for (const rec of report.summary.recommendations) {
      console.log(rec);
    }

    console.log("\n=== TOOLSET BREAKDOWN ===");
    for (const [toolset, stats] of Object.entries(report.toolsets)) {
      console.log(
        `${toolset}: ${stats.toolCount} tools ` +
        `(E:${stats.essentialCount}, I:${stats.importantCount}, O:${stats.optionalCount})`
      );
    }

    process.exit(0);
  } catch (error) {
    console.error("Error running deep dive:", error);
    process.exit(1);
  }
}

main();
