/**
 * LinkedIn Browser Controller — Playwright persistent session
 * Launches Chrome with your profile, exposes page for external control.
 * Communicates via JSON commands on stdin, screenshots on stdout.
 */
import { chromium } from 'playwright';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

const chromeUserData = resolve(process.env.LOCALAPPDATA, 'Google/Chrome/User Data');
const screenshotDir = resolve('scripts/career/screenshots');
mkdirSync(screenshotDir, { recursive: true });

const cmd = process.argv[2] || 'launch'; // launch, screenshot, goto, type, click, search
const arg1 = process.argv[3] || '';
const arg2 = process.argv[4] || '';

async function main() {
  const context = await chromium.launchPersistentContext(chromeUserData, {
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
    viewport: { width: 1280, height: 900 },
    slowMo: 300,
  });

  const page = context.pages()[0] || await context.newPage();

  // Navigate to LinkedIn messaging
  await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Take initial screenshot
  const ssPath = resolve(screenshotDir, 'linkedin-messaging.png');
  await page.screenshot({ path: ssPath, fullPage: false });
  console.log(`Screenshot saved: ${ssPath}`);

  // Keep browser open — user/Claude will control via separate script calls
  console.log('Browser launched. Waiting 120s for manual control...');
  await page.waitForTimeout(120000);
  await context.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
