/**
 * Unit tests for embeddingProvider — cosine similarity, cache, mock provider, graceful fallback.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  embeddingSearch,
  isEmbeddingReady,
  getProviderName,
  _resetForTesting,
  _setProviderForTesting,
  _setIndexForTesting,
} from "../tools/embeddingProvider.js";
import type { EmbeddingProvider } from "../tools/embeddingProvider.js";

beforeEach(() => {
  _resetForTesting();
});

describe("embeddingProvider: cosine similarity correctness", () => {
  it("identical vectors should have similarity ~1.0", () => {
    const vec = new Float32Array([0.5, 0.3, 0.8, 0.1]);
    _setIndexForTesting([{ name: "tool_a", nodeType: "tool" as const, vector: vec }]);

    const results = embeddingSearch(vec, 5);
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("tool_a");
    expect(results[0].similarity).toBeCloseTo(1.0, 4);
  });

  it("orthogonal vectors should have similarity ~0.0", () => {
    const vecA = new Float32Array([1, 0, 0, 0]);
    const vecB = new Float32Array([0, 1, 0, 0]);
    _setIndexForTesting([
      { name: "tool_a", nodeType: "tool" as const, vector: vecA },
      { name: "tool_b", nodeType: "tool" as const, vector: vecB },
    ]);

    const queryVec = new Float32Array([1, 0, 0, 0]);
    const results = embeddingSearch(queryVec, 5);
    expect(results[0].name).toBe("tool_a");
    expect(results[0].similarity).toBeCloseTo(1.0, 4);
    expect(results[1].name).toBe("tool_b");
    expect(results[1].similarity).toBeCloseTo(0.0, 4);
  });

  it("should rank by similarity (highest first)", () => {
    _setIndexForTesting([
      { name: "low", nodeType: "tool" as const, vector: new Float32Array([0.1, 0.9, 0.0]) },
      { name: "high", nodeType: "tool" as const, vector: new Float32Array([0.9, 0.1, 0.0]) },
      { name: "mid", nodeType: "tool" as const, vector: new Float32Array([0.5, 0.5, 0.0]) },
    ]);

    const query = new Float32Array([1.0, 0.0, 0.0]);
    const results = embeddingSearch(query, 3);
    expect(results[0].name).toBe("high");
    expect(results[1].name).toBe("mid");
    expect(results[2].name).toBe("low");
  });
});

describe("embeddingProvider: graceful fallback", () => {
  it("isEmbeddingReady returns false when no index", () => {
    expect(isEmbeddingReady()).toBe(false);
  });

  it("embeddingSearch returns empty when no index", () => {
    const results = embeddingSearch(new Float32Array([1, 0, 0]), 5);
    expect(results).toEqual([]);
  });

  it("getProviderName returns null when no provider", () => {
    expect(getProviderName()).toBe(null);
  });
});

describe("embeddingProvider: mock provider", () => {
  it("can inject a mock provider", () => {
    const mockProvider: EmbeddingProvider = {
      name: "mock",
      dimensions: 3,
      embed: async (texts) =>
        texts.map(() => new Float32Array([0.5, 0.5, 0.0])),
    };
    _setProviderForTesting(mockProvider);
    expect(getProviderName()).toBe("mock");
  });

  it("isEmbeddingReady returns true when index is set", () => {
    _setIndexForTesting([
      { name: "tool_a", nodeType: "tool" as const, vector: new Float32Array([1, 0, 0]) },
    ]);
    expect(isEmbeddingReady()).toBe(true);
  });
});

describe("embeddingProvider: limit parameter", () => {
  it("respects limit in embeddingSearch", () => {
    _setIndexForTesting([
      { name: "a", nodeType: "tool" as const, vector: new Float32Array([1, 0, 0]) },
      { name: "b", nodeType: "tool" as const, vector: new Float32Array([0, 1, 0]) },
      { name: "c", nodeType: "tool" as const, vector: new Float32Array([0, 0, 1]) },
    ]);

    const results = embeddingSearch(new Float32Array([1, 0, 0]), 2);
    expect(results.length).toBe(2);
    expect(results[0].name).toBe("a");
  });
});
