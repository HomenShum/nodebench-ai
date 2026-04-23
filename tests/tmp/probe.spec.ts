import { test } from "@playwright/test";
test("probe", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });
  page.on("requestfailed", (req) => errors.push(`request failed: ${req.url()} ${req.failure()?.errorText}`));
  await page.goto("http://localhost:5173/?surface=chat&lens=investor&q=test&entity=softbank", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  const html = await page.content();
  console.log("=== URL:", page.url());
  console.log("=== Title:", await page.title());
  console.log("=== Body length:", html.length);
  console.log("=== Root innerHTML length:", await page.evaluate(() => (document.querySelector("#root")?.innerHTML?.length ?? 0)));
  console.log("=== First 2000 chars of body:");
  console.log(html.slice(0, 2000));
  console.log("=== Errors captured:");
  for (const e of errors) console.log(e);
});
