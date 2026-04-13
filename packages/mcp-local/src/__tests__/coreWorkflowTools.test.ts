import { describe, expect, it } from "vitest";

import { TOOLSET_LOADERS } from "../toolsetRegistry.js";

describe("core_workflow toolset", () => {
  it("loads the v3 facade tools", async () => {
    const tools = await TOOLSET_LOADERS.core_workflow();
    const names = tools.map((tool) => tool.name).sort();

    expect(names).toEqual([
      "ask_context",
      "compare",
      "investigate",
      "report",
      "search",
      "summarize",
      "track",
    ]);
  });
});
