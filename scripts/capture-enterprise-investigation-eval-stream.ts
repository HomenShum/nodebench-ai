#!/usr/bin/env npx tsx

import { execFileSync, spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { chromium } from "playwright";

const HOST = "127.0.0.1";
const PORT = 4173;
const BASE_URL = `http://${HOST}:${PORT}`;
const VIDEO_URL = "/benchmarks/videos/enterprise-investigation-eval-stream-latest.webm";

function spawnPreviewServer() {
  if (process.platform === "win32") {
    return spawn(
      "cmd.exe",
      ["/d", "/s", "/c", `npx vite preview --host ${HOST} --port ${PORT}`],
      {
        cwd: process.cwd(),
        stdio: "pipe",
        env: process.env,
      },
    );
  }

  return spawn("npx", ["vite", "preview", "--host", HOST, "--port", String(PORT)], {
    cwd: process.cwd(),
    stdio: "pipe",
    env: process.env,
  });
}

function stopPreviewServer(preview: ReturnType<typeof spawnPreviewServer>) {
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/PID", String(preview.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } catch {
      preview.kill();
    }
    return;
  }
  preview.kill("SIGTERM");
}

async function waitForServer(url: string, timeoutMs = 60_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // keep polling
    }
    await delay(1_000);
  }
  throw new Error(`Timed out waiting for preview server at ${url}`);
}

function patchArtifactsWithVideoUrl() {
  const artifactPaths = [
    join(process.cwd(), "docs", "architecture", "benchmarks", "enterprise-investigation-eval-latest.json"),
    join(process.cwd(), "public", "benchmarks", "enterprise-investigation-eval-latest.json"),
  ];
  const streamPaths = [
    join(process.cwd(), "docs", "architecture", "benchmarks", "enterprise-investigation-eval-stream-latest.json"),
    join(process.cwd(), "public", "benchmarks", "enterprise-investigation-eval-stream-latest.json"),
  ];

  for (const artifactPath of artifactPaths) {
    if (!existsSync(artifactPath)) continue;
    const json = JSON.parse(readFileSync(artifactPath, "utf8"));
    json.stream = json.stream ?? {};
    json.stream.video = {
      status: "ready",
      url: VIDEO_URL,
      note: "Recorded playback of the latest parallel enterprise investigation eval run.",
    };
    writeFileSync(artifactPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  }

  for (const streamPath of streamPaths) {
    if (!existsSync(streamPath)) continue;
    const json = JSON.parse(readFileSync(streamPath, "utf8"));
    json.video = {
      status: "ready",
      url: VIDEO_URL,
      note: "Recorded playback of the latest parallel enterprise investigation eval run.",
    };
    writeFileSync(streamPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  }
}

async function main() {
  const videoTempDir = join(process.cwd(), ".tmp", "enterprise-eval-video");
  rmSync(videoTempDir, { recursive: true, force: true });
  mkdirSync(videoTempDir, { recursive: true });

  const preview = spawnPreviewServer();

  try {
    await waitForServer(`${BASE_URL}/benchmarks`);

    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1080 },
      recordVideo: { dir: videoTempDir, size: { width: 1440, height: 1080 } },
    });

    const page = await context.newPage();
    await page.goto(`${BASE_URL}/benchmarks?streamReplay=1`, { waitUntil: "networkidle" });
    await page.waitForTimeout(12_000);
    await context.close();
    await browser.close();

    const recordedVideo = readdirSync(videoTempDir)
      .filter((entry) => entry.endsWith(".webm"))
      .map((entry) => join(videoTempDir, entry))[0];

    if (!recordedVideo) {
      throw new Error("Playwright did not produce a stream replay video.");
    }

    const publicVideoDir = join(process.cwd(), "public", "benchmarks", "videos");
    mkdirSync(publicVideoDir, { recursive: true });
    const target = join(publicVideoDir, "enterprise-investigation-eval-stream-latest.webm");
    copyFileSync(recordedVideo, target);
    patchArtifactsWithVideoUrl();

    process.stdout.write(`Wrote ${target}\n`);
  } finally {
    stopPreviewServer(preview);
  }
}

main().catch((error) => {
  process.stderr.write(`ERROR: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
