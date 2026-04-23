#!/usr/bin/env node
/**
 * Dreaming Pipeline Volume Testing
 * 
 * Tests dreaming performance with light/medium/heavy data volumes
 * Usage: node scripts/test-dreaming-volumes.mjs
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VOLUMES = ['light', 'medium', 'heavy'];
const OWNER_KEY = 'dreaming-test-user';
const ENTITY_SLUG = 'openai';
const RESULTS = [];

console.log('🧪 Dreaming Pipeline Volume Test Suite\n');
console.log('=====================================\n');

for (const volume of VOLUMES) {
  console.log(`\n📦 Testing ${volume.toUpperCase()} volume...`);
  console.log('-'.repeat(40));

  // Step 1: Inject mock data
  console.log(`Injecting ${volume} mock data...`);
  try {
    const injectResult = execSync(
      `node scripts/inject-mock-wiki-data.mjs ${volume}`,
      { encoding: 'utf-8', cwd: join(__dirname, '..'), timeout: 180000 }
    );
    // Parse results from output
    const match = injectResult.match(/Total: (\d+)/);
    const count = match ? parseInt(match[1]) : 0;
    console.log(`✓ Injected ${count} documents`);
  } catch (e) {
    // Check if it partially succeeded
    const output = e.stdout || '';
    const match = output.match(/Total: (\d+)/);
    if (match) {
      console.log(`✓ Partially injected ${match[1]} documents`);
    } else {
      console.error(`✗ Injection failed: ${e.message.slice(0, 100)}`);
      RESULTS.push({ volume, status: 'injection_failed', error: e.message });
      continue;
    }
  }

  // Step 2: Run dreaming pipeline (with longer timeout)
  console.log('Running dreaming pipeline...');
  const startTime = Date.now();
  
  const args = JSON.stringify({
    ownerKey: OWNER_KEY,
    triggerSlug: ENTITY_SLUG,
    triggerPageType: 'company',
    triggerSignal: `volume_test_${volume}`
  });

  try {
    const result = execSync(
      `npx convex run "domains/product/wikiDreamingGraph:runDreamingPipeline" "${args.replace(/"/g, '\\"')}"`,
      { encoding: 'utf-8', cwd: join(__dirname, '..'), timeout: 300000 } // 5 min timeout
    );
    
    const duration = Date.now() - startTime;
    
    // Parse result
    const resultMatch = result.match(/\{[\s\S]*\}/);
    const parsed = resultMatch ? JSON.parse(resultMatch[0]) : null;
    
    console.log(`✓ Pipeline completed in ${(duration/1000).toFixed(1)}s`);
    console.log(`  Candidates: ${parsed?.candidates?.length || 0}`);
    console.log(`  Themes: ${parsed?.themes?.length || 0}`);
    console.log(`  Open Questions: ${parsed?.openQuestions?.length || 0}`);
    console.log(`  Token Usage: ${JSON.stringify(parsed?.tokenUsage || {})}`);
    
    RESULTS.push({
      volume,
      status: 'success',
      duration,
      candidates: parsed?.candidates?.length || 0,
      themes: parsed?.themes?.length || 0,
      openQuestions: parsed?.openQuestions?.length || 0,
      tokenUsage: parsed?.tokenUsage,
      error: parsed?.error
    });
    
  } catch (e) {
    const duration = Date.now() - startTime;
    const output = e.stdout || '';
    
    // Check if it actually succeeded but we timed out waiting
    if (output.includes('candidates') || output.includes('tokenUsage')) {
      const resultMatch = output.match(/\{[\s\S]*\}/);
      const parsed = resultMatch ? JSON.parse(resultMatch[0]) : null;
      
      console.log(`✓ Pipeline completed (detected in output, took >${(duration/1000).toFixed(0)}s)`);
      RESULTS.push({
        volume,
        status: 'success_timeout',
        duration,
        candidates: parsed?.candidates?.length || 0,
        themes: parsed?.themes?.length || 0,
        openQuestions: parsed?.openQuestions?.length || 0,
        tokenUsage: parsed?.tokenUsage
      });
    } else {
      console.error(`✗ Pipeline failed after ${(duration/1000).toFixed(1)}s`);
      RESULTS.push({ volume, status: 'failed', duration, error: e.message });
    }
  }
}

// Summary
console.log('\n\n📊 RESULTS SUMMARY');
console.log('='.repeat(60));

RESULTS.forEach(r => {
  console.log(`\n${r.volume.toUpperCase()} Volume:`);
  console.log(`  Status: ${r.status}`);
  if (r.duration) console.log(`  Duration: ${(r.duration/1000).toFixed(1)}s`);
  if (r.candidates !== undefined) console.log(`  Candidates: ${r.candidates}`);
  if (r.themes !== undefined) console.log(`  Themes: ${r.themes}`);
  if (r.openQuestions !== undefined) console.log(`  Open Questions: ${r.openQuestions}`);
  if (r.tokenUsage) {
    const total = (r.tokenUsage.input || 0) + (r.tokenUsage.output || 0);
    console.log(`  Tokens: ${total.toLocaleString()} (${r.tokenUsage.input?.toLocaleString() || 0} in, ${r.tokenUsage.output?.toLocaleString() || 0} out)`);
  }
  if (r.error) console.log(`  Error: ${r.error.slice(0, 100)}`);
});

// Save results
const fs = await import('fs');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputPath = join(__dirname, '..', '.tmp', `dreaming-volume-test-${timestamp}.json`);
fs.writeFileSync(outputPath, JSON.stringify(RESULTS, null, 2));
console.log(`\n💾 Results saved to: ${outputPath}`);
