import { afterEach, describe, expect, it, vi } from "vitest";

import { nodebenchResearchTools } from "../tools/nodebenchResearchTools.js";

describe("nodebenchResearchTools", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODEBENCH_API_URL;
    delete process.env.NODEBENCH_API_KEY;
  });

  it("exposes nodebench.capture as the MCP wrapper for event capture persistence", async () => {
    process.env.NODEBENCH_API_URL = "https://api.test";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, result: { captureCount: 1 } }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const tool = nodebenchResearchTools.find((candidate) => candidate.name === "nodebench.capture");
    expect(tool).toBeTruthy();

    const result = await tool!.handler({
      text: "Met Alex from Orbital Labs. Wants healthcare design partners.",
      anonymousSessionId: "mcp-test-session",
    });

    expect(result).toEqual({ ok: true, result: { captureCount: 1 } });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/v1/event-captures",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("mcp-test-session"),
      }),
    );
  });

  it("exposes report export preview through the shared API route", async () => {
    process.env.NODEBENCH_API_URL = "https://api.test";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, result: { exportKey: "export.test", rows: [] } }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const tool = nodebenchResearchTools.find(
      (candidate) => candidate.name === "nodebench.report_export_preview",
    );
    expect(tool).toBeTruthy();

    const result = await tool!.handler({
      reportId: "abc123reportid",
      format: "crm_csv",
      anonymousSessionId: "mcp-test-session",
    });

    expect(result).toEqual({ ok: true, result: { exportKey: "export.test", rows: [] } });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/v1/reports/abc123reportid/exports/preview",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("mcp-test-session"),
      }),
    );
  });
});
