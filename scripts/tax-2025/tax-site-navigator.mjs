#!/usr/bin/env node
/**
 * Tax Site Navigator — Opens real browsers, navigates to tax document pages.
 * You handle login/2FA, script handles navigation + downloads.
 *
 * Usage: node scripts/tax-2025/tax-site-navigator.mjs [site]
 *   Sites: chase, schwab, etrade, webull, keeper, all
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOWNLOAD_DIR = path.join('C:', 'Users', 'hshum', 'Downloads', '2025-Tax-Bundle');
const USER_DATA_DIR = path.join(__dirname, '.browser-profile');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function launchBrowser() {
  // Use persistent context so logins are remembered across runs
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1400, height: 900 },
    acceptDownloads: true,
    args: ['--start-maximized'],
  });
  return context;
}

// ──────────────────────────────────────────────────
// CHASE
// ──────────────────────────────────────────────────
async function navigateChase(context) {
  console.log('\n' + '='.repeat(60));
  console.log('  CHASE BANK — Statements & Tax Documents');
  console.log('='.repeat(60));

  const page = await context.newPage();

  // Step 1: Go to Chase login
  console.log('\n[1/5] Opening Chase login...');
  await page.goto('https://www.chase.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await ask('\n  >>> Log into Chase, then press ENTER here <<<');

  // Step 2: Navigate to Statements & Documents
  console.log('[2/5] Navigating to Statements...');
  try {
    // Try direct URL to statements
    await page.goto('https://secure.chase.com/web/auth/dashboard#/dashboard/documents/paperless/index', { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch {
    try {
      await page.goto('https://secure.chase.com/web/auth/dashboard#/dashboard/documents', { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch {
      console.log('  Direct nav failed — try clicking "Statements" in the menu');
    }
  }
  await page.waitForTimeout(3000);

  await ask('\n  >>> You should see Statements page. Press ENTER to continue <<<');

  // Step 3: Try to find Tax Documents section
  console.log('[3/5] Looking for Tax Documents section...');
  try {
    await page.goto('https://secure.chase.com/web/auth/dashboard#/dashboard/documents/tax/index', { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch {
    console.log('  Trying alternative tax documents URL...');
    try {
      await page.goto('https://secure.chase.com/web/auth/dashboard#/dashboard/documents/tax', { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch {
      console.log('  Direct nav failed — look for "Tax documents" tab on the page');
    }
  }
  await page.waitForTimeout(3000);

  console.log('\n  ACTION NEEDED:');
  console.log('  1. Click "Tax documents" tab if not already there');
  console.log('  2. Download any 1099-INT forms for 2025');
  console.log('  3. Then click "Statements" tab');
  console.log('  4. For EACH account, download the December 2025 statement');
  console.log('  5. Also look for "Year in Review" or "Annual Summary"');

  await ask('\n  >>> Download all needed docs, then press ENTER <<<');

  // Step 4: Try credit card year-end summaries
  console.log('[4/5] Checking for credit card annual summaries...');
  console.log('  TIP: Each credit card statement page may have a "Year-end summary" link');
  console.log('  Check: Sapphire Preferred, Freedom Flex, Freedom Unlimited');

  await ask('\n  >>> Download any year-end summaries, then press ENTER <<<');

  // Step 5: Screenshot for records
  console.log('[5/5] Taking screenshot for records...');
  await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'chase-statements-screenshot.png'), fullPage: false });
  console.log('  Screenshot saved to Downloads/2025-Tax-Bundle/');

  console.log('\n  CHASE COMPLETE');
  return page;
}

// ──────────────────────────────────────────────────
// SCHWAB
// ──────────────────────────────────────────────────
async function navigateSchwab(context) {
  console.log('\n' + '='.repeat(60));
  console.log('  CHARLES SCHWAB — 1099-B, 1099-R, 1099-DIV');
  console.log('='.repeat(60));

  const page = await context.newPage();

  console.log('\n[1/3] Opening Schwab login...');
  await page.goto('https://www.schwab.com/client-home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await ask('\n  >>> Log into Schwab, then press ENTER <<<');

  console.log('[2/3] Navigating to Tax Center...');
  try {
    await page.goto('https://client.schwab.com/app/accounts/tax-documents', { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch {
    try {
      await page.goto('https://client.schwab.com/app/accounts/taxcenter', { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch {
      console.log('  Direct nav failed — look for "Tax Center" or "Tax Documents" in menu');
      console.log('  Try: Accounts > Statements > Tax Documents');
    }
  }
  await page.waitForTimeout(3000);

  console.log('\n  ACTION NEEDED:');
  console.log('  1. Select tax year 2025');
  console.log('  2. Download ALL tax forms:');
  console.log('     - 1099-B (Proceeds from broker transactions)');
  console.log('     - 1099-R (Retirement distributions) — email said this was available Jan 15');
  console.log('     - 1099-DIV (Dividends) if applicable');
  console.log('     - 1099-INT (Interest) if applicable');
  console.log('     - Consolidated 1099 (has everything in one PDF)');

  await ask('\n  >>> Download all tax forms, then press ENTER <<<');

  console.log('[3/3] Screenshot...');
  await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'schwab-tax-screenshot.png'), fullPage: false });
  console.log('\n  SCHWAB COMPLETE');
  return page;
}

// ──────────────────────────────────────────────────
// E*TRADE
// ──────────────────────────────────────────────────
async function navigateEtrade(context) {
  console.log('\n' + '='.repeat(60));
  console.log('  E*TRADE (Morgan Stanley) — 1099-B');
  console.log('='.repeat(60));

  const page = await context.newPage();

  console.log('\n[1/3] Opening E*TRADE login...');
  await page.goto('https://us.etrade.com/etx/sp/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await ask('\n  >>> Log into E*TRADE, then press ENTER <<<');

  console.log('[2/3] Navigating to Tax Center...');
  try {
    await page.goto('https://us.etrade.com/etx/tax/tax-center', { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch {
    try {
      await page.goto('https://edoc.etrade.com/e/t/onlinedocs/docsearch?doc_type=tax', { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch {
      console.log('  Direct nav failed — look for "Tax Center" under Accounts menu');
    }
  }
  await page.waitForTimeout(3000);

  console.log('\n  ACTION NEEDED:');
  console.log('  1. Select tax year 2025');
  console.log('  2. Download Consolidated 1099');
  console.log('  3. Check for any supplemental tax documents');

  await ask('\n  >>> Download all tax forms, then press ENTER <<<');

  console.log('[3/3] Screenshot...');
  await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'etrade-tax-screenshot.png'), fullPage: false });
  console.log('\n  E*TRADE COMPLETE');
  return page;
}

// ──────────────────────────────────────────────────
// WEBULL
// ──────────────────────────────────────────────────
async function navigateWebull(context) {
  console.log('\n' + '='.repeat(60));
  console.log('  WEBULL — 1099-B, Tax Documents');
  console.log('='.repeat(60));

  const page = await context.newPage();

  console.log('\n[1/3] Opening Webull login...');
  await page.goto('https://www.webull.com/account', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await ask('\n  >>> Log into Webull, then press ENTER <<<');

  console.log('[2/3] Navigating to Tax Documents...');
  try {
    await page.goto('https://www.webull.com/account/tax-documents', { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch {
    try {
      await page.goto('https://www.webull.com/account/statements', { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch {
      console.log('  Direct nav failed — look for Tax Documents in account settings');
    }
  }
  await page.waitForTimeout(3000);

  console.log('\n  ACTION NEEDED:');
  console.log('  1. Find Tax Documents or Statements section');
  console.log('  2. Download 1099 Consolidated form for 2025');

  await ask('\n  >>> Download tax forms, then press ENTER <<<');

  console.log('[3/3] Screenshot...');
  await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'webull-tax-screenshot.png'), fullPage: false });
  console.log('\n  WEBULL COMPLETE');
  return page;
}

// ──────────────────────────────────────────────────
// KEEPER TAX
// ──────────────────────────────────────────────────
async function navigateKeeper(context) {
  console.log('\n' + '='.repeat(60));
  console.log('  KEEPER TAX — Prior Year Returns (2023 + 2024)');
  console.log('='.repeat(60));

  const page = await context.newPage();

  console.log('\n[1/3] Opening Keeper Tax...');
  await page.goto('https://www.keepertax.com/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await ask('\n  >>> Log into Keeper Tax, then press ENTER <<<');

  console.log('[2/3] Navigate to your tax returns...');
  try {
    await page.goto('https://www.keepertax.com/tax-filing', { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch {
    try {
      await page.goto('https://www.keepertax.com/returns', { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch {
      console.log('  Direct nav failed — look for "Tax Filing" or "Returns" in the menu');
    }
  }
  await page.waitForTimeout(3000);

  console.log('\n  ACTION NEEDED:');
  console.log('  1. Find your 2023 tax return — download PDF');
  console.log('  2. Find your 2024 tax return — download PDF');
  console.log('  3. Check for any "Write-offs" or "Deductions" summary');
  console.log('  4. Download the deductions tracker if available');
  console.log('  TIP: Your accountant needs the prior year return for reference');

  await ask('\n  >>> Download both returns, then press ENTER <<<');

  console.log('[3/3] Screenshot...');
  await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'keeper-tax-screenshot.png'), fullPage: false });
  console.log('\n  KEEPER TAX COMPLETE');
  return page;
}

// ──────────────────────────────────────────────────
// TURBOTAX (W-2 import)
// ──────────────────────────────────────────────────
async function navigateTurbotax(context) {
  console.log('\n' + '='.repeat(60));
  console.log('  TURBOTAX — W-2 Download');
  console.log('='.repeat(60));

  const page = await context.newPage();

  console.log('\n[1/3] Opening TurboTax...');
  await page.goto('https://myturbotax.intuit.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await ask('\n  >>> Log into TurboTax/Intuit, then press ENTER <<<');

  console.log('[2/3] Looking for W-2 documents...');
  console.log('\n  ACTION NEEDED:');
  console.log('  1. TurboTax emails said "Your W-2 is available"');
  console.log('  2. Look for "Documents" or "Tax Documents" section');
  console.log('  3. Download your W-2 form for 2025');
  console.log('  4. If W-2 is not here, check your employer\'s HR portal instead');

  await ask('\n  >>> Download W-2 if available, then press ENTER <<<');

  console.log('[3/3] Screenshot...');
  await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'turbotax-screenshot.png'), fullPage: false });
  console.log('\n  TURBOTAX COMPLETE');
  return page;
}

// ──────────────────────────────────────────────────
// NELNET (Student Loan Interest 1098-E)
// ──────────────────────────────────────────────────
async function navigateNelnet(context) {
  console.log('\n' + '='.repeat(60));
  console.log('  NELNET — Student Loan Interest (1098-E)');
  console.log('='.repeat(60));

  const page = await context.newPage();

  console.log('\n[1/3] Opening Nelnet...');
  await page.goto('https://www.nelnet.com/welcome', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await ask('\n  >>> Log into Nelnet, then press ENTER <<<');

  console.log('[2/3] Looking for tax documents...');
  console.log('\n  ACTION NEEDED:');
  console.log('  1. Gmail showed "IMPORTANT TAX RETURN DOCUMENT AVAILABLE" from Nelnet');
  console.log('  2. Look for Tax Documents or 1098-E section');
  console.log('  3. Download 1098-E for 2025 (student loan interest — deductible up to $2,500!)');

  await ask('\n  >>> Download 1098-E, then press ENTER <<<');

  console.log('[3/3] Screenshot...');
  await page.screenshot({ path: path.join(DOWNLOAD_DIR, 'nelnet-screenshot.png'), fullPage: false });
  console.log('\n  NELNET COMPLETE');
  return page;
}

// ──────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────

const SITES = {
  chase: navigateChase,
  schwab: navigateSchwab,
  etrade: navigateEtrade,
  webull: navigateWebull,
  keeper: navigateKeeper,
  turbotax: navigateTurbotax,
  nelnet: navigateNelnet,
};

async function main() {
  const arg = process.argv[2] || 'all';

  console.log('='.repeat(60));
  console.log('  Tax Document Site Navigator');
  console.log('  Downloads → C:\\Users\\hshum\\Downloads\\2025-Tax-Bundle\\');
  console.log('='.repeat(60));
  console.log();
  console.log('  A real Chrome browser will open.');
  console.log('  YOU handle login + 2FA. I handle navigation.');
  console.log('  Downloads go to your existing tax bundle folder.');
  console.log();

  await fs.mkdir(DOWNLOAD_DIR, { recursive: true });

  const context = await launchBrowser();

  if (arg === 'all') {
    const order = ['keeper', 'chase', 'schwab', 'etrade', 'webull', 'turbotax', 'nelnet'];
    console.log(`  Running ALL ${order.length} sites: ${order.join(', ')}`);
    console.log();
    for (const site of order) {
      try {
        await SITES[site](context);
      } catch (err) {
        console.log(`\n  [ERROR] ${site} failed: ${err.message}`);
        const skip = await ask(`  Skip ${site} and continue? (y/n): `);
        if (skip.toLowerCase() !== 'y') break;
      }
    }
  } else if (SITES[arg]) {
    await SITES[arg](context);
  } else {
    console.error(`  Unknown site: ${arg}`);
    console.error(`  Available: ${Object.keys(SITES).join(', ')}, all`);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('  ALL SITES COMPLETE');
  console.log('='.repeat(60));
  console.log(`\n  Documents saved to: ${DOWNLOAD_DIR}`);
  console.log('  Screenshots taken for each site.');
  console.log();

  const close = await ask('  Close browser? (y/n): ');
  if (close.toLowerCase() === 'y') {
    await context.close();
  } else {
    console.log('  Browser left open. Close manually when done.');
    // Keep process alive
    await new Promise(() => {});
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
