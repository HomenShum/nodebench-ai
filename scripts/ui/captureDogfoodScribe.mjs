import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;
    const [k, v] = raw.split("=", 2);
    if (v !== undefined) args.set(k.slice(2), v);
    else args.set(k.slice(2), argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true");
  }
  return args;
}

function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isMacPlatform() {
  return process.platform === "darwin";
}

async function installOverlay(page) {
  await page.addStyleTag({
    content: `
      #__nodebench_scribe_overlay {
        position: fixed;
        bottom: 16px;
        left: 16px;
        z-index: 2147483647;
        background: rgba(0,0,0,0.66);
        border: 1px solid rgba(255,255,255,0.18);
        color: rgba(255,255,255,0.92);
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial;
        font-size: 12px;
        padding: 10px 12px;
        border-radius: 12px;
        backdrop-filter: blur(10px);
        max-width: 64ch;
        box-shadow: 0 16px 60px rgba(0,0,0,0.35);
      }
      #__nodebench_scribe_overlay strong { font-weight: 650; color: white; }
      #__nodebench_scribe_overlay .sub { opacity: 0.9; margin-top: 2px; }
    `,
  });

  await page.evaluate(() => {
    const el = document.createElement("div");
    el.id = "__nodebench_scribe_overlay";
    el.innerHTML = `<strong>Dogfood How-to</strong><div class="sub">Initializing...</div>`;
    document.documentElement.appendChild(el);
  });
}

async function setOverlay(page, title, sub) {
  await page.evaluate(
    ({ title, sub }) => {
      const el = document.getElementById("__nodebench_scribe_overlay");
      if (!el) return;
      el.innerHTML = `<strong>${title}</strong><div class="sub">${sub}</div>`;
    },
    { title, sub },
  );
}

async function setDogfoodLocalStorage(page) {
  await page.addInitScript(() => {
    localStorage.setItem("nodebench-onboarded", "1");
    localStorage.setItem(
      "nodebench-theme",
      JSON.stringify({
        mode: "dark",
        accentColor: "electric-blue",
        density: "comfortable",
        fontFamily: "Manrope Studio",
        backgroundPattern: "spotlight",
        reducedMotion: false,
      }),
    );
    localStorage.setItem("theme", "dark");
  });
}

async function maybeSignIn(page) {
  const anonymousButton = page.getByRole("button", { name: /sign in anonymously/i }).first();
  if (await anonymousButton.count()) {
    await anonymousButton.click();
    await page.waitForLoadState("domcontentloaded");
    // Auth can trigger a client-side refresh; wait for the shell to stabilize.
    await page.waitForSelector("#main-content", { state: "visible", timeout: 60_000 });
    await page.waitForTimeout(900);
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
      await page.waitForTimeout(900);
    }
  }
}

async function waitForAppReady(page) {
  await page.waitForSelector("#main-content", { state: "visible", timeout: 60_000 });
  await page.waitForTimeout(250);
}

