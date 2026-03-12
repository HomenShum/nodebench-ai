import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
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

describe("grounding routes", () => {
  let server: Server | undefined;

  beforeEach(() => {
    vi.resetAllMocks();
    clearReplayManifests();
  });

  afterEach(async () => {
    if (server) {
      server.closeIdleConnections?.();
      server.closeAllConnections?.();
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => (error ? reject(error) : resolve()));
      });
      server = undefined;
    }
  });

  async function startServer() {
    const { createApp } = await import("../app.js");
    const app = createApp();
    server = app.listen(0);
    await new Promise<void>((resolve) => server!.once("listening", () => resolve()));
    const port = (server.address() as AddressInfo).port;
    return `http://127.0.0.1:${port}`;
  }

  it("returns a sourced answer from /v1/search", async () => {
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
          mode: "balanced",
          sourcesQueried: ["linkup"],
          timing: { linkup: 90 },
          totalTimeMs: 90,
          reranked: false,
        },
      },
    });

    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/v1/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({
        query: "oracle update",
        outputType: "sourcedAnswer",
      }),
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.object).toBe("sourced_answer");
    expect(data.answer).toContain("token cost");
  });

  it("returns a temporal brief from /v1/search", async () => {
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
              title: "Incident note",
              snippet: "Retries caused a three day delay",
              url: "https://example.com/incident",
              score: 0.88,
              originalRank: 1,
              contentType: "text",
              publishedAt: "2026-03-01T00:00:00.000Z",
            },
          ],
          totalBeforeFusion: 1,
          mode: "comprehensive",
          sourcesQueried: ["linkup"],
          timing: { linkup: 100 },
          totalTimeMs: 100,
          reranked: true,
        },
      },
    });

    fetchUrlDocument.mockResolvedValue({
      object: "fetched_document",
      requestId: "req_1",
      url: "https://example.com/incident",
      finalUrl: "https://example.com/incident",
      fetchedAt: "2026-03-02T00:00:00.000Z",
      status: 200,
      contentType: "text/html",
      title: "Incident note",
      text: "In Q1 2026, retries caused a three day delay.",
      markdown: "In Q1 2026, retries caused a three day delay.",
      truncated: false,
      citations: [
        {
          id: "src_1",
          url: "https://example.com/incident",
          title: "Incident note",
          fetchedAt: "2026-03-02T00:00:00.000Z",
          snapshotHash: "hash_incident",
        },
      ],
      snapshotHash: "hash_incident",
      rawSnapshotHash: "raw_hash_incident",
      extraction: {
        claims: [{ claim_text: "In Q1 2026, retries caused a three day delay." }],
        temporalMarkers: [{ text: "Q1 2026", resolvedDate: "2026-01-01T00:00:00.000Z" }],
        numericFacts: [],
        entities: [{ name: "Project Atlas" }],
      },
    });

    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/v1/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({
        q: "payment retry delay",
        depth: "temporal",
        outputType: "temporalBrief",
      }),
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.object).toBe("temporal_brief");
    expect(data.timeline).toHaveLength(1);
    expect(data.gameBoard[0]?.actor).toBe("Project Atlas");
  });

  it("returns an enterprise investigation from /v1/search", async () => {
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
          ],
          totalBeforeFusion: 1,
          mode: "comprehensive",
          sourcesQueried: ["linkup"],
          timing: { linkup: 110 },
          totalTimeMs: 110,
          reranked: true,
        },
      },
    });

    fetchUrlDocument.mockResolvedValue({
      object: "fetched_document",
      requestId: "req_2",
      url: "https://github.com/org/repo/pull/2044",
      finalUrl: "https://github.com/org/repo/pull/2044",
      fetchedAt: "2026-03-02T00:00:00.000Z",
      status: 200,
      contentType: "text/html",
      title: "Payment postmortem",
      text: "In Q1 2026 retries caused a three day delay and latency rose to 420.",
      markdown: "In Q1 2026 retries caused a three day delay and latency rose to 420.",
      truncated: false,
      snapshotHash: "hash_2044",
      rawSnapshotHash: "raw_hash_2044",
      citations: [
        {
          id: "src_1",
          url: "https://github.com/org/repo/pull/2044",
          title: "Payment postmortem",
          fetchedAt: "2026-03-02T00:00:00.000Z",
          snapshotHash: "hash_2044",
        },
      ],
      extraction: {
        claims: [{ claim_text: "In Q1 2026 retries caused a three day delay." }],
        temporalMarkers: [{ text: "Q1 2026", resolvedDate: "2026-01-01T00:00:00.000Z" }],
        numericFacts: [{ metric: "payment_api_latency_p95", value: 420, units: "ms", lineNumber: 1 }],
        entities: [{ name: "Growth Team" }],
      },
    });

    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/v1/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({
        query: "Trace the payment gateway timeout vulnerability",
        depth: "temporal",
        outputType: "enterpriseInvestigation",
      }),
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.meta?.query).toContain("payment gateway timeout");
    expect(data.derived_signals?.forecast).toBeTruthy();
    expect(data.evidence_catalog?.[0]?.content_hash).toBe("hash_2044");
    expect(data.traceability?.trace_id).toBeTruthy();
    expect(data.traceability?.replay_url).toMatch(/^\/v1\/replay\//);

    const replayResponse = await fetch(`${baseUrl}${data.traceability.replay_url}`, {
      headers: { Connection: "close" },
    });
    const replayData = await replayResponse.json();
    expect(replayResponse.status).toBe(200);
    expect(replayData.object).toBe("replay_manifest");
    expect(replayData.traceId).toBe(data.traceability.trace_id);
    expect(replayData.responseSnapshotHash).toBeTruthy();
    expect(replayData.sourceSnapshotHashes).toContain("hash_2044");

    const traceResponse = await fetch(`${baseUrl}${data.traceability.replay_url}/trace`, {
      headers: { Connection: "close" },
    });
    const traceData = await traceResponse.json();
    expect(traceResponse.status).toBe(200);
    expect(traceData.object).toBe("replay_trace");
    expect(traceData.traceId).toBe(data.traceability.trace_id);
    expect(traceData.trace.length).toBeGreaterThanOrEqual(2);
    expect(traceData.trace[0]?.events?.[0]?.name).toBe("tool.input");

    const replayRunResponse = await fetch(`${baseUrl}${data.traceability.replay_url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({ subset: "observed_facts_only" }),
    });
    const replayRunData = await replayRunResponse.json();
    expect(replayRunResponse.status).toBe(201);
    expect(replayRunData.object).toBe("replay_execution");
    expect(replayRunData.mode).toBe("deterministic_manifest_replay");
    expect(replayRunData.traceId).toBe(data.traceability.trace_id);
  });

  it("returns a fetched document from /v1/fetch", async () => {
    fetchUrlDocument.mockResolvedValue({
      object: "fetched_document",
      requestId: "req_1",
      url: "https://example.com",
      finalUrl: "https://example.com",
      fetchedAt: "2026-03-02T00:00:00.000Z",
      status: 200,
      contentType: "text/html",
      title: "Example Domain",
      text: "Example Domain",
      markdown: "Example Domain",
      truncated: false,
      warnings: ["renderJs=true was requested, but /v1/fetch currently performs static HTTP fetch only."],
      citations: [
        {
          id: "src_1",
          url: "https://example.com",
          title: "Example Domain",
          fetchedAt: "2026-03-02T00:00:00.000Z",
          snapshotHash: "hash_example",
        },
      ],
      snapshotHash: "hash_example",
      rawSnapshotHash: "raw_hash_example",
    });

    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/v1/fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({
        url: "https://example.com",
        renderJs: true,
      }),
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.object).toBe("fetched_document");
    expect(data.markdown).toBe("Example Domain");
    expect(data.warnings).toHaveLength(1);
    expect(data.snapshotHash).toBe("hash_example");
  });
});
