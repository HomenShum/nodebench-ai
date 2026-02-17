import net from "node:net";
import path from "node:path";
import { existsSync } from "node:fs";
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
  const play = (args.get("play") ?? "false") === "true";

  const repoRoot = process.cwd();
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

  let serverProc;
  if (serverMode === "dev") {
    // Start Vite dev server (slow, HMR) and wait for it to accept connections.
    // eslint-disable-next-line no-console
    console.log(`Starting dev server: ${npmCmd} run dev:frontend`);
    serverProc = spawn(`${npmCmd} run dev:frontend`, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
      shell: true,
    });
  } else {
    // Build + preview server (fast start, production-like behavior).
    // eslint-disable-next-line no-console
    console.log(`Building: ${npmCmd} run build`);
    const build = spawn(`${npmCmd} run build`, {
      cwd: repoRoot,
      stdio: "inherit",
      env: { ...process.env },
      shell: true,
    });
    const buildCode = await new Promise((resolve) => build.on("exit", resolve));
    if (buildCode !== 0) throw new Error(`Build exited with code ${buildCode}`);

    // eslint-disable-next-line no-console
    console.log(`Starting preview server: ${npxCmd} vite preview --host ${host} --port ${port}`);
    serverProc = spawn(`${npxCmd} vite preview --host ${host} --port ${port} --strictPort`, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
      shell: true,
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
    }
  } finally {
    serverProc.kill("SIGTERM");
  }

  // eslint-disable-next-line no-console
  console.log("\nDogfood artifacts recorded. Open:");
  // eslint-disable-next-line no-console
  console.log("  public/dogfood/scribe.md");
  // eslint-disable-next-line no-console
  console.log("  public/dogfood/walkthrough.mp4");
  // eslint-disable-next-line no-console
  console.log("  (or public/dogfood/walkthrough.webm if mp4 transcoding was unavailable)");

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

await main();
