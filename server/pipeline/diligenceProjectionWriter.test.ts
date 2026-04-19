/**
 * Tests for diligenceProjectionWriter — the orchestrator write path helper.
 *
 * Scenario: An orchestrator just finished a block's structuring pass and
 *           needs to emit a projection. The writer validates the payload,
 *           calls the Convex mutation, and returns a status the caller can
 *           triage.
 *
 * Invariants under test:
 *   - validateEmitArgs rejects every invariant violation with a clear error
 *   - emitDiligenceProjection returns shaped results for created/updated/stale
 *   - emitDiligenceProjectionBatch isolates partial failures (one bad row
 *     does not throw away the successful rows)
 *   - DETERMINISTIC: same input always produces the same mutation call
 */

import { describe, it, expect, vi } from "vitest";
import {
  emitDiligenceProjection,
  emitDiligenceProjectionBatch,
  validateEmitArgs,
  type EmitProjectionArgs,
  type UpsertProjectionMutation,
} from "./diligenceProjectionWriter";

function baseArgs(overrides: Partial<EmitProjectionArgs> = {}): EmitProjectionArgs {
  return {
    entitySlug: "acme-ai",
    blockType: "founder",
    scratchpadRunId: "run_001",
    version: 1,
    overallTier: "verified",
    headerText: "Founders",
    ...overrides,
  };
}

describe("validateEmitArgs", () => {
  it("accepts a well-formed payload", () => {
    expect(() => validateEmitArgs(baseArgs())).not.toThrow();
  });

  it("rejects empty entitySlug", () => {
    expect(() => validateEmitArgs(baseArgs({ entitySlug: "" }))).toThrow(/entitySlug/);
  });

  it("rejects whitespace-only entitySlug", () => {
    expect(() => validateEmitArgs(baseArgs({ entitySlug: "  " }))).toThrow(/entitySlug/);
  });

  it("rejects unknown blockType", () => {
    expect(() =>
      validateEmitArgs(baseArgs({ blockType: "unknown" as never })),
    ).toThrow(/invalid blockType/);
  });

  it("accepts every canonical blockType", () => {
    const types: EmitProjectionArgs["blockType"][] = [
      "projection",
      "founder",
      "product",
      "funding",
      "news",
      "hiring",
      "patent",
      "publicOpinion",
      "competitor",
      "regulatory",
      "financial",
    ];
    for (const blockType of types) {
      expect(() => validateEmitArgs(baseArgs({ blockType }))).not.toThrow();
    }
  });

  it("rejects empty scratchpadRunId", () => {
    expect(() =>
      validateEmitArgs(baseArgs({ scratchpadRunId: "" })),
    ).toThrow(/scratchpadRunId/);
  });

  it("rejects negative or non-numeric version", () => {
    expect(() => validateEmitArgs(baseArgs({ version: -1 }))).toThrow(/version/);
    expect(() =>
      validateEmitArgs(baseArgs({ version: Number.NaN })),
    ).toThrow(/version/);
  });

  it("rejects unknown overallTier", () => {
    expect(() =>
      validateEmitArgs(baseArgs({ overallTier: "fake" as never })),
    ).toThrow(/overallTier/);
  });

  it("rejects empty headerText", () => {
    expect(() =>
      validateEmitArgs(baseArgs({ headerText: "" })),
    ).toThrow(/headerText/);
  });
});

