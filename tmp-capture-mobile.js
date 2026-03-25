import { chromium, devices } from 'playwright';
import path from 'path';

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['iPhone SE']);
  const page = await context.newPage();
  
  const artifactDir = 'C:/Users/hshum/.gemini/antigravity/brain/38db9226-a12e-4f4a-902e-394fe70c1b09';
  
  const tasks = [
    { name: 'ask', url: 'http://localhost:5173/?surface=ask' },
    { name: 'memo', url: 'http://localhost:5173/?surface=memo' },
    { name: 'research', url: 'http://localhost:5173/?surface=research' },
    { name: 'workspace', url: 'http://localhost:5173/?surface=editor' },
    { name: 'system', url: 'http://localhost:5173/?surface=telemetry' }
  ];

  try {
    for (const task of tasks) {
      console.log(`Navigating to ${task.url}...`);
      await page.goto(task.url, { waitUntil: 'load' });
      // Wait for the labels to be present
      await page.waitForTimeout(3000);
      console.log(`Taking screenshot for ${task.name}...`);
      await page.screenshot({ path: path.join(artifactDir, `mobile_${task.name}.png`), fullPage: true });
    }
    
    // Desktop check
    const desktopPage = await browser.newPage();
    console.log('Navigating to desktop view...');
    await desktopPage.goto('http://localhost:5173/', { waitUntil: 'load' });
    await desktopPage.waitForTimeout(3000);
    console.log('Taking desktop screenshot...');
    await desktopPage.screenshot({ path: path.join(artifactDir, 'desktop_view.png'), fullPage: true });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

run();
