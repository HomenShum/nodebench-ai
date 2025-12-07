import { test, expect, Page } from "@playwright/test";

/**
 * Level 3: Deep Research Tests
 * 
 * Complexity: Complex
 * Goal: 5+ sources, multi-agent delegation, comprehensive dossier
 * Metrics expected: 5-10+ sources, 5-10 tools, 2-3 agents
 */

const BASE_URL = "http://localhost:5173";

test.describe("L3 - Deep Research", () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
  });

  test.afterEach(async () => {
    await page.close();
  });

  test("deep dossier mode produces comprehensive research", async () => {
    const promptInput = page.locator(
      'input[placeholder="Ask anything about companies, markets, or docs..."]'
    );
    
    // Select Deep Dossier mode
    const deepButton = page.locator('text=Deep Dossier');
    await deepButton.click();

    await promptInput.fill("Create a comprehensive dossier on Anthropic including funding history, key executives, products, and competitive positioning");
    
    const runButton = page.locator('button[title="Generate (Cmd+Enter)"]');
    await runButton.click();

    // Wait for deep research to complete (longer timeout)
    await page.waitForSelector('[class*="prose"]', { timeout: 120000 });

    // Verify substantial content
    const content = await page.locator('[class*="prose"]').textContent();
    expect(content?.length).toBeGreaterThan(1000);

    // Verify multiple agents were called
    await page.waitForSelector('text=Reasoning Chain', { timeout: 30000 });
    const metricsText = await page.locator('text=/\\d+ agents/').textContent();
    expect(metricsText).toBeTruthy();
  });

  test("task plan panel shows step-by-step progress", async () => {
    const promptInput = page.locator(
      'input[placeholder="Ask anything about companies, markets, or docs..."]'
    );
    
    // Select Deep Dossier mode
    const deepButton = page.locator('text=Deep Dossier');
    await deepButton.click();

    await promptInput.fill("Research NVIDIA's latest quarterly earnings and compare with AMD");
    
    const runButton = page.locator('button[title="Generate (Cmd+Enter)"]');
    await runButton.click();

    // Wait for task plan panel to appear
    await page.waitForSelector('text=Research Progress', { timeout: 30000 }).catch(() => {
      // May also appear as "Task Plan"
      return page.waitForSelector('text=Task Plan', { timeout: 30000 });
    });

    // Verify progress indicators are shown
    const hasProgressSteps = await page.locator('text=/\\d+ of \\d+ steps/').isVisible().catch(() => false);
    expect(hasProgressSteps).toBeTruthy();
  });

  test("follow-up research appends to existing dossier", async () => {
    const promptInput = page.locator(
      'input[placeholder="Ask anything about companies, markets, or docs..."]'
    );

    // First query
    await promptInput.fill("Tell me about Stripe");
    const runButton = page.locator('button[title="Generate (Cmd+Enter)"]');
    await runButton.click();

    // Wait for initial response
    await page.waitForSelector('[class*="prose"]', { timeout: 60000 });
    const initialContent = await page.locator('[class*="prose"]').textContent();

    // Click Add to Dossier for follow-up
    await promptInput.fill("What about their founding team?");
    const addButton = page.locator('text=Add to Dossier');
    await addButton.first().click();

    // Wait for appended content
    await page.waitForTimeout(5000);
    await page.waitForSelector('[class*="prose"]', { timeout: 60000 });

    // Content should have grown
    const finalContent = await page.locator('[class*="prose"]').textContent();
    expect(finalContent?.length).toBeGreaterThan(initialContent?.length || 0);
  });

  test("newsletter preview formats research properly", async () => {
    const promptInput = page.locator(
      'input[placeholder="Ask anything about companies, markets, or docs..."]'
    );

    await promptInput.fill("Summarize the top 3 AI funding deals this month");
    const runButton = page.locator('button[title="Generate (Cmd+Enter)"]');
    await runButton.click();

    // Wait for response
    await page.waitForSelector('[class*="prose"]', { timeout: 60000 });

    // Navigate to Newsletter Preview tab
    await page.click('text=Newsletter Preview');
    await page.waitForTimeout(1000);

    // Verify newsletter header appears
    const hasHeader = await page.locator('text=NODEBENCH INSIGHTS').isVisible().catch(() => false);
    const hasDigest = await page.locator('text=Your Research Digest').isVisible().catch(() => false);
    
    expect(hasHeader || hasDigest).toBeTruthy();
  });

  test("metrics accumulate across multi-step workflow", async () => {
    const promptInput = page.locator(
      'input[placeholder="Ask anything about companies, markets, or docs..."]'
    );
    
    // Select Deep Dossier mode for comprehensive research
    const deepButton = page.locator('text=Deep Dossier');
    await deepButton.click();

    await promptInput.fill("Create a full dossier on Scale AI with SEC filings, news, and founder research");
    
    const runButton = page.locator('button[title="Generate (Cmd+Enter)"]');
    await runButton.click();

    // Wait for comprehensive response
    await page.waitForSelector('[class*="prose"]', { timeout: 120000 });

    // Verify metrics in reasoning chain
    await page.waitForSelector('text=Reasoning Chain', { timeout: 30000 });
    
    // Should have multiple sources
    const sourcesMatch = await page.locator('text=/[3-9]|\\d{2,} sources/').isVisible().catch(() => false);
    
    // Should have multiple tools
    const toolsMatch = await page.locator('text=/[2-9]|\\d{2,} tools/').isVisible().catch(() => false);
    
    // At least one metric should be substantial
    expect(sourcesMatch || toolsMatch).toBeTruthy();
  });
});
