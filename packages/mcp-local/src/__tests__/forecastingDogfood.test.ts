/**
 * Forecasting OS — Integration Tests (Dogfood)
 *
 * Full lifecycle tests: create → evidence → update → resolve → track record → calibration.
 * Uses MCP tools directly (SQLite-backed, no Convex dependency).
 *
 * Run: npx vitest run src/__tests__/forecastingDogfood.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { forecastingTools } from "../tools/forecastingTools.js";
import type { McpTool } from "../types.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

const toolMap = new Map<string, McpTool>(
  forecastingTools.map((t) => [t.name, t])
);

async function callTool(
  name: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const tool = toolMap.get(name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  const result = await tool.handler(args);
  const text = result.find((r) => r.type === "text")?.text;
  if (!text) throw new Error(`Tool ${name} returned no text`);
  return JSON.parse(text);
}

// ─── Tool Structure ─────────────────────────────────────────────────────────

describe("Forecasting tools: structure", () => {
  it("should have 9 tools", () => {
    expect(forecastingTools.length).toBe(9);
  });

  it("every tool has name, description, inputSchema, handler", () => {
    for (const tool of forecastingTools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(typeof tool.handler).toBe("function");
    }
  });

  it("tool names match expected list", () => {
    const names = forecastingTools.map((t) => t.name).sort();
    expect(names).toEqual([
      "add_forecast_evidence",
      "compute_calibration",
      "create_forecast",
      "get_active_forecasts",
      "get_forecast_chain",
      "get_forecast_evidence",
      "get_forecast_track_record",
      "resolve_forecast",
      "update_forecast_probability",
    ]);
  });
});

// ─── Full Lifecycle ─────────────────────────────────────────────────────────

describe("Forecasting lifecycle", () => {
  let forecastId: string;

  it("create_forecast — creates a binary forecast", async () => {
    const result = await callTool("create_forecast", {
      question: "Will GPT-5 be released by 2026-12-31?",
      forecastType: "binary",
      resolutionDate: "2026-12-31",
      resolutionCriteria: "OpenAI announces GPT-5 on official blog or press release",
      probability: 0.5,
      baseRate: 0.6,
      refreshFrequency: "weekly",
      topDrivers: ["Historical 18-month release cadence", "Sam Altman interview hints"],
      topCounterarguments: ["No official roadmap published"],
      tags: ["ai_tech"],
    });

    expect(result.forecastId).toBeTruthy();
    expect(result.status).toBe("active");
    expect(result.probability).toBe(0.5);
    forecastId = result.forecastId as string;
  });

  it("add_forecast_evidence — adds supporting evidence", async () => {
    const result = await callTool("add_forecast_evidence", {
      forecastId,
      sourceUrl: "https://example.com/sam-altman-interview",
      sourceTitle: "Sam Altman Interview on AI Progress",
      sourceType: "news",
      excerpt: "Altman hints at a major model release in the second half of 2026",
      signal: "supporting",
      impactOnProbability: 0.1,
    });

    expect(result.evidenceId).toBeTruthy();
    expect(result.signal).toBe("supporting");
  });

  it("add_forecast_evidence — adds disconfirming evidence", async () => {
    const result = await callTool("add_forecast_evidence", {
      forecastId,
      sourceUrl: "https://example.com/compute-shortage",
      sourceTitle: "GPU Shortage Report Q1 2026",
      sourceType: "filing",
      excerpt: "Major cloud providers report 40% compute capacity shortfall for large model training",
      signal: "disconfirming",
    });

    expect(result.evidenceId).toBeTruthy();
    expect(result.signal).toBe("disconfirming");
  });

  it("add_forecast_evidence — deduplicates by URL", async () => {
    const result = await callTool("add_forecast_evidence", {
      forecastId,
      sourceUrl: "https://example.com/sam-altman-interview",
      sourceTitle: "Duplicate",
      sourceType: "news",
      excerpt: "Duplicate entry",
      signal: "supporting",
    });

    expect(result.error).toContain("already exists");
  });

  it("get_forecast_evidence — returns evidence", async () => {
    const result = await callTool("get_forecast_evidence", {
      forecastId,
    });

    expect(result.count).toBe(2);
    expect((result.evidence as unknown[]).length).toBe(2);
  });

  it("get_forecast_evidence — filters by signal", async () => {
    const result = await callTool("get_forecast_evidence", {
      forecastId,
      signal: "supporting",
    });

    expect(result.count).toBe(1);
  });

  it("update_forecast_probability — updates with reasoning", async () => {
    const result = await callTool("update_forecast_probability", {
      forecastId,
      probability: 0.65,
      topDrivers: [
        "Sam Altman interview hint",
        "Historical 18-month cadence",
        "Competitor pressure from Google Gemini",
      ],
      topCounterarguments: [
        "GPU shortage may delay training",
        "No official roadmap",
      ],
      reasoning: "Soft leadership signal + historical pattern outweigh compute concerns",
    });

    expect(result.previousProbability).toBe(0.5);
    expect(result.newProbability).toBe(0.65);
    expect(result.diff).toBe("50% → 65% (+15pp)");
  });

  it("update_forecast_probability — validates range", async () => {
    const result = await callTool("update_forecast_probability", {
      forecastId,
      probability: 1.5,
      reasoning: "Invalid",
    });

    expect(result.error).toContain("between 0 and 1");
  });

  it("get_forecast_chain — returns full audit trail", async () => {
    const result = await callTool("get_forecast_chain", {
      forecastId,
    });

    expect(result.forecast).toBeTruthy();
    expect((result.evidence as unknown[]).length).toBe(2);
    expect((result.updateHistory as unknown[]).length).toBe(1);
    expect(result.resolution).toBeNull();
    expect((result.summary as Record<string, unknown>).evidenceCount).toBe(2);
    expect((result.summary as Record<string, unknown>).updateCount).toBe(1);
    expect((result.summary as Record<string, unknown>).isResolved).toBe(false);
  });

  it("get_active_forecasts — lists active forecasts", async () => {
    const result = await callTool("get_active_forecasts", {});

    expect(result.count).toBeGreaterThanOrEqual(1);
    const forecasts = result.forecasts as Array<Record<string, unknown>>;
    const found = forecasts.find((f) => f.id === forecastId);
    expect(found).toBeTruthy();
    expect(found?.status).toBe("active");
  });

  it("resolve_forecast — resolves with Brier score", async () => {
    const result = await callTool("resolve_forecast", {
      forecastId,
      outcome: "yes",
      resolutionNotes: "GPT-5 announced on 2026-11-15 via OpenAI blog post",
      resolutionSourceUrl: "https://openai.com/gpt-5-announcement",
    });

    expect(result.status).toBe("resolved");
    expect(result.outcome).toBe("yes");
    // Brier: (0.65 - 1)^2 = 0.1225
    expect(result.brierScore).toBeCloseTo(0.1225, 3);
    // Log: -log(0.65) ≈ 0.431
    expect(result.logScore).toBeCloseTo(0.431, 2);
  });

  it("resolve_forecast — cannot resolve twice", async () => {
    const result = await callTool("resolve_forecast", {
      forecastId,
      outcome: "no",
      resolutionNotes: "Already resolved",
    });

    expect(result.error).toContain("already resolved");
  });

  it("get_forecast_track_record — shows Brier aggregate", async () => {
    const result = await callTool("get_forecast_track_record", {});

    expect(result.scoredCount).toBeGreaterThanOrEqual(1);
    // SQLite persists between test runs, so overallBrier is average across ALL
    // resolved forecasts (not just this run). Use a reasonable bound instead.
    expect(result.overallBrier as number).toBeGreaterThan(0);
    expect(result.overallBrier as number).toBeLessThan(0.5);
  });
});

// ─── Multi-Forecast Calibration ─────────────────────────────────────────────

describe("Forecasting calibration", () => {
  beforeAll(async () => {
    // Create and resolve 5 forecasts with known outcomes for calibration
    const scenarios = [
      { probability: 0.9, outcome: "yes" },   // Brier: 0.01
      { probability: 0.8, outcome: "yes" },   // Brier: 0.04
      { probability: 0.3, outcome: "no" },    // Brier: 0.09
      { probability: 0.1, outcome: "no" },    // Brier: 0.01
      { probability: 0.6, outcome: "yes" },   // Brier: 0.16
    ];

    for (let i = 0; i < scenarios.length; i++) {
      const create = await callTool("create_forecast", {
        question: `Calibration test forecast ${i + 1}?`,
        resolutionDate: "2026-01-01",
        resolutionCriteria: `Test criteria ${i + 1}`,
        probability: scenarios[i].probability,
        tags: ["test_calibration"],
      });

      await callTool("resolve_forecast", {
        forecastId: (create as Record<string, unknown>).forecastId,
        outcome: scenarios[i].outcome,
        resolutionNotes: `Test resolution ${i + 1}`,
      });
    }
  });

  it("compute_calibration — returns 10 bins", async () => {
    const result = await callTool("compute_calibration", {});

    expect(result.bins).toBeTruthy();
    expect((result.bins as unknown[]).length).toBe(10);
    expect(result.overallBrier).toBeTruthy();
    expect(typeof result.overallBrier).toBe("number");
    expect(result.forecastCount).toBeGreaterThanOrEqual(5);
  });

  it("get_forecast_track_record — aggregate includes all resolved", async () => {
    const result = await callTool("get_forecast_track_record", {});

    // At least 6 resolved (1 from lifecycle + 5 from calibration)
    expect(result.scoredCount).toBeGreaterThanOrEqual(6);
    // Average Brier should be reasonable
    expect(result.overallBrier as number).toBeLessThan(0.25);
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────────────

describe("Forecasting edge cases", () => {
  it("create_forecast — rejects invalid probability", async () => {
    const result = await callTool("create_forecast", {
      question: "Invalid prob test",
      resolutionDate: "2026-12-31",
      resolutionCriteria: "Test",
      probability: -0.1,
    });

    expect(result.error).toContain("between 0 and 1");
  });

  it("resolve_forecast — ambiguous outcome excluded from scoring", async () => {
    const create = await callTool("create_forecast", {
      question: "Ambiguous resolution test?",
      resolutionDate: "2026-12-31",
      resolutionCriteria: "Test",
      probability: 0.7,
    });

    const resolve = await callTool("resolve_forecast", {
      forecastId: (create as Record<string, unknown>).forecastId,
      outcome: "ambiguous",
      resolutionNotes: "Resolution criteria were unclear",
    });

    expect(resolve.brierScore).toBeNull();
    expect(resolve.logScore).toBeNull();
  });

  it("get_forecast_chain — returns error for nonexistent forecast", async () => {
    const result = await callTool("get_forecast_chain", {
      forecastId: "nonexistent_id",
    });

    expect(result.error).toContain("not found");
  });

  it("get_active_forecasts — filters by tags", async () => {
    const result = await callTool("get_active_forecasts", {
      tags: ["test_calibration"],
    });

    // All calibration forecasts are resolved, so none should be active
    const forecasts = result.forecasts as Array<Record<string, unknown>>;
    const calibration = forecasts.filter((f) =>
      (f.tags as string[]).includes("test_calibration")
    );
    expect(calibration.length).toBe(0);
  });
});
