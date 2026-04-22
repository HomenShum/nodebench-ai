import { describe, expect, it } from "vitest";

import {
  buildProductProviderBudgetSummary,
  getProductProviderBudgetConfig,
} from "./productRuntime";

describe("productRuntime", () => {
  it("uses Linkup-style call budgets without token budgets", () => {
    expect(getProductProviderBudgetConfig("linkup")).toEqual({
      callBudget: 10,
      tokenBudget: null,
    });
  });

  it("aggregates provider usage and marks warnings when utilization crosses the threshold", () => {
    const summary = buildProductProviderBudgetSummary([
      {
        tool: "search",
        provider: "linkup",
        model: null,
        step: 1,
        totalPlanned: 8,
        status: "done",
        durationMs: 1800,
        startedAt: 1,
        updatedAt: 2,
      },
      {
        tool: "fetch",
        provider: "linkup",
        model: null,
        step: 2,
        totalPlanned: 8,
        status: "done",
        durationMs: 2200,
        startedAt: 3,
        updatedAt: 4,
      },
      {
        tool: "analyze",
        provider: "openai",
        model: "gpt-5.4-mini",
        step: 3,
        totalPlanned: 8,
        status: "done",
        durationMs: 3000,
        tokensIn: 50_000,
        tokensOut: 40_000,
        startedAt: 5,
        updatedAt: 6,
      },
    ]);

    expect(summary.totals.calls).toBe(3);
    expect(summary.totals.totalTokens).toBe(90_000);
    expect(summary.overallStatus).toBe("warning");

    const openai = summary.providers.find((provider) => provider.provider === "openai");
    expect(openai).toMatchObject({
      status: "warning",
      dominantModel: "gpt-5.4-mini",
      totalTokens: 90_000,
    });
  });

  it("marks exceeded when provider calls cross the budget", () => {
    const summary = buildProductProviderBudgetSummary(
      Array.from({ length: 11 }, (_, index) => ({
        tool: "search",
        provider: "linkup",
        step: index + 1,
        totalPlanned: 12,
        status: "done" as const,
        durationMs: 1200,
        startedAt: index,
        updatedAt: index + 100,
      })),
    );

    expect(summary.overallStatus).toBe("exceeded");
    expect(summary.providers[0]).toMatchObject({
      provider: "linkup",
      calls: 11,
      callBudget: 10,
      status: "exceeded",
    });
  });
});
