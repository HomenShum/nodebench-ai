import { describe, it, expect, beforeAll } from "vitest";
import { resolve } from "node:path";
import { schemaTools } from "../tools/schemaTools.js";
import { functionTools } from "../tools/functionTools.js";
import { deploymentTools } from "../tools/deploymentTools.js";
import { learningTools } from "../tools/learningTools.js";
import { methodologyTools } from "../tools/methodologyTools.js";
import { integrationBridgeTools } from "../tools/integrationBridgeTools.js";
import { cronTools } from "../tools/cronTools.js";
import { componentTools } from "../tools/componentTools.js";
import { httpTools } from "../tools/httpTools.js";
import { critterTools } from "../tools/critterTools.js";
import { getDb, seedGotchasIfEmpty } from "../db.js";
import { CONVEX_GOTCHAS } from "../gotchaSeed.js";

// Path to the actual nodebench-ai project root
const PROJECT_DIR = resolve(__dirname, "../../../..");

beforeAll(() => {
  getDb();
  seedGotchasIfEmpty(CONVEX_GOTCHAS as any);
});

describe("Schema Tools", () => {
  it("convex_audit_schema runs against nodebench-ai", async () => {
    const tool = schemaTools.find((t) => t.name === "convex_audit_schema")!;
    const result = (await tool.handler({ projectDir: PROJECT_DIR })) as any;
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.summary).toBeDefined();
    expect(typeof result.summary.totalIssues).toBe("number");
    console.log(`Schema audit: ${result.summary.totalIssues} issues (${result.summary.critical} critical, ${result.summary.warnings} warnings)`);
  });

  it("convex_suggest_indexes runs against nodebench-ai", async () => {
    const tool = schemaTools.find((t) => t.name === "convex_suggest_indexes")!;
    const result = (await tool.handler({ projectDir: PROJECT_DIR })) as any;
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(typeof result.totalSuggestions).toBe("number");
    console.log(`Index suggestions: ${result.totalSuggestions}`);
  }, 60_000);

  it("convex_check_validator_coverage runs against nodebench-ai", async () => {
    const tool = schemaTools.find((t) => t.name === "convex_check_validator_coverage")!;
    const result = (await tool.handler({ projectDir: PROJECT_DIR })) as any;
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.summary).toBeDefined();
    expect(typeof result.summary.totalFunctions).toBe("number");
    console.log(`Validator coverage: ${result.summary.argsValidatorCoverage} args, ${result.summary.returnsValidatorCoverage} returns, ${result.summary.oldSyntaxCount} old syntax`);
  });
});

describe("Function Tools", () => {
  it("convex_audit_functions runs against nodebench-ai", async () => {
    const tool = functionTools.find((t) => t.name === "convex_audit_functions")!;
    const result = (await tool.handler({ projectDir: PROJECT_DIR })) as any;
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.summary).toBeDefined();
    expect(typeof result.summary.totalFunctions).toBe("number");
    console.log(`Function audit: ${result.summary.totalFunctions} functions, ${result.summary.totalIssues} issues (${result.summary.critical} critical)`);
  });

  it("convex_check_function_refs runs against nodebench-ai", async () => {
    const tool = functionTools.find((t) => t.name === "convex_check_function_refs")!;
    const result = (await tool.handler({ projectDir: PROJECT_DIR })) as any;
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.summary).toBeDefined();
    console.log(`Function refs: ${result.summary.totalReferences} refs, ${result.summary.directPassAntiPatterns} direct pass anti-patterns`);
  });
});

describe("Deployment Tools", () => {
  it("convex_pre_deploy_gate runs against nodebench-ai", async () => {
    const tool = deploymentTools.find((t) => t.name === "convex_pre_deploy_gate")!;
    const result = (await tool.handler({ projectDir: PROJECT_DIR })) as any;
    expect(result).toBeDefined();
    expect(typeof result.passed).toBe("boolean");
    expect(result.checks).toBeDefined();
    expect(Array.isArray(result.checks)).toBe(true);
    console.log(`Deploy gate: ${result.passed ? "PASSED" : "BLOCKED"} (${result.checks.length} checks, ${result.blockers.length} blockers)`);
  });

  it("convex_check_env_vars runs against nodebench-ai", async () => {
    const tool = deploymentTools.find((t) => t.name === "convex_check_env_vars")!;
    const result = (await tool.handler({ projectDir: PROJECT_DIR })) as any;
    expect(result).toBeDefined();
    expect(result.envFilesFound).toBeDefined();
    console.log(`Env vars: ${result.envVarsInCode.length} in code, ${result.envVarsInEnvFile.length} in env files, ${result.missingInEnvFile.length} missing`);
  });
});

