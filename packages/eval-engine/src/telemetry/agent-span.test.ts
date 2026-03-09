import { describe, expect, it } from "vitest";

import {
  completeAgentToolSpan,
  createAgentToolSpan,
  instrumentAgentToolExecution,
} from "./agent-span.js";

describe("agent tool span helpers", () => {
  it("creates a span with CAS-hashed monologue and input events", () => {
    const span = createAgentToolSpan({
      traceId: "trace_123",
      parentSpanId: "parent_1",
      agentId: "executor_agent",
      model: "claude-3.5-sonnet",
      serverName: "web_mcp",
      toolName: "click_element",
      authorized: true,
      temporalSignalKey: "payment_api_latency_p95",
      uiSnapshotHash: "ui_hash_1",
      envHash: "env_hash_1",
      monologue: { thought: "I need to click submit." },
      input: { selector: "#submit" },
    });

    expect(span.trace_id).toBe("trace_123");
    expect(span.name).toBe("web_mcp.click_element");
    expect(span.events).toHaveLength(2);
    expect(span.events[0]?.name).toBe("agent.monologue");
    expect(span.events[0]?.attributes["payload.cas_hash"]).toHaveLength(64);
  });

  it("completes a span with output and error status", () => {
    const span = createAgentToolSpan({
      agentId: "executor_agent",
      serverName: "github_mcp",
      toolName: "draft_pr",
      authorized: true,
    });

    completeAgentToolSpan(span, {
      output: { prUrl: "https://github.com/org/repo/pull/1" },
      latencyMs: 123,
      costUsd: 0.02,
    });

    expect(span.status.code).toBe(1);
    expect(span.attributes["metric.latency_ms"]).toBe(123);
    expect(span.events.at(-1)?.name).toBe("tool.output");
  });

  it("wraps async execution and captures output", async () => {
    const { span, output } = await instrumentAgentToolExecution({
      traceId: "trace_456",
      agentId: "planner_agent",
      serverName: "mcp_gateway",
      toolName: "temporal_get_signal",
      authorized: true,
      input: { signalKey: "payment_api_latency_p95" },
      execute: async () => ({ signal: "upward_trend" }),
    });

    expect(output.signal).toBe("upward_trend");
    expect(span.status.code).toBe(1);
    expect(span.events.find((event) => event.name === "tool.output")).toBeTruthy();
  });
});
