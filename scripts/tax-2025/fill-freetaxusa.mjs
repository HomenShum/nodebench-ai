#!/usr/bin/env node
/**
 * FreeTaxUSA Extension Form Filler
 * Analyzes the actual page structure and fills what it can.
 * Pauses and shows instructions for SSN.
 */

import { chromium } from 'playwright';

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  console.log('Loading FreeTaxUSA extension page...');
  await page.goto('https://www.freetaxusa.com/extension/', { waitUntil: 'networkidle', timeout: 30000 });
  await delay(2000);

  // Dump all interactive elements to understand the form
  const elements = await page.evaluate(() => {
    const result = [];
    // Find all inputs, selects, buttons, links
    const els = document.querySelectorAll('input, select, textarea, button, a[href]');
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue; // hidden
      result.push({
        tag: el.tagName,
        type: el.type || '',
        id: el.id || '',
        name: el.name || '',
        placeholder: el.placeholder || '',
        value: el.value || '',
        text: (el.innerText || '').trim().substring(0, 60),
        href: el.href || '',
        className: el.className.substring(0, 80),
      });
    }
    return result;
  });

  console.log('\n=== PAGE ELEMENTS ===');
  for (const el of elements) {
    if (el.tag === 'INPUT' || el.tag === 'SELECT' || el.tag === 'TEXTAREA') {
      console.log(`[INPUT] id="${el.id}" name="${el.name}" type="${el.type}" placeholder="${el.placeholder}"`);
    } else if (el.tag === 'BUTTON') {
      console.log(`[BUTTON] "${el.text}" class="${el.className.substring(0,40)}"`);
    } else if (el.tag === 'A' && el.text) {
      console.log(`[LINK] "${el.text}" → ${el.href.substring(0,80)}`);
    }
  }

  // Also get page text for context
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  console.log('\n=== PAGE TEXT (first 3000 chars) ===');
  console.log(pageText);

  // Now try to find and click the main CTA button to start extension filing
  const ctaSelectors = [
    'text=Start Free Extension',
    'text=File Extension',
    'text=Get Started',
    'text=Start',
    'text=Begin',
    'text=File Free Extension',
    'text=Create Account',
    'button[type="submit"]',
    '.btn-primary',
    'a.btn',
  ];

  let clicked = false;
  for (const sel of ctaSelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        const text = await el.evaluate(e => e.innerText || e.textContent);
        console.log(`\nFound CTA: "${text.trim()}" — clicking...`);
        await el.click();
        clicked = true;
        await delay(3000);
        break;
      }
    } catch {}
  }

  if (!clicked) {
    console.log('\nCould not find CTA button. Analyzing buttons on page...');
    const buttons = await page.$$('button, a.btn, .button, [role="button"]');
    for (const btn of buttons) {
      const text = await btn.evaluate(e => e.innerText || '');
      const visible = await btn.isVisible();
      if (visible && text.trim()) {
        console.log(`  Button: "${text.trim().substring(0,60)}"`);
      }
    }
  }

  // After clicking, check what appeared
  await delay(2000);
  const newUrl = page.url();
  const newTitle = await page.title();
  console.log(`\nAfter click: ${newTitle} | ${newUrl}`);

  // Check for signup/login form
  const emailField = await page.$('input[type="email"], input[name*="email"], #email');
  if (emailField) {
    console.log('\nSignup/Login form detected. FreeTaxUSA requires an account.');
    console.log('Options:');
    console.log('1. Create a free account with your email');
    console.log('2. OR use IRS Free File Fillable Forms (no account needed)');
    console.log('\nIRS Free File URL: https://www.irs.gov/e-file-providers/free-file-fillable-forms');

    // Open IRS alternative in new tab
    const irsPage = await context.newPage();
    await irsPage.goto('https://www.irs.gov/e-file-providers/free-file-fillable-forms', { waitUntil: 'domcontentloaded' });
    console.log('Opened IRS Free File tab as backup.');
  }

  // Take a screenshot
  await page.screenshot({ path: 'C:\\Users\\hshum\\Downloads\\2025-Tax-Bundle\\extension-page.png', fullPage: false });
  console.log('\nScreenshot saved: 2025-Tax-Bundle/extension-page.png');

  console.log('\n' + '='.repeat(60));
  console.log('INSTRUCTIONS FOR YOU:');
  console.log('='.repeat(60));
  console.log('The browser is open. Here is what to do:');
  console.log();
  console.log('OPTION A — FreeTaxUSA (Tab 1):');
  console.log('  1. Click "File Free Extension" or "Get Started"');
  console.log('  2. Create FREE account: just email + password');
  console.log('  3. Fill in:');
  console.log('     - SSN: [your SSN ending in 9897]');
  console.log('     - Name: Homen Shum');
  console.log('     - Address: 4875 Mowry Avenue Apt 142, Fremont CA 94538');
  console.log('     - Line 4 (Estimated Tax): 0');
  console.log('     - Line 5 (Payments): 0');
  console.log('     - Line 6 (Balance): 0');
  console.log('     - Line 7 (Payment): 0');
  console.log('  4. Click Submit / E-file');
  console.log();
  console.log('OPTION B — IRS Free File (Tab 2):');
  console.log('  1. Click "Start Free File Fillable Forms"');
  console.log('  2. Create IRS account with ID.me');
  console.log('  3. Select Form 4868');
  console.log('  4. Same values as above');
  console.log();
  console.log('Browser stays open. Press Ctrl+C when done.');

  await new Promise(() => {}); // Stay open
}

main().catch(err => { console.error('Fatal:', err); });
