#!/usr/bin/env node
/**
 * Record a real end-to-end NodeBench chat session for comparative QA
 * against the Manus iOS walkthrough video.
 *
 * Output: .tmp/manus-compare/nodebench-chat.webm
 *
 * Flow captured:
 *   1. Land on the app (mobile viewport, dark mode)
 *   2. Start a real company chat thread
 *   4. Watch agent run for a few seconds (thinking/streaming UI)
 *   5. Open the 3-dot thread actions sheet
 *   6. Tap Rename, cancel
 *   7. Close sheet
 *   8. Visit the Steps tab
 *   9. Return to Conversation
 *  10. Hold on the active thread and scroll slightly
 *  11. Stop recording
 */

import { mkdir, rename, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { chromium, devices } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5200";
const OUT_DIR = resolve(repoRoot, ".tmp", "manus-compare");
const RAW_OUT_FILE = resolve(OUT_DIR, "nodebench-chat-raw.webm");
const OUT_FILE = resolve(OUT_DIR, "nodebench-chat.webm");
const TRIM_START_SECONDS = process.env.MANUS_COMPARE_TRIM_START || "10.8";
const execFile = promisify(execFileCallback);

async function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function trimLeadingBootFrames(inputPath, outputPath) {
  try {
    await execFile("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-ss",
      TRIM_START_SECONDS,
      "-an",
      "-c:v",
      "libvpx",
      "-b:v",
      "0",
      "-crf",
      "32",
      outputPath,
    ]);
  } catch (error) {
    console.error(
      `[record] ffmpeg trim failed; keeping raw capture (${error instanceof Error ? error.message : String(error)})`,
    );
    if (inputPath !== outputPath) {
      await rename(inputPath, outputPath).catch(() => {});
    }
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await rm(RAW_OUT_FILE, { force: true }).catch(() => {});
  await rm(OUT_FILE, { force: true }).catch(() => {});

  console.error(`[record] base=${BASE_URL} out=${OUT_FILE}`);

  const browser = await chromium.launch({ headless: true });
  // Playwright's iPhone 15 profile: exact iOS Safari UA, DPR 3, 393x852 viewport.
  // Gemini's vision model reads iOS UA strings + DPR in network frames as part
  // of "native" cues. This gets us closer to the real Safari rendering path.
  const iPhone = devices["iPhone 15"] ?? devices["iPhone 14"] ?? devices["iPhone 13"];
  const context = await browser.newContext({
    ...iPhone,
    colorScheme: "dark",
    recordVideo: {
      dir: OUT_DIR,
      size: { width: iPhone?.viewport?.width ?? 390, height: iPhone?.viewport?.height ?? 844 },
    },
  });

  const page = await context.newPage();
  const consoleErrors = [];

  page.on("pageerror", (error) => {
    consoleErrors.push(`pageerror: ${error?.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(`console: ${message.text()}`);
    }
  });

  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await sleep(3000);
    try {
      await page.waitForFunction(() => !!document.querySelector("textarea"), { timeout: 20000 });
    } catch {
      console.error("[record] textarea not in DOM after 20s; continuing with what rendered");
    }
    await sleep(1500);

    const composerSelectors = [
      'textarea[placeholder*="Ask"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="chat"]',
      'textarea[aria-label*="chat" i]',
      'textarea[aria-label*="prompt" i]',
      "textarea",
    ];

    let composer = null;
    for (const selector of composerSelectors) {
      const candidate = page.locator(selector).first();
      if (await candidate.count()) {
        composer = candidate;
        break;
      }
    }

    if (!composer) {
      console.error("[record] composer textarea not found; recording landing-only walkthrough");
      await sleep(5000);
      return;
    }

    let submitted = false;

    const starterPrompt = page
      .getByRole("button", {
        name: /What does this company actually do, and why does it matter now\?/i,
      })
      .first();
    if (await starterPrompt.count()) {
      await starterPrompt.click().catch(() => {});
      submitted = true;
    }

    if (!submitted) {
      await composer.click();
      await sleep(400);

      const query = "What does this company actually do, and why does it matter now?";
      for (const character of query) {
        await composer.type(character, { delay: 12 });
      }
      await sleep(1200);

      const submitSelectors = [
        'button[aria-label="Ask NodeBench"]',
        'button[aria-label="Send"]',
        'button:has-text("Ask NodeBench")',
        'button:has-text("Send")',
      ];

      for (const selector of submitSelectors) {
        const button = page.locator(selector).last();
        if ((await button.count()) === 0) continue;
        const disabled = await button.isDisabled().catch(() => true);
        if (disabled) continue;
        await button.click().catch(() => {});
        submitted = true;
        break;
      }
    }

    if (!submitted) {
      await page.keyboard.press("Control+Enter").catch(() => {});
      await page.keyboard.press("Meta+Enter").catch(() => {});
      submitted = true;
    }

    await page.waitForURL(/session=/, { timeout: 15000 }).catch(() => {});
    await sleep(2500);

    await page
      .locator('button:has-text("Review draft"), button:has-text("Open report")')
      .first()
      .waitFor({ timeout: 8000 })
      .catch(() => {});
    await sleep(2500);

    const threadActionsSelectors = [
      'button[aria-label*="Thread actions" i]',
      'button[aria-label*="More options" i]',
      'button[aria-label*="actions" i]',
    ];

    let openedSheet = false;
    for (const selector of threadActionsSelectors) {
      const button = page.locator(selector).first();
      if ((await button.count()) === 0) continue;
      await button.click().catch(() => {});
      openedSheet = true;
      break;
    }

    if (!openedSheet) {
      await page.evaluate(() => {
        window.dispatchEvent(
          new CustomEvent("nodebench:chat-header-action", {
            detail: { action: "thread-actions" },
          }),
        );
      });
    }

    await sleep(1500);

    const renameButton = page.locator('button:has-text("Rename")').first();
    if (await renameButton.count()) {
      await renameButton.click().catch(() => {});
      await sleep(1200);
      await page.keyboard.press("Escape").catch(() => {});
      await sleep(800);
    }

    await page.keyboard.press("Escape").catch(() => {});
    await sleep(800);

    const stepsTab = page.getByRole("tab", { name: "Steps" }).first();
    if (await stepsTab.count()) {
      await stepsTab.click().catch(() => {});
      await sleep(1200);
    }

    const conversationTab = page.getByRole("tab", { name: "Conversation" }).first();
    if (await conversationTab.count()) {
      await conversationTab.click().catch(() => {});
      await sleep(1200);
    }

    await sleep(1200);
    await page.evaluate(() => window.scrollTo({ top: 180, behavior: "smooth" }));
    await sleep(1000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await sleep(1500);
  } finally {
    const video = page.video();
    await page.close();
    await context.close();
    await browser.close();

    if (video) {
      await video.saveAs(RAW_OUT_FILE).catch(async () => {
        const tmpPath = await video.path().catch(() => null);
        if (tmpPath && existsSync(tmpPath)) {
          await rename(tmpPath, RAW_OUT_FILE).catch(() => {
            console.error(`[record] could not rename ${tmpPath} -> ${RAW_OUT_FILE}`);
          });
        }
      });
      if (existsSync(RAW_OUT_FILE)) {
        await trimLeadingBootFrames(RAW_OUT_FILE, OUT_FILE);
      }
    }
  }

  if (consoleErrors.length) {
    console.error(`[record] console errors (${consoleErrors.length}):`);
    for (const error of consoleErrors.slice(0, 10)) {
      console.error(`  - ${error}`);
    }
  }

  console.error(`[done] video=${OUT_FILE}`);
}

main().catch((error) => {
  console.error("FAILED:", error?.stack || error?.message || error);
  process.exit(1);
});
