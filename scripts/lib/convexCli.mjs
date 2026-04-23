import { execSync } from "node:child_process";
import { resolve } from "node:path";

function getRepoRoot() {
  return process.cwd();
}

function getConvexCliPath() {
  const root = getRepoRoot();
  return process.platform === "win32"
    ? resolve(root, "node_modules", ".bin", "convex.cmd")
    : resolve(root, "node_modules", ".bin", "convex");
}

function quoteForShell(value) {
  const text = String(value);
  if (process.platform === "win32") {
    return `"${text.replace(/"/g, '\\"')}"`;
  }
  return `'${text.replace(/'/g, `'\"'\"'`)}'`;
}

function tryParseJsonCandidate(candidate) {
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

export function parseJsonFromCommandOutput(output) {
  const trimmed = String(output ?? "").trim();
  if (!trimmed) {
    throw new Error("Convex CLI returned empty output");
  }

  const direct = tryParseJsonCandidate(trimmed);
  if (direct !== null) {
    return direct;
  }

  for (let index = trimmed.length - 1; index >= 0; index -= 1) {
    const char = trimmed[index];
    if (char !== "{" && char !== "[") continue;
    const candidate = trimmed.slice(index);
    const parsed = tryParseJsonCandidate(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  throw new Error(`Unable to parse JSON from Convex CLI output:\n${trimmed}`);
}

export function runConvexJson(functionName, args = {}, options = {}) {
  const cli = getConvexCliPath();
  const command = [
    quoteForShell(cli),
    "run",
    ...(options.push ? ["--push"] : []),
    quoteForShell(functionName),
    quoteForShell(JSON.stringify(args)),
  ].join(" ");

  const output = execSync(command, {
    cwd: options.cwd ?? getRepoRoot(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  return parseJsonFromCommandOutput(output);
}
