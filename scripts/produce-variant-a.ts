#!/usr/bin/env npx tsx
/**
 * produce-variant-a.ts
 *
 * Produces the Variant A "30-Second Hook" demo video for NodeBench.
 * TikTok/Manus-style: pure product motion, minimal narration.
 *
 * Pipeline:
 *   1. Generate narration clips via ElevenLabs API (if missing)
 *   2. Capture 7 screenshots from the live app via Puppeteer
 *   3. Generate 2 title card frames (cold open + CTA)
 *   4. Stitch frames + audio with ffmpeg into final MP4
 *
 * Prerequisites:
 *   - ffmpeg on PATH
 *   - puppeteer installed
 *   - Dev server running on localhost:5188
 *
 * Usage:
 *   npx tsx scripts/produce-variant-a.ts
 */

import puppeteer, { type Page } from "puppeteer";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { fileURLToPath } from "url";

const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = path.dirname(__filename_esm);

// ── Config ──────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname_esm, "..");
const AUDIO_DIR = path.join(ROOT, "docs", "demo-audio", "variant-a");
const OUT_DIR = path.join(ROOT, "docs", "demo-video");
const FRAMES_DIR = path.join(OUT_DIR, "variant-a-frames");
const WIDTH = 1920;
const HEIGHT = 1080;
const BASE_URL = "http://localhost:5188";

// ElevenLabs config
const ELEVENLABS_API_KEY = "sk_3479dd3728479a3fa5b2c7cc076e23b626328e7cbba14a6f";
const ELEVENLABS_VOICE_ID = "cjVigY5qzO86Huf0OWal"; // Eric
const ELEVENLABS_MODEL = "eleven_turbo_v2_5";

// ── Audio clip manifest ─────────────────────────────────────────────────────
// Each clip maps to a frame. Duration is determined by the audio file.
// For silent frames, we generate a silent audio track of the target duration.
interface ClipDef {
  id: string;
  filename: string;
  text: string | null; // null = silent, use target duration
  targetDuration: number; // seconds — used for silent clips or as minimum
  frame: string; // frame filename (without .png)
}

