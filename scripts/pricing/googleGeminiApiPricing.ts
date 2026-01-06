import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium } from "playwright";

export type GoogleGeminiApiModelPricing = {
  model: string;
  inputUsdPer1MTokens: number;
  outputUsdPer1MTokens: number;
  inputUsdPer1MTokensOver200k: number | null;
  outputUsdPer1MTokensOver200k: number | null;
  contextCacheUsdPer1MTokens: number | null;
};

export type GoogleGeminiApiPricingSnapshot = {
  provider: "google";
  sourceUrl: string;
  fetchedAt: string;
  models: GoogleGeminiApiModelPricing[];
  notes: string[];
};

const DEFAULT_SOURCE_URL = "https://ai.google.dev/gemini-api/docs/pricing";

function normalizeSpaces(s: string): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function parseUsd(s: string): number | null {
  const m = normalizeSpaces(s).match(/\$([0-9]+(?:\.[0-9]+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

type ParsedTable = {
  input: { le200k: number | null; gt200k: number | null };
  output: { le200k: number | null; gt200k: number | null };
  contextCache: { le200k: number | null; gt200k: number | null };
};

function parseGeminiPricingTableText(tableText: string): ParsedTable {
  const text = normalizeSpaces(tableText);

  const extractPair = (label: string): { le200k: number | null; gt200k: number | null } => {
    // Example: "Input price ... $2.00, prompts <= 200k tokens $4.00, prompts > 200k tokens"
    const re = new RegExp(`${label}[^$]*\\$([0-9.]+)[^$]*200k[^$]*\\$([0-9.]+)[^$]*>\\s*200k`, "i");
    const m = text.match(re);
    if (!m) return { le200k: null, gt200k: null };
    const a = Number(m[1]);
    const b = Number(m[2]);
    return {
      le200k: Number.isFinite(a) ? a : null,
      gt200k: Number.isFinite(b) ? b : null,
    };
  };

  const input = extractPair("Input price");
  const output = extractPair("Output price");
  const cache = extractPair("Context caching price");

  // Some rows don't have tiered tokens; fall back to the first $ number after the label.
  const extractSingle = (label: string): number | null => {
    const re = new RegExp(`${label}[^$]*\\$([0-9.]+)`, "i");
    const m = text.match(re);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  };

  if (input.le200k == null) input.le200k = extractSingle("Input price");
  if (output.le200k == null) output.le200k = extractSingle("Output price");
  if (cache.le200k == null) cache.le200k = extractSingle("Context caching price");

  return { input, output, contextCache: cache };
}

export async function fetchGoogleGeminiApiPricingSnapshot(options?: {
  sourceUrl?: string;
  timeoutMs?: number;
}): Promise<GoogleGeminiApiPricingSnapshot> {
  const sourceUrl = options?.sourceUrl ?? DEFAULT_SOURCE_URL;
  const timeoutMs = options?.timeoutMs ?? 60_000;

  const userDataDir = join(process.cwd(), ".cache", "playwright-google-pricing");
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
    await page.waitForSelector("text=Gemini Developer API pricing", { timeout: timeoutMs });
    await page.waitForSelector("#gemini-3-pro-preview", { timeout: timeoutMs });

    const extracted = await page.evaluate(`(() => {
      const normalize = (s) => String(s || '').replace(/\\s+/g,' ').trim();
      const anchors = [
        { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
      ];

      const out = [];
      for (const a of anchors) {
        const el = document.getElementById(a.id);
        if (!el) continue;
        const tablesAfter = [];
        const all = Array.from(document.querySelectorAll('table'));
        for (const t of all) {
          const pos = el.compareDocumentPosition(t);
          if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
            const header = normalize(t.querySelector('tr')?.innerText || '');
            const text = normalize(t.innerText || '');
            // Gemini pricing tables have header "Free Tier Paid Tier, per 1M tokens in USD"
            if (header.toLowerCase().includes('free tier') && header.toLowerCase().includes('paid tier') && header.toLowerCase().includes('1m')) {
              tablesAfter.push({ header, text });
              break; // take the first relevant table for that anchor
            }
          }
        }
        out.push({ id: a.id, name: a.name, table: tablesAfter[0] || null });
      }
      return out;
    })()`);

    const notes: string[] = [
      "Google Gemini API pricing varies by prompt length and modality; for token-cost estimation we use the <=200k 'text' list rates from the first pricing table under each Gemini 3 section.",
      "If your prompts exceed 200k tokens, use the *Over200k rates captured in this snapshot instead.",
    ];

    const models: GoogleGeminiApiModelPricing[] = [];
    for (const entry of extracted as any[]) {
      const name = normalizeSpaces(String(entry?.name ?? ""));
      const tableText = normalizeSpaces(String(entry?.table?.text ?? ""));
      if (!name || !tableText) continue;

      const parsed = parseGeminiPricingTableText(tableText);
      const input = parsed.input.le200k;
      const output = parsed.output.le200k;
      if (input == null || output == null) continue;

      models.push({
        model: name,
        inputUsdPer1MTokens: input,
        outputUsdPer1MTokens: output,
        inputUsdPer1MTokensOver200k: parsed.input.gt200k,
        outputUsdPer1MTokensOver200k: parsed.output.gt200k,
        contextCacheUsdPer1MTokens: parsed.contextCache.le200k,
      });
    }

    return {
      provider: "google",
      sourceUrl,
      fetchedAt: new Date().toISOString(),
      models,
      notes,
    };
  } finally {
    await context.close();
  }
}

export function writeGoogleGeminiApiPricingSnapshotToFile(snapshot: GoogleGeminiApiPricingSnapshot, absolutePath: string) {
  writeFileSync(absolutePath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
}

export function readGoogleGeminiApiPricingSnapshotFromFile(absolutePath: string): GoogleGeminiApiPricingSnapshot | null {
  try {
    const raw = readFileSync(absolutePath, "utf8");
    const parsed = JSON.parse(raw) as GoogleGeminiApiPricingSnapshot;
    if (!parsed || parsed.provider !== "google" || !Array.isArray(parsed.models)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function loadOrFetchGoogleGeminiApiPricingSnapshot(options?: {
  absolutePath?: string;
  maxAgeMs?: number;
  forceFetch?: boolean;
}): Promise<{ snapshot: GoogleGeminiApiPricingSnapshot; source: "cache" | "live"; path: string }> {
  const path =
    options?.absolutePath ??
    join(process.cwd(), "docs", "architecture", "benchmarks", "google-gemini-api-pricing-latest.json");
  const maxAgeMs = options?.maxAgeMs ?? 24 * 60 * 60 * 1000;
  const forceFetch = options?.forceFetch === true;

  if (!forceFetch) {
    const cached = readGoogleGeminiApiPricingSnapshotFromFile(path);
    if (cached?.fetchedAt) {
      const ageMs = Date.now() - new Date(cached.fetchedAt).getTime();
      if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= maxAgeMs) {
        return { snapshot: cached, source: "cache", path };
      }
    }
  }

  const snapshot = await fetchGoogleGeminiApiPricingSnapshot();
  writeFileSync(join(dirname(path), ".keep"), "", { flag: "a" });
  writeGoogleGeminiApiPricingSnapshotToFile(snapshot, path);
  return { snapshot, source: "live", path };
}

export function findGoogleGeminiModelPricing(snapshot: GoogleGeminiApiPricingSnapshot, modelAlias: string): GoogleGeminiApiModelPricing | null {
  const want = normalizeSpaces(modelAlias).toLowerCase();
  const aliasMap: Record<string, string> = {
    "gemini-3-pro": "gemini 3 pro preview",
    "gemini-3-flash": "gemini 3 flash preview",
  };
  const mapped = aliasMap[want] ?? want;
  return snapshot.models.find((m) => m.model.toLowerCase() === mapped) ?? null;
}

