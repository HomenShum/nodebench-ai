import { chromium } from 'playwright';
import { spawn } from 'child_process';

async function captureConvexLogs() {
  const logs = [];
  
  // Start capturing npx convex logs (streaming mode, no --history flag)
  const convexProcess = spawn('npx', ['convex', 'logs'], {
    cwd: process.cwd(),
    shell: true
  });

  convexProcess.stdout.on('data', (data) => {
    const logLine = data.toString();
    console.log('[CONVEX]', logLine.trim());
    logs.push(logLine);
  });

  convexProcess.stderr.on('data', (data) => {
    const errLine = data.toString();
    if (!errLine.includes('Usage:') && !errLine.includes('Options:')) {
      console.error('[ERROR]', errLine.trim());
    }
  });

  return { logs, process: convexProcess };
}

async function runTest() {
  console.log('Starting browser test for Fast Agent diagnostic logs...\n');
  
  // Start capturing Convex logs
  const { logs, process: convexProcess } = await captureConvexLogs();
  
  // Give logs a moment to start streaming
  console.log('Waiting for Convex logs to initialize...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('\n1. Opening http://localhost:5173');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('2. Navigating to Fast Agent...');
    
    // Try to find and click Fast Agent link/button
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
          console.log(`   Found Fast Agent using: ${selector}`);
          await element.click();
          clicked = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!clicked) {
      console.log('   Navigating directly to /agents');
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
          console.log(`   Found input using: ${selector}`);
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
      
      // Try pressing Enter to send
      await messageInput.press('Enter');
      
      console.log('5. Waiting for backend processing (15 seconds to capture logs)...');
      await page.waitForTimeout(15000);
    } else {
      console.log('   ERROR: Could not find message input.');
      await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
      console.log('   Screenshot saved to debug-screenshot.png');
    }

    console.log('6. Capturing final logs...');
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('Test error:', error.message);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
    
    // Wait a bit more for any final logs
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Kill the convex logs process
    convexProcess.kill();
    
    console.log('\n' + '='.repeat(80));
    console.log('DIAGNOSTIC LOGS');
    console.log('='.repeat(80) + '\n');
    
    // Filter and display diagnostic logs
    const allLogs = logs.join('');
    const lines = allLogs.split('\n');
    
    const diagnosticLines = lines.filter(line => 
      line.includes('[getThreadMessagesWithStreaming]') ||
      (line.includes('Retrieved') && line.includes('message')) ||
      (line.includes('Message') && (line.includes('role=') || line.includes('id='))) ||
      (line.includes('status=') && line.includes('content='))
    );
    
    if (diagnosticLines.length > 0) {
      console.log('Found diagnostic logs:\n');
      diagnosticLines.forEach(log => console.log(log));
    } else {
      console.log('No diagnostic logs matching the expected pattern found.');
      console.log('\nShowing all logs that mention "message" or "streaming":\n');
      const relevantLines = lines.filter(line => 
        line.toLowerCase().includes('message') ||
        line.toLowerCase().includes('streaming') ||
        line.toLowerCase().includes('thread')
      );
      
      if (relevantLines.length > 0) {
        relevantLines.forEach(log => console.log(log));
      } else {
        console.log('No relevant logs found. Showing last 50 log lines:\n');
        const lastLines = lines.slice(-50);
        lastLines.forEach(log => console.log(log));
      }
    }
    
    console.log('\n' + '='.repeat(80));
  }
}

runTest().catch(console.error);
