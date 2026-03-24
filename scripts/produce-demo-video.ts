#!/usr/bin/env npx tsx
/**
 * produce-demo-video.ts
 *
 * Captures screenshots of the NodeBench UI using Puppeteer, generates title/closing
 * frames via Canvas-free SVG→PNG, then stitches everything with ffmpeg into a single
 * MP4 with narration audio overlay and crossfade transitions.
 *
 * Prerequisites:
 *   - ffmpeg on PATH
 *   - puppeteer installed (`npm i -D puppeteer`)
 *   - Dev server running on localhost:5188 (or 192.168.0.14:5188)
 *
 * Usage:
 *   npx tsx scripts/produce-demo-video.ts
 */

import puppeteer, { type Page } from "puppeteer";
import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = path.dirname(__filename_esm);

// ── Config ──────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname_esm, "..");
const AUDIO_DIR = path.join(ROOT, "docs", "demo-audio");
const OUT_DIR = path.join(ROOT, "docs", "demo-video");
const FRAMES_DIR = path.join(OUT_DIR, "frames");
const WIDTH = 1920;
const HEIGHT = 1080;
const BASE_URL = "http://localhost:5188";

// ── Audio clip manifest (order matters) ─────────────────────────────────────
const CLIPS = [
  "00-cold-open.mp3",
  "01-act1-landing.mp3",
  "02-act1-decision-packet.mp3",
  "03-act1-dashboard-nav.mp3",
  "04-act1-identity.mp3",
  "05-act2-setup.mp3",
  "06-act2-fill.mp3",
  "07-act2-profile.mp3",
  "08-act2-emphasis.mp3",
  "09-act3-dashboard.mp3",
  "10-act3-actions.mp3",
  "11-act3-initiatives.mp3",
  "12-act3-briefing.mp3",
  "13-act4-command.mp3",
  "14-act4-carbon.mp3",
  "15-act4-approval.mp3",
  "16-act4-websocket.mp3",
  "17-act5-research.mp3",
  "18-act5-voice.mp3",
  "19-closing.mp3",
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function getAudioDuration(filePath: string): number {
  const result = spawnSync("ffprobe", [
    "-v", "quiet",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    filePath,
  ], { encoding: "utf-8" });
  return parseFloat(result.stdout.trim());
}

/** Generate a title card as PNG using Puppeteer (renders HTML to screenshot). */
async function generateTitleFrame(
  browser: any,
  outputPath: string,
  lines: string[],
  opts: { bg?: string; fg?: string; fontSize?: number; subtitle?: boolean } = {}
): Promise<void> {
  const { bg = "#000000", fg = "#ffffff", fontSize = 64, subtitle = false } = opts;
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  const htmlLines = lines.map((line, i) => {
    if (!line) return `<div style="height:24px"></div>`;
    const size = subtitle && i === lines.length - 1 ? fontSize * 0.5 : (i === 0 ? fontSize : fontSize * 0.75);
    const opacity = i === 0 ? 1 : 0.85;
    const weight = i === 0 ? 700 : 400;
    return `<div style="font-size:${size}px;opacity:${opacity};font-weight:${weight};margin:8px 0">${line}</div>`;
  }).join("\n");

  await page.setContent(`<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px;
    background: ${bg};
    color: ${fg};
    font-family: 'Manrope', 'Segoe UI', Arial, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    flex-direction: column;
  }
</style></head>
<body>${htmlLines}</body></html>`, { waitUntil: "networkidle0" });

  await page.screenshot({ path: outputPath, type: "png" });
  await page.close();
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitAndScreenshot(page: Page, filePath: string, delayMs = 1500) {
  await sleep(delayMs);
  await page.screenshot({ path: filePath, type: "png" });
  console.log(`  [screenshot] ${path.basename(filePath)}`);
}

async function scrollToBottom(page: Page, distance = 600) {
  await page.evaluate((d) => window.scrollBy({ top: d, behavior: "smooth" }), distance);
  await sleep(800);
}

async function navigateTo(page: Page, urlPath: string) {
  await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: "networkidle2", timeout: 15000 });
  await sleep(1500);
}

