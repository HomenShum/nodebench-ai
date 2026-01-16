#!/usr/bin/env npx tsx
/**
 * test-dd-e2e.ts
 *
 * End-to-end test for the Due Diligence pipeline.
 * Actually runs a DD job and evaluates the output.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

// Configuration
const CONVEX_URL = process.env.CONVEX_URL ?? "https://formal-shepherd-851.convex.cloud";

interface TestResult {
  test: string;
  passed: boolean;
  details?: string;
  error?: string;
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     Due Diligence Pipeline E2E Test                        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const client = new ConvexHttpClient(CONVEX_URL);
  const results: TestResult[] = [];

  // Get a valid user ID from the evaluation helpers
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
    console.log("❌ No test user found.\n");
    console.log("Running validation tests without live execution...\n");
  }

  // Test 1: Query DD jobs API works
  console.log("Test 1: DD Jobs Query API...");
  try {
    if (testUserId) {
      const jobs = await client.query(api.domains.agents.dueDiligence.ddMutations.getUserDDJobs, {
        userId: testUserId,
        limit: 10,
      });
      results.push({
        test: "DD Jobs Query",
        passed: true,
        details: `Found ${jobs.length} existing DD jobs`,
      });
      console.log(`  ✅ Query succeeded - ${jobs.length} existing jobs\n`);
    } else {
      results.push({
        test: "DD Jobs Query",
        passed: false,
        error: "No test user available",
      });
      console.log("  ⚠️ Skipped - no test user\n");
    }
  } catch (error) {
    results.push({
      test: "DD Jobs Query",
      passed: false,
      error: String(error),
    });
    console.log(`  ❌ Failed: ${error}\n`);
  }

  // Test 2: DD Trigger Query API works
  console.log("Test 2: DD Trigger Queries API...");
  try {
    const pendingTriggers = await client.query(
      api.domains.agents.dueDiligence.ddTriggerQueries.getPendingDDTriggers,
      { limit: 5 }
    );
    results.push({
      test: "DD Trigger Queries",
      passed: true,
      details: `Found ${pendingTriggers.length} pending triggers`,
    });
    console.log(`  ✅ Query succeeded - ${pendingTriggers.length} pending triggers\n`);
  } catch (error) {
    results.push({
      test: "DD Trigger Queries",
      passed: false,
      error: String(error),
    });
    console.log(`  ❌ Failed: ${error}\n`);
  }

  // Test 3: Start a DD job (if we have a user)
  let ddJobId: string | null = null;
  console.log("Test 3: Start DD Job...");
  if (testUserId) {
    try {
      const result = await client.action(
        api.domains.agents.dueDiligence.ddOrchestrator.startDueDiligenceJob,
        {
          entityName: "OpenAI",
          entityType: "company",
          triggerSource: "manual",
          userId: testUserId,
        }
      );

      ddJobId = result.jobId;
      results.push({
        test: "Start DD Job",
        passed: true,
        details: `Job started: ${result.jobId} (status: ${result.status})`,
      });
      console.log(`  ✅ Job started: ${result.jobId}\n`);
      console.log(`     Status: ${result.status}\n`);
    } catch (error) {
      results.push({
        test: "Start DD Job",
        passed: false,
        error: String(error),
      });
      console.log(`  ❌ Failed: ${error}\n`);
    }
  } else {
    results.push({
      test: "Start DD Job",
      passed: false,
      error: "No test user available",
    });
    console.log("  ⚠️ Skipped - no test user\n");
  }

  // Test 4: Check job progress (if we started a job)
  if (ddJobId) {
    console.log("Test 4: Check DD Job Progress...");

    // Wait a bit for the job to start processing
    console.log("  Waiting 5s for job to process...\n");
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
      const progress = await client.query(
        api.domains.agents.dueDiligence.ddMutations.getDDJobProgress,
        { jobId: ddJobId }
      );

      if (progress) {
        results.push({
          test: "DD Job Progress",
          passed: true,
          details: `Status: ${progress.status}, Phase: ${progress.phase}, Branches: ${progress.totalBranches}`,
        });
        console.log(`  ✅ Progress retrieved:\n`);
        console.log(`     Status: ${progress.status}`);
        console.log(`     Phase: ${progress.phase}`);
        console.log(`     Active branches: ${progress.activeBranches.join(", ") || "none"}`);
        console.log(`     Completed: ${progress.completedBranches.join(", ") || "none"}`);
        console.log(`     Total branches: ${progress.totalBranches}\n`);
      } else {
        results.push({
          test: "DD Job Progress",
          passed: false,
          error: "Progress returned null",
        });
        console.log("  ❌ Progress returned null\n");
      }
    } catch (error) {
      results.push({
        test: "DD Job Progress",
        passed: false,
        error: String(error),
      });
      console.log(`  ❌ Failed: ${error}\n`);
    }

    // Test 5: Get full job details
    console.log("Test 5: Get Full DD Job Details...");
    try {
      const jobDetails = await client.query(
        api.domains.agents.dueDiligence.ddMutations.getDDJob,
        { jobId: ddJobId }
      );

      if (jobDetails) {
        results.push({
          test: "DD Job Details",
          passed: true,
          details: `Job found with ${jobDetails.branches.length} branches`,
        });
        console.log(`  ✅ Job details retrieved:\n`);
        console.log(`     Entity: ${jobDetails.job.entityName} (${jobDetails.job.entityType})`);
        console.log(`     Status: ${jobDetails.job.status}`);
        console.log(`     Branches: ${jobDetails.branches.length}`);

        if (jobDetails.branches.length > 0) {
          console.log(`     Branch details:`);
          for (const branch of jobDetails.branches) {
            console.log(`       - ${branch.branchType}: ${branch.status}`);
          }
        }

        if (jobDetails.memo) {
          console.log(`     Memo: Generated (verdict: ${jobDetails.memo.verdict})`);
        }
        console.log();
      } else {
        results.push({
          test: "DD Job Details",
          passed: false,
          error: "Job not found",
        });
        console.log("  ❌ Job not found\n");
      }
    } catch (error) {
      results.push({
        test: "DD Job Details",
        passed: false,
        error: String(error),
      });
      console.log(`  ❌ Failed: ${error}\n`);
    }

    // Test 6: Wait for completion and check final state
    console.log("Test 6: Wait for Job Completion (max 60s)...");
    const startWait = Date.now();
    const maxWait = 60000;
    let finalStatus = "unknown";
    let finalMemo: any = null;

    while (Date.now() - startWait < maxWait) {
      try {
        const progress = await client.query(
          api.domains.agents.dueDiligence.ddMutations.getDDJobProgress,
          { jobId: ddJobId }
        );

        if (progress) {
          finalStatus = progress.status;
          console.log(`  ... Status: ${progress.status}, Phase: ${progress.phase}`);

          if (progress.status === "completed" || progress.status === "failed") {
            // Get final details
            const finalDetails = await client.query(
              api.domains.agents.dueDiligence.ddMutations.getDDJob,
              { jobId: ddJobId }
            );
            finalMemo = finalDetails?.memo;
            break;
          }
        }
      } catch (e) {
        console.log(`  ... Error checking status: ${e}`);
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (finalStatus === "completed") {
      results.push({
        test: "DD Job Completion",
        passed: true,
        details: finalMemo ? `Memo generated with verdict: ${finalMemo.verdict}` : "Completed but no memo",
      });
      console.log(`\n  ✅ Job completed successfully!\n`);

      if (finalMemo) {
        console.log("  📄 DD Memo Summary:");
        console.log(`     Entity: ${finalMemo.entityName}`);
        console.log(`     Verdict: ${finalMemo.verdict}`);
        console.log(`     Executive Summary: ${finalMemo.executiveSummary.slice(0, 200)}...`);
        console.log(`     Sources: ${finalMemo.sources?.length ?? 0}`);
        console.log();
      }
    } else if (finalStatus === "failed") {
      results.push({
        test: "DD Job Completion",
        passed: false,
        error: "Job failed",
      });
      console.log(`\n  ❌ Job failed\n`);
    } else {
      results.push({
        test: "DD Job Completion",
        passed: false,
        error: `Timed out in status: ${finalStatus}`,
      });
      console.log(`\n  ⚠️ Job did not complete within 60s (status: ${finalStatus})\n`);
    }
  }

  // Summary
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                    E2E Test Summary                        ║");
  console.log("╠════════════════════════════════════════════════════════════╣");

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  for (const result of results) {
    const icon = result.passed ? "✅" : "❌";
    console.log(`║  ${icon} ${result.test.padEnd(25)} ${(result.details || result.error || "").slice(0, 30).padEnd(30)} ║`);
  }

  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(`║  Total: ${passed} passed, ${failed} failed                              ║`);
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  if (failed > 0) {
    console.log("❌ Some tests failed. Check the output above for details.\n");
    process.exit(1);
  } else {
    console.log("✅ All tests passed!\n");
  }
}

main().catch(console.error);
