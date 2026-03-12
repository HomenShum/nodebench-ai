import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;
    const [key, value] = raw.split("=", 2);
    if (value !== undefined) args.set(key.slice(2), value);
    else args.set(key.slice(2), argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true");
  }
  return args;
}

function readEnvValue(name) {
  if (process.env[name]) return process.env[name];

  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return "";

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key === name) return value;
  }

  return "";
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

async function runShell(command, { timeoutMs = 900_000 } = {}) {
  const child = spawn(command, {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: "inherit",
    shell: true,
    windowsHide: true,
  });

  return await Promise.race([
    new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code) => resolve(Number(code ?? 0)));
    }),
    new Promise((_, reject) => {
      setTimeout(() => {
        try {
          child.kill("SIGTERM");
        } catch {
          // ignore
        }
        reject(new Error(`Timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

async function runSegment(label, command, timeoutMs) {
  console.log(`\n=== ${label} ===`);
  const startedAt = Date.now();
  try {
    const exitCode = await runShell(command, { timeoutMs });
    return {
      label,
      exitCode,
      durationMs: Date.now() - startedAt,
      status: exitCode === 0 ? "passed" : "failed",
    };
  } catch (error) {
    return {
      label,
      exitCode: 1,
      durationMs: Date.now() - startedAt,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const geminiMode = String(args.get("gemini") ?? "auto").toLowerCase();
  const routeShards = Math.max(1, Number(args.get("routeShards") ?? process.env.DOGFOOD_ROUTE_SHARDS ?? 3));
  const hasGeminiKey = Boolean(readEnvValue("GEMINI_API_KEY") || readEnvValue("GOOGLE_AI_API_KEY"));
  const shouldRunGemini =
    geminiMode === "require" || geminiMode === "auto" ? hasGeminiKey || geminiMode === "require" : false;

  const segments = [
    {
      label: "dogfood-capture",
      command: `npm run dogfood:full:local -- --routeShards ${routeShards}`,
      timeoutMs: 900_000,
    },
    { label: "dogfood-artifact-verify", command: "npm run dogfood:verify:artifacts", timeoutMs: 120_000 },
  ];

  if (shouldRunGemini) {
    segments.push(
      { label: "dogfood-gemini-qa", command: "npm run dogfood:qa:gemini", timeoutMs: 900_000 },
      { label: "dogfood-gemini-verify", command: "npm run dogfood:verify:gemini", timeoutMs: 120_000 },
    );
  } else if (geminiMode === "require") {
    console.error("Gemini verification was required but no Gemini API key was found in env or .env.local.");
    process.exit(1);
  } else {
    console.log("Skipping Gemini QA segment because no Gemini API key is configured.");
  }

  const results = [];
  for (const segment of segments) {
    const result = await runSegment(segment.label, segment.command, segment.timeoutMs);
    results.push(result);
    if (result.status === "failed") {
      break;
    }
  }

  console.log("\nSegmented dogfood summary:");
  for (const result of results) {
    const suffix = result.error ? ` (${result.error})` : "";
    console.log(`- ${result.label}: ${result.status} in ${formatDuration(result.durationMs)}${suffix}`);
  }

  if (results.some((result) => result.status === "failed")) {
    process.exit(1);
  }
}

try {
  await main();
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
