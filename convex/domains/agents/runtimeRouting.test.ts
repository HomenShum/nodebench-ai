import { describe, expect, it } from "vitest";
import { chooseNodeBenchRuntimeRoute } from "./runtimeRouting";
import type { UltraLongChatWorkingSet } from "../../../shared/ultraLongChatContext";

function buildWorkingSet(
  overrides: Partial<UltraLongChatWorkingSet> = {},
): UltraLongChatWorkingSet {
  return {
    compactionMode: "deterministic_compaction_first",
    summary: "Compacted session summary",
    priorityLedger: ["Equity upside matters more than base."],
    activeAngles: ["entity_profile"],
    angleCapsules: [],
    jitSlices: [],
    hotWindow: [],
    contextRotRisk: "low",
    messagesCompacted: 8,
    builtAt: Date.now(),
    ...overrides,
  };
}

describe("chooseNodeBenchRuntimeRoute", () => {
  it("routes explicit orchestration prompts to the advisor lane", () => {
    const route = chooseNodeBenchRuntimeRoute({
      prompt: "Plan and orchestrate a deep research run on Stripe.",
      useCoordinator: true,
      workingSet: buildWorkingSet({
        activeAngles: ["entity_profile", "public_signals", "people_graph"],
        messagesCompacted: 10,
      }),
    });

    expect(route.profile).toBe("advisor");
    expect(route.model).toBe("kimi-k2.6");
    expect(route.reason).toBe("explicit_advisor");
  });

  it("routes anonymous turns to the cheapest Gemini 3 executor lane", () => {
    const route = chooseNodeBenchRuntimeRoute({
      prompt: "Summarize this company.",
      isAnonymous: true,
      workingSet: buildWorkingSet(),
    });

    expect(route.profile).toBe("executor");
    expect(route.model).toBe("gemini-3.1-flash-lite-preview");
    expect(route.reason).toBe("anonymous_fast_executor");
  });

  it("routes structured extraction turns to Gemini 3.1 Flash-Lite first", () => {
    const route = chooseNodeBenchRuntimeRoute({
      prompt: "Extract this into JSON fields for the report schema.",
      workingSet: buildWorkingSet({
        activeAngles: ["entity_profile", "document_discovery"],
        jitSlices: [
          {
            label: "cached profile",
            summary: "Entity cache present",
            source: "entity_cache",
            angleIds: ["entity_profile"],
          },
        ],
      }),
    });

    expect(route.profile).toBe("executor");
    expect(route.model).toBe("gemini-3.1-flash-lite-preview");
    expect(route.reason).toBe("structured_executor");
    expect(route.fallbackModels).toContain("minimax-m2.7");
  });

  it("routes tool-heavy execution to Gemini 3 Flash before fallback executors", () => {
    const route = chooseNodeBenchRuntimeRoute({
      prompt: "Use the browser tool and patch the script, then extract the result.",
      hasOpenRouter: true,
      workingSet: buildWorkingSet({
        activeAngles: ["entity_profile", "document_discovery"],
        jitSlices: [
          {
            label: "tool context",
            summary: "Browser path needed",
            source: "known_state",
            angleIds: ["document_discovery"],
          },
        ],
      }),
    });

    expect(route.profile).toBe("executor");
    expect(route.model).toBe("gemini-3-flash-preview");
    expect(route.reason).toBe("tool_heavy_executor");
    expect(route.fallbackModels.slice(0, 3)).toEqual([
      "gemini-3.1-flash-lite-preview",
      "minimax-m2.7",
      "gpt-5.4-mini",
    ]);
  });

  it("escalates heavily compacted multi-angle sessions to the background lane", () => {
    const route = chooseNodeBenchRuntimeRoute({
      prompt: "Give me the final decision brief across all these threads.",
      workingSet: buildWorkingSet({
        activeAngles: [
          "entity_profile",
          "public_signals",
          "people_graph",
          "competitive_intelligence",
        ],
        jitSlices: [
          {
            label: "pulse",
            summary: "Fresh pulse",
            source: "pulse",
            angleIds: ["public_signals"],
          },
          {
            label: "user priorities",
            summary: "Equity, ramp, long-term upside",
            source: "user_context",
            angleIds: ["people_graph", "financial_health"],
          },
        ],
        contextRotRisk: "high",
        messagesCompacted: 28,
      }),
    });

    expect(route.profile).toBe("background");
    expect(route.model).toBe("gemini-3.1-pro-preview");
    expect(route.reason).toBe("background_large_context");
  });
});
