import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import net from "node:net";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

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

async function scrapeRecentRuns(page) {
  return await page.evaluate(() => {
    const recentLabel = Array.from(document.querySelectorAll("div")).find(
      (el) => el.textContent?.trim().toLowerCase() === "recent runs",
    );
    if (!recentLabel) return [];
    const container = recentLabel.closest("div.space-y-3");
    if (!container) return [];

    const runCards = Array.from(container.querySelectorAll("div.rounded-md")).filter((el) =>
      el.textContent?.includes("Summary"),
    );

    return runCards.slice(0, 4).map((card) => {
      const summary = (card.querySelector("div.text-sm.text-muted-foreground.whitespace-pre-wrap")?.textContent ?? "").trim();
      const issues = Array.from(card.querySelectorAll("div.rounded-md.border.border-border\\/60.bg-card")).map((issue) => {
        const header = issue.querySelector("div.text-sm.font-medium")?.textContent ?? "";
        const details = (issue.querySelector("div.mt-1.text-sm.text-muted-foreground.whitespace-pre-wrap")?.textContent ?? "").trim();
        const suggestedFix = (issue.querySelector("div.mt-2.text-sm.text-foreground.whitespace-pre-wrap")?.textContent ?? "").trim();
        const route = (issue.querySelector("div.text-xs.text-muted-foreground.font-mono")?.textContent ?? "").trim();
        const ts = (issue.querySelector("div.text-xs.text-muted-foreground.font-mono")?.textContent ?? "").trim();
        return { header: header.trim(), route, ts, details, suggestedFix };
      });
      return { summary, issues };
    });
  });
}

async function readLatestLabel(page) {
  try {
    const label = await page.getByText(/^latest:/i).first().textContent({ timeout: 2000 });
    return (label ?? "").trim();
  } catch {
    return "";
  }
}

