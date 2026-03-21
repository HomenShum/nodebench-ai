#!/usr/bin/env node
/**
 * QA Dogfood Checklist — run after ANY implementation change.
 * Execute: node scripts/qa-dogfood.mjs
 *
 * Runs automated build checks, then prints manual verification checklists
 * for surface rendering and interaction tests.
 */

import { execSync } from "node:child_process";

const CHECKLIST = [
  { id: "tsc", cmd: "npx tsc --noEmit --pretty false", expect: "no output", label: "TypeScript" },
  { id: "vite-build", cmd: "npx vite build", expect: "exit 0", label: "Vite build" },
  { id: "test-suite", cmd: "npx vitest run", expect: "0 failed", label: "Test suite" },
];

const SURFACE_TESTS = [
  "Ask: renders DeepTrace hero, Today's Signal, 3 prompts, 4 trust cards, 3 demo activities, What's Inside",
  "Memo: renders 'What should you decide?' hero, single tab selector, prominent recommendation",
  "Research: renders 'Today's Brief', 3 action buttons, clickable stats",
  "Workspace: renders documents hub with upload + calendar",
  "System: renders 'System Health' hero, Oracle Control Tower, Trajectory Intelligence",
];

const INTERACTION_TESTS = [
  "Run Live Demo CTA -> navigates to Action Receipts (trace surface)",
  "FTX demo card -> navigates to Investigation (investigate surface)",
  "Acme AI demo card -> navigates to Decision Workbench (memo surface)",
  "All 5 left rail buttons switch surfaces correctly",
  "Right rail shows surface-specific title (not generic 'Workspace')",
  "Cmd+K opens command palette",
  "Bottom trace bar shows 'Ready . All actions logged with evidence . [time]'",
  "StatusStrip shows 'MISSION / [surface name]' breadcrumb (no scrolling ticker)",
  "No console errors on any surface",
  "FastAgent panel shows 'Ask NodeBench' when opened",
];

const NAVIGATION_TESTS = [
  "Navigate to trace surface with ?run=xz-backdoor, then switch to research -- runId clears from URL",
  "Navigate back to trace surface -- no stale runId in URL",
  "Right rail title updates on every surface switch (DeepTrace, Decision Workbench, Research Hub, Workspace, The Oracle)",
];

console.log("=== NodeBench QA Dogfood Checklist ===\n");

// ── Build checks ──────────────────────────────────────────────────────────────
console.log("BUILD CHECKS:");
let allPassed = true;

for (const check of CHECKLIST) {
  const start = Date.now();
  try {
    execSync(check.cmd, {
      cwd: process.cwd(),
      stdio: "pipe",
      timeout: 600_000,
      maxBuffer: 50 * 1024 * 1024,
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  [PASS] ${check.label} (${elapsed}s)`);
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const output = err.stdout?.toString().split("\n").slice(-5).join("\n") || "";
    const errOutput = err.stderr?.toString().split("\n").slice(-5).join("\n") || "";
    console.log(`  [FAIL] ${check.label} (${elapsed}s)`);
    if (output) console.log(`         ${output.replace(/\n/g, "\n         ")}`);
    if (errOutput) console.log(`         ${errOutput.replace(/\n/g, "\n         ")}`);
    allPassed = false;
  }
}

// ── Manual verification checklists ────────────────────────────────────────────
console.log("\nSURFACE TESTS (verify in preview):");
SURFACE_TESTS.forEach((t, i) => console.log(`  [ ] ${i + 1}. ${t}`));

console.log("\nINTERACTION TESTS (verify in preview):");
INTERACTION_TESTS.forEach((t, i) => console.log(`  [ ] ${i + 1}. ${t}`));

console.log("\nNAVIGATION REGRESSION TESTS (verify in preview):");
NAVIGATION_TESTS.forEach((t, i) => console.log(`  [ ] ${i + 1}. ${t}`));

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(50));
if (allPassed) {
  console.log("Build checks: ALL PASSED");
  console.log(`Manual checks remaining: ${SURFACE_TESTS.length + INTERACTION_TESTS.length + NAVIGATION_TESTS.length}`);
} else {
  console.log("Build checks: SOME FAILED -- fix before proceeding to manual checks");
}
console.log("=".repeat(50));

process.exit(allPassed ? 0 : 1);
