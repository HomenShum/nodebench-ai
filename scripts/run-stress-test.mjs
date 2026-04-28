// scripts/run-stress-test.mjs
// Run with: node scripts/run-stress-test.mjs

import { execSync } from 'child_process';

const runId = `stress-test-${Date.now()}`;
const args = JSON.stringify({ runId });

console.log(`Running stress test with runId: ${runId}`);
console.log(`Args: ${args}`);

try {
  const result = execSync(`npx convex run lib/artifactPersistence:stressArtifacts '${args}'`, {
    cwd: process.cwd(),
    encoding: 'utf-8',
    stdio: 'inherit',
  });
} catch (err) {
  console.error('Stress test failed:', err.message);
  process.exit(1);
}
