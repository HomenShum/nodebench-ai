/**
 * E2E test for UI Dive v3 Flywheel tools.
 * Runs each new tool handler directly against the real DB.
 *
 * Usage: npx tsx src/__tests__/flywheel-e2e.mts
 */

import { uiUxDiveAdvancedTools } from "../tools/uiUxDiveAdvancedTools.js";
import { uiUxDiveTools } from "../tools/uiUxDiveTools.js";

const allTools = [...uiUxDiveTools, ...uiUxDiveAdvancedTools];

function findTool(name: string) {
  const t = allTools.find((t) => t.name === name);
  if (!t) throw new Error(`Tool not found: ${name}. Available: ${allTools.map(t => t.name).join(", ")}`);
  return t;
}

const PROJECT_PATH = "D:\\VSCode Projects\\cafecorner_nodebench\\nodebench_ai4\\nodebench-ai";
let sessionId = "";
let componentId = "";
let bugId = "";

async function run() {
  console.log("=== UI Dive Flywheel E2E Test ===\n");

  // List all v2 tools to verify they exist
  const v2ToolNames = uiUxDiveAdvancedTools.map(t => t.name);
  console.log(`✅ Found ${v2ToolNames.length} advanced tools: ${v2ToolNames.join(", ")}\n`);

  const expectedNew = ["dive_code_locate", "dive_fix_verify", "dive_reexplore", "dive_generate_tests", "dive_code_review"];
  for (const name of expectedNew) {
    const found = v2ToolNames.includes(name);
    console.log(`  ${found ? "✅" : "❌"} ${name}: ${found ? "FOUND" : "MISSING"}`);
    if (!found) {
      console.error(`FATAL: Missing tool ${name}`);
      process.exit(1);
    }
  }
  console.log("");

  // ── 1. Create a test dive session ──
  console.log("--- Step 1: Create test session ---");
  const startDive = findTool("start_ui_dive");
  const sessionResult = await startDive.handler({
    appUrl: "http://localhost:5173",
    appName: "Flywheel E2E Test",
  }) as any;
  sessionId = sessionResult.sessionId;
  console.log(`  Session: ${sessionId}`);

  // ── 2. Register a test component ──
  console.log("--- Step 2: Register test component ---");
  const registerComp = findTool("register_component");
  const compResult = await registerComp.handler({
    sessionId,
    name: "test/cost-dashboard",
    componentType: "page",
    selector: ".cost-dashboard",
    metadata: { route: "/cost", sourceFiles: ["src/components/CostDashboard.tsx"] },
  }) as any;
  componentId = compResult.componentId;
  console.log(`  Component: ${componentId} (${compResult.name})`);

  // ── 3. Tag a test bug ──
  console.log("--- Step 3: Tag test bug ---");
  const tagBug = findTool("tag_ui_bug");
  const bugResult = await tagBug.handler({
    componentId,
    severity: "medium",
    category: "functional",
    title: "NaN% in Token Usage when no data",
    description: "Division by zero produces NaN% of total",
    expected: "0% of total",
    actual: "NaN% of total",
  }) as any;
  bugId = bugResult.bugId;
  console.log(`  Bug: ${bugId} (${bugResult.title})`);

  // ── 4. TEST: dive_code_locate ──
  console.log("\n--- Step 4: dive_code_locate ---");
  const codeLocate = findTool("dive_code_locate");
  const locateResult = await codeLocate.handler({
    sessionId,
    projectPath: PROJECT_PATH,
    bugId,
    searchQueries: ["NaN", "tokenUsage", "CostDashboard"],
    filePatterns: ["*.tsx"],
    contextLines: 2,
  }) as any;
  console.log(`  Locations found: ${locateResult.locationsFound}`);
  if (locateResult.locationsFound > 0) {
    console.log(`  First: ${locateResult.locations[0].file}:${locateResult.locations[0].lines}`);
    console.log(`  Snippet preview: ${locateResult.locations[0].snippet?.slice(0, 120)}...`);
  }
  console.log(`  ✅ dive_code_locate: ${locateResult.error ? "FAIL - " + locateResult.message : "PASS"}`);

  // ── 5. TEST: dive_fix_verify ──
  console.log("\n--- Step 5: dive_fix_verify ---");
  const fixVerify = findTool("dive_fix_verify");
  const verifyResult = await fixVerify.handler({
    sessionId,
    bugId,
    route: "/cost",
    fixDescription: "Added guard: if total === 0, display '0%' instead of computing percentage",
    filesChanged: ["src/components/CostDashboard.tsx"],
    verified: false,
    verificationNotes: "Fix applied, pending visual verification via Playwright",
  }) as any;
  console.log(`  Verification ID: ${verifyResult.verificationId}`);
  console.log(`  Changelog ID: ${verifyResult.changelogId}`);
  console.log(`  Bug status: ${verifyResult.bugStatus}`);
  console.log(`  ✅ dive_fix_verify (unverified): ${verifyResult.error ? "FAIL - " + verifyResult.message : "PASS"}`);

  // Now verify it
  const verifyResult2 = await fixVerify.handler({
    sessionId,
    bugId,
    route: "/cost",
    fixDescription: "Added guard: if total === 0, display '0%' instead of computing percentage",
    filesChanged: ["src/components/CostDashboard.tsx"],
    verified: true,
    verificationNotes: "Confirmed: Cost Dashboard now shows 0% instead of NaN%",
  }) as any;
  console.log(`  Bug status after verify: ${verifyResult2.bugStatus}`);
  console.log(`  ✅ dive_fix_verify (verified): ${verifyResult2.error ? "FAIL - " + verifyResult2.message : "PASS"}`);

  // ── 6. TEST: dive_reexplore ──
  console.log("\n--- Step 6: dive_reexplore ---");
  const reexplore = findTool("dive_reexplore");
  const reexploreResult = await reexplore.handler({
    sessionId,
    route: "/cost",
    currentState: {
      componentsVisible: ["test/cost-dashboard"],
      newIssues: [],
      fixedIssues: ["NaN% bug"],
      consoleErrors: [],
      notes: "Page renders correctly, no NaN values visible",
    },
  }) as any;
  console.log(`  Regression-free: ${reexploreResult.regressionFree}`);
  console.log(`  Missing components: ${reexploreResult.diff.missingComponents.length}`);
  console.log(`  Open bugs: ${reexploreResult.diff.openBugs}`);
  console.log(`  Status: ${reexploreResult._status}`);
  console.log(`  ✅ dive_reexplore: ${reexploreResult.error ? "FAIL - " + reexploreResult.message : "PASS"}`);

  // ── 7. TEST: dive_generate_tests ──
  console.log("\n--- Step 7: dive_generate_tests ---");
  const genTests = findTool("dive_generate_tests");
  const testResult = await genTests.handler({
    sessionId,
    bugId,
  }) as any;
  console.log(`  Tests generated: ${testResult.testCount}`);
  console.log(`  Framework: ${testResult.framework}`);
  console.log(`  Covers: ${testResult.covers?.join(", ")}`);
  console.log(`  Code preview: ${testResult.testCode?.slice(0, 200)}...`);
  console.log(`  ✅ dive_generate_tests: ${testResult.error ? "FAIL - " + testResult.message : "PASS"}`);

  // ── 8. TEST: dive_code_review ──
  console.log("\n--- Step 8: dive_code_review ---");
  const codeReview = findTool("dive_code_review");
  const reviewResult = await codeReview.handler({
    sessionId,
    format: "markdown",
  }) as any;
  console.log(`  Score: ${reviewResult.score}/100 (${reviewResult.grade})`);
  console.log(`  Findings: ${reviewResult.findingsCount} (${reviewResult.openCount} open, ${reviewResult.resolvedCount} resolved)`);
  console.log(`  Severity: ${JSON.stringify(reviewResult.severityCounts)}`);
  console.log(`  Recommendations: ${reviewResult.recommendations?.length}`);
  console.log(`  Review preview: ${reviewResult.review?.slice(0, 300)}...`);
  console.log(`  ✅ dive_code_review: ${reviewResult.error ? "FAIL - " + reviewResult.message : "PASS"}`);

  // ── Summary ──
  console.log("\n=== FLYWHEEL E2E SUMMARY ===");
  console.log(`  Total tools tested: 5`);
  console.log(`  dive_code_locate:    ${locateResult.error ? "❌ FAIL" : "✅ PASS"}`);
  console.log(`  dive_fix_verify:     ${verifyResult2.error ? "❌ FAIL" : "✅ PASS"}`);
  console.log(`  dive_reexplore:      ${reexploreResult.error ? "❌ FAIL" : "✅ PASS"}`);
  console.log(`  dive_generate_tests: ${testResult.error ? "❌ FAIL" : "✅ PASS"}`);
  console.log(`  dive_code_review:    ${reviewResult.error ? "❌ FAIL" : "✅ PASS"}`);

  const allPassed = ![locateResult, verifyResult2, reexploreResult, testResult, reviewResult].some(r => r.error);
  console.log(`\n  ${allPassed ? "✅ ALL 5 FLYWHEEL TOOLS PASS" : "❌ SOME TOOLS FAILED"}`);
  process.exit(allPassed ? 0 : 1);
}

run().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