describe("Learning Tools", () => {
  it("convex_search_gotchas finds seeded gotchas", async () => {
    const tool = learningTools.find((t) => t.name === "convex_search_gotchas")!;
    const result = (await tool.handler({ query: "bigint deprecated" })) as any;
    expect(result).toBeDefined();
    expect(result.totalResults).toBeGreaterThan(0);
    expect(result.gotchas[0].key).toBe("validator_bigint_deprecated");
    console.log(`Gotcha search 'bigint deprecated': ${result.totalResults} results`);
  });

  it("convex_search_gotchas finds index gotchas", async () => {
    const tool = learningTools.find((t) => t.name === "convex_search_gotchas")!;
    const result = (await tool.handler({ query: "index order field" })) as any;
    expect(result).toBeDefined();
    expect(result.totalResults).toBeGreaterThan(0);
    console.log(`Gotcha search 'index order field': ${result.totalResults} results`);
  });

  it("convex_record_gotcha creates and updates", async () => {
    const tool = learningTools.find((t) => t.name === "convex_record_gotcha")!;
    const result1 = (await tool.handler({
      key: "test_gotcha_vitest",
      content: "Test gotcha from vitest",
      category: "general",
      severity: "info",
      tags: "test,vitest",
    })) as any;
    expect(["created", "updated"]).toContain(result1.action);

    const result2 = (await tool.handler({
      key: "test_gotcha_vitest",
      content: "Updated test gotcha from vitest",
      category: "general",
      severity: "info",
    })) as any;
    expect(result2.action).toBe("updated");
  });
});

describe("Methodology Tools", () => {
  it("convex_get_methodology returns overview", async () => {
    const tool = methodologyTools.find((t) => t.name === "convex_get_methodology")!;
    const result = (await tool.handler({ topic: "overview" })) as any;
    expect(result).toBeDefined();
    expect(result.title).toContain("Overview");
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("convex_get_methodology returns schema_audit steps", async () => {
    const tool = methodologyTools.find((t) => t.name === "convex_get_methodology")!;
    const result = (await tool.handler({ topic: "convex_schema_audit" })) as any;
    expect(result).toBeDefined();
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.tools.length).toBeGreaterThan(0);
  });

  it("convex_discover_tools finds schema tools", async () => {
    const tool = methodologyTools.find((t) => t.name === "convex_discover_tools")!;
    const result = (await tool.handler({ query: "schema audit" })) as any;
    expect(result).toBeDefined();
    expect(result.matchingTools).toBeGreaterThan(0);
    console.log(`Discover 'schema audit': ${result.matchingTools} tools found`);
  });

  it("convex_discover_tools filters by category", async () => {
    const tool = methodologyTools.find((t) => t.name === "convex_discover_tools")!;
    const result = (await tool.handler({ query: "deploy", category: "deployment" })) as any;
    expect(result).toBeDefined();
    expect(result.tools.every((t: any) => t.category === "deployment")).toBe(true);
  });
});

describe("Integration Bridge Tools", () => {
  it("convex_generate_rules_md generates rules content", async () => {
    const tool = integrationBridgeTools.find((t) => t.name === "convex_generate_rules_md")!;
    const result = (await tool.handler({ projectDir: PROJECT_DIR })) as any;
    expect(result).toBeDefined();
    expect(result.action).toBe("generated");
    expect(result.content).toContain("Convex Development Rules");
    expect(result.lines).toBeGreaterThan(10);
    console.log(`Rules generation: ${result.lines} lines`);
  });

  it("convex_snapshot_schema captures snapshot", async () => {
    const tool = integrationBridgeTools.find((t) => t.name === "convex_snapshot_schema")!;
    const result = (await tool.handler({ projectDir: PROJECT_DIR })) as any;
    expect(result).toBeDefined();
    expect(result.snapshotId).toBeDefined();
    expect(result.tableCount).toBeGreaterThan(0);
    console.log(`Schema snapshot: ${result.tableCount} tables`);
  });

  it("convex_bootstrap_project scans project", async () => {
    const tool = integrationBridgeTools.find((t) => t.name === "convex_bootstrap_project")!;
    const result = (await tool.handler({ projectDir: PROJECT_DIR })) as any;
    expect(result).toBeDefined();
    expect(result.checks).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.improvementPlan).toBeDefined();
    console.log(`Bootstrap: ${result.summary.good} good, ${result.summary.warnings} warnings, ${result.summary.criticals} criticals`);
  });
});

