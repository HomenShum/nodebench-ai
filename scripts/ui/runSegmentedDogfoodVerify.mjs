import { existsSync, readFileSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
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

function readConvexEnvValue(name) {
  try {
    const value = execSync(`npx convex env get ${name}`, {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 15_000,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (!value || /not found|error/i.test(value)) return "";
    process.env[name] = value;
    return value;
  } catch {
    return "";
  }
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function parseTimeout(input, fallback) {
  const value = Number(input);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
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

async function runSegment(label, command, timeoutMs, retries = 0) {
  let attempt = 0;
  while (attempt <= retries) {
    console.log(`\n=== ${label}${retries > 0 ? ` (attempt ${attempt + 1}/${retries + 1})` : ""} ===`);
    const startedAt = Date.now();
    try {
      const exitCode = await runShell(command, { timeoutMs });
      const result = {
        label,
        exitCode,
        durationMs: Date.now() - startedAt,
        status: exitCode === 0 ? "passed" : "failed",
      };
      if (result.status === "passed" || attempt === retries) {
        return result;
      }
    } catch (error) {
      const result = {
        label,
        exitCode: 1,
        durationMs: Date.now() - startedAt,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      };
      if (attempt === retries) {
        return result;
      }
    }
    console.warn(`Retrying ${label} after failure...`);
    attempt += 1;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const geminiMode = String(args.get("gemini") ?? "auto").toLowerCase();
  const routeShards = Math.max(1, Number(args.get("routeShards") ?? process.env.DOGFOOD_ROUTE_SHARDS ?? 3));
  const captureTimeoutMs = parseTimeout(
    args.get("capture-timeout-ms") ?? process.env.DOGFOOD_CAPTURE_TIMEOUT_MS,
    900_000,
  );
  const verifyTimeoutMs = parseTimeout(
    args.get("verify-timeout-ms") ?? process.env.DOGFOOD_VERIFY_TIMEOUT_MS,
    120_000,
  );
  const geminiTimeoutMs = parseTimeout(
    args.get("gemini-timeout-ms") ?? process.env.DOGFOOD_GEMINI_TIMEOUT_MS,
    1_800_000,
  );
  const hasGeminiKey = Boolean(
    readEnvValue("GEMINI_API_KEY") ||
    readEnvValue("GOOGLE_AI_API_KEY") ||
    readConvexEnvValue("GEMINI_API_KEY") ||
    readConvexEnvValue("GOOGLE_AI_API_KEY"),
  );
  const shouldRunGemini =
    geminiMode === "require" || geminiMode === "auto" ? hasGeminiKey || geminiMode === "require" : false;

  const segments = [
    {
      label: "dogfood-capture",
      command: `npm run dogfood:full:local -- --routeShards ${routeShards}`,
      timeoutMs: captureTimeoutMs,
      retries: 1,
    },
    { label: "dogfood-artifact-verify", command: "npm run dogfood:verify:artifacts", timeoutMs: verifyTimeoutMs },
  ];

  if (shouldRunGemini) {
    segments.push(
      { label: "dogfood-gemini-qa", command: "npm run dogfood:qa:gemini", timeoutMs: geminiTimeoutMs, retries: 0 },
      { label: "dogfood-gemini-verify", command: "npm run dogfood:verify:gemini", timeoutMs: verifyTimeoutMs },
    );
  } else if (geminiMode === "require") {
    console.error("Gemini verification was required but no Gemini API key was found in env or .env.local.");
    process.exit(1);
  } else {
    console.log("Skipping Gemini QA segment because no Gemini API key is configured.");
  }

  const results = [];
  for (const segment of segments) {
    const result = await runSegment(
      segment.label,
      segment.command,
      segment.timeoutMs,
      segment.retries ?? 0,
    );
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
