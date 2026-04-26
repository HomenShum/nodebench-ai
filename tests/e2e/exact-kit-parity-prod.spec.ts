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
