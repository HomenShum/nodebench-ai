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
  { path: "/dogfood", name: "dogfood" },
  { path: "/public", name: "public-docs" },
];

/** Theme × viewport variants for comprehensive QA coverage */
const VARIANTS = [
  { theme: "dark", viewport: { width: 1440, height: 900 }, suffix: "" },
  { theme: "light", viewport: { width: 1440, height: 900 }, suffix: "-light" },
  { theme: "dark", viewport: { width: 390, height: 844 }, suffix: "-mobile" },
  { theme: "light", viewport: { width: 390, height: 844 }, suffix: "-mobile-light" },
] as const;

async function signInIfPrompted(page: Page) {
  const signInButton = page.getByRole("button", { name: /sign in anonymously|sign in/i }).first();
  if (await signInButton.count()) {
    await signInButton.click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#main-content", { state: "visible", timeout: 60_000 });
    await page.waitForTimeout(1000);
  }
}

async function ensureNoBlockingModal(page: Page) {
  const overlay = page.locator("div.fixed.inset-0.z-50");
  for (let i = 0; i < 6; i++) {
    if (!(await overlay.count())) return;

    const closeTestId = page.getByTestId("close-settings");
    if (await closeTestId.count()) {
      await closeTestId.click({ force: true });
      await page.waitForTimeout(250);
      continue;
    }

    const closeBtn = page.getByRole("button", { name: /close|cancel|dismiss|done/i }).first();
    if (await closeBtn.count()) {
      await closeBtn.click({ force: true });
      await page.waitForTimeout(250);
      continue;
    }

    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  }
}

async function setTheme(page: Page, theme: "dark" | "light") {
  await page.evaluate((t) => {
    localStorage.setItem(
      "nodebench-theme",
      JSON.stringify({
        mode: t,
        accentColor: "indigo",
        density: "comfortable",
        fontFamily: "Inter",
        backgroundPattern: "none",
        reducedMotion: false,
      }),
    );
    localStorage.setItem("theme", t);
  }, theme);
}