async function dismissBlockingModal(page) {
  const overlay = page.locator('div.fixed.inset-0.z-50');
  if (!(await overlay.count())) return false;

  const closeBtn = page.getByRole("button", { name: /close|cancel|dismiss|done/i }).first();
  if (await closeBtn.count()) {
    await closeBtn.click({ force: true });
    await page.waitForTimeout(350);
    return true;
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  return true;
}

async function ensureNoModal(page) {
  for (let i = 0; i < 6; i++) {
    const did = await dismissBlockingModal(page);
    if (!did) return;
  }
}

function describeStep(step) {
  if (step.kind === "route") {
    return `Navigate to ${step.path} to review the ${step.name} screen.`;
  }
  if (step.kind === "interaction" && /home to chat/i.test(step.name)) {
    return "Start from Home, submit a question, and confirm the live Chat session opens with the answer surface active.";
  }
  if (step.kind === "interaction" && /theme toggle/i.test(step.name)) {
    return "Toggle the public shell theme to verify readability and surface consistency in both modes.";
  }
  if (step.kind === "interaction" && /reports to chat/i.test(step.name)) {
    return "Open a saved report and route it back into Chat to confirm the memory-to-execution loop works.";
  }
  return "Review the UI and fix any root-cause issues found.";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseURL = args.get("baseURL") ?? "http://127.0.0.1:5173";
  const showOverlay = (args.get("overlay") ?? process.env.DOGFOOD_OVERLAY ?? "0") === "1";
  const settleMs = Number(args.get("settleMs") ?? 1000);
  const headless = (args.get("headless") ?? "true") !== "false";
  const outRoot = path.resolve(process.cwd(), "public", "dogfood", "scribe");
  await rm(outRoot, { recursive: true, force: true });
  await mkdir(outRoot, { recursive: true });
  const capturedAtIso = new Date().toISOString();
  const userDataDir = path.resolve(process.cwd(), ".tmp", "dogfood-scribe-userdata");
  await rm(userDataDir, { recursive: true, force: true });
  await mkdir(userDataDir, { recursive: true });

  const steps = [
    { kind: "route", path: "/?surface=home", name: "Home" },
    { kind: "route", path: "/?surface=chat&q=ditto%20ai&lens=founder", name: "Chat" },
    { kind: "route", path: "/?surface=reports", name: "Reports" },
    { kind: "route", path: "/?surface=nudges", name: "Nudges" },
    { kind: "route", path: "/?surface=me", name: "Me" },
    { kind: "interaction", path: "(interaction)", name: "Interaction: Home to Chat" },
    { kind: "interaction", path: "(interaction)", name: "Interaction: Theme toggle" },
    { kind: "interaction", path: "(interaction)", name: "Interaction: Reports to Chat" },
  ];

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless,
    viewport: { width: 1440, height: 900 },
    baseURL,
    serviceWorkers: "block",
  });

  const page = await context.newPage();
  await setDogfoodLocalStorage(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await maybeSignIn(page);
  await waitForAppReady(page);
  if (showOverlay) await installOverlay(page);
  await page.waitForTimeout(500);

  const publishedSteps = [];

  for (const [idx, step] of steps.entries()) {
    const stepNum = idx + 1;
    const title = `${stepNum}. ${step.name}`;
    // Overlay updates can race with client-side navigations; retry if needed.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        if (showOverlay) await setOverlay(page, `Step ${stepNum}/${steps.length}`, `${step.name} — ${step.path}`);
        break;
      } catch (err) {
        const msg = String(err?.message ?? err ?? "");
        if (!msg.includes("Execution context was destroyed") || attempt === 2) throw err;
        // eslint-disable-next-line no-await-in-loop
        await page.waitForTimeout(250);
      }
    }

    if (step.kind === "route") {
      await ensureNoModal(page);
      if (step.path === "/?surface=home") {
        await page.goto(step.path, { waitUntil: "domcontentloaded" });
      } else {
        await page.evaluate((targetPath) => {
          history.pushState({}, "", targetPath);
          window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
        }, step.path);
      }
      await waitForAppReady(page);
      await page.waitForTimeout(settleMs);
    } else if (/home to chat/i.test(step.name)) {
      await ensureNoModal(page);
      await page.goto("/?surface=home", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      const homeInput = page.getByLabel("Ask anything or upload anything").first();
      if (await homeInput.count()) {
        await homeInput.fill("What does Ditto AI do and what matters most right now?");
        await page.waitForTimeout(350);
        const askButton = page.getByRole("button", { name: /^ask$/i }).first();
        if (await askButton.count()) {
          await askButton.click();
          await page.waitForTimeout(2200);
        }
      }
    } else if (/theme toggle/i.test(step.name)) {
      await ensureNoModal(page);
      const themeToggle = page.getByRole("button", { name: /switch to (light|dark) mode/i }).first();
      if (await themeToggle.count()) {
        await themeToggle.click();
        await page.waitForTimeout(800);
        await themeToggle.click();
        await page.waitForTimeout(500);
      }
    } else if (/reports to chat/i.test(step.name)) {
      await ensureNoModal(page);
      await page.goto("/?surface=reports", { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      const openInChat = page.getByRole("button", { name: /open in chat/i }).first();
      if (await openInChat.count()) {
        await openInChat.click();
        await page.waitForTimeout(2200);
      }
    }

    const fileBase = `${String(stepNum).padStart(2, "0")}-${slugify(step.name) || "step"}.png`;
    const absPath = path.join(outRoot, fileBase);
    await page.screenshot({ path: absPath, fullPage: false });

    publishedSteps.push({
      index: stepNum,
      kind: step.kind,
      name: step.name,
      path: step.path,
      title,
      description: describeStep(step),
      image: `/dogfood/scribe/${fileBase}`,
    });
  }

  await page.close();
  await context.close();

  const manifest = {
    capturedAtIso,
    baseURL,
    steps: publishedSteps,
  };

  const manifestOut = path.resolve(process.cwd(), "public", "dogfood", "scribe.json");
  await writeFile(manifestOut, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const mdLines = [
    `# NodeBench Dogfood Walkthrough`,
    ``,
    `Captured: ${capturedAtIso}`,
    ``,
    `This is an auto-generated how-to (Scribe-style) artifact: screenshots + editable step text.`,
    ``,
  ];
  for (const s of publishedSteps) {
    mdLines.push(`## ${s.title}`);
    mdLines.push(s.description);
    mdLines.push(``);
    mdLines.push(`![${s.title}](${s.image})`);
    mdLines.push(``);
  }
  const mdOut = path.resolve(process.cwd(), "public", "dogfood", "scribe.md");
  await writeFile(mdOut, mdLines.join("\n"), "utf8");

  // eslint-disable-next-line no-console
  console.log(`Wrote Scribe artifact:\n- public/dogfood/scribe.json\n- public/dogfood/scribe.md\n- public/dogfood/scribe/*.png`);
}

await main();
