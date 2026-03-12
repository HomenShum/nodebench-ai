import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:4182";
const routes = [
  "/timeline",
  "/roadmap",
  "/showcase",
  "/entity/OpenAI",
  "/cost",
  "/industry",
  "/funding",
  "/analytics/hitl",
  "/analytics/recommendations",
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const results = [];
for (const route of routes) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);

  const hasShell = (await page.locator(".nb-page-shell").count()) > 0;
  const hasMinHScreen = (await page.locator(".min-h-screen").count()) > 0;
  const heading = ((await page.locator("h1").first().textContent().catch(() => "")) || "").trim();

  results.push({
    route,
    hasShell,
    hasMinHScreen,
    heading,
  });
}

console.log(JSON.stringify(results, null, 2));

await browser.close();
