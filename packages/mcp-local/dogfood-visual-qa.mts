#!/usr/bin/env npx tsx
/**
 * Dogfood: Visual QA — Cold-Load Jank Detection
 *
 * Tests the INITIAL LOADING experience by:
 * 1. Clearing all browser cache/cookies/localStorage
 * 2. Using waitUntil: "commit" (captures start as page begins rendering)
 * 3. settleMs: 0 (no settle — we WANT to see the loading sequence)
 * 4. 20 frames over 2s = full loading lifecycle (blank → skeleton → data → settled)
 *
 * Also runs post-settle (warm) captures for comparison.
 *
 * Usage: npx tsx dogfood-visual-qa.mts
 */

import { visualQaTools } from "./src/tools/visualQaTools.js";

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";

const tools = Object.fromEntries(visualQaTools.map((t) => [t.name, t]));

// ═══ Helper ═══
function sep(title: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}\n`);
}

function extractJson(result: unknown): any {
  if (Array.isArray(result)) {
    for (const block of result) {
      if ((block as any).type === "text") {
        try {
          const parsed = JSON.parse((block as any).text);
          if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
            return parsed;
          }
        } catch {
          continue;
        }
      }
    }
    const first = result.find((b: any) => b.type === "text");
    return first ? (first as any).text : result;
  }
  return result;
}

// ═══ Routes to test ═══
const ROUTES = [
  { path: "/", label: "cinematic-home" },
  { path: "/research", label: "research-hub" },
  { path: "/showcase", label: "showcase" },
];

type RunResult = {
  route: string;
  mode: string;
  score: number;
  grade: string;
  jankCount: number;
  meanSsim: number;
  minSsim: number;
  fps: number;
  ssimScores?: number[];
};

async function main() {
  console.log(`🎬 Visual QA Dogfood — Cold-Load Jank Detection`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Routes: ${ROUTES.map((r) => r.label).join(", ")}`);
  console.log(`   Tools: ${visualQaTools.map((t) => t.name).join(", ")}`);

  const results: RunResult[] = [];

  // ══════════════════════════════════════════════════════
  //  TEST 1: Cold-load captures (detect loading jank)
  //  - clearCache: true  → fresh browser, no cached assets
  //  - waitUntil: commit → capture starts as page renders
  //  - settleMs: 0       → no wait, capture during loading
  //  - 20 frames @ 100ms = 2s burst covering full load
  //  - ssimThreshold: 0.85 → expect big visual changes
  // ══════════════════════════════════════════════════════
  sep("Test 1: Cold-Load Captures (loading jank detection)");

  for (const route of ROUTES) {
    console.log(`  [${route.label}] Cold-load burst capture...`);

    let suiteResult = (await tools.run_visual_qa_suite.handler({
      url: `${BASE_URL}${route.path}`,
      label: `coldload-${route.label}`,
      frameCount: 20,
      intervalMs: 100,
      viewport: "desktop",
      settleMs: 0,
      ssimThreshold: 0.85,
      clearCache: true,
      waitUntil: "commit",
      collageColumns: 5,
    })) as any[];

    let meta = extractJson(suiteResult);

    // Fallback: if commit-level capture crashes (too early for some pages),
    // retry with domcontentloaded + small settle
    if (meta.error) {
      console.log(`    ⚠ commit-level failed, retrying with domcontentloaded...`);
      suiteResult = (await tools.run_visual_qa_suite.handler({
        url: `${BASE_URL}${route.path}`,
        label: `coldload-${route.label}-retry`,
        frameCount: 20,
        intervalMs: 100,
        viewport: "desktop",
        settleMs: 200,
        ssimThreshold: 0.85,
        clearCache: true,
        waitUntil: "domcontentloaded",
        collageColumns: 5,
      })) as any[];
      meta = extractJson(suiteResult);
    }

    if (meta.error) {
      console.error(`  ✗ ${route.label} failed: ${meta.message}`);
      continue;
    }

    const ssimScores: number[] = meta.ssimScores || [];
    const transitions = ssimScores.length;
    const bigDrops = ssimScores.filter((s: number) => s < 0.90).length;
    const hugeDrops = ssimScores.filter((s: number) => s < 0.80).length;

    console.log(`  ✓ ${route.label}: ${meta.stabilityGrade} (${meta.stabilityScore}/100)`);
    console.log(`    SSIM: mean=${meta.meanSsim?.toFixed(4)}, min=${meta.minSsim?.toFixed(4)}`);
    console.log(`    Transitions: ${transitions} | Drops <0.90: ${bigDrops} | Drops <0.80: ${hugeDrops}`);
    console.log(`    Jank frames: ${meta.jankCount} at [${meta.jankFrames?.join(", ") || "none"}]`);
    console.log(`    Collage: ${meta.collagePath}`);

    // Print SSIM timeline
    if (ssimScores.length > 0) {
      const timeline = ssimScores.map((s: number, i: number) => {
        const bar = s >= 0.95 ? "█" : s >= 0.90 ? "▓" : s >= 0.85 ? "▒" : s >= 0.80 ? "░" : "·";
        return `${bar}${s.toFixed(2)}`;
      });
      console.log(`    Timeline: [${timeline.join(" ")}]`);
    }

    results.push({
      route: route.path,
      mode: "cold-load",
      score: meta.stabilityScore,
      grade: meta.stabilityGrade,
      jankCount: meta.jankCount,
      meanSsim: meta.meanSsim,
      minSsim: meta.minSsim,
      fps: meta.effectiveFps,
      ssimScores,
    });
  }

  // ══════════════════════════════════════════════════════
  //  TEST 2: Warm captures (post-settle baseline)
  //  - No cache clearing, networkidle wait, settleMs: 2000
  //  - Expected: all A-grade (validates our perf fixes work)
  // ══════════════════════════════════════════════════════
  sep("Test 2: Warm Captures (post-settle baseline)");

  for (const route of ROUTES) {
    console.log(`  [${route.label}] Warm post-settle capture...`);

    const suiteResult = (await tools.run_visual_qa_suite.handler({
      url: `${BASE_URL}${route.path}`,
      label: `warm-${route.label}`,
      frameCount: 10,
      intervalMs: 50,
      viewport: "desktop",
      settleMs: 2000,
      ssimThreshold: 0.95,
      clearCache: false,
      waitUntil: "networkidle",
    })) as any[];

    const meta = extractJson(suiteResult);
    if (meta.error) {
      console.error(`  ✗ ${route.label} failed: ${meta.message}`);
      continue;
    }

    console.log(`  ✓ ${route.label}: ${meta.stabilityGrade} (${meta.stabilityScore}/100) — mean SSIM: ${meta.meanSsim?.toFixed(4)}`);

    results.push({
      route: route.path,
      mode: "warm",
      score: meta.stabilityScore,
      grade: meta.stabilityGrade,
      jankCount: meta.jankCount,
      meanSsim: meta.meanSsim,
      minSsim: meta.minSsim,
      fps: meta.effectiveFps,
    });
  }

  // ══════════════════════════════════════════════════════
  //  TEST 3: Navigation transition (Home → Research Hub)
  //  Captures the SPA navigation transition
  // ══════════════════════════════════════════════════════
  sep("Test 3: SPA Navigation Transition (Home → Research Hub)");

  console.log("  Loading Home first, then navigating to /research...");
  const navResult = (await tools.run_visual_qa_suite.handler({
    url: `${BASE_URL}/`,
    label: "nav-home-to-research",
    frameCount: 20,
    intervalMs: 100,
    viewport: "desktop",
    settleMs: 1000,
    ssimThreshold: 0.85,
    preAction: {
      type: "navigate",
      target: `${BASE_URL}/research`,
    },
    clearCache: true,
    waitUntil: "networkidle",
    collageColumns: 5,
  })) as any[];

  const navMeta = extractJson(navResult);
  if (!navMeta.error) {
    const ssimScores: number[] = navMeta.ssimScores || [];
    const bigDrops = ssimScores.filter((s: number) => s < 0.90).length;

    console.log(`  ✓ Navigation: ${navMeta.stabilityGrade} (${navMeta.stabilityScore}/100)`);
    console.log(`    SSIM: mean=${navMeta.meanSsim?.toFixed(4)}, min=${navMeta.minSsim?.toFixed(4)}`);
    console.log(`    Drops <0.90: ${bigDrops} | Jank: ${navMeta.jankCount}`);
    console.log(`    Collage: ${navMeta.collagePath}`);

    results.push({
      route: "/ → /research",
      mode: "navigation",
      score: navMeta.stabilityScore,
      grade: navMeta.stabilityGrade,
      jankCount: navMeta.jankCount,
      meanSsim: navMeta.meanSsim,
      minSsim: navMeta.minSsim,
      fps: navMeta.effectiveFps,
      ssimScores,
    });
  } else {
    console.error(`  ✗ Navigation test failed: ${navMeta.message}`);
  }

  // ═══ Summary Table ═══
  sep("Dogfood Results Summary");

  console.log("  Route              | Mode       | Grade | Score | Jank | Mean SSIM | Min SSIM  | FPS");
  console.log("  -------------------|------------|-------|-------|------|-----------|-----------|------");
  for (const r of results) {
    console.log(
      `  ${r.route.padEnd(18)} | ${r.mode.padEnd(10)} |   ${r.grade}   |  ${String(r.score).padStart(3)} |  ${String(r.jankCount).padStart(3)} | ${r.meanSsim.toFixed(4).padStart(9)} | ${r.minSsim.toFixed(4).padStart(9)} | ${String(r.fps).padStart(4)}`
    );
  }

  // Cold vs Warm comparison
  sep("Cold vs Warm Comparison");

  for (const route of ROUTES) {
    const cold = results.find((r) => r.route === route.path && r.mode === "cold-load");
    const warm = results.find((r) => r.route === route.path && r.mode === "warm");
    if (cold && warm) {
      const delta = warm.score - cold.score;
      const ssimDelta = warm.meanSsim - cold.meanSsim;
      console.log(
        `  ${route.label.padEnd(20)} | Cold: ${cold.grade}(${cold.score}) → Warm: ${warm.grade}(${warm.score}) | Δscore: ${delta > 0 ? "+" : ""}${delta} | ΔSSIM: ${ssimDelta > 0 ? "+" : ""}${ssimDelta.toFixed(4)}`
      );
      if (delta > 20) {
        console.log(`    ⚠️  Large cold/warm gap — loading phase needs attention`);
      }
    }
  }

  // Pass/fail verdict
  const coldResults = results.filter((r) => r.mode === "cold-load");
  const warmResults = results.filter((r) => r.mode === "warm");
  const coldPass = coldResults.every((r) => r.score >= 50);
  const warmPass = warmResults.every((r) => r.score >= 90);
  const anyF = results.some((r) => r.grade === "F");

  console.log(`\n  Cold-load: ${coldPass ? "✅" : "⚠️"} ${coldPass ? "All routes above 50 (loading acceptable)" : "Some routes below 50 — loading jank detected"}`);
  console.log(`  Warm:      ${warmPass ? "✅" : "⚠️"} ${warmPass ? "All routes above 90 (settled state smooth)" : "Some routes below 90 — post-settle issues"}`);
  if (anyF) {
    console.log("  ❌ Grade F detected — immediate investigation recommended");
  }

  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Dogfood failed:", err.message);
  process.exit(1);
});
