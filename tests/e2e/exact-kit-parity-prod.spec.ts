/**
 * Tier B verification: all 5 cockpit surfaces render the kit's pixel-perfect
 * Exact* surfaces on production.  Probes for kit-specific DOM signals that
 * only the ExactKit JSX produces.
 */

import { test, expect } from "@playwright/test";

const BASE_URL =
  process.env.BASE_URL?.replace(/\/$/, "") ?? "https://www.nodebenchai.com";

async function navigate(page: import("@playwright/test").Page, surface: string) {
  await page.goto(`${BASE_URL}/?surface=${surface}`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForTimeout(5000);
}

test("PR A4: Home renders ExactHomeSurface composer hero", async ({ page }) => {
  await navigate(page, "ask");
  const result = await page.evaluate(() => ({
    composer: !!document.querySelector('[data-testid="exact-web-home-composer"]'),
    kicker: !!Array.from(document.querySelectorAll(".nb-kicker")).find((el) =>
      el.textContent?.toLowerCase().includes("entity intelligence"),
    ),
    h1: Array.from(document.querySelectorAll(".nb-composer-hero h1")).map((h) => h.textContent?.trim()),
    lanes: Array.from(document.querySelectorAll(".nb-lane")).map((b) => b.textContent?.trim().slice(0, 20)),
  }));
  console.log("HOME:", JSON.stringify(result, null, 2));
  expect(result.composer).toBe(true);
  expect(result.kicker).toBe(true);
  expect(result.h1).toContain("What are we researching today?");
  expect(result.lanes.length).toBeGreaterThanOrEqual(3);
});

test("PR A6: Home renders full kit HomePulse layout", async ({ page }) => {
  await navigate(page, "ask");
  const result = await page.evaluate(() => ({
    pulseStrip: !!document.querySelector('[data-testid="exact-home-pulse-strip"]'),
    pulseHeroCards: document.querySelectorAll(".nb-pulse-card").length,
    pulseMiniCards: document.querySelectorAll(".nb-pulse-mini").length,
    todayIntel: !!document.querySelector('[data-testid="exact-home-today-intel"]'),
    todayLanes: document.querySelectorAll(".nb-today-lane").length,
    activeEvent: !!document.querySelector('[data-testid="exact-home-active-event"]'),
    eventStats: document.querySelectorAll(".nb-event-stat").length,
    recentReports: !!document.querySelector('[data-testid="exact-home-recent-reports"]'),
    recentCards: document.querySelectorAll(".nb-recent-card").length,
  }));
  console.log("HOME PULSE:", JSON.stringify(result, null, 2));
  expect(result.pulseStrip, "PulseStrip section should render").toBe(true);
  expect(result.pulseHeroCards, "4 hero metric cards").toBeGreaterThanOrEqual(4);
  expect(result.pulseMiniCards, "6 secondary mini cards").toBeGreaterThanOrEqual(6);
  expect(result.todayIntel, "Today's intelligence section").toBe(true);
  expect(result.todayLanes, "4 today lanes").toBeGreaterThanOrEqual(4);
  expect(result.activeEvent, "Active event section").toBe(true);
  expect(result.eventStats, "4 event stats").toBeGreaterThanOrEqual(4);
  expect(result.recentReports, "Recent reports section").toBe(true);
  expect(result.recentCards, "3 recent report cards").toBeGreaterThanOrEqual(3);
});

test("PR A5: Chat renders ExactChatSurface answer packet", async ({ page }) => {
  await navigate(page, "workspace");
  const result = await page.evaluate(() => ({
    answer: !!document.querySelector('[data-testid="exact-web-chat-answer"]'),
    answerBadge: !!Array.from(document.querySelectorAll(".nb-badge-accent")).find((el) =>
      el.textContent?.toLowerCase().includes("answer packet"),
    ),
    sources: document.querySelectorAll(".nb-source-card").length,
    followups: document.querySelectorAll(".nb-followup-chip").length,
  }));
  console.log("CHAT:", JSON.stringify(result, null, 2));
  expect(result.answer).toBe(true);
  expect(result.answerBadge).toBe(true);
  expect(result.sources).toBeGreaterThan(0);
  expect(result.followups).toBeGreaterThan(0);
});

test("PR A2: Reports renders ExactReportsSurface card grid", async ({ page }) => {
  await navigate(page, "reports");
  const result = await page.evaluate(() => ({
    grid: !!document.querySelector(".nb-reports-grid"),
    rcards: document.querySelectorAll(".nb-rcard").length,
    exactCards: document.querySelectorAll('[data-exact-testid="exact-report-card"]').length,
    actionRows: document.querySelectorAll('[data-testid="report-card-actions"]').length,
  }));
  console.log("REPORTS:", JSON.stringify(result, null, 2));
  expect(result.grid).toBe(true);
  expect(result.rcards).toBeGreaterThan(0);
  expect(result.exactCards).toBeGreaterThan(0);
  expect(result.actionRows).toBeGreaterThan(0);
});

test("PR A1: Inbox renders ExactInboxSurface single-column rows", async ({ page }) => {
  await navigate(page, "nudges");
  const result = await page.evaluate(() => ({
    head: !!document.querySelector(".nb-inbox-head"),
    filterPills: Array.from(document.querySelectorAll(".nb-inbox-filter button")).map((b) =>
      (b.textContent ?? "").trim().split(/\s+/)[0],
    ),
    h1: document.querySelector(".nb-inbox-head h1")?.textContent?.trim(),
    rows: document.querySelectorAll(".nb-ibx-row, .nb-panel").length,
  }));
  console.log("INBOX:", JSON.stringify(result, null, 2));
  expect(result.head).toBe(true);
  expect(result.h1).toBe("Inbox");
  expect(result.filterPills.slice(0, 4)).toEqual(["All", "Act", "Auto", "Watching"]);
});

test("PR A3: Me renders ExactMeSurface 2-pane sidenav", async ({ page }) => {
  await navigate(page, "me");
  const result = await page.evaluate(() => ({
    grid: !!document.querySelector(".nb-me-grid"),
    sidenav: !!document.querySelector(".nb-me-sidenav"),
    profileAvatar: !!document.querySelector(".nb-me-sidenav .av"),
    sectionGroups: Array.from(document.querySelectorAll(".nb-me-sidenav .section-title")).map((el) =>
      el.textContent?.trim(),
    ),
  }));
  console.log("ME:", JSON.stringify(result, null, 2));
  expect(result.grid).toBe(true);
  expect(result.sidenav).toBe(true);
  expect(result.profileAvatar).toBe(true);
  expect(result.sectionGroups).toEqual(["Account", "Preferences", "Workspace"]);
});

test("PR A7: Reports card click renders inline detail (no workspace redirect)", async ({ page }) => {
  // Direct navigation: ?surface=packets&report=disco should render inline detail
  await page.goto(`${BASE_URL}/?surface=packets&report=disco`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForTimeout(5000);

  // 1. Confirm we're STILL on the cockpit host, NOT redirected to workspace.nodebenchai.com
  const url1 = page.url();
  expect(url1, "card-click should NOT redirect to workspace subdomain").not.toContain("workspace.nodebenchai.com");
  expect(url1).toContain("surface=packets");
  expect(url1).toContain("report=disco");

  // 2. Confirm inline detail shell rendered
  const detail = await page.evaluate(() => ({
    detailMount: !!document.querySelector('[data-testid="exact-web-report-detail"]'),
    reportId: document.querySelector('[data-testid="exact-web-report-detail"]')?.getAttribute("data-report-id"),
    breadcrumbCurrent: document.querySelector(".nb-rdetail-crumb-current")?.textContent,
    title: document.querySelector(".nb-rdetail-title")?.textContent,
    eyebrow: document.querySelector(".nb-rdetail-eyebrow")?.textContent,
    sectionCount: document.querySelectorAll(".nb-rdetail-section").length,
    embeddedCard: !!document.querySelector(".nb-rdetail-card"),
    quote: !!document.querySelector(".nb-rdetail-quote"),
    backButton: !!document.querySelector(".nb-rdetail-back"),
    liveBadge: !!document.querySelector(".nb-rdetail-live"),
    askAgentButton: !!Array.from(document.querySelectorAll(".nb-btn")).find((el) =>
      el.textContent?.toLowerCase().includes("ask agent"),
    ),
  }));
  console.log("INLINE DETAIL:", JSON.stringify(detail, null, 2));
  expect(detail.detailMount, "inline detail mount").toBe(true);
  expect(detail.reportId).toBe("disco");
  expect(detail.title).toContain("DISCO");
  expect(detail.sectionCount, "DISCO has 5 sections").toBeGreaterThanOrEqual(5);
  expect(detail.embeddedCard, "Product & moat embedded company card").toBe(true);
  expect(detail.quote, "investment thesis quote").toBe(true);
  expect(detail.backButton).toBe(true);
  expect(detail.liveBadge).toBe(true);
  expect(detail.askAgentButton).toBe(true);

  // 3. Click back, confirm grid renders again
  await page.click(".nb-rdetail-back");
  await page.waitForTimeout(2000);
  const url2 = page.url();
  expect(url2).toContain("surface=packets");
  expect(url2, "back nav should clear ?report").not.toContain("report=");
  const back = await page.evaluate(() => ({
    grid: !!document.querySelector(".nb-reports-grid"),
    rcards: document.querySelectorAll(".nb-rcard").length,
  }));
  console.log("AFTER BACK:", JSON.stringify(back, null, 2));
  expect(back.grid).toBe(true);
  expect(back.rcards).toBeGreaterThanOrEqual(3);
});
