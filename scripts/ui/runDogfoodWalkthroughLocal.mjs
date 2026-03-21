import net from "node:net";
import path from "node:path";
import { existsSync } from "node:fs";
import { cp, rm, rename } from "node:fs/promises";
import { spawn } from "node:child_process";

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;
    const [k, v] = raw.split("=", 2);
    if (v !== undefined) args.set(k.slice(2), v);
    else args.set(k.slice(2), argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true");
  }
  return args;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function removePathRobustly(targetPath) {
  if (!existsSync(targetPath)) return;

  const attempts = 5;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await rm(targetPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
      return;
    } catch (error) {
      if (attempt === attempts - 1) {
        const quarantinePath = `${targetPath}.stale-${Date.now()}`;
        try {
          await rename(targetPath, quarantinePath);
          await rm(quarantinePath, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
          return;
        } catch {
          throw error;
        }
      }
      await sleep(300 * (attempt + 1));
    }
  }
}

async function killProcessTree(proc) {
  if (!proc || typeof proc.pid !== "number") return;
  try {
    proc.kill("SIGTERM");
  } catch {
    // ignore
  }

  const exited = await Promise.race([
    new Promise((resolve) => proc.once("exit", () => resolve(true))),
    sleep(8000).then(() => false),
  ]);
  if (exited) return;

  if (process.platform === "win32") {
    // Ensure we don't leave a stray `cmd.exe` / preview server running.
    try {
      const taskkill = spawn("taskkill", ["/PID", String(proc.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
        shell: false,
      });
      await Promise.race([
        new Promise((resolve) => taskkill.on("exit", resolve)),
        sleep(8000),
      ]);
      return;
    } catch {
      // ignore
    }
  }

  try {
    proc.kill("SIGKILL");
  } catch {
    // ignore
  }
}

async function waitForPort(host, port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      const socket = net.createConnection({ host, port });
      socket.once("connect", () => {
        socket.end();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
      socket.setTimeout(1200, () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (ok) return;
    await sleep(400);
  }
  throw new Error(`Timed out waiting for dev server at ${host}:${port}`);
}

async function waitForHttpOk(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      // Node 18+ has fetch; Node 23 is used in this repo.
      // eslint-disable-next-line no-undef
      const res = await fetch(url, { redirect: "follow" });
      if (res.status >= 200 && res.status < 500) return;
    } catch {
      // ignore
    }
    await sleep(450);
  }
  throw new Error(`Timed out waiting for HTTP at ${url}`);
}

async function syncDogfoodArtifactsToDist(repoRoot, distDir) {
  const publicDogfoodDir = path.join(repoRoot, "public", "dogfood");
  const distDogfoodDir = path.join(distDir, "dogfood");
  if (!existsSync(distDir) || !existsSync(publicDogfoodDir)) return false;

  await removePathRobustly(distDogfoodDir);
  await cp(publicDogfoodDir, distDogfoodDir, { recursive: true, force: true });
  return true;
}

async function runShellCommand(command, { cwd = process.cwd(), env = {} } = {}) {
  const child = spawn(command, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: true,
    windowsHide: true,
  });

  return await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(Number(code ?? 0)));
  });
}

