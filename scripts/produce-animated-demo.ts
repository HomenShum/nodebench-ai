#!/usr/bin/env npx tsx
/**
 * produce-animated-demo.ts
 *
 * Records LIVE browser interactions using Puppeteer's built-in screencast API,
 * producing a real video of the NodeBench demo flow with cursor movements,
 * clicks, scrolling, and state changes.
 *
 * Falls back to screenshot-loop + ffmpeg stitching if screencast fails.
 *
 * Prerequisites:
 *   - ffmpeg on PATH
 *   - puppeteer installed
 *   - Dev server running on localhost:5188
 *
 * Usage:
 *   npx tsx scripts/produce-animated-demo.ts
 */

import puppeteer, { type Page, type Browser, type ScreenRecorder } from "puppeteer";
import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = path.dirname(__filename_esm);

// -- Config ------------------------------------------------------------------
const ROOT = path.resolve(__dirname_esm, "..");
const AUDIO_DIR = path.join(ROOT, "docs", "demo-audio", "variant-a");
const OUT_DIR = path.join(ROOT, "docs", "demo-video");
const WEBM_PATH = path.join(OUT_DIR, "nodebench-animated-demo.webm");
const MP4_PATH = path.join(OUT_DIR, "nodebench-animated-demo.mp4");
const WIDTH = 1280;
const HEIGHT = 800;
const BASE_URL = "http://localhost:5188";

// -- Helpers -----------------------------------------------------------------

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Move mouse smoothly from current position to (x,y) over `steps` intermediate points. */
async function smoothMove(page: Page, x: number, y: number, steps = 20) {
  await page.mouse.move(x, y, { steps });
  await sleep(100);
}

/** Move mouse to element center smoothly, then click. */
async function smoothClick(page: Page, x: number, y: number, steps = 20) {
  await smoothMove(page, x, y, steps);
  await page.mouse.click(x, y);
}

/** Smooth-scroll the MAIN scrollable container (not window). */
async function smoothScrollContainer(page: Page, deltaY: number, durationMs = 1500) {
  // Use string evaluate to avoid esbuild __name transform injection
  await page.evaluate(`(function(){
    var container =
      document.querySelector(".overflow-auto.pb-24") ||
      document.querySelector("main .overflow-auto") ||
      document.querySelector("main") ||
      document.scrollingElement ||
      document.documentElement;
    if (!container) return;
    var start = container.scrollTop;
    var target = start + ${deltaY};
    var dur = ${durationMs};
    var startTime = performance.now();
    var doStep = function(now) {
      var elapsed = now - startTime;
      var progress = Math.min(elapsed / dur, 1);
      var ease = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;
      container.scrollTop = start + (target - start) * ease;
      if (progress < 1) requestAnimationFrame(doStep);
    };
    requestAnimationFrame(doStep);
  })()`);
  await sleep(durationMs + 200);
}

/** Reset scroll position on the main container. */
async function resetScroll(page: Page) {
  await page.evaluate(`(function(){
    var container =
      document.querySelector(".overflow-auto.pb-24") ||
      document.querySelector("main .overflow-auto") ||
      document.querySelector("main") ||
      document.scrollingElement ||
      document.documentElement;
    if (container) container.scrollTop = 0;
  })()`);
  await sleep(200);
}

