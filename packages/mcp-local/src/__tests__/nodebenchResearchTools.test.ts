import { describe, expect, it } from "vitest";

import { TOOLSET_LOADERS } from "../toolsetRegistry.js";

describe("nodebench_research toolset", () => {
  it("exposes the canonical NodeBench research bridge tools", async () => {
    const tools = await TOOLSET_LOADERS.nodebench_research();
    const names = tools.map((tool) => tool.name).sort();

    expect(names).toEqual([
      "nodebench.expand_resource",
      "nodebench.research_run",
    ]);
  });
});
