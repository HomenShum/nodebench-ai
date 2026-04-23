const { execSync } = require('child_process');
const fs = require('fs');

const args = {
  ownerKey: process.argv[2] || 'eval-prod-user',
  runsPerScenario: parseInt(process.argv[3]) || 2
};

const jsonArgs = JSON.stringify(args);
const command = `npx convex run "domains/product/wikiDreamingEvalProduction:runFullBenchmark" '${jsonArgs}'`;

console.log('Running benchmark with args:', jsonArgs);

try {
  const result = execSync(command, { encoding: 'utf8' });
  console.log('\n=== BENCHMARK RESULTS ===\n');
  console.log(result);
} catch (error) {
  console.error('Error:', error.stderr || error.message);
  process.exit(1);
}
