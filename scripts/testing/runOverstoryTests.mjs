import { spawn } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? process.cwd(),
    env: { ...process.env, ...(options.env ?? {}) },
    stdio: "inherit",
    shell: options.shell ?? false,
    windowsHide: true,
  });

  const exitCode = await Promise.race([
    new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", resolve);
    }),
    sleep(options.timeoutMs ?? 300_000).then(() => {
      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }
      throw new Error(`Timed out after ${options.timeoutMs ?? 300_000}ms`);
    }),
  ]);

  return Number(exitCode ?? 0);
}

async function main() {
  const repoRoot = process.cwd();
  const overstoryRoot = path.join(repoRoot, ".overstory", "engine");
  if (!existsSync(overstoryRoot)) {
    console.log("SKIP overstory-engine: .overstory/engine not present");
    return;
  }

  const bunCommand = process.platform === "win32" ? "bun.exe" : "bun";
  const versionCode = await runCommand(bunCommand, ["--version"], {
    cwd: repoRoot,
    timeoutMs: 15_000,
  }).catch(() => -1);

  if (versionCode !== 0) {
    console.log("SKIP overstory-engine: Bun is not installed in this environment");
    return;
  }

  const exitCode = await runCommand(bunCommand, ["test"], {
    cwd: overstoryRoot,
    timeoutMs: 300_000,
  });

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

await main();
