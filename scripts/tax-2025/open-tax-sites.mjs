#!/usr/bin/env node
/**
 * Opens all tax document sites as tabs in one browser window.
 * No interactive prompts — just opens everything, you log in and download.
 *
 * Usage: node scripts/tax-2025/open-tax-sites.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = path.join(__dirname, '.browser-profile');

const SITES = [
  {
    name: 'Keeper Tax (2023+2024 returns)',
    url: 'https://www.keepertax.com/login',
    instructions: 'Log in → Tax Filing → Download 2023 + 2024 returns as PDF',
  },
  {
    name: 'Chase (Statements + Tax Docs)',
    url: 'https://www.chase.com/',
    instructions: 'Log in → Menu → Statements & Documents → Tax Documents tab → Download 1099-INT, Dec statement, Year-End Summary',
  },
  {
    name: 'Schwab (1099-B, 1099-R, 1099-DIV)',
    url: 'https://www.schwab.com/client-home',
    instructions: 'Log in → Accounts → Tax Center → Download Consolidated 1099 for 2025',
  },
  {
    name: 'E*TRADE (Consolidated 1099)',
    url: 'https://us.etrade.com/etx/sp/login',
    instructions: 'Log in → Accounts → Tax Center → Download Consolidated 1099 for 2025',
  },
  {
    name: 'Webull (1099)',
    url: 'https://www.webull.com/account',
    instructions: 'Log in → Account → Tax Documents → Download 1099 for 2025',
  },
  {
    name: 'TurboTax (W-2)',
    url: 'https://myturbotax.intuit.com/',
    instructions: 'Log in → Documents → Download W-2 for 2025 (emails said "Your W-2 is available")',
  },
  {
    name: 'Nelnet (1098-E Student Loan Interest)',
    url: 'https://www.nelnet.com/welcome',
    instructions: 'Log in → Tax Documents → Download 1098-E for 2025 (up to $2,500 deduction!)',
  },
];

async function main() {
  console.log('='.repeat(60));
  console.log('  Opening 7 tax sites in Chrome tabs');
  console.log('='.repeat(60));
  console.log();

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1400, height: 900 },
    acceptDownloads: true,
    args: ['--start-maximized'],
  });

  // Open instruction page first
  const instructionHtml = `<!DOCTYPE html><html><head><title>Tax Document Checklist</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; background: #1a1a1a; color: #e0e0e0; }
  h1 { color: #d97757; border-bottom: 2px solid #d97757; padding-bottom: 10px; }
  .site { background: #252525; border: 1px solid #333; border-radius: 8px; padding: 16px; margin: 12px 0; }
  .site h3 { color: #d97757; margin: 0 0 8px 0; }
  .site .instructions { color: #aaa; font-size: 14px; }
  .done { opacity: 0.5; }
  input[type="checkbox"] { transform: scale(1.3); margin-right: 8px; cursor: pointer; }
  label { cursor: pointer; }
  .tab-num { background: #d97757; color: white; border-radius: 4px; padding: 2px 8px; font-size: 12px; font-weight: bold; }
  .summary { background: #2a2015; border: 2px solid #d97757; border-radius: 8px; padding: 20px; margin: 20px 0; }
</style></head><body>
  <h1>2025 Tax Document Download Checklist</h1>
  <div class="summary">
    <strong>Instructions:</strong> Each site is open in a separate tab (tabs 2-8). Log into each one, download the documents listed below, then check the box. Save downloads to <code>C:\\Users\\hshum\\Downloads\\2025-Tax-Bundle\\</code>
  </div>
  ${SITES.map((s, i) => `
  <div class="site" id="site-${i}">
    <label>
      <input type="checkbox" onchange="this.closest('.site').classList.toggle('done')">
      <span class="tab-num">Tab ${i + 2}</span>
      <h3 style="display:inline">${s.name}</h3>
    </label>
    <div class="instructions">${s.instructions}</div>
  </div>`).join('')}

  <div class="summary" style="margin-top: 30px;">
    <h3 style="color: #d97757; margin-top: 0;">After downloading everything:</h3>
    <p>All files should be in <code>C:\\Users\\hshum\\Downloads\\2025-Tax-Bundle\\</code></p>
    <p>Move brokerage 1099s into <code>01-Income/1099s/</code></p>
    <p>Move Keeper returns into <code>05-General-Tax/</code></p>
    <p>Move W-2 into <code>01-Income/W2s/</code></p>
    <p>Move 1098-E into <code>02-Deductions/Education/</code></p>
    <p>Move Chase statements into <code>13-Banking/</code></p>
    <p>Then zip the whole folder and send to the accountant!</p>
  </div>
</body></html>`;

  const instructionPath = path.join(__dirname, '.tax-checklist.html');
  await fs.writeFile(instructionPath, instructionHtml);

  // Open instruction page in first tab
  const firstPage = context.pages()[0] || await context.newPage();
  await firstPage.goto(`file://${instructionPath}`);

  // Open each site in a new tab
  for (let i = 0; i < SITES.length; i++) {
    const s = SITES[i];
    console.log(`  [Tab ${i + 2}] ${s.name} → ${s.url}`);
    const page = await context.newPage();
    try {
      await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (err) {
      console.log(`    WARNING: ${err.message} — tab still open, try manually`);
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('  ALL 7 SITES OPENED');
  console.log('='.repeat(60));
  console.log();
  console.log('  Tab 1: Checklist (instructions for each site)');
  SITES.forEach((s, i) => console.log(`  Tab ${i + 2}: ${s.name}`));
  console.log();
  console.log('  Log into each tab, download the documents.');
  console.log('  Check the boxes on Tab 1 as you complete each.');
  console.log('  Browser stays open until you close it.');
  console.log();

  // Keep process alive so browser doesn't close
  await new Promise(() => {});
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
