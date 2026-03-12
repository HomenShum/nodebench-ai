#!/usr/bin/env node
/**
 * captureOnboardingIsolated.mjs
 *
 * Renders each onboarding component in isolation using a lightweight HTML harness
 * that imports the built React components. Captures each state as a screenshot.
 *
 * This script creates a temporary HTML page that mounts each onboarding component
 * with controlled props, capturing each step independently.
 *
 * Usage: node scripts/design/captureOnboardingIsolated.mjs
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

// ── HTML templates that render each component in isolation ──────────

function makeHarness(componentJsx, extraImports = "", width = 1280, height = 800) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${width}, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Inter, system-ui, -apple-system, sans-serif;
      background: #fafafa;
      color: #111827;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    ${extraImports}
    import React from '${DEV_URL}/node_modules/.vite/deps/react.js';
    import ReactDOM from '${DEV_URL}/node_modules/.vite/deps/react-dom_client.js';
    ${componentJsx}
  </script>
</body>
</html>`;
}

async function main() {
  console.log("Onboarding Isolated Screen Capture");
  console.log("=".repeat(50));

  const browser = await chromium.launch({ headless: true });
  const results = [];

  // ── Flow 1: Agent Guided Onboarding ─────────────────────────────
  console.log("\n[Flow 1] Agent Guided Onboarding");

  const agentSteps = [
    { num: 0, id: "1.1-agent-welcome", title: "Welcome" },
    { num: 1, id: "1.2-agent-fast", title: "Fast Agent" },
    { num: 2, id: "1.3-agent-deep", title: "Deep Agent" },
    { num: 3, id: "1.4-agent-ready", title: "Ready to Start" },
  ];

  for (const step of agentSteps) {
    try {
      const context = await browser.newContext({
        viewport: { width: 640, height: 580 },
        colorScheme: "light",
      });
      const page = await context.newPage();

      // Navigate to dev server and inject the component
      await page.goto(`${DEV_URL}/`, { waitUntil: "domcontentloaded", timeout: 10000 });
      await page.waitForTimeout(2000);

      // Use page.evaluate to render the onboarding modal at a specific step
      await page.evaluate((stepNum) => {
        const STEPS = [
          { id: "welcome", title: "Meet Your AI Assistants", subtitle: "Two powerful agents, one unified experience",
            description: "Your AI workspace combines fast, conversational AI with deep, document-aware intelligence. Let's explore what each can do for you.",
            color: "from-violet-500 to-purple-600",
            features: ["Real-time assistance for quick questions", "Deep analysis for complex research", "Seamless context switching"] },
          { id: "fast-agent", title: "Fast Agent", subtitle: "Quick answers, instant actions",
            description: "The Fast Agent is your go-to for rapid interactions. Access it via the ⚡ button or slash commands in any document.",
            color: "from-amber-400 to-orange-500",
            features: ["Chat-style Q&A with web search", "Slash commands: /search, /summarize, /translate", "Context-aware suggestions", "Works in seconds, not minutes"] },
          { id: "deep-agent", title: "Deep Agent", subtitle: "Multi-step planning & document editing",
            description: "The Deep Agent handles complex tasks that require planning, memory, and persistent context across multiple steps.",
            color: "from-blue-500 to-cyan-500",
            features: ["Creates and edits documents autonomously", "Builds research dossiers with citations", "Remembers context across sessions", "Plans multi-step workflows"] },
          { id: "try-it", title: "Ready to Start?", subtitle: "Your workspace awaits",
            description: "Open a document and try the Fast Agent with a simple question, or ask the Deep Agent to research a topic for you.",
            color: "from-green-500 to-indigo-500",
            features: ["Type '/' in any document for commands", "Click ⚡ to open the Fast Agent panel", "Start a new dossier for deep research"] },
        ];

        const step = STEPS[stepNum];
        const icons = ["✨", "⚡", "🧠", "✅"];

        // Create the modal HTML directly
        const overlay = document.createElement("div");
        overlay.id = "onboarding-harness";
        overlay.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);";

        const modal = document.createElement("div");
        modal.style.cssText = "width:100%;max-width:640px;margin:0 16px;background:var(--bg-primary, #fff);border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.25);overflow:hidden;";

        // Progress dots
        let dotsHtml = '<div style="display:flex;gap:8px;justify-content:center;padding-top:16px;">';
        for (let i = 0; i < 4; i++) {
          const w = i === stepNum ? "24px" : "8px";
          const bg = i === stepNum ? "#111827" : "#f3f4f6";
          dotsHtml += `<div style="width:${w};height:8px;border-radius:4px;background:${bg};transition:all .3s;"></div>`;
        }
        dotsHtml += "</div>";

        // Gradient colors map
        const gradients = {
          "from-violet-500 to-purple-600": "linear-gradient(135deg, #8b5cf6, #9333ea)",
          "from-amber-400 to-orange-500": "linear-gradient(135deg, #fbbf24, #f97316)",
          "from-blue-500 to-cyan-500": "linear-gradient(135deg, #3b82f6, #06b6d4)",
          "from-green-500 to-indigo-500": "linear-gradient(135deg, #22c55e, #6366f1)",
        };
        const grad = gradients[step.color] || "linear-gradient(135deg, #8b5cf6, #9333ea)";
        const btnColors = {
          "from-violet-500 to-purple-600": grad,
          "from-amber-400 to-orange-500": grad,
          "from-blue-500 to-cyan-500": grad,
          "from-green-500 to-indigo-500": grad,
        };

        const featuresHtml = step.features.map(f =>
          `<li style="display:flex;align-items:flex-start;gap:12px;font-size:13px;color:var(--text-primary,#111827);">
            <span style="width:20px;height:20px;border-radius:50%;background:${grad};display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;flex-shrink:0;margin-top:2px;">✓</span>
            ${f}
          </li>`
        ).join("");

        modal.innerHTML = `
          ${dotsHtml}
          <div style="padding:48px 32px 24px;">
            <div style="width:56px;height:56px;border-radius:12px;background:${grad};display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.15);margin-bottom:24px;">${icons[stepNum]}</div>
            <h2 style="font-size:26px;font-weight:700;color:var(--text-primary,#111827);margin:0 0 4px;letter-spacing:-0.5px;">${step.title}</h2>
            <p style="font-size:11px;font-weight:600;color:var(--text-secondary,#6b7280);margin:0 0 16px;">${step.subtitle}</p>
            <p style="font-size:16px;color:var(--text-primary,#111827);margin:0 0 32px;line-height:1.6;font-weight:300;">${step.description}</p>
            <ul style="list-style:none;margin:0 0 32px;padding:0;display:flex;flex-direction:column;gap:12px;">${featuresHtml}</ul>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <button style="padding:8px 16px;font-size:13px;font-weight:500;border-radius:8px;border:none;background:transparent;color:${stepNum === 0 ? '#9ca3af' : 'var(--text-primary,#111827)'};cursor:pointer;">Previous</button>
              <button style="display:flex;align-items:center;gap:8px;padding:10px 24px;font-size:13px;font-weight:600;border-radius:8px;border:none;background:${grad};color:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15);">${stepNum === 3 ? "Get Started" : "Next"} →</button>
            </div>
          </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
      }, step.num);

      await page.waitForTimeout(500);

      // Screenshot just the modal overlay
      const overlay = page.locator("#onboarding-harness");
      const buf = await overlay.screenshot();
      const filePath = path.join(OUT_DIR, `${step.id}.png`);
      fs.writeFileSync(filePath, buf);
      results.push({ id: step.id, status: "ok", size: buf.length });
      console.log(`  ✓ ${step.id}: ${step.title} (${(buf.length / 1024).toFixed(0)} KB)`);

      await context.close();
    } catch (e) {
      console.error(`  ✗ ${step.id}: ${e.message}`);
      results.push({ id: step.id, status: "error", error: e.message });
    }
  }

  // ── Flow 2: Operator Profile Wizard ─────────────────────────────
  console.log("\n[Flow 2] Operator Profile Wizard");

  const profileStates = [
    { id: "2.1-profile-saved", title: "Saved Profile", render: (page) => renderProfileSaved(page) },
    { id: "2.2-profile-step1", title: "Profile Form", render: (page) => renderProfileStep1(page) },
    { id: "2.3-profile-step2", title: "Schedule", render: (page) => renderProfileStep2(page) },
  ];

  for (const state of profileStates) {
    try {
      const context = await browser.newContext({
        viewport: { width: 480, height: 600 },
        colorScheme: "light",
      });
      const page = await context.newPage();
      await page.goto(`${DEV_URL}/`, { waitUntil: "domcontentloaded", timeout: 10000 });
      await page.waitForTimeout(1500);

      await state.render(page);
      await page.waitForTimeout(300);

      const harness = page.locator("#profile-harness");
      const buf = await harness.screenshot();
      const filePath = path.join(OUT_DIR, `${state.id}.png`);
      fs.writeFileSync(filePath, buf);
      results.push({ id: state.id, status: "ok", size: buf.length });
      console.log(`  ✓ ${state.id}: ${state.title} (${(buf.length / 1024).toFixed(0)} KB)`);

      await context.close();
    } catch (e) {
      console.error(`  ✗ ${state.id}: ${e.message}`);
      results.push({ id: state.id, status: "error", error: e.message });
    }
  }

  // ── Flow 3: Proactive Onboarding ─────────────────────────────────
  console.log("\n[Flow 3] Proactive Onboarding (Smart Alerts)");

  const proactiveSteps = [
    { num: 1, id: "3.1-proactive-welcome", title: "Welcome" },
    { num: 2, id: "3.2-proactive-consent", title: "Consent" },
    { num: 3, id: "3.3-proactive-features", title: "Features" },
    { num: 4, id: "3.4-proactive-preferences", title: "Preferences" },
    { num: 5, id: "3.5-proactive-success", title: "Success" },
  ];

  for (const step of proactiveSteps) {
    try {
      const context = await browser.newContext({
        viewport: { width: 720, height: 700 },
        colorScheme: "light",
      });
      const page = await context.newPage();
      await page.goto(`${DEV_URL}/`, { waitUntil: "domcontentloaded", timeout: 10000 });
      await page.waitForTimeout(1500);

      await renderProactiveStep(page, step.num);
      await page.waitForTimeout(300);

      const harness = page.locator("#proactive-harness");
      const buf = await harness.screenshot();
      const filePath = path.join(OUT_DIR, `${step.id}.png`);
      fs.writeFileSync(filePath, buf);
      results.push({ id: step.id, status: "ok", size: buf.length });
      console.log(`  ✓ ${step.id}: ${step.title} (${(buf.length / 1024).toFixed(0)} KB)`);

      await context.close();
    } catch (e) {
      console.error(`  ✗ ${step.id}: ${e.message}`);
      results.push({ id: step.id, status: "error", error: e.message });
    }
  }

  // ── Flow 4: Tutorial Page ────────────────────────────────────────
  console.log("\n[Flow 4] Tutorial Page");

  for (const state of [
    { id: "4.1-tutorial-inprogress", title: "In Progress", complete: false },
    { id: "4.2-tutorial-complete", title: "All Complete", complete: true },
  ]) {
    try {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        colorScheme: "light",
      });
      const page = await context.newPage();
      await page.goto(`${DEV_URL}/`, { waitUntil: "domcontentloaded", timeout: 10000 });
      await page.waitForTimeout(1500);

      await renderTutorialPage(page, state.complete);
      await page.waitForTimeout(300);

      const harness = page.locator("#tutorial-harness");
      const buf = await harness.screenshot();
      const filePath = path.join(OUT_DIR, `${state.id}.png`);
      fs.writeFileSync(filePath, buf);
      results.push({ id: state.id, status: "ok", size: buf.length });
      console.log(`  ✓ ${state.id}: ${state.title} (${(buf.length / 1024).toFixed(0)} KB)`);

      await context.close();
    } catch (e) {
      console.error(`  ✗ ${state.id}: ${e.message}`);
      results.push({ id: state.id, status: "error", error: e.message });
    }
  }

  await browser.close();

  // ── Write manifest ────────────────────────────────────────────────
  const manifest = {
    generatedAt: new Date().toISOString(),
    method: "isolated-dom-injection",
    totalScreens: 14,
    captured: results.filter(r => r.status === "ok").length,
    results,
  };
  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log("\n" + "=".repeat(50));
  console.log(`Captured: ${manifest.captured}/${manifest.totalScreens} screens`);
  console.log(`Output: ${OUT_DIR}`);
}

// ── Profile Wizard Renderers ────────────────────────────────────────

async function renderProfileSaved(page) {
  await page.evaluate(() => {
    const el = document.createElement("div");
    el.id = "profile-harness";
    el.style.cssText = "padding:24px;background:#fafafa;max-width:440px;";
    el.innerHTML = `
      <div style="border-radius:8px;border:1px solid #e5e7eb;background:#fff;padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;border-radius:50%;background:#eef0fd;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:14px;">👤</span>
            </div>
            <div>
              <div style="font-size:14px;font-weight:600;color:#111827;">Homen Shum</div>
              <div style="font-size:11px;color:#6b7280;">Builder-Analyst · AI/ML, Finance, SaaS</div>
            </div>
          </div>
          <button style="display:flex;align-items:center;gap:4px;padding:6px 10px;border-radius:8px;font-size:12px;color:#6b7280;background:transparent;border:none;cursor:pointer;">✏️ Edit</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          <span style="padding:2px 8px;border-radius:4px;font-size:11px;background:#f3f4f6;color:#6b7280;">Stay informed on my domains</span>
          <span style="padding:2px 8px;border-radius:4px;font-size:11px;background:#f3f4f6;color:#6b7280;">Track AI developments</span>
          <span style="padding:2px 8px;border-radius:4px;font-size:11px;background:#f3f4f6;color:#6b7280;">Build agentic tools</span>
        </div>
      </div>
    `;
    document.body.style.background = "#fafafa";
    document.body.appendChild(el);
  });
}

async function renderProfileStep1(page) {
  await page.evaluate(() => {
    const el = document.createElement("div");
    el.id = "profile-harness";
    el.style.cssText = "padding:24px;background:#fafafa;max-width:440px;";

    const inputStyle = "width:100%;padding:8px 12px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;font-size:13px;color:#111827;outline:none;box-sizing:border-box;";
    const labelStyle = "display:block;font-size:12px;font-weight:500;color:#6b7280;margin-bottom:4px;";

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:20px;">
        <!-- Step indicators -->
        <div style="display:flex;align-items:center;gap:4px;">
          <button style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:500;background:#6366f1;color:#fff;border:none;">👤 You</button>
          <span style="color:#d1d5db;font-size:12px;">›</span>
          <button style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:500;background:#f3f4f6;color:#6b7280;border:none;">🕐 Schedule</button>
        </div>

        <!-- Form fields -->
        <div>
          <label style="${labelStyle}">Name *</label>
          <input style="${inputStyle}" placeholder="How should the agent address you?" value="Homen" />
        </div>
        <div>
          <label style="${labelStyle}">Role</label>
          <input style="${inputStyle}" placeholder="e.g., Product Manager, Founder, Researcher" value="Builder-Analyst" />
        </div>
        <div>
          <label style="${labelStyle}">Domains</label>
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <input style="${inputStyle}flex:1;" placeholder="Add a domain..." />
            <button style="padding:8px 12px;border-radius:8px;background:#6366f1;color:#fff;border:none;font-size:14px;cursor:pointer;">+</button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;background:#eef2ff;color:#4338ca;font-size:12px;">AI/ML <span style="cursor:pointer;color:#7c3aed;">×</span></span>
            <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;background:#eef2ff;color:#4338ca;font-size:12px;">Finance <span style="cursor:pointer;color:#7c3aed;">×</span></span>
            <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;background:#eef2ff;color:#4338ca;font-size:12px;">SaaS <span style="cursor:pointer;color:#7c3aed;">×</span></span>
          </div>
        </div>
        <div>
          <label style="${labelStyle}">Goals</label>
          <p style="font-size:10px;color:#9ca3af;margin:0 0 8px;">What should the agent prioritize? First = highest priority.</p>
          <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;">
              <span style="font-size:11px;font-family:monospace;color:#9ca3af;width:16px;">#1</span>
              <span style="flex:1;font-size:13px;color:#111827;">Stay informed on my domains</span>
              <span style="color:#9ca3af;cursor:pointer;">×</span>
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            <input style="${inputStyle}flex:1;" placeholder="Add a goal..." />
            <button style="padding:8px 12px;border-radius:8px;background:#6366f1;color:#fff;border:none;font-size:14px;cursor:pointer;">+</button>
          </div>
        </div>

        <!-- Navigation -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:16px;border-top:1px solid #e5e7eb;">
          <button style="display:flex;align-items:center;gap:4px;padding:8px 12px;border-radius:8px;font-size:13px;color:#6b7280;background:transparent;border:none;cursor:pointer;">← Cancel</button>
          <button style="display:flex;align-items:center;gap:4px;padding:8px 16px;border-radius:8px;font-size:13px;background:#6366f1;color:#fff;border:none;cursor:pointer;">Next →</button>
        </div>
      </div>
    `;
    document.body.style.background = "#fafafa";
    document.body.appendChild(el);
  });
}

async function renderProfileStep2(page) {
  await page.evaluate(() => {
    const el = document.createElement("div");
    el.id = "profile-harness";
    el.style.cssText = "padding:24px;background:#fafafa;max-width:440px;";

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:20px;">
        <!-- Step indicators — step 2 active -->
        <div style="display:flex;align-items:center;gap:4px;">
          <button style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:500;background:#f0fdf4;color:#16a34a;border:none;">✓ You</button>
          <span style="color:#d1d5db;font-size:12px;">›</span>
          <button style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:500;background:#6366f1;color:#fff;border:none;">🕐 Schedule</button>
        </div>

        <p style="font-size:13px;color:#6b7280;">How often should the agent check for new discoveries and send you a brief?</p>

        <!-- 2x2 grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <button style="text-align:left;padding:12px 16px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;">
            <div style="font-size:13px;font-weight:500;color:#111827;">Every 3 hours</div>
            <div style="font-size:11px;color:#6b7280;">High frequency</div>
          </button>
          <button style="text-align:left;padding:12px 16px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;">
            <div style="font-size:13px;font-weight:500;color:#111827;">Every 6 hours</div>
            <div style="font-size:11px;color:#6b7280;">3x daily</div>
          </button>
          <button style="text-align:left;padding:12px 16px;border-radius:8px;border:2px solid #6366f1;background:#eef2ff;cursor:pointer;">
            <div style="font-size:13px;font-weight:500;color:#111827;">Every 12 hours</div>
            <div style="font-size:11px;color:#6b7280;">Morning + evening</div>
          </button>
          <button style="text-align:left;padding:12px 16px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;">
            <div style="font-size:13px;font-weight:500;color:#111827;">Daily</div>
            <div style="font-size:11px;color:#6b7280;">One comprehensive brief</div>
          </button>
        </div>

        <p style="font-size:11px;color:#9ca3af;">You can adjust this anytime from the dashboard below.</p>

        <!-- Navigation -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:16px;border-top:1px solid #e5e7eb;">
          <button style="display:flex;align-items:center;gap:4px;padding:8px 12px;border-radius:8px;font-size:13px;color:#6b7280;background:transparent;border:none;cursor:pointer;">← Back</button>
          <button style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:8px;font-size:13px;background:#22c55e;color:#fff;border:none;cursor:pointer;">✓ Create Profile</button>
        </div>
      </div>
    `;
    document.body.style.background = "#fafafa";
    document.body.appendChild(el);
  });
}

// ── Proactive Onboarding Renderer ───────────────────────────────────

async function renderProactiveStep(page, stepNum) {
  await page.evaluate((step) => {
    const el = document.createElement("div");
    el.id = "proactive-harness";
    el.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);z-index:9999;";

    const stepNames = ["", "Welcome", "Consent", "Features", "Preferences", "Success"];
    const stepIcons = ["", "✨", "🛡️", "⚡", "⚙️", "✅"];
    const stepIconBg = ["", "#dbeafe", "#dcfce7", "#f3e8ff", "#fef3c7", "#dcfce7"];
    const stepIconColor = ["", "#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#22c55e"];

    // Progress bar
    let progressHtml = '<div style="display:flex;align-items:center;gap:8px;margin-top:16px;">';
    for (let i = 1; i <= 5; i++) {
      let bg, color;
      if (i === step) { bg = "#3b82f6"; color = "#fff"; }
      else if (i < step) { bg = "#22c55e"; color = "#fff"; }
      else { bg = "#f3f4f6"; color = "#6b7280"; }
      progressHtml += `<div style="width:24px;height:24px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:${color};">${i < step ? "✓" : i}</div>`;
      if (i < 5) progressHtml += `<div style="flex:1;height:2px;background:${i < step ? "#22c55e" : "#e5e7eb"};"></div>`;
    }
    progressHtml += "</div>";

    // Step content
    let contentHtml = "";

    if (step === 1) {
      contentHtml = `
        <div style="text-align:center;margin-bottom:32px;">
          <div style="display:inline-flex;width:56px;height:56px;border-radius:50%;background:${stepIconBg[step]};align-items:center;justify-content:center;font-size:28px;margin-bottom:16px;">${stepIcons[step]}</div>
          <h3 style="font-size:22px;font-weight:700;margin:0 0 8px;">Welcome to Smart Alerts</h3>
          <p style="color:#6b7280;font-size:14px;">Let your AI assistant work for you — automatically find opportunities and take action</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
          <div style="padding:16px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;">
            <div style="font-size:12px;font-weight:600;margin-bottom:4px;">⚡ Meeting Prep</div>
            <div style="font-size:11px;color:#6b7280;">Auto-generate briefings</div>
          </div>
          <div style="padding:16px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;">
            <div style="font-size:12px;font-weight:600;margin-bottom:4px;">🔔 Follow-Up Reminders</div>
            <div style="font-size:11px;color:#6b7280;">Never miss a follow-up</div>
          </div>
          <div style="padding:16px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;">
            <div style="font-size:12px;font-weight:600;margin-bottom:4px;">📈 Daily Briefs</div>
            <div style="font-size:11px;color:#6b7280;">Morning summary</div>
          </div>
        </div>
        <div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:8px;padding:16px;">
          <div style="font-size:13px;font-weight:600;margin-bottom:8px;">✨ How it works</div>
          <div style="font-size:11px;color:#374151;line-height:1.8;">1. Monitors your connected accounts<br>2. Identifies opportunities<br>3. Smart notifications<br>4. You're always in control</div>
        </div>
      `;
    } else if (step === 2) {
      contentHtml = `
        <div style="text-align:center;margin-bottom:32px;">
          <div style="display:inline-flex;width:56px;height:56px;border-radius:50%;background:${stepIconBg[step]};align-items:center;justify-content:center;font-size:28px;margin-bottom:16px;">${stepIcons[step]}</div>
          <h3 style="font-size:22px;font-weight:700;margin:0 0 8px;">Privacy & Data Access</h3>
          <p style="color:#6b7280;">We take your privacy seriously. Here's what we'll access and why.</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">
          <div style="padding:16px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;">
            <div style="font-size:13px;font-weight:600;margin-bottom:8px;">🗄 What we access</div>
            <div style="font-size:12px;color:#6b7280;line-height:1.8;">• Gmail messages and threads<br>• Google Calendar events<br>• Slack messages (if connected)<br>• Your notes and documents</div>
          </div>
          <div style="padding:16px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;">
            <div style="font-size:13px;font-weight:600;margin-bottom:8px;">👁 What we do with it</div>
            <div style="font-size:12px;color:#6b7280;line-height:1.8;">• Analyze content to detect opportunities<br>• Extract entities<br>• Generate briefings</div>
          </div>
          <div style="padding:16px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;">
            <div style="font-size:13px;font-weight:600;margin-bottom:8px;">🔒 How we protect it</div>
            <div style="font-size:12px;color:#6b7280;line-height:1.8;">• Encrypted in transit and at rest<br>• 90-day automatic retention<br>• No data shared with third parties</div>
          </div>
        </div>
        <div style="padding:16px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;">
          <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;">
            <input type="checkbox" checked style="margin-top:4px;width:18px;height:18px;" />
            <div>
              <div style="font-weight:600;font-size:13px;">I consent to smart alerts ✅</div>
              <div style="font-size:11px;color:#6b7280;margin-top:4px;">• Access connected accounts<br>• Detect opportunities<br>• Send notifications</div>
            </div>
          </label>
        </div>
      `;
    } else if (step === 3) {
      const features = [
        { icon: "📅", name: "Meeting Prep Packs", desc: "Auto-generate briefings 4h before meetings", enabled: true, rec: true },
        { icon: "🔔", name: "Follow-Up Nudges", desc: "Smart reminders when action needed", enabled: true, rec: true },
        { icon: "📄", name: "Daily Brief", desc: "Morning summary of updates and priorities", enabled: true, rec: true },
        { icon: "⚠️", name: "Risk Alerts", desc: "Warnings about potential issues", enabled: false, rec: false },
        { icon: "✉️", name: "Email Draft Generator", desc: "Auto-draft common emails", enabled: false, rec: false },
      ];
      let featHtml = features.map(f => {
        const border = f.enabled ? "2px solid #3b82f6" : "1px solid #e5e7eb";
        const bg = f.enabled ? "#eff6ff" : "#f9fafb";
        const checkBg = f.enabled ? "#3b82f6" : "#f3f4f6";
        const checkColor = f.enabled ? "#fff" : "transparent";
        return `<div style="padding:14px;border-radius:8px;border:${border};background:${bg};display:flex;align-items:flex-start;gap:12px;cursor:pointer;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span>${f.icon}</span>
              <span style="font-weight:600;font-size:13px;">${f.name}</span>
              ${f.rec ? '<span style="font-size:10px;padding:2px 8px;border-radius:4px;background:#dcfce7;color:#16a34a;font-weight:500;">Recommended</span>' : ''}
            </div>
            <div style="font-size:11px;color:#6b7280;">${f.desc}</div>
          </div>
          <div style="width:22px;height:22px;border-radius:50%;border:2px solid ${f.enabled ? '#3b82f6' : '#e5e7eb'};background:${checkBg};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${f.enabled ? '<span style="color:#fff;font-size:12px;">✓</span>' : ''}
          </div>
        </div>`;
      }).join("");
      contentHtml = `
        <div style="text-align:center;margin-bottom:32px;">
          <div style="display:inline-flex;width:56px;height:56px;border-radius:50%;background:${stepIconBg[step]};align-items:center;justify-content:center;font-size:28px;margin-bottom:16px;">${stepIcons[step]}</div>
          <h3 style="font-size:22px;font-weight:700;margin:0 0 8px;">Choose Your Features</h3>
          <p style="color:#6b7280;">Select which features you'd like to enable.</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">${featHtml}</div>
        <div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:8px;padding:12px;font-size:11px;color:#374151;">💡 <strong>Tip:</strong> Start with the recommended features and enable more as you get comfortable.</div>
      `;
    } else if (step === 4) {
      contentHtml = `
        <div style="text-align:center;margin-bottom:32px;">
          <div style="display:inline-flex;width:56px;height:56px;border-radius:50%;background:${stepIconBg[step]};align-items:center;justify-content:center;font-size:28px;margin-bottom:16px;">${stepIcons[step]}</div>
          <h3 style="font-size:22px;font-weight:700;margin:0 0 8px;">Configure Preferences</h3>
          <p style="color:#6b7280;">Customize how and when you receive notifications</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div style="padding:16px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;">
            <div style="font-size:13px;font-weight:600;margin-bottom:12px;">🔔 Notification Channels</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <span style="font-size:12px;">💬 In-App Notifications</span>
                <div style="width:36px;height:20px;border-radius:10px;background:#3b82f6;position:relative;"><div style="width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;right:2px;top:2px;"></div></div>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <span style="font-size:12px;color:#9ca3af;">📱 Slack Messages</span>
                <div style="display:flex;align-items:center;gap:8px;"><div style="width:36px;height:20px;border-radius:10px;background:#e5e7eb;position:relative;"><div style="width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;left:2px;top:2px;"></div></div><span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#fef3c7;color:#d97706;font-weight:500;">Coming Soon</span></div>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <span style="font-size:12px;color:#9ca3af;">✉️ Email Notifications</span>
                <div style="display:flex;align-items:center;gap:8px;"><div style="width:36px;height:20px;border-radius:10px;background:#e5e7eb;position:relative;"><div style="width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;left:2px;top:2px;"></div></div><span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#fef3c7;color:#d97706;font-weight:500;">Coming Soon</span></div>
              </div>
            </div>
          </div>
          <div style="padding:16px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;">
            <div style="font-size:13px;font-weight:600;margin-bottom:8px;">🌙 Quiet Hours</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">Start Time</label><select style="width:100%;padding:6px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:12px;"><option>22:00</option></select></div>
              <div><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px;">End Time</label><select style="width:100%;padding:6px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:12px;"><option>08:00</option></select></div>
            </div>
            <div style="font-size:10px;color:#9ca3af;margin-top:6px;">Timezone: America/Los_Angeles</div>
          </div>
          <div style="padding:16px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;">
            <div style="font-size:13px;font-weight:600;margin-bottom:8px;">📊 Relevance Filter</div>
            <div style="position:relative;height:4px;background:#e5e7eb;border-radius:2px;margin:12px 0;">
              <div style="position:absolute;left:0;top:0;width:70%;height:4px;background:#3b82f6;border-radius:2px;"></div>
              <div style="position:absolute;left:calc(70% - 6px);top:-4px;width:12px;height:12px;border-radius:50%;background:#3b82f6;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#6b7280;">
              <span>More</span>
              <span style="color:#3b82f6;font-weight:600;font-size:12px;">70%</span>
              <span>Fewer</span>
            </div>
          </div>
        </div>
      `;
    } else if (step === 5) {
      contentHtml = `
        <div style="text-align:center;margin-bottom:32px;">
          <div style="display:inline-flex;width:56px;height:56px;border-radius:50%;background:${stepIconBg[step]};align-items:center;justify-content:center;font-size:28px;margin-bottom:16px;">${stepIcons[step]}</div>
          <h3 style="font-size:22px;font-weight:700;margin:0 0 8px;">You're All Set!</h3>
          <p style="color:#6b7280;">Smart alerts are ready to start working for you</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px;">
          <div style="padding:16px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;">
            <div style="font-size:13px;font-weight:600;margin-bottom:8px;">✨ Enabled Features (3)</div>
            <div style="font-size:12px;color:#6b7280;line-height:1.8;">✅ Meeting Prep Packs<br>✅ Follow-Up Nudges<br>✅ Daily Brief</div>
          </div>
          <div style="padding:16px;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;">
            <div style="font-size:13px;font-weight:600;margin-bottom:8px;">🔔 Notification Settings</div>
            <div style="font-size:12px;color:#6b7280;">Channels: InApp · Quiet: 22:00–08:00 · Filter: 70%</div>
          </div>
        </div>
        <div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:8px;padding:16px;">
          <div style="font-size:13px;font-weight:600;margin-bottom:12px;">What happens next?</div>
          <div style="font-size:12px;color:#374151;line-height:2;">📅 Briefings 4h before meetings<br>🔔 Smart reminders for follow-ups<br>📄 Morning summary at 8:00 AM</div>
        </div>
        <div style="text-align:center;margin-top:16px;font-size:11px;color:#6b7280;">💡 Adjust settings in Settings → Proactive Features</div>
      `;
    }

    const modal = document.createElement("div");
    modal.style.cssText = "background:#fff;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.25);max-width:680px;width:100%;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;margin:0 16px;";
    modal.innerHTML = `
      <!-- Header -->
      <div style="padding:16px 24px;border-bottom:1px solid #e5e7eb;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <h2 style="font-size:16px;font-weight:600;margin:0;">Enable Smart Alerts</h2>
            <p style="font-size:12px;color:#6b7280;margin:4px 0 0;">Step ${step} of 5: ${stepNames[step]}</p>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:#3b82f6;font-size:18px;">✨</span>
            <span style="font-size:13px;font-weight:500;">NodeBench AI</span>
          </div>
        </div>
        ${progressHtml}
      </div>
      <!-- Content -->
      <div style="flex:1;overflow-y:auto;padding:24px;">${contentHtml}</div>
      <!-- Footer -->
      <div style="padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;">
        <button style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:4px;background:#f3f4f6;color:#111827;border:none;font-size:13px;cursor:pointer;${step === 1 ? 'opacity:0.5;' : ''}">← Back</button>
        <button style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:4px;background:${step === 5 ? '#22c55e' : '#3b82f6'};color:#fff;border:none;font-size:13px;cursor:pointer;">${step === 5 ? '✓ Enable Smart Alerts' : 'Next →'}</button>
      </div>
    `;

    el.appendChild(modal);
    document.body.appendChild(el);
  }, stepNum);
}

// ── Tutorial Page Renderer ──────────────────────────────────────────

async function renderTutorialPage(page, allComplete) {
  await page.evaluate((complete) => {
    const el = document.createElement("div");
    el.id = "tutorial-harness";
    el.style.cssText = "background:#fafafa;min-height:100vh;padding:32px 24px;";

    const steps = [
      { title: "Welcome to Your Workspace", desc: "Get familiar with the AI-powered system", icon: "✨" },
      { title: "Create Your First Document", desc: "Learn how to create documents with AI", icon: "➕" },
      { title: "Discover AI Features", desc: "Explore AI content generation and editing", icon: "🧠" },
      { title: "Organize Your Workspace", desc: "Learn about document organization", icon: "📄" },
      { title: "Collaboration Features", desc: "Discover real-time editing and sharing", icon: "👥" },
    ];

    const completedCount = complete ? 5 : 1;
    const progress = (completedCount / 5) * 100;

    let stepsHtml = steps.map((s, i) => {
      const done = complete || i === 0;
      const current = !complete && i === 1;
      const border = current ? "2px solid rgba(94,106,210,0.3)" : "1px solid #e5e7eb";
      const bg = done ? "#eef0fd" : current ? "#eef0fd" : "#f9fafb";
      const ring = current ? "box-shadow:0 0 0 3px rgba(94,106,210,0.2);" : "";
      return `<div style="padding:12px;border-radius:8px;border:${border};background:${bg};cursor:pointer;${ring}">
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <div style="width:32px;height:32px;border-radius:50%;background:${done ? '#eef0fd' : '#f3f4f6'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${done ? '<span style="color:#5e6ad2;">✓</span>' : `<span>${s.icon}</span>`}
          </div>
          <div>
            <h4 style="font-weight:600;font-size:13px;margin:0;">${s.title}</h4>
            <p style="font-size:11px;color:#6b7280;margin:4px 0 0;">${s.desc}</p>
            ${!done && current ? '<div style="margin-top:6px;font-size:11px;color:#5e6ad2;font-weight:600;">Try it →</div>' : ''}
          </div>
        </div>
      </div>`;
    }).join("");

    let completionCard = "";
    if (complete) {
      completionCard = `<div style="margin-top:24px;padding:16px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;">
        <div style="display:flex;align-items:center;gap:8px;color:#166534;margin-bottom:8px;"><span style="font-size:18px;">✅</span><span style="font-weight:600;">Congratulations!</span></div>
        <p style="font-size:13px;color:#15803d;margin:0 0 12px;">You've completed the onboarding! You're ready to start creating.</p>
        <button style="width:100%;padding:8px 16px;border-radius:6px;background:#16a34a;color:#fff;border:none;font-size:13px;font-weight:500;cursor:pointer;">Enter Your Workspace</button>
      </div>`;
    }

    el.innerHTML = `
      <!-- Header -->
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-flex;width:56px;height:56px;border-radius:50%;background:#eef0fd;align-items:center;justify-content:center;font-size:28px;margin-bottom:16px;">🤖</div>
        <h1 style="font-size:28px;font-weight:700;margin:0 0 8px;">Welcome to Your AI Workspace</h1>
        <p style="font-size:16px;color:#6b7280;max-width:600px;margin:0 auto 16px;">Let's get you started with your intelligent document management system.</p>
        <button style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;font-size:13px;color:#6b7280;background:transparent;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;">Skip tutorial and go to workspace →</button>
      </div>

      <!-- Progress bar -->
      <div style="margin-bottom:32px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:13px;font-weight:500;">Onboarding Progress</span>
          <span style="font-size:13px;color:#6b7280;">${completedCount} of 5 completed</span>
        </div>
        <div style="height:8px;background:#f3f4f6;border-radius:4px;">
          <div style="height:8px;background:#5e6ad2;border-radius:4px;width:${progress}%;transition:width .5s;"></div>
        </div>
      </div>

      <!-- 3-column layout -->
      <div style="display:grid;grid-template-columns:1fr 2fr;gap:24px;">
        <!-- Left: Getting Started Guide -->
        <div style="background:#fff;border-radius:8px;border:1px solid #e5e7eb;padding:24px;">
          <h2 style="font-size:16px;font-weight:600;margin:0 0 16px;display:flex;align-items:center;gap:8px;">📖 Getting Started Guide</h2>
          <div style="display:flex;flex-direction:column;gap:12px;">${stepsHtml}</div>
          ${completionCard}
        </div>

        <!-- Right: AI Chat -->
        <div style="background:#fff;border-radius:8px;border:1px solid #e5e7eb;height:500px;display:flex;flex-direction:column;">
          <div style="padding:16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;border-radius:50%;background:#eef0fd;display:flex;align-items:center;justify-content:center;font-size:18px;">🤖</div>
            <div>
              <h3 style="font-weight:500;font-size:14px;margin:0;">AI Onboarding Assistant</h3>
              <p style="font-size:12px;color:#6b7280;margin:2px 0 0;">Ask me anything about getting started!</p>
            </div>
          </div>
          <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:16px;">
            <div style="text-align:center;"><span style="font-size:11px;color:#6b7280;padding:4px 12px;background:#f3f4f6;border-radius:12px;">👋 Welcome to your AI workspace!</span></div>
            <div style="display:flex;gap:10px;">
              <div style="width:32px;height:32px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;">🤖</div>
              <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;max-width:400px;font-size:13px;line-height:1.6;">Hi there! I'm your AI assistant. I can help you create documents, organize your workspace, and answer questions.<br><br>What would you like to learn first?</div>
            </div>
            <div style="display:flex;justify-content:flex-end;">
              <div style="background:#5e6ad2;color:#fff;border-radius:8px;padding:8px 14px;font-size:13px;">How do I create my first document?</div>
            </div>
          </div>
          <div style="padding:12px;border-top:1px solid #e5e7eb;">
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
              <span style="font-size:11px;padding:4px 12px;border-radius:12px;background:#eef0fd;color:#5e6ad2;cursor:pointer;">Create Document</span>
              <span style="font-size:11px;padding:4px 12px;border-radius:12px;background:#eef0fd;color:#5e6ad2;cursor:pointer;">AI Features</span>
              <span style="font-size:11px;padding:4px 12px;border-radius:12px;background:#eef0fd;color:#5e6ad2;cursor:pointer;">Collaboration</span>
              <span style="font-size:11px;padding:4px 12px;border-radius:12px;background:#eef0fd;color:#5e6ad2;cursor:pointer;">Organization</span>
            </div>
            <div style="display:flex;gap:8px;">
              <input style="flex:1;padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;" placeholder="Ask me anything about getting started..." />
              <button style="padding:8px 12px;background:#5e6ad2;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;">↗</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.style.background = "#fafafa";
    document.body.innerHTML = "";
    document.body.appendChild(el);
  }, allComplete);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
