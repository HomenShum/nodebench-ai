#!/usr/bin/env tsx
/**
 * Check E2E Test Prerequisites
 *
 * Verifies that all required services are running before executing E2E tests.
 */

import * as http from 'http';
import { existsSync, readFileSync } from 'fs';

interface PrerequisiteCheck {
  name: string;
  check: () => Promise<boolean>;
  required: boolean;
  help: string;
}

function httpGetText(url: string, timeoutMs: number): Promise<{ ok: boolean; status?: number; text?: string }> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ ok: res.statusCode === 200, status: res.statusCode, text: data }));
    });
    req.on('error', () => resolve({ ok: false }));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ ok: false });
    });
  });
}

function hasConvexUrlConfigured(): boolean {
  if (process.env.VITE_CONVEX_URL && process.env.VITE_CONVEX_URL.trim().length > 0) return true;

  if (!existsSync('.env.local')) return false;
  const raw = readFileSync('.env.local', 'utf8');
  const match = raw.match(/^\s*VITE_CONVEX_URL\s*=\s*("?)(.+?)\1\s*$/m);
  return !!match?.[2]?.trim();
}

const checks: PrerequisiteCheck[] = [
  {
    name: 'Frontend Dev Server',
    check: async () => {
      const res = await httpGetText('http://localhost:5173', 2000);
      return res.ok;
    },
    required: true,
    help: 'Run: npm run dev'
  },
  {
    name: 'Convex Config (VITE_CONVEX_URL)',
    check: async () => {
      return hasConvexUrlConfigured();
    },
    required: true,
    help: 'Set VITE_CONVEX_URL in .env.local, then restart dev server'
  },
];

async function checkPrerequisites() {
  console.log('🔍 Checking E2E Test Prerequisites...\n');

  let allPassed = true;
  const results: Array<{ name: string; passed: boolean; required: boolean; help: string }> = [];

  for (const check of checks) {
    process.stdout.write(`Checking ${check.name}... `);
    const passed = await check.check();

    results.push({
      name: check.name,
      passed,
      required: check.required,
      help: check.help
    });

    if (passed) {
      console.log('✅');
    } else {
      console.log(check.required ? '❌' : '⚠️');
      if (check.required) {
        allPassed = false;
      }
    }
  }

  console.log('\n' + '='.repeat(60));

  if (allPassed) {
    console.log('✅ All prerequisites met! Ready to run E2E tests.\n');
    console.log('Run tests with:');
    console.log('  npm run test:e2e:headed    (see browser)');
    console.log('  npm run test:e2e          (headless)');
    console.log('  npm run test:e2e:ui       (interactive UI)\n');
    process.exit(0);
  } else {
    console.log('❌ Some prerequisites are missing:\n');

    const failed = results.filter(r => !r.passed && r.required);
    failed.forEach(f => {
      console.log(`  ${f.name}:`);
      console.log(`    ${f.help}\n`);
    });

    console.log('Setup instructions:');
    console.log('\nTerminal 1:');
    console.log('  npx convex dev');
    console.log('\nTerminal 2:');
    console.log('  npm run dev');
    console.log('\nTerminal 3 (after both are running):');
    console.log('  npm run test:e2e:headed\n');

    process.exit(1);
  }
}

checkPrerequisites().catch((error) => {
  console.error('Error checking prerequisites:', error);
  process.exit(1);
});
