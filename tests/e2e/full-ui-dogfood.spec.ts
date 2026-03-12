import { expect, test, type Page } from "@playwright/test";

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/receipts", name: "receipts" },
  { path: "/delegation", name: "delegation" },
  { path: "/investigation", name: "investigation" },
  { path: "/product-direction", name: "product-direction" },
  { path: "/execution-trace", name: "execution-trace" },
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

type BrowserIssueKind = "pageerror" | "console" | "requestfailed" | "response";

type BrowserIssue = {
  kind: BrowserIssueKind;
  route: string;
  detail: string;
};

const BENIGN_PAGE_ERROR_PATTERNS = [/ResizeObserver loop limit exceeded/i];
const BENIGN_CONSOLE_ERROR_PATTERNS = [
  /ResizeObserver loop limit exceeded/i,
  /^Failed to load resource: the server responded with a status of 404 \(Not Found\)$/i,
];
const BENIGN_REQUEST_FAILURE_PATTERNS = [/ERR_ABORTED/i];
const BENIGN_RESPONSE_FAILURE_PATTERNS = [
  /\/benchmarks\/videos\/enterprise-investigation-eval-stream-latest\.webm$/i,
  /\/dogfood\/videos\/agentic-session\.webm$/i,
  /\/dogfood\/videos\/classic-wake-word\.webm$/i,
  /\/dogfood\/videos\/cockpit-wake-word\.webm$/i,
  /\/dogfood\/walkthrough\.mp4$/i,
];

function isBenignBrowserIssue(kind: BrowserIssueKind, detail: string) {
  const patterns =
    kind === "pageerror"
      ? BENIGN_PAGE_ERROR_PATTERNS
      : kind === "console"
        ? BENIGN_CONSOLE_ERROR_PATTERNS
        : kind === "requestfailed"
          ? BENIGN_REQUEST_FAILURE_PATTERNS
          : BENIGN_RESPONSE_FAILURE_PATTERNS;

  return patterns.some((pattern) => pattern.test(detail));
}

function readPositiveIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getSelectedRoutes() {
  const shardTotal = readPositiveIntegerEnv("DOGFOOD_ROUTE_SHARD_TOTAL", 1);
  const shardIndex = Math.min(
    Math.max(readPositiveIntegerEnv("DOGFOOD_ROUTE_SHARD_INDEX", 1), 1),
    shardTotal,
  );

  return ROUTES.filter((_, index) => index % shardTotal === shardIndex - 1);
}

function shouldIncludeInteractions() {
  return process.env.DOGFOOD_INCLUDE_INTERACTIONS !== "false";
}

function shouldIncludeRoutes() {
  return process.env.DOGFOOD_INCLUDE_ROUTES !== "false";
}

async function resetBrowserStorage(page: Page) {
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  });
}

function formatBrowserIssues(issues: BrowserIssue[]) {
  if (issues.length === 0) {
    return "No unexpected browser runtime issues were captured.";
  }

  return issues
    .map((issue, index) => `${index + 1}. [${issue.kind}] ${issue.route}: ${issue.detail}`)
    .join("\n");
}

async function signInIfPrompted(page: Page) {
  const signInButton = page.getByRole("button", { name: /sign in anonymously|sign in/i }).first();
  if (await signInButton.count()) {
    await signInButton.click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#main-content", { state: "visible", timeout: 60_000 });
    await page.waitForTimeout(1000);
  }
}

