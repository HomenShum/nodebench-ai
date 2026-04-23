/**
 * Run retention-focused evaluation suite
 * Usage: node scripts/run-retention-evals.mjs [ownerKey]
 */

import { execSync } from 'child_process';

const ownerKey = process.argv[2] || 'eval-test-user';

const args = JSON.stringify({ ownerKey });

const command = `npx convex run "domains/product/wikiDreamingEvaluationNatural:runRetentionEvaluationSuite" "${args.replace(/"/g, '\\"')}"`;

console.log('Running retention evaluation suite...');
console.log(`Owner: ${ownerKey}`);
console.log('');

try {
  const result = execSync(command, { 
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.log(result);
} catch (error) {
  console.error('Error running evaluation:', error.stderr || error.message);
  process.exit(1);
}
