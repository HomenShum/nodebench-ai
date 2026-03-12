import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { performance } from "node:perf_hooks";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { clearReplayManifests } from "../lib/replay-store.js";

const runQuickSearch = vi.fn();
const runFusionSearch = vi.fn();
const fetchUrlDocument = vi.fn();

vi.mock("../lib/convex-client.js", () => ({
  runQuickSearch,
  runFusionSearch,
}));

vi.mock("../lib/web-fetch.js", () => ({
  fetchUrlDocument,
}));

function percentile(values: number[], ratio: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index] ?? 0;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function readThreshold(envKey: string, fallback: number) {
  const raw = process.env[envKey];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

describe("grounding route performance guards", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const { createApp } = await import("../app.js");
    const app = createApp();
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    server.closeIdleConnections?.();
    server.closeAllConnections?.();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  beforeEach(() => {
    vi.resetAllMocks();
    clearReplayManifests();
  });

  async function measureRoute(args: {
    path: string;
    body: Record<string, unknown>;
    warmups?: number;
    iterations?: number;
  }) {
    const warmups = args.warmups ?? 2;
    const iterations = args.iterations ?? 6;
    const durations: number[] = [];
    let lastJson: any = null;

    for (let index = 0; index < warmups + iterations; index += 1) {
      const startedAt = performance.now();
      const response = await fetch(`${baseUrl}${args.path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Connection: "close" },
        body: JSON.stringify(args.body),
      });
      const json = await response.json();
      const durationMs = performance.now() - startedAt;

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);

      if (index >= warmups) {
        durations.push(durationMs);
      }
      lastJson = json;
    }

    return {
      averageMs: average(durations),
      p95Ms: percentile(durations, 0.95),
      iterations,
      lastJson,
    };
  }

  it("keeps the fast grounded search lane under the CI latency budget", async () => {
    runQuickSearch.mockResolvedValue({
      ok: true,
      data: {
        kind: "quick_search_results",
        version: 1,
        generatedAt: "2026-03-08T00:00:00.000Z",
        payload: {
          results: [
            {
              id: "src_1",
              source: "linkup",
              title: "Oracle update",
              snippet: "Oracle reduced token cost by 18%",
              url: "https://example.com/oracle",
              score: 0.91,
              originalRank: 1,
              contentType: "text",
              publishedAt: "2026-03-01T00:00:00.000Z",
            },
          ],
          totalBeforeFusion: 1,
          mode: "fast",
          sourcesQueried: ["linkup"],
          timing: { linkup: 12 },
          totalTimeMs: 12,
          reranked: false,
        },
      },
    });

    const metrics = await measureRoute({
      path: "/v1/search",
      body: {
        query: "oracle update",
        mode: "fast",
        outputType: "searchResults",
        maxResults: 5,
      },
    });

    const p95BudgetMs = readThreshold("NODEBENCH_API_SEARCH_P95_MS", 180);
    expect(metrics.p95Ms).toBeLessThanOrEqual(p95BudgetMs);
    expect(metrics.lastJson.object).toBe("search_result");
    expect(metrics.lastJson.results).toHaveLength(1);
    expect(metrics.lastJson.citations?.[0]?.url).toBe("https://example.com/oracle");
  });

  it("keeps the enterprise investigation lane under the temporal CI latency budget", async () => {
    runFusionSearch.mockResolvedValue({
      ok: true,
      data: {
        kind: "fusion_search_results",
        version: 1,
        generatedAt: "2026-03-08T00:00:00.000Z",
        payload: {
          results: [
            {
              id: "src_1",
              source: "linkup",
              title: "Payment postmortem",
              snippet: "Retry policy changed and timeouts drifted upward.",
              url: "https://github.com/org/repo/pull/2044",
              score: 0.91,
              originalRank: 1,
              contentType: "text",
              publishedAt: "2026-03-01T00:00:00.000Z",
            },
            {
              id: "src_2",
              source: "linkup",
              title: "Slack incident thread",
              snippet: "Growth team bypassed the CI timeout gate.",
              url: "https://example.com/slack/thread",
              score: 0.88,
              originalRank: 2,
              contentType: "text",
              publishedAt: "2025-11-14T00:00:00.000Z",
            },
          ],
          totalBeforeFusion: 2,
          mode: "comprehensive",
          sourcesQueried: ["linkup"],
          timing: { linkup: 35 },
          totalTimeMs: 35,
          reranked: true,
        },
      },
    });

    fetchUrlDocument.mockImplementation(async ({ url }: { url: string }) => {
      if (String(url).includes("slack")) {
        return {
          object: "fetched_document",
          requestId: "req_slack",
          url,
          finalUrl: url,
          fetchedAt: "2025-11-14T00:00:00.000Z",
          status: 200,
          contentType: "text/html",
          title: "Slack incident thread",
          text: "On November 14, 2025 the growth team bypassed the CI timeout gate to ship retries.",
          markdown: "On November 14, 2025 the growth team bypassed the CI timeout gate to ship retries.",
          truncated: false,
          snapshotHash: "hash_slack",
          rawSnapshotHash: "raw_hash_slack",
          citations: [
            {
              id: "src_2",
              url,
              title: "Slack incident thread",
              fetchedAt: "2025-11-14T00:00:00.000Z",
              snapshotHash: "hash_slack",
            },
          ],
          extraction: {
            claims: [{ claim_text: "Growth team bypassed the CI timeout gate." }],
            temporalMarkers: [{ text: "November 14, 2025", resolvedDate: "2025-11-14T00:00:00.000Z" }],
            numericFacts: [],
            entities: [{ name: "Growth Team" }],
          },
        };
      }

      return {
        object: "fetched_document",
        requestId: "req_pr",
        url,
        finalUrl: url,
        fetchedAt: "2026-03-02T00:00:00.000Z",
        status: 200,
        contentType: "text/html",
        title: "Payment postmortem",
        text: "On August 12, 2025 the payment module enforced a 200ms timeout. By February 28, 2026 latency rose to 420ms and retries caused a three day delay.",
        markdown: "On August 12, 2025 the payment module enforced a 200ms timeout. By February 28, 2026 latency rose to 420ms and retries caused a three day delay.",
        truncated: false,
        snapshotHash: "hash_2044",
        rawSnapshotHash: "raw_hash_2044",
        citations: [
          {
            id: "src_1",
            url,
            title: "Payment postmortem",
            fetchedAt: "2026-03-02T00:00:00.000Z",
            snapshotHash: "hash_2044",
          },
        ],
        extraction: {
          claims: [
            { claim_text: "On August 12, 2025 the payment module enforced a 200ms timeout." },
            { claim_text: "By February 28, 2026 latency rose to 420ms and retries caused a three day delay." },
          ],
          temporalMarkers: [
            { text: "August 12, 2025", resolvedDate: "2025-08-12T00:00:00.000Z" },
            { text: "February 28, 2026", resolvedDate: "2026-02-28T00:00:00.000Z" },
          ],
          numericFacts: [{ metric: "payment_api_latency_p95", value: 420, units: "ms", lineNumber: 1 }],
          entities: [{ name: "Growth Team" }, { name: "Platform Engineering" }],
        },
      };
    });

    const metrics = await measureRoute({
      path: "/v1/search",
      body: {
        query: "Trace the payment gateway timeout vulnerability",
        depth: "temporal",
        outputType: "enterpriseInvestigation",
        maxResults: 5,
      },
      iterations: 5,
    });

    const p95BudgetMs = readThreshold("NODEBENCH_API_ENTERPRISE_INVESTIGATION_P95_MS", 450);
    expect(metrics.p95Ms).toBeLessThanOrEqual(p95BudgetMs);
    expect(metrics.lastJson.object).toBe("enterprise_investigation");
    expect(metrics.lastJson.observed_facts.length).toBeGreaterThanOrEqual(2);
    expect(metrics.lastJson.evidence_catalog.map((e: { content_hash: string }) => e.content_hash)).toEqual(
      expect.arrayContaining(["hash_2044", "hash_slack"])
    );
    expect(metrics.lastJson.recommended_actions?.[0]?.action).toBeTruthy();
    expect(metrics.lastJson.traceability?.replay_url).toMatch(/^\/v1\/replay\//);
  });
});
