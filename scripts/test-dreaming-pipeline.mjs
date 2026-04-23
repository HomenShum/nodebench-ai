import { execSync } from 'child_process';

// Test the dreaming pipeline action
const args = JSON.stringify({ 
  ownerKey: "test-verify", 
  triggerSlug: "test-company",
  triggerPageType: "company",
  triggerSignal: "manual_test"
});

const command = `npx convex run "domains/product/wikiDreamingGraph:runDreamingPipeline" "${args.replace(/"/g, '\\"')}"`;

console.log('Testing dreaming pipeline...');
console.log('Command:', command);

try {
  const result = execSync(command, { encoding: 'utf8', cwd: 'd:\\VSCode Projects\\cafecorner_nodebench\\nodebench_ai4\\nodebench-ai', timeout: 120000 });
  console.log('✓ Dreaming pipeline result:', result);
} catch (e) {
  console.error('✗ Error:', e.stderr || e.message);
  process.exit(1);
}
