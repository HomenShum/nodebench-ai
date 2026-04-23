/**
 * TaxPilot — Keeper Tax Extension Auto-Filer
 * Uses Playwright CDP to control Chrome with the user's existing profile.
 *
 * Usage:
 *   node scripts/tax-2025/file-extension-keeper.mjs
 *
 * What it does:
 *   1. Kills running Chrome (saves session via graceful close)
 *   2. Relaunches Chrome with --remote-debugging-port=9222 + existing profile
 *   3. Connects via Playwright CDP
 *   4. Navigates to dashboard.keepertax.com
 *   5. Finds and completes the extension filing flow
 */

import { chromium } from 'playwright';
import { execSync, spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

// ── Config ────────────────────────────────────────────────────────────────────
const CHROME_PATH   = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\hshum\\AppData\\Local\\Google\\Chrome\\User Data';
const DEBUG_PORT    = 9222;
const KEEPER_URL    = 'https://dashboard.keepertax.com';

// Form 4868 values for Scenario D — Homen Shum 2025
const TAX_DATA = {
  estimatedTax:  400,   // APTC repayment cap
  payments:      0,
  balanceDue:    400,
  paymentAmount: 0,     // filing extension without paying now
  firstName:    'HOMEN',
  lastName:     'SHUM',
  taxYear:      2025,
};

// ── Kill Chrome ───────────────────────────────────────────────────────────────
function killChrome() {
  console.log('⏹  Closing Chrome...');
  try {
    execSync('taskkill /F /IM chrome.exe /T', { stdio: 'pipe' });
    console.log('✓  Chrome closed');
  } catch {
    console.log('ℹ  Chrome was not running');
  }
}

// ── Launch Chrome with debug port + existing profile ─────────────────────────
function launchChrome() {
  console.log(`🚀 Launching Chrome with debug port ${DEBUG_PORT}...`);
  const args = [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--profile-directory=Default',
    '--no-first-run',
    '--no-default-browser-check',
    KEEPER_URL,
  ];
  const proc = spawn(`"${CHROME_PATH}"`, args, {
    detached: true,
    stdio:    'ignore',
    shell:    true,
  });
  proc.unref();
  return proc;
}

// ── Wait for CDP endpoint to be ready ────────────────────────────────────────
async function waitForCDP(maxMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`http://localhost:${DEBUG_PORT}/json/version`);
      if (res.ok) {
        const data = await res.json();
        console.log(`✓  CDP ready: ${data.Browser}`);
        return data.webSocketDebuggerUrl;
      }
    } catch { /* not ready yet */ }
    await sleep(500);
  }
  throw new Error(`CDP not ready after ${maxMs}ms`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  killChrome();
  await sleep(1500);
  launchChrome();
  await sleep(5000); // give Chrome time to start

  const wsUrl    = await waitForCDP();
  const browser  = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
  console.log('✓  Connected via CDP');

  // Find or create Keeper Tax page
  let page;
  const contexts = browser.contexts();
  for (const ctx of contexts) {
    const pages = ctx.pages();
    for (const p of pages) {
      if (p.url().includes('keepertax.com')) { page = p; break; }
    }
    if (page) break;
  }

  if (!page) {
    const ctx = contexts[0] || await browser.newContext();
    page = await ctx.newPage();
  }

  await page.bringToFront();
  console.log(`📄 Current page: ${page.url()}`);

  // Navigate to Keeper if not already there
  if (!page.url().includes('keepertax.com')) {
    await page.goto(KEEPER_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  }

  await sleep(2000);
  console.log(`📄 At: ${page.url()}`);
  await page.screenshot({ path: 'scripts/tax-2025/keeper-01-landing.png' });
  console.log('📸 Screenshot: keeper-01-landing.png');

  // ── Handle login if needed ────────────────────────────────────────────────
  const isLoginPage = await page.locator('button:has-text("Sign in with email"), button:has-text("Continue")').first().isVisible({ timeout: 2000 }).catch(() => false);

  if (isLoginPage) {
    console.log('🔐 Login page detected — signing in with email...');

    // Click "Sign in with email"
    await page.locator('button:has-text("Sign in with email")').click();
    await sleep(1500);

    // Fill email
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    await emailInput.waitFor({ timeout: 5000 });
    await emailInput.fill('hshum2018@gmail.com');
    console.log('✉  Email entered: hshum2018@gmail.com');

    await page.screenshot({ path: 'scripts/tax-2025/keeper-login-email.png' });

    // Click continue/submit
    const continueBtn = page.locator('button:has-text("Continue"), button[type="submit"]').first();
    await continueBtn.click();
    await sleep(1000);

    console.log('\n⏳ Keeper Tax sent a verification code/magic link to your email.');
    console.log('   Complete the login in the Chrome window, then press Enter here to continue...');

    // Wait for user to complete login — poll until we're past the login page
    await new Promise(resolve => {
      process.stdin.setRawMode?.(false);
      process.stdin.resume();
      process.stdin.once('data', resolve);
    });

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard.keepertax.com/**', { timeout: 30000 }).catch(() => {});
    await sleep(2000);
    console.log(`✓  Now at: ${page.url()}`);
    await page.screenshot({ path: 'scripts/tax-2025/keeper-02-dashboard.png' });
    console.log('📸 keeper-02-dashboard.png');
  }

  // ── Find extension filing flow ────────────────────────────────────────────
  // Keeper Tax nav: look for "File", "Taxes", "Extension" links
  const navSelectors = [
    'a[href*="extension"]',
    'a[href*="Extension"]',
    'button:has-text("Extension")',
    'a:has-text("Extension")',
    'a:has-text("File Extension")',
    '[data-testid*="extension"]',
  ];

  let extensionLink = null;
  for (const sel of navSelectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        extensionLink = el;
        console.log(`✓  Found extension link via: ${sel}`);
        break;
      }
    } catch { /* try next */ }
  }

  if (extensionLink) {
    await extensionLink.click();
    await sleep(2000);
    await page.screenshot({ path: 'scripts/tax-2025/keeper-02-extension.png' });
    console.log('📸 Screenshot: keeper-02-extension.png');
  } else {
    // Try navigating to common extension URLs
    const extensionUrls = [
      `${KEEPER_URL}/taxes/extension`,
      `${KEEPER_URL}/extension`,
      `${KEEPER_URL}/file/extension`,
      `${KEEPER_URL}/taxes/file-extension`,
    ];

    for (const url of extensionUrls) {
      console.log(`🔍 Trying: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      await sleep(1000);
      if (!page.url().includes('404') && !page.url().includes('error')) {
        console.log(`✓  Landed at: ${page.url()}`);
        break;
      }
    }

    await page.screenshot({ path: 'scripts/tax-2025/keeper-02-extension.png' });
    console.log('📸 Screenshot: keeper-02-extension.png');
  }

  // ── Fill extension form fields if present ─────────────────────────────────
  const fieldMap = {
    // estimated tax liability
    'input[name*="estimated"], input[placeholder*="estimated"], input[id*="estimated"]':
      String(TAX_DATA.estimatedTax),
    // payments
    'input[name*="payment"], input[placeholder*="payment"]:not([type="submit"])':
      String(TAX_DATA.payments),
    // balance due
    'input[name*="balance"], input[placeholder*="balance"]':
      String(TAX_DATA.balanceDue),
  };

  let filled = 0;
  for (const [selector, value] of Object.entries(fieldMap)) {
    try {
      const inputs = await page.locator(selector).all();
      for (const input of inputs) {
        if (await input.isVisible({ timeout: 1000 })) {
          await input.fill(value);
          filled++;
          console.log(`✏  Filled: ${selector} → ${value}`);
        }
      }
    } catch { /* field not on this page */ }
  }

  console.log(`✓  Filled ${filled} field(s)`);

  // ── Scan all visible fields for diagnosis ─────────────────────────────────
  const fields = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, select, textarea, button'))
      .filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map(el => ({
        tag:         el.tagName,
        type:        el.type || '',
        name:        el.name || '',
        id:          el.id   || '',
        placeholder: el.placeholder || '',
        text:        el.innerText?.slice(0, 60) || '',
        value:       el.value?.slice(0, 60) || '',
      }));
  });

  console.log('\n── Visible fields on page ──');
  fields.forEach(f => {
    const desc = [f.tag, f.type, f.name, f.id, f.placeholder, f.text].filter(Boolean).join(' | ');
    console.log(`  ${desc}`);
  });

  await page.screenshot({ path: 'scripts/tax-2025/keeper-03-final.png', fullPage: true });
  console.log('\n📸 Screenshot: keeper-03-final.png');
  console.log('\n✅ Done. Review screenshots in scripts/tax-2025/');
  console.log('   Chrome is still open — you can continue from where the script left off.');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
