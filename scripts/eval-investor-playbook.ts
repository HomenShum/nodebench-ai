/**
 * Investor Playbook Evaluation Script
 *
 * Tests the investor playbook against the MyDentalWig ground truth case.
 * This is a comprehensive E2E test that validates our verification framework
 * can detect the same risks identified in manual due diligence.
 *
 * Ground Truth Summary (MyDentalWig):
 * - Entity exists: Delaware corporation formed 2021
 * - SEC filings: Reg CF via PicMii portal (FINRA registered)
 * - FDA claims: "FDA Cleared" marketed but may only be "registered" (MISREPRESENTATION RISK)
 * - Patent: US 7,967,145 mentioned (needs assignment verification)
 * - Promotional claims: $200B "Sainte Lydie City", $1B valuation (OUTSIZED vs $4,759 revenue)
 * - Overall: HIGH RISK - Real company but high misrepresentation/fraud risk
 *
 * Usage:
 *   npx convex run scripts/eval-investor-playbook.ts
 *   OR
 *   npx ts-node scripts/eval-investor-playbook.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Ground truth expectations
const GROUND_TRUTH = {
  entityName: "MyDentalWig",
  legalName: "MYDENTALWIG INC.",

  // Entity verification
  entity: {
    state: "DE",
    formationYear: 2021,
    entityType: "Corporation",
    shouldExist: true,
  },

  // SEC/Securities
  securities: {
    regime: "Reg CF",
    hasFilings: true,
    intermediary: "PicMii",
    formCExists: true,
  },

  // FINRA
  finra: {
    portal: "PicMii",
    isRegistered: true,
    fullName: "PicMii Crowdfunding LLC",
  },

  // FDA - CRITICAL: This is the key misrepresentation
  fda: {
    claimedStatus: "FDA Cleared",
    likelyActualStatus: "Registered/Listed Only", // NOT cleared
    isMisrepresentation: true,
    deviceName: "Dental Wig",
  },

  // Patents
  patents: {
    claimedPatent: "US 7,967,145",
    ownershipVerified: false, // Licensed, not owned by company
  },

  // Overall assessment
  expectedRisk: "high" as const,
  expectedRecommendation: "require_resolution" as const,

  // Key red flags that MUST be detected
  requiredRedFlags: [
    "FDA status misrepresentation", // Claims cleared but likely only registered
    "Outsized promotional claims", // $200B vs $4,759 revenue
    "Direct funding request risk", // Off-platform solicitation
  ],

  // Stop rules that should trigger
  expectedStopRules: [
    "FDA Status Misrepresentation",
  ],
};

interface EvaluationResult {
  passed: boolean;
  score: number;
  maxScore: number;
  findings: {
    category: string;
    expected: string;
    actual: string;
    match: boolean;
    points: number;
  }[];
  criticalFailures: string[];
  executionTimeMs: number;
  playbookOutput: any;
}

async function evaluatePlaybook(): Promise<EvaluationResult> {
  const startTime = Date.now();

  // Initialize Convex client
  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("CONVEX_URL not set. Run: npx convex env");
  }

  const client = new ConvexHttpClient(convexUrl);

  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║     INVESTOR PLAYBOOK EVALUATION: MyDentalWig                 ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Ground Truth Summary:");
  console.log("  - Delaware corporation formed 2021");
  console.log("  - Reg CF via PicMii (FINRA registered portal)");
  console.log("  - Claims 'FDA Cleared' but likely only registered (KEY RISK)");
  console.log("  - Patent US 7,967,145 (assignment unclear)");
  console.log("  - $200B promotional claims vs $4,759 audited revenue");
  console.log();

  // Run the playbook
  console.log("Running investor playbook...");
  console.log();

  let playbookResult: any;
  try {
    playbookResult = await client.action(api.domains.agents.dueDiligence.investorPlaybook.playbookActions.runPlaybook, {
      entityName: GROUND_TRUTH.entityName,
      entityType: "company",
      claimedState: GROUND_TRUTH.entity.state,
      claimedFormationYear: GROUND_TRUTH.entity.formationYear,
      claimedSecuritiesRegime: GROUND_TRUTH.securities.regime,
      claimedFundingPortal: GROUND_TRUTH.finra.portal,
      claimedFDAStatus: GROUND_TRUTH.fda.claimedStatus,
      claimedPatents: [GROUND_TRUTH.patents.claimedPatent],
    });
  } catch (error) {
    console.error("Playbook execution failed:", error);
    return {
      passed: false,
      score: 0,
      maxScore: 100,
      findings: [],
      criticalFailures: [`Playbook execution error: ${error}`],
      executionTimeMs: Date.now() - startTime,
      playbookOutput: null,
    };
  }

  const executionTimeMs = Date.now() - startTime;
  console.log(`Playbook completed in ${executionTimeMs}ms`);
  console.log();

  // Evaluate results
  const findings: EvaluationResult["findings"] = [];
  const criticalFailures: string[] = [];
  let totalPoints = 0;
  const maxPoints = 100;

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 1: Overall Risk Assessment (25 points)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("═══ CATEGORY 1: Overall Risk Assessment (25 pts) ═══");

  // 1a. Overall risk level (15 pts)
  const riskMatch = playbookResult.overallRisk === GROUND_TRUTH.expectedRisk ||
    (playbookResult.overallRisk === "critical" && GROUND_TRUTH.expectedRisk === "high") ||
    (playbookResult.overallRisk === "elevated" && GROUND_TRUTH.expectedRisk === "high");

  findings.push({
    category: "Risk Level",
    expected: GROUND_TRUTH.expectedRisk,
    actual: playbookResult.overallRisk,
    match: riskMatch,
    points: riskMatch ? 15 : 0,
  });
  totalPoints += riskMatch ? 15 : 0;
  console.log(`  Risk Level: ${riskMatch ? "✓" : "✗"} (expected: ${GROUND_TRUTH.expectedRisk}, got: ${playbookResult.overallRisk})`);

  if (!riskMatch && playbookResult.overallRisk === "low") {
    criticalFailures.push("CRITICAL: System rated HIGH RISK company as LOW RISK");
  }

  // 1b. Recommendation (10 pts)
  const recMatch = playbookResult.recommendation !== "proceed" ||
    playbookResult.shouldDisengage;

  findings.push({
    category: "Recommendation",
    expected: "NOT proceed",
    actual: playbookResult.recommendation,
    match: recMatch,
    points: recMatch ? 10 : 0,
  });
  totalPoints += recMatch ? 10 : 0;
  console.log(`  Recommendation: ${recMatch ? "✓" : "✗"} (expected: NOT proceed, got: ${playbookResult.recommendation})`);

  if (playbookResult.recommendation === "proceed" && !playbookResult.shouldDisengage) {
    criticalFailures.push("CRITICAL: System recommended PROCEED on high-risk target");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 2: FDA Misrepresentation Detection (25 points) - MOST CRITICAL
  // ═══════════════════════════════════════════════════════════════════════════

  console.log();
  console.log("═══ CATEGORY 2: FDA Misrepresentation Detection (25 pts) ═══");

  // This is the KEY test - the ground truth explicitly calls out FDA misrepresentation
  const fdaFlags = playbookResult.stopRulesTriggered?.some((r: string) =>
    r.toLowerCase().includes("fda") || r.toLowerCase().includes("misrepresentation")
  ) || false;

  const fdaDiscrepancy = playbookResult.discrepancyCount > 0;

  // Check if FDA status mismatch was detected
  let fdaMisrepDetected = false;
  if (playbookResult.report) {
    const reportLower = playbookResult.report.toLowerCase();
    fdaMisrepDetected =
      reportLower.includes("registered") && reportLower.includes("cleared") ||
      reportLower.includes("misrepresentation") ||
      reportLower.includes("fda") && reportLower.includes("not found") ||
      fdaFlags;
  }

  findings.push({
    category: "FDA Misrepresentation",
    expected: "DETECTED (cleared vs registered)",
    actual: fdaMisrepDetected ? "DETECTED" : "NOT DETECTED",
    match: fdaMisrepDetected,
    points: fdaMisrepDetected ? 25 : 0,
  });
  totalPoints += fdaMisrepDetected ? 25 : 0;
  console.log(`  FDA Misrepresentation: ${fdaMisrepDetected ? "✓" : "✗"} (${fdaMisrepDetected ? "correctly flagged" : "MISSED"})`);

  if (!fdaMisrepDetected) {
    criticalFailures.push("CRITICAL: Failed to detect FDA 'cleared' vs 'registered' misrepresentation");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 3: Securities Verification (15 points)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log();
  console.log("═══ CATEGORY 3: Securities Verification (15 pts) ═══");

  // 3a. SEC regime detection (10 pts)
  const secScore = playbookResult.verificationScores?.securities || 0;
  const secDetected = secScore > 0.3;

  findings.push({
    category: "SEC Filing Detection",
    expected: "Reg CF detected",
    actual: secDetected ? `Detected (score: ${(secScore * 100).toFixed(0)}%)` : "Not detected",
    match: secDetected,
    points: secDetected ? 10 : 0,
  });
  totalPoints += secDetected ? 10 : 0;
  console.log(`  SEC Detection: ${secDetected ? "✓" : "✗"} (score: ${(secScore * 100).toFixed(0)}%)`);

  // 3b. FINRA portal verification (5 pts)
  const finraScore = playbookResult.verificationScores?.finra || 0;
  const finraDetected = finraScore > 0.3;

  findings.push({
    category: "FINRA Portal",
    expected: "PicMii verified",
    actual: finraDetected ? `Verified (score: ${(finraScore * 100).toFixed(0)}%)` : "Not verified",
    match: finraDetected,
    points: finraDetected ? 5 : 0,
  });
  totalPoints += finraDetected ? 5 : 0;
  console.log(`  FINRA Portal: ${finraDetected ? "✓" : "✗"} (score: ${(finraScore * 100).toFixed(0)}%)`);

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 4: Entity Verification (10 points)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log();
  console.log("═══ CATEGORY 4: Entity Verification (10 pts) ═══");

  const entityScore = playbookResult.verificationScores?.entity || 0;
  const entityDetected = entityScore > 0.2;

  findings.push({
    category: "Entity Verification",
    expected: "Delaware corp exists",
    actual: entityDetected ? `Found (score: ${(entityScore * 100).toFixed(0)}%)` : "Not found",
    match: entityDetected,
    points: entityDetected ? 10 : 0,
  });
  totalPoints += entityDetected ? 10 : 0;
  console.log(`  Entity: ${entityDetected ? "✓" : "✗"} (score: ${(entityScore * 100).toFixed(0)}%)`);

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 5: Patent Verification (10 points)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log();
  console.log("═══ CATEGORY 5: Patent Verification (10 pts) ═══");

  const patentScore = playbookResult.verificationScores?.patents || 0;
  const patentChecked = patentScore > 0.2;

  findings.push({
    category: "Patent Verification",
    expected: "US 7,967,145 checked",
    actual: patentChecked ? `Checked (score: ${(patentScore * 100).toFixed(0)}%)` : "Not checked",
    match: patentChecked,
    points: patentChecked ? 10 : 0,
  });
  totalPoints += patentChecked ? 10 : 0;
  console.log(`  Patents: ${patentChecked ? "✓" : "✗"} (score: ${(patentScore * 100).toFixed(0)}%)`);

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 6: Money Flow / Wire Fraud (15 points)
  // ═══════════════════════════════════════════════════════════════════════════

  console.log();
  console.log("═══ CATEGORY 6: Money Flow Integrity (15 pts) ═══");

  const moneyScore = playbookResult.verificationScores?.moneyFlow || 0;
  const moneyChecked = moneyScore > 0.2;

  findings.push({
    category: "Money Flow Check",
    expected: "Escrow/portal verification",
    actual: moneyChecked ? `Checked (score: ${(moneyScore * 100).toFixed(0)}%)` : "Not checked",
    match: moneyChecked,
    points: moneyChecked ? 15 : 0,
  });
  totalPoints += moneyChecked ? 15 : 0;
  console.log(`  Money Flow: ${moneyChecked ? "✓" : "✗"} (score: ${(moneyScore * 100).toFixed(0)}%)`);

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL SCORING
  // ═══════════════════════════════════════════════════════════════════════════

  console.log();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`FINAL SCORE: ${totalPoints}/${maxPoints} (${((totalPoints / maxPoints) * 100).toFixed(1)}%)`);
  console.log("═══════════════════════════════════════════════════════════════");

  const passed = totalPoints >= 60 && criticalFailures.length === 0;

  if (passed) {
    console.log();
    console.log("✓ EVALUATION PASSED");
  } else {
    console.log();
    console.log("✗ EVALUATION FAILED");
    if (criticalFailures.length > 0) {
      console.log();
      console.log("Critical Failures:");
      for (const failure of criticalFailures) {
        console.log(`  - ${failure}`);
      }
    }
  }

  // Print full report if available
  if (playbookResult.report) {
    console.log();
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("PLAYBOOK GENERATED REPORT:");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(playbookResult.report);
  }

  return {
    passed,
    score: totalPoints,
    maxScore: maxPoints,
    findings,
    criticalFailures,
    executionTimeMs,
    playbookOutput: playbookResult,
  };
}

// Run evaluation
async function main() {
  try {
    const result = await evaluatePlaybook();

    console.log();
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("EVALUATION SUMMARY");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`Status: ${result.passed ? "PASSED ✓" : "FAILED ✗"}`);
    console.log(`Score: ${result.score}/${result.maxScore}`);
    console.log(`Execution Time: ${result.executionTimeMs}ms`);

    if (result.criticalFailures.length > 0) {
      console.log();
      console.log("Critical Failures:");
      result.criticalFailures.forEach(f => console.log(`  - ${f}`));
    }

    // Exit with appropriate code
    process.exit(result.passed ? 0 : 1);

  } catch (error) {
    console.error("Evaluation failed with error:", error);
    process.exit(1);
  }
}

main();
