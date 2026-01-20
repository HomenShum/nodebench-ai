import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

function stripAnsi(input) {
  return input.replace(/\x1B\[[0-9;]*m/g, "");
}

function waitForReady(proc, { timeoutMs }) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for Vite preview to be ready (${timeoutMs}ms)`));
    }, timeoutMs);

    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      const clean = stripAnsi(buffer);
      if (clean.includes("Local:") || /http:\/\/127\.0\.0\.1:\d+\//.test(clean)) {
        cleanup();
        resolve();
      }
    };

    const onExit = (code) => {
      cleanup();
      reject(new Error(`Vite preview exited early (code ${code ?? "null"})`));
    };

    const cleanup = () => {
      clearTimeout(timeout);
      proc.stdout?.off("data", onData);
      proc.stderr?.off("data", onData);
      proc.off("exit", onExit);
    };

    proc.stdout?.on("data", onData);
    proc.stderr?.on("data", onData);
    proc.on("exit", onExit);
  });
}

const port = process.env.PREVIEW_PORT ?? "4173";
const url = `http://127.0.0.1:${port}/`;
const screenshotPath = process.env.SCREENSHOT_PATH ?? "playwright-report/ui-preview.png";

const preview = spawn(
  "node",
  ["./node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", port, "--strictPort"],
  { stdio: ["ignore", "pipe", "pipe"], env: process.env, shell: false },
);

let previewOutput = "";
preview.stdout?.on("data", (d) => (previewOutput += d.toString("utf8")));
preview.stderr?.on("data", (d) => (previewOutput += d.toString("utf8")));

try {
  await waitForReady(preview, { timeoutMs: 180_000 });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  let pageError = null;
  page.on("pageerror", (e) => {
    pageError = e;
    // eslint-disable-next-line no-console
    console.error("PAGEERROR", String(e));
  });
  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error" || type === "warning") {
      // eslint-disable-next-line no-console
      console.log("CONSOLE", type, msg.text());
    }
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await delay(1500);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await browser.close();

  if (pageError) {
    process.exitCode = 2;
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.error("capture-vite-preview-screenshot failed:", e);
  // eslint-disable-next-line no-console
  console.error(previewOutput);
  process.exitCode = 1;
} finally {
  preview.kill();
  await delay(500);
  if (!preview.killed) preview.kill("SIGKILL");
}
