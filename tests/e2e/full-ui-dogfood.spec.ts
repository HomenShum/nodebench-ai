import { expect, test, type Page } from "@playwright/test";

const ROUTES = [
  {
    path: "/?surface=home",
    name: "home",
    readyText: "One question in. Live report out.",
  },
  {
    path: "/?surface=chat&q=ditto%20ai&lens=founder",
    name: "chat",
    readyText: "Answer",
  },
  {
    path: "/?surface=reports",
    name: "reports",
    readyText: "Reusable memory",
  },
  {
    path: "/?surface=nudges",
    name: "nudges",
    readyText: "Nudges feed",
  },
  {
    path: "/?surface=me",
    name: "me",
    readyText: "What improves the next run",
  },
] as const;

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
  /unsupported command-line flag: --no-sandbox/i,
];
const BENIGN_REQUEST_FAILURE_PATTERNS = [/ERR_ABORTED/i];
const BENIGN_RESPONSE_FAILURE_PATTERNS = [
  /\/favicon\.ico 404$/i,
  /\/dogfood\/walkthrough\.(?:mp4|webm) 404$/i,
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
  const anonymousButton = page.getByRole("button", { name: /sign in anonymously/i }).first();
  if (await anonymousButton.count()) {
    await anonymousButton.click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#main-content", { state: "visible", timeout: 60_000 });
    await page.waitForTimeout(1000);
    return;
  }

  const signInButton = page.getByRole("button", { name: /^sign in$/i }).first();
  if (await signInButton.count()) {
    await signInButton.click();
    await page.waitForTimeout(500);

    const modalAnonymousButton = page.getByRole("button", { name: /sign in anonymously/i }).first();
    if (await modalAnonymousButton.count()) {
      await modalAnonymousButton.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector("#main-content", { state: "visible", timeout: 60_000 });
      await page.waitForTimeout(1000);
    }
  }
}

async function navigateWithinApp(page: Page, targetPath: string) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      let response: Awaited<ReturnType<Page["goto"]>> | null = null;
      try {
        response = await page.goto(targetPath, { waitUntil: "domcontentloaded", timeout: 60_000 });
      } catch {
        response = null;
      }

      const mainShellVisible = await page
        .locator("#main-content")
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (targetPath !== "/" && (!response || response.status() >= 400 || !mainShellVisible)) {
        await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForSelector("#main-content", { state: "visible", timeout: 60_000 });
        await page.evaluate((path) => {
          window.history.pushState({}, "", path);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }, targetPath);
        await page.waitForTimeout(1200);
      }

      await page.waitForSelector("#main-content", { state: "visible", timeout: 20_000 });
      await page.waitForTimeout(900);
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
      await page.waitForTimeout(1200);
    }
  }

  throw lastError;
}

async function ensureSurfaceReady(
  page: Page,
  route: (typeof ROUTES)[number],
) {
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
  await expect(page.locator("#main-content")).toBeVisible({ timeout: 20_000 });
  const desktopNav = page.getByRole("navigation", { name: /primary product navigation/i });
  const mobileNav = page.getByRole("navigation", { name: /mobile navigation/i });
  const hasDesktopNav = await desktopNav.count();
  const hasMobileNav = await mobileNav.count();
  expect(hasDesktopNav + hasMobileNav).toBeGreaterThan(0);
  await expect(page.getByText(route.readyText).first()).toBeVisible({ timeout: 20_000 });
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

  test("dogfood public product routes and interactions", async ({ page }) => {
    test.setTimeout(25 * 60 * 1000);
    const selectedRoutes = shouldIncludeRoutes() ? getSelectedRoutes() : [];
    const includeInteractions = shouldIncludeInteractions();

    const browserIssues: BrowserIssue[] = [];
    let activeRoute = "/";
    const captureIssue = (kind: BrowserIssueKind, detail: string) => {
      if (isBenignBrowserIssue(kind, detail)) {
        return;
      }
      browserIssues.push({ kind, route: activeRoute, detail });
      console.error(`${kind.toUpperCase()}:`, detail);
    };

    page.on("pageerror", (error) => {
      captureIssue("pageerror", error?.message ?? String(error));
    });
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      captureIssue("console", msg.text());
    });
    page.on("requestfailed", (request) => {
      const detail = `${request.url()} ${request.failure()?.errorText ?? ""}`.trim();
      captureIssue("requestfailed", detail);
    });
    page.on("response", (response) => {
      if (response.status() < 400) return;
      captureIssue("response", `${response.url()} ${response.status()}`);
    });

    activeRoute = "/";
    await page.goto("/", { waitUntil: "networkidle" });
    await resetBrowserStorage(page);
    await page.evaluate(() => {
      localStorage.setItem("nodebench-onboarded", "1");
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
    await signInIfPrompted(page);
    await expect(page.locator("#main-content")).toBeVisible({ timeout: 60_000 });

    for (const variant of VARIANTS) {
      await page.setViewportSize(variant.viewport);
      await setTheme(page, variant.theme);
      activeRoute = "/";
      await page.goto("/", { waitUntil: "networkidle" });
      await page.waitForTimeout(900);

      for (const route of selectedRoutes) {
        activeRoute = route.path;
        await navigateWithinApp(page, route.path);
        await ensureSurfaceReady(page, route);
        await page.screenshot({
          path: `test-results/full-ui-dogfood/${route.name}${variant.suffix}.png`,
          fullPage: true,
        });
      }
    }

    if (includeInteractions) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await setTheme(page, "dark");

      activeRoute = "/?surface=home";
      await navigateWithinApp(page, "/?surface=home");
      const homeInput = page.getByLabel("Ask anything or upload anything").first();
      await expect(homeInput).toBeVisible({ timeout: 20_000 });
      await homeInput.fill("What does Ditto AI do and what matters most right now?");
      await page.getByRole("button", { name: /^ask$/i }).first().click();
      await page.waitForTimeout(2500);
      await expect(page).toHaveURL(/surface=chat/, { timeout: 20_000 });
      await expect(page.getByLabel("Continue the live session").first()).toBeVisible({ timeout: 20_000 });
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-home-to-chat.png",
        fullPage: true,
      });

      const themeToggle = page.getByRole("button", { name: /switch to (light|dark) mode/i }).first();
      await expect(themeToggle).toBeVisible({ timeout: 20_000 });
      await themeToggle.click();
      await page.waitForTimeout(700);
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-theme-toggle.png",
        fullPage: true,
      });
      await themeToggle.click();
      await page.waitForTimeout(500);

      activeRoute = "/?surface=reports";
      await navigateWithinApp(page, "/?surface=reports");
      const openInChat = page.getByRole("button", { name: /open in chat/i }).first();
      await expect(openInChat).toBeVisible({ timeout: 20_000 });
      await openInChat.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/surface=chat/, { timeout: 20_000 });
      await expect(page.getByLabel("Continue the live session").first()).toBeVisible({ timeout: 20_000 });
      await page.screenshot({
        path: "test-results/full-ui-dogfood/interaction-reports-to-chat.png",
        fullPage: true,
      });
    }

    expect(browserIssues, formatBrowserIssues(browserIssues)).toEqual([]);
  });
});
