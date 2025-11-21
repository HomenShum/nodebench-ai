import { test, expect, Page } from "@playwright/test";

/**
 * Welcome Landing + Fast Agent Panel smoke tests
 * Aligned to the new router/worker architecture (fast ack + durable workflow kickoff).
 * These are light-weight UI checks to keep the landing experience stable.
 */

const BASE_URL = "http://localhost:5173";

test.describe("Welcome Landing - research entry", () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
  });

  test.afterEach(async () => {
    await page.close();
  });

  test("shows research input and run trigger", async () => {
    const promptInput = page.locator(
      'input[placeholder="Ask anything about companies, markets, or docs..."]'
    );
    const runButton = page.locator('button[title="Generate (Cmd+Enter)"]');

    await expect(promptInput).toBeVisible();
    await expect(runButton).toBeVisible();

    await promptInput.fill("Summarize the latest AI infra funding news");
    await expect(promptInput).toHaveValue("Summarize the latest AI infra funding news");
  });

  test("renders source chips and media/docs empty state", async () => {
    await expect(page.getByText("YCombinator News")).toBeVisible();
    await expect(page.getByText("TechCrunch")).toBeVisible();

    await page.locator("text=Media Gallery").first().scrollIntoViewIfNeeded();
    await expect(page.getByText("No media assets yet")).toBeVisible();
    await expect(
      page.getByText("Run a research query to collect images and documents")
    ).toBeVisible();
  });

  test("run button is wired without console errors on submit", async () => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    const promptInput = page.locator(
      'input[placeholder="Ask anything about companies, markets, or docs..."]'
    );
    const runButton = page.locator('button[title="Generate (Cmd+Enter)"]');

    await promptInput.fill("Check funding + filings for AI infrastructure companies");
    await runButton.click();

    // Allow any toast/streams to settle
    await page.waitForTimeout(1500);
    expect(errors).toHaveLength(0);
  });
});
