import { chromium } from 'playwright';

async function takeSourcesScreenshot() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to [::1]:5173...');
  // Try IPv6 localhost since server is bound to [::1]
  try {
    await page.goto('http://[::1]:5173', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log('IPv6 failed, trying 127.0.0.1...');
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle', timeout: 30000 });
  }
  
  // Wait for page to fully load
  await page.waitForTimeout(3000);
  
  // Take initial screenshot to see what we have
  await page.screenshot({ path: 'initial-state.png' });
  console.log('Initial screenshot saved');

  // Look for Fast Agent navigation
  console.log('Looking for Fast Agent navigation...');
  
  // Try to find and click on Fast Agent in sidebar/navigation
  const fastAgentSelectors = [
    'text=Fast Agent',
    '[data-testid="fast-agent"]',
    'a:has-text("Fast Agent")',
    'button:has-text("Fast Agent")',
    '[href*="fast"]',
    '[href*="agent"]'
  ];

  let foundFastAgent = false;
  for (const selector of fastAgentSelectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        console.log(`Found Fast Agent with selector: ${selector}`);
        await element.click();
        foundFastAgent = true;
        await page.waitForTimeout(2000);
        break;
      }
    } catch (e) {
      // Continue trying other selectors
    }
  }

  if (!foundFastAgent) {
    console.log('Could not find Fast Agent navigation, checking current page...');
  }

  // Take screenshot after navigation
  await page.screenshot({ path: 'after-navigation.png' });
  console.log('After navigation screenshot saved');

  // Look for Sources Cited dropdown
  console.log('Looking for Sources Cited dropdown...');
  
  const sourcesSelectors = [
    'text=Sources cited',
    'text=Sources Cited',
    '[data-testid*="source"]',
    'details:has-text("Sources")',
    'summary:has-text("Sources")',
    '.sources-dropdown',
    '[class*="source"]',
    'button:has-text("Sources")'
  ];

  let foundSources = false;
  for (const selector of sourcesSelectors) {
    try {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        console.log(`Found Sources with selector: ${selector}, count: ${elements.length}`);
        // Click the first one to expand
        await elements[0].click();
        foundSources = true;
        await page.waitForTimeout(1000);
        break;
      }
    } catch (e) {
      // Continue trying
    }
  }

  if (!foundSources) {
    console.log('No Sources Cited found. Will try to send a message to generate sources...');
    
    // Look for input field to send a message
    const inputSelectors = [
      'textarea',
      'input[type="text"]',
      '[contenteditable="true"]',
      '[data-testid*="input"]',
      '[placeholder*="message"]',
      '[placeholder*="Message"]'
    ];

    let inputElement = null;
    for (const selector of inputSelectors) {
      try {
        inputElement = await page.$(selector);
        if (inputElement) {
          console.log(`Found input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    if (inputElement) {
      console.log('Sending message to trigger sources...');
      await inputElement.fill('What are the latest tech news headlines?');
      await page.waitForTimeout(500);
      
      // Find and click send button or press Enter
      const sendButton = await page.$('button[type="submit"], button:has-text("Send"), [data-testid*="send"]');
      if (sendButton) {
        await sendButton.click();
      } else {
        await page.keyboard.press('Enter');
      }
      
      // Wait for response with sources
      console.log('Waiting for response with sources (up to 60 seconds)...');
      await page.waitForTimeout(45000); // Wait 45 seconds for response
      
      // Try to find sources again
      for (const selector of sourcesSelectors) {
        try {
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            console.log(`Found Sources after message: ${selector}`);
            await elements[0].click();
            foundSources = true;
            await page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
    }
  }

  // Final screenshot
  console.log('Taking final screenshot...');
  await page.screenshot({ path: 'sources-cited-current.png', fullPage: false });
  console.log('Screenshot saved as sources-cited-current.png');

  await browser.close();
  console.log('Done!');
}

takeSourcesScreenshot().catch(console.error);
