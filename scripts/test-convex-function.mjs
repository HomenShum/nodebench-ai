import { execSync } from 'child_process';

const args = JSON.stringify({ ownerKey: "test-verify", limit: 5 });
const command = `npx convex run "domains/product/userWikiMaintainer:listPagesForOwner" "${args.replace(/"/g, '\\"')}"`;

console.log('Running:', command);
try {
  const result = execSync(command, { encoding: 'utf8', cwd: 'd:\\VSCode Projects\\cafecorner_nodebench\\nodebench_ai4\\nodebench-ai' });
  console.log('Result:', result);
} catch (e) {
  console.error('Error:', e.stderr || e.message);
}
