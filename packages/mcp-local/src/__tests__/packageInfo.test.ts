import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe("packageInfo", () => {
  it("prefers wrapper overrides when present", async () => {
    process.env.NODEBENCH_PACKAGE_NAME_OVERRIDE = "nodebench-mcp-power";
    process.env.NODEBENCH_VERSION_OVERRIDE = "9.9.9-test";
    process.env.NODEBENCH_DISPLAY_NAME_OVERRIDE = "NodeBench MCP Power";
    process.env.NODEBENCH_CLI_COMMAND_OVERRIDE = "nodebench-mcp-power";
    process.env.NODEBENCH_NPX_PACKAGE_OVERRIDE = "nodebench-mcp-power";
    process.env.NODEBENCH_SERVER_KEY_OVERRIDE = "nodebench-power";

    vi.resetModules();
    const mod = await import("../packageInfo.js");

    expect(mod.NODEBENCH_PACKAGE_NAME).toBe("nodebench-mcp-power");
    expect(mod.NODEBENCH_VERSION).toBe("9.9.9-test");
    expect(mod.NODEBENCH_DISPLAY_NAME).toBe("NodeBench MCP Power");
    expect(mod.NODEBENCH_CLI_COMMAND).toBe("nodebench-mcp-power");
    expect(mod.NODEBENCH_NPX_PACKAGE).toBe("nodebench-mcp-power");
    expect(mod.NODEBENCH_SERVER_KEY).toBe("nodebench-power");
  });
});
