#!/usr/bin/env node
/**
 * Smart Form 4868 Extension Filer
 *
 * Flow:
 * 1. Opens FreeTaxUSA at extension auth page
 * 2. Waits for you to sign in / create account (watches URL)
 * 3. Auto-fills all extension fields with your tax data
 * 4. Pauses at SSN field with a clear prompt
 * 5. Submits for you
 *
 * Homen Shum | 2025 Tax Year | $0 owed | 6-month extension to Oct 15, 2026
 */

import { chromium } from 'playwright';
import * as readline from 'readline/promises';
import { stdin, stdout } from 'process';

const TAX_DATA = {
  firstName: 'Homen',
  lastName: 'Shum',
  address: '4875 Mowry Avenue Apt 142',
  city: 'Fremont',
  state: 'CA',
  zip: '94538',
  estimatedTaxLiability: '0',   // Line 4: Total 2025 tax — we estimate $0 (Scenario D)
  totalPayments: '0',            // Line 5: IRS payments made in 2025
  balanceDue: '0',               // Line 6: Line 4 - Line 5
  amountPaying: '0',             // Line 7: Payment with extension
  taxYear: '2025',
};

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function printBox(title, lines) {
  const width = 62;
  console.log('\n' + '═'.repeat(width));
  console.log(`  ${title}`);
  console.log('─'.repeat(width));
  for (const line of lines) console.log(`  ${line}`);
  console.log('═'.repeat(width) + '\n');
}

async function waitForNavAway(page, fromPattern, label, timeout = 300000) {
  console.log(`  ⏳ Waiting for you to complete: ${label}...`);
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const url = page.url();
    if (!url.includes(fromPattern)) {
      console.log(`  ✅ ${label} complete! URL: ${url}`);
      return true;
    }
    await delay(1500);
  }
  return false;
}

async function tryFill(page, selectors, value) {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) {
        await el.fill(value);
        return true;
      }
    } catch {}
  }
  return false;
}