async function ensureAnonymousSignIn(page) {
  const dogfoodSignIn = page.getByTestId("dogfood-sign-in").first();
  if (await dogfoodSignIn.isVisible().catch(() => false)) {
    await dogfoodSignIn.click({ timeout: 15_000 });

    const outcome = await Promise.race([
      dogfoodSignIn.waitFor({ state: "hidden", timeout: 120_000 }).then(() => "ok"),
      page.getByText(/qa error:/i).first().waitFor({ timeout: 120_000 }).then(() => "err"),
    ]);
    if (outcome === "err") {
      const errText = (await page.getByText(/qa error:/i).first().textContent().catch(() => "")) || "";
      throw new Error(errText.replace(/^qa error:\s*/i, "").trim() || "Anonymous sign-in failed");
    }

    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(800);
    return;
  }

  const previewBanner = page.getByText(/you're in preview mode/i).first();
  const signInBtn = page.getByRole("button", { name: /^sign in$/i }).first();

  const bannerVisible =
    (await previewBanner.isVisible().catch(() => false)) || (await signInBtn.isVisible().catch(() => false));
  if (!bannerVisible) return;

  await signInBtn.click({ timeout: 15_000 });

  // Wait until auth state flips (banner removed) or an explicit error appears.
  const outcome = await Promise.race([
    previewBanner.waitFor({ state: "hidden", timeout: 120_000 }).then(() => "ok"),
    page.getByText(/failed to sign in anonymously/i).waitFor({ timeout: 120_000 }).then(() => "err"),
  ]);
  if (outcome === "err") {
    throw new Error("Anonymous sign-in failed");
  }

  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(800);
}

// Archive the previous QA run's output before overwriting.
// This gives a before/after for any Gemini or visual diff.
async function archivePreviousRun(outDir) {
  let entries;
  try {
    entries = await fs.readdir(outDir);
  } catch {
    return; // first run — nothing to archive
  }
  if (!entries.length) return;

  const archiveBase = path.join(outDir, "..", "archive");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const archiveDir = path.join(archiveBase, stamp);
  await fs.mkdir(archiveDir, { recursive: true });

  for (const entry of entries) {
    if (entry === "archive") continue; // never recurse
    try {
      await fs.rename(path.join(outDir, entry), path.join(archiveDir, entry));
    } catch {
      // ignore move failures (e.g. cross-device) — just continue
    }
  }
}

// Compute a numeric quality score from scraped QA issues.
// Severity buckets are keyword-heuristic: not perfect but deterministic.
function computeQaScore(videoRuns, screenRuns) {
  const allIssues = [
    ...(videoRuns?.[0]?.issues ?? []),
    ...(screenRuns?.[0]?.issues ?? []),
  ];

  const critical = allIssues.filter((i) =>
    /critical|error|broken|fail|cannot|crash|missing entirely|not render/i.test(
      (i.header ?? "") + " " + (i.details ?? "")
    )
  ).length;

  const warning = allIssues.filter((i) =>
    /warn|missing|overlap|overflow|truncat|wrong|incorrect|inconsistent|contrast/i.test(
      (i.header ?? "") + " " + (i.details ?? "")
    )
  ).length;

  const info = allIssues.length - critical - warning;

  // Scoring: start at 100, deduct per-issue by severity
  const score = Math.max(0, 100 - critical * 20 - warning * 10 - info * 2);
  const grade =
    score >= 90 ? "A" :
    score >= 75 ? "B" :
    score >= 60 ? "C" :
    score >= 40 ? "D" : "F";

  return { score, grade, critical, warning, info, total: allIssues.length };
}

// Append a scored result to public/dogfood/qa-results.json (capped at 100 entries).
async function persistQaScore(repoRoot, videoRuns, screenRuns) {
  const qaResultsPath = path.join(repoRoot, "public", "dogfood", "qa-results.json");

  let history = [];
  try {
    const raw = await fs.readFile(qaResultsPath, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) history = parsed;
  } catch {
    // first run or malformed — start fresh
  }

  const qscore = computeQaScore(videoRuns, screenRuns);
  const entry = {
    timestamp: new Date().toISOString(),
    runType: "gemini-qa",
    ...qscore,
    videoIssues: videoRuns?.[0]?.issues?.length ?? 0,
    screenshotIssues: screenRuns?.[0]?.issues?.length ?? 0,
    videoSummary: (videoRuns?.[0]?.summary ?? "").slice(0, 400),
    screenSummary: (screenRuns?.[0]?.summary ?? "").slice(0, 400),
  };

  history.unshift(entry);
  if (history.length > 100) history.length = 100;

  await fs.writeFile(qaResultsPath, JSON.stringify(history, null, 2), "utf8");
  // eslint-disable-next-line no-console
  console.log(`Gemini QA score: ${entry.score}/100 (${entry.grade}) — ${entry.total} issues (${entry.critical} critical, ${entry.warning} warnings)`);
  // eslint-disable-next-line no-console
  console.log(`QA history appended → ${qaResultsPath}`);

  return entry;
}

async function throwIfQaErrorVisible(page, label) {
  const err = page.getByText(/qa error:/i).first();
  if (!(await err.isVisible().catch(() => false))) return;
  const errText = (await err.textContent().catch(() => "")) || "";
  throw new Error(`${label}: ${errText.replace(/^qa error:\s*/i, "").trim() || "QA failed"}`);
}

async function runQaAndCapture({ baseURL, headless }) {
  const outDir = path.join(process.cwd(), ".tmp", "dogfood-gemini-qa");
  // Archive previous run before overwriting — preserves before/after for regression diffs.
  await archivePreviousRun(outDir);
  await fs.mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const debugLines = [];
  page.on("console", (msg) => {
    try {
      debugLines.push(`[console:${msg.type()}] ${msg.text()}`);
    } catch {
      // ignore
    }
  });
  page.on("pageerror", (err) => {
    debugLines.push(`[pageerror] ${err?.message ?? String(err)}`);
  });
  page.on("requestfailed", (req) => {
    debugLines.push(`[requestfailed] ${req.url()} :: ${req.failure()?.errorText ?? "unknown"}`);
  });
  page.on("response", async (res) => {
    try {
      const url = res.url();
      if (!/convex\.cloud|\/api\//i.test(url)) return;
      if (res.status() < 400) return;
      let body = "";
      try {
        body = await res.text();
      } catch {
        body = "<unreadable>";
      }
      debugLines.push(`[response ${res.status()}] ${url} :: ${body.slice(0, 2000)}`);
    } catch {
      // ignore
    }
  });

  try {
    await page.goto(`${baseURL}/dogfood`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /design dogfood/i }).first().waitFor({ timeout: 120_000 });
    await ensureAnonymousSignIn(page);

    const runVideo = page.getByRole("button", { name: /run gemini qa on video/i });
    await page.waitForFunction(() => {
      const btn = document.querySelector('button[aria-label="Run Gemini QA on video"]');
      return btn instanceof HTMLButtonElement && !btn.disabled;
    }, null, { timeout: 120_000 });
    const latestBeforeVideo = await readLatestLabel(page);
    await runVideo.scrollIntoViewIfNeeded();
    await runVideo.click();
    await page.waitForFunction(() => {
      const btn = document.querySelector('button[aria-label="Run Gemini QA on video"]');
      return btn instanceof HTMLButtonElement && btn.disabled;
    }, null, { timeout: 20_000 });

    await Promise.race([
      page.getByText(/qa error:/i).waitFor({ timeout: 240_000 }).then(async () => {
        const errText = (await page.getByText(/qa error:/i).first().textContent().catch(() => "")) || "";
        throw new Error(errText.replace(/^qa error:\s*/i, "").trim() || "Video QA failed");
      }),
      page.waitForFunction(() => {
        const btn = document.querySelector('button[aria-label="Run Gemini QA on video"]');
        return btn instanceof HTMLButtonElement && !btn.disabled;
      }, null, { timeout: 240_000 }),
    ]);
    await throwIfQaErrorVisible(page, "Video QA");

    // Wait for UI to reflect the completed run.
    await page.waitForFunction((prev) => {
      const el = Array.from(document.querySelectorAll("*")).find((n) => /^latest:/i.test(n.textContent?.trim() ?? ""));
      const cur = (el?.textContent ?? "").trim();
      return cur !== "" && cur !== prev;
    }, latestBeforeVideo, { timeout: 60_000 }).catch(() => {});

    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, "video-qa.png"), fullPage: true });
    const videoRuns = await scrapeRecentRuns(page);
    await fs.writeFile(path.join(outDir, "video-qa.json"), JSON.stringify(videoRuns, null, 2), "utf8");

    const runScreens = page.getByRole("button", { name: /run gemini qa on screenshots/i });
    await page.waitForFunction(() => {
      const btn = document.querySelector('button[aria-label="Run Gemini QA on screenshots"]');
      return btn instanceof HTMLButtonElement && !btn.disabled;
    }, null, { timeout: 120_000 });
    const latestBeforeScreens = await readLatestLabel(page);
    await runScreens.scrollIntoViewIfNeeded();
    await runScreens.click();
    await page.waitForFunction(() => {
      const btn = document.querySelector('button[aria-label="Run Gemini QA on screenshots"]');
      return btn instanceof HTMLButtonElement && btn.disabled;
    }, null, { timeout: 20_000 });

    await Promise.race([
      page.getByText(/qa error:/i).waitFor({ timeout: 240_000 }).then(async () => {
        const errText = (await page.getByText(/qa error:/i).first().textContent().catch(() => "")) || "";
        throw new Error(errText.replace(/^qa error:\s*/i, "").trim() || "Screenshot QA failed");
      }),
      page.waitForFunction(() => {
        const btn = document.querySelector('button[aria-label="Run Gemini QA on screenshots"]');
        return btn instanceof HTMLButtonElement && !btn.disabled;
      }, null, { timeout: 240_000 }),
    ]);
    await throwIfQaErrorVisible(page, "Screenshot QA");

    await page.waitForFunction((prev) => {
      const el = Array.from(document.querySelectorAll("*")).find((n) => /^latest:/i.test(n.textContent?.trim() ?? ""));
      const cur = (el?.textContent ?? "").trim();
      return cur !== "" && cur !== prev;
    }, latestBeforeScreens, { timeout: 60_000 }).catch(() => {});

    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, "screens-qa.png"), fullPage: true });
    const screenRuns = await scrapeRecentRuns(page);
    await fs.writeFile(path.join(outDir, "screens-qa.json"), JSON.stringify(screenRuns, null, 2), "utf8");

    // Compute score from both QA runs and persist to public/dogfood/qa-results.json.
    // This gives a timestamped history of Gemini QA scores for regression tracking.
    await persistQaScore(process.cwd(), videoRuns, screenRuns);

    await fs.writeFile(path.join(outDir, "debug.log"), debugLines.join("\n"), "utf8");
    return { outDir };
  } catch (e) {
    try {
      await page.screenshot({ path: path.join(outDir, "error.png"), fullPage: true });
    } catch {
      // ignore
    }
    try {
      await fs.writeFile(path.join(outDir, "debug.log"), debugLines.join("\n"), "utf8");
    } catch {
      // ignore
    }
    throw e;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const host = args.get("host") ?? "127.0.0.1";
  const requestedPort = Number(args.get("port") ?? 4173);
  const port = args.has("baseURL") ? requestedPort : await findOpenPort(host, requestedPort, 30);
  const baseURL = args.get("baseURL") ?? `http://${host}:${port}`;
  const headless = (args.get("headless") ?? "true") === "true";

  const repoRoot = process.cwd();
  const nodeCmd = process.execPath;
  const viteBin = path.join(repoRoot, "node_modules", "vite", "bin", "vite.js");

  const walkthroughMp4 = path.join(repoRoot, "public", "dogfood", "walkthrough.mp4");
  const walkthroughWebm = path.join(repoRoot, "public", "dogfood", "walkthrough.webm");
  if (!existsSync(walkthroughMp4) && !existsSync(walkthroughWebm)) {
    throw new Error("No walkthrough video found at public/dogfood/walkthrough.(mp4|webm). Run `npm run dogfood:full:local` first.");
  }

  // eslint-disable-next-line no-console
  console.log(`Starting preview server: node ${viteBin} preview --host ${host} --port ${port}`);
  const serverProc = spawn(nodeCmd, [viteBin, "preview", "--host", host, "--port", String(port), "--strictPort"], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
    windowsHide: true,
    shell: false,
  });
  serverProc.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start preview server:", err);
  });
  serverProc.stdout.on("data", (buf) => process.stdout.write(String(buf)));
  serverProc.stderr.on("data", (buf) => process.stderr.write(String(buf)));

  try {
    await waitForPort(host, port, 240_000);
    await waitForHttpOk(baseURL, 240_000);

    const { outDir } = await runQaAndCapture({ baseURL, headless });
    // eslint-disable-next-line no-console
    console.log(`Gemini QA artifacts written to: ${outDir}`);
  } finally {
    await killProcessTree(serverProc);
  }
}

await main();
