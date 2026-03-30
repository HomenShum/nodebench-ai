import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDeltaTools } from "../tools/deltaTools.js";

function getTool(name: string) {
  const tool = createDeltaTools().find((entry) => entry.name === name);
  if (!tool) throw new Error(`Delta tool not found: ${name}`);
  return tool;
}

function mockJsonResponse(ok: boolean, body: unknown, status = ok ? 200 : 500): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("deltaTools", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("nodebench-mcp-unified.onrender.com/health")) {
        return mockJsonResponse(true, { status: "ok", service: "nodebench-mcp-unified", tools: 101 });
      }
      if (url.includes("/health")) {
        return mockJsonResponse(true, { status: "ok" });
      }
      if (url.includes("/search/health")) {
        return mockJsonResponse(true, { status: "ok", toolsAvailable: 8 });
      }
      if (url.includes("/sync-bridge/health")) {
        return mockJsonResponse(true, { status: "ok", service: "sync-bridge" });
      }
      if (url.includes("/retention/status")) {
        return mockJsonResponse(true, { connected: false });
      }
      if (url.includes("/retention/push-packet")) {
        return mockJsonResponse(true, { status: "ingested" }, 201);
      }
      return mockJsonResponse(false, { error: "not found", url }, 404);
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("delta_scan includes runtime probes, distribution surfaces, and a risk register", async () => {
    const result = await getTool("delta_scan").handler({ depth: "deep" }) as { content: Array<{ text: string }> };
    const payload = JSON.parse(result.content[0]!.text);
    const jobCoverage = payload.layerResults.find((entry: { layer: number }) => entry.layer === 2);
    const workflowFriction = payload.layerResults.find((entry: { layer: number }) => entry.layer === 3);

    expect(payload.overallScore).toBeGreaterThan(0);
    expect(Array.isArray(payload.distributionSurfaces)).toBe(true);
    expect(Array.isArray(payload.systemHealth.runtimeProbes)).toBe(true);
    expect(Array.isArray(payload.riskRegister)).toBe(true);
    expect(payload.setupAnalysis.angleCoverage).toBeTruthy();
    expect(jobCoverage.findings.some((line: string) => line.includes("npm package"))).toBe(false);
    expect(workflowFriction.findings.some((line: string) => line.includes("install script"))).toBe(true);
    expect(workflowFriction.findings.some((line: string) => line.includes("Search -> Understand"))).toBe(true);
    expect(payload.nextTools).toContain("delta_self_dogfood");
  });

  it("delta_compare reuses saved diligence packets when available", async () => {
    await getTool("delta_diligence").handler({
      entity: "NodeBench Delta",
      depth: "deep",
    });

    const result = await getTool("delta_compare").handler({
      entities: ["NodeBench Delta", "Anthropic"],
    }) as { content: Array<{ text: string }> };
    const payload = JSON.parse(result.content[0]!.text);

    const nodebenchRow = payload.comparisonGrid.find((entry: { entity: string }) => entry.entity === "NodeBench Delta");
    expect(nodebenchRow.sourcePacketId).toBeTruthy();
    expect(String(nodebenchRow.metrics[0].value)).toContain("From saved diligence");
  });

  it("delta_self_dogfood emits a packet bundle with review output", async () => {
    const result = await getTool("delta_self_dogfood").handler({
      entity: "NodeBench Delta",
      include_review: true,
    }) as { content: Array<{ text: string }> };
    const payload = JSON.parse(result.content[0]!.text);

    expect(payload.packet.type).toBe("market");
    expect(payload.reviewPacket.type).toBe("review");
    expect(Array.isArray(payload.runtimeProbes)).toBe(true);
    expect(Array.isArray(payload.setupAnalysis.riskRegister)).toBe(true);
  });
});
