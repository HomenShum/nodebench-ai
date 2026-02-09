import http from "node:http";
import path from "node:path";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { chromium } from "playwright";

const DIST_DIR = path.resolve(process.cwd(), "dist");
const OUT_DIR = path.resolve(process.cwd(), "screenshots");
const HOST = "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".webmanifest": "application/manifest+json",
};

function safeResolveFromDist(urlPath) {
  let p = String(urlPath || "/");
  const qIdx = p.indexOf("?");
  if (qIdx >= 0) p = p.slice(0, qIdx);
  try {
    p = decodeURIComponent(p);
  } catch {
    // ignore
  }
  if (!p.startsWith("/")) p = `/${p}`;

  const candidate = path.resolve(DIST_DIR, `.${p}`);
  if (candidate === DIST_DIR) return path.join(DIST_DIR, "index.html");
  if (!candidate.startsWith(DIST_DIR + path.sep)) return null;
  return candidate;
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (!req.url) {
        res.statusCode = 400;
        res.end("Bad Request");
        return;
      }

      const filePath = safeResolveFromDist(req.url);
      if (!filePath) {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
      }

      const sendFile = async (p) => {
        const ext = path.extname(p).toLowerCase();
        res.statusCode = 200;
        res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
        createReadStream(p).pipe(res);
      };

      try {
        if (existsSync(filePath)) {
          const s = await stat(filePath);
          if (s.isFile()) {
            await sendFile(filePath);
            return;
          }
        }
      } catch {
        // fall through
      }

      // SPA fallback
      res.setHeader("Cache-Control", "no-store");
      await sendFile(path.join(DIST_DIR, "index.html"));
    });

    server.on("error", reject);
    server.listen(0, HOST, () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("Unexpected server address"));
        return;
      }
      resolve({ server, baseUrl: `http://${HOST}:${addr.port}` });
    });
  });
}

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(
    d.getMinutes()
  )}${pad(d.getSeconds())}`;
}

async function capturePage(browser, url, outPath) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: outPath, fullPage: true, type: "png" });
  await page.close();
}

async function main() {
  if (!existsSync(DIST_DIR)) {
    throw new Error(`Missing dist/ directory at ${DIST_DIR}. Run: npm run build`);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const { server, baseUrl } = await startStaticServer();

  try {
    const browser = await chromium.launch({ headless: true });
    try {
      const s = stamp();
      await capturePage(
        browser,
        `${baseUrl}/benchmarks`,
        path.join(OUT_DIR, `benchmarks-gaia-lanes_${s}.png`)
      );
      await capturePage(
        browser,
        `${baseUrl}/mcp/ledger`,
        path.join(OUT_DIR, `mcp-ledger_${s}.png`)
      );
      // eslint-disable-next-line no-console
      console.log("captured");
    } finally {
      await browser.close();
    }
  } finally {
    await new Promise((r) => server.close(r));
  }
}

await main();