// ── BM25 A/B Comparison Tests ─────────────────────────────────────────────

import { findTools } from "../tools/toolRegistry.js";

describe("BM25 Tool Discovery — A/B Comparison", () => {
  it("ranks exact-name match above tag-only match", () => {
    const results = findTools("audit schema");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe("convex_audit_schema");
  });

  it("uses OR logic — partial terms still return results", () => {
    const results = findTools("deploy");
    expect(results.length).toBeGreaterThanOrEqual(2);
    const names = results.map((r) => r.name);
    expect(names).toContain("convex_pre_deploy_gate");
    expect(names).toContain("convex_check_env_vars");
  });

  it("field weighting: name > tags", () => {
    const results = findTools("gotcha");
    expect(results.length).toBeGreaterThanOrEqual(2);
    // Both gotcha tools should rank in top 2 (name contains 'gotcha')
    const top2 = results.slice(0, 2).map((r) => r.name);
    expect(top2).toContain("convex_record_gotcha");
    expect(top2).toContain("convex_search_gotchas");
  });

  it("IDF: rare term 'bootstrap' ranks convex_bootstrap_project first", () => {
    const results = findTools("bootstrap");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe("convex_bootstrap_project");
  });
});

describe("BM25 Gotcha Search — A/B Comparison", () => {
  it("FTS5 primary path finds relevant gotchas", async () => {
    const tool = learningTools.find((t) => t.name === "convex_search_gotchas")!;
    const result = (await tool.handler({ query: "validator deprecated bigint" })) as any;
    expect(result).toBeDefined();
    expect(result.totalResults).toBeGreaterThan(0);
  });

  it("searches across multiple seeded gotchas", async () => {
    const tool = learningTools.find((t) => t.name === "convex_search_gotchas")!;
    const result = (await tool.handler({ query: "function action mutation" })) as any;
    expect(result).toBeDefined();
    expect(result.totalResults).toBeGreaterThan(0);
  });

  it("category filter works with search", async () => {
    const tool = learningTools.find((t) => t.name === "convex_search_gotchas")!;
    const result = (await tool.handler({ query: "index", category: "schema" })) as any;
    expect(result).toBeDefined();
    if (result.totalResults > 0) {
      expect(result.gotchas.every((g: any) => g.category === "schema")).toBe(true);
    }
  });
});

describe("Cron Tools", () => {
  it("convex_check_crons validates crons.ts", async () => {
    const tool = cronTools.find((t) => t.name === "convex_check_crons")!;
    const result = (await tool.handler({ projectDir: PROJECT_DIR })) as any;
    expect(result).toBeDefined();
    expect(result.hasCrons).toBe(true);
    expect(result.totalCrons).toBeGreaterThan(10);
    console.log(`Crons: ${result.totalCrons} total (${result.byType.interval} interval, ${result.byType.daily} daily, ${result.byType.weekly} weekly, ${result.byType.monthly} monthly)`);
    console.log(`Cron issues: ${result.issues.total} (${result.issues.critical} critical, ${result.issues.warnings} warnings)`);
  });
});

describe("Component Tools", () => {
  it("convex_analyze_components parses convex.config.ts", async () => {
    const tool = componentTools.find((t) => t.name === "convex_analyze_components")!;
    const result = (await tool.handler({ projectDir: PROJECT_DIR })) as any;
    expect(result).toBeDefined();
    expect(result.hasConfig).toBe(true);
    expect(result.totalComponents).toBeGreaterThan(5);
    expect(result.activeComponents).toBeGreaterThan(0);
    console.log(`Components: ${result.totalComponents} total, ${result.activeComponents} active, ${result.conditionalComponents} conditional`);
    console.log(`Component issues: ${result.issues.total}`);
  });
});

