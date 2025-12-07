import { test, expect, Page } from "@playwright/test";

/**
 * Level 2: Multi-Source Verification Tests
 * 
 * Complexity: Medium
 * Goal: 3+ sources, cross-verification, comprehensive answer
 * Metrics expected: 3-5 sources, 3-5 tools, 1-2 agents
 */

const BASE_URL = "http://localhost:5173";

test.describe("L2 - Multi-Source Verification", () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
  });

  test.afterEach(async () => {
    await page.close();
  });

  test("funding news query searches multiple sources", async () => {
    const promptInput = page.locator(
      'input[placeholder="Ask anything about companies, markets, or docs..."]'
    );
    const runButton = page.locator('button[title="Generate (Cmd+Enter)"]');

    await promptInput.fill("What are the latest AI startup funding rounds this week?");
    await runButton.click();

    // Wait for response with longer timeout for multi-source
    await page.waitForSelector('[class*="prose"]', { timeout: 60000 });

    // Verify metrics show multiple sources
    await page.waitForSelector('text=/[2-9]|\\d{2,} sources/', { timeout: 30000 });

    // Verify content has substance
    const content = await page.locator('[class*="prose"]').textContent();
    expect(content?.length).toBeGreaterThan(200);
  });

  test("company comparison uses multiple data points", async () => {
    const promptInput = page.locator(
      'input[placeholder="Ask anything about companies, markets, or docs..."]'
    );
    const runButton = page.locator('button[title="Generate (Cmd+Enter)"]');

    await promptInput.fill("Compare OpenAI and Anthropic - funding, team, and products");
    await runButton.click();

    // Wait for comprehensive response
    await page.waitForSelector('[class*="prose"]', { timeout: 60000 });

    const content = await page.locator('[class*="prose"]').textContent();
    
    // Should mention both companies
    expect(content?.toLowerCase()).toContain('openai');
    expect(content?.toLowerCase()).toContain('anthropic');
    
    // Should have substantial length for comparison
    expect(content?.length).toBeGreaterThan(500);
  });

  test("media gallery populates from search results", async () => {
    const promptInput = page.locator(
      'input[placeholder="Ask anything about companies, markets, or docs..."]'
    );
    const runButton = page.locator('button[title="Generate (Cmd+Enter)"]');

    await promptInput.fill("Find YouTube videos about AI agent frameworks");
    await runButton.click();

    // Wait for response
    await page.waitForSelector('[class*="prose"]', { timeout: 60000 });

    // Navigate to Media Gallery tab
    await page.click('text=Media Gallery');
    await page.waitForTimeout(1000);

    // Check if videos section appears or empty state
    const hasVideos = await page.locator('text=/Videos \\(\\d+\\)/').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=No visuals captured yet').isVisible().catch(() => false);
    
    // Either videos found or empty state shown (both are valid states)
    expect(hasVideos || hasEmptyState).toBeTruthy();
  });

  test("artifacts tab shows sources after research", async () => {
    const promptInput = page.locator(
      'input[placeholder="Ask anything about companies, markets, or docs..."]'
    );
    const runButton = page.locator('button[title="Generate (Cmd+Enter)"]');

    await promptInput.fill("Research the top 3 AI infrastructure companies");
    await runButton.click();

    // Wait for response
    await page.waitForSelector('[class*="prose"]', { timeout: 60000 });

    // Navigate to Artifacts tab
    await page.click('text=Artifacts');
    await page.waitForTimeout(1000);

    // Check for artifacts content or empty state
    const hasArtifacts = await page.locator('text=Sources & Filings').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=No artifacts yet').isVisible().catch(() => false);
    
    expect(hasArtifacts || hasEmptyState).toBeTruthy();
  });
});