async function findOpenPort(host, startPort, tries = 30) {
  for (let i = 0; i < tries; i++) {
    const port = startPort + i;
    // Probe by attempting to listen; if it binds, it's free.
    const ok = await new Promise((resolve) => {
      const srv = net.createServer();
      srv.once("error", () => resolve(false));
      srv.listen(port, host, () => {
        srv.close(() => resolve(true));
      });
    });
    if (ok) return port;
  }
  throw new Error(`No open port found near ${startPort}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const host = args.get("host") ?? "127.0.0.1";
  const requestedPort = Number(args.get("port") ?? 4173);
  const serverMode = args.get("server") ?? "preview"; // preview | dev
  const port = args.has("baseURL") ? requestedPort : await findOpenPort(host, requestedPort, 30);
  const baseURL = args.get("baseURL") ?? `http://${host}:${port}`;
  const headless = args.get("headless") ?? "true";
  const scribeOnly = (args.get("scribeOnly") ?? "false") === "true";
  const screens = (args.get("screens") ?? "false") === "true";
  const publish = (args.get("publish") ?? (screens ? "true" : "false")) === "true";
  const scenarios = (args.get("scenarios") ?? (screens ? "true" : "false")) === "true";
  const play = (args.get("play") ?? "false") === "true";
  const routeShards = Math.max(1, Number(args.get("routeShards") ?? process.env.DOGFOOD_ROUTE_SHARDS ?? 1));
  const includeInteractionLane = (args.get("interactions") ?? "true") !== "false";

  const repoRoot = process.cwd();
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const nodeCmd = process.execPath;
  const viteBin = path.join(repoRoot, "node_modules", "vite", "bin", "vite.js");
  const distDir = path.join(repoRoot, "dist");
  const staleScribeUserdataDir = path.join(repoRoot, "public", "dogfood", "scribe", "userdata");

  let serverProc;
  if (serverMode === "dev") {
    // Start Vite dev server (slow, HMR) and wait for it to accept connections.
    // eslint-disable-next-line no-console
    console.log(`Starting dev server: node ${viteBin}`);
    serverProc = spawn(nodeCmd, [viteBin, "--host", host, "--port", String(port), "--strictPort"], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
      windowsHide: true,
      shell: false,
    });
  } else {
    // Build + preview server (fast start, production-like behavior).
    await removePathRobustly(staleScribeUserdataDir);
    await removePathRobustly(distDir);
    let buildCode = 1;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      // eslint-disable-next-line no-console
      console.log(`Building: ${npmCmd} run build${attempt > 0 ? ` (retry ${attempt})` : ""}`);
      const build = spawn(`${npmCmd} run build`, {
        cwd: repoRoot,
        stdio: "inherit",
        env: { ...process.env },
        shell: true,
      });
      buildCode = await new Promise((resolve) => build.on("exit", resolve));
      if (buildCode === 0) break;

      await removePathRobustly(distDir);
      await sleep(500);
    }

    if (buildCode !== 0) throw new Error(`Build exited with code ${buildCode}`);

    // eslint-disable-next-line no-console
    console.log(`Starting preview server: node ${viteBin} preview --host ${host} --port ${port}`);
    serverProc = spawn(nodeCmd, [viteBin, "preview", "--host", host, "--port", String(port), "--strictPort"], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
      windowsHide: true,
      shell: false,
    });
  }

  serverProc.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", err);
  });
  serverProc.stdout.on("data", (buf) => process.stdout.write(String(buf)));
  serverProc.stderr.on("data", (buf) => process.stderr.write(String(buf)));

  try {
    await waitForPort(host, port, 240_000);
    await waitForHttpOk(baseURL, 240_000);

    if (screens) {
      // Route-by-route screenshot suite (writes test-results/full-ui-dogfood/*.png)
      // Use BASE_URL so Playwright points at the preview/dev server we just started.
      // eslint-disable-next-line no-console
      console.log(`Running dogfood e2e screenshots (BASE_URL=${baseURL}, routeShards=${routeShards})...`);
      const playwrightCommand = `${npxCmd} playwright test tests/e2e/full-ui-dogfood.spec.ts --project=chromium --workers=1`;
      const screenshotLanes = [];

      for (let shardIndex = 1; shardIndex <= routeShards; shardIndex += 1) {
        screenshotLanes.push(
          runShellCommand(playwrightCommand, {
            cwd: repoRoot,
            env: {
              BASE_URL: baseURL,
              DOGFOOD_ROUTE_SHARD_INDEX: String(shardIndex),
              DOGFOOD_ROUTE_SHARD_TOTAL: String(routeShards),
              DOGFOOD_INCLUDE_INTERACTIONS: "false",
              DOGFOOD_INCLUDE_ROUTES: "true",
              PLAYWRIGHT_HTML_OUTPUT_FOLDER: "off",
              PLAYWRIGHT_JSON_OUTPUT_FILE: "off",
            },
          }).then((code) => {
            if (code !== 0) {
              throw new Error(`Dogfood route shard ${shardIndex}/${routeShards} exited with code ${code}`);
            }
          }),
        );
      }

      if (includeInteractionLane) {
        screenshotLanes.push(
          runShellCommand(playwrightCommand, {
            cwd: repoRoot,
            env: {
              BASE_URL: baseURL,
              DOGFOOD_ROUTE_SHARD_INDEX: "1",
              DOGFOOD_ROUTE_SHARD_TOTAL: "1",
              DOGFOOD_INCLUDE_INTERACTIONS: "true",
              DOGFOOD_INCLUDE_ROUTES: "false",
              PLAYWRIGHT_HTML_OUTPUT_FOLDER: "off",
              PLAYWRIGHT_JSON_OUTPUT_FILE: "off",
            },
          }).then((code) => {
            if (code !== 0) {
              throw new Error(`Dogfood interaction lane exited with code ${code}`);
            }
          }),
        );
      }

      await Promise.all(screenshotLanes);

      if (publish) {
        // Publish screenshots to /public so /dogfood can render them.
        // eslint-disable-next-line no-console
        console.log("Publishing screenshot manifest to public/dogfood...");
        const pubCode = await runShellCommand(`${npmCmd} run dogfood:publish`, {
          cwd: repoRoot,
        });
        if (pubCode !== 0) throw new Error(`dogfood:publish exited with code ${pubCode}`);
      }
    }

    // Capture Scribe artifact (writes public/dogfood/scribe.*)
    const scribe = spawn(
      "node",
      [
        path.join("scripts", "ui", "captureDogfoodScribe.mjs"),
        "--baseURL",
        baseURL,
        "--headless",
        headless,
      ],
      { cwd: repoRoot, stdio: "inherit", env: { ...process.env } },
    );
      const scribeCode = await new Promise((resolve) => scribe.on("exit", resolve));
      if (scribeCode !== 0) throw new Error(`Scribe capture exited with code ${scribeCode}`);

    if (!scribeOnly) {
      // Record walkthrough (writes public/dogfood/walkthrough.json + video file)
      const recorder = spawn(
        "node",
        [
          path.join("scripts", "ui", "recordDogfoodWalkthrough.mjs"),
          "--publish",
          "static",
          "--baseURL",
          baseURL,
          "--headless",
          headless,
        ],
        { cwd: repoRoot, stdio: "inherit", env: { ...process.env } },
      );

      const code = await new Promise((resolve) => recorder.on("exit", resolve));
      if (code !== 0) {
        throw new Error(`Recorder exited with code ${code}`);
      }

      // Extract key frames for visual QA (writes public/dogfood/frames.json + frames/*)
      const frames = spawn(`${npmCmd} run dogfood:frames`, {
        cwd: repoRoot,
        stdio: "inherit",
        env: { ...process.env },
        shell: true,
      });
      const framesCode = await new Promise((resolve) => frames.on("exit", resolve));
      if (framesCode !== 0) throw new Error(`dogfood:frames exited with code ${framesCode}`);
    }

    if (serverMode !== "dev") {
      const synced = await syncDogfoodArtifactsToDist(repoRoot, distDir);
      if (synced) {
        // eslint-disable-next-line no-console
        console.log("Synced public/dogfood artifacts into dist/dogfood for preview-mode verification.");
      }
    }

    if (scenarios) {
      // Scenario regression suite: validates motion-safety + dogfood artifact ingestion in the UI.
      // eslint-disable-next-line no-console
      console.log(`Running scenario regression suite (BASE_URL=${baseURL})...`);
      const scen = spawn(
        `${npxCmd} playwright test tests/e2e/scenario-regression.spec.ts --project=chromium --workers=1`,
        {
          cwd: repoRoot,
          stdio: "inherit",
          env: {
            ...process.env,
            BASE_URL: baseURL,
            PLAYWRIGHT_HTML_OUTPUT_FOLDER: "off",
            PLAYWRIGHT_JSON_OUTPUT_FILE: "off",
          },
          shell: true,
        },
      );
      const scenCode = await new Promise((resolve) => scen.on("exit", resolve));
      if (scenCode !== 0) throw new Error(`Scenario regression suite exited with code ${scenCode}`);
    }
  } finally {
    await killProcessTree(serverProc);
  }

  // eslint-disable-next-line no-console
  console.log("\nDogfood artifacts recorded. Open:");
  // eslint-disable-next-line no-console
  console.log("  public/dogfood/scribe.md");
  if (!scribeOnly) {
    // eslint-disable-next-line no-console
    console.log("  public/dogfood/walkthrough.mp4");
    // eslint-disable-next-line no-console
    console.log("  (or public/dogfood/walkthrough.webm if mp4 transcoding was unavailable)");
  }
  if (screens) {
    // eslint-disable-next-line no-console
    console.log("  public/dogfood/manifest.json");
  }

  if (play && !scribeOnly) {
    const candidate = path.resolve(repoRoot, "public", "dogfood", "walkthrough.mp4");
    const fallback = path.resolve(repoRoot, "public", "dogfood", "walkthrough.webm");
    const fileToOpen = existsSync(candidate) ? candidate : fallback;
    if (!existsSync(fileToOpen)) return;
    const opener =
      process.platform === "win32"
        ? { cmd: "cmd", args: ["/c", "start", "", fileToOpen] }
        : process.platform === "darwin"
          ? { cmd: "open", args: [fileToOpen] }
          : { cmd: "xdg-open", args: [fileToOpen] };

    const p = spawn(opener.cmd, opener.args, { stdio: "ignore", detached: true, shell: false });
    p.unref();
  }
}

try {
  await main();
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
