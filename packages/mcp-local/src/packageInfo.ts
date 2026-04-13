import { readFileSync } from "node:fs";

type PackageJson = {
  name?: string;
  version?: string;
};

function loadPackageJson(): PackageJson {
  try {
    const raw = readFileSync(new URL("../package.json", import.meta.url), "utf-8");
    return JSON.parse(raw) as PackageJson;
  } catch {
    return {};
  }
}

function parseVersion(input: string): number[] {
  return input
    .split("-")[0]
    .split(".")
    .map((segment) => Number.parseInt(segment, 10))
    .map((segment) => (Number.isFinite(segment) ? segment : 0));
}

export function comparePackageVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

const packageJson = loadPackageJson();

function readOverride(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export const NODEBENCH_PACKAGE_NAME = readOverride("NODEBENCH_PACKAGE_NAME_OVERRIDE")
  ?? packageJson.name
  ?? "nodebench-mcp";

export const NODEBENCH_VERSION = readOverride("NODEBENCH_VERSION_OVERRIDE")
  ?? packageJson.version
  ?? "0.0.0";

export const NODEBENCH_DISPLAY_NAME = readOverride("NODEBENCH_DISPLAY_NAME_OVERRIDE")
  ?? "NodeBench MCP";

export const NODEBENCH_CLI_COMMAND = readOverride("NODEBENCH_CLI_COMMAND_OVERRIDE")
  ?? NODEBENCH_PACKAGE_NAME;

export const NODEBENCH_NPX_PACKAGE = readOverride("NODEBENCH_NPX_PACKAGE_OVERRIDE")
  ?? NODEBENCH_PACKAGE_NAME;

export const NODEBENCH_SERVER_KEY = readOverride("NODEBENCH_SERVER_KEY_OVERRIDE")
  ?? "nodebench";
