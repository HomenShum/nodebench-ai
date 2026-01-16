#!/usr/bin/env npx tsx
/**
 * Deep Research Live E2E Test
 *
 * Runs the Deep Research system against the ground truth query and evaluates output.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

// Configuration
const CONVEX_URL = process.env.CONVEX_URL ?? "https://formal-shepherd-851.convex.cloud";

// Ground truth test query
const GROUND_TRUTH_QUERY = `Vijay Rao
https://www.linkedin.com/in/raovj/

Does it have to do with recent news for Manus acquisition? Vijay initiated the effort and scaled the GPU training clusters for serving and training AI Models. Manus trains their own Manus models for multimodal instruction following agent models and dogfood their own models for the browser automation tasks, which quite much aligns with the narrative where Tests Assured has deep QA Automation expertise, has been integrated with Meta, has proposed to make QA Automation platform to serve customers that need QA automation solution like testing out apps created by AI and generating report and optimization fixes. And other major companies like google gemini antigravity and browser base are all tackling this next trend. Meta can benefit dramatically from acquiring Manus and its foundational models, serve Manus the training capacities and grow super quickly, compete on global multimodal agentic AI models benchmarks, and let companies like tests assured and their development studio to spin off platforms that utilizes Manus by Meta and sell inference and earn revenue and profit and user training data for the next few years.

But, I can be very wrong, be brutally honest, deeply due diligence and critique and verify all information patches fully paralleled
How exactly did you come up with all this from my input? I want a full step by step guide for reproducing similar due diligence and verifications`;

// Ground truth expected sections
const GROUND_TRUTH_SECTIONS = {
  // Section 1: What is verified (high confidence)
  verifiedTopics: [
    "Meta did acquire Manus",
    "Manus is an 'agent' product with browser-operation capability",
    "Vijay Rao is a senior Meta compute / infrastructure executive",
    "'Agent-first' development + browser automation is a real trend",
    "Tests Assured publicly claims prior work with Meta",
  ],

  // Section 2: What is NOT verified
  unverifiedTopics: [
    "Manus trains their own foundation models (contradicted)",
    "Vijay initiated GPU training clusters (not publicly verifiable)",
    "Meta will let vendors spin off platforms (highly speculative)",
  ],

  // Section 3: Alternative explanations
  alternativeExplanations: [
    "vendor due diligence for operational excellence",
    "build-vs-buy evaluation for agentic testing",
    "Manus integration planning touching QA/Evals",
  ],

  // Section 4: Brutally honest assessment
  assessmentCategories: [
    "What's strong",
    "What's weak / likely wrong",
  ],

  // Section 5: How to verify
  verificationSteps: [
    "stated objective and success metric",
    "org sponsoring the engagement",
    "deliverable in 30/60/90 days",
  ],

  // Section 6: Recommendations
  recommendations: [
    "Repro fidelity",
    "Device/build matrix",
    "Artifact standard",
    "Automation roadmap",
    "Safety & data handling",
  ],

  // Sources with URLs
  expectedSources: [
    "Reuters",
    "Business Insider",
    "The Verge",
    "VentureBeat",
    "Engineering at Meta",
  ],
};

interface EvaluationResult {
  category: string;
  expected: string;
  found: boolean;
  score: number;
  details: string;
}

function evaluateReportAgainstGroundTruth(report: any): EvaluationResult[] {
  const results: EvaluationResult[] = [];

  // Check structure completeness
  const structureChecks = [
    { field: "verifiedClaims", name: "Verified Claims Section" },
    { field: "unverifiedClaims", name: "Unverified Claims Section" },
    { field: "hypothesesEvaluated", name: "Hypothesis Evaluation" },
    { field: "methodology", name: "Methodology Steps" },
    { field: "inferenceChain", name: "Inference Chain" },
    { field: "criticalEvaluation", name: "Critical Evaluation" },
    { field: "stepByStepGuide", name: "Step-by-Step Guide" },
    { field: "verificationSteps", name: "Verification Steps (How to Verify)" },
    { field: "recommendations", name: "Recommendations (What to Prepare)" },
    { field: "sources", name: "Sources with URLs" },
  ];

  for (const check of structureChecks) {
    const value = report[check.field];
    const hasContent = Array.isArray(value) ? value.length > 0 : (typeof value === "string" ? value.length > 100 : !!value);
    results.push({
      category: "Structure",
      expected: check.name,
      found: hasContent,
      score: hasContent ? 1 : 0,
      details: Array.isArray(value) ? `${value.length} items` : (typeof value === "string" ? `${value.length} chars` : String(!!value)),
    });
  }

  // Check critical evaluation structure
  if (report.criticalEvaluation) {
    const ce = report.criticalEvaluation;
    results.push({
      category: "Critical Evaluation",
      expected: "Strong Points (What's strong)",
      found: ce.strongPoints?.length > 0,
      score: ce.strongPoints?.length > 0 ? 1 : 0,
      details: `${ce.strongPoints?.length || 0} points`,
    });
    results.push({
      category: "Critical Evaluation",
      expected: "Weak Points (What's weak/wrong)",
      found: ce.weakPoints?.length > 0,
      score: ce.weakPoints?.length > 0 ? 1 : 0,
      details: `${ce.weakPoints?.length || 0} points`,
    });
    results.push({
      category: "Critical Evaluation",
      expected: "Alternative Interpretations",
      found: ce.alternativeInterpretations?.length > 0,
      score: ce.alternativeInterpretations?.length > 0 ? 1 : 0,
      details: `${ce.alternativeInterpretations?.length || 0} alternatives`,
    });
    results.push({
      category: "Critical Evaluation",
      expected: "Brutally Honest Assessment",
      found: !!ce.brutallyHonestAssessment && ce.brutallyHonestAssessment.length > 50,
      score: ce.brutallyHonestAssessment?.length > 50 ? 1 : 0,
      details: `${ce.brutallyHonestAssessment?.length || 0} chars`,
    });
    results.push({
      category: "Critical Evaluation",
      expected: "Skepticism Level",
      found: typeof ce.skepticismLevel === "number",
      score: typeof ce.skepticismLevel === "number" ? 1 : 0,
      details: `Level: ${ce.skepticismLevel ?? "N/A"}`,
    });
  }

  // Check verification steps match ground truth categories
  if (report.verificationSteps && Array.isArray(report.verificationSteps)) {
    const hasDirectContact = report.verificationSteps.some((s: any) => s.method === "direct_contact");
    const hasDocumentRequest = report.verificationSteps.some((s: any) => s.method === "document_request");
    const hasSuggestedQuestions = report.verificationSteps.some((s: any) => s.suggestedQuestions?.length > 0);

    results.push({
      category: "Verification Steps",
      expected: "Direct contact verification",
      found: hasDirectContact,
      score: hasDirectContact ? 1 : 0,
      details: hasDirectContact ? "Present" : "Missing",
    });
    results.push({
      category: "Verification Steps",
      expected: "Document request verification",
      found: hasDocumentRequest,
      score: hasDocumentRequest ? 1 : 0,
      details: hasDocumentRequest ? "Present" : "Missing",
    });
    results.push({
      category: "Verification Steps",
      expected: "Suggested questions for verification",
      found: hasSuggestedQuestions,
      score: hasSuggestedQuestions ? 1 : 0,
      details: hasSuggestedQuestions ? "Present" : "Missing",
    });
  }

  // Check recommendations match ground truth categories
  if (report.recommendations && Array.isArray(report.recommendations)) {
    const categories = report.recommendations.map((r: any) => r.category?.toLowerCase() || "");
    const expectedCategories = ["repro", "artifact", "automation", "safety", "device"];

    for (const expected of expectedCategories) {
      const found = categories.some((c: string) => c.includes(expected));
      results.push({
        category: "Recommendations",
        expected: `${expected.charAt(0).toUpperCase() + expected.slice(1)} recommendation`,
        found,
        score: found ? 1 : 0,
        details: found ? "Present" : "Missing",
      });
    }
  }

  // Check sources have URLs
  if (report.sources && Array.isArray(report.sources)) {
    const sourcesWithUrls = report.sources.filter((s: any) => s.url);
    results.push({
      category: "Sources",
      expected: "Sources with URLs",
      found: sourcesWithUrls.length > 0,
      score: sourcesWithUrls.length >= 5 ? 1 : sourcesWithUrls.length > 0 ? 0.5 : 0,
      details: `${sourcesWithUrls.length} sources with URLs`,
    });
  }

  return results;
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════════════════╗");
  console.log("║           Deep Research Live E2E Test vs Ground Truth                      ║");
  console.log("╚════════════════════════════════════════════════════════════════════════════╝\n");

  const client = new ConvexHttpClient(CONVEX_URL);

  // Step 1: Get a test user
  console.log("📋 Finding test user...\n");
  let testUserId: Id<"users"> | null = null;

  try {
    const userId = await client.query(api.tools.evaluation.helpers.getTestUser, {});
    if (userId) {
      testUserId = userId as Id<"users">;
      console.log(`  Found test user: ${testUserId}\n`);
    }
  } catch (e) {
    console.log(`  Could not fetch test user: ${e}\n`);
  }

  if (!testUserId) {
    console.log("❌ No test user found. Cannot run live test.\n");
    console.log("Running structure validation only...\n");

    // Still run the query decomposition test
    console.log("═".repeat(80));
    console.log("QUERY DECOMPOSITION TEST (Offline)");
    console.log("═".repeat(80));

    const { decomposeQuerySync } = await import("../convex/domains/agents/dueDiligence/deepResearch/queryDecomposer");
    const decomposed = decomposeQuerySync(GROUND_TRUTH_QUERY);

    console.log(`\nIntent: ${JSON.stringify(decomposed.intent, null, 2)}`);
    console.log(`Entities: ${decomposed.entities.length}`);
    console.log(`Hypotheses: ${decomposed.hypotheses.length}`);
    console.log(`Sub-Questions: ${decomposed.subQuestions.length}`);
    console.log(`Verification Requests: ${decomposed.verificationRequests.length}`);

    process.exit(0);
    return;
  }

  // Step 2: Run Deep Research
  console.log("═".repeat(80));
  console.log("RUNNING DEEP RESEARCH");
  console.log("═".repeat(80));
  console.log(`\nQuery: ${GROUND_TRUTH_QUERY.slice(0, 100)}...\n`);

  let report: any = null;

  try {
    console.log("Starting Deep Research job...");
    const startTime = Date.now();

    const result = await client.action(
      api.domains.agents.dueDiligence.deepResearch.deepResearchOrchestrator.startDeepResearch,
      {
        query: GROUND_TRUTH_QUERY,
        userId: testUserId,
        depth: "comprehensive",
        requireVerification: true,
      }
    );

    const elapsed = Date.now() - startTime;
    console.log(`\n✅ Deep Research completed in ${elapsed}ms`);
    console.log(`   Job ID: ${result.jobId}`);
    console.log(`   Verdict: ${result.report.overallVerdict}`);

    report = result.report;
  } catch (error) {
    console.error(`\n❌ Deep Research failed: ${error}`);
    process.exit(1);
  }

  // Step 3: Evaluate against ground truth
  console.log("\n" + "═".repeat(80));
  console.log("EVALUATION vs GROUND TRUTH");
  console.log("═".repeat(80));

  const evaluationResults = evaluateReportAgainstGroundTruth(report);

  // Group by category
  const categories = [...new Set(evaluationResults.map(r => r.category))];

  let totalScore = 0;
  let totalChecks = 0;

  for (const category of categories) {
    console.log(`\n### ${category}`);
    const categoryResults = evaluationResults.filter(r => r.category === category);

    for (const result of categoryResults) {
      const icon = result.found ? "✓" : "✗";
      const scoreStr = result.score === 1 ? "100%" : result.score === 0.5 ? "50%" : "0%";
      console.log(`  ${icon} ${result.expected.padEnd(40)} ${scoreStr.padStart(5)} (${result.details})`);
      totalScore += result.score;
      totalChecks++;
    }
  }

  const overallScore = Math.round((totalScore / totalChecks) * 100);

  console.log("\n" + "═".repeat(80));
  console.log("REPORT CONTENT SUMMARY");
  console.log("═".repeat(80));

  // Show key content
  console.log("\n### Executive Summary:");
  console.log(report.executiveSummary?.slice(0, 300) + "...\n");

  console.log("### Key Findings:");
  for (const finding of (report.keyFindings || []).slice(0, 5)) {
    console.log(`  • ${finding}`);
  }

  console.log("\n### Verified Claims:");
  for (const claim of (report.verifiedClaims || []).slice(0, 3)) {
    console.log(`  ✓ ${claim.claim?.slice(0, 80)}... (${Math.round(claim.confidence * 100)}%)`);
  }

  console.log("\n### Unverified Claims:");
  for (const claim of (report.unverifiedClaims || []).slice(0, 3)) {
    console.log(`  ⚠ ${claim.slice(0, 80)}...`);
  }

  if (report.criticalEvaluation) {
    console.log("\n### Critical Evaluation:");
    console.log("  Strong Points:");
    for (const point of (report.criticalEvaluation.strongPoints || []).slice(0, 2)) {
      console.log(`    ✓ ${point.point?.slice(0, 60)}...`);
    }
    console.log("  Weak Points:");
    for (const point of (report.criticalEvaluation.weakPoints || []).slice(0, 2)) {
      console.log(`    ✗ ${point.point?.slice(0, 60)}...`);
    }
  }

  console.log("\n### Verification Steps (How to Verify):");
  for (const step of (report.verificationSteps || []).slice(0, 3)) {
    console.log(`  ${step.stepNumber}. [${step.method}] ${step.action?.slice(0, 60)}...`);
  }

  console.log("\n### Recommendations (What to Prepare):");
  for (const rec of (report.recommendations || []).slice(0, 3)) {
    console.log(`  • [${rec.category}] ${rec.recommendation?.slice(0, 60)}...`);
  }

  console.log("\n### Sources:");
  const sourcesWithUrls = (report.sources || []).filter((s: any) => s.url);
  for (const source of sourcesWithUrls.slice(0, 5)) {
    console.log(`  [${source.type}] ${source.title?.slice(0, 40)}... - ${source.url}`);
  }

  // Final Summary
  console.log("\n" + "═".repeat(80));
  console.log("FINAL SCORE");
  console.log("═".repeat(80));
  console.log(`\n  Overall Score: ${overallScore}% (${totalScore}/${totalChecks} checks passed)`);

  if (overallScore >= 80) {
    console.log("  Status: ✅ EXCELLENT - Output matches ground truth format well");
  } else if (overallScore >= 60) {
    console.log("  Status: ⚠️ GOOD - Most ground truth sections present");
  } else {
    console.log("  Status: ❌ NEEDS IMPROVEMENT - Missing key ground truth sections");
  }

  console.log("\n" + "═".repeat(80));
  console.log("GAP ANALYSIS");
  console.log("═".repeat(80));

  const missingFeatures = evaluationResults.filter(r => !r.found);
  if (missingFeatures.length > 0) {
    console.log("\nMissing from ground truth format:");
    for (const missing of missingFeatures) {
      console.log(`  ❌ ${missing.expected}`);
    }
  } else {
    console.log("\n✅ All ground truth sections present!");
  }

  process.exit(overallScore >= 60 ? 0 : 1);
}

main().catch(console.error);
