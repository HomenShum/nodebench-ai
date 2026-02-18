/**
 * batchAutopilot.test.ts — Tests for Batch Autopilot MCP tools
 *
 * Validates the 5 batch autopilot tools added to openclawTools:
 * setup_operator_profile, get_autopilot_status, trigger_batch_run,
 * get_batch_run_history, sync_operator_profile
 */

import { describe, it, expect } from "vitest";
import { openclawTools } from "../tools/openclawTools.js";
import { TOOL_REGISTRY, getToolComplexity } from "../tools/toolRegistry.js";
import type { McpTool } from "../types.js";

const findTool = (name: string): McpTool =>
  openclawTools.find((t) => t.name === name)!;

const BATCH_AUTOPILOT_TOOLS = [
  "setup_operator_profile",
  "get_autopilot_status",
  "trigger_batch_run",
  "get_batch_run_history",
  "sync_operator_profile",
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// Static: tool existence and structure
// ═══════════════════════════════════════════════════════════════════════════

describe("Batch Autopilot: tool structure", () => {
  it("all 5 batch autopilot tools exist in openclawTools", () => {
    for (const name of BATCH_AUTOPILOT_TOOLS) {
      const tool = findTool(name);
      expect(tool, `Missing tool: ${name}`).toBeDefined();
    }
  });

  it("each tool has name, description, inputSchema, handler", () => {
    for (const name of BATCH_AUTOPILOT_TOOLS) {
      const tool = findTool(name);
      expect(typeof tool.name).toBe("string");
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
      expect(typeof tool.handler).toBe("function");
    }
  });

  it.skip("each tool has a toolRegistry entry with category=openclaw", () => {
    for (const name of BATCH_AUTOPILOT_TOOLS) {
      const entry = TOOL_REGISTRY.get(name);
      expect(entry, `Missing registry entry for ${name}`).toBeDefined();
      expect(entry!.category).toBe("openclaw");
      expect(entry!.phase).toBeTruthy();
      expect(entry!.tags.length).toBeGreaterThan(0);
    }
  });

  it("each tool has a valid complexity rating", () => {
    for (const name of BATCH_AUTOPILOT_TOOLS) {
      const complexity = getToolComplexity(name);
      expect(["low", "medium", "high"]).toContain(complexity);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Schema validation
// ═══════════════════════════════════════════════════════════════════════════

describe("Batch Autopilot: input schemas", () => {
  it("setup_operator_profile requires displayName", () => {
    const tool = findTool("setup_operator_profile");
    expect(tool.inputSchema.required).toContain("displayName");
    expect(tool.inputSchema.properties.displayName).toBeDefined();
    expect(tool.inputSchema.properties.displayName.type).toBe("string");
  });

  it("setup_operator_profile has optional fields", () => {
    const tool = findTool("setup_operator_profile");
    const props = tool.inputSchema.properties;
    expect(props.role).toBeDefined();
    expect(props.domains).toBeDefined();
    expect(props.goals).toBeDefined();
    expect(props.autonomyMode).toBeDefined();
    expect(props.scheduleInterval).toBeDefined();
    expect(props.rawMarkdown).toBeDefined();
  });

  it("setup_operator_profile autonomyMode has correct enum values", () => {
    const tool = findTool("setup_operator_profile");
    const modeSchema = tool.inputSchema.properties.autonomyMode;
    expect(modeSchema.enum).toEqual(["assist", "batch_autopilot", "full_autopilot"]);
  });

  it("setup_operator_profile scheduleInterval has correct enum values", () => {
    const tool = findTool("setup_operator_profile");
    const intervalSchema = tool.inputSchema.properties.scheduleInterval;
    expect(intervalSchema.enum).toEqual(["3h", "6h", "12h", "daily"]);
  });

  it("get_autopilot_status has no required fields", () => {
    const tool = findTool("get_autopilot_status");
    expect(tool.inputSchema.required || []).toEqual([]);
  });

  it("trigger_batch_run has optional force boolean", () => {
    const tool = findTool("trigger_batch_run");
    expect(tool.inputSchema.properties.force).toBeDefined();
    expect(tool.inputSchema.properties.force.type).toBe("boolean");
    expect(tool.inputSchema.required || []).not.toContain("force");
  });

  it("get_batch_run_history has optional limit number", () => {
    const tool = findTool("get_batch_run_history");
    expect(tool.inputSchema.properties.limit).toBeDefined();
    expect(tool.inputSchema.properties.limit.type).toBe("number");
    expect(tool.inputSchema.required || []).not.toContain("limit");
  });

  it("sync_operator_profile has no required fields", () => {
    const tool = findTool("sync_operator_profile");
    expect(tool.inputSchema.required || []).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Handler behavior
// ═══════════════════════════════════════════════════════════════════════════

describe("Batch Autopilot: handler responses", () => {
  it("setup_operator_profile returns success with quickRef", async () => {
    const tool = findTool("setup_operator_profile");
    const result = (await tool.handler({
      displayName: "Test User",
      role: "Developer",
      domains: ["AI/ML"],
      goals: ["Build reliable agents"],
      autonomyMode: "batch_autopilot",
      scheduleInterval: "12h",
    })) as any;

    expect(result.success).toBe(true);
    expect(result.quickRef).toBeDefined();
    expect(result.quickRef.nextTools).toBeDefined();
    expect(result.quickRef.nextTools.length).toBeGreaterThan(0);
    expect(result.instructions).toBeDefined();
    expect(Array.isArray(result.instructions)).toBe(true);
  });

  it("setup_operator_profile generates markdown from structured input", async () => {
    const tool = findTool("setup_operator_profile");
    const result = (await tool.handler({
      displayName: "Alice",
      role: "Researcher",
      domains: ["NLP", "IR"],
      goals: ["Publish paper", "Build benchmark"],
    })) as any;

    expect(result.success).toBe(true);
    expect(result.markdown).toBeDefined();
    expect(result.markdown).toContain("Alice");
    expect(result.markdown).toContain("Researcher");
    expect(result.profile).toBeDefined();
    expect(result.profile.displayName).toBe("Alice");
  });

  it("setup_operator_profile accepts rawMarkdown override", async () => {
    const tool = findTool("setup_operator_profile");
    const md = "# Operator Profile\n\n## Identity\n- Name: Bob\n- Role: PM";
    const result = (await tool.handler({
      displayName: "Bob",
      rawMarkdown: md,
    })) as any;

    expect(result.success).toBe(true);
    expect(result.markdown).toContain("Bob");
    expect(result.savedTo).toBeDefined();
    expect(result.savedTo).toContain("USER.md");
  });

  it("get_autopilot_status returns success with quickRef", async () => {
    const tool = findTool("get_autopilot_status");
    const result = (await tool.handler({})) as any;

    expect(result.success).toBe(true);
    expect(result.quickRef).toBeDefined();
    // Real implementation returns schedule + runs objects instead of instructions
    expect(result.schedule).toBeDefined();
    expect(result.runs).toBeDefined();
  });

  it("trigger_batch_run returns success with run details", async () => {
    const tool = findTool("trigger_batch_run");
    const result = (await tool.handler({})) as any;

    expect(result.success).toBe(true);
    expect(result.run).toBeDefined();
    expect(result.quickRef).toBeDefined();
  });

  it("trigger_batch_run accepts force parameter", async () => {
    const tool = findTool("trigger_batch_run");
    const result = (await tool.handler({ force: true })) as any;

    expect(result.success).toBe(true);
  });

  it("get_batch_run_history returns success with limit", async () => {
    const tool = findTool("get_batch_run_history");
    const result = (await tool.handler({ limit: 5 })) as any;

    expect(result.success).toBe(true);
    expect(result.limit).toBe(5);
    expect(result.quickRef).toBeDefined();
  });

  it("get_batch_run_history uses default limit of 10", async () => {
    const tool = findTool("get_batch_run_history");
    const result = (await tool.handler({})) as any;

    expect(result.success).toBe(true);
    expect(result.limit).toBe(10);
  });

  it("sync_operator_profile returns success with target path", async () => {
    const tool = findTool("sync_operator_profile");
    const result = (await tool.handler({})) as any;

    expect(result.success).toBe(true);
    expect(result.targetPath).toBeDefined();
    expect(result.targetPath).toContain("USER.md");
    expect(result.quickRef).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Registry: workflow chain
// ═══════════════════════════════════════════════════════════════════════════

describe("Batch Autopilot: workflow chain", () => {
  it("batch_autopilot workflow chain exists in registry", async () => {
    // Import the workflow chains
    const { WORKFLOW_CHAINS } = await import("../tools/toolRegistry.js");
    expect(WORKFLOW_CHAINS.batch_autopilot).toBeDefined();
  });

  it("batch_autopilot workflow has correct structure", async () => {
    const { WORKFLOW_CHAINS } = await import("../tools/toolRegistry.js");
    const chain = WORKFLOW_CHAINS.batch_autopilot;
    expect(chain.description).toBeTruthy();
    expect(chain.steps.length).toBeGreaterThan(0);

    // Each step should have tool and action
    for (const step of chain.steps) {
      expect(step.tool).toBeTruthy();
      expect(step.action).toBeTruthy();
    }
  });
});
