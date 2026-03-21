import { afterEach, describe, expect, it, vi } from "vitest";
import { deepSimTools } from "../tools/deepSimTools.js";

const originalConvexUrl = process.env.CONVEX_URL;
const originalSiteUrl = process.env.CONVEX_SITE_URL;
const originalViteConvexUrl = process.env.VITE_CONVEX_URL;
const originalSecret = process.env.MCP_SECRET;

afterEach(() => {
  if (originalConvexUrl === undefined) {
    delete process.env.CONVEX_URL;
  } else {
    process.env.CONVEX_URL = originalConvexUrl;
  }

  if (originalSiteUrl === undefined) {
    delete process.env.CONVEX_SITE_URL;
  } else {
    process.env.CONVEX_SITE_URL = originalSiteUrl;
  }

  if (originalViteConvexUrl === undefined) {
    delete process.env.VITE_CONVEX_URL;
  } else {
    process.env.VITE_CONVEX_URL = originalViteConvexUrl;
  }

  if (originalSecret === undefined) {
    delete process.env.MCP_SECRET;
  } else {
    process.env.MCP_SECRET = originalSecret;
  }

  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("deepSimTools", () => {
  it("exports the expected Deep Sim MCP tools", () => {
    expect(deepSimTools.map((tool) => tool.name)).toEqual([
      "build_claim_graph",
      "extract_variables",
      "generate_countermodels",
      "run_deep_sim",
      "rank_interventions",
      "score_compounding",
      "render_decision_memo",
    ]);
  });

  it("returns a configuration error when env vars are missing", async () => {
    delete process.env.CONVEX_URL;
    delete process.env.CONVEX_SITE_URL;
    delete process.env.VITE_CONVEX_URL;
    delete process.env.MCP_SECRET;

    const tool = deepSimTools.find((entry) => entry.name === "build_claim_graph");
    const result = (await tool!.handler({
      entityKey: "company/acme-ai",
      sources: ["Source A"],
    })) as any;

    expect(result.error).toBe(true);
    expect(result.message).toContain("MCP_SECRET");
  });

  it("normalizes convex.cloud to convex.site and clamps maxVariables", async () => {
    process.env.CONVEX_URL = "https://example.convex.cloud/";
    delete process.env.CONVEX_SITE_URL;
    delete process.env.VITE_CONVEX_URL;
    process.env.MCP_SECRET = "deep-sim-secret";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            variables: [{ name: "Market timing", weight: 0.2 }],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tool = deepSimTools.find((entry) => entry.name === "extract_variables");
    const result = (await tool!.handler({
      entityKey: "company/acme-ai",
      maxVariables: 99,
    })) as any;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://example.convex.site/api/mcpGateway");
    expect(JSON.parse(init.body)).toEqual({
      fn: "extractVariables",
      args: {
        entityKey: "company/acme-ai",
        claimGraphId: undefined,
        variableCategories: ["intrinsic", "temporal", "network", "intervention", "market", "constraint"],
        maxVariables: 30,
      },
    });
    expect(result.success).toBe(true);
    expect(result.data.variables[0].name).toBe("Market timing");
  });

  it("passes through backend errors for memo rendering", async () => {
    process.env.CONVEX_SITE_URL = "https://example.convex.site";
    process.env.MCP_SECRET = "deep-sim-secret";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: "scenario graph not found",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tool = deepSimTools.find((entry) => entry.name === "render_decision_memo");
    const result = (await tool!.handler({
      entityKey: "company/acme-ai",
      workflow: "investor_diligence",
    })) as any;

    expect(result.error).toBe(true);
    expect(result.message).toContain("scenario graph not found");
  });
});
