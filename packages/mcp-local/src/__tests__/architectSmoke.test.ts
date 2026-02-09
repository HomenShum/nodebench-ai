/**
 * Smoke test for architect tools — runs all 3 tools against real files.
 */
import { describe, it, expect } from "vitest";
import { architectTools } from "../tools/architectTools.js";
import { resolve } from "node:path";

const callTool = async (name: string, args: any) => {
  const tool = architectTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool.handler(args);
};

// Use a known file in the repo
const FIXTURE_PATH = resolve(import.meta.dirname, "../tools/critterTools.ts");

describe("Architect Tools — Smoke Tests", () => {
  it("scan_capabilities returns structured capability report", async () => {
    const result = (await callTool("scan_capabilities", {
      file_path: FIXTURE_PATH,
    })) as any;

    console.log("scan_capabilities result:", JSON.stringify(result, null, 2));

    // Should have all top-level sections
    expect(result.file).toBeDefined();
    expect(result.file.path).toBe(FIXTURE_PATH);
    expect(result.file.lines).toBeGreaterThan(0);
    expect(result.state_management).toBeDefined();
    expect(result.layout_structure).toBeDefined();
    expect(result.interaction_patterns).toBeDefined();
    expect(result.rendering_capabilities).toBeDefined();
    expect(result.backend_patterns).toBeDefined();
    expect(result.imports).toBeDefined();
    expect(result.exports).toBeDefined();

    // critterTools.ts should have some imports and exports
    expect(result.imports.count).toBeGreaterThan(0);
    expect(result.exports.named_exports).toBeGreaterThan(0);
  });

  it("verify_concept_support detects patterns and persists to SQLite", async () => {
    const result = (await callTool("verify_concept_support", {
      file_path: FIXTURE_PATH,
      concept_name: "SQLite Persistence",
      required_signatures: [
        "getDb",
        "CREATE TABLE",
        "db\\.prepare",
        "McpTool",
      ],
    })) as any;

    console.log("verify_concept_support result:", JSON.stringify(result, null, 2));

    expect(result.concept).toBe("SQLite Persistence");
    expect(result.status).toBe("Fully Implemented");
    expect(result.match_score).toBe("100%");
    expect(result.evidence_found).toHaveLength(4);
    expect(result.gap_analysis).toHaveLength(0);
    expect(result.id).toMatch(/^cv_/);
  });

  it("verify_concept_support reports gaps correctly", async () => {
    const result = (await callTool("verify_concept_support", {
      file_path: FIXTURE_PATH,
      concept_name: "React UI Component",
      required_signatures: [
        "useState",
        "useEffect",
        "return.*<div",
        "export default",
      ],
    })) as any;

    console.log("verify_concept_support (gaps) result:", JSON.stringify(result, null, 2));

    expect(result.status).toBe("Not Implemented");
    expect(result.gap_analysis.length).toBeGreaterThan(0);
    expect(parseInt(result.match_score)).toBeLessThan(50);
  });

  it("generate_implementation_plan builds structured plan", async () => {
    const result = (await callTool("generate_implementation_plan", {
      concept_name: "Dark Mode Toggle",
      missing_signatures: [
        "prefers-color-scheme",
        "theme.*dark",
        "useEffect",
      ],
      current_context: "File has getDb import, McpTool exports, no React hooks",
      target_file: FIXTURE_PATH,
    })) as any;

    console.log("generate_implementation_plan result:", JSON.stringify(result, null, 2));

    expect(result.concept).toBe("Dark Mode Toggle");
    expect(result.total_steps).toBe(3);
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].requirement).toBe("prefers-color-scheme");
    expect(result.steps[0].strategy).toBeTruthy();
    expect(result.workflow).toHaveLength(4);
    expect(result.context_provided).toBe(true);
  });
});
