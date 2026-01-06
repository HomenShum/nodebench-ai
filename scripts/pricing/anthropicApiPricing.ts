import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium } from "playwright";

export type AnthropicApiModelPricing = {
  model: string;
  baseInputUsdPer1MTokens: number;
  outputUsdPer1MTokens: number;
  cacheHitUsdPer1MTokens: number | null;
  cacheWrite5mUsdPer1MTokens: number | null;
  cacheWrite1hUsdPer1MTokens: number | null;
};

export type AnthropicApiPricingSnapshot = {
  provider: "anthropic";
  sourceUrl: string;
  fetchedAt: string;
  models: AnthropicApiModelPricing[];
};

const DEFAULT_SOURCE_URL = "https://platform.claude.com/docs/en/about-claude/pricing";

function normalizeSpaces(s: string): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function parseUsdPerMTok(s: string): number | null {
  const m = normalizeSpaces(s).match(/\$([0-9]+(?:\.[0-9]+)?)\s*\/\s*MTok/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function isClaudeModelName(name: string): boolean {
  const n = name.toLowerCase();
  return n.startsWith("claude ") && /(\bopus\b|\bsonnet\b|\bhaiku\b)/.test(n);
}

export async function fetchAnthropicApiPricingSnapshot(options?: {
  sourceUrl?: string;
  timeoutMs?: number;
}): Promise<AnthropicApiPricingSnapshot> {
  const sourceUrl = options?.sourceUrl ?? DEFAULT_SOURCE_URL;
  const timeoutMs = options?.timeoutMs ?? 60_000;

  const userDataDir = join(process.cwd(), ".cache", "playwright-anthropic-pricing");
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    viewport: { width: 1365, height: 900 },
    locale: "en-US",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  try {
    const page = await context.newPage();
    await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForSelector("text=Pricing", { timeout: timeoutMs });
    await page.waitForSelector("text=Claude Opus 4.5", { timeout: timeoutMs });

    const rows = await page.evaluate(`(() => {
      const normalize = (s) => String(s || '').replace(/\\s+/g,' ').trim();
      const out = [];
      for (const tr of Array.from(document.querySelectorAll('table tr'))) {
        const t = normalize(tr.innerText || '');
        if (!t) continue;
        if (!t.toLowerCase().startsWith('claude ')) continue;
        if (!t.includes('/ MTok')) continue;
        out.push(t);
      }
      return out;
    })()`);

    const models: AnthropicApiModelPricing[] = [];
    for (const row of rows as any[]) {
      const text = normalizeSpaces(String(row ?? ""));
      // Format example:
      // "Claude Opus 4.5 $5 / MTok $6.25 / MTok $10 / MTok $0.50 / MTok $25 / MTok"
      const parts = text.split(/\s+\$/).map((p, i) => (i === 0 ? p.trim() : `$${p}`.trim()));
      const name = parts[0];
      if (!isClaudeModelName(name)) continue;

      const prices = (text.match(/\$[0-9]+(?:\.[0-9]+)?\s*\/\s*MTok/gi) ?? []).map((p) => parseUsdPerMTok(p)).filter((n) => n != null) as number[];
      // Expect: base input, cache write 5m, cache write 1h, cache hit/refresh, output
      const baseInput = prices[0] ?? null;
      const cacheWrite5m = prices[1] ?? null;
      const cacheWrite1h = prices[2] ?? null;
      const cacheHit = prices[3] ?? null;
      const output = prices[4] ?? null;
      if (baseInput == null || output == null) continue;

      models.push({
        model: name,
        baseInputUsdPer1MTokens: baseInput,
        cacheWrite5mUsdPer1MTokens: cacheWrite5m,
        cacheWrite1hUsdPer1MTokens: cacheWrite1h,
        cacheHitUsdPer1MTokens: cacheHit,
        outputUsdPer1MTokens: output,
      });
    }

    // Dedup by name
    const byName = new Map<string, AnthropicApiModelPricing>();
    for (const m of models) byName.set(m.model, m);
    const normalized = Array.from(byName.values()).sort((a, b) => a.model.localeCompare(b.model));

    return {
      provider: "anthropic",
      sourceUrl,
      fetchedAt: new Date().toISOString(),
      models: normalized,
    };
  } finally {
    await context.close();
  }
}

export function writeAnthropicApiPricingSnapshotToFile(snapshot: AnthropicApiPricingSnapshot, absolutePath: string) {
  writeFileSync(absolutePath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
}

export function readAnthropicApiPricingSnapshotFromFile(absolutePath: string): AnthropicApiPricingSnapshot | null {
  try {
    const raw = readFileSync(absolutePath, "utf8");
    const parsed = JSON.parse(raw) as AnthropicApiPricingSnapshot;
    if (!parsed || parsed.provider !== "anthropic" || !Array.isArray(parsed.models)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function loadOrFetchAnthropicApiPricingSnapshot(options?: {
  absolutePath?: string;
  maxAgeMs?: number;
  forceFetch?: boolean;
}): Promise<{ snapshot: AnthropicApiPricingSnapshot; source: "cache" | "live"; path: string }> {
  const path =
    options?.absolutePath ??
    join(process.cwd(), "docs", "architecture", "benchmarks", "anthropic-api-pricing-latest.json");
  const maxAgeMs = options?.maxAgeMs ?? 24 * 60 * 60 * 1000;
  const forceFetch = options?.forceFetch === true;

  if (!forceFetch) {
    const cached = readAnthropicApiPricingSnapshotFromFile(path);
    if (cached?.fetchedAt) {
      const ageMs = Date.now() - new Date(cached.fetchedAt).getTime();
      if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= maxAgeMs) {
        return { snapshot: cached, source: "cache", path };
      }
    }
  }

  const snapshot = await fetchAnthropicApiPricingSnapshot();
  writeFileSync(join(dirname(path), ".keep"), "", { flag: "a" });
  writeAnthropicApiPricingSnapshotToFile(snapshot, path);
  return { snapshot, source: "live", path };
}

export function findAnthropicModelPricing(snapshot: AnthropicApiPricingSnapshot, modelAlias: string): AnthropicApiModelPricing | null {
  const want = normalizeSpaces(modelAlias).toLowerCase();
  const aliasMap: Record<string, string> = {
    "claude-opus-4.5": "claude opus 4.5",
    "claude-sonnet-4.5": "claude sonnet 4.5",
    "claude-haiku-4.5": "claude haiku 4.5",
  };
  const mapped = aliasMap[want] ?? want;
  return snapshot.models.find((m) => m.model.toLowerCase() === mapped) ?? null;
}

