#!/usr/bin/env node
/**
 * Form 4868 Extension Filer — Automated via Playwright
 *
 * Uses FreeTaxUSA free extension filing (no account required).
 * Pre-fills all known fields. Pauses for SSN entry.
 *
 * Taxpayer: Homen Shum
 * Filing status: Single
 * Estimated tax liability: $0 (Scenario D)
 * Balance due: $0
 * Payment: $0
 */

import { chromium } from 'playwright';

const TAXPAYER = {
  firstName: 'Homen',
  lastName: 'Shum',
  address: '4875 Mowry Avenue Apt 142',
  city: 'Fremont',
  state: 'CA',
  zip: '94538',
  estimatedTax: '0',    // Line 4: estimated total tax liability
  payments: '0',         // Line 5: total 2025 payments
  balance: '0',          // Line 6: balance due (4 minus 5)
  payment: '0',          // Line 7: payment with extension
};

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Form 4868 Extension Filer — Opening browser...');
  console.log('='.repeat(60));
  console.log('  Taxpayer: Homen Shum');
  console.log('  Address: 4875 Mowry Avenue Apt 142, Fremont CA 94538');
  console.log('  Estimated tax: $0  |  Balance due: $0  |  Payment: $0');
  console.log();

  const browser = await chromium.launch({
    headless: false,
    channel: undefined,  // use installed Playwright Chromium
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  // ── Navigate to FreeTaxUSA extension filing ──────────────────────────────
  console.log('  Navigating to FreeTaxUSA extension filing...');
  await page.goto('https://www.freetaxusa.com/extension', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await delay(2000);

  // Check current URL and page title
  const url = page.url();
  const title = await page.title();
  console.log(`  Landed: ${title}`);
  console.log(`  URL: ${url}`);

  // If redirected to main page, look for extension link
  if (!url.includes('extension')) {
    console.log('  Looking for extension filing option...');

    // Try to find "Extension" link on the page
    const extLink = await page.$('a:has-text("Extension")') ||
                    await page.$('a:has-text("extension")') ||
                    await page.$('[href*="extension"]');
    if (extLink) {
      await extLink.click();
      await page.waitForLoadState('domcontentloaded');
      await delay(2000);
      console.log(`  Clicked extension link. Now at: ${page.url()}`);
    }
  }

  // ── Inject overlay with instructions and pre-filled values ──────────────
  await page.evaluate((data) => {
    // Create a beautiful overlay with all the information and instructions
    const overlay = document.createElement('div');
    overlay.id = 'tax-helper-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 380px;
      background: #1a1a2e;
      border: 2px solid #d97757;
      border-radius: 12px;
      padding: 20px;
      z-index: 999999;
      font-family: -apple-system, sans-serif;
      color: white;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;
    overlay.innerHTML = `
      <div style="font-size: 14px; font-weight: 700; color: #d97757; margin-bottom: 12px;">
        📋 Form 4868 — Auto-Fill Assistant
      </div>
      <div style="font-size: 12px; color: #aaa; margin-bottom: 12px;">
        Pre-filled values ready. Use these when prompted:
      </div>
      <table style="font-size: 12px; width: 100%; border-collapse: collapse;">
        <tr><td style="color:#888; padding: 3px 0;">First Name</td><td style="color:#fff; font-weight:600;">${data.firstName}</td></tr>
        <tr><td style="color:#888; padding: 3px 0;">Last Name</td><td style="color:#fff; font-weight:600;">${data.lastName}</td></tr>
        <tr><td style="color:#888; padding: 3px 0;">Address</td><td style="color:#fff; font-weight:600;">${data.address}</td></tr>
        <tr><td style="color:#888; padding: 3px 0;">City</td><td style="color:#fff; font-weight:600;">${data.city}</td></tr>
        <tr><td style="color:#888; padding: 3px 0;">State</td><td style="color:#fff; font-weight:600;">${data.state}</td></tr>
        <tr><td style="color:#888; padding: 3px 0;">ZIP</td><td style="color:#fff; font-weight:600;">${data.zip}</td></tr>
        <tr><td style="color:#888; padding: 3px 0;">Est. Tax Liability</td><td style="color:#4ade80; font-weight:600;">$0</td></tr>
        <tr><td style="color:#888; padding: 3px 0;">2025 Payments</td><td style="color:#4ade80; font-weight:600;">$0</td></tr>
        <tr><td style="color:#888; padding: 3px 0;">Balance Due</td><td style="color:#4ade80; font-weight:600;">$0</td></tr>
        <tr><td style="color:#888; padding: 3px 0;">Payment w/ Extension</td><td style="color:#4ade80; font-weight:600;">$0</td></tr>
      </table>
      <div style="margin-top: 14px; padding: 10px; background: rgba(217,119,87,0.15); border-radius: 8px; border: 1px solid #d97757;">
        <div style="font-size: 12px; color: #d97757; font-weight: 700;">⚡ SSN NEEDED</div>
        <div style="font-size: 12px; color: #ddd; margin-top: 4px;">
          Please type your Social Security Number when the form asks for it.<br>
          Format: XXX-XX-9897
        </div>
      </div>
      <div style="margin-top: 10px; font-size: 11px; color: #666;">
        Filing for: Tax Year 2025 | Due: April 15, 2026<br>
        Extension grants 6 months → October 15, 2026
      </div>
    `;
    document.body.appendChild(overlay);
  }, TAXPAYER);

  console.log();
  console.log('  ✅ Browser opened with pre-fill assistant panel (top-right corner)');
  console.log();
  console.log('  📋 WHAT TO DO NOW:');
  console.log('  ─'.repeat(40));
  console.log();
  console.log('  If FreeTaxUSA asks you to create an account:');
  console.log('  → Look for "File Extension Only" or "Free Extension" option');
  console.log('  → Or skip directly to: https://www.irs.gov/filing/free-file-do-your-federal-taxes-for-free');
  console.log();
  console.log('  FILL THESE VALUES:');
  console.log(`  • First Name: ${TAXPAYER.firstName}`);
  console.log(`  • Last Name: ${TAXPAYER.lastName}`);
  console.log(`  • SSN: [YOUR SSN — ends in 9897]  ← ONLY FIELD YOU TYPE`);
  console.log(`  • Address: ${TAXPAYER.address}`);
  console.log(`  • City: ${TAXPAYER.city}, State: ${TAXPAYER.state}, ZIP: ${TAXPAYER.zip}`);
  console.log(`  • Line 4 (Estimated Tax): 0`);
  console.log(`  • Line 5 (2025 Payments): 0`);
  console.log(`  • Line 6 (Balance Due): 0`);
  console.log(`  • Line 7 (Payment): 0`);
  console.log();

  // ── Try to auto-fill if form fields exist ───────────────────────────────
  await delay(3000);

  // Try to fill common form field selectors used by FreeTaxUSA / IRS forms
  const fieldAttempts = [
    { selectors: ['#firstName', '[name="firstName"]', '[name="first_name"]', 'input[placeholder*="First"]'], value: TAXPAYER.firstName },
    { selectors: ['#lastName', '[name="lastName"]', '[name="last_name"]', 'input[placeholder*="Last"]'], value: TAXPAYER.lastName },
    { selectors: ['#address', '[name="address"]', 'input[placeholder*="Address"]', 'input[placeholder*="Street"]'], value: TAXPAYER.address },
    { selectors: ['#city', '[name="city"]', 'input[placeholder*="City"]'], value: TAXPAYER.city },
    { selectors: ['#zip', '[name="zip"]', '[name="zipCode"]', 'input[placeholder*="ZIP"]'], value: TAXPAYER.zip },
  ];

  let filled = 0;
  for (const attempt of fieldAttempts) {
    for (const sel of attempt.selectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await el.fill(attempt.value);
          filled++;
          break;
        }
      } catch {}
    }
  }

  if (filled > 0) {
    console.log(`  ✅ Auto-filled ${filled} form fields`);
  } else {
    console.log('  ℹ️  Form fields not found for auto-fill — use the values in the orange panel on screen');
  }

  // ── Navigate to IRS Free File Fillable Forms as backup ───────────────────
  console.log();
  console.log('  Opening IRS Free File Fillable Forms as alternative tab...');
  const irsPage = await context.newPage();
  await irsPage.goto('https://www.irs.gov/e-file-providers/free-file-fillable-forms', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  // Inject the same helper overlay
  await irsPage.evaluate((data) => {
    const overlay = document.createElement('div');
    overlay.id = 'tax-helper-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 380px;
      background: #1a1a2e;
      border: 2px solid #d97757;
      border-radius: 12px;
      padding: 20px;
      z-index: 999999;
      font-family: -apple-system, sans-serif;
      color: white;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;
    overlay.innerHTML = `
      <div style="font-size: 14px; font-weight: 700; color: #d97757; margin-bottom: 8px;">
        📋 IRS Free File Fillable Forms
      </div>
      <div style="font-size: 12px; color: #ccc; margin-bottom: 10px;">
        Step 1: Click "Start Free File Fillable Forms"<br>
        Step 2: Create free IRS account (takes 2 min)<br>
        Step 3: Select Form 4868<br>
        Step 4: Use values below:
      </div>
      <table style="font-size: 12px; width: 100%; border-collapse: collapse;">
        <tr><td style="color:#888; padding:2px 0;">Name</td><td style="color:#fff; font-weight:600;">Homen Shum</td></tr>
        <tr><td style="color:#888; padding:2px 0;">Address</td><td style="color:#fff; font-weight:600;">4875 Mowry Ave Apt 142</td></tr>
        <tr><td style="color:#888; padding:2px 0;">City/State/ZIP</td><td style="color:#fff; font-weight:600;">Fremont CA 94538</td></tr>
        <tr><td style="color:#888; padding:2px 0;">Line 4</td><td style="color:#4ade80; font-weight:600;">0 (est. tax = $0)</td></tr>
        <tr><td style="color:#888; padding:2px 0;">Line 5</td><td style="color:#4ade80; font-weight:600;">0 (payments = $0)</td></tr>
        <tr><td style="color:#888; padding:2px 0;">Line 6</td><td style="color:#4ade80; font-weight:600;">0 (balance = $0)</td></tr>
        <tr><td style="color:#888; padding:2px 0;">Line 7</td><td style="color:#4ade80; font-weight:600;">0 (pay = $0)</td></tr>
      </table>
      <div style="margin-top: 12px; padding: 8px; background: rgba(217,119,87,0.15); border-radius: 8px; border: 1px solid #d97757; font-size: 12px; color: #d97757; font-weight:700;">
        ⚡ ONLY field YOU need to fill: SSN (XXX-XX-9897)
      </div>
    `;
    document.body.appendChild(overlay);
  }, TAXPAYER);

  console.log();
  console.log('='.repeat(60));
  console.log('  TWO TABS OPEN:');
  console.log('  Tab 1 — FreeTaxUSA extension (simpler, no account needed)');
  console.log('  Tab 2 — IRS Free File Fillable Forms (official IRS option)');
  console.log();
  console.log('  RECOMMENDATION: Use Tab 1 (FreeTaxUSA) first.');
  console.log('  If it asks you to create an account, use Tab 2 instead.');
  console.log();
  console.log('  The orange panel on each page has all pre-filled values.');
  console.log('  ONLY thing you need to type: your SSN (ends in 9897)');
  console.log('='.repeat(60));
  console.log();
  console.log('  Browser will stay open. Close this terminal when done.');
  console.log('  Press Ctrl+C to close the browser.');

  // Keep browser open until user closes it
  await new Promise(() => {}); // Wait forever
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