const CLIPS: ClipDef[] = [
  {
    id: "cold-open",
    filename: "va-00-cold-open.mp3",
    text: "You hired AI agents. Who's managing them?",
    targetDuration: 3.5,
    frame: "00-cold-open",
  },
  {
    id: "landing",
    filename: "va-01-landing.mp3",
    text: "One dashboard. Your agents, your decisions, your company.",
    targetDuration: 4,
    frame: "01-landing",
  },
  {
    id: "dashboard",
    filename: "va-02-dashboard.mp3",
    text: "See what changed overnight. Accept the top action in one click.",
    targetDuration: 5,
    frame: "02-dashboard",
  },
  {
    id: "actions",
    filename: "va-03-actions.mp3",
    text: null, // silent — let the UI speak
    targetDuration: 5,
    frame: "03-actions",
  },
  {
    id: "accept",
    filename: "va-04-accept.mp3",
    text: null, // silent
    targetDuration: 3.5,
    frame: "04-accept",
  },
  {
    id: "command",
    filename: "va-05-command.mp3",
    text: "Your agents report back with evidence. Approve when needed.",
    targetDuration: 5,
    frame: "05-command",
  },
  {
    id: "approval",
    filename: "va-06-approval.mp3",
    text: null, // silent
    targetDuration: 4.5,
    frame: "06-approval",
  },
  {
    id: "memo",
    filename: "va-07-memo.mp3",
    text: "Every decision becomes a shareable memo. The output is the distribution.",
    targetDuration: 5.5,
    frame: "07-memo",
  },
  {
    id: "oversight",
    filename: "va-08-oversight.mp3",
    text: null, // silent
    targetDuration: 3.5,
    frame: "08-oversight",
  },
  {
    id: "closing",
    filename: "va-09-closing.mp3",
    text: "Try it now. nodebench AI dot com. No signup required.",
    targetDuration: 5.5,
    frame: "09-closing",
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function getAudioDuration(filePath: string): number {
  const result = spawnSync("ffprobe", [
    "-v", "quiet",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    filePath,
  ], { encoding: "utf-8" });
  const d = parseFloat(result.stdout.trim());
  return isNaN(d) ? 3 : d;
}

function generateSilence(outputPath: string, durationSec: number): void {
  // Generate as WAV first (universally compatible), then convert to mp3
  const wavPath = outputPath.replace(/\.mp3$/, ".wav");
  spawnSync("ffmpeg", [
    "-y", "-f", "lavfi",
    "-i", `anullsrc=r=44100:cl=stereo`,
    "-t", String(durationSec),
    "-c:a", "pcm_s16le",
    wavPath,
  ], { encoding: "utf-8", stdio: "pipe" });
  // Convert WAV to MP3
  spawnSync("ffmpeg", [
    "-y", "-i", wavPath,
    "-c:a", "libmp3lame", "-b:a", "128k",
    outputPath,
  ], { encoding: "utf-8", stdio: "pipe" });
  // Clean up WAV
  try { fs.unlinkSync(wavPath); } catch {}
}

/** Generate TTS via ElevenLabs API. Returns the output file path. */
function generateTTS(text: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    });

    const options = {
      hostname: "api.elevenlabs.io",
      port: 443,
      path: `/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
        "Accept": "audio/mpeg",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errBody = "";
        res.on("data", (d) => errBody += d.toString());
        res.on("end", () => reject(new Error(`ElevenLabs ${res.statusCode}: ${errBody}`)));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        fs.writeFileSync(outputPath, Buffer.concat(chunks));
        console.log(`  [tts] Generated: ${path.basename(outputPath)} (${(Buffer.concat(chunks).length / 1024).toFixed(0)} KB)`);
        resolve();
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/** Generate a title card as PNG using Puppeteer HTML render. */
async function generateTitleFrame(
  browser: any,
  outputPath: string,
  config: {
    lines: { text: string; color?: string; size?: number; weight?: number; delay?: number }[];
    bg?: string;
  },
): Promise<void> {
  const { lines, bg = "#000000" } = config;
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  const htmlLines = lines.map((line) => {
    const color = line.color || "#ffffff";
    const size = line.size || 64;
    const weight = line.weight || 700;
    return `<div style="font-size:${size}px;color:${color};font-weight:${weight};margin:12px 0;line-height:1.3">${line.text}</div>`;
  }).join("\n");

  await page.setContent(`<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px;
    background: ${bg};
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

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== NodeBench Variant A — 30-Second Hook Video Producer ===\n");

  // Clean + create dirs
  if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  // ── Step 1: Generate audio clips ────────────────────────────────────────
  console.log("Step 1: Preparing audio clips...\n");

  for (const clip of CLIPS) {
    const audioPath = path.join(AUDIO_DIR, clip.filename);

    if (fs.existsSync(audioPath) && fs.statSync(audioPath).size > 1000) {
      console.log(`  [exists] ${clip.filename}`);
      continue;
    }

    if (clip.text) {
      // Generate via ElevenLabs
      console.log(`  [generating] ${clip.filename}: "${clip.text}"`);
      try {
        await generateTTS(clip.text, audioPath);
      } catch (err) {
        console.error(`  [ERROR] TTS failed for ${clip.id}: ${err}`);
        // Generate silence as fallback
        console.log(`  [fallback] Generating ${clip.targetDuration}s silence`);
        generateSilence(audioPath, clip.targetDuration);
      }
    } else {
      // Silent clip
      console.log(`  [silent] ${clip.filename} (${clip.targetDuration}s)`);
      generateSilence(audioPath, clip.targetDuration);
    }
  }

  // Map existing a-01/a-02 clips if our generated ones are tiny/missing
  // a-01 = "One question..." maps loosely to landing/dashboard narration
  // a-02 = "Not a dashboard..." maps to memo frame
  // We use our own generated clips instead for better narrative fit.

  // Measure all audio durations, use max(audio, target) for scene timing
  console.log("\nAudio/scene durations:");
  const durations: number[] = [];
  for (const clip of CLIPS) {
    const audioPath = path.join(AUDIO_DIR, clip.filename);
    const audioDur = getAudioDuration(audioPath);
    // Scene duration = max of audio length and target duration
    const sceneDur = Math.max(audioDur, clip.targetDuration);
    durations.push(sceneDur);
    console.log(`  ${clip.filename}: audio=${audioDur.toFixed(2)}s, scene=${sceneDur.toFixed(2)}s`);
  }
  const totalDuration = durations.reduce((a, b) => a + b, 0);
  console.log(`  Total: ${totalDuration.toFixed(1)}s\n`);

  // ── Step 2: Capture screenshots ─────────────────────────────────────────
  console.log("Step 2: Launching browser for screenshots...\n");

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

  // ── Frame 0: Cold open title card ──────────────────────────────────────
  console.log("--- Frame 0: Cold Open ---");
  await generateTitleFrame(browser, path.join(FRAMES_DIR, "00-cold-open.png"), {
    lines: [
      { text: "You hired AI agents.", size: 72, weight: 700 },
      { text: "Who's managing them?", size: 72, weight: 700, color: "#d97757" },
    ],
  });
  console.log("  [title] 00-cold-open.png");

  // ── App screenshots ────────────────────────────────────────────────────
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  // Set localStorage to skip onboarding
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("nodebench-onboarded", "true");
    localStorage.setItem("nodebench-onboarding-done", "true");
  });

  // Frame 1: Landing page hero
  console.log("\n--- Frame 1: Landing Hero ---");
  await navigateTo(page, "/?surface=ask");
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "01-landing.png"), 2500);

  // Frame 2: Founder Dashboard
  console.log("\n--- Frame 2: Founder Dashboard ---");
  await navigateTo(page, "/founder");
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "02-dashboard.png"), 2500);

  // Frame 3: Scroll to Recommended Actions
  console.log("\n--- Frame 3: Recommended Actions ---");
  await scrollToBottom(page, 700);
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "03-actions.png"), 1500);

  // Frame 4: Click Accept on first action
  console.log("\n--- Frame 4: Accept Action ---");
  // Try to click an accept button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const accept = btns.find((b) =>
      b.textContent?.includes("Accept") ||
      b.textContent?.includes("approve") ||
      b.textContent?.includes("Approve")
    );
    if (accept) accept.click();
  });
  await sleep(1200);
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "04-accept.png"), 500);

  // Frame 5: Command Center / Agent Oversight
  console.log("\n--- Frame 5: Command Center ---");
  await navigateTo(page, "/founder/agents");
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "05-command.png"), 2500);

  // Frame 6: Scroll command center for more detail
  console.log("\n--- Frame 6: Approval Queue ---");
  await scrollToBottom(page, 500);
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "06-approval.png"), 1500);

  // Frame 7: Shareable Decision Memo
  console.log("\n--- Frame 7: Decision Memo ---");
  await navigateTo(page, "/memo/demo");
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "07-memo.png"), 3000);

  // Frame 8: Agent Oversight (back to agents view, scroll to status)
  console.log("\n--- Frame 8: Agent Oversight ---");
  await navigateTo(page, "/founder/agents");
  // Scroll down to see agent status dots
  await scrollToBottom(page, 300);
  await waitAndScreenshot(page, path.join(FRAMES_DIR, "08-oversight.png"), 1500);

  await page.close();

  // ── Frame 9: Closing CTA title card ────────────────────────────────────
  console.log("\n--- Frame 9: Closing CTA ---");
  await generateTitleFrame(browser, path.join(FRAMES_DIR, "09-closing.png"), {
    lines: [
      { text: "NodeBench", size: 80, weight: 700 },
      { text: "Your company's operating intelligence", size: 36, weight: 400, color: "rgba(255,255,255,0.7)" },
      { text: "", size: 24 },
      { text: "nodebenchai.com", size: 44, weight: 600, color: "#d97757" },
      { text: "npx nodebench-mcp demo", size: 28, weight: 400, color: "rgba(255,255,255,0.5)" },
    ],
  });
  console.log("  [title] 09-closing.png");

  await browser.close();
  console.log("\nBrowser closed. All frames captured.\n");

  // ── Step 3: Encode individual clip videos ───────────────────────────────
  console.log("Step 3: Encoding clip videos...\n");

  const clipVideos: string[] = [];
  for (let i = 0; i < CLIPS.length; i++) {
    const clip = CLIPS[i];
    const clipVideo = path.join(OUT_DIR, `va_clip_${String(i).padStart(2, "0")}.mp4`);
    const audioPath = path.join(AUDIO_DIR, clip.filename);
    const framePath = path.join(FRAMES_DIR, `${clip.frame}.png`);
    const dur = durations[i];

    // Verify frame exists
    if (!fs.existsSync(framePath)) {
      console.error(`  [WARN] Missing frame: ${framePath}, using previous`);
      const prevFrame = clipVideos.length > 0
        ? path.join(FRAMES_DIR, `${CLIPS[i - 1].frame}.png`)
        : path.join(FRAMES_DIR, "00-cold-open.png");
      fs.copyFileSync(prevFrame, framePath);
    }

    console.log(`  Encoding clip ${i}: ${clip.frame} + ${clip.filename} (${dur.toFixed(2)}s)`);

    // Use -t for scene duration (may be longer than audio — video holds frame, audio has trailing silence)
    // amix with anullsrc ensures audio track always exists for full duration
    const r = spawnSync("ffmpeg", [
      "-y",
      "-loop", "1",
      "-i", framePath,
      "-i", audioPath,
      "-f", "lavfi", "-t", String(dur),
      "-i", "anullsrc=r=44100:cl=stereo",
      "-filter_complex", `[1:a][2:a]amix=inputs=2:duration=longest[aout]`,
      "-map", "0:v",
      "-map", "[aout]",
      "-c:v", "libx264",
      "-tune", "stillimage",
      "-c:a", "aac",
      "-b:a", "192k",
      "-pix_fmt", "yuv420p",
      "-t", String(dur),
      "-vf", `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:black`,
      clipVideo,
    ], { encoding: "utf-8", stdio: "pipe" });

    if (r.status !== 0) {
      console.error(`  ERROR clip ${i}: ${r.stderr?.slice(-300)}`);
      // Fallback: simpler — just image + audio, duration = audio length
      spawnSync("ffmpeg", [
        "-y", "-loop", "1", "-i", framePath,
        "-i", audioPath,
        "-c:v", "libx264", "-c:a", "aac", "-b:a", "128k",
        "-pix_fmt", "yuv420p", "-t", String(dur),
        "-shortest",
        clipVideo,
      ], { encoding: "utf-8", stdio: "pipe" });
    }
    clipVideos.push(clipVideo);
  }

  // ── Step 4: Concatenate into final video ────────────────────────────────
  console.log("\nStep 4: Concatenating into final video...\n");

  const concatListPath = path.join(OUT_DIR, "va_concat_list.txt");
  const concatContent = clipVideos.map((v) => `file '${v.replace(/\\/g, "/")}'`).join("\n");
  fs.writeFileSync(concatListPath, concatContent, "utf-8");

  const finalOutput = path.join(OUT_DIR, "nodebench-variant-a.mp4");

  // First try: simple concat (same codec params)
  let concatResult = spawnSync("ffmpeg", [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concatListPath,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    finalOutput,
  ], { encoding: "utf-8", stdio: "pipe" });

  if (concatResult.status !== 0) {
    console.error("Concat failed, trying re-encode...");
    concatResult = spawnSync("ffmpeg", [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", concatListPath,
      "-vf", `scale=${WIDTH}:${HEIGHT},format=yuv420p`,
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      finalOutput,
    ], { encoding: "utf-8", stdio: "pipe" });
  }

  // ── Step 5: Try to compress under 5MB ───────────────────────────────────
  if (fs.existsSync(finalOutput)) {
    const sizeMB = fs.statSync(finalOutput).size / 1024 / 1024;
    if (sizeMB > 5) {
      console.log(`  Video is ${sizeMB.toFixed(1)}MB — compressing to target <5MB...`);
      const compressedOutput = path.join(OUT_DIR, "nodebench-variant-a-compressed.mp4");
      // Calculate target bitrate: 5MB * 8 bits / duration = target bitrate
      const targetBitrateKbps = Math.floor((4.5 * 8 * 1024) / totalDuration);
      spawnSync("ffmpeg", [
        "-y",
        "-i", finalOutput,
        "-c:v", "libx264",
        "-preset", "slow",
        "-b:v", `${targetBitrateKbps}k`,
        "-maxrate", `${targetBitrateKbps * 1.5}k`,
        "-bufsize", `${targetBitrateKbps * 2}k`,
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        compressedOutput,
      ], { encoding: "utf-8", stdio: "pipe" });

      if (fs.existsSync(compressedOutput) && fs.statSync(compressedOutput).size < fs.statSync(finalOutput).size) {
        fs.renameSync(compressedOutput, finalOutput);
        console.log(`  Compressed to ${(fs.statSync(finalOutput).size / 1024 / 1024).toFixed(1)}MB`);
      } else {
        try { fs.unlinkSync(compressedOutput); } catch {}
      }
    }
  }

  // ── Step 6: Clean up intermediate files ─────────────────────────────────
  console.log("\nCleaning up intermediate files...");
  for (const cv of clipVideos) {
    try { fs.unlinkSync(cv); } catch {}
  }
  try { fs.unlinkSync(concatListPath); } catch {}

  // ── Step 7: Verify output ───────────────────────────────────────────────
  if (fs.existsSync(finalOutput)) {
    const stats = fs.statSync(finalOutput);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);

    const probeResult = spawnSync("ffprobe", [
      "-v", "quiet", "-show_entries", "format=duration",
      "-of", "csv=p=0", finalOutput,
    ], { encoding: "utf-8" });
    const actualDuration = probeResult.stdout.trim();

    console.log(`\n${"=".repeat(50)}`);
    console.log(`  SUCCESS: Variant A video produced`);
    console.log(`  Output:   ${finalOutput}`);
    console.log(`  Size:     ${sizeMB} MB`);
    console.log(`  Duration: ${actualDuration}s`);
    console.log(`  Frames:   ${CLIPS.length}`);
    console.log(`${"=".repeat(50)}`);
  } else {
    console.error("\nFAILED: Output file not created.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
