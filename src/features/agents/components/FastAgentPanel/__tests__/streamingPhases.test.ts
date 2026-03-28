import { describe, expect, it } from "vitest";

import {
  collectStreamingExecutions,
  summarizeStreamingPhases,
} from "../streamingPhases";

describe("collectStreamingExecutions", () => {
  it("merges tool-call and tool-result parts into one execution", () => {
    const executions = collectStreamingExecutions([
      { type: "tool-call", toolName: "fusionSearch", toolCallId: "call_1" },
      { type: "tool-result", toolName: "fusionSearch", toolCallId: "call_1" },
    ]);

    expect(executions).toHaveLength(1);
    expect(executions[0]?.toolName).toBe("fusionSearch");
    expect(executions[0]?.status).toBe("complete");
  });
});

describe("summarizeStreamingPhases", () => {
  it("marks gather as active while a search tool is running", () => {
    const summary = summarizeStreamingPhases({
      parts: [{ type: "tool-call", toolName: "fusionSearch", toolCallId: "call_1" }],
      isStreaming: true,
      tokensPerSecond: 22,
      runtimeSeconds: 1.4,
    });

    expect(summary?.activePhaseId).toBe("gather");
    expect(summary?.headline).toContain("Gathering evidence");
    expect(summary?.detail).toContain("0/1 tool steps");
  });

  it("moves to deliver once text is present and streaming is done", () => {
    const summary = summarizeStreamingPhases({
      parts: [
        { type: "tool-call", toolName: "fusionSearch", toolCallId: "call_1" },
        { type: "tool-result", toolName: "fusionSearch", toolCallId: "call_1" },
        { type: "reasoning", text: "Comparing sources" },
      ],
      messageText: "Here is the final answer.",
      isStreaming: false,
    });

    expect(summary?.activePhaseId).toBe("deliver");
    expect(summary?.phases.find((phase) => phase.id === "deliver")?.status).toBe("active");
    expect(summary?.headline).toBe("Answer ready");
  });
});
