const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function captureConvexLogs() {
  const logs = [];
  
  // Start capturing npx convex dev logs
  const convexProcess = spawn('npx', ['convex', 'logs', '--tail', '100'], {
    cwd: process.cwd(),
    shell: true
  });

  convexProcess.stdout.on('data', (data) => {
    const logLine = data.toString();
    console.log('[CONVEX LOG]', logLine);
    logs.push(logLine);
  });

  convexProcess.stderr.on('data', (data) => {
    console.error('[CONVEX ERROR]', data.toString());
  });

  return { logs, process: convexProcess };
}

async function runTest() {
  console.log('Starting browser test for Fast Agent diagnostic logs...\n');
  
  // Start capturing Convex logs
  const { logs, process: convexProcess } = await captureConvexLogs();
  
  // Give logs a moment to start streaming
  await new Promise(resolve => setTimeout(resolve, 2000));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('1. Opening http://localhost:5173');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('2. Navigating to Fast Agent...');
    
    // Try to find and click Fast Agent link/button
    // Look for various possible selectors
    const possibleSelectors = [
      'text=Fast Agent',
      'a:has-text("Fast Agent")',
      'button:has-text("Fast Agent")',
      '[data-testid*="fast-agent"]',
      '[href*="fast-agent"]',
      '[href*="agents"]'
    ];

    let clicked = false;
    for (const selector of possibleSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          console.log(`   Found Fast Agent using selector: ${selector}`);
          await element.click();
          clicked = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!clicked) {
      console.log('   Trying to navigate directly to /agents or /fast-agent');
      await page.goto('http://localhost:5173/agents', { waitUntil: 'networkidle' });
    }

    await page.waitForTimeout(2000);

    console.log('3. Looking for message input...');
    
    // Try to find message input field
    const inputSelectors = [
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="Message"]',
      'input[placeholder*="message"]',
      'input[placeholder*="Message"]',
      'textarea',
      'input[type="text"]'
    ];

    let messageInput = null;
    for (const selector of inputSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          console.log(`   Found input using selector: ${selector}`);
          messageInput = element;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (messageInput) {
      console.log('4. Sending test message: "Test diagnostic logging"');
      await messageInput.fill('Test diagnostic logging');
      await page.waitForTimeout(500);
      
      // Try to find and click send button
      const sendSelectors = [
        'button:has-text("Send")',
        'button[type="submit"]',
        'button:has([data-icon="send"])',
        'button:has-text("→")',
        '[aria-label*="send" i]'
      ];

      for (const selector of sendSelectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            console.log(`   Found send button using selector: ${selector}`);
            await element.click();
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }

      // Also try pressing Enter
      await messageInput.press('Enter');
      
      console.log('5. Waiting for backend processing (10 seconds)...');
      await page.waitForTimeout(10000);
    } else {
      console.log('   Could not find message input. Taking screenshot for debugging.');
      await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
    }

    console.log('6. Capturing final logs...');
    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
    
    // Kill the convex logs process
    convexProcess.kill();
    
    console.log('\n=== DIAGNOSTIC LOGS ===\n');
    
    // Filter and display diagnostic logs
    const diagnosticLogs = logs.join('').split('\n').filter(line => 
      line.includes('[getThreadMessagesWithStreaming]') ||
      line.includes('Retrieved') ||
      line.includes('Message') ||
      line.includes('role=') ||
      line.includes('status=')
    );
    
    if (diagnosticLogs.length > 0) {
      diagnosticLogs.forEach(log => console.log(log));
    } else {
      console.log('No diagnostic logs found. All captured logs:');
      console.log(logs.join(''));
    }
  }
}

runTest().catch(console.error);
