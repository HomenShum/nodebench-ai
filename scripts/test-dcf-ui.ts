/**
 * End-to-End UI Test for DCF Spreadsheet Integration
 * Uses agent-browser to test the complete flow:
 * 1. Navigate to Fast Agent Panel
 * 2. Create DCF model via natural language
 * 3. Open spreadsheet from response
 * 4. Verify DCF data is visible
 */

import { AgentBrowser } from 'agent-browser';
import * as fs from 'fs';
import * as path from 'path';

const APP_URL = 'http://localhost:5173';
const TIMEOUT = 60000; // 60 seconds

interface TestResult {
  passed: boolean;
  step: string;
  error?: string;
  data?: any;
}

async function runDCFUITest() {
  console.log('🧪 DCF Spreadsheet UI Test');
  console.log('==========================\n');

  const results: TestResult[] = [];
  let browser: AgentBrowser | null = null;

  try {
    // Initialize browser
    console.log('🚀 Launching browser...');
    browser = await AgentBrowser.launch({
      headless: false, // Set to true for CI/CD
      slowMo: 500, // Slow down for visibility
    });

    console.log('✅ Browser launched\n');

    // Step 1: Navigate to app
    console.log('📍 Step 1: Navigate to application');
    await browser.goto(APP_URL);
    await browser.waitForTimeout(2000);

    // Take screenshot
    await browser.screenshot({ path: 'test-screenshots/01-home.png' });
    console.log('✅ Navigated to app\n');
    results.push({ passed: true, step: 'Navigate to app' });

    // Step 2: Navigate to Fast Agent Panel
    console.log('📍 Step 2: Open Fast Agent Panel');

    // Try clicking the Fast Agent link in sidebar
    const fastAgentButton = await browser.locator('text=Fast Agent').first();
    if (await fastAgentButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fastAgentButton.click();
      await browser.waitForTimeout(1000);
    } else {
      // Try navigating directly
      await browser.goto(`${APP_URL}/agent/fast`);
      await browser.waitForTimeout(2000);
    }

    await browser.screenshot({ path: 'test-screenshots/02-fast-agent.png' });
    console.log('✅ Opened Fast Agent Panel\n');
    results.push({ passed: true, step: 'Open Fast Agent Panel' });

    // Step 3: Send DCF creation request
    console.log('📍 Step 3: Send DCF creation request');
    const inputSelector = 'textarea[placeholder*="Ask"], input[placeholder*="Ask"], textarea, input[type="text"]';

    const input = await browser.locator(inputSelector).last();
    await input.fill('Build a DCF model for NVIDIA');
    await browser.waitForTimeout(500);

    // Press Enter or click send button
    await input.press('Enter');

    console.log('✅ Sent: "Build a DCF model for NVIDIA"');
    console.log('⏳ Waiting for agent response (up to 30s)...\n');

    // Wait for response with spreadsheet link
    let spreadsheetId: string | null = null;
    const maxWaitTime = 30000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      await browser.waitForTimeout(2000);

      // Look for spreadsheet link in the page
      const pageContent = await browser.content();
      const spreadsheetMatch = pageContent.match(/#spreadsheets\/([a-z0-9]+)/);

      if (spreadsheetMatch) {
        spreadsheetId = spreadsheetMatch[1];
        console.log(`✅ Found spreadsheet ID: ${spreadsheetId}\n`);
        break;
      }

      // Check for error messages
      if (pageContent.includes('❌') || pageContent.includes('Failed')) {
        const errorMatch = pageContent.match(/Error:([^<\n]+)/);
        throw new Error(`Agent failed: ${errorMatch?.[1] || 'Unknown error'}`);
      }
    }

    if (!spreadsheetId) {
      throw new Error('Spreadsheet creation timeout - no spreadsheet ID found after 30s');
    }

    await browser.screenshot({ path: 'test-screenshots/03-agent-response.png' });
    results.push({
      passed: true,
      step: 'Create DCF model',
      data: { spreadsheetId }
    });

    // Step 4: Navigate to spreadsheet
    console.log('📍 Step 4: Open spreadsheet');
    await browser.goto(`${APP_URL}/spreadsheets/${spreadsheetId}`);
    await browser.waitForTimeout(3000);

    await browser.screenshot({ path: 'test-screenshots/04-spreadsheet-view.png' });
    console.log('✅ Navigated to spreadsheet\n');
    results.push({ passed: true, step: 'Open spreadsheet' });

    // Step 5: Verify DCF data is visible
    console.log('📍 Step 5: Verify DCF data');
    const pageContent = await browser.content();

    const expectedData = [
      'NVDA DCF Model',
      'Fair Value',
      'WACC',
      'Growth',
      'Enterprise Value',
      'Revenue'
    ];

    const foundData: string[] = [];
    const missingData: string[] = [];

    for (const data of expectedData) {
      if (pageContent.includes(data)) {
        foundData.push(data);
        console.log(`  ✅ Found: ${data}`);
      } else {
        missingData.push(data);
        console.log(`  ❌ Missing: ${data}`);
      }
    }

    await browser.screenshot({ path: 'test-screenshots/05-dcf-data.png' });

    if (missingData.length === 0) {
      console.log('\n✅ All DCF data verified\n');
      results.push({ passed: true, step: 'Verify DCF data' });
    } else {
      throw new Error(`Missing DCF data: ${missingData.join(', ')}`);
    }

    // Step 6: Test cell editing (optional - advanced)
    console.log('📍 Step 6: Test cell editing');

    // Try to find and click on a growth rate cell
    const cell = await browser.locator('text=10.0').first();
    if (await cell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cell.click();
      await browser.waitForTimeout(500);

      // Try to edit (this might require more specific selectors)
      await browser.keyboard.type('15.0');
      await browser.keyboard.press('Enter');
      await browser.waitForTimeout(3000);

      await browser.screenshot({ path: 'test-screenshots/06-after-edit.png' });
      console.log('✅ Cell edit attempted\n');
      results.push({ passed: true, step: 'Test cell editing' });
    } else {
      console.log('⚠️  Cell editing skipped (cell not found)\n');
      results.push({ passed: false, step: 'Test cell editing', error: 'Cell not found' });
    }

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 Test Summary');
    console.log('═══════════════════════════════════════\n');

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    console.log(`Total Steps: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}\n`);

    results.forEach((result, i) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} Step ${i + 1}: ${result.step}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.data) {
        console.log(`   Data: ${JSON.stringify(result.data)}`);
      }
    });

    console.log('\n📸 Screenshots saved to: test-screenshots/');
    console.log('═══════════════════════════════════════\n');

    // Save results to JSON
    const resultsPath = path.join(process.cwd(), 'test-results', 'dcf-ui-test-results.json');
    fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total,
        passed,
        failed: total - passed,
        successRate: `${Math.round((passed / total) * 100)}%`
      }
    }, null, 2));

    console.log(`📄 Results saved to: ${resultsPath}\n`);

    return passed === total;

  } catch (error: any) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);

    if (browser) {
      await browser.screenshot({ path: 'test-screenshots/error.png' });
      console.log('\n📸 Error screenshot saved to: test-screenshots/error.png');
    }

    return false;
  } finally {
    if (browser) {
      console.log('\n🧹 Cleaning up...');
      await browser.close();
      console.log('✅ Browser closed\n');
    }
  }
}

// Create screenshots directory
const screenshotsDir = path.join(process.cwd(), 'test-screenshots');
fs.mkdirSync(screenshotsDir, { recursive: true });

// Run the test
runDCFUITest()
  .then(success => {
    if (success) {
      console.log('🎉 All tests passed!\n');
      process.exit(0);
    } else {
      console.log('💥 Some tests failed\n');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  });
