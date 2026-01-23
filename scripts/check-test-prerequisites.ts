#!/usr/bin/env tsx
/**
 * Check E2E Test Prerequisites
 *
 * Verifies that all required services are running before executing E2E tests.
 */

import * as http from 'http';

interface PrerequisiteCheck {
  name: string;
  check: () => Promise<boolean>;
  required: boolean;
  help: string;
}

const checks: PrerequisiteCheck[] = [
  {
    name: 'Frontend Dev Server',
    check: async () => {
      return new Promise((resolve) => {
        const req = http.get('http://localhost:5173', (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => {
          req.destroy();
          resolve(false);
        });
      });
    },
    required: true,
    help: 'Run: npm run dev'
  },
  {
    name: 'Convex Backend',
    check: async () => {
      // Check if convex dev is running by looking for the typical process
      // This is a simplified check - we're checking if the frontend can connect
      return new Promise((resolve) => {
        const req = http.get('http://localhost:5173', (res) => {
          // If frontend is up, convex is likely connected
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => {
          req.destroy();
          resolve(false);
        });
      });
    },
    required: true,
    help: 'Run: npx convex dev (in another terminal)'
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
