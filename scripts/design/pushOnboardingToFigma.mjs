#!/usr/bin/env node
/**
 * pushOnboardingToFigma.mjs
 *
 * Uploads onboarding screenshots to the Figma design system file
 * and creates an "Onboarding Flows" page with frames for each screen.
 *
 * Two-phase approach:
 *   Phase 1 (this script): Upload images → get image hashes
 *   Phase 2 (plugin script): Use figmaOnboardingFlows.js in Figma console
 *
 * Usage:
 *   node scripts/design/pushOnboardingToFigma.mjs
 *   node scripts/design/pushOnboardingToFigma.mjs --dry-run
 *
 * Requires: FIGMA_ACCESS_TOKEN in .env.local
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

// Load .env.local
config({ path: path.join(ROOT, ".env.local") });

const FIGMA_TOKEN = process.env.FIGMA_ACCESS_TOKEN;
const FIGMA_FILE = process.env.FIGMA_DESIGN_SYSTEM_FILE;
const OUT_DIR = path.join(ROOT, "public/dogfood/onboarding");
const dryRun = process.argv.includes("--dry-run");

if (!FIGMA_TOKEN) {
  console.error("Missing FIGMA_ACCESS_TOKEN in .env.local");
  process.exit(1);
}

if (!FIGMA_FILE) {
  console.error("Missing FIGMA_DESIGN_SYSTEM_FILE in .env.local");
  console.error("Set it to your Figma file key (from the URL: figma.com/file/<KEY>/...)");
  process.exit(1);
}

// ── Screen metadata ─────────────────────────────────────────────────

const SCREENS = [
  { id: "1.1-agent-welcome",        flow: 1, title: "Welcome — Meet Your AI Assistants" },
  { id: "1.2-agent-fast",           flow: 1, title: "Fast Agent — Quick answers" },
  { id: "1.3-agent-deep",           flow: 1, title: "Deep Agent — Multi-step planning" },
  { id: "1.4-agent-ready",          flow: 1, title: "Ready to Start" },
  { id: "2.1-profile-saved",        flow: 2, title: "Saved Profile — Compact Card" },
  { id: "2.2-profile-step1",        flow: 2, title: "Step 1 — Profile Form" },
  { id: "2.3-profile-step2",        flow: 2, title: "Step 2 — Schedule Selection" },
  { id: "3.1-proactive-welcome",    flow: 3, title: "Welcome to Smart Alerts" },
  { id: "3.2-proactive-consent",    flow: 3, title: "Privacy & Consent" },
  { id: "3.3-proactive-features",   flow: 3, title: "Choose Features" },
  { id: "3.4-proactive-preferences",flow: 3, title: "Configure Preferences" },
  { id: "3.5-proactive-success",    flow: 3, title: "Success / Confirmation" },
  { id: "4.1-tutorial-inprogress",  flow: 4, title: "In-Progress — Checklist + Chat" },
  { id: "4.2-tutorial-complete",    flow: 4, title: "All Complete — Congratulations" },
];

const FLOW_NAMES = {
  1: "Agent Guided Onboarding",
  2: "Operator Profile Wizard",
  3: "Proactive Onboarding / Smart Alerts",
  4: "Tutorial Page",
};

// ── Figma API helpers ───────────────────────────────────────────────

async function figmaApi(endpoint, options = {}) {
  const url = `https://api.figma.com/v1${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "X-Figma-Token": FIGMA_TOKEN,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma API ${res.status}: ${text}`);
  }

  return res.json();
}

async function uploadImage(filePath) {
  const imageData = fs.readFileSync(filePath);
  const url = `https://api.figma.com/v1/images/${FIGMA_FILE}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Figma-Token": FIGMA_TOKEN,
      "Content-Type": "image/png",
    },
    body: imageData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Image upload ${res.status}: ${text}`);
  }

  return res.json();
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("Push Onboarding Screens to Figma");
  console.log("=".repeat(50));
  console.log(`File: ${FIGMA_FILE}`);
  console.log(`Source: ${OUT_DIR}`);
  if (dryRun) console.log("Mode: DRY RUN\n");

  // Step 1: Verify Figma access
  console.log("\n1. Verifying Figma access...");
  try {
    const fileInfo = await figmaApi(`/files/${FIGMA_FILE}?depth=1`);
    console.log(`   File: "${fileInfo.name}"`);
    console.log(`   Pages: ${fileInfo.document.children.map(p => p.name).join(", ")}`);

    const existingPage = fileInfo.document.children.find(p => p.name === "Onboarding Flows");
    if (existingPage) {
      console.log(`   "Onboarding Flows" page already exists (will be updated by plugin)`);
    } else {
      console.log(`   "Onboarding Flows" page will be created by the plugin script`);
    }
  } catch (e) {
    console.error(`   Failed to access Figma file: ${e.message}`);
    process.exit(1);
  }

  // Step 2: Find available screenshots
  console.log("\n2. Scanning screenshots...");
  const available = [];
  for (const screen of SCREENS) {
    const filePath = path.join(OUT_DIR, `${screen.id}.png`);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      available.push({ ...screen, filePath, size: stats.size });
      console.log(`   ✓ ${screen.id}.png (${(stats.size / 1024).toFixed(0)} KB)`);
    } else {
      console.log(`   ✗ ${screen.id}.png (not found)`);
    }
  }

  console.log(`\n   Found: ${available.length}/${SCREENS.length} screenshots`);

  if (dryRun) {
    console.log("\n[DRY RUN] Would upload these to Figma. Exiting.");
    return;
  }

  // Step 3: Upload images
  console.log("\n3. Uploading screenshots to Figma...");
  const uploadResults = {};

  for (const screen of available) {
    try {
      console.log(`   Uploading ${screen.id}...`);
      const result = await uploadImage(screen.filePath);
      uploadResults[screen.id] = result;
      console.log(`   ✓ ${screen.id} uploaded`);
    } catch (e) {
      console.error(`   ✗ ${screen.id}: ${e.message}`);
      uploadResults[screen.id] = { error: e.message };
    }

    // Rate limit: 30 req/min for image upload
    await new Promise(r => setTimeout(r, 2200));
  }

  // Step 4: Write upload manifest
  const uploadManifest = {
    generatedAt: new Date().toISOString(),
    figmaFile: FIGMA_FILE,
    uploads: uploadResults,
    screens: available.map(s => ({
      id: s.id,
      flow: s.flow,
      flowName: FLOW_NAMES[s.flow],
      title: s.title,
      uploaded: !uploadResults[s.id]?.error,
      imageRef: uploadResults[s.id]?.meta?.images?.[0] || null,
    })),
  };

  const manifestPath = path.join(OUT_DIR, "figma-upload-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(uploadManifest, null, 2));
  console.log(`\n4. Upload manifest: ${manifestPath}`);

  // Step 5: Summary
  const uploaded = Object.values(uploadResults).filter(r => !r.error).length;
  console.log("\n" + "=".repeat(50));
  console.log(`Uploaded: ${uploaded}/${available.length} images to Figma`);
  console.log("\nNext steps:");
  console.log("  1. Open Figma file: https://www.figma.com/file/" + FIGMA_FILE);
  console.log("  2. Plugins → Development → Open Console");
  console.log("  3. Paste scripts/design/figmaOnboardingFlows.js → Run");
  console.log("  4. The plugin creates wireframe frames for all 14 screens");
  console.log("  5. Drag screenshots from public/dogfood/onboarding/ into frames");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
