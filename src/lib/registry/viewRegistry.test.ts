import { describe, expect, it } from "vitest";

import { resolvePathToView } from "./viewRegistry";

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
});
