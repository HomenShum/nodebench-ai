import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Capture the example HTML
  console.log('📸 Capturing example HTML...');
  const examplePath = 'file://' + path.resolve(__dirname, 'temp-landing-example.html').replace(/\\/g, '/');
  await page.goto(examplePath);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'example-landing.png', fullPage: true });
  console.log('✅ Saved example-landing.png');

  // 2. Capture current localhost
  console.log('📸 Capturing current localhost:5173...');
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'current-landing.png', fullPage: true });
  console.log('✅ Saved current-landing.png');

  // 3. Get page snapshot for analysis
  const snapshot = await page.accessibility.snapshot();
  console.log('\n📊 Current page structure:');
  console.log(JSON.stringify(snapshot, null, 2).substring(0, 1000) + '...');

  await browser.close();
  console.log('\n✅ Done! Check example-landing.png and current-landing.png');
})();

