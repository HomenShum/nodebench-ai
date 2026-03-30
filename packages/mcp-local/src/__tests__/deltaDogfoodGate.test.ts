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

describe("delta_self_dogfood CI gate", () => {
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
        return mockJsonResponse(true, {
          status: "ok",
          toolsAvailable: 8,
          toolsExpected: 8,
          tools: [
            "founder_local_weekly_reset",
            "founder_local_synthesize",
            "founder_local_gather",
            "founder_direction_assessment",
            "run_recon",
            "enrich_entity",
            "detect_contradictions",
            "ingest_upload",
          ],
        });
      }
      if (url.includes("/sync-bridge/health")) {
        return mockJsonResponse(true, { status: "ok", service: "sync-bridge" });
      }
      if (url.includes("/retention/status")) {
        return mockJsonResponse(true, { connected: true, teamCode: "dogfood-delta", qaScore: 95 });
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

  it("fails if setup, trust, or return-loop health drops below the floor", async () => {
    const result = await getTool("delta_self_dogfood").handler({
      entity: "NodeBench Delta",
      include_review: true,
    }) as { content: Array<{ text: string }> };
    const payload = JSON.parse(result.content[0]!.text);
    const analysis = payload.setupAnalysis;

    expect(analysis.setupFrictionScore).toBeGreaterThanOrEqual(90);
    expect(analysis.accessibilityScore).toBeGreaterThanOrEqual(90);
    expect(analysis.riskRegister).toEqual([]);
    expect(analysis.angleCoverage.distribution).toBe("strong");
    expect(analysis.angleCoverage.setup).toBe("strong");
    expect(analysis.angleCoverage.trust).toBe("strong");
    expect(analysis.angleCoverage.returnLoops).toBe("strong");
  });
});
