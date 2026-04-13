#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_NAME = "nodebench-mcp-power";
const DISPLAY_NAME = "NodeBench MCP Power";
const CLI_COMMAND = "nodebench-mcp-power";
const SERVER_KEY = "nodebench-power";
const DEFAULT_ARGS = ["--preset", "power"];
const CONFIG_ARGS = ["-y", PACKAGE_NAME];

function loadOwnVersion() {
  try {
    const raw = readFileSync(new URL("./package.json", import.meta.url), "utf8");
    const pkg = JSON.parse(raw);
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function resolveCorePackageJson() {
  const require = createRequire(import.meta.url);
  try {
    return require.resolve("nodebench-mcp/package.json");
  } catch {
    const localPath = resolve(dirname(fileURLToPath(import.meta.url)), "../mcp-local/package.json");
    if (existsSync(localPath)) return localPath;
    throw new Error("Could not resolve nodebench-mcp. Install nodebench-mcp or run this wrapper from the monorepo.");
  }
}

function resolveCoreEntry() {
  const packageJsonPath = resolveCorePackageJson();
  const packageDir = dirname(packageJsonPath);
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const binField = pkg?.bin;
  const relativeBin = typeof binField === "string" ? binField : binField?.["nodebench-mcp"];
  if (typeof relativeBin !== "string" || relativeBin.length === 0) {
    throw new Error("Could not resolve the nodebench-mcp binary entry.");
  }
  return resolve(packageDir, relativeBin);
}

function rejectIncompatibleArgs(args) {
  if (args.includes("--preset")) {
    console.error(`${CLI_COMMAND} fixes the preset to power. Use nodebench-mcp directly if you need a custom preset.`);
    process.exit(1);
  }
}

const userArgs = process.argv.slice(2);
rejectIncompatibleArgs(userArgs);

const child = spawn(
  process.execPath,
  [resolveCoreEntry(), ...DEFAULT_ARGS, ...userArgs],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODEBENCH_PACKAGE_NAME_OVERRIDE: PACKAGE_NAME,
      NODEBENCH_VERSION_OVERRIDE: loadOwnVersion(),
      NODEBENCH_DISPLAY_NAME_OVERRIDE: DISPLAY_NAME,
      NODEBENCH_CLI_COMMAND_OVERRIDE: CLI_COMMAND,
      NODEBENCH_NPX_PACKAGE_OVERRIDE: PACKAGE_NAME,
      NODEBENCH_SERVER_KEY_OVERRIDE: SERVER_KEY,
      NODEBENCH_CONFIG_COMMAND_OVERRIDE: "npx",
      NODEBENCH_CONFIG_ARGS_OVERRIDE: JSON.stringify(CONFIG_ARGS),
    },
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

