import { afterEach, describe, expect, it, vi } from "vitest";
import { dimensionTools } from "../tools/dimensionTools.js";

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

describe("dimensionTools", () => {
  it("exports the expected DeepTrace dimension MCP tools", () => {
    const names = dimensionTools.map((tool) => tool.name);
    expect(names).toEqual([
      "compute_dimension_profile",
      "get_dimension_profile",
      "list_dimension_snapshots",
      "list_dimension_evidence",
      "list_dimension_interactions",
      "export_dimension_bundle",
    ]);
  });

  it("returns a configuration error when required env vars are missing", async () => {
    delete process.env.CONVEX_URL;
    delete process.env.CONVEX_SITE_URL;
    delete process.env.VITE_CONVEX_URL;
    delete process.env.MCP_SECRET;

    const tool = dimensionTools.find((entry) => entry.name === "compute_dimension_profile");
    expect(tool).toBeDefined();

    const result = await tool!.handler({ entityKey: "company/acme-ai" }) as any;
    expect(result.error).toBe(true);
    expect(result.message).toContain("MCP_SECRET");
  });

  it("normalizes convex.cloud to convex.site and posts the expected payload", async () => {
    process.env.CONVEX_URL = "https://example.convex.cloud/";
    delete process.env.CONVEX_SITE_URL;
    delete process.env.VITE_CONVEX_URL;
    process.env.MCP_SECRET = "dimension-secret";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            entityKey: "company/acme-ai",
            regimeLabel: "measured_scale",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tool = dimensionTools.find((entry) => entry.name === "compute_dimension_profile");
    const result = await tool!.handler({
      entityKey: "company/acme-ai",
      entityName: "Acme AI",
      entityType: "company",
      triggerEventKey: "funding_round_seed",
    }) as any;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://example.convex.site/api/mcpGateway");
    expect(init.method).toBe("POST");
    expect(init.headers["x-mcp-secret"]).toBe("dimension-secret");
    expect(JSON.parse(init.body)).toEqual({
      fn: "refreshDimensionProfile",
      args: {
        entityKey: "company/acme-ai",
        entityName: "Acme AI",
        entityType: "company",
        triggerEventKey: "funding_round_seed",
      },
    });
    expect(result.success).toBe(true);
    expect(result.data.regimeLabel).toBe("measured_scale");
  });

  it("passes through backend errors for bundle export", async () => {
    process.env.CONVEX_SITE_URL = "https://example.convex.site";
    process.env.MCP_SECRET = "dimension-secret";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: "profile not found",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tool = dimensionTools.find((entry) => entry.name === "export_dimension_bundle");
    const result = await tool!.handler({
      entityKey: "company/missing",
      snapshotLimit: 4,
    }) as any;

    expect(result.error).toBe(true);
    expect(result.message).toContain("profile not found");
  });
});
