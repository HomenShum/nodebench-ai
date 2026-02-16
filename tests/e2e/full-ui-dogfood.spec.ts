import { expect, test, type Page } from "@playwright/test";

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/research", name: "research-hub" },
  { path: "/research/overview", name: "research-overview" },
  { path: "/research/signals", name: "research-signals" },
  { path: "/research/briefing", name: "research-briefing" },
  { path: "/research/deals", name: "research-deals" },
  { path: "/research/changelog", name: "research-changelog" },
  { path: "/documents", name: "documents" },
  { path: "/spreadsheets", name: "spreadsheets" },
  { path: "/calendar", name: "calendar" },
  { path: "/agents", name: "agents" },
  { path: "/roadmap", name: "roadmap" },
  { path: "/timeline", name: "timeline" },
  { path: "/showcase", name: "showcase" },
  { path: "/footnotes", name: "footnotes" },
  { path: "/signals", name: "signals" },
  { path: "/benchmarks", name: "benchmarks" },
  { path: "/funding", name: "funding" },
  { path: "/activity", name: "activity" },
  { path: "/analytics/hitl", name: "analytics-hitl" },
  { path: "/analytics/components", name: "analytics-components" },
  { path: "/analytics/recommendations", name: "analytics-recommendations" },
  { path: "/cost", name: "cost-dashboard" },
  { path: "/industry", name: "industry-updates" },
  { path: "/for-you", name: "for-you-feed" },
  { path: "/recommendations", name: "document-recommendations" },
  { path: "/marketplace", name: "agent-marketplace" },
  { path: "/github", name: "github-explorer" },
  { path: "/pr-suggestions", name: "pr-suggestions" },
  { path: "/linkedin", name: "linkedin-posts" },
  { path: "/mcp/ledger", name: "mcp-ledger" },
  { path: "/public", name: "public-docs" },
];

async function signInIfPrompted(page: Page) {
  const signInButton = page.getByRole("button", { name: /sign in anonymously|sign in/i }).first();
  if (await signInButton.count()) {
    await signInButton.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
  }
}

test.describe("Full UI Dogfood", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "nodebench-theme",
        JSON.stringify({
          mode: "dark",
          accentColor: "indigo",
          density: "comfortable",
          fontFamily: "Inter",
          backgroundPattern: "none",
          reducedMotion: false,
        }),
      );
      localStorage.setItem("theme", "dark");
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Convex backend not configured")).toHaveCount(0);
    await signInIfPrompted(page);
    await expect(page.locator("#main-content")).toBeVisible();
  });

  for (const route of ROUTES) {
    test(`dogfood route: ${route.name}`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1200);
      await expect(page.getByText("Something went wrong")).toHaveCount(0);
      await page.screenshot({
        path: `test-results/full-ui-dogfood/${route.name}.png`,
        fullPage: true,
      });
    });
  }

  test("dogfood settings modal tabs", async ({ page }) => {
    const settingsTrigger = page.getByTestId("open-settings");
    await expect(settingsTrigger).toBeVisible();
    await settingsTrigger.click();
    await page.waitForTimeout(400);

    const tabs = [
      "Profile",
      "Account",
      "Preferences",
      "Usage",
      "Integrations",
      "Billing",
      "Reminders",
      "Channels",
    ];

    for (const tab of tabs) {
      const tabButton = page.getByRole("button", { name: tab }).first();
      if (await tabButton.count()) {
        await tabButton.click({ force: true });
        await page.waitForTimeout(350);
        await page.screenshot({
          path: `test-results/full-ui-dogfood/settings-${tab.toLowerCase()}.png`,
          fullPage: false,
        });
      }
    }
  });

  test("dogfood command palette", async ({ page }) => {
    const openBtn = page.getByTestId("open-command-palette");
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible();
    await page.screenshot({
      path: "test-results/full-ui-dogfood/command-palette.png",
      fullPage: false,
    });

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    const isMac = await page.evaluate(() => /Mac|iPhone|iPad|iPod/.test(navigator.platform));
    await page.keyboard.press(isMac ? "Meta+K" : "Control+K");
    await expect(dialog).toBeVisible();
  });

  test("dogfood assistant panel", async ({ page }) => {
    const assistantBtn = page.getByRole("button", { name: "Assistant" });
    if (await assistantBtn.count()) {
      await assistantBtn.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(800);
      await expect(page.getByText("Something went wrong")).toHaveCount(0);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/assistant-panel.png",
        fullPage: false,
      });
    }
  });
});
