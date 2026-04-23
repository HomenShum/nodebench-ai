import { execSync } from 'child_process';

const ownerKey = process.argv[2] || 'eval-prod-user';
const runsPerScenario = parseInt(process.argv[3]) || 2;

const args = JSON.stringify({ ownerKey, runsPerScenario });
const command = `npx convex run "domains/product/wikiDreamingEvalProduction:runFullBenchmark" '${args}'`;

console.log('Running benchmark with args:', args);

try {
  const result = execSync(command, { encoding: 'utf8' });
  console.log('\n=== BENCHMARK RESULTS ===\n');
  console.log(result);
} catch (error) {
  console.error('Error:', error.stderr || error.message);
  process.exit(1);
}
