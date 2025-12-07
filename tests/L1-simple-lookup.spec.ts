import { test, expect, Page } from "@playwright/test";

/**
 * Level 1: Simple Lookup Tests
 * 
 * Complexity: Basic
 * Goal: Single source, 1-2 tool calls, direct answer
 * Metrics expected: ~1-3 sources, 1-2 tools, 0-1 agents
 */

const BASE_URL = "http://localhost:5173";

test.describe("L1 - Simple Lookup", () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
  });

  test.afterEach(async () => {
    await page.close();
  });

  test("simple company name lookup shows results", async () => {
    const promptInput = page.locator(
      'input[placeholder="Ask anything about companies, markets, or docs..."]'
    );
    const runButton = page.locator('button[title="Generate (Cmd+Enter)"]');

    await promptInput.fill("What is OpenAI?");
    await runButton.click();

    // Wait for response to appear
    await page.waitForSelector('[class*="prose"]', { timeout: 30000 });

    // Verify we got a response
    const content = await page.locator('[class*="prose"]').textContent();
    expect(content?.length).toBeGreaterThan(50);

    // Verify metrics appear in reasoning chain
    await page.waitForSelector('text=/\\d+ sources/', { timeout: 10000 });
    await page.waitForSelector('text=/\\d+ tools/', { timeout: 10000 });
  });

  test("simple factual question returns answer", async () => {
    const promptInput = page.locator(
      'input[placeholder="Ask anything about companies, markets, or docs..."]'
    );
    const runButton = page.locator('button[title="Generate (Cmd+Enter)"]');

    await promptInput.fill("Who founded Tesla?");
    await runButton.click();

    // Wait for response
    await page.waitForSelector('[class*="prose"]', { timeout: 30000 });

    // Should contain Elon Musk reference
    const content = await page.locator('[class*="prose"]').textContent();
    expect(content?.toLowerCase()).toContain('elon');
  });

  test("metrics counter shows sources explored", async () => {
    const promptInput = page.locator(
      'input[placeholder="Ask anything about companies, markets, or docs..."]'
    );
    const runButton = page.locator('button[title="Generate (Cmd+Enter)"]');

    await promptInput.fill("What is YCombinator?");
    await runButton.click();

    // Wait for reasoning chain to appear
    await page.waitForSelector('text=Reasoning Chain', { timeout: 30000 });

    // Click to expand reasoning chain if needed
    const reasoningButton = page.locator('text=Reasoning Chain').first();
    await reasoningButton.click();

    // Verify sources count is visible
    const metricsText = await page.locator('text=/\\d+ sources/').textContent();
    expect(metricsText).toBeTruthy();
  });
});
