import { describe, expect, it, vi } from "vitest";

import { buildEnterpriseInvestigation } from "./temporal-investigation.js";

describe("buildEnterpriseInvestigation", () => {
  it("falls back to document-backed causal chain events when extracted timeline events are sparse", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    try {
      const result = await buildEnterpriseInvestigation({
        query: "Oracle Stargate AI infrastructure timeline 2025 2026",
        telemetry: {
          totalBeforeFusion: 1,
          totalTimeMs: 1200,
          reranked: true,
          sourcesQueried: ["linkup"],
          timing: { linkup: 1180 },
          errors: [],
        },
        timeline: [],
        documents: [
          {
            finalUrl: "https://example.com/oracle-stargate",
            title: "Oracle joins Stargate infrastructure plan",
            text: "Oracle said on January 21, 2025 that it would support the Stargate AI infrastructure buildout.",
            snapshotHash: "hash_stargate",
            citations: [
              {
                id: "src_1",
                url: "https://example.com/oracle-stargate",
                title: "Oracle joins Stargate infrastructure plan",
                fetchedAt: "2026-03-09T00:00:00.000Z",
                snapshotHash: "hash_stargate",
              },
            ],
            extraction: {
              claims: [],
              temporalMarkers: [{ text: "January 21, 2025", resolvedDate: "2025-01-21T00:00:00.000Z" }],
              numericFacts: [],
              entities: [{ name: "Oracle" }],
            },
          },
        ],
        citations: [
          {
            id: "src_1",
            title: "Oracle joins Stargate infrastructure plan",
            url: "https://example.com/oracle-stargate",
            source: "linkup",
            publishedAt: "2025-01-21T00:00:00.000Z",
          },
        ],
        traceId: "trace_test",
        executionTimeMs: 820,
      });

      expect(result.observed_facts.length).toBeGreaterThanOrEqual(1);
      expect(result.observed_facts[0]?.statement).toContain("Oracle joins Stargate");
      expect(result.evidence_catalog[0]?.content_hash).toBe("hash_stargate");
      expect(result.traceability.artifact_integrity).toBe("verified_for_captured_items");
      expect(result.limitations.length).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
