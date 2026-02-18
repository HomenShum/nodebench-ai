/**
 * webmcpTools.test.ts — Tests for WebMCP Bridge consumer tools
 *
 * Validates the 6 webmcp tools: connect_webmcp_origin, list_webmcp_tools,
 * call_webmcp_tool, disconnect_webmcp_origin, scan_webmcp_origin, check_webmcp_setup
 */

import { describe, it, expect, afterEach } from "vitest";
import { webmcpTools, _resetConnectionsForTesting } from "../tools/webmcpTools.js";
import { TOOL_REGISTRY, WORKFLOW_CHAINS, getToolComplexity } from "../tools/toolRegistry.js";
import type { McpTool } from "../types.js";

const findTool = (name: string): McpTool =>
  webmcpTools.find((t) => t.name === name)!;

const WEBMCP_TOOL_NAMES = [
  "connect_webmcp_origin",
  "list_webmcp_tools",
  "call_webmcp_tool",
  "disconnect_webmcp_origin",
  "scan_webmcp_origin",
  "check_webmcp_setup",
] as const;

afterEach(() => {
  _resetConnectionsForTesting();
});

// ═══════════════════════════════════════════════════════════════════════════
// Static: tool existence and structure
// ═══════════════════════════════════════════════════════════════════════════

describe("WebMCP: tool structure", () => {
  it("exports 6 tools", () => {
    expect(webmcpTools.length).toBe(6);
  });

  it("all 6 webmcp tools exist", () => {
    for (const name of WEBMCP_TOOL_NAMES) {
      const tool = findTool(name);
      expect(tool, `Missing tool: ${name}`).toBeDefined();
    }
  });

  it("each tool has name, description, inputSchema, handler", () => {
    for (const name of WEBMCP_TOOL_NAMES) {
      const tool = findTool(name);
      expect(typeof tool.name).toBe("string");
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
      expect(typeof tool.handler).toBe("function");
    }
  });

  it("each tool has a toolRegistry entry with category=webmcp", () => {
    for (const name of WEBMCP_TOOL_NAMES) {
      const entry = TOOL_REGISTRY.get(name);
      expect(entry, `Missing registry entry for ${name}`).toBeDefined();
      expect(entry!.category).toBe("webmcp");
      expect(entry!.phase).toBeTruthy();
      expect(entry!.tags.length).toBeGreaterThan(0);
    }
  });

  it("each tool has a valid complexity rating", () => {
    for (const name of WEBMCP_TOOL_NAMES) {
      const complexity = getToolComplexity(name);
      expect(["low", "medium", "high"]).toContain(complexity);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Schema validation
// ═══════════════════════════════════════════════════════════════════════════

describe("WebMCP: input schemas", () => {
  it("connect_webmcp_origin requires url", () => {
    const tool = findTool("connect_webmcp_origin");
    expect(tool.inputSchema.required).toContain("url");
    expect((tool.inputSchema.properties as any).url).toBeDefined();
    expect((tool.inputSchema.properties as any).url.type).toBe("string");
  });

  it("connect_webmcp_origin has optional label, headless, waitMs", () => {
    const tool = findTool("connect_webmcp_origin");
    const props = tool.inputSchema.properties as any;
    expect(props.label).toBeDefined();
    expect(props.headless).toBeDefined();
    expect(props.waitMs).toBeDefined();
    expect(tool.inputSchema.required).not.toContain("label");
  });

  it("call_webmcp_tool requires origin + tool", () => {
    const tool = findTool("call_webmcp_tool");
    expect(tool.inputSchema.required).toContain("origin");
    expect(tool.inputSchema.required).toContain("tool");
  });

  it("scan_webmcp_origin requires url", () => {
    const tool = findTool("scan_webmcp_origin");
    expect(tool.inputSchema.required).toContain("url");
  });

  it("list_webmcp_tools has no required fields", () => {
    const tool = findTool("list_webmcp_tools");
    expect(tool.inputSchema.required || []).toEqual([]);
  });

  it("disconnect_webmcp_origin has no required fields", () => {
    const tool = findTool("disconnect_webmcp_origin");
    expect(tool.inputSchema.required ?? []).toEqual([]);
  });

  it("check_webmcp_setup has no required fields", () => {
    const tool = findTool("check_webmcp_setup");
    expect(tool.inputSchema.required ?? []).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Handler behavior (no live browser — tests URL validation and error paths)
// ═══════════════════════════════════════════════════════════════════════════

describe("WebMCP: handler behavior", () => {
  it("connect_webmcp_origin rejects non-HTTPS URLs", async () => {
    const tool = findTool("connect_webmcp_origin");
    const result = (await tool.handler({ url: "http://example.com" })) as any;
    expect(result.success).toBe(false);
    expect(result.message).toContain("HTTPS");
  });

  it("connect_webmcp_origin rejects localhost", async () => {
    const tool = findTool("connect_webmcp_origin");
    const result = (await tool.handler({ url: "https://localhost:3000" })) as any;
    expect(result.success).toBe(false);
    expect(result.message).toContain("loopback");
  });

  it("connect_webmcp_origin rejects private IPs", async () => {
    const tool = findTool("connect_webmcp_origin");
    const result = (await tool.handler({ url: "https://192.168.1.1" })) as any;
    expect(result.success).toBe(false);
    expect(result.message).toContain("private");
  });

  it("call_webmcp_tool returns error when not connected", async () => {
    const tool = findTool("call_webmcp_tool");
    const result = (await tool.handler({
      origin: "https://example.com",
      tool: "some_tool",
    })) as any;
    expect(result.success).toBe(false);
    expect(result.error).toBe(true);
    expect(result.message).toContain("not connected");
  });

  it("disconnect_webmcp_origin handles missing connection gracefully", async () => {
    const tool = findTool("disconnect_webmcp_origin");
    const result = (await tool.handler({
      origin: "https://nonexistent.example.com",
    })) as any;
    expect(result.success).toBe(true);
    expect(result.message).toContain("was not connected");
  });

  it("disconnect_webmcp_origin handles disconnect-all when empty", async () => {
    const tool = findTool("disconnect_webmcp_origin");
    const result = (await tool.handler({})) as any;
    expect(result.success).toBe(true);
    expect(result.disconnectedAll).toBe(true);
  });

  it("scan_webmcp_origin validates URL", async () => {
    const tool = findTool("scan_webmcp_origin");
    const result = (await tool.handler({ url: "http://insecure.example.com" })) as any;
    expect(result.success).toBe(false);
    expect(result.message).toContain("HTTPS");
  });

  it("check_webmcp_setup returns status object", async () => {
    const tool = findTool("check_webmcp_setup");
    const result = (await tool.handler({})) as any;
    expect(result.success).toBe(true);
    expect(result.playwright).toBeDefined();
    expect(typeof result.playwright.installed).toBe("boolean");
    expect(typeof result.ready).toBe("boolean");
    expect(result.quickRef).toBeDefined();
    expect(result.quickRef.methodology).toBe("webmcp_discovery");
  });

  it("list_webmcp_tools returns empty when no connections", async () => {
    const tool = findTool("list_webmcp_tools");
    const result = (await tool.handler({})) as any;
    expect(result.success).toBe(true);
    expect(result.connected).toBe(false);
    expect(result.message).toContain("No WebMCP origins connected");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Registry: workflow chain
// ═══════════════════════════════════════════════════════════════════════════

describe("WebMCP: workflow chain", () => {
  it("webmcp_discovery workflow chain exists", () => {
    expect(WORKFLOW_CHAINS.webmcp_discovery).toBeDefined();
  });

  it("webmcp_discovery workflow has correct structure", () => {
    const chain = WORKFLOW_CHAINS.webmcp_discovery;
    expect(chain.description).toBeTruthy();
    expect(chain.steps.length).toBeGreaterThan(0);

    for (const step of chain.steps) {
      expect(step.tool).toBeTruthy();
      expect(step.action).toBeTruthy();
    }
  });

  it("webmcp_discovery workflow references valid tools", () => {
    const chain = WORKFLOW_CHAINS.webmcp_discovery;
    for (const step of chain.steps) {
      const tool = findTool(step.tool);
      expect(tool, `Workflow references missing tool: ${step.tool}`).toBeDefined();
    }
  });
});
