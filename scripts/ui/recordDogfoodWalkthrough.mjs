import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";

const execFileAsync = promisify(execFile);

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

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(
    d.getMinutes(),
  )}${pad(d.getSeconds())}`;
}

function isMacPlatform() {
  const p = process.platform;
  return p === "darwin";
}

function msToSec(ms) {
  return Math.round((ms / 1000) * 10) / 10;
}

async function maybeTranscodeToMp4(inputPath, outputPath) {
  let ffmpegPath;
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const mod = await import("ffmpeg-static");
    ffmpegPath = mod.default || mod;
  } catch {
    return { ok: false, reason: "ffmpeg-static not installed" };
  }
  if (!ffmpegPath) return { ok: false, reason: "ffmpeg binary missing" };

  await execFileAsync(ffmpegPath, [
    "-y",
    "-i",
    inputPath,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "28",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
  return { ok: true };
}

async function uploadToVercelBlob(filePath, options) {
  const token = options.token;
  if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN/DOGFOOD_BLOB_TOKEN");

  // eslint-disable-next-line import/no-extraneous-dependencies
  const { put } = await import("@vercel/blob");
  const fs = await import("node:fs");

  const blob = await put(options.name, fs.createReadStream(filePath), {
    access: "public",
    token,
    addRandomSuffix: true,
    contentType: "video/mp4",
  });

  return blob.url;
}

async function installOverlay(page) {
  await page.addStyleTag({
    content: `
      #__nodebench_dogfood_overlay {
        position: fixed;
        top: 12px;
        left: 12px;
        z-index: 2147483647;
        background: rgba(0,0,0,0.62);
        border: 1px solid rgba(255,255,255,0.18);
        color: rgba(255,255,255,0.92);
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial;
        font-size: 12px;
        padding: 8px 10px;
        border-radius: 10px;
        backdrop-filter: blur(10px);
        max-width: 52ch;
        box-shadow: 0 16px 60px rgba(0,0,0,0.35);
      }
      #__nodebench_dogfood_overlay strong { font-weight: 650; color: white; }
      #__nodebench_dogfood_overlay .sub { opacity: 0.9; margin-top: 2px; }
      @media (prefers-reduced-motion: reduce) {
        #__nodebench_dogfood_overlay { transition: none !important; }
      }
    `,
  });

  await page.evaluate(() => {
    const el = document.createElement("div");
    el.id = "__nodebench_dogfood_overlay";
    el.innerHTML = `<strong>Dogfood Walkthrough</strong><div class="sub">Initializing...</div>`;
    document.documentElement.appendChild(el);
  });
}

async function setOverlay(page, title, sub) {
  await page.evaluate(
    ({ title, sub }) => {
      const el = document.getElementById("__nodebench_dogfood_overlay");
      if (!el) return;
      el.innerHTML = `<strong>${title}</strong><div class="sub">${sub}</div>`;
    },
    { title, sub },
  );
}

async function setDogfoodLocalStorage(page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "nodebench-theme",
      JSON.stringify({
        mode: "dark",
        accentColor: "indigo",
        density: "comfortable",
        fontFamily: "Inter",
        backgroundPattern: "none",
        reducedMotion: false,
      }),
    );
    localStorage.setItem("theme", "dark");
  });
}

async function maybeSignIn(page) {
  const signInButton = page.getByRole("button", { name: /sign in anonymously|sign in/i }).first();
  if (await signInButton.count()) {
    await signInButton.click();
    await page.waitForLoadState("domcontentloaded");
    // Auth can trigger a client-side refresh; wait for the shell to stabilize.
    await page.waitForSelector("#main-content", { state: "visible", timeout: 60_000 });
    await page.waitForTimeout(900);
  }
}

async function waitForAppReady(page) {
  await page.waitForSelector("#main-content", { state: "visible", timeout: 60_000 });
  await page.waitForTimeout(250);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseURL = args.get("baseURL") ?? "http://127.0.0.1:5173";
  const outDir = args.get("outDir") ?? path.resolve(process.cwd(), ".tmp", "dogfood-video");
  const publish = args.get("publish") ?? "blob"; // blob | static | none
  const settleMs = Number(args.get("settleMs") ?? 2000);
  const headless = (args.get("headless") ?? "true") !== "false";

  const stamp = nowStamp();
  await mkdir(outDir, { recursive: true });
  const userDataDir = path.join(outDir, "userdata");
  await mkdir(userDataDir, { recursive: true });

  const routes = [
    { path: "/", name: "Home" },
    { path: "/research", name: "Research Hub" },
    { path: "/research/overview", name: "Research: Overview" },
    { path: "/research/signals", name: "Research: Signals" },
    { path: "/research/briefing", name: "Research: Briefing" },
    { path: "/research/deals", name: "Research: Deals" },
    { path: "/research/changelog", name: "Research: Changes" },
    { path: "/documents", name: "Workspace: Documents" },
    { path: "/spreadsheets", name: "Workspace: Spreadsheets" },
    { path: "/calendar", name: "Workspace: Calendar" },
    { path: "/agents", name: "Assistants" },
    { path: "/roadmap", name: "Roadmap" },
    { path: "/timeline", name: "Timeline" },
    { path: "/showcase", name: "Showcase" },
    { path: "/footnotes", name: "Sources" },
    { path: "/signals", name: "Signals Log" },
    { path: "/benchmarks", name: "Benchmarks" },
    { path: "/funding", name: "Funding Brief" },
    { path: "/activity", name: "Activity" },
    { path: "/review-queue", name: "Review Queue" },
    { path: "/analytics/components", name: "Usage & Costs" },
    { path: "/analytics/recommendations", name: "Feedback" },
    { path: "/cost", name: "Usage & Costs" },
    { path: "/industry", name: "Industry News" },
    { path: "/for-you", name: "For You" },
    { path: "/recommendations", name: "Recommendations" },
    { path: "/marketplace", name: "Agent Templates" },
    { path: "/github", name: "GitHub Explorer" },
    { path: "/pr-suggestions", name: "PR Suggestions" },
    { path: "/linkedin", name: "LinkedIn Archive" },
    { path: "/activity-log", name: "Activity Log" },
    { path: "/quality-review", name: "Quality Review" },
    { path: "/public", name: "Public Docs" },
  ];

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless,
    viewport: { width: 1440, height: 900 },
    baseURL,
    colorScheme: "dark",
    // Suppress motion-safe: animations during recording — avoids opacity-0 flash on every route.
    // The opacity flash from view-enter (opacity 0→1) across 33 routes reads as seizure-risk
    // flashing to Gemini. Real users experience smooth SPA transitions; recorder gets freeze-frames.
    reducedMotion: "reduce",
    recordVideo: {
      dir: outDir,
      size: { width: 1440, height: 900 },
    },
  });

  const page = await context.newPage();
  await setDogfoodLocalStorage(page);
  // Initial load via full navigation — establishes the SPA shell, auth, localStorage
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await maybeSignIn(page);
  await waitForAppReady(page);
  await installOverlay(page);
  await page.waitForTimeout(700);

  const startedAt = Date.now();
  const chapters = [];

  for (const [idx, r] of routes.entries()) {
    const t0 = Date.now();
    const chapterStartMs = t0 - startedAt;
    chapters.push({
      index: idx + 1,
      name: r.name,
      path: r.path,
      startSec: msToSec(chapterStartMs),
    });

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await setOverlay(page, `Dogfood ${idx + 1}/${routes.length}`, `${r.name} — ${r.path}`);
        break;
      } catch (err) {
        const msg = String(err?.message ?? err ?? "");
        if (!msg.includes("Execution context was destroyed") || attempt === 2) throw err;
        // eslint-disable-next-line no-await-in-loop
        await page.waitForTimeout(250);
      }
    }

    if (idx === 0 && r.path === "/") {
      // Already on home from initial load — no navigation needed, just settle
      await page.waitForTimeout(settleMs);
    } else {
      // SPA client-side navigation via React Router (no full page reload).
      // This avoids the white-flash from browser page load and lets React Router
      // handle lazy loading smoothly, keeping the app shell and sidebar stable.
      await page.evaluate((path) => {
        history.pushState({}, "", path);
        window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
      }, r.path);
      // Allow React Router + lazy chunks time to settle
      await page.waitForTimeout(settleMs + 100);
    }
  }

  // Key interactions
  const interactStartMs = Date.now() - startedAt;
  chapters.push({
    index: chapters.length + 1,
    name: "Interaction: Command Palette",
    path: "(interaction)",
    startSec: msToSec(interactStartMs),
  });
  await setOverlay(page, "Interaction", "Command Palette (Cmd/Ctrl+K)");
  const isMac = isMacPlatform();
  await page.keyboard.press(isMac ? "Meta+K" : "Control+K");
  await page.waitForTimeout(800);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(450);

  const settingsStartMs = Date.now() - startedAt;
  chapters.push({
    index: chapters.length + 1,
    name: "Interaction: Settings",
    path: "(interaction)",
    startSec: msToSec(settingsStartMs),
  });
  await setOverlay(page, "Interaction", "Settings Modal (tabs)");
  const settingsTrigger = page.getByTestId("open-settings");
  if (await settingsTrigger.count()) {
    await settingsTrigger.click();
    await page.waitForTimeout(450);
    const tabs = ["Profile", "Account", "Preferences", "Usage", "Integrations", "Billing", "Reminders", "Channels"];
    for (const tab of tabs) {
      const b = page.getByRole("button", { name: tab }).first();
      if (await b.count()) {
        await b.click({ force: true });
        await page.waitForTimeout(500);
      }
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  const doneMs = Date.now() - startedAt;
  chapters.push({
    index: chapters.length + 1,
    name: "End",
    path: "(end)",
    startSec: msToSec(doneMs),
  });
  await setOverlay(page, "Done", "Walkthrough complete");
  await page.waitForTimeout(700);

  const video = page.video();
  await page.close();
  await context.close();

  if (!video) throw new Error("Video capture not enabled (Playwright recordVideo missing)");
  const webmPath = await video.path();
  const mp4Path = path.join(outDir, `dogfood-walkthrough_${stamp}.mp4`);

  let finalPath = webmPath;
  let mime = "video/webm";

  const transcoded = await maybeTranscodeToMp4(webmPath, mp4Path);
  if (transcoded.ok) {
    finalPath = mp4Path;
    mime = "video/mp4";
  }

  const walkthroughManifest = {
    capturedAtIso: new Date().toISOString(),
    baseURL,
    mime,
    publish,
    chapters,
    videoUrl: null,
    videoPath: null,
    _localVideoPath: finalPath,
  };

  if (publish === "static") {
    const pubDir = path.resolve(process.cwd(), "public", "dogfood");
    await mkdir(pubDir, { recursive: true });
    const outName = transcoded.ok ? "walkthrough.mp4" : "walkthrough.webm";
    const outPath = path.join(pubDir, outName);
    const fs = await import("node:fs/promises");
    await fs.copyFile(finalPath, outPath);
    walkthroughManifest.videoPath = `/dogfood/${outName}`;
  } else if (publish === "blob") {
    const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.DOGFOOD_BLOB_TOKEN || "";
    const prefix = process.env.DOGFOOD_BLOB_PREFIX || "dogfood";
    const name = `${prefix}/walkthrough_${stamp}.mp4`;
    if (mime !== "video/mp4") {
      throw new Error(
        "Blob publish requires mp4 (install ffmpeg-static). Re-run after: npm i -D ffmpeg-static",
      );
    }
    const url = await uploadToVercelBlob(finalPath, { token, name });
    walkthroughManifest.videoUrl = url;
  }

  const manifestOut = path.resolve(process.cwd(), "public", "dogfood", "walkthrough.json");
  await mkdir(path.dirname(manifestOut), { recursive: true });
  await writeFile(manifestOut, JSON.stringify(walkthroughManifest, null, 2) + "\n", "utf8");

  // eslint-disable-next-line no-console
  console.log(
    `Recorded walkthrough (${mime}) and wrote manifest: public/dogfood/walkthrough.json\n` +
      `Local: ${finalPath}` +
      (walkthroughManifest.videoUrl ? `\nBlob: ${walkthroughManifest.videoUrl}` : ""),
  );
}

await main();