test.describe("Full UI Dogfood", () => {
  test("dogfood all routes — dark/light × desktop/mobile", async ({ page }) => {
    // 4 variants × ~37 routes + interactions ≈ 20 min
    test.setTimeout(30 * 60 * 1000);

    // Set initial dark theme via evaluate (not addInitScript — that overrides on every nav)
    page.on('pageerror', error => console.error('BROWSER ERROR:', error));
    page.on('console', msg => {
      if (msg.type() === 'error') console.error('BROWSER CONSOLE ERROR:', msg.text());
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
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
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Convex backend not configured")).toHaveCount(0);
    await signInIfPrompted(page);
    await expect(page.locator("#main-content")).toBeVisible({ timeout: 30_000 });

    // ─── Capture all routes for each variant ───────────────────────────
    for (const variant of VARIANTS) {
      await page.setViewportSize(variant.viewport);
      await setTheme(page, variant.theme);
      // Reload to apply theme fully
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(600);

      for (const route of ROUTES) {
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1200);
        await expect(page.getByText("Something went wrong")).toHaveCount(0);
        await page.screenshot({
          path: `test-results/full-ui-dogfood/${route.name}${variant.suffix}.png`,
          fullPage: true,
        });
      }
    }

    // ─── Interaction captures (desktop dark only — primary variant) ────
    await page.setViewportSize({ width: 1440, height: 900 });
    await setTheme(page, "dark");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);

    await ensureNoBlockingModal(page);

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

    await page.keyboard.press("Escape");
    await page.waitForTimeout(350);
    await ensureNoBlockingModal(page);

    // Command palette
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
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);

    // Assistant panel
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    const assistantBtn = page.getByRole("button", { name: "Assistant" }).first();
    if (await assistantBtn.count()) {
      await assistantBtn.click({ force: true });
      await page.waitForTimeout(900);
      await expect(page.getByText("Something went wrong")).toHaveCount(0);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/assistant-panel.png",
        fullPage: false,
      });
      // Close assistant
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }

    // ─── Deep interaction captures — real user behavior scenarios ───────
    // These test popups, drawers, hover states, and input flows
    // that only surface during actual human interaction depth.

    // 1. Agent panel — open, type a message, capture thread view
    await page.goto("/agents", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const agentInput = page.locator("input[placeholder*='Ask anything'], textarea[placeholder*='Ask anything']").first();
    if (await agentInput.count()) {
      await agentInput.click();
      await agentInput.fill("Show me the latest research signals");
      await page.waitForTimeout(400);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-agent-input.png",
        fullPage: false,
      });
    }

    // 2. Calendar — click a date to open event popover/editor
    await page.goto("/calendar", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const calendarDay = page.locator("div[role='button'][aria-pressed]").first();
    if (await calendarDay.count()) {
      await calendarDay.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-calendar-click.png",
        fullPage: false,
      });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }

    // 3. Research Hub — hover on entity links to trigger hover preview
    await page.goto("/research", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const entityLink = page.locator("button.border-b-2.border-dashed").first();
    if (await entityLink.count()) {
      await entityLink.hover();
      await page.waitForTimeout(600);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-entity-hover.png",
        fullPage: false,
      });
    }

    // 4. Research Briefing — click a signal card to expand details
    await page.goto("/research/briefing", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const signalCard = page.locator("button[aria-expanded][type='button']").first();
    if (await signalCard.count()) {
      await signalCard.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-signal-expanded.png",
        fullPage: false,
      });
    }

    // 5. Documents — hover a document card for preview
    await page.goto("/documents", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const docCard = page.locator("div[draggable='true']").first();
    if (await docCard.count()) {
      await docCard.hover();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-document-hover.png",
        fullPage: false,
      });
    }

    // 6. GitHub Explorer — click a repo link
    await page.goto("/github", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const repoLink = page.locator("a[href*='github.com'][target='_blank']").first();
    if (await repoLink.count()) {
      await repoLink.hover();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-github-hover.png",
        fullPage: false,
      });
    }

    // 7. Funding Brief — click a deal entry in list panel
    await page.goto("/funding", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const dealBtn = page.locator("button[type='button'].w-full.text-left").first();
    if (await dealBtn.count()) {
      await dealBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-funding-deal.png",
        fullPage: false,
      });
    }

    // 8. Search input on home — type and see suggestions
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    const searchInput = page.locator("input[placeholder*='Ask anything']").first();
    if (await searchInput.count()) {
      await searchInput.click();
      await searchInput.fill("AI agents");
      await page.waitForTimeout(500);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-search-suggestions.png",
        fullPage: false,
      });
    }

    // 9. Tooltip / hover state on sidebar nav items
    const sidebarItem = page.locator("nav button, nav a").nth(2);
    if (await sidebarItem.count()) {
      await sidebarItem.hover();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-sidebar-hover.png",
        fullPage: false,
      });
    }

    // ─── Deep agent interaction captures ─────────────────────────────────
    // Real human use scenarios: querying agent, streaming outputs, panels

    // 10. FastAgentPanel — full chat interaction flow
    await page.goto("/agents", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    // Try to open the FastAgent panel via FAB or inline trigger
    const fabBtn = page.locator("button[aria-label*='Agent'], button[aria-label*='agent']").first();
    if (await fabBtn.count()) {
      await fabBtn.click();
      await page.waitForTimeout(800);
    }
    // Find the chat input (textarea or input with message placeholder)
    const chatInput = page.locator("textarea[placeholder*='Message'], textarea[placeholder*='message'], textarea[placeholder*='Ask'], input[placeholder*='Message']").first();
    if (await chatInput.count()) {
      await chatInput.click();
      await chatInput.fill("Analyze the latest AI model benchmarks and compare Claude vs GPT performance");
      await page.waitForTimeout(300);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-agent-query-typed.png",
        fullPage: false,
      });
      // Submit the query (press Enter)
      await chatInput.press("Enter");
      await page.waitForTimeout(2000);
      // Capture the streaming/response state
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-agent-response-stream.png",
        fullPage: false,
      });
    }

    // 11. FastAgentPanel — thread management (switch threads, create new)
    const threadTab = page.locator("[data-thread-id], .thread-item, [role='tab']").first();
    if (await threadTab.count()) {
      await threadTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-agent-thread-switch.png",
        fullPage: false,
      });
    }

    // 12. FastAgentPanel — skills panel / settings
    const agentSettingsBtn = page.locator("button:has-text('Settings'), button:has-text('Skills'), button[aria-label*='settings']").first();
    if (await agentSettingsBtn.count()) {
      await agentSettingsBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-agent-settings.png",
        fullPage: false,
      });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }

    // 13. Swarm lanes / live agent lanes — observe multi-agent execution
    await page.goto("/agents/live", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const laneCard = page.locator("[class*='lane'], [class*='agent-card'], [class*='rounded-xl'][class*='border']").first();
    if (await laneCard.count()) {
      await laneCard.hover();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-swarm-lanes.png",
        fullPage: false,
      });
    }

    // 14. Dogfood review gallery — navigate frames and video
    await page.goto("/dogfood", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    // Click a frame thumbnail to select it
    const frameThumbnail = page.locator("button:has(img), [class*='aspect-'][class*='rounded']").first();
    if (await frameThumbnail.count()) {
      await frameThumbnail.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-dogfood-frame-selected.png",
        fullPage: false,
      });
    }

    // 15. Dogfood QA results panel — check score display and issue list
    const qaScoreEl = page.locator("[class*='score']").first();
    if (await qaScoreEl.count()) {
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-dogfood-qa-score.png",
        fullPage: false,
      });
    }

    // 16. Task manager — hover task card for details
    await page.goto("/activity", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const taskCard = page.locator("[class*='task-card'], [class*='session-card'], div[class*='rounded-lg border'][class*='p-4']").first();
    if (await taskCard.count()) {
      await taskCard.hover();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-task-hover.png",
        fullPage: false,
      });
      await taskCard.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-task-expanded.png",
        fullPage: false,
      });
    }

    // 17. Analytics — hover chart data points for tooltips
    await page.goto("/analytics/recommendations", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const chartArea = page.locator("svg .recharts-bar-rectangle, svg rect[class*='recharts'], svg .recharts-line-dot").first();
    if (await chartArea.count()) {
      await chartArea.hover();
      await page.waitForTimeout(400);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-analytics-tooltip.png",
        fullPage: false,
      });
    }

    // 18. MCP Ledger — expand a tool row for details
    await page.goto("/mcp/ledger", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const toolRow = page.locator("tr[role='row'], div[role='row']").first();
    if (await toolRow.count()) {
      await toolRow.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-mcp-tool-expanded.png",
        fullPage: false,
      });
    }

    // 19. Keyboard shortcut discovery — press ? to show shortcuts overlay
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    await page.keyboard.press("?");
    await page.waitForTimeout(500);
    const shortcutsOverlay = page.locator("[role='dialog'], [class*='shortcuts'], [class*='overlay']").first();
    if (await shortcutsOverlay.count()) {
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-keyboard-shortcuts.png",
        fullPage: false,
      });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }
  });
});
