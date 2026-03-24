/**
 * Runner for the Ambient Intelligence Benchmark Suite.
 * Executes all 5 benchmarks, prints per-benchmark scores, and overall pass rate.
 */

import { runAmbientBenchSuite } from "./ambientBench.js";

async function main() {
  console.log("=== Ambient Intelligence Benchmark Suite ===\n");
  console.log("Running 5 benchmarks...\n");

  const suite = await runAmbientBenchSuite();

  // Per-benchmark results
  for (const r of suite.results) {
    const status = r.passed ? "PASS" : "FAIL";
    console.log(`--- ${r.benchmarkName} [${status}] (${r.runDurationMs}ms) ---`);

    if (Object.keys(r.scores).length > 0) {
      for (const [metric, score] of Object.entries(r.scores)) {
        const threshold = r.thresholds[metric];
        const met = threshold !== undefined ? (score >= threshold ? "ok" : "BELOW") : "";
        console.log(
          `  ${metric}: ${score.toFixed(3)}${threshold !== undefined ? ` (threshold: ${threshold})` : ""} ${met}`
        );
      }
    }

    if (r.details) {
      console.log(`  Details: ${r.details}`);
    }
    console.log();
  }

  // Summary
  console.log("=== SUMMARY ===");
  console.log(`Passed: ${suite.passedCount}/${suite.results.length}`);
  console.log(`Failed: ${suite.failedCount}/${suite.results.length}`);
  console.log(`Overall pass rate: ${(suite.overallPassRate * 100).toFixed(1)}%`);
  console.log(`Total duration: ${suite.totalDurationMs}ms`);

  // Exit with non-zero if any failed
  process.exit(suite.failedCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Suite runner crashed:", err);
  process.exit(2);
});
