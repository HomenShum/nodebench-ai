#!/usr/bin/env node
/**
 * captureOnboardingScreens.mjs
 *
 * Captures pixel-perfect screenshots of every onboarding state using Playwright,
 * then pushes them to the Figma design system file as image fills in dedicated frames.
 *
 * Usage:
 *   node scripts/design/captureOnboardingScreens.mjs                # capture + push to Figma
 *   node scripts/design/captureOnboardingScreens.mjs --capture-only # capture screenshots only
 *   node scripts/design/captureOnboardingScreens.mjs --push-only    # push existing screenshots to Figma
 *   node scripts/design/captureOnboardingScreens.mjs --dry-run      # show what would be done
 *
 * Requirements:
 *   - Dev server running at http://localhost:5173
 *   - FIGMA_ACCESS_TOKEN and FIGMA_DESIGN_SYSTEM_FILE in .env.local
 *   - npx playwright install chromium (one-time)
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(ROOT, "public/dogfood/onboarding");

// ── Config ──────────────────────────────────────────────────────────

const DEV_URL = process.env.DEV_URL || "http://localhost:5173";
const FIGMA_TOKEN = process.env.FIGMA_ACCESS_TOKEN;
const FIGMA_FILE = process.env.FIGMA_DESIGN_SYSTEM_FILE;

const args = process.argv.slice(2);
const captureOnly = args.includes("--capture-only");
const pushOnly = args.includes("--push-only");
const dryRun = args.includes("--dry-run");

// ── Screen Definitions ──────────────────────────────────────────────

const SCREENS = [
  // Flow 1: Agent Guided Onboarding (4 steps)
  // These are modals that overlay the main app. We trigger them programmatically.
  {
    id: "1.1-agent-welcome",
    flow: "Agent Guided Onboarding",
    title: "Welcome — Meet Your AI Assistants",
    capture: async (page) => {
      await page.goto(`${DEV_URL}/`);
      await page.waitForTimeout(2000);
      // Inject the AgentGuidedOnboarding component via React devtools or localStorage trick
      await page.evaluate(() => {
        // Trigger onboarding by dispatching a custom event the app listens to
        // Fallback: set localStorage flag and reload
        localStorage.setItem("nodebench_show_agent_onboarding", "true");
        localStorage.removeItem("nodebench_agent_onboarding_completed");
      });
      await page.reload();
      await page.waitForTimeout(3000);
      // If modal is visible, capture it
      const modal = page.locator('[role="dialog"], .fixed.inset-0');
      if (await modal.count() > 0) {
        return await modal.first().screenshot();
      }
      // Fallback: full page
      return await page.screenshot({ fullPage: false });
    },
  },
  {
    id: "1.2-agent-fast",
    flow: "Agent Guided Onboarding",
    title: "Fast Agent — Quick answers",
    capture: async (page) => {
      // Click Next from welcome step
      const nextBtn = page.locator("button", { hasText: "Next" });
      if (await nextBtn.count() > 0) await nextBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('[role="dialog"], .fixed.inset-0');
      if (await modal.count() > 0) return await modal.first().screenshot();
      return await page.screenshot({ fullPage: false });
    },
  },
  {
    id: "1.3-agent-deep",
    flow: "Agent Guided Onboarding",
    title: "Deep Agent — Multi-step planning",
    capture: async (page) => {
      const nextBtn = page.locator("button", { hasText: "Next" });
      if (await nextBtn.count() > 0) await nextBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('[role="dialog"], .fixed.inset-0');
      if (await modal.count() > 0) return await modal.first().screenshot();
      return await page.screenshot({ fullPage: false });
    },
  },
  {
    id: "1.4-agent-ready",
    flow: "Agent Guided Onboarding",
    title: "Ready to Start",
    capture: async (page) => {
      const nextBtn = page.locator("button", { hasText: "Next" });
      if (await nextBtn.count() > 0) await nextBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('[role="dialog"], .fixed.inset-0');
      if (await modal.count() > 0) return await modal.first().screenshot();
      return await page.screenshot({ fullPage: false });
    },
  },

  // Flow 2: Operator Profile Wizard (inline component, visible in settings or research hub)
  {
    id: "2.1-profile-saved",
    flow: "Operator Profile Wizard",
    title: "Saved Profile — Compact Card",
    capture: async (page) => {
      await page.goto(`${DEV_URL}/`);
      await page.waitForTimeout(3000);
      // The profile wizard appears in the sidebar or settings. Look for it.
      const profile = page.locator('[class*="OperatorProfile"], [data-testid="operator-profile"]');
      if (await profile.count() > 0) return await profile.first().screenshot();
      // Try settings route
      await page.goto(`${DEV_URL}/settings`);
      await page.waitForTimeout(2000);
      return await page.screenshot({ fullPage: false });
    },
  },
  {
    id: "2.2-profile-step1",
    flow: "Operator Profile Wizard",
    title: "Step 1 — Profile Form",
    capture: async (page) => {
      // Click Edit on the profile card to enter wizard mode
      const editBtn = page.locator("button", { hasText: "Edit" });
      if (await editBtn.count() > 0) await editBtn.first().click();
      await page.waitForTimeout(500);
      const wizard = page.locator('[class*="OperatorProfile"], .space-y-5');
      if (await wizard.count() > 0) return await wizard.first().screenshot();
      return await page.screenshot({ fullPage: false });
    },
  },
  {
    id: "2.3-profile-step2",
    flow: "Operator Profile Wizard",
    title: "Step 2 — Schedule Selection",
    capture: async (page) => {
      const nextBtn = page.locator("button", { hasText: "Next" });
      if (await nextBtn.count() > 0) await nextBtn.click();
      await page.waitForTimeout(500);
      return await page.screenshot({ fullPage: false });
    },
  },

  // Flow 3: Proactive Onboarding (5 steps) — modal at /proactive or triggered from feed
  {
    id: "3.1-proactive-welcome",
    flow: "Proactive Onboarding",
    title: "Welcome to Smart Alerts",
    capture: async (page) => {
      await page.goto(`${DEV_URL}/proactive`);
      await page.waitForTimeout(3000);
      // Click "Get Started" if the empty state is showing
      const getStarted = page.locator("button", { hasText: "Get Started" });
      if (await getStarted.count() > 0) await getStarted.click();
      await page.waitForTimeout(1000);
      const modal = page.locator('[role="dialog"]');
      if (await modal.count() > 0) return await modal.first().screenshot();
      return await page.screenshot({ fullPage: false });
    },
  },
  {
    id: "3.2-proactive-consent",
    flow: "Proactive Onboarding",
    title: "Privacy & Consent",
    capture: async (page) => {
      const nextBtn = page.locator("button", { hasText: "Next" });
      if (await nextBtn.count() > 0) await nextBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('[role="dialog"]');
      if (await modal.count() > 0) return await modal.first().screenshot();
      return await page.screenshot({ fullPage: false });
    },
  },
  {
    id: "3.3-proactive-features",
    flow: "Proactive Onboarding",
    title: "Choose Features",
    capture: async (page) => {
      // Check consent checkbox first
      const checkbox = page.locator('input[type="checkbox"]');
      if (await checkbox.count() > 0) await checkbox.first().check();
      await page.waitForTimeout(200);
      const nextBtn = page.locator("button", { hasText: "Next" });
      if (await nextBtn.count() > 0) await nextBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('[role="dialog"]');
      if (await modal.count() > 0) return await modal.first().screenshot();
      return await page.screenshot({ fullPage: false });
    },
  },
  {
    id: "3.4-proactive-preferences",
    flow: "Proactive Onboarding",
    title: "Configure Preferences",
    capture: async (page) => {
      const nextBtn = page.locator("button", { hasText: "Next" });
      if (await nextBtn.count() > 0) await nextBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('[role="dialog"]');
      if (await modal.count() > 0) return await modal.first().screenshot();
      return await page.screenshot({ fullPage: false });
    },
  },
  {
    id: "3.5-proactive-success",
    flow: "Proactive Onboarding",
    title: "Success / Confirmation",
    capture: async (page) => {
      const nextBtn = page.locator("button", { hasText: "Next" });
      if (await nextBtn.count() > 0) await nextBtn.click();
      await page.waitForTimeout(500);
      const modal = page.locator('[role="dialog"]');
      if (await modal.count() > 0) return await modal.first().screenshot();
      return await page.screenshot({ fullPage: false });
    },
  },

  // Flow 4: Tutorial Page
  {
    id: "4.1-tutorial-inprogress",
    flow: "Tutorial Page",
    title: "In-Progress — Checklist + Chat",
    capture: async (page) => {
      await page.goto(`${DEV_URL}/onboarding`);
      await page.waitForTimeout(3000);
      return await page.screenshot({ fullPage: false });
    },
  },
  {
    id: "4.2-tutorial-complete",
    flow: "Tutorial Page",
    title: "All Complete — Congratulations",
    capture: async (page) => {
      // Simulate completing all steps by interacting with quick actions
      const actions = ["Create Document", "AI Features", "Collaboration", "Organization"];
      for (const action of actions) {
        const btn = page.locator("button", { hasText: action });
        if (await btn.count() > 0) {
          await btn.click();
          await page.waitForTimeout(2000);
        }
      }
      return await page.screenshot({ fullPage: false });
    },
  },
];

// ── Capture Phase ───────────────────────────────────────────────────

async function captureScreenshots() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: "light",
  });
  const page = await context.newPage();

  const results = [];

  for (const screen of SCREENS) {
    const filename = `${screen.id}.png`;
    const filepath = path.join(OUT_DIR, filename);

    if (dryRun) {
      console.log(`[DRY] Would capture: ${screen.id} → ${filename}`);
      results.push({ ...screen, filepath, filename, status: "dry-run" });
      continue;
    }

    try {
      console.log(`📸 Capturing ${screen.id}: ${screen.title}...`);
      const buffer = await screen.capture(page);
      if (buffer) {
        fs.writeFileSync(filepath, buffer);
        console.log(`   ✓ Saved ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
        results.push({ ...screen, filepath, filename, status: "ok", size: buffer.length });
      } else {
        console.log(`   ⚠ No screenshot captured for ${screen.id}`);
        results.push({ ...screen, filepath, filename, status: "empty" });
      }
    } catch (err) {
      console.error(`   ✗ Error capturing ${screen.id}: ${err.message}`);
      results.push({ ...screen, filepath, filename, status: "error", error: err.message });
    }
  }

  await browser.close();
  return results;
}

// ── Figma Push Phase ────────────────────────────────────────────────

async function pushToFigma(screenshots) {
  if (!FIGMA_TOKEN || !FIGMA_FILE) {
    console.error("\n⚠ Missing FIGMA_ACCESS_TOKEN or FIGMA_DESIGN_SYSTEM_FILE.");
    console.error("  Set them in .env.local to push to Figma.");
    console.error("  Screenshots are saved locally at:", OUT_DIR);
    return;
  }

  const successful = screenshots.filter(s => s.status === "ok" && fs.existsSync(s.filepath));
  if (successful.length === 0) {
    console.log("\nNo screenshots to push to Figma.");
    return;
  }

  console.log(`\n📤 Uploading ${successful.length} screenshots to Figma...`);

  // Step 1: Upload images to Figma's image hosting
  const imageUploads = {};
  for (const screen of successful) {
    try {
      const imageData = fs.readFileSync(screen.filepath);
      const uploadRes = await fetch(
        `https://api.figma.com/v1/images/${FIGMA_FILE}`,
        {
          method: "POST",
          headers: {
            "X-Figma-Token": FIGMA_TOKEN,
            "Content-Type": "image/png",
          },
          body: imageData,
        }
      );

      if (uploadRes.ok) {
        const data = await uploadRes.json();
        // Figma returns { images: { "nodeId": "imageUrl" } } or similar
        imageUploads[screen.id] = data;
        console.log(`   ✓ Uploaded ${screen.id}`);
      } else {
        const errText = await uploadRes.text();
        console.error(`   ✗ Upload failed for ${screen.id}: ${uploadRes.status} ${errText}`);
      }
    } catch (err) {
      console.error(`   ✗ Upload error for ${screen.id}: ${err.message}`);
    }
  }

  console.log(`\n✅ Upload complete. ${Object.keys(imageUploads).length} images uploaded.`);
  console.log("   Note: Figma REST API doesn't support creating frames with image fills.");
  console.log("   Use the plugin script (scripts/design/figmaOnboardingFlows.js) for wireframes,");
  console.log("   or drag-and-drop screenshots from", OUT_DIR, "into Figma manually.");
}

// ── Generate manifest ───────────────────────────────────────────────

function writeManifest(screenshots) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    totalScreens: SCREENS.length,
    captured: screenshots.filter(s => s.status === "ok").length,
    flows: [
      { name: "Agent Guided Onboarding", screens: 4, prefix: "1." },
      { name: "Operator Profile Wizard", screens: 3, prefix: "2." },
      { name: "Proactive Onboarding", screens: 5, prefix: "3." },
      { name: "Tutorial Page", screens: 2, prefix: "4." },
    ],
    screens: screenshots.map(s => ({
      id: s.id,
      flow: s.flow,
      title: s.title,
      filename: s.filename,
      status: s.status,
      size: s.size || null,
    })),
  };

  const manifestPath = path.join(OUT_DIR, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📋 Manifest written to ${manifestPath}`);
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("🎨 NodeBench Onboarding Screen Capture");
  console.log("═".repeat(50));
  console.log(`Target: ${SCREENS.length} screens across 4 flows`);
  console.log(`Output: ${OUT_DIR}`);
  if (dryRun) console.log("Mode: DRY RUN");
  console.log();

  let screenshots = [];

  if (!pushOnly) {
    screenshots = await captureScreenshots();
    writeManifest(screenshots);
  } else {
    // Load existing screenshots from manifest
    const manifestPath = path.join(OUT_DIR, "manifest.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      screenshots = manifest.screens.map(s => ({
        ...s,
        filepath: path.join(OUT_DIR, s.filename),
      }));
    }
  }

  if (!captureOnly && !dryRun) {
    await pushToFigma(screenshots);
  }

  console.log("\n═".repeat(50));
  console.log("Done! Next steps:");
  console.log("  1. Open Figma → Plugins → Development → Open console");
  console.log("  2. Paste scripts/design/figmaOnboardingFlows.js → Run");
  console.log("  3. Drag screenshots from public/dogfood/onboarding/ into frames");
  console.log("  4. Or use the Figma MCP for automated frame creation");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