async function navigateWithinApp(page: Page, targetPath: string) {
  if (targetPath === "/") {
    await page.goto("/", { waitUntil: "domcontentloaded" });
  } else {
    await page.evaluate((path) => {
      history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    }, targetPath);
  }
  await page.waitForSelector("#main-content", { state: "visible", timeout: 60_000 });
  await page.waitForTimeout(900);
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
  test.use({ serviceWorkers: "block" });
  test("dogfood all routes — dark/light × desktop/mobile", async ({ page }) => {
    // 4 variants × ~37 routes + interactions ≈ 20 min
    test.setTimeout(30 * 60 * 1000);
    const selectedRoutes = shouldIncludeRoutes() ? getSelectedRoutes() : [];
    const includeInteractions = shouldIncludeInteractions();

    const browserIssues: BrowserIssue[] = [];
    let activeRoute = "/";
    const captureIssue = (kind: BrowserIssueKind, detail: string) => {
      if (isBenignBrowserIssue(kind, detail)) {
        return;
      }
      browserIssues.push({ kind, route: activeRoute, detail });
    };

    // Set initial dark theme via evaluate (not addInitScript — that overrides on every nav)
    page.on("pageerror", (error) => {
      const detail = error?.message ?? String(error);
      captureIssue("pageerror", detail);
      console.error("BROWSER ERROR:", detail);
    });
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const detail = msg.text();
      captureIssue("console", detail);
      console.error("BROWSER CONSOLE ERROR:", detail);
    });
    page.on("requestfailed", (request) => {
      const detail = `${request.url()} ${request.failure()?.errorText ?? ""}`.trim();
      captureIssue("requestfailed", detail);
      console.error("REQUEST FAILED:", detail);
    });
    page.on("response", (response) => {
      if (response.status() < 400) return;
      const detail = `${response.url()} ${response.status()}`;
      captureIssue("response", detail);
      console.error("HTTP RESPONSE ERROR:", detail);
    });

    console.log('Navigating to root...');
    activeRoute = "/";
    await page.goto("/", { waitUntil: "networkidle" });
    await resetBrowserStorage(page);
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

    activeRoute = "/";
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByText("Convex backend not configured")).toHaveCount(0);

    console.log('Signing in...');
    await signInIfPrompted(page);

    console.log('Waiting for main-content...');
    await expect(page.locator("#main-content")).toBeVisible({ timeout: 60_000 });

    // ─── Capture all routes for each variant ───────────────────────────
    for (const variant of VARIANTS) {
      console.log(`Testing variant: ${variant.theme}${variant.suffix}`);
      await page.setViewportSize(variant.viewport);
      await setTheme(page, variant.theme);
      // Reload to apply theme fully
      activeRoute = "/";
      await page.goto("/", { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);

      for (const route of selectedRoutes) {
        console.log(`  Route: ${route.path}`);
        activeRoute = route.path;
        await navigateWithinApp(page, route.path);
        await page.waitForTimeout(600); // Wait for animations
        await expect(page.getByText("Something went wrong")).toHaveCount(0);
        await page.screenshot({
          path: `test-results/full-ui-dogfood/${route.name}${variant.suffix}.png`,
          fullPage: true,
        });
      }
    }

    // ─── Interaction captures (desktop dark only — primary variant) ────
    if (!includeInteractions) {
      expect(browserIssues, formatBrowserIssues(browserIssues)).toEqual([]);
      return;
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await setTheme(page, "dark");
    activeRoute = "/";
    await navigateWithinApp(page, "/");

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
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    if (await openBtn.count()) {
      await expect(openBtn).toBeVisible();
      await openBtn.click();
    } else {
      const isMac = await page.evaluate(() => /Mac|iPhone|iPad|iPod/.test(navigator.platform));
      await page.keyboard.press(isMac ? "Meta+K" : "Control+K");
    }

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
    activeRoute = "/";
    await navigateWithinApp(page, "/");
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
    activeRoute = "/agents";
    await navigateWithinApp(page, "/agents");
    await page.waitForTimeout(300);
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
    activeRoute = "/calendar";
    await navigateWithinApp(page, "/calendar");
    await page.waitForTimeout(300);
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
    activeRoute = "/research";
    await navigateWithinApp(page, "/research");
    await page.waitForTimeout(300);
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
    activeRoute = "/research/briefing";
    await navigateWithinApp(page, "/research/briefing");
    await page.waitForTimeout(300);
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
    activeRoute = "/documents";
    await navigateWithinApp(page, "/documents");
    await page.waitForTimeout(300);
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
    activeRoute = "/github";
    await navigateWithinApp(page, "/github");
    await page.waitForTimeout(300);
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
    activeRoute = "/funding";
    await navigateWithinApp(page, "/funding");
    await page.waitForTimeout(300);
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
    activeRoute = "/";
    await navigateWithinApp(page, "/");
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
    activeRoute = "/agents";
    await navigateWithinApp(page, "/agents");
    await page.waitForTimeout(400);
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
    activeRoute = "/agents/live";
    await navigateWithinApp(page, "/agents/live");
    await page.waitForTimeout(400);
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
    activeRoute = "/dogfood";
    await navigateWithinApp(page, "/dogfood");
    await page.waitForTimeout(400);
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
    activeRoute = "/activity";
    await navigateWithinApp(page, "/activity");
    await page.waitForTimeout(300);
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
    activeRoute = "/analytics/recommendations";
    await navigateWithinApp(page, "/analytics/recommendations");
    await page.waitForTimeout(300);
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
    activeRoute = "/mcp/ledger";
    await navigateWithinApp(page, "/mcp/ledger");
    await page.waitForTimeout(300);
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
    activeRoute = "/";
    await navigateWithinApp(page, "/");
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

    expect(browserIssues, formatBrowserIssues(browserIssues)).toEqual([]);
  });
});
