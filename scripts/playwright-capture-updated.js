import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('📸 Capturing updated localhost:5173...');
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'updated-landing.png', fullPage: true });
  console.log('✅ Saved updated-landing.png');

  await browser.close();
  console.log('\n✅ Done! Check updated-landing.png');
})();

