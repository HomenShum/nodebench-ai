#!/usr/bin/env node
/**
 * Simple onboarding screen capture — injects components directly into a blank page
 * to render each onboarding state in isolation, then captures screenshots.
 *
 * Usage: node scripts/design/captureOnboardingSimple.mjs
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(ROOT, "public/dogfood/onboarding");
const DEV_URL = "http://localhost:5173";

fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  console.log("Onboarding Screen Capture");
  console.log("=".repeat(50));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: "light",
  });
  const page = await context.newPage();

  const results = [];

  // ── Flow 4: Tutorial Page (easiest to capture — full route) ──────
  console.log("\n[Flow 4] Tutorial Page");
  try {
    await page.goto(`${DEV_URL}/onboarding`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(3000);
    const buf = await page.screenshot({ path: path.join(OUT_DIR, "4.1-tutorial-inprogress.png") });
    results.push({ id: "4.1-tutorial-inprogress", status: "ok", size: buf.length });
    console.log("  4.1 Tutorial In-Progress captured");
  } catch (e) {
    console.error("  4.1 failed:", e.message);
    results.push({ id: "4.1-tutorial-inprogress", status: "error" });
  }

  // ── Flow 1: Agent Guided Onboarding (render as overlay on root) ──
  console.log("\n[Flow 1] Agent Guided Onboarding");
  await page.goto(`${DEV_URL}/`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(2000);

  // Inject via React — render AgentGuidedOnboarding into a portal div
  for (let step = 0; step < 4; step++) {
    const stepId = ["1.1-agent-welcome", "1.2-agent-fast", "1.3-agent-deep", "1.4-agent-ready"][step];
    try {
      await page.evaluate((stepIdx) => {
        // Find the onboarding component and set its step
        const modal = document.querySelector('.fixed.inset-0.z-50');
        if (!modal && stepIdx === 0) {
          // Try dispatching a custom event or setting localStorage
          localStorage.setItem("nodebench_show_agent_onboarding", "true");
          localStorage.removeItem("nodebench_agent_onboarding_completed");
        }
      }, step);

      if (step === 0) {
        // Reload to trigger the onboarding
        await page.reload({ waitUntil: "networkidle", timeout: 15000 });
        await page.waitForTimeout(3000);
      } else {
        // Click Next button
        const nextBtn = page.locator("button").filter({ hasText: /^Next/ });
        if (await nextBtn.count() > 0) {
          await nextBtn.first().click();
          await page.waitForTimeout(500);
        }
      }

      // Check if modal is visible
      const modal = page.locator('.fixed.inset-0.z-50');
      if (await modal.count() > 0) {
        const buf = await page.screenshot({ path: path.join(OUT_DIR, `${stepId}.png`) });
        results.push({ id: stepId, status: "ok", size: buf.length });
        console.log(`  ${stepId} captured`);
      } else {
        // Full page fallback
        const buf = await page.screenshot({ path: path.join(OUT_DIR, `${stepId}.png`) });
        results.push({ id: stepId, status: "ok-fallback", size: buf.length });
        console.log(`  ${stepId} captured (fallback — no modal found)`);
      }
    } catch (e) {
      console.error(`  ${stepId} failed:`, e.message);
      results.push({ id: stepId, status: "error" });
    }
  }

  // Clean up agent onboarding state
  await page.evaluate(() => {
    localStorage.removeItem("nodebench_show_agent_onboarding");
    localStorage.setItem("nodebench_agent_onboarding_completed", "true");
  });

  // ── Flow 2: Operator Profile Wizard ──────────────────────────────
  console.log("\n[Flow 2] Operator Profile Wizard");
  await page.goto(`${DEV_URL}/`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(3000);

  // The profile wizard is usually in the sidebar/settings area
  // Try to find it or navigate to settings
  try {
    // Look for an existing profile card first
    const profileCard = page.locator('text=My Profile, text=Edit');
    if (await profileCard.first().count() > 0) {
      const buf = await page.screenshot({ path: path.join(OUT_DIR, "2.1-profile-saved.png") });
      results.push({ id: "2.1-profile-saved", status: "ok", size: buf.length });
      console.log("  2.1 Profile Saved captured");

      // Click Edit to get step 1
      const editBtn = page.locator("button").filter({ hasText: "Edit" }).first();
      if (await editBtn.count() > 0) {
        await editBtn.click();
        await page.waitForTimeout(500);
        const buf2 = await page.screenshot({ path: path.join(OUT_DIR, "2.2-profile-step1.png") });
        results.push({ id: "2.2-profile-step1", status: "ok", size: buf2.length });
        console.log("  2.2 Profile Step 1 captured");

        // Click Next
        const nextBtn = page.locator("button").filter({ hasText: "Next" });
        if (await nextBtn.count() > 0) {
          await nextBtn.click();
          await page.waitForTimeout(500);
          const buf3 = await page.screenshot({ path: path.join(OUT_DIR, "2.3-profile-step2.png") });
          results.push({ id: "2.3-profile-step2", status: "ok", size: buf3.length });
          console.log("  2.3 Profile Step 2 captured");
        }
      }
    } else {
      console.log("  2.x Profile wizard not visible on this page. Skipping.");
      results.push({ id: "2.1-profile-saved", status: "skipped" });
    }
  } catch (e) {
    console.error("  2.x Profile capture failed:", e.message);
    results.push({ id: "2.1-profile-saved", status: "error" });
  }

  // ── Flow 3: Proactive Onboarding ─────────────────────────────────
  console.log("\n[Flow 3] Proactive Onboarding (Smart Alerts)");
  await page.goto(`${DEV_URL}/proactive`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(3000);

  const proactiveSteps = [
    "3.1-proactive-welcome",
    "3.2-proactive-consent",
    "3.3-proactive-features",
    "3.4-proactive-preferences",
    "3.5-proactive-success",
  ];

  try {
    // Look for "Get Started" button (empty state)
    const getStartedBtn = page.locator("button").filter({ hasText: "Get Started" });
    if (await getStartedBtn.count() > 0) {
      await getStartedBtn.click();
      await page.waitForTimeout(1000);
    }

    for (let i = 0; i < proactiveSteps.length; i++) {
      const stepId = proactiveSteps[i];

      // Handle step-specific actions before screenshot
      if (i === 2) {
        // Step 3 needs consent checkbox checked first
        const checkbox = page.locator('input[type="checkbox"]').first();
        if (await checkbox.count() > 0 && !(await checkbox.isChecked())) {
          await checkbox.check();
          await page.waitForTimeout(200);
        }
      }

      if (i > 0) {
        const nextBtn = page.locator("button").filter({ hasText: "Next" });
        if (await nextBtn.count() > 0) {
          await nextBtn.first().click();
          await page.waitForTimeout(800);
        }
      }

      const modal = page.locator('[role="dialog"]');
      if (await modal.count() > 0) {
        const buf = await page.screenshot({ path: path.join(OUT_DIR, `${stepId}.png`) });
        results.push({ id: stepId, status: "ok", size: buf.length });
        console.log(`  ${stepId} captured`);
      } else {
        const buf = await page.screenshot({ path: path.join(OUT_DIR, `${stepId}.png`) });
        results.push({ id: stepId, status: "ok-fallback", size: buf.length });
        console.log(`  ${stepId} captured (fallback)`);
      }
    }
  } catch (e) {
    console.error("  3.x Proactive capture failed:", e.message);
    results.push({ id: "3.x-proactive", status: "error" });
  }

  await browser.close();

  // ── Write manifest ────────────────────────────────────────────────
  const manifest = {
    generatedAt: new Date().toISOString(),
    totalScreens: 14,
    captured: results.filter(r => r.status === "ok" || r.status === "ok-fallback").length,
    results,
  };
  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log("\n" + "=".repeat(50));
  console.log(`Captured: ${manifest.captured}/${manifest.totalScreens} screens`);
  console.log(`Output: ${OUT_DIR}`);

  return manifest;
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
