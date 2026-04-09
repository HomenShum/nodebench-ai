/**
 * @vitest-environment node
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("hyperloopEval", () => {
  let tempDir = "";

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "nodebench-hyperloop-eval-"));
    process.env.NODEBENCH_DATA_DIR = tempDir;
    vi.resetModules();
  });

  afterEach(() => {
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // SQLite can keep handles briefly on Windows.
      }
    }
  });

  it("returns a structured scorecard with deterministic gates and llm judge context", async () => {
    const { evaluateTask } = await import("./hyperloopEval.js");

    const evaluation = evaluateTask({
      episodeId: "episode_1",
      query: "Anthropic",
      lens: "founder",
      entity: "Anthropic",
      classification: "company_search",
      totalSignals: 4,
      verifiedSignals: 1,
      totalClaims: 5,
      groundedClaims: 2,
      contradictionsCaught: 1,
      userEditDistance: 0.25,
      wasExported: false,
      wasDelegated: false,
      latencyMs: 6100,
      costUsd: 0.07,
      toolCallCount: 8,
      llmJudge: {
        verdict: "PASS",
        score: "6/7",
        failingCriteria: ["Removed repeated cognition"],
        fixSuggestions: ["Tighten evidence grounding"],
      },
    });

    expect(evaluation.rubricVersion).toBe("hyperloop_v2");
    expect(evaluation.scoreComponents.length).toBeGreaterThanOrEqual(6);
    expect(evaluation.gates.length).toBeGreaterThanOrEqual(5);
    expect(evaluation.gates.some((gate) => gate.key === "minimum_evidence")).toBe(true);
    expect(evaluation.policyAction).toBe("archive_only");
    expect(evaluation.llmJudge?.verdict).toBe("PASS");
    expect(evaluation.llmJudge?.reasoningSummary).toContain("Removed repeated cognition");
  });
});

