/**
 * LinkedIn Step Controller — One action per invocation, screenshot after each.
 * Uses CDP to connect to an already-running Chrome with --remote-debugging-port=9222
 *
 * Usage:
 *   node linkedin-step.mjs launch          — Start Chrome with CDP debugging
 *   node linkedin-step.mjs screenshot      — Take screenshot of current page
 *   node linkedin-step.mjs goto <url>      — Navigate to URL
 *   node linkedin-step.mjs click <selector> — Click element
 *   node linkedin-step.mjs type <selector> <text> — Type text into element
 *   node linkedin-step.mjs fill <selector> <text>  — Fill (replace) text
 *   node linkedin-step.mjs send-reply <threadId|search:Name> <draftFile> — Full send flow
 */
import { chromium } from 'playwright';
import { resolve } from 'path';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { execSync, spawn } from 'child_process';

const ssDir = resolve('scripts/career/screenshots');
mkdirSync(ssDir, { recursive: true });

const cmd = process.argv[2];
const arg1 = process.argv[3] || '';
const arg2 = process.argv.slice(4).join(' ') || '';

const CDP_URL = 'http://localhost:9222';

async function screenshot(page, name = 'current') {
  const path = resolve(ssDir, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`SCREENSHOT:${path}`);
  return path;
}

async function connectCDP() {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  const page = pages.find(p => p.url().includes('linkedin.com')) || pages[0];
  return { browser, page, context };
}

async function main() {
  if (cmd === 'launch') {
    // Launch Chrome with remote debugging
    const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    const userDataDir = resolve(process.env.LOCALAPPDATA, 'Google/Chrome/User Data');

    console.log('Launching Chrome with CDP on port 9222...');
    const chrome = spawn(chromePath, [
      `--remote-debugging-port=9222`,
      `--user-data-dir=${userDataDir}`,
      'https://www.linkedin.com/messaging/'
    ], {
      detached: true,
      stdio: 'ignore'
    });
    chrome.unref();
    console.log(`Chrome PID: ${chrome.pid}`);

    // Wait for CDP to be ready
    for (let i = 0; i < 20; i++) {
      try {
        const resp = await fetch(`${CDP_URL}/json/version`);
        if (resp.ok) {
          console.log('CDP ready!');
          // Wait for page to load
          await new Promise(r => setTimeout(r, 5000));
          // Take initial screenshot
          const { browser, page } = await connectCDP();
          await screenshot(page, 'initial');
          await browser.close();
          return;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 1000));
    }
    console.error('CDP failed to start after 20s');
    process.exit(1);
  }

  // All other commands connect to existing CDP
  const { browser, page } = await connectCDP();

  try {
    switch (cmd) {
      case 'screenshot': {
        const name = arg1 || `step-${Date.now()}`;
        await screenshot(page, name);
        break;
      }

      case 'goto': {
        await page.goto(arg1, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
        await screenshot(page, 'after-goto');
        break;
      }

      case 'click': {
        await page.locator(arg1).first().click({ timeout: 10000 });
        await page.waitForTimeout(1500);
        await screenshot(page, 'after-click');
        break;
      }

      case 'type': {
        await page.locator(arg1).first().click({ timeout: 10000 });
        await page.keyboard.type(arg2, { delay: 30 });
        await page.waitForTimeout(1000);
        await screenshot(page, 'after-type');
        break;
      }

      case 'fill': {
        await page.locator(arg1).first().fill(arg2, { timeout: 10000 });
        await page.waitForTimeout(1000);
        await screenshot(page, 'after-fill');
        break;
      }

      case 'press': {
        await page.keyboard.press(arg1);
        await page.waitForTimeout(1000);
        await screenshot(page, 'after-press');
        break;
      }

      case 'scroll': {
        await page.mouse.wheel(0, parseInt(arg1) || 300);
        await page.waitForTimeout(1000);
        await screenshot(page, 'after-scroll');
        break;
      }

      case 'info': {
        // Get page info: URL, title, visible text
        const url = page.url();
        const title = await page.title();
        console.log(`URL: ${url}`);
        console.log(`Title: ${title}`);
        await screenshot(page, 'info');
        break;
      }

      case 'elements': {
        // List interactive elements (buttons, inputs, links) visible on page
        const elements = await page.evaluate(() => {
          const els = document.querySelectorAll('button, input, a, [contenteditable="true"], [role="textbox"]');
          return Array.from(els).slice(0, 50).map((el, i) => ({
            idx: i,
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || '').trim().substring(0, 60),
            type: el.getAttribute('type') || '',
            role: el.getAttribute('role') || '',
            placeholder: el.getAttribute('placeholder') || '',
            href: el.getAttribute('href')?.substring(0, 80) || '',
            visible: el.offsetParent !== null,
            selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase()
          }));
        });
        console.log(JSON.stringify(elements.filter(e => e.visible), null, 2));
        break;
      }

      default:
        console.error(`Unknown command: ${cmd}`);
        console.log('Commands: launch, screenshot, goto, click, type, fill, press, scroll, info, elements');
        process.exit(1);
    }
  } finally {
    await browser.close(); // Disconnects CDP, doesn't close Chrome
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
