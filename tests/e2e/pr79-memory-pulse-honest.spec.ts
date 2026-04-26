/**
 * Tier B regression spec for PR #79 — Memory Pulse honest count.
 *
 * After PR #79 (commit e0bfdb33), the MemoryPulse band on Home counts
 * only user-created savedReports, not visibleReports (which includes
 * 3 system-intelligence cards everyone sees).  A brand-new anonymous
 * session has zero saved reports, so the band must NOT render.
 *
 * Defaults to production www.nodebenchai.com.  Override with BASE_URL.
 */

import { test, expect } from "@playwright/test";

const BASE_URL =
  process.env.BASE_URL?.replace(/\/$/, "") ?? "https://www.nodebenchai.com";

test("PR #79: Memory Pulse hidden for anonymous user with 0 saved reports", async ({ page }) => {
  await page.goto(`${BASE_URL}/?surface=ask`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForTimeout(8000);

  const result = await page.evaluate(() => ({
    memoryPulseRendered: !!document.querySelector('[aria-label="Memory pulse"]'),
    inDomString: document.body.innerHTML.includes("Memory pulse"),
    eyebrowEntityIntelligence: !!Array.from(document.querySelectorAll("div")).find(
      (d) => d.textContent?.trim() === "ENTITY INTELLIGENCE",
    ),
  }));

  console.log("PR79 Memory Pulse honest:", JSON.stringify(result, null, 2));

  // Anonymous user has no saved reports → band must NOT render.
  expect(result.memoryPulseRendered).toBe(false);
  expect(result.inDomString).toBe(false);

  // But the rest of the kit-aligned Home chrome must still render.
  expect(result.eyebrowEntityIntelligence).toBe(true);
});
