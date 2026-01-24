import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('📸 Testing Related Feeds feature...');

  // 1. Go to the app
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);

  // Take initial screenshot
  await page.screenshot({ path: 'screenshots/01-landing.png' });
  console.log('✅ Captured landing page');

  // 2. Look for feed items - try multiple selectors
  const feedSelectors = [
    '[data-testid="feed-card"]',
    '.feed-card',
    'article',
    '[class*="FeedCard"]',
    'button:has-text("Read more")',
    // Try finding any clickable card-like element
    '.bg-white.rounded-xl.border',
    'div[class*="rounded-xl"][class*="border"]',
  ];

  let feedItem = null;
  for (const selector of feedSelectors) {
    const items = await page.$$(selector);
    if (items.length > 0) {
      console.log(`Found ${items.length} items with selector: ${selector}`);
      feedItem = items[0];
      break;
    }
  }

  // 3. Try to navigate to a feed page first
  const navLinks = await page.$$('a, button');
  for (const link of navLinks) {
    const text = await link.textContent();
    if (text && (text.includes('Feed') || text.includes('For You') || text.includes('News'))) {
      console.log(`Clicking nav: ${text.trim()}`);
      await link.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/02-feed-page.png' });
      console.log('✅ Navigated to feed page');
      break;
    }
  }

  // 4. Now look for feed items again
  await page.waitForTimeout(1000);
  const cards = await page.$$('article, [class*="card"], [class*="Card"], button[class*="rounded"]');
  console.log(`Found ${cards.length} potential card elements`);

  // Try clicking first substantial card
  for (const card of cards.slice(0, 5)) {
    const text = await card.textContent();
    if (text && text.length > 50) {
      console.log(`Clicking card with text: ${text.substring(0, 50)}...`);
      await card.click();
      await page.waitForTimeout(2000);
      break;
    }
  }

  // 5. Take screenshot after clicking
  await page.screenshot({ path: 'screenshots/03-after-click.png' });
  console.log('✅ Captured after click');

  // 6. Look for the reader panel
  const readerPanel = await page.$('[data-reader-content], [class*="FeedReader"], [class*="slide-in"]');
  if (readerPanel) {
    console.log('✅ Found reader panel!');

    // Scroll to Related Content section
    await page.evaluate(() => {
      const content = document.querySelector('[data-reader-content]');
      if (content) {
        content.scrollTo({ top: content.scrollHeight, behavior: 'smooth' });
      }
    });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'screenshots/04-reader-panel-scrolled.png' });
    console.log('✅ Captured reader panel scrolled');

    // Look for Related Content section specifically
    const relatedSection = await page.$('text=Related Content');
    if (relatedSection) {
      console.log('✅ Found Related Content section!');
      await relatedSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/05-related-feeds.png' });
      console.log('✅ Captured Related Feeds section');
    } else {
      console.log('⚠️ Related Content section not visible');
    }
  } else {
    console.log('⚠️ Reader panel not found');
  }

  // 7. Full page screenshot
  await page.screenshot({ path: 'screenshots/06-full-page.png', fullPage: true });
  console.log('✅ Captured full page');

  // Debug: Print page structure
  const pageText = await page.evaluate(() => {
    const elements = document.querySelectorAll('h1, h2, h3, [class*="Related"], [class*="Feed"]');
    return Array.from(elements).map(e => `${e.tagName}: ${e.className} - ${e.textContent?.substring(0, 50)}`).join('\n');
  });
  console.log('\n📋 Page structure:\n', pageText);

  await browser.close();
  console.log('\n✅ Done! Check screenshots/ folder');
})();
