#!/usr/bin/env node
/**
 * recordClaw3DOffice.mjs — Record the Claw3D 3D Agent Office in action.
 *
 * Captures:
 *   1. The standalone Claw3D 3D office at localhost:3000/office
 *   2. The 3D office embedded inside NodeBench at /founder/3dclaw
 *   3. Navigation between Coordination Hub and 3D office
 *   4. Real API calls firing while 3D office is visible
 *
 * Output: public/dogfood/claw3d-office-demo.mp4
 */

import { chromium } from "playwright";
import { existsSync, mkdirSync, writeFileSync, renameSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
function getArg(name, fallback) { const i = args.indexOf(name); return i >= 0 && args[i+1] ? args[i+1] : fallback; }

const claw3dURL = getArg("--claw3d", "http://localhost:3000");
const nodebenchURL = getArg("--nodebench", "http://localhost:5191");
const serverURL = getArg("--server", "http://localhost:3100");
const headless = !args.includes("--headed");

const outDir = resolve(".tmp/claw3d-office-video");
const publicDir = resolve("public/dogfood");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

async function maybeTranscodeToMp4(input, output) {
  let ffmpegPath;
  try { const m = await import("ffmpeg-static"); ffmpegPath = m.default || m; } catch { return { ok: false, reason: "ffmpeg-static not installed" }; }
  if (!ffmpegPath) return { ok: false, reason: "ffmpeg binary missing" };
  try {
    execSync(`"${ffmpegPath}" -y -i "${input}" -c:v libx264 -preset veryfast -crf 28 -pix_fmt yuv420p -movflags +faststart "${output}"`, { stdio: "pipe", timeout: 120_000 });
    return { ok: true };
  } catch (e) { return { ok: false, reason: e.message }; }
}

async function main() {
  console.log("[claw3d-office] Recording 3D Agent Office demo...");
  console.log(`  Claw3D:    ${claw3dURL}`);
  console.log(`  NodeBench: ${nodebenchURL}`);
  console.log(`  Server:    ${serverURL}`);

  // Verify all services
  for (const [name, url] of [["Backend", `${serverURL}/health`], ["Claw3D", `${claw3dURL}/office`]]) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error(`${r.status}`);
      console.log(`  [OK] ${name}`);
    } catch (e) {
      console.error(`  [FAIL] ${name}: ${e.message}`);
      process.exit(1);
    }
  }

  const userDataDir = resolve(".tmp/claw3d-office-userdata");
  if (!existsSync(userDataDir)) mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless,
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
    reducedMotion: "no-preference", // Keep animations for 3D
    recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
  });

  const page = context.pages()[0] || await context.newPage();
  const chapters = [];
  const t0 = Date.now();
  const mark = (name) => { const s = ((Date.now() - t0) / 1000); chapters.push({ name, startSec: Math.round(s * 10) / 10 }); console.log(`  [${s.toFixed(1)}s] ${name}`); };

  // Dismiss onboarding
  await page.goto(`${nodebenchURL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => { localStorage.setItem("nodebench-onboarded", "true"); localStorage.setItem("nodebench-founder-onboarding-done", "true"); });

  try {
    // ── Chapter 1: Standalone Claw3D 3D Office ──────────────────────
    mark("Claw3D 3D Office — standalone");
    await page.goto(`${claw3dURL}/office`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000); // Let Three.js scene render + animations settle

    // ── Chapter 2: Interact with 3D scene ───────────────────────────
    mark("3D Office — exploring workspace");
    // Drag to look around the office
    await page.mouse.move(720, 450);
    await page.mouse.down();
    await page.mouse.move(900, 400, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(2000);

    // Pan the other direction
    await page.mouse.move(720, 450);
    await page.mouse.down();
    await page.mouse.move(540, 500, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(2000);

    // ── Chapter 3: Scroll/zoom in the 3D scene ─────────────────────
    mark("3D Office — zooming in");
    await page.mouse.wheel(0, -300); // Zoom in
    await page.waitForTimeout(1500);
    await page.mouse.wheel(0, 200); // Zoom back out
    await page.waitForTimeout(1500);

    // ── Chapter 4: NodeBench 3DClaw iframe view ─────────────────────
    mark("NodeBench — 3D Agent Office (iframe)");
    await page.goto(`${nodebenchURL}/founder/3dclaw`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(4000); // Let iframe load + 3D scene init

    // ── Chapter 5: Show header bar with controls ────────────────────
    mark("NodeBench — 3DClaw header with Open Standalone button");
    await page.waitForTimeout(2000);

    // ── Chapter 6: Switch to Coordination Hub ───────────────────────
    mark("NodeBench — Coordination Hub (2D view)");
    await page.goto(`${nodebenchURL}/founder/coordination`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);

    // ── Chapter 7: Fire real API calls ──────────────────────────────
    mark("Firing real API calls — publish + delegate");
    await fetch(`${serverURL}/api/shared-context/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packet: {
          entityName: "Anthropic", canonicalEntity: "Anthropic",
          answer: "Claude 4.6 Opus — 1M context, native tool use, agentic workflows.",
          confidence: 92, proofStatus: "verified",
          packetId: "claw3d-demo-anthropic", packetType: "founder_packet",
          query: "What is Anthropic building?",
          changes: [{ description: "Claude 4.6 released with extended context" }],
          risks: [{ title: "OpenAI o3 competitive pressure" }],
        }
      }),
    });
    await fetch(`${serverURL}/api/shared-context/delegate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packet: {
          entityName: "Anthropic", canonicalEntity: "Anthropic",
          answer: "Claude 4.6 Opus — most capable coding model.",
          confidence: 92, proofStatus: "verified",
          packetId: "claw3d-demo-anthropic", packetType: "founder_packet",
        },
        targetAgent: "claude_code",
        goal: "Build competitive analysis: Claude 4.6 vs GPT-5",
      }),
    });

    // Refresh to show live data
    const refreshBtn = page.locator('button[aria-label="Refresh"]');
    if (await refreshBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await refreshBtn.click();
    }
    await page.waitForTimeout(2000);

    // ── Chapter 8: Back to 3D office ────────────────────────────────
    mark("Back to 3D Agent Office");
    await page.goto(`${claw3dURL}/office`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(4000);

    // ── Chapter 9: Final panoramic view ─────────────────────────────
    mark("Final panoramic view of AI workspace");
    await page.mouse.move(720, 450);
    await page.mouse.down();
    await page.mouse.move(400, 350, { steps: 30 });
    await page.mouse.up();
    await page.waitForTimeout(3000);

  } catch (err) {
    console.error("[claw3d-office] Error:", err.message);
  }

  await context.close();

  // Find and transcode video
  const videos = readdirSync(outDir).filter(f => f.endsWith(".webm"));
  if (videos.length === 0) { console.error("No video found"); process.exit(1); }
  const latest = resolve(outDir, videos[videos.length - 1]);
  const webmDest = join(publicDir, "claw3d-office-demo.webm");
  const mp4Dest = join(publicDir, "claw3d-office-demo.mp4");

  renameSync(latest, webmDest);
  console.log(`[claw3d-office] WebM: ${webmDest}`);

  const tc = await maybeTranscodeToMp4(webmDest, mp4Dest);
  if (tc.ok) console.log(`[claw3d-office] MP4: ${mp4Dest}`);
  else console.warn(`[claw3d-office] Transcode skipped: ${tc.reason}`);

  writeFileSync(join(publicDir, "claw3d-office-demo.json"), JSON.stringify({
    capturedAtIso: new Date().toISOString(),
    claw3dURL, nodebenchURL, serverURL,
    mime: tc.ok ? "video/mp4" : "video/webm",
    chapters,
    videoPath: tc.ok ? "/dogfood/claw3d-office-demo.mp4" : "/dogfood/claw3d-office-demo.webm",
  }, null, 2));

  console.log("[claw3d-office] Done!");
}

main().catch(e => { console.error("[claw3d-office] Fatal:", e); process.exit(1); });
