import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium } from "playwright";

export type OpenAiApiModelPricing = {
  model: string;
  inputUsdPer1MTokens: number;
  cachedInputUsdPer1MTokens: number | null;
  outputUsdPer1MTokens: number;
};

export type OpenAiApiPricingSnapshot = {
  provider: "openai";
  sourceUrl: string;
  fetchedAt: string;
  models: OpenAiApiModelPricing[];
};

const DEFAULT_SOURCE_URL = "https://openai.com/api/pricing/";

function normalizeSpaces(s: string): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function isLikelyModelName(name: string): boolean {
  const n = name.toLowerCase();
  if (!n) return false;
  if (n.includes("pricing")) return false;
  if (n.includes("models")) return false;
  if (n.includes("fine-tuning")) return false;
  if (n.includes("fine tuning")) return false;
  if (n.includes("deprecated")) return false;
  if (n.includes("image")) return false;
  if (n.includes("audio")) return false;
  if (n.includes("speech")) return false;
  if (n.includes("embeddings")) return false;
  if (n.includes("moderation")) return false;
  if (n.includes("realtime")) return false;

  return /(^gpt-| gpt-|^o\d|^o\d-|\bo\d\b)/i.test(name);
}

export async function fetchOpenAiApiPricingSnapshot(options?: {
  sourceUrl?: string;
  timeoutMs?: number;
}): Promise<OpenAiApiPricingSnapshot> {
  const sourceUrl = options?.sourceUrl ?? DEFAULT_SOURCE_URL;
  const timeoutMs = options?.timeoutMs ?? 60_000;

  const userDataDir = join(process.cwd(), ".cache", "playwright-openai-pricing");
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    viewport: { width: 1365, height: 900 },
    locale: "en-US",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  try {
    const page = await context.newPage();
    await page.addInitScript(() => {
      // Best-effort bot-detection reduction; not guaranteed to work against all mitigations.
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    // Cloudflare sometimes shows a "Just a moment..." interstitial; wait for pricing content.
    await page.waitForSelector("text=API Pricing", { timeout: Math.max(timeoutMs, 120_000) });
    await page.waitForTimeout(1000);

    // NOTE: Use a string expression here (not a function) to avoid tsx/esbuild injecting helpers like __name,
    // which do not exist in the browser context.
    const models = await page.evaluate(`(() => {
      const normalize = (s) => String(s || '').replace(/\\s+/g,' ').trim();
      const parsePrice = (text, label) => {
        const re = new RegExp(label + '\\\\s*:\\\\s*\\\\$([0-9.]+)\\\\s*\\\\/\\\\s*1M tokens', 'i');
        const m = String(text || '').match(re);
        if (!m) return null;
        const n = Number(m[1]);
        return Number.isFinite(n) ? n : null;
      };
      const isHeadingJunk = (name) => {
        const n = String(name || '').toLowerCase();
        if (!n) return true;
        if (n.includes('pricing')) return true;
        if (n.includes('models')) return true;
        if (n.includes('fine-tuning') || n.includes('fine tuning')) return true;
        if (n.includes('deprecated')) return true;
        return false;
      };
      const results = [];
      const candidates = Array.from(document.querySelectorAll('section, article, div'));
      for (const el of candidates) {
        const text = normalize(el.innerText || '');
        if (!text.includes('Input:') || !text.includes('/ 1M tokens')) continue;
        const heading = el.querySelector('h1,h2,h3,h4');
        const name = heading ? normalize(heading.textContent || '') : '';
        if (isHeadingJunk(name)) continue;
        const input = parsePrice(text, 'Input');
        const cached = parsePrice(text, 'Cached input');
        const output = parsePrice(text, 'Output');
        if (input == null || output == null) continue;
        results.push({
          model: name,
          inputUsdPer1MTokens: input,
          cachedInputUsdPer1MTokens: cached,
          outputUsdPer1MTokens: output,
        });
      }
      const byName = new Map();
      for (const r of results) byName.set(r.model, r);
      return Array.from(byName.values());
    })()`);

    const normalized = models
      .map((m: any) => ({
        model: normalizeSpaces(String(m.model ?? "")),
        inputUsdPer1MTokens: Number(m.inputUsdPer1MTokens),
        cachedInputUsdPer1MTokens: m.cachedInputUsdPer1MTokens == null ? null : Number(m.cachedInputUsdPer1MTokens),
        outputUsdPer1MTokens: Number(m.outputUsdPer1MTokens),
      }))
      .filter(
        (m) =>
          isLikelyModelName(m.model) &&
          Number.isFinite(m.inputUsdPer1MTokens) &&
          Number.isFinite(m.outputUsdPer1MTokens) &&
          m.inputUsdPer1MTokens >= 0 &&
          m.outputUsdPer1MTokens >= 0,
      )
      .sort((a, b) => a.model.localeCompare(b.model));

    return {
      provider: "openai",
      sourceUrl,
      fetchedAt: new Date().toISOString(),
      models: normalized,
    };
  } finally {
    await context.close();
  }
}

export function writeOpenAiApiPricingSnapshotToFile(snapshot: OpenAiApiPricingSnapshot, absolutePath: string) {
  writeFileSync(absolutePath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
}

export function readOpenAiApiPricingSnapshotFromFile(absolutePath: string): OpenAiApiPricingSnapshot | null {
  try {
    const raw = readFileSync(absolutePath, "utf8");
    const parsed = JSON.parse(raw) as OpenAiApiPricingSnapshot;
    if (!parsed || parsed.provider !== "openai" || !Array.isArray(parsed.models)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function loadOrFetchOpenAiApiPricingSnapshot(options?: {
  absolutePath?: string;
  maxAgeMs?: number;
  forceFetch?: boolean;
}): Promise<{ snapshot: OpenAiApiPricingSnapshot; source: "cache" | "live"; path: string }> {
  const path =
    options?.absolutePath ??
    join(process.cwd(), "docs", "architecture", "benchmarks", "openai-api-pricing-latest.json");
  const maxAgeMs = options?.maxAgeMs ?? 24 * 60 * 60 * 1000;
  const forceFetch = options?.forceFetch === true;

  if (!forceFetch) {
    const cached = readOpenAiApiPricingSnapshotFromFile(path);
    if (cached?.fetchedAt) {
      const ageMs = Date.now() - new Date(cached.fetchedAt).getTime();
      if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= maxAgeMs) {
        return { snapshot: cached, source: "cache", path };
      }
    }
  }

  const snapshot = await fetchOpenAiApiPricingSnapshot();
  writeFileSync(join(dirname(path), ".keep"), "", { flag: "a" });
  writeOpenAiApiPricingSnapshotToFile(snapshot, path);
  return { snapshot, source: "live", path };
}

export function findOpenAiModelPricing(snapshot: OpenAiApiPricingSnapshot, modelNameOrAlias: string): OpenAiApiModelPricing | null {
  const want = normalizeSpaces(modelNameOrAlias).toLowerCase();
  if (!want) return null;

  const direct = snapshot.models.find((m) => m.model.toLowerCase() === want);
  if (direct) return direct;

  // Alias-ish matching: "gpt-5.2" => "GPT-5.2", "gpt-5.2 pro" etc.
  const normalizedWant = want.replace(/\s+/g, " ").trim();
  const byContains = snapshot.models.find((m) => m.model.toLowerCase().replace(/\s+/g, " ").includes(normalizedWant));
  return byContains ?? null;
}
