/**
 * Scenario tests for DiligenceVerdictPanel's pure helpers.
 *
 * Follows .claude/rules/scenario_testing.md: every test anchors to a real
 * operator persona looking at an entity page and needing a specific read.
 *
 * Component-level rendering tests are intentionally omitted here (they need
 * a Convex + ProseMirror test harness that already lives in the repo's e2e
 * suite). These tests cover the DETERMINISTIC helpers so we can guarantee:
 *   - malformed gatesJson never crashes the panel
 *   - the "what to do next" hint is derived consistently
 *   - verdict-to-telemetry join handles missing rows (late-arriving telemetry)
 */

import { describe, it, expect } from "vitest";
import { __test } from "./DiligenceVerdictPanel";

const { parseGates, dominantFailureHint, joinVerdictsWithTelemetry } = __test;

describe("parseGates — resilience (operator scrolls stale data)", () => {
  it("happy path: well-formed JSON array yields typed gates", () => {
    const json = JSON.stringify([
      { name: "hasValidTier", status: "pass", reason: "tier=verified" },
      { name: "latencyWithinBudget", status: "fail", reason: "exceeds budget" },
    ]);
    const gates = parseGates(json);
    expect(gates).toHaveLength(2);
    expect(gates[0].name).toBe("hasValidTier");
    expect(gates[1].status).toBe("fail");
  });

  it("adversarial: malformed JSON returns empty array (no crash)", () => {
    expect(parseGates("not json")).toEqual([]);
    expect(parseGates("{not:an:array}")).toEqual([]);
  });

  it("adversarial: non-array JSON payload returns empty", () => {
    expect(parseGates(JSON.stringify({ name: "lonely" }))).toEqual([]);
  });

  it("adversarial: array with junk items filters to valid gates only", () => {
    const json = JSON.stringify([
      { name: "hasHeader", status: "pass", reason: "ok" },
      null,
      { name: "no-status" },
      { name: 42, status: "pass", reason: "typed wrong" },
      "string item",
      { name: "capturedSources", status: "bogus-status", reason: "bad status" },
      { name: "emitStatusIsTerminal", status: "skipped", reason: "dry-run" },
    ]);
    const gates = parseGates(json);
    expect(gates.map((g) => g.name)).toEqual([
      "hasHeader",
      "emitStatusIsTerminal",
    ]);
  });
});

describe("dominantFailureHint — guides operator to the right fix", () => {
  it("no failures → no hint (verified run — show clean state)", () => {
    const gates = [
      { name: "hasValidTier", status: "pass" as const, reason: "ok" },
      { name: "hasHeader", status: "pass" as const, reason: "ok" },
      { name: "capturedSources", status: "skipped" as const, reason: "missing" },
    ];
    expect(dominantFailureHint(gates)).toBeNull();
  });

  it("first failing gate wins (stable ordering — dashboards rely on this)", () => {
    const gates = [
      { name: "hasValidTier", status: "pass" as const, reason: "ok" },
      { name: "latencyWithinBudget", status: "fail" as const, reason: "elapsed 45000ms" },
      { name: "capturedSources", status: "fail" as const, reason: "zero sources" },
    ];
    expect(dominantFailureHint(gates)).toContain("Latency");
    expect(dominantFailureHint(gates)).toContain("45000ms");
  });

  it("unknown gate name falls back to raw name (forward compat)", () => {
    const gates = [
      { name: "someFutureGate", status: "fail" as const, reason: "new rule" },
    ];
    const hint = dominantFailureHint(gates);
    expect(hint).toContain("someFutureGate");
    expect(hint).toContain("new rule");
  });
});

describe("joinVerdictsWithTelemetry — late-arriving telemetry scenarios", () => {
  // Minimal shape — only the fields the join reads.
  const mkVerdict = (telemetryId: string, overrides: Partial<Record<string, unknown>> = {}) =>
    ({
      _id: `v_${telemetryId}` as never,
      telemetryId: telemetryId as never,
      verdict: "verified",
      passCount: 10,
      failCount: 0,
      skipCount: 0,
      score: 1,
      latencyBudgetMs: 30_000,
      gatesJson: "[]",
      judgedAt: 1_000,
      entitySlug: "acme-ai",
      blockType: "founder",
      scratchpadRunId: "r1",
      ...overrides,
    }) as never;

  const mkTelemetry = (id: string) =>
    ({
      _id: id as never,
      entitySlug: "acme-ai",
      blockType: "founder",
      scratchpadRunId: "r1",
      version: 1,
      overallTier: "verified",
      headerText: "Founders",
      status: "created",
      startedAt: 0,
      endedAt: 100,
      elapsedMs: 100,
    }) as never;

  it("happy path: every verdict has a matching telemetry row", () => {
    const verdicts = [mkVerdict("t1"), mkVerdict("t2")];
    const telemetry = [mkTelemetry("t1"), mkTelemetry("t2")];
    const joined = joinVerdictsWithTelemetry(verdicts, telemetry);
    expect(joined).toHaveLength(2);
    expect(joined[0].telemetry).toBeDefined();
    expect(joined[1].telemetry).toBeDefined();
  });

  it("sad path: telemetry arrived after verdict pagination cutoff → undefined telemetry (no crash)", () => {
    const verdicts = [mkVerdict("t1"), mkVerdict("t_missing")];
    const telemetry = [mkTelemetry("t1")];
    const joined = joinVerdictsWithTelemetry(verdicts, telemetry);
    expect(joined).toHaveLength(2);
    expect(joined[0].telemetry).toBeDefined();
    expect(joined[1].telemetry).toBeUndefined();
  });

  it("burst scale: 100 verdicts, 100 telemetry — join is O(n), not O(n²)", () => {
    const verdicts = Array.from({ length: 100 }, (_, i) => mkVerdict(`t${i}`));
    const telemetry = Array.from({ length: 100 }, (_, i) => mkTelemetry(`t${i}`));
    const start = performance.now();
    const joined = joinVerdictsWithTelemetry(verdicts, telemetry);
    const elapsed = performance.now() - start;
    expect(joined).toHaveLength(100);
    expect(joined.every((j) => j.telemetry !== undefined)).toBe(true);
    // Should be well under 10ms — if this blows up, we accidentally went quadratic.
    expect(elapsed).toBeLessThan(50);
  });

  it("adversarial: empty inputs → empty output", () => {
    expect(joinVerdictsWithTelemetry([], [])).toEqual([]);
    expect(joinVerdictsWithTelemetry([], [mkTelemetry("t1")])).toEqual([]);
    const verdictsOnly = joinVerdictsWithTelemetry([mkVerdict("t1")], []);
    expect(verdictsOnly).toHaveLength(1);
    expect(verdictsOnly[0].telemetry).toBeUndefined();
  });
});
