import { describe, expect, it } from "vitest";

import { getRequestedPreset, resolveRuntimeFlags } from "../runtimeConfig.js";

describe("runtimeConfig", () => {
  it("defaults to the core preset", () => {
    expect(getRequestedPreset([])).toBe("default");
    const flags = resolveRuntimeFlags([], "default");
    expect(flags.enableEmbedding).toBe(false);
    expect(flags.enableDashboards).toBe(false);
    expect(flags.enableWatchdog).toBe(false);
  });

  it("enables admin runtime surfaces explicitly", () => {
    const flags = resolveRuntimeFlags(["--admin"], "default");
    expect(flags.enableDashboards).toBe(true);
    expect(flags.enableWatchdog).toBe(true);
  });

  it("keeps extended presets on the richer runtime path", () => {
    const flags = resolveRuntimeFlags(["--preset", "power"], "power");
    expect(flags.enableEmbedding).toBe(true);
    expect(flags.enableDashboards).toBe(false);
  });
});