async function clickIfExists(page: Page, selector: string) {
  try {
    await page.waitForSelector(selector, { timeout: 3000 });
    await page.click(selector);
    await sleep(1000);
    return true;
  } catch {
    console.log(`  [skip] selector not found: ${selector}`);
    return false;
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== NodeBench Demo Video Producer ===\n");

  // Clean + create dirs
  if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Verify audio files exist
  for (const clip of CLIPS) {
    const p = path.join(AUDIO_DIR, clip);
    if (!fs.existsSync(p)) {
      console.error(`Missing audio: ${p}`);
      process.exit(1);
    }
  }

  // Get audio durations
  console.log("Measuring audio durations...");
  const durations: number[] = CLIPS.map((c) => getAudioDuration(path.join(AUDIO_DIR, c)));
  durations.forEach((d, i) => console.log(`  ${CLIPS[i]}: ${d.toFixed(2)}s`));
  const totalDuration = durations.reduce((a, b) => a + b, 0);
  console.log(`  Total: ${totalDuration.toFixed(1)}s\n`);

  // ── Launch browser ────────────────────────────────────────────────────────
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: WIDTH, height: HEIGHT },
    args: [
      `--window-size=${WIDTH},${HEIGHT}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--force-device-scale-factor=1",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  // ── Generate title frames ────────────────────────────────────────────────
  console.log("Generating title frames...");
  const coldOpenFrame = path.join(FRAMES_DIR, "00-cold-open.png");
  await generateTitleFrame(browser, coldOpenFrame, [
    "You hired AI agents.",
    "Who's managing them?",
  ], { fontSize: 64 });

  const closingFrame = path.join(FRAMES_DIR, "19-closing.png");
  await generateTitleFrame(browser, closingFrame, [
    "NodeBench",
    "Your company's operating intelligence",
    "",
    "nodebenchai.com",
  ], { fontSize: 56, subtitle: true });

  // Dismiss onboarding wizard
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("nodebench-onboarded", "true");
  });

  // ── ACT 1: Landing Page (clips 01-04) ────────────────────────────────────
  console.log("\n--- Act 1: Landing Page ---");

  // 01 - Landing hero
  await navigateTo(page, "/?surface=ask");
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "01-act1-landing.png"), 2500);

  // 02 - Scroll to Decision Packet preview
  await scrollToBottom(page, 800);
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "02-act1-decision-packet.png"));

  // 03 - Click Dashboard in sidebar → Founder Dashboard
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await sleep(500);
  // Try clicking FOUNDER section in left rail
  const dashClicked = await clickIfExists(page, '[href="/founder"], [data-route="/founder"]');
  if (!dashClicked) {
    // Fallback: navigate directly
    await navigateTo(page, "/founder");
  }
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "03-act1-dashboard-nav.png"), 2000);

  // 04 - Company Identity card close-up (scroll to it)
  await scrollToBottom(page, 300);
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "04-act1-identity.png"));

  // ── ACT 2: Setup Wizard (clips 05-08) ────────────────────────────────────
  console.log("\n--- Act 2: Setup Wizard ---");

  // 05 - Navigate to setup
  await navigateTo(page, "/founder/setup");
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "05-act2-setup.png"), 2000);

  // 06 - Click "Start Fresh" and fill in idea
  await clickIfExists(page, '[data-testid="start-fresh"], button:has-text("Start Fresh")');
  // Try to find and click a "Start Fresh" looking card/button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button, [role=button], .cursor-pointer"));
    const fresh = btns.find((b) => b.textContent?.includes("Start Fresh"));
    if (fresh) (fresh as HTMLElement).click();
  });
  await sleep(1000);
  // Try to fill in an idea textarea/input
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll("textarea, input[type=text]"));
    const ideaInput = inputs.find((el) =>
      el.getAttribute("placeholder")?.toLowerCase().includes("idea") ||
      el.getAttribute("placeholder")?.toLowerCase().includes("describe") ||
      el.getAttribute("placeholder")?.toLowerCase().includes("company")
    ) || inputs[0];
    if (ideaInput) {
      (ideaInput as HTMLInputElement).value = "AI-powered operating intelligence platform for founder-led companies";
      ideaInput.dispatchEvent(new Event("input", { bubbles: true }));
      ideaInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "06-act2-fill.png"), 1500);

  // 07 - Click Continue → AI-generated profile
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const cont = btns.find((b) =>
      b.textContent?.includes("Continue") || b.textContent?.includes("Next") || b.textContent?.includes("Generate")
    );
    if (cont) cont.click();
  });
  await sleep(2000);
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "07-act2-profile.png"), 2000);

  // 08 - Profile with confidence bar (scroll down or stay)
  await scrollToBottom(page, 400);
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "08-act2-emphasis.png"));

  // ── ACT 3: Dashboard Deep Dive (clips 09-12) ─────────────────────────────
  console.log("\n--- Act 3: Dashboard ---");

  // 09 - Dashboard with What Changed
  await navigateTo(page, "/founder");
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "09-act3-dashboard.png"), 2000);

  // 10 - Scroll to Recommended Actions
  await scrollToBottom(page, 600);
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "10-act3-actions.png"));

  // 11 - Scroll to Initiatives + Agent Activity
  await scrollToBottom(page, 600);
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "11-act3-initiatives.png"));

  // 12 - Scroll to Today's Briefing
  await scrollToBottom(page, 600);
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "12-act3-briefing.png"));

  // ── ACT 4: Command Center (clips 13-16) ──────────────────────────────────
  console.log("\n--- Act 4: Command Center ---");

  // 13 - Navigate to command center
  const commandRoutes = ["/founder/command", "/founder/agents"];
  let commandLoaded = false;
  for (const route of commandRoutes) {
    try {
      await navigateTo(page, route);
      commandLoaded = true;
      break;
    } catch {
      console.log(`  [skip] ${route} failed, trying next`);
    }
  }
  if (!commandLoaded) await navigateTo(page, "/founder");
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "13-act4-command.png"), 2000);

  // 14 - Carbon Analyst conversation thread
  await page.evaluate(() => {
    // Click on a conversation/agent card if visible
    const cards = Array.from(document.querySelectorAll("[class*=card], [class*=Card], [role=listitem]"));
    const carbon = cards.find((c) => c.textContent?.includes("Carbon") || c.textContent?.includes("Analyst"));
    if (carbon) (carbon as HTMLElement).click();
  });
  await sleep(1000);
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "14-act4-carbon.png"));

  // 15 - Scroll to approval request
  await scrollToBottom(page, 500);
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "15-act4-approval.png"));

  // 16 - WebSocket indicator (same page, stay)
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "16-act4-websocket.png"), 500);

  // ── ACT 5: Research Hub (clips 17-18) ─────────────────────────────────────
  console.log("\n--- Act 5: Research Hub ---");

  // 17 - Research Hub
  await navigateTo(page, "/?surface=research");
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "17-act5-research.png"), 2500);

  // 18 - Voice toggle in right rail
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "18-act5-voice.png"), 1000);

  await browser.close();
  console.log("\nBrowser closed. All screenshots captured.\n");

  // ── Verify all frames exist ───────────────────────────────────────────────
  const frameFiles: string[] = [];
  for (let i = 0; i < CLIPS.length; i++) {
    const prefix = CLIPS[i].replace(".mp3", "");
    const framePath = path.join(FRAMES_DIR, `${prefix}.png`);
    if (!fs.existsSync(framePath)) {
      console.error(`Missing frame: ${framePath} — will use fallback`);
      // Use the previous frame as fallback
      const prevFrame = frameFiles[frameFiles.length - 1] || coldOpenFrame;
      fs.copyFileSync(prevFrame, framePath);
    }
    frameFiles.push(framePath);
  }

  // ── Build ffmpeg concat input ─────────────────────────────────────────────
  console.log("Building ffmpeg concat list...");

  // Strategy: create per-clip videos (image + audio), then concat with crossfade.
  // Simpler approach: create a single video with timed image changes.

  // Step 1: Create individual clip videos
  const clipVideos: string[] = [];
  for (let i = 0; i < CLIPS.length; i++) {
    const clipVideo = path.join(OUT_DIR, `clip_${String(i).padStart(2, "0")}.mp4`);
    const audioPath = path.join(AUDIO_DIR, CLIPS[i]);
    const framePath = frameFiles[i];
    const dur = durations[i];

    console.log(`  Encoding clip ${i}: ${CLIPS[i]} (${dur.toFixed(2)}s)`);

    const r = spawnSync("ffmpeg", [
      "-y",
      "-loop", "1",
      "-i", framePath,
      "-i", audioPath,
      "-c:v", "libx264",
      "-tune", "stillimage",
      "-c:a", "aac",
      "-b:a", "192k",
      "-pix_fmt", "yuv420p",
      "-t", String(dur),
      "-shortest",
      "-vf", `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:black`,
      clipVideo,
    ], { encoding: "utf-8", stdio: "pipe" });

    if (r.status !== 0) {
      console.error(`  ERROR encoding clip ${i}:`, r.stderr?.slice(-300));
      // Try without audio encoding issues
      spawnSync("ffmpeg", [
        "-y", "-loop", "1", "-i", framePath,
        "-i", audioPath,
        "-c:v", "libx264", "-c:a", "aac", "-b:a", "128k",
        "-pix_fmt", "yuv420p", "-t", String(dur),
        clipVideo,
      ], { encoding: "utf-8", stdio: "pipe" });
    }
    clipVideos.push(clipVideo);
  }

  // Step 2: Create concat list file
  const concatListPath = path.join(OUT_DIR, "concat_list.txt");
  const concatContent = clipVideos.map((v) => `file '${v.replace(/\\/g, "/")}'`).join("\n");
  fs.writeFileSync(concatListPath, concatContent, "utf-8");

  // Step 3: Simple concat (no crossfade — cleaner for demo)
  console.log("\nConcatenating clips into final video...");
  const finalOutput = path.join(OUT_DIR, "nodebench-demo.mp4");

  const concatResult = spawnSync("ffmpeg", [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concatListPath,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    finalOutput,
  ], { encoding: "utf-8", stdio: "pipe" });

  if (concatResult.status !== 0) {
    console.error("Concat failed, trying re-encode approach...");
    // Fallback: re-encode everything
    spawnSync("ffmpeg", [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", concatListPath,
      "-vf", `scale=${WIDTH}:${HEIGHT},format=yuv420p`,
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "20",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      finalOutput,
    ], { encoding: "utf-8", stdio: "pipe" });
  }

  // Step 4: Clean up intermediate files
  console.log("Cleaning up intermediate clip files...");
  for (const cv of clipVideos) {
    try { fs.unlinkSync(cv); } catch {}
  }
  try { fs.unlinkSync(concatListPath); } catch {}

  // Step 5: Verify output
  if (fs.existsSync(finalOutput)) {
    const stats = fs.statSync(finalOutput);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
    console.log(`\n=== SUCCESS ===`);
    console.log(`Output: ${finalOutput}`);
    console.log(`Size: ${sizeMB} MB`);
    console.log(`Duration: ~${totalDuration.toFixed(1)}s`);

    // Get actual duration from ffprobe
    const probeResult = spawnSync("ffprobe", [
      "-v", "quiet", "-show_entries", "format=duration",
      "-of", "csv=p=0", finalOutput,
    ], { encoding: "utf-8" });
    if (probeResult.stdout.trim()) {
      console.log(`Actual duration: ${parseFloat(probeResult.stdout.trim()).toFixed(1)}s`);
    }
  } else {
    console.error("\nFAILED: Output file not created.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
