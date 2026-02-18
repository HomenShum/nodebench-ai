/**
 * OpenClaw Messaging Integration Tests
 *
 * Tests the 5 new messaging tools added to openclawTools.ts (domain: openclaw).
 * Validates return shapes, required fields, and workflow chains.
 *
 * Tools tested:
 * 1. list_openclaw_channels — List native + OpenClaw Gateway channels
 * 2. send_openclaw_message — Send message through outbound pipeline
 * 3. get_openclaw_delivery_status — Check delivery status
 * 4. configure_channel_preferences — Set user fallback chain
 * 5. get_messaging_health — Per-provider health diagnostics
 */

import { describe, it, expect } from "vitest";
import { openclawTools } from "../tools/openclawTools.js";

// Helper: find tool by name
function findTool(name: string) {
  const tool = openclawTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

describe("OpenClaw Messaging Tools", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL EXISTENCE
  // ═══════════════════════════════════════════════════════════════════════════

  it("openclaw domain should have 17 tools (7 sandbox + 5 messaging + 5 autopilot/operator)", () => {
    expect(openclawTools.length).toBe(17);
  });

  it("all 5 messaging tools should exist", () => {
    const messagingToolNames = [
      "list_openclaw_channels",
      "send_openclaw_message",
      "get_openclaw_delivery_status",
      "configure_channel_preferences",
      "get_messaging_health",
    ];

    for (const name of messagingToolNames) {
      const tool = openclawTools.find((t) => t.name === name);
      expect(tool, `Missing tool: ${name}`).toBeDefined();
      expect(tool!.handler).toBeTypeOf("function");
      expect(tool!.inputSchema).toBeDefined();
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // list_openclaw_channels
  // ═══════════════════════════════════════════════════════════════════════════

  describe("list_openclaw_channels", () => {
    it("should return OpenClaw channels by default", async () => {
      const tool = findTool("list_openclaw_channels");
      const result: any = await tool.handler({});

      expect(result.channels).toBeDefined();
      expect(Array.isArray(result.channels)).toBe(true);
      expect(result.totalChannels).toBe(6); // 6 OpenClaw channels
      expect(result.gatewayUrl).toContain("127.0.0.1");
      expect(result.quickRef).toBeDefined();
      expect(result.quickRef.nextTools).toContain("send_openclaw_message");

      // Verify OpenClaw channel IDs
      const channelIds = result.channels.map((c: any) => c.channelId);
      expect(channelIds).toContain("whatsapp");
      expect(channelIds).toContain("signal");
      expect(channelIds).toContain("matrix");
    });

    it("should include native channels when includeNative=true", async () => {
      const tool = findTool("list_openclaw_channels");
      const result: any = await tool.handler({ includeNative: true });

      expect(result.totalChannels).toBe(13); // 6 OpenClaw + 7 native
      const channelIds = result.channels.map((c: any) => c.channelId);
      expect(channelIds).toContain("ntfy");
      expect(channelIds).toContain("email");
      expect(channelIds).toContain("sms");
      expect(channelIds).toContain("ui");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // send_openclaw_message
  // ═══════════════════════════════════════════════════════════════════════════

  describe("send_openclaw_message", () => {
    it("should queue a message for delivery", async () => {
      const tool = findTool("send_openclaw_message");
      const result: any = await tool.handler({
        channelId: "whatsapp",
        recipient: "agent:main:whatsapp:dm:+15555550123",
        text: "Hello from NodeBench!",
        urgency: "normal",
      });

      expect(result.success).toBe(true);
      expect(result.channelId).toBe("whatsapp");
      expect(result.status).toBe("queued");
      expect(result.textPreview).toContain("Hello from NodeBench!");
      expect(result.quickRef.nextTools).toContain("get_openclaw_delivery_status");
    });

    it("should truncate long text in preview", async () => {
      const tool = findTool("send_openclaw_message");
      const longText = "A".repeat(200);
      const result: any = await tool.handler({
        channelId: "email",
        recipient: "user@example.com",
        text: longText,
      });

      expect(result.textPreview.length).toBeLessThanOrEqual(83); // 80 chars + "..."
      expect(result.textPreview).toContain("...");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // get_openclaw_delivery_status
  // ═══════════════════════════════════════════════════════════════════════════

  describe("get_openclaw_delivery_status", () => {
    it("should return delivery status with defaults", async () => {
      const tool = findTool("get_openclaw_delivery_status");
      const result: any = await tool.handler({});

      expect(result.traceId).toBe("latest");
      expect(result.deliveries).toBeDefined();
      expect(Array.isArray(result.deliveries)).toBe(true);
      expect(result.totalDeliveries).toBe(0); // No real deliveries in test
      expect(result.quickRef).toBeDefined();
    });

    it("should accept traceId and channelId filters", async () => {
      const tool = findTool("get_openclaw_delivery_status");
      const result: any = await tool.handler({
        traceId: "trace-12345",
        channelId: "telegram",
      });

      expect(result.traceId).toBe("trace-12345");
      expect(result.filters.channelId).toBe("telegram");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // configure_channel_preferences
  // ═══════════════════════════════════════════════════════════════════════════

  describe("configure_channel_preferences", () => {
    it("should save preference chain", async () => {
      const tool = findTool("configure_channel_preferences");
      const result: any = await tool.handler({
        preferredChannels: ["whatsapp", "telegram", "email"],
        channelConfigs: [
          { channelId: "whatsapp", enabled: true, identifier: "+15555550123", optedIn: true },
          { channelId: "telegram", enabled: true, identifier: "123456789", optedIn: true },
          { channelId: "email", enabled: true, identifier: "user@example.com", optedIn: true },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.preferredChannels).toEqual(["whatsapp", "telegram", "email"]);
      expect(result.configuredChannels).toBe(3);
      expect(result.status).toBe("preferences_saved");
      expect(result.quickRef.nextTools).toContain("send_openclaw_message");
    });

    it("should handle empty configs", async () => {
      const tool = findTool("configure_channel_preferences");
      const result: any = await tool.handler({
        preferredChannels: ["ui"],
      });

      expect(result.success).toBe(true);
      expect(result.configuredChannels).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // get_messaging_health
  // ═══════════════════════════════════════════════════════════════════════════

  describe("get_messaging_health", () => {
    it("should return all 13 provider statuses", async () => {
      const tool = findTool("get_messaging_health");
      const result: any = await tool.handler({});

      expect(result.providers).toBeDefined();
      expect(result.totalProviders).toBe(13); // 7 native + 6 OpenClaw
      expect(result.nativeAvailable).toBeGreaterThanOrEqual(2); // ui + ntfy always available
      expect(result.openclawAvailable).toBe(0); // No Gateway in test env
    });

    it("should filter by channelId", async () => {
      const tool = findTool("get_messaging_health");
      const result: any = await tool.handler({ channelId: "whatsapp" });

      expect(result.totalProviders).toBe(1);
      expect(result.providers[0].channelId).toBe("whatsapp");
      expect(result.providers[0].providerType).toBe("openclaw");
    });

    it("should include UI as always available", async () => {
      const tool = findTool("get_messaging_health");
      const result: any = await tool.handler({ channelId: "ui" });

      expect(result.providers[0].available).toBe(true);
      expect(result.providers[0].displayName).toBe("In-App UI");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFLOW INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Workflow: send → check status", () => {
    it("should complete send → status check flow", async () => {
      // Step 1: Send
      const sendTool = findTool("send_openclaw_message");
      const sendResult: any = await sendTool.handler({
        channelId: "slack",
        recipient: "#general",
        text: "Test notification from messaging pipeline",
        subject: "Pipeline Test",
        urgency: "low",
      });
      expect(sendResult.success).toBe(true);

      // Step 2: Check status
      const statusTool = findTool("get_openclaw_delivery_status");
      const statusResult: any = await statusTool.handler({});
      expect(statusResult.deliveries).toBeDefined();
    });
  });

  describe("Workflow: channels → health → configure → send", () => {
    it("should complete full messaging setup flow", async () => {
      // Step 1: List channels
      const listTool = findTool("list_openclaw_channels");
      const listResult: any = await listTool.handler({ includeNative: true });
      expect(listResult.totalChannels).toBe(13);

      // Step 2: Check health
      const healthTool = findTool("get_messaging_health");
      const healthResult: any = await healthTool.handler({});
      expect(healthResult.totalProviders).toBe(13);

      // Step 3: Configure preferences
      const configTool = findTool("configure_channel_preferences");
      const configResult: any = await configTool.handler({
        preferredChannels: ["ui", "ntfy"],
      });
      expect(configResult.success).toBe(true);

      // Step 4: Send
      const sendTool = findTool("send_openclaw_message");
      const sendResult: any = await sendTool.handler({
        channelId: "ntfy",
        recipient: "nodebench",
        text: "Integration test passed!",
        urgency: "low",
      });
      expect(sendResult.success).toBe(true);
    });
  });
});