describe("HTTP Tools", () => {
  it("convex_analyze_http analyzes http.ts", async () => {
    const tool = httpTools.find((t) => t.name === "convex_analyze_http")!;
    const result = (await tool.handler({ projectDir: PROJECT_DIR })) as any;
    expect(result).toBeDefined();
    // Project may or may not have http.ts
    if (result.hasHttp) {
      expect(result.totalStaticRoutes).toBeGreaterThanOrEqual(0);
      expect(result.issues).toBeDefined();
      expect(result.filesScanned).toBeDefined();
      console.log(`HTTP: ${result.totalStaticRoutes} static routes across ${result.filesScanned.length} files, ${result.compositeRouteSources} composites, CORS: ${result.hasCors}, issues: ${result.issues.total}`);
    } else {
      console.log("HTTP: no http.ts found");
    }
  });
});

describe("Critter Tools", () => {
  it("convex_critter_check scores a well-intentioned task as proceed", async () => {
    const tool = critterTools.find((t) => t.name === "convex_critter_check")!;
    const result: any = await tool.handler({
      task: "Add an index on users.email for the login query",
      why: "The login page takes 3 seconds because we do a full table scan on email lookups",
      who: "End users logging in via the web app — currently 2000 DAU experiencing slow logins",
      success_looks_like: "Login query drops from 3s to under 200ms in the Convex dashboard",
    });
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.verdict).toBe("proceed");
    console.log(`Critter check: score=${result.score}, verdict=${result.verdict}`);
  });

  it("convex_critter_check catches circular reasoning", async () => {
    const tool = critterTools.find((t) => t.name === "convex_critter_check")!;
    const result: any = await tool.handler({
      task: "Add a new table for user preferences",
      why: "We need to add a table for user preferences",
      who: "users",
    });
    expect(result.score).toBeLessThan(70);
    expect(result.feedback.some((f: string) => f.toLowerCase().includes("circular") || f.toLowerCase().includes("vague"))).toBe(true);
    console.log(`Critter check (bad): score=${result.score}, verdict=${result.verdict}`);
  });
});

describe("Tool Count", () => {
  it("has exactly 18 tools", () => {
    const allTools = [
      ...schemaTools,
      ...functionTools,
      ...deploymentTools,
      ...learningTools,
      ...methodologyTools,
      ...integrationBridgeTools,
      ...cronTools,
      ...componentTools,
      ...httpTools,
      ...critterTools,
    ];
    expect(allTools.length).toBe(18);
    console.log(`Total tools: ${allTools.length}`);
    console.log("Tools:", allTools.map((t) => t.name).join(", "));
  });
});

// ── Embedding search A/B ─────────────────────────────────────────────────

import { findToolsWithEmbedding, REGISTRY } from "../tools/toolRegistry.js";
import { isEmbeddingReady, _resetForTesting as resetEmbedding, _setIndexForTesting, _setProviderForTesting } from "../tools/embeddingProvider.js";
import type { EmbeddingProvider } from "../tools/embeddingProvider.js";

