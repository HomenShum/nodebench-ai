import { describe, expect, it } from "vitest";

import { resolvePathToCockpitState, resolvePathToView } from "./viewRegistry";

describe("resolvePathToView", () => {
  it("resolves the world monitor research route as its own view", () => {
    expect(resolvePathToView("/research/world-monitor")).toMatchObject({
      view: "world-monitor",
      researchTab: "overview",
    });
  });

  it("resolves the watchlists research route as its own view", () => {
    expect(resolvePathToView("/research/watchlists")).toMatchObject({
      view: "watchlists",
      researchTab: "overview",
    });
  });

  it("keeps research tabs routed to the research hub", () => {
    expect(resolvePathToView("/research/signals")).toMatchObject({
      view: "research",
      researchTab: "signals",
    });
  });

  it("resolves the MCP ledger direct route instead of falling back to ask", () => {
    expect(resolvePathToView("/mcp/ledger")).toMatchObject({
      view: "mcp-ledger",
      researchTab: "overview",
      isUnknownRoute: false,
    });
  });

  it("maps the MCP ledger direct route to the trace surface", () => {
    expect(resolvePathToCockpitState("/mcp/ledger")).toMatchObject({
      surfaceId: "trace",
      view: "mcp-ledger",
      isUnknownRoute: false,
    });
  });
});
