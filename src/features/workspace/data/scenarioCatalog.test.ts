import { describe, expect, it } from "vitest";

import {
  HERO_SCENARIO_TESTS,
  PRODUCT_SURFACE_MODEL,
  SCENARIO_MATRIX,
} from "./scenarioCatalog";

describe("scenario catalog", () => {
  it("keeps the four-surface product model explicit", () => {
    expect(PRODUCT_SURFACE_MODEL.map((surface) => surface.surface)).toEqual([
      "Web app",
      "Mobile",
      "CLI / MCP",
      "Workspace",
    ]);
  });

  it("covers every surface in the scenario matrix", () => {
    const primarySurfaces = new Set(SCENARIO_MATRIX.map((row) => row.primarySurface));

    expect(primarySurfaces).toEqual(
      new Set(["Mobile", "Web app", "Workspace", "CLI / MCP"]),
    );
    expect(SCENARIO_MATRIX.length).toBeGreaterThanOrEqual(12);
  });

  it("keeps hero scenarios in the eval template shape", () => {
    expect(HERO_SCENARIO_TESTS.map((scenario) => scenario.id)).toEqual([
      "live-event-capture",
      "recruiter-prep",
      "founder-customer-discovery",
      "investor-demo-day",
      "research-report-workspace",
    ]);

    for (const scenario of HERO_SCENARIO_TESTS) {
      expect(scenario.realLifeInput).toBeTruthy();
      expect(scenario.inferredIntent).toBeTruthy();
      expect(scenario.target).toBeTruthy();
      expect(scenario.structuredOutput.length).toBeGreaterThan(0);
      expect(scenario.ack).toBeTruthy();
      expect(scenario.nextAction.length).toBeGreaterThan(0);
    }
  });
});