describe("emitDiligenceProjection", () => {
  it("calls the mutation and maps 'created' into a shaped result", async () => {
    const mutation = vi.fn().mockResolvedValue({ status: "created" });
    const result = await emitDiligenceProjection(mutation as UpsertProjectionMutation, baseArgs());
    expect(mutation).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: "created",
      entitySlug: "acme-ai",
      blockType: "founder",
      version: 1,
    });
  });

  it("maps 'updated' through identically", async () => {
    const mutation = vi.fn().mockResolvedValue({ status: "updated" });
    const result = await emitDiligenceProjection(
      mutation as UpsertProjectionMutation,
      baseArgs({ version: 7 }),
    );
    expect(result).toEqual({
      status: "updated",
      entitySlug: "acme-ai",
      blockType: "founder",
      version: 7,
    });
  });

  it("maps 'stale' with the server's currentVersion (HONEST_STATUS)", async () => {
    const mutation = vi
      .fn()
      .mockResolvedValue({ status: "stale", currentVersion: 12 });
    const result = await emitDiligenceProjection(
      mutation as UpsertProjectionMutation,
      baseArgs({ version: 5 }),
    );
    expect(result).toEqual({
      status: "stale",
      entitySlug: "acme-ai",
      blockType: "founder",
      currentVersion: 12,
    });
  });

  it("throws a descriptive error when validation fails before the mutation", async () => {
    const mutation = vi.fn();
    await expect(
      emitDiligenceProjection(
        mutation as UpsertProjectionMutation,
        baseArgs({ entitySlug: "" }),
      ),
    ).rejects.toThrow(/entitySlug/);
    // Mutation must NOT have been called — BOUND rule + no wasted RPC
    expect(mutation).not.toHaveBeenCalled();
  });

  it("forwards optional fields transparently", async () => {
    const mutation = vi.fn().mockResolvedValue({ status: "created" });
    await emitDiligenceProjection(mutation as UpsertProjectionMutation, {
      ...baseArgs(),
      bodyProse: "Jane Doe is CEO.",
      payload: [{ name: "Jane Doe", role: "CEO" }],
      sourceSectionId: "section-founders",
    });
    expect(mutation).toHaveBeenCalledWith(
      expect.objectContaining({
        bodyProse: "Jane Doe is CEO.",
        payload: [{ name: "Jane Doe", role: "CEO" }],
        sourceSectionId: "section-founders",
      }),
    );
  });
});

describe("emitDiligenceProjectionBatch", () => {
  it("fans out over N projections in parallel and returns per-item results", async () => {
    const mutation = vi.fn().mockResolvedValue({ status: "created" });
    const batch = [
      baseArgs({ blockType: "founder", scratchpadRunId: "r1" }),
      baseArgs({ blockType: "product", scratchpadRunId: "r1" }),
      baseArgs({ blockType: "funding", scratchpadRunId: "r1" }),
    ];
    const outcomes = await emitDiligenceProjectionBatch(
      mutation as UpsertProjectionMutation,
      batch,
    );
    expect(outcomes.length).toBe(3);
    expect(outcomes.every((o) => o.ok)).toBe(true);
    expect(mutation).toHaveBeenCalledTimes(3);
  });

  it("partial failure is isolated (reexamine_resilience invariant)", async () => {
    const mutation = vi
      .fn()
      .mockResolvedValueOnce({ status: "created" })
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce({ status: "updated" });
    const batch = [
      baseArgs({ scratchpadRunId: "r1" }),
      baseArgs({ scratchpadRunId: "r2" }),
      baseArgs({ scratchpadRunId: "r3" }),
    ];
    const outcomes = await emitDiligenceProjectionBatch(
      mutation as UpsertProjectionMutation,
      batch,
    );
    expect(outcomes.length).toBe(3);
    expect(outcomes[0].ok).toBe(true);
    expect(outcomes[1].ok).toBe(false);
    expect(outcomes[2].ok).toBe(true);
    if (!outcomes[1].ok) {
      expect(outcomes[1].error.message).toBe("network blip");
      expect(outcomes[1].args.scratchpadRunId).toBe("r2");
    }
  });

  it("validation failures also isolate at the batch level (never throw)", async () => {
    const mutation = vi.fn().mockResolvedValue({ status: "created" });
    const batch: EmitProjectionArgs[] = [
      baseArgs({ scratchpadRunId: "r1" }),
      baseArgs({ scratchpadRunId: "", version: 1 }), // invalid
      baseArgs({ scratchpadRunId: "r3" }),
    ];
    const outcomes = await emitDiligenceProjectionBatch(
      mutation as UpsertProjectionMutation,
      batch,
    );
    expect(outcomes[0].ok).toBe(true);
    expect(outcomes[1].ok).toBe(false);
    expect(outcomes[2].ok).toBe(true);
    // Mutation was only called twice (the invalid row short-circuited before RPC)
    expect(mutation).toHaveBeenCalledTimes(2);
  });

  it("DETERMINISTIC: identical input produces identical mutation calls", async () => {
    const mutation = vi.fn().mockResolvedValue({ status: "created" });
    const args = baseArgs({ version: 42, headerText: "Founders x2" });
    await emitDiligenceProjection(mutation as UpsertProjectionMutation, args);
    await emitDiligenceProjection(mutation as UpsertProjectionMutation, args);
    expect(mutation).toHaveBeenCalledTimes(2);
    expect(mutation.mock.calls[0][0]).toEqual(mutation.mock.calls[1][0]);
  });
});
