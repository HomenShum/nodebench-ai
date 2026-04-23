/**
 * Run production-grade wiki dreaming benchmark
 * Usage: node scripts/run-production-benchmark.mjs [ownerKey] [runsPerScenario]
 */

import { execSync } from 'child_process';

const ownerKey = process.argv[2] || 'eval-benchmark-user';
const runsPerScenario = parseInt(process.argv[3]) || 3;

const args = JSON.stringify({ ownerKey, runsPerScenario });

const command = `npx convex run "domains/product/wikiDreamingEvalProduction:runFullBenchmark" "${args.replace(/"/g, '\\"')}"`;

console.log('═══════════════════════════════════════════════════════════');
console.log('  PRODUCTION WIKI DREAMING BENCHMARK');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Owner: ${ownerKey}`);
console.log(`Runs per scenario: ${runsPerScenario}`);
console.log('Evaluating: Continuity, Relevance, Understanding, Actionability');
console.log('Personas: Daily Driver, Continuation Seeker, Drifter, New User');
console.log('═══════════════════════════════════════════════════════════\n');

try {
  const result = execSync(command, { 
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  const parsed = JSON.parse(result);
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  BENCHMARK RESULTS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Run ID: ${parsed.runId}`);
  console.log(`Timestamp: ${new Date(parsed.timestamp).toISOString()}`);
  console.log('\n--- SUMMARY ---');
  console.log(`Total Scenarios: ${parsed.summary.totalScenarios}`);
  console.log(`Total Runs: ${parsed.summary.totalRuns}`);
  console.log(`Overall Retention Risk: ${parsed.summary.overallRetentionRisk}`);
  console.log(`Critical Failure Rate: ${(parsed.summary.criticalFailureRate * 100).toFixed(1)}%`);
  
  console.log('\n--- SCENARIO BREAKDOWN ---');
  parsed.scenarios.forEach((s, i) => {
    console.log(`\n[${i+1}] ${s.scenarioId}`);
    console.log(`    Persona: ${s.persona}`);
    console.log(`    Gap: ${s.gapDuration}`);
    console.log(`    Runs: ${s.runs.length}`);
    console.log(`    Verdict Distribution:`);
    console.log(`      Continuity: ${JSON.stringify(s.statistics.continuityDistribution)}`);
    console.log(`      Relevance: ${JSON.stringify(s.statistics.relevanceDistribution)}`);
    console.log(`      Retention Risk: ${JSON.stringify(s.statistics.retentionRiskDistribution)}`);
    console.log(`    Mean Confidence: ${s.statistics.meanConfidence.toFixed(2)}`);
    console.log(`    Variance: ${s.statistics.variance.toFixed(4)}`);
    console.log(`    Std Dev: ${s.statistics.stdDev.toFixed(4)}`);
  });
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
  
} catch (error) {
  console.error('Error running benchmark:', error.stderr || error.message);
  process.exit(1);
}
