/* Motion pass verification — drives the signed-out landing and observes
   computed styles. Usage: node motion-verify/verify.mjs [--reduced] */
import { chromium } from "playwright";

const reduced = process.argv.includes("--reduced");
const tag = reduced ? "reduced" : "full";
const URL = "http://localhost:5301/redesign/chat";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  reducedMotion: reduced ? "reduce" : "no-preference",
  viewport: { width: 1280, height: 900 },
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector(".rd-chat-empty__h", { timeout: 60000 });

// Mid-flight sample: proves the entrance actually animates (full mode) or is
// skipped (reduced mode). Taken as early as possible after the hero mounts.
const midflight = await page.evaluate(() => {
  const el = document.querySelector(".rd-chat-empty__chips");
  const cs = getComputedStyle(el);
  return { opacity: cs.opacity, transform: cs.transform };
});
console.log(`[${tag}] mid-flight chips: opacity=${midflight.opacity} transform=${midflight.transform}`);

await page.waitForTimeout(1600); // all entrances (max delay 220ms + 500ms) settled

// The Rise wrappers are the animated elements: probe the wrapper divs directly.
const results = await page.evaluate(() => {
  const pick = (label, el) => {
    const cs = getComputedStyle(el);
    return { label, opacity: cs.opacity, transform: cs.transform };
  };
  const h = document.querySelector(".rd-chat-empty__h");
  const tagEl = document.querySelector(".rd-chat-empty__tag");
  const chips = document.querySelector(".rd-chat-empty__chips");
  const example = document.querySelector(".rd-chat-empty__example");
  const submit = document.querySelector(".rd-composer-submit");
  return [
    pick("hero-h2-wrapper", h.parentElement),
    pick("tagline-wrapper", tagEl.parentElement),
    pick("chips-container", chips),
    pick("chip-1", document.querySelector(".rd-chat-empty__chip")),
    pick("example-link-wrapper", example.parentElement),
    pick("composer-submit", submit),
  ];
});

let fail = 0;
for (const r of results) {
  // composer-submit is a PressButton, not a Rise: motion owns only its transform.
  // Its opacity is the app's own disabled state (0.55 while the composer is
  // empty, set inline in UniversalComposer.tsx) — pre-existing, not animated.
  const wantOpacity1 = r.label !== "composer-submit";
  const ok =
    (!wantOpacity1 || r.opacity === "1") &&
    (r.transform === "none" || r.transform === "matrix(1, 0, 0, 1, 0, 0)");
  if (!ok) fail++;
  console.log(`[${tag}] ${ok ? "PASS" : "FAIL"} ${r.label}: opacity=${r.opacity} transform=${r.transform}`);
}

await page.screenshot({ path: `motion-verify/landing-${tag}.png`, fullPage: false });
console.log(`[${tag}] screenshot saved: motion-verify/landing-${tag}.png`);

// hover/tap spring check on submit button (full mode only): hover then sample transform
if (!reduced) {
  const chip = await page.$(".rd-chat-empty__chip");
  await chip.hover();
  await page.waitForTimeout(250);
  const hovered = await page.$eval(".rd-chat-empty__chip", (el) => getComputedStyle(el).transform);
  console.log(`[${tag}] chip hover transform: ${hovered} (expect scale ~1.03 matrix)`);
}

await browser.close();
process.exit(fail ? 1 : 0);
