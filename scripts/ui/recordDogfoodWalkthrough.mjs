import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
          const fs = await import("node:fs/promises");
          await fs.rename(targetPath, quarantinePath);
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
    localStorage.setItem("nodebench-onboarded", "1");
    localStorage.setItem(
      "nodebench-theme",
      JSON.stringify({
        mode: "dark",
        accentColor: "electric-blue",
        density: "comfortable",
        fontFamily: "Manrope Studio",
        backgroundPattern: "spotlight",
        reducedMotion: false,
      }),
    );
    localStorage.setItem("theme", "dark");
  });
}

async function maybeSignIn(page) {
  const anonymousButton = page.getByRole("button", { name: /sign in anonymously/i }).first();
  if (await anonymousButton.count()) {
    await anonymousButton.click();
    await page.waitForLoadState("domcontentloaded");
    // Auth can trigger a client-side refresh; wait for the shell to stabilize.
    await page.waitForSelector("#main-content", { state: "visible", timeout: 60_000 });
    await page.waitForTimeout(900);
    return;
  }

  const signInButton = page.getByRole("button", { name: /^sign in$/i }).first();
  if (await signInButton.count()) {
    await signInButton.click();
    await page.waitForTimeout(500);

    const modalAnonymousButton = page.getByRole("button", { name: /sign in anonymously/i }).first();
    if (await modalAnonymousButton.count()) {
      await modalAnonymousButton.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector("#main-content", { state: "visible", timeout: 60_000 });
      await page.waitForTimeout(900);
    }
  }
}

async function waitForAppReady(page, fallbackPath = "/?surface=home") {
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.waitForSelector("#main-content", { state: "visible", timeout: 20_000 });
      await page.waitForTimeout(250);
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
      await page.waitForTimeout(1200);
      await page.goto(fallbackPath, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => { });
    }
  }

  throw lastError;
}

async function navigateWithinApp(page, targetPath) {
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      let response = null;
      try {
        response = await page.goto(targetPath, { waitUntil: "domcontentloaded", timeout: 60_000 });
      } catch {
        response = null;
      }

      const shellVisible = await page
        .locator("#main-content")
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (!response || response.status() >= 400 || !shellVisible) {
        await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => { });
        await page.waitForSelector("#main-content", { state: "visible", timeout: 60_000 });
        await page.evaluate((path) => {
          history.pushState({}, "", path);
          window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
        }, targetPath);
      }

      await waitForAppReady(page, targetPath);
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
      await page.waitForTimeout(1200);
    }
  }

  throw lastError;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseURL = args.get("baseURL") ?? "http://127.0.0.1:5173";
  const outDir = args.get("outDir") ?? path.resolve(process.cwd(), ".tmp", "dogfood-video");
  const publish = args.get("publish") ?? "blob"; // blob | static | none
  const showOverlay = (args.get("overlay") ?? "0") === "1";
  const settleMs = Number(args.get("settleMs") ?? 2000);
  const headless = (args.get("headless") ?? "true") !== "false";

  const stamp = nowStamp();
  await mkdir(outDir, { recursive: true });
  const userDataDir = path.join(outDir, `userdata-${stamp}`);
  await removePathRobustly(userDataDir);
  await mkdir(userDataDir, { recursive: true });

  const routes = [
    { path: "/?surface=home", name: "Home" },
    { path: "/?surface=chat&q=ditto%20ai&lens=founder", name: "Chat" },
    { path: "/?surface=reports", name: "Reports" },
    { path: "/?surface=nudges", name: "Nudges" },
    { path: "/?surface=me", name: "Me" },
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
  if (showOverlay) await installOverlay(page);
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
        if (showOverlay) await setOverlay(page, `Dogfood ${idx + 1}/${routes.length}`, `${r.name} — ${r.path}`);
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

  // Key interactions for the public product loop
  const interactStartMs = Date.now() - startedAt;
  chapters.push({
    index: chapters.length + 1,
    name: "Interaction: Home to Chat",
    path: "(interaction)",
    startSec: msToSec(interactStartMs),
  });
  if (showOverlay) await setOverlay(page, "Interaction", "Ask from Home and watch Chat open live");
  await navigateWithinApp(page, "/?surface=home");
  const homeInput = page.locator('input[aria-label="Ask anything or upload anything"]').first();
  if (await homeInput.count()) {
    await homeInput.fill("What does Ditto AI do and what matters most right now?");
    await page.waitForTimeout(350);
    const askButton = page.getByRole("button", { name: /^ask$/i }).first();
    if (await askButton.count()) {
      await askButton.click();
      await page.waitForTimeout(2500);
    }
  }

  const settingsStartMs = Date.now() - startedAt;
  chapters.push({
    index: chapters.length + 1,
    name: "Interaction: Theme toggle",
    path: "(interaction)",
    startSec: msToSec(settingsStartMs),
  });
  if (showOverlay) await setOverlay(page, "Interaction", "Switch the public shell theme");
  const themeToggle = page.getByRole("button", { name: /switch to (light|dark) mode/i }).first();
  if (await themeToggle.count()) {
    await themeToggle.click();
    await page.waitForTimeout(800);
    await themeToggle.click();
    await page.waitForTimeout(500);
  }

  const reportsStartMs = Date.now() - startedAt;
  chapters.push({
    index: chapters.length + 1,
    name: "Interaction: Reports to Chat",
    path: "(interaction)",
    startSec: msToSec(reportsStartMs),
  });
  if (showOverlay) await setOverlay(page, "Interaction", "Reopen saved memory inside Chat");
  await navigateWithinApp(page, "/?surface=reports");
  const openInChat = page.getByRole("button", { name: /open in chat/i }).first();
  if (await openInChat.count()) {
    await openInChat.click();
    await page.waitForTimeout(2000);
  }

  const doneMs = Date.now() - startedAt;
  chapters.push({
    index: chapters.length + 1,
    name: "End",
    path: "(end)",
    startSec: msToSec(doneMs),
  });
  if (showOverlay) await setOverlay(page, "Done", "Walkthrough complete");
  await page.waitForTimeout(700);

  const video = page.video();
  await page.close();
  await context.close();
  await removePathRobustly(userDataDir);

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
