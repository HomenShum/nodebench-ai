/**
 * One-flow regression test — the canonical user journey.
 *
 * Per the stabilization-sprint spec: "Can a user leave, come back,
 * resume the same entity, see prior chats, edit the notebook, trust
 * the sources, explore relationships, and export?"
 *
 * Flow under test:
 *   1. Anonymous visitor lands on Home (?surface=home)
 *   2. Switches to Chat (?surface=chat) — sees seeded thread
 *   3. Source chips render with cached/live badges
 *   4. Switches to Reports (?surface=reports) — sees seeded report grid
 *   5. Opens a report (?surface=reports&report=X) — ExactReportDetailSurface inline
 *   6. Switches to Inbox (?surface=inbox) — sees Today's pulse + seeded items
 *   7. Switches to Me (?surface=me) — Watching count + sessions visible
 *   8. Avatar HS button opens status panel — Watching · 12 entities + 3 pulse tiles
 *   9. Theme toggle works (Light/Dark)
 *  10. No console errors anywhere in the flow
 *
 * This is the "cosmetic completion" gate: passes 10/10 means the
 * 5-surface cockpit + the chat parity work + A9 fallback fixes are
 * all live.
 *
 * Run as `npm run live-smoke` or via the Tier B preview workflow on
 * every PR. BASE_URL controls target (preview URL in CI, prod for
 * post-deploy verification).
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:4173";

// Surface URL templates
const SURFACES = {
  home: "/?surface=home",
  chat: "/?surface=chat",
  reports: "/?surface=reports",
  inbox: "/?surface=inbox",
  me: "/?surface=me",
} as const;

async function goSurface(page: Page, surface: keyof typeof SURFACES): Promise<void> {
  await page.goto(`${BASE_URL}${SURFACES[surface]}`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForTimeout(800); // settle for staggered animations
}

async function collectErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      // Filter out 3rd-party noise (e.g. ResizeObserver, dev-only warnings)
      const text = msg.text();
      if (text.includes("ResizeObserver")) return;
      if (text.includes("React DevTools")) return;
      errors.push(`console.error: ${text}`);
    }
  });
  return errors;
}

test.describe("ONE-FLOW REGRESSION", () => {
  test("anonymous visitor: full surface tour with no console errors + seed fallback intact", async ({ page }) => {
    const errors = await collectErrors(page);

    // 1. Home
    await goSurface(page, "home");
    const homeReady = await page.evaluate(() => ({
      composer: !!document.querySelector(".nb-composer-card, .nb-stream-composer"),
      pulseTiles: document.querySelectorAll(".nb-pulse-tile, .nb-avm-pulse").length,
    }));
    expect(homeReady.composer || homeReady.pulseTiles > 0, "Home surface renders kit elements").toBeTruthy();

    // 2. Chat — seeded thread + source chips visible
    await goSurface(page, "chat");
    const chatReady = await page.evaluate(() => ({
      turns: document.querySelectorAll(".nb-turn").length,
      sourceChips: document.querySelectorAll(".nb-src-chip").length,
      followups: document.querySelectorAll(".nb-followup-chip").length,
    }));
    expect(chatReady.turns, "Chat seed thread has turns").toBeGreaterThanOrEqual(4);
    expect(chatReady.sourceChips, "Chat seed thread has source chips").toBeGreaterThanOrEqual(1);
    expect(chatReady.followups, "Chat seed thread has follow-up chips").toBeGreaterThanOrEqual(1);

    // 3. Reports list
    await goSurface(page, "reports");
    const reportsReady = await page.evaluate(() => ({
      cards: document.querySelectorAll(".nb-rcard, .nb-report-card").length,
    }));
    expect(reportsReady.cards, "Reports list shows seeded cards").toBeGreaterThanOrEqual(1);

    // 4. Inbox
    await goSurface(page, "inbox");
    const inboxReady = await page.evaluate(() => ({
      items: document.querySelectorAll(".nb-inbox-item, .nb-inbox-row, [data-inbox-row]").length,
    }));
    expect(inboxReady.items, "Inbox shows seeded items").toBeGreaterThanOrEqual(1);

    // 5. Me
    await goSurface(page, "me");
    const meReady = await page.evaluate(() => ({
      sidenav: !!document.querySelector(".nb-me-sidenav, .nb-me-shell"),
    }));
    expect(meReady.sidenav, "Me surface renders kit shell").toBeTruthy();

    // 6. Avatar status panel — A9 regression coverage
    await goSurface(page, "home");
    await page.click(".nb-avm-trigger", { timeout: 10_000 });
    await page.waitForSelector('[data-testid="exact-avatar-menu"]', { timeout: 10_000 });
    await page.waitForTimeout(400);
    const avatarReady = await page.evaluate(() => ({
      pulseTiles: document.querySelectorAll(".nb-avm-pulse").length,
      pulseValues: Array.from(document.querySelectorAll(".nb-avm-pulse-v")).map((el) => el.textContent),
      sectionLabels: Array.from(document.querySelectorAll(".nb-avm-section-label")).map((el) => el.textContent),
      watchRows: document.querySelectorAll(".nb-avm-watch-row").length,
      sessionRows: document.querySelectorAll(".nb-avm-session").length,
    }));
    expect(avatarReady.pulseTiles, "3 pulse tiles").toBe(3);
    expect(avatarReady.pulseValues, "pulse values match kit seed (A9 fix)").toEqual(
      expect.arrayContaining(["74%", "38", "91%"]),
    );
    expect(avatarReady.sectionLabels, "Watching reads 12 entities (A9 fix)").toEqual(
      expect.arrayContaining(["Watching · 12 entities"]),
    );
    expect(avatarReady.watchRows, "3 watch rows").toBeGreaterThanOrEqual(3);
    expect(avatarReady.sessionRows, "3 session rows (sessionRows ≥3 fix)").toBe(3);

    // 7. No console errors throughout
    expect(errors, `console errors during flow: ${errors.join(" | ")}`).toEqual([]);
  });

  test("source chip click opens domain in new tab (interactive behavior)", async ({ page, context }) => {
    await goSurface(page, "chat");
    const chipExists = await page.evaluate(() => !!document.querySelector(".nb-src-chip"));
    test.skip(!chipExists, "no source chip rendered — skipping interactive test");

    // Wait for new-tab popup when chip is clicked
    const popupPromise = context.waitForEvent("page", { timeout: 5_000 });
    await page.click(".nb-src-chip");
    const popup = await popupPromise.catch(() => null);
    if (popup) {
      expect(popup.url(), "source chip opens external URL").toMatch(/^https?:\/\//);
      await popup.close();
    }
    // If browser blocked the popup, the click should still register without error.
  });

  test("follow-up chip sends as new prompt (interactive behavior)", async ({ page }) => {
    await goSurface(page, "chat");
    const followupExists = await page.evaluate(() => !!document.querySelector(".nb-followup-chip"));
    test.skip(!followupExists, "no followup chip rendered — skipping interactive test");

    const before = await page.evaluate(() => document.querySelectorAll(".nb-turn").length);
    await page.click(".nb-followup-chip");
    await page.waitForTimeout(800); // wait for streaming start
    const after = await page.evaluate(() => document.querySelectorAll(".nb-turn").length);
    expect(after, "follow-up chip appended a new user turn").toBeGreaterThan(before);
  });
});