describe("Embedding-enhanced tool discovery", () => {
  it("findToolsWithEmbedding returns same as findTools when no provider", async () => {
    resetEmbedding();
    const bm25 = findTools("audit schema");
    const enhanced = await findToolsWithEmbedding("audit schema");
    // Without embeddings, results should be identical
    expect(enhanced.map((r) => r.name)).toEqual(bm25.map((r) => r.name));
  });

  it("findToolsWithEmbedding fuses BM25 + embedding when index is loaded", async () => {
    // Mock embedding index where convex_search_gotchas is closest to "find past mistakes"
    const mockEntries = [
      { name: "convex_audit_schema", nodeType: "tool" as const, vector: new Float32Array([0.1, 0.1, 0.9]) },
      { name: "convex_suggest_indexes", nodeType: "tool" as const, vector: new Float32Array([0.1, 0.1, 0.8]) },
      { name: "convex_check_validator_coverage", nodeType: "tool" as const, vector: new Float32Array([0.1, 0.1, 0.7]) },
      { name: "convex_audit_functions", nodeType: "tool" as const, vector: new Float32Array([0.1, 0.1, 0.6]) },
      { name: "convex_check_function_refs", nodeType: "tool" as const, vector: new Float32Array([0.1, 0.1, 0.5]) },
      { name: "convex_pre_deploy_gate", nodeType: "tool" as const, vector: new Float32Array([0.1, 0.1, 0.4]) },
      { name: "convex_check_env_vars", nodeType: "tool" as const, vector: new Float32Array([0.1, 0.1, 0.3]) },
      { name: "convex_record_gotcha", nodeType: "tool" as const, vector: new Float32Array([0.7, 0.3, 0.0]) },
      { name: "convex_search_gotchas", nodeType: "tool" as const, vector: new Float32Array([0.9, 0.1, 0.0]) },
      { name: "convex_get_methodology", nodeType: "tool" as const, vector: new Float32Array([0.1, 0.1, 0.2]) },
      { name: "convex_discover_tools", nodeType: "tool" as const, vector: new Float32Array([0.1, 0.1, 0.1]) },
      { name: "convex_generate_rules_md", nodeType: "tool" as const, vector: new Float32Array([0.1, 0.1, 0.05]) },
      { name: "convex_snapshot_schema", nodeType: "tool" as const, vector: new Float32Array([0.1, 0.1, 0.04]) },
      { name: "convex_bootstrap_project", nodeType: "tool" as const, vector: new Float32Array([0.1, 0.1, 0.03]) },
      { name: "convex_check_crons", nodeType: "tool" as const, vector: new Float32Array([0.1, 0.1, 0.02]) },
      { name: "convex_analyze_components", nodeType: "tool" as const, vector: new Float32Array([0.1, 0.1, 0.01]) },
      { name: "convex_analyze_http", nodeType: "tool" as const, vector: new Float32Array([0.1, 0.1, 0.005]) },
    ];
    _setIndexForTesting(mockEntries);

    const enhanced = await findToolsWithEmbedding("gotcha");
    const names = enhanced.map((r) => r.name);
    // BM25 already ranks gotcha tools high, but embedding should reinforce them
    expect(names).toContain("convex_search_gotchas");
    expect(names).toContain("convex_record_gotcha");

    resetEmbedding();
  });

  it("bipartite domain expansion surfaces tools from matched domain even without BM25 hit", async () => {
    // Build index where ONLY the "learning" domain node is close — no tool nodes close.
    // The domain expansion loop (lines 430-438) should surface learning tools
    // even though BM25 didn't find them and no tool embedding matched.
    const allToolNames = REGISTRY.map((e) => e.name);
    const categories = [...new Set(REGISTRY.map((e) => e.category))];

    const toolEntries = allToolNames.map((name) => ({
      name,
      nodeType: "tool" as const,
      vector: new Float32Array([0.1, 0.1, 0.8]), // ALL tools distant
    }));

    const domainEntries = categories.map((cat) => ({
      name: `domain:${cat}`,
      nodeType: "domain" as const,
      vector: cat === "learning"
        ? new Float32Array([0.95, 0.05, 0.0])  // Only learning domain close
        : new Float32Array([0.05, 0.05, 0.9]),
    }));

    // Mock provider so embedQuery() returns a vector instead of null
    const mockProvider: EmbeddingProvider = {
      name: "mock",
      dimensions: 3,
      embed: async (texts: string[]) => texts.map(() => new Float32Array([1.0, 0.0, 0.0])),
    };
    _setProviderForTesting(mockProvider);
    _setIndexForTesting([...toolEntries, ...domainEntries]);

    // Use a query with minimal lexical overlap — forces embedding path to matter
    const results = await findToolsWithEmbedding("remember findings insights");
    const learningTools = results.filter((r) => r.category === "learning");

    // Learning tools should appear from domain expansion
    expect(learningTools.length).toBeGreaterThanOrEqual(1);
    // At least one learning tool should be present
    expect(learningTools.some((r) =>
      r.name === "convex_record_gotcha" || r.name === "convex_search_gotchas"
    )).toBe(true);

    resetEmbedding();
  });
});