/** Find a sidebar button by text content and return its bounding box center. */
async function findSidebarButton(page: Page, label: string): Promise<{ x: number; y: number } | null> {
  const escapedLabel = label.replace(/'/g, "\\'");
  const result = await page.evaluate(`(function(){
    var lbl = '${escapedLabel}';
    var elements = document.querySelectorAll("nav button, nav a, aside button, aside a, [role='navigation'] button, [role='navigation'] a");
    for (var i = 0; i < elements.length; i++) {
      var text = (elements[i].textContent || '').trim();
      if (text.indexOf(lbl) !== -1) {
        var rect = elements[i].getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      }
    }
    var allClickable = document.querySelectorAll("[class*='Rail'] button, [class*='Rail'] a, [class*='rail'] button, [class*='Sidebar'] button");
    for (var j = 0; j < allClickable.length; j++) {
      var text2 = (allClickable[j].textContent || '').trim();
      if (text2.indexOf(lbl) !== -1) {
        var rect2 = allClickable[j].getBoundingClientRect();
        return { x: rect2.x + rect2.width / 2, y: rect2.y + rect2.height / 2 };
      }
    }
    return null;
  })()`);
  return result as { x: number; y: number } | null;
}

/** Find accept buttons (small 25x25 icon buttons) in the Recommended Actions section.
 *  The buttons are icon-only, ~25x25px. The first button in each row of 4 is Accept (green check).
 *  Filter: width 15-40px, visible in viewport y 100-200, x > 800 (right side of row). */
async function findAcceptButtons(page: Page): Promise<Array<{ x: number; y: number }>> {
  const results = await page.evaluate(`(function(){
    var results = [];
    var allBtns = document.querySelectorAll('button');
    for (var i = 0; i < allBtns.length; i++) {
      var r = allBtns[i].getBoundingClientRect();
      if (r.width > 15 && r.width < 40 && r.height > 15 && r.height < 40 && r.y > 100 && r.y < 300 && r.x > 750) {
        results.push({ x: r.x + r.width / 2, y: r.y + r.height / 2, btnX: r.x });
      }
    }
    // Group by approximate y (rows), pick first button in each row (Accept)
    results.sort(function(a, b) { return a.y - b.y; });
    var rows = [];
    var usedY = [];
    for (var j = 0; j < results.length; j++) {
      var isNewRow = true;
      for (var k = 0; k < usedY.length; k++) {
        if (Math.abs(results[j].y - usedY[k]) < 20) { isNewRow = false; break; }
      }
      if (isNewRow) {
        usedY.push(results[j].y);
        // Find leftmost button in this row (first = Accept)
        var rowBtns = results.filter(function(b) { return Math.abs(b.y - results[j].y) < 20; });
        rowBtns.sort(function(a, b) { return a.btnX - b.btnX; });
        if (rowBtns.length > 0) rows.push({ x: rowBtns[0].x, y: rowBtns[0].y });
      }
    }
    return rows;
  })()`);
  return (results || []) as Array<{ x: number; y: number }>;
}

function getAudioDuration(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const result = spawnSync(
    "ffprobe",
    ["-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", filePath],
    { encoding: "utf-8" },
  );
  return parseFloat(result.stdout.trim()) || 0;
}

// -- Main Recording ----------------------------------------------------------

async function main() {
  console.log("=== NodeBench Animated Demo — Screencast Recorder ===\n");
  console.log(`Resolution: ${WIDTH}x${HEIGHT}`);
  console.log(`Output WebM: ${WEBM_PATH}`);
  console.log(`Output MP4: ${MP4_PATH}\n`);

  ensureDir(OUT_DIR);

  // List available audio clips
  const audioFiles = fs.readdirSync(AUDIO_DIR).filter((f) => f.endsWith(".mp3")).sort();
  console.log(`Audio clips found: ${audioFiles.length}`);
  for (const af of audioFiles) {
    const dur = getAudioDuration(path.join(AUDIO_DIR, af));
    console.log(`  ${af}: ${dur.toFixed(1)}s`);
  }

  // Launch headed browser
  console.log("\nLaunching browser...");
  const browser = await puppeteer.launch({
    headless: "shell", // Use shell mode for screencast compatibility
    defaultViewport: { width: WIDTH, height: HEIGHT },
    args: [
      `--window-size=${WIDTH},${HEIGHT}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--force-dark-mode",
      "--disable-features=TranslateUI",
      "--hide-scrollbars",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);

  // Skip onboarding via localStorage — navigate to a blank page first to set storage
  await page.goto(`${BASE_URL}/?surface=ask`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.evaluate(`(function(){
    localStorage.setItem("nodebench-onboarding-complete", "true");
    localStorage.setItem("nodebench-onboarding-done", "true");
    localStorage.setItem("nodebench-interventions", "{}");
    localStorage.setItem("nodebench-streak-data", "{}");
  })()`);

  await sleep(500);

  // ── Start Screencast ───────────────────────────────────────────────────────
  console.log("\nStarting screencast recording...");
  let recorder: ScreenRecorder;
  let useScreencast = true;

  try {
    recorder = await page.screencast({ path: WEBM_PATH, speed: 1 });
    console.log("  Screencast started successfully.");
  } catch (err: any) {
    console.log(`  Screencast failed: ${err.message}`);
    console.log("  Falling back to screenshot loop...");
    useScreencast = false;
    recorder = null as any;
  }

  // If screencast failed, set up screenshot fallback
  const FALLBACK_FRAMES_DIR = path.join(OUT_DIR, "animated-frames");
  let fallbackFrameIndex = 0;
  let fallbackCapturing = false;
  let fallbackInterval: ReturnType<typeof setInterval> | null = null;

  if (!useScreencast) {
    ensureDir(FALLBACK_FRAMES_DIR);
    // Clean old frames
    for (const f of fs.readdirSync(FALLBACK_FRAMES_DIR)) {
      if (f.endsWith(".png")) fs.unlinkSync(path.join(FALLBACK_FRAMES_DIR, f));
    }
    fallbackCapturing = true;
    fallbackInterval = setInterval(async () => {
      if (!fallbackCapturing) return;
      try {
        const framePath = path.join(FALLBACK_FRAMES_DIR, `frame-${String(fallbackFrameIndex).padStart(5, "0")}.png`);
        await page.screenshot({ path: framePath, type: "png" });
        fallbackFrameIndex++;
      } catch { /* skip frame on error */ }
    }, Math.round(1000 / 15)); // 15fps fallback
  }

  // ── Demo Flow ──────────────────────────────────────────────────────────────
  const sceneTimestamps: Array<{ name: string; startMs: number }> = [];
  const recordingStartTime = Date.now();

  function markScene(name: string) {
    sceneTimestamps.push({ name, startMs: Date.now() - recordingStartTime });
    console.log(`\n[${name}] t=${((Date.now() - recordingStartTime) / 1000).toFixed(1)}s`);
  }

  try {
    // ── (a) Navigate to landing page, hold on hero ─────────────────────────
    markScene("a-hero");
    await page.goto(`${BASE_URL}/?surface=ask`, { waitUntil: "networkidle2", timeout: 15000 });
    await sleep(3000); // 3s hold on hero

    // ── (b) Onboarding already skipped via localStorage ────────────────────

    // ── (c) Scroll down to show Analysis preview ──────────────────────────
    markScene("c-scroll-analysis");
    await smoothScrollContainer(page, 500, 2000);
    await sleep(1000); // 3s total with scroll

    // ── (d) Click "Dashboard" — hold 4s on the 3-column overview ───────────
    markScene("d-click-dashboard");
    const dashBtn = await findSidebarButton(page, "Dashboard");
    if (dashBtn) {
      await smoothClick(page, dashBtn.x, dashBtn.y);
    } else {
      console.log("  Dashboard button not found, navigating directly...");
      await page.goto(`${BASE_URL}/founder`, { waitUntil: "networkidle2", timeout: 15000 });
    }
    await sleep(4000); // 4s hold — shows HeaderBar + 3-column overview above the fold

    // ── (e) Scroll slightly to reveal Contradiction Banner ──────────────────
    markScene("e-contradiction-banner");
    await smoothScrollContainer(page, 250, 1500);
    await sleep(2500); // hold on the amber/rose BIGGEST CONTRADICTION banner

    // ── (f) Scroll to reveal Artifact Packet panel with export buttons ──────
    markScene("f-artifact-packet");
    await smoothScrollContainer(page, 300, 1500);
    await sleep(2500); // hold on Artifact Packet panel

    // ── (g) Click "Copy" export button on the Artifact Packet panel ─────────
    markScene("g-export-click");
    // Find the Copy button inside the ArtifactPacketPanel
    const copyBtn = await page.evaluate(`(function(){
      var btns = document.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        var text = (btns[i].textContent || '').trim();
        if (text === 'Copy' || text.indexOf('Copy') === 0) {
          var r = btns[i].getBoundingClientRect();
          if (r.y > 100 && r.y < 700 && r.width > 40) {
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
          }
        }
      }
      return null;
    })()`);
    if (copyBtn) {
      await smoothClick(page, (copyBtn as any).x, (copyBtn as any).y, 15);
    } else {
      // Fallback: approximate location of Copy button in Artifact Packet panel
      console.log("  Copy button not found, using fallback coordinates...");
      await smoothClick(page, 640, 480, 15);
    }
    await sleep(2500); // wait for copy toast animation

    // ── (h) Scroll to Recommended Actions, click Accept on intervention #1 ──
    markScene("h-accept-1");
    await smoothScrollContainer(page, 350, 1500);
    await sleep(800);
    // Ensure scroll position shows action buttons
    await page.evaluate(`(function(){
      var container = document.querySelector(".overflow-auto.pb-24");
      if (container && container.scrollTop < 500) container.scrollTop = 600;
    })()`);
    await sleep(500);
    let acceptBtns = await findAcceptButtons(page);
    console.log(`  Found ${acceptBtns.length} accept buttons`);
    if (acceptBtns.length > 0) {
      await smoothClick(page, acceptBtns[0].x, acceptBtns[0].y, 15);
      await sleep(3000); // wait for toast + animation
    } else {
      console.log("  Using fallback coordinates (836, 143)...");
      await smoothClick(page, 836, 143, 15);
      await sleep(3000);
    }

    // ── (i) Click Accept on intervention #2 ─────────────────────────────────
    markScene("i-accept-2");
    acceptBtns = await findAcceptButtons(page);
    console.log(`  Found ${acceptBtns.length} accept buttons after first click`);
    if (acceptBtns.length > 0) {
      await smoothClick(page, acceptBtns[0].x, acceptBtns[0].y, 15);
      await sleep(2000);
    } else {
      console.log("  Using fallback coordinates for second accept...");
      await smoothClick(page, 836, 178, 15);
      await sleep(2000);
    }

    // ── (j) Scroll to Agent Activity + Today's Briefing ─────────────────────
    markScene("j-agent-activity-briefing");
    await smoothScrollContainer(page, 500, 2500);
    await sleep(1500);

    // ── (k) Click "Command Center" in sidebar ───────────────────────────────
    markScene("k-command-center");
    const cmdBtn = await findSidebarButton(page, "Command Center") || await findSidebarButton(page, "Command");
    if (cmdBtn) {
      await smoothClick(page, cmdBtn.x, cmdBtn.y);
    } else {
      console.log("  Command Center button not found, navigating directly...");
      await page.goto(`${BASE_URL}/founder/command`, { waitUntil: "networkidle2", timeout: 15000 });
    }
    await sleep(2000);

    // ── (l) Hold on Command Center showing message thread ───────────────────
    markScene("l-command-center-hold");
    await sleep(4000);

    // ── (m) Click "Agent Oversight" in sidebar ──────────────────────────────
    markScene("m-agent-oversight");
    const agentBtn = await findSidebarButton(page, "Agent Oversight") || await findSidebarButton(page, "Agents") || await findSidebarButton(page, "Oversight");
    if (agentBtn) {
      await smoothClick(page, agentBtn.x, agentBtn.y);
    } else {
      console.log("  Agent Oversight button not found, navigating directly...");
      await page.goto(`${BASE_URL}/founder/agents`, { waitUntil: "networkidle2", timeout: 15000 });
    }
    await sleep(2000);

    // ── (n) Hold on Agent Oversight showing agents + escalation queue ────────
    markScene("n-agent-oversight-hold");
    await sleep(3000);

    // ── (o) Navigate to /memo/demo ──────────────────────────────────────────
    markScene("o-memo");
    await page.goto(`${BASE_URL}/memo/demo`, { waitUntil: "networkidle2", timeout: 15000 });
    await sleep(2000);

    // ── (p) Hold on shareable Decision Memo ─────────────────────────────────
    markScene("p-memo-hold");
    await sleep(3000);

  } catch (err) {
    console.error("\nScene capture error:", err);
  }

  // ── Stop Recording ─────────────────────────────────────────────────────────
  const totalRecordingMs = Date.now() - recordingStartTime;
  console.log(`\nTotal recording time: ${(totalRecordingMs / 1000).toFixed(1)}s`);

  if (useScreencast && recorder) {
    console.log("Stopping screencast...");
    await recorder.stop();
    await sleep(500);
    const webmSize = fs.existsSync(WEBM_PATH) ? fs.statSync(WEBM_PATH).size : 0;
    console.log(`  WebM file size: ${(webmSize / 1024 / 1024).toFixed(1)} MB`);

    if (webmSize < 1000) {
      console.log("  WARNING: WebM too small, screencast may have failed.");
      useScreencast = false;
    }
  }

  if (!useScreencast && fallbackInterval) {
    fallbackCapturing = false;
    clearInterval(fallbackInterval);
    console.log(`  Fallback: captured ${fallbackFrameIndex} frames at 15fps`);
  }

  await browser.close();
  console.log("Browser closed.\n");

  // ── Post-processing ────────────────────────────────────────────────────────

  if (useScreencast) {
    // Convert WebM to MP4
    console.log("Converting WebM to MP4...");
    const convertResult = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-i", WEBM_PATH,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        path.join(OUT_DIR, "nodebench-animated-demo-silent.mp4"),
      ],
      { encoding: "utf-8", stdio: "pipe" },
    );
    if (convertResult.status !== 0) {
      console.error("  ffmpeg convert failed:", convertResult.stderr?.substring(0, 300));
    } else {
      console.log("  Silent MP4 created.");
    }
  } else {
    // Fallback: stitch screenshots with ffmpeg
    console.log("Stitching screenshot frames to MP4...");
    const stitchResult = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-framerate", "15",
        "-i", path.join(FALLBACK_FRAMES_DIR, "frame-%05d.png"),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "23",
        path.join(OUT_DIR, "nodebench-animated-demo-silent.mp4"),
      ],
      { encoding: "utf-8", stdio: "pipe" },
    );
    if (stitchResult.status !== 0) {
      console.error("  ffmpeg stitch failed:", stitchResult.stderr?.substring(0, 300));
    } else {
      console.log("  Silent MP4 created from frames.");
    }
  }

  const silentMp4 = path.join(OUT_DIR, "nodebench-animated-demo-silent.mp4");
  if (!fs.existsSync(silentMp4)) {
    console.error("FATAL: No silent MP4 produced. Exiting.");
    process.exit(1);
  }

  const videoDuration = getAudioDuration(silentMp4);
  console.log(`  Video duration: ${videoDuration.toFixed(1)}s`);

  // ── Mix in narration audio ───────────────────────────────────────────────
  // Audio clip mapping to approximate scene timestamps
  // We compute offsets from the scene timestamps recorded during capture
  const sceneMap: Record<string, string> = {};
  for (const st of sceneTimestamps) {
    sceneMap[st.name] = ((st.startMs / 1000)).toFixed(2);
  }
  console.log("\nScene timestamps:", JSON.stringify(sceneMap, null, 2));

  // Map audio clips to video offsets (seconds)
  const audioMapping: Array<{ file: string; offsetSec: number }> = [];

  function addAudio(clipName: string, sceneName: string) {
    const clipPath = path.join(AUDIO_DIR, clipName);
    const scene = sceneTimestamps.find((s) => s.name === sceneName);
    if (fs.existsSync(clipPath) && scene) {
      audioMapping.push({ file: clipPath, offsetSec: scene.startMs / 1000 });
    }
  }

  // Map variant-a clips to scenes
  addAudio("va-00-cold-open.mp3", "a-hero");
  addAudio("va-01-landing.mp3", "c-scroll-analysis");
  addAudio("va-02-dashboard.mp3", "d-click-dashboard");
  addAudio("va-03-actions.mp3", "f-artifact-packet");
  addAudio("va-04-accept.mp3", "h-accept-1");
  addAudio("va-05-command.mp3", "k-command-center");
  addAudio("va-06-approval.mp3", "l-command-center-hold");
  addAudio("va-07-memo.mp3", "o-memo");
  addAudio("va-08-oversight.mp3", "m-agent-oversight");
  addAudio("va-09-closing.mp3", "p-memo-hold");

  if (audioMapping.length === 0) {
    console.log("\nNo audio clips mapped. Using silent video as final output.");
    fs.copyFileSync(silentMp4, MP4_PATH);
  } else {
    console.log(`\nMixing ${audioMapping.length} audio clips into video...`);
    for (const am of audioMapping) {
      const dur = getAudioDuration(am.file);
      console.log(`  ${path.basename(am.file)} @ ${am.offsetSec.toFixed(1)}s (${dur.toFixed(1)}s)`);
    }

    // Build ffmpeg filter_complex for audio mixing
    const audioInputs: string[] = ["-i", silentMp4];
    const filterParts: string[] = [];
    const amixInputs: string[] = [];

    audioMapping.forEach((am, i) => {
      audioInputs.push("-i", am.file);
      const inputIdx = i + 1;
      const delayMs = Math.round(am.offsetSec * 1000);
      filterParts.push(`[${inputIdx}:a]adelay=${delayMs}|${delayMs},aformat=sample_rates=44100:channel_layouts=stereo[a${i}]`);
      amixInputs.push(`[a${i}]`);
    });

    const filterComplex = [
      ...filterParts,
      `${amixInputs.join("")}amix=inputs=${amixInputs.length}:normalize=0:duration=longest[aout]`,
    ].join(";");

    const mixResult = spawnSync(
      "ffmpeg",
      [
        "-y",
        ...audioInputs,
        "-filter_complex", filterComplex,
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        MP4_PATH,
      ],
      { encoding: "utf-8", stdio: "pipe" },
    );

    if (mixResult.status !== 0) {
      console.log(`  Audio mix failed: ${mixResult.stderr?.substring(0, 400)}`);
      console.log("  Using silent video as final output.");
      fs.copyFileSync(silentMp4, MP4_PATH);
    } else {
      console.log("  Audio mixed successfully.");
    }
  }

  // Clean up intermediate silent file
  try {
    if (fs.existsSync(silentMp4) && fs.existsSync(MP4_PATH) && silentMp4 !== MP4_PATH) {
      fs.unlinkSync(silentMp4);
    }
  } catch { /* ignore */ }

  // Report final
  if (fs.existsSync(MP4_PATH)) {
    const stat = fs.statSync(MP4_PATH);
    const finalDur = getAudioDuration(MP4_PATH);
    console.log(`\n=== DONE ===`);
    console.log(`  Output: ${MP4_PATH}`);
    console.log(`  Size: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Duration: ${finalDur.toFixed(1)}s`);
  } else {
    console.error("\nFATAL: No final MP4 produced.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
