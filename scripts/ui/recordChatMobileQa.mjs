import path from "node:path";
import fs from "node:fs/promises";
import net from "node:net";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  throw new Error(`Timed out waiting for server at ${host}:${port}`);
}

async function waitForHttpOk(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.status === 200) return;
    } catch {
      // ignore
    }
    await sleep(450);
  }
  throw new Error(`Timed out waiting for HTTP at ${url}`);
}

async function waitForFileReady(filePath, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastSize = -1;
  while (Date.now() < deadline) {
    try {
      const stat = await fs.stat(filePath);
      if (stat.size > 0 && stat.size === lastSize) {
        return;
      }
      lastSize = stat.size;
    } catch {
      // ignore while file is still materializing
    }
    await sleep(350);
  }
  throw new Error(`Timed out waiting for recorded video to flush: ${filePath}`);
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
    try {
      const taskkill = spawn("taskkill", ["/PID", String(proc.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
        shell: false,
      });
      await Promise.race([new Promise((resolve) => taskkill.on("exit", resolve)), sleep(8000)]);
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

async function findOpenPort(host, startPort, tries = 30) {
  for (let i = 0; i < tries; i += 1) {
    const port = startPort + i;
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
  const repoRoot = process.cwd();
  const host = args.get("host") ?? "127.0.0.1";
  const requestedPort = Number(args.get("port") ?? 4192);
  const baseURLArg = args.get("baseURL") ?? null;
  const outputArg = args.get("output") ?? ".tmp/dogfood-gemini-qa/chat-mobile-qa.webm";
  const includeBlankState = /^(1|true|yes)$/i.test(String(args.get("include-blank") ?? "false"));
  const anonymousSessionId =
    args.get("anonymous-session-id") ?? "83913d64-c3b7-43e1-afc5-184430bc7f5c";
  const sessionId = args.get("session-id") ?? "hh914wsd8nzzfkh6ddsw3wyef185bf38";
  const prompt = String(
    args.get("prompt") ?? "Tell me about Perplexity AI and why it matters.",
  ).trim();
  const liveFlow = /^(1|true|yes)$/i.test(String(args.get("live-flow") ?? "false"));
  const postSubmitMs = Number(args.get("post-submit-ms") ?? 18_000);
  const holdTopMs = Number(args.get("hold-top-ms") ?? 6_000);
  const disableScroll = /^(1|true|yes)$/i.test(String(args.get("disable-scroll") ?? "true"));
  const outputPath = path.resolve(repoRoot, outputArg);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const videoDir = path.dirname(outputPath);

  const nodeCmd = process.execPath;
  const viteBin = path.join(repoRoot, "node_modules", "vite", "bin", "vite.js");
  const shouldStartPreview = !baseURLArg;
  const basePort = shouldStartPreview ? await findOpenPort(host, requestedPort, 30) : requestedPort;
  const baseURL = baseURLArg ?? `http://${host}:${basePort}`;

  let previewProc = null;
  try {
    if (shouldStartPreview) {
      const distIndex = path.join(repoRoot, "dist", "index.html");
      if (!existsSync(distIndex)) {
        throw new Error("Missing dist build. Run `npm run build` before recording chat QA.");
      }

      previewProc = spawn(nodeCmd, [viteBin, "preview", "--host", host, "--port", String(basePort), "--strictPort"], {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        shell: false,
      });
      previewProc.stdout.on("data", (buf) => process.stdout.write(String(buf)));
      previewProc.stderr.on("data", (buf) => process.stderr.write(String(buf)));

      await waitForPort(host, basePort, 120_000);
      await waitForHttpOk(baseURL, 120_000);
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      screen: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
      colorScheme: "dark",
      reducedMotion: "reduce",
      recordVideo: {
        dir: videoDir,
        size: { width: 390, height: 844 },
      },
    });
    const page = await context.newPage();

    await page.addInitScript((anonId) => {
      if (anonId) {
        window.localStorage.setItem("nodebench:product-anon-session", anonId);
      }
    }, anonymousSessionId);

    if (includeBlankState) {
      await page.goto(`${baseURL}/?surface=chat&fresh=${Date.now()}`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
      await page.waitForTimeout(1800);
    }

    if (liveFlow) {
      await page.goto(`${baseURL}/?surface=chat&fresh=${Date.now()}`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1500);

      const anonButton = page.getByRole("button", { name: /sign in anonymously/i });
      if (await anonButton.count()) {
        await anonButton.first().click().catch(() => {});
        await page.waitForTimeout(2200);
      }

      const composer = page.locator("textarea").first();
      await composer.waitFor({ state: "visible", timeout: 30_000 });
      await composer.fill(prompt);
      await page.waitForTimeout(450);

      const submit = page.getByRole("button", { name: /ask nodebench/i });
      await submit.click({ timeout: 15_000 });
      await page.waitForTimeout(1200);

      await page.waitForFunction(
        () =>
          window.location.search.includes("session=") ||
          document.body.innerText.includes("Task progress") ||
          document.body.innerText.includes("WORKING") ||
          document.body.innerText.includes("THINKING"),
        null,
        { timeout: 30_000 },
      ).catch(() => {});

      await page.waitForTimeout(postSubmitMs);
      await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
      await page.waitForTimeout(holdTopMs);

      if (!disableScroll) {
        await page.mouse.wheel(0, 80);
        await page.waitForTimeout(800);
        await page.mouse.wheel(0, 80);
        await page.waitForTimeout(900);
      }
    } else {
      await page.goto(
        `${baseURL}/?surface=chat&session=${sessionId}&fresh=${Date.now()}`,
        { waitUntil: "domcontentloaded" },
      );
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
      await page.waitForTimeout(2400);
      await page.waitForTimeout(holdTopMs);

      if (!disableScroll) {
        await page.mouse.wheel(0, 120);
        await page.waitForTimeout(900);
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(900);
      }
    }

    const videoHandle = page.video();
    await page.close();
    await context.close();
    await browser.close();

    const recordedPath = await videoHandle?.path();
    if (!recordedPath) {
      throw new Error("Playwright did not return a recorded video path");
    }

    await waitForFileReady(recordedPath, 30_000);
    await fs.copyFile(recordedPath, outputPath);
    // eslint-disable-next-line no-console
    console.log(`Chat mobile QA video written to: ${outputPath}`);
  } finally {
    await killProcessTree(previewProc);
  }
}

await main();