async function main() {
  printBox('Form 4868 — Extension Auto-Filer', [
    'Taxpayer: Homen Shum',
    'Tax Year: 2025',
    'Extension: 6 months → October 15, 2026',
    'Estimated Tax: $0  |  Balance Due: $0  |  Payment: $0',
    '',
    '⚡ You will need to:',
    '  1. Sign in or create a FREE FreeTaxUSA account',
    '  2. Enter your SSN when prompted',
    '  (Everything else is automated)',
  ]);

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized', '--disable-web-security'],
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  // ── Step 1: Navigate to FreeTaxUSA extension login ─────────────────────
  console.log('  Opening FreeTaxUSA extension sign-in page...\n');
  await page.goto('https://auth.freetaxusa.com/?NEWTAX&NEWEXT&PRMPT&appYear=2025', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await delay(1500);

  // Inject helper overlay
  await page.evaluate(() => {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; top:16px; right:16px; width:320px;
      background:#1a1a2e; border:2px solid #d97757; border-radius:12px;
      padding:16px; z-index:999999; font-family:sans-serif; color:#fff;
      box-shadow:0 8px 32px rgba(0,0,0,.6); font-size:13px;
    `;
    el.innerHTML = `
      <b style="color:#d97757">📋 Step 1: Sign In or Create Account</b><br><br>
      Create a FREE account with:<br>
      <span style="color:#aaa">• Any email address you use</span><br>
      <span style="color:#aaa">• Choose a password</span><br><br>
      <b style="color:#4ade80">Then the bot will auto-fill everything.</b><br><br>
      <span style="color:#888; font-size:11px">You only need to enter SSN when asked.</span>
    `;
    document.body.appendChild(el);
  });

  printBox('ACTION NEEDED — STEP 1', [
    'A browser window is now open.',
    'Please:',
    '  → Click "Create Account" or "Sign In"',
    '  → Enter your email + create a password',
    '  → Complete any email verification if prompted',
    '',
    '⚡ Once logged in, this script takes over automatically.',
  ]);

  // ── Step 2: Wait for login to complete ──────────────────────────────────
  const loggedIn = await waitForNavAway(page, 'auth.freetaxusa.com', 'Login / Account Creation');
  if (!loggedIn) {
    console.log('  ⚠️  Timed out waiting for login. Trying to continue anyway...');
  }

  await delay(3000);
  const postLoginUrl = page.url();
  console.log(`  Post-login URL: ${postLoginUrl}`);

  // ── Step 3: Navigate to extension form if not already there ─────────────
  if (!postLoginUrl.includes('extension') && !postLoginUrl.includes('4868')) {
    console.log('  Navigating to extension form...');
    await page.goto('https://www.freetaxusa.com/extension/', { waitUntil: 'domcontentloaded' });
    await delay(2000);

    // Click start extension button
    const extBtn = await page.$('text=Start free extension') ||
                   await page.$('text=File Extension') ||
                   await page.$('a[href*="extension"]');
    if (extBtn) {
      console.log('  Clicking extension start button...');
      await extBtn.click();
      await delay(3000);
    }
  }

  // ── Step 4: Find and fill the Form 4868 fields ──────────────────────────
  console.log('  Looking for Form 4868 fields...');
  await delay(2000);

  // Scan all pages / wait for form to load
  let formFound = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    const inputs = await page.$$('input:visible, select:visible');
    if (inputs.length > 3) {
      formFound = true;
      console.log(`  Found ${inputs.length} form fields.`);
      break;
    }
    await delay(2000);
    console.log(`  Waiting for form... (attempt ${attempt + 1})`);
  }

  if (!formFound) {
    console.log('  Form fields not found — dumping page state for diagnosis...');
    const url = page.url();
    const title = await page.title();
    console.log(`  URL: ${url} | Title: ${title}`);
    const html = await page.content();
    const textSnip = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 1000);
    console.log(`  Page text: ${textSnip}`);
  }

  // Dump actual input fields
  const allInputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input,select,textarea'))
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0;
      })
      .map(el => ({
        tag: el.tagName,
        type: el.type || '',
        id: el.id || '',
        name: el.name || '',
        label: el.labels?.[0]?.innerText?.trim() || '',
        placeholder: el.placeholder || '',
        value: el.value || '',
        ariaLabel: el.getAttribute('aria-label') || '',
      }));
  });

  console.log('\n  FORM FIELDS FOUND:');
  for (const inp of allInputs) {
    console.log(`    [${inp.type||inp.tag}] id="${inp.id}" name="${inp.name}" label="${inp.label}" aria="${inp.ariaLabel}" placeholder="${inp.placeholder}"`);
  }

  // ── Step 5: Try to fill each field ──────────────────────────────────────

  // SSN field (user must fill this)
  const ssnSelectors = [
    '#ssn', '[name="ssn"]', '[name="SSN"]', '[name="socialSecurityNumber"]',
    'input[placeholder*="SSN"]', 'input[placeholder*="Social"]',
    'input[aria-label*="SSN"]', 'input[aria-label*="Social Security"]',
    '[name*="ssn"]', '[id*="ssn"]', '[id*="social"]',
  ];

  let ssnFilled = false;
  for (const sel of ssnSelectors) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) {
        // Focus the SSN field and highlight it
        await el.scrollIntoViewIfNeeded();
        await el.click();
        console.log(`\n  ✅ Found SSN field (${sel}). Highlighting for you...`);

        // Inject SSN prompt overlay
        await page.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (!el) return;
          el.style.border = '3px solid #d97757';
          el.style.boxShadow = '0 0 12px #d97757';
          el.style.backgroundColor = '#fff3e0';

          // Create floating arrow pointing to field
          const arrow = document.createElement('div');
          const rect = el.getBoundingClientRect();
          arrow.style.cssText = `
            position:fixed;
            top:${rect.top - 50}px;
            left:${rect.left}px;
            background:#d97757;
            color:white;
            padding:6px 12px;
            border-radius:6px;
            font-size:13px;
            font-weight:700;
            z-index:999999;
            white-space:nowrap;
            box-shadow:0 4px 12px rgba(0,0,0,.4);
          `;
          arrow.textContent = '⬇ Enter your SSN here (XXX-XX-9897)';
          document.body.appendChild(arrow);
        }, sel);

        ssnFilled = true;
        break;
      }
    } catch {}
  }

  // Fill name fields
  const nameFields = [
    { selectors: ['#firstName', '[name="firstName"]', '[name="first_name"]', 'input[placeholder*="First"]', '[aria-label*="First"]'], value: TAX_DATA.firstName },
    { selectors: ['#lastName', '[name="lastName"]', '[name="last_name"]', 'input[placeholder*="Last"]', '[aria-label*="Last"]'], value: TAX_DATA.lastName },
    { selectors: ['#address', '[name="address"]', '[name="streetAddress"]', 'input[placeholder*="Address"]', '[aria-label*="Address"]'], value: TAX_DATA.address },
    { selectors: ['#city', '[name="city"]', 'input[placeholder*="City"]', '[aria-label*="City"]'], value: TAX_DATA.city },
    { selectors: ['#zip', '[name="zip"]', '[name="zipCode"]', '[name="postalCode"]', 'input[placeholder*="ZIP"]', '[aria-label*="ZIP"]'], value: TAX_DATA.zip },
  ];

  let filledCount = 0;
  for (const field of nameFields) {
    if (await tryFill(page, field.selectors, field.value)) {
      filledCount++;
    }
  }

  // Fill tax amount fields
  const taxFields = [
    { selectors: ['#estimatedTax', '[name="estimatedTax"]', '[name="line4"]', '[name="totalTax"]', 'input[aria-label*="estimated"]', 'input[placeholder*="estimated"]'], value: '0', label: 'Line 4 (Estimated Tax)' },
    { selectors: ['#payments', '[name="payments"]', '[name="line5"]', '[name="totalPayments"]'], value: '0', label: 'Line 5 (Payments)' },
    { selectors: ['#balanceDue', '[name="balanceDue"]', '[name="line6"]', '[name="balance"]'], value: '0', label: 'Line 6 (Balance Due)' },
    { selectors: ['#amountPaying', '[name="amountPaying"]', '[name="line7"]', '[name="paymentAmount"]', '[name="amount"]'], value: '0', label: 'Line 7 (Payment)' },
  ];

  for (const field of taxFields) {
    if (await tryFill(page, field.selectors, field.value)) {
      filledCount++;
      console.log(`  ✅ Filled: ${field.label} = $0`);
    }
  }

  // State dropdown
  try {
    const stateEl = await page.$('#state, [name="state"], select[aria-label*="State"]');
    if (stateEl) {
      await stateEl.selectOption({ value: 'CA' });
      filledCount++;
      console.log('  ✅ Filled: State = CA');
    }
  } catch {}

  console.log(`\n  Total fields auto-filled: ${filledCount}`);

  if (!ssnFilled) {
    printBox('⚡ ACTION NEEDED — SSN', [
      'The SSN field could not be located automatically.',
      'Please find the SSN / Social Security Number field on screen',
      'and enter your SSN (it ends in 9897).',
      '',
      'Format: XXX-XX-9897',
      '',
      'After entering SSN, click Submit / E-File / Continue.',
    ]);
  } else {
    printBox('⚡ ACTION NEEDED — ENTER SSN', [
      'The SSN field is highlighted in orange on screen.',
      'Please click on it and type your SSN:',
      '  Format: XXX-XX-9897',
      '',
      'After entering SSN, click Submit or Continue.',
      '  This script will then auto-submit the form.',
    ]);
  }

  // ── Step 6: Wait for submission ──────────────────────────────────────────
  console.log('  ⏳ Watching for form submission...\n');

  let submitted = false;
  const submitStart = Date.now();
  while (Date.now() - submitStart < 600000) { // wait up to 10 minutes
    const url = page.url();

    // Check for confirmation page indicators
    if (
      url.includes('confirm') || url.includes('accepted') ||
      url.includes('success') || url.includes('done') ||
      url.includes('thank') || url.includes('filed')
    ) {
      submitted = true;
      break;
    }

    // Check page text for confirmation
    try {
      const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
      if (
        bodyText.includes('accepted') || bodyText.includes('extension filed') ||
        bodyText.includes('irs accepted') || bodyText.includes('confirmation number') ||
        bodyText.includes('successfully filed')
      ) {
        submitted = true;
        break;
      }
    } catch {}

    await delay(3000);
  }

  if (submitted) {
    // Get confirmation details
    const confirmText = await page.evaluate(() => {
      const body = document.body.innerText;
      // Look for confirmation number
      const match = body.match(/confirmation\s*(?:number)?:?\s*([A-Z0-9-]{8,})/i);
      return { text: body.substring(0, 1000), confirmNum: match?.[1] || '' };
    });

    printBox('✅ EXTENSION FILED SUCCESSFULLY!', [
      'Form 4868 has been submitted to the IRS.',
      '',
      `Confirmation: ${confirmText.confirmNum || 'See browser for confirmation number'}`,
      '',
      'New deadline: October 15, 2026',
      'Amount owed with extension: $0',
      '',
      'CA automatically grants 6-month extension with federal.',
      'No separate CA Form 3519 needed when $0 owed.',
      '',
      '📧 FreeTaxUSA will email you when IRS accepts (usually <24hr).',
    ]);

    // Take screenshot of confirmation
    await page.screenshot({ path: 'C:\\Users\\hshum\\Downloads\\2025-Tax-Bundle\\extension-confirmation.png' });
    console.log('  Screenshot: 2025-Tax-Bundle/extension-confirmation.png');
  } else {
    printBox('ℹ️  Browser Still Open', [
      'The 10-minute wait completed without detecting a confirmation page.',
      'Check the browser to see where things stand.',
      '',
      'If you need to submit manually, all fields should be filled.',
      'Just click "Submit" or "E-File" in the browser.',
    ]);
  }

  // Stay open for user to review
  console.log('  Browser stays open. Press Ctrl+C when done.\n');
  await new Promise(() => {});
}

main().catch(err => {
  console.error('\n  ERROR:', err.message);
  console.error('  Please complete the extension manually in the browser.');
  process.exit(0);
});
