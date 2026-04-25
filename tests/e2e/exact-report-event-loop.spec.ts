import { expect, test } from "@playwright/test";

const IGNORE_CONSOLE_PATTERNS = [
  /^\[vite\]/,
  /^%cDownload the React DevTools/,
  /^\[NodeBench Analytics\]/,
];

function isIgnorableConsoleMessage(type: string, text: string) {
  if (type === "debug" || type === "info") {
    return IGNORE_CONSOLE_PATTERNS.some((pattern) => pattern.test(text));
  }
  return false;
}

test.describe("Exact kit report event loop", () => {
  test("supports report notebook actions, relationship hops, and CRM export from web reports", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1500, height: 1200 },
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const consoleIssues: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error" || msg.type() === "warning") {
        consoleIssues.push(`${msg.type()}: ${text}`);
        return;
      }
      if (!isIgnorableConsoleMessage(msg.type(), text)) {
        consoleIssues.push(`${msg.type()}: ${text}`);
      }
    });

    page.on("pageerror", (error) => {
      consoleIssues.push(`pageerror: ${error.message}`);
    });

    try {
      await page.goto(
        `${baseURL}/?surface=reports&reportId=disco-diligence&reportTab=notebook&verify=exact-report-event-loop`,
        { waitUntil: "domcontentloaded" },
      );

      await expect(page.getByTestId("report-notebook-editor")).toBeVisible();
      await expect(page.locator(".workspace-shell")).toHaveCount(0);
      await expect(page.getByTestId("relationship-traversal")).toBeVisible();
      await expect(page.getByTestId("crm-export-card")).toBeVisible();

      await page.getByTestId("notebook-action-context").fill(
        "Met Alex from Orbital Labs. Voice agent eval infra, seed, wants healthcare design partners.",
      );
      await page.getByRole("button", { name: /Organize notes/i }).click();
      await expect(page.getByTestId("notebook-action-patch-preview")).toContainText("Grouped 1 captures");
      await page.getByRole("button", { name: /Accept into notebook/i }).click();
      await expect(page.getByTestId("notebook-action-persistence-status")).toContainText("Latest accepted patch");
      await expect(page.getByTestId("report-notebook-editor").getByRole("heading", { name: "Orbital Labs" })).toBeVisible();

      await page.getByTestId("relationship-hop").filter({ hasText: "voice-agent eval infra" }).click();
      await expect(page.getByTestId("relationship-traversal")).toContainText("TA Studio");
      await page.getByTestId("relationship-hop").filter({ hasText: "TA Studio" }).click();
      await expect(page.getByTestId("relationship-traversal")).toContainText("Internal project memory");

      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: /Export CRM CSV/i }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/^nodebench_ship_demo_day_/);
      await expect(page.getByTestId("crm-export-status")).toContainText("CRM export ready");

      expect(consoleIssues).toEqual([]);
    } finally {
      await context.close().catch(() => undefined);
    }
  });
});
