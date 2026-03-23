/**
 * OCR infrastructure, image analysis helpers, fraction math, and audio transcription helpers.
 * Extracted from localFileMediaTools.ts for modularity.
 */

import { readFile } from "node:fs/promises";
import { existsSync, mkdirSync, writeFileSync as writeFileSyncFs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { clampInt, toIntegerOrNull } from "./localFileHelpers.js";

export function extractChunkedIntsFromText(
  text: string,
  opts?: { chunkSize?: number; min?: number; max?: number }
): number[] {
  const chunkSize = typeof opts?.chunkSize === "number" && opts.chunkSize > 0 ? Math.trunc(opts.chunkSize) : 2;
  const min = typeof opts?.min === "number" && Number.isFinite(opts.min) ? opts.min : 0;
  const max = typeof opts?.max === "number" && Number.isFinite(opts.max) ? opts.max : 200;

  const runs = String(text ?? "").match(/\d+/g) ?? [];
  const out: number[] = [];

  for (const run of runs) {
    let s = String(run ?? "").trim();
    if (!s) continue;

    const pushIfOk = (n: number) => {
      if (!Number.isFinite(n)) return;
      if (n < min || n > max) return;
      out.push(n);
    };

    // Common OCR noise: isolated digits when the underlying data are 2-digit tokens.
    if (s.length < chunkSize) {
      pushIfOk(Number.parseInt(s, 10));
      continue;
    }

    if (s.length === chunkSize) {
      pushIfOk(Number.parseInt(s, 10));
      continue;
    }

    // Sometimes OCR concatenates adjacent numbers (e.g. "247428"). Split into fixed-size chunks.
    // For 2-digit chunking, handle odd-length runs by shifting or trimming leading zeros.
    if (chunkSize === 2) {
      // Fix common leading/trailing zero artifacts: "074" -> "74", "580" -> "58".
      if (s.length === 3 && s.startsWith("0")) s = s.slice(1);
      if (s.length === 3 && s.endsWith("0")) s = s.slice(0, 2);

      // For any remaining odd-length run, prefer chunking that yields more in-range 2-digit values.
      const chunkFrom = (start: number): number[] => {
        const nums: number[] = [];
        for (let i = start; i + 2 <= s.length; i += 2) {
          nums.push(Number.parseInt(s.slice(i, i + 2), 10));
        }
        return nums;
      };

      if (s.length % 2 === 1) {
        const a = chunkFrom(0);
        const b = chunkFrom(1);
        const score = (arr: number[]) => arr.filter((n) => Number.isFinite(n) && n >= min && n <= max).length;
        const best = score(b) > score(a) ? b : a;
        for (const n of best) pushIfOk(n);
        continue;
      }

      for (const n of chunkFrom(0)) pushIfOk(n);
      continue;
    }

    for (let i = 0; i + chunkSize <= s.length; i += chunkSize) {
      pushIfOk(Number.parseInt(s.slice(i, i + chunkSize), 10));
    }
  }

  return out;
}

export function gcdInt(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

export type Fraction = { n: number; d: number };

export function normalizeFraction(f: Fraction): Fraction {
  let n = Math.trunc(f.n);
  let d = Math.trunc(f.d);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) throw new Error("Invalid fraction");
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcdInt(n, d);
  return { n: n / g, d: d / g };
}

export function parseFractionLoose(text: string): Fraction | null {
  const m = String(text ?? "").trim().match(/(-?\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  const d = Number.parseInt(m[2], 10);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  return normalizeFraction({ n, d });
}

export function parseMixedNumberLoose(text: string): { whole: number; frac: Fraction } | null {
  const m = String(text ?? "")
    .trim()
    .match(/(-?\d+)\s+(-?\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  const whole = Number.parseInt(m[1], 10);
  const n = Number.parseInt(m[2], 10);
  const d = Number.parseInt(m[3], 10);
  if (!Number.isFinite(whole) || !Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  return { whole, frac: normalizeFraction({ n, d }) };
}

export function fractionsEqual(a: Fraction, b: Fraction): boolean {
  const na = normalizeFraction(a);
  const nb = normalizeFraction(b);
  return na.n === nb.n && na.d === nb.d;
}

export function addFractions(a: Fraction, b: Fraction): Fraction {
  return normalizeFraction({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
}

export function subFractions(a: Fraction, b: Fraction): Fraction {
  return normalizeFraction({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
}

export function mulFractions(a: Fraction, b: Fraction): Fraction {
  return normalizeFraction({ n: a.n * b.n, d: a.d * b.d });
}

export function divFractions(a: Fraction, b: Fraction): Fraction {
  if (b.n === 0) throw new Error("Division by zero fraction");
  return normalizeFraction({ n: a.n * b.d, d: a.d * b.n });
}

export function fractionToString(f: Fraction): string {
  const nf = normalizeFraction(f);
  return `${nf.n}/${nf.d}`;
}

export function mixedNumberToString(whole: number, frac: Fraction): string {
  const nf = normalizeFraction(frac);
  const w = Math.trunc(whole);
  if (nf.n === 0) return String(w);
  return `${w} ${Math.abs(nf.n)}/${nf.d}`;
}

export async function getSharpOptional(): Promise<any | null> {
  try {
    const mod = await import("sharp");
    return (mod as any).default ?? mod;
  } catch {
    return null;
  }
}

export async function getTesseract(): Promise<any> {
  try {
    // Use a non-literal dynamic import so TypeScript doesn't require the optional
    // dependency to be installed at build time.
    const pkg = "tesseract.js";
    const mod = await import(pkg);
    return (mod as any).default ?? mod;
  } catch {
    throw new Error(
      "Missing optional dependency: tesseract.js. Install it (or run npm install in packages/mcp-local) to use image OCR."
    );
  }
}

export type OcrBBox = { x0: number; y0: number; x1: number; y1: number };
export type OcrWord = { text: string; confidence: number | null; bbox: OcrBBox | null };
export type OcrLine = { text: string; confidence: number | null; bbox: OcrBBox | null };

export function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function toOcrBbox(raw: any): OcrBBox | null {
  if (!raw || typeof raw !== "object") return null;
  const x0 = Number(raw.x0);
  const y0 = Number(raw.y0);
  const x1 = Number(raw.x1);
  const y1 = Number(raw.y1);
  if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
  return { x0, y0, x1, y1 };
}

export function parseTesseractTsv(tsv: string): { words: OcrWord[]; lines: OcrLine[] } {
  const text = String(tsv ?? "").trim();
  if (!text) return { words: [], lines: [] };

  const rows = text.split(/\r?\n/);
  if (rows.length <= 1) return { words: [], lines: [] };

  type WordRow = {
    key: string;
    left: number;
    top: number;
    width: number;
    height: number;
    conf: number | null;
    text: string;
  };

  const wordsRaw: WordRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const cols = row.split("\t");
    if (cols.length < 12) continue;

    const level = Number.parseInt(cols[0], 10);
    if (!Number.isFinite(level)) continue;

    const page = cols[1];
    const block = cols[2];
    const par = cols[3];
    const line = cols[4];
    const word = cols[5];

    const left = Number.parseInt(cols[6], 10);
    const top = Number.parseInt(cols[7], 10);
    const w = Number.parseInt(cols[8], 10);
    const h = Number.parseInt(cols[9], 10);
    const confN = Number.parseFloat(cols[10]);
    const conf = Number.isFinite(confN) ? confN : null;
    const t = String(cols.slice(11).join("\t") ?? "").trim();

    if (![left, top, w, h].every(Number.isFinite)) continue;
    if (!t) continue;

    const key = `${page}:${block}:${par}:${line}`;
    if (level === 5) {
      wordsRaw.push({ key, left, top, width: w, height: h, conf, text: t });
    }
  }

  const words: OcrWord[] = wordsRaw.map((w) => ({
    text: w.text,
    confidence: w.conf,
    bbox: { x0: w.left, y0: w.top, x1: w.left + w.width, y1: w.top + w.height },
  }));

  // Build lines by grouping words with the same (page,block,par,line) key.
  const byLine = new Map<string, WordRow[]>();
  for (const w of wordsRaw) {
    const arr = byLine.get(w.key);
    if (arr) arr.push(w);
    else byLine.set(w.key, [w]);
  }

  const lines: OcrLine[] = [];
  for (const arr of byLine.values()) {
    const sorted = [...arr].sort((a, b) => a.left - b.left);
    const lineText = sorted.map((x) => x.text).join(" ").trim();
    if (!lineText) continue;

    const x0 = Math.min(...sorted.map((x) => x.left));
    const y0 = Math.min(...sorted.map((x) => x.top));
    const x1 = Math.max(...sorted.map((x) => x.left + x.width));
    const y1 = Math.max(...sorted.map((x) => x.top + x.height));
    const confs = sorted.map((x) => x.conf).filter((c): c is number => typeof c === "number" && Number.isFinite(c));
    const avgConf = confs.length ? confs.reduce((s, n) => s + n, 0) / confs.length : null;

    lines.push({ text: lineText, confidence: avgConf, bbox: { x0, y0, x1, y1 } });
  }

  // Keep a stable reading order.
  lines.sort((a, b) => {
    const ay = a.bbox ? a.bbox.y0 : 0;
    const by = b.bbox ? b.bbox.y0 : 0;
    const ax = a.bbox ? a.bbox.x0 : 0;
    const bx = b.bbox ? b.bbox.x0 : 0;
    return ay - by || ax - bx;
  });

  return { words, lines };
}

type OcrWorkerPoolEntry = {
  workerPromise: Promise<any>;
  chain: Promise<void>;
  activeCount: number;
  idleTimer: ReturnType<typeof setTimeout> | null;
};

const OCR_WORKER_POOL = new Map<string, OcrWorkerPoolEntry>();
const OCR_WORKER_IDLE_TERMINATE_MS = 3000;

function ocrWorkerKey(lang: string, langPathEffective: string | null): string {
  return `${lang}::${langPathEffective ?? ""}`;
}

async function getOrCreateOcrWorkerEntry(args: {
  lang: string;
  langPathEffective: string | null;
}): Promise<{ key: string; entry: OcrWorkerPoolEntry }> {
  const key = ocrWorkerKey(args.lang, args.langPathEffective);
  const existing = OCR_WORKER_POOL.get(key);
  if (existing) return { key, entry: existing };

  const entry: OcrWorkerPoolEntry = {
    workerPromise: (async () => {
      const tesseract = await getTesseract();
      const createWorker = (tesseract as any)?.createWorker;
      if (typeof createWorker !== "function") {
        throw new Error("tesseract.js missing createWorker() export (unsupported version)");
      }
      // createWorker() returns a wrapper that manages a worker_threads Worker under the hood.
      const worker = await createWorker(args.lang, undefined, {
        ...(args.langPathEffective ? { langPath: args.langPathEffective } : {}),
        logger: () => {
          // silence
        },
      });
      return worker;
    })(),
    chain: Promise.resolve(),
    activeCount: 0,
    idleTimer: null,
  };

  OCR_WORKER_POOL.set(key, entry);
  return { key, entry };
}

function scheduleOcrWorkerIdleTerminate(key: string, entry: OcrWorkerPoolEntry): void {
  if (entry.idleTimer) clearTimeout(entry.idleTimer);
  entry.idleTimer = setTimeout(() => {
    // Fire-and-forget; do not block the event loop on teardown.
    void (async () => {
      OCR_WORKER_POOL.delete(key);
      try {
        const worker = await entry.workerPromise;
        if (worker && typeof worker.terminate === "function") await worker.terminate();
      } catch {
        // ignore
      }
    })();
  }, OCR_WORKER_IDLE_TERMINATE_MS);
  // Keep the timer from preventing exit, while the worker thread still keeps the loop alive.
  (entry.idleTimer as any)?.unref?.();
}

export async function withOcrWorker<T>(
  args: { lang: string; langPathEffective: string | null },
  fn: (worker: any) => Promise<T>
): Promise<T> {
  const { key, entry } = await getOrCreateOcrWorkerEntry(args);

  // If we were about to tear down, keep the worker alive for this request burst.
  if (entry.idleTimer) {
    clearTimeout(entry.idleTimer);
    entry.idleTimer = null;
  }

  entry.activeCount += 1;

  const run = async (): Promise<T> => {
    const worker = await entry.workerPromise;
    return await fn(worker);
  };

  const p = entry.chain.then(run, run);
  entry.chain = p.then(
    () => undefined,
    () => undefined
  );

  return p.finally(() => {
    entry.activeCount -= 1;
    if (entry.activeCount <= 0) {
      entry.activeCount = 0;
      scheduleOcrWorkerIdleTerminate(key, entry);
    }
  });
}

export async function ocrRecognizeBuffer(args: {
  buffer: Buffer;
  lang: string;
  langPathEffective: string | null;
  tessOptions?: Record<string, string>;
  output?: { text?: boolean; tsv?: boolean; hocr?: boolean; blocks?: boolean };
}): Promise<{ text: string; confidence: number | null; words: OcrWord[]; lines: OcrLine[] }> {
  // NOTE: Tesseract.recognize() (top-level) does not accept OutputFormats like TSV.
  // We must use a worker's recognize() and request output.tsv explicitly.
  const result = await withOcrWorker({ lang: args.lang, langPathEffective: args.langPathEffective }, (worker) =>
    worker.recognize(
      args.buffer,
      args.tessOptions ?? {},
      args.output ?? { text: true, tsv: true }
    )
  );

  const data = (result as any)?.data ?? {};
  const text = String(data.text ?? "").trim();
  const confidence = typeof data.confidence === "number" ? data.confidence : null;

  let words: OcrWord[] = [];
  let lines: OcrLine[] = [];

  // tesseract.js v7 returns layout data primarily via TSV/HOCR; earlier versions may populate data.words/lines.
  if (Array.isArray(data.words) || Array.isArray(data.lines)) {
    words = Array.isArray(data.words)
      ? (data.words as any[]).map((w) => ({
          text: String(w?.text ?? ""),
          confidence: typeof w?.confidence === "number" ? w.confidence : null,
          bbox: toOcrBbox(w?.bbox),
        }))
      : [];
    lines = Array.isArray(data.lines)
      ? (data.lines as any[]).map((l) => ({
          text: String(l?.text ?? ""),
          confidence: typeof l?.confidence === "number" ? l.confidence : null,
          bbox: toOcrBbox(l?.bbox),
        }))
      : [];
  } else if (typeof data.tsv === "string" && data.tsv.trim()) {
    const parsed = parseTesseractTsv(String(data.tsv));
    words = parsed.words;
    lines = parsed.lines;
  }

  return { text, confidence, words, lines };
}

export async function ocrRecognizeImageFile(args: {
  filePath: string;
  lang: string;
  langPathEffective: string | null;
  preprocess: boolean;
}): Promise<{ text: string; confidence: number | null; words: OcrWord[]; lines: OcrLine[]; usedSharp: boolean }> {
  let buffer = await readFile(args.filePath);
  let usedSharp = false;

  if (args.preprocess) {
    const sharp = await getSharpOptional();
    if (sharp) {
      try {
        buffer = await sharp(buffer).grayscale().normalize().png().toBuffer();
        usedSharp = true;
      } catch {
        // fall back to raw buffer
      }
    }
  }

  const out = await ocrRecognizeBuffer({ buffer, lang: args.lang, langPathEffective: args.langPathEffective });
  return { ...out, usedSharp };
}

export async function ocrRecognizeImageFileWithColorMask(args: {
  filePath: string;
  color: "red" | "green";
  lang: string;
  langPathEffective: string | null;
  maxPixels?: number;
  minPrimary?: number;
  minDelta?: number;
  upscale?: number;
  blurSigma?: number;
  threshold?: number;
}): Promise<{ text: string; confidence: number | null; usedSharp: boolean }> {
  const sharp = await getSharpOptional();
  if (!sharp) {
    throw new Error("Missing optional dependency: sharp. Install it to use color-masked OCR.");
  }

  const buffer = await readFile(args.filePath);
  const image = sharp(buffer);
  const meta = await image.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new Error("Unable to read image dimensions");

  const maxPixels = typeof args.maxPixels === "number" && args.maxPixels > 0 ? args.maxPixels : 6_000_000;
  if (w * h > maxPixels) {
    throw new Error(`Refusing huge image (${w}x${h}) for masked OCR (maxPixels=${maxPixels})`);
  }

  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height);

  // Convert matching colored pixels to black ink on a white background.
  const minPrimary = typeof args.minPrimary === "number" && Number.isFinite(args.minPrimary) ? args.minPrimary : 80;
  const minDelta = typeof args.minDelta === "number" && Number.isFinite(args.minDelta) ? args.minDelta : 25;
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    let match = false;
    if (a >= 40) {
      const primary = args.color === "red" ? r : g;
      const other = args.color === "red" ? g : r;
      match = primary >= minPrimary && primary - other >= minDelta && primary - b >= minDelta;
    }

    out[j] = match ? 0 : 255;
  }

  // Upscale for OCR; keep it deterministic.
  const requestedUpscale =
    typeof args.upscale === "number" && Number.isFinite(args.upscale) && args.upscale >= 1
      ? Math.trunc(args.upscale)
      : info.width < 900
        ? 4
        : info.width < 1600
          ? 3
          : 2;

  // Don't allow the upscaled image to explode in size.
  const scaledMaxPixels = Math.max(maxPixels, Math.floor(maxPixels * 4));
  let upscale = Math.max(1, Math.min(10, requestedUpscale));
  while (upscale > 1 && info.width * upscale * info.height * upscale > scaledMaxPixels) upscale--;

  const blurSigma =
    typeof args.blurSigma === "number" && Number.isFinite(args.blurSigma) ? clampNumber(args.blurSigma, 0, 10) : 0.3;
  const threshold =
    typeof args.threshold === "number" && Number.isFinite(args.threshold) ? clampInt(args.threshold, 180, 1, 254) : 180;

  let pipeline = sharp(out, { raw: { width: info.width, height: info.height, channels: 1 } }).resize({
    width: info.width * upscale,
    height: info.height * upscale,
    kernel: "nearest",
  });
  if (blurSigma >= 0.3) pipeline = pipeline.blur(blurSigma);

  const masked = await pipeline.threshold(threshold).png().toBuffer();

  const result = await ocrRecognizeBuffer({
    buffer: masked,
    lang: args.lang,
    langPathEffective: args.langPathEffective,
    tessOptions: {
      tessedit_char_whitelist: "0123456789",
      // Sparse text works better for number grids (keeps tokens separate, reduces concatenation).
      tessedit_pageseg_mode: "11",
      user_defined_dpi: "300",
    },
    output: { text: true, tsv: false },
  });

  return { text: result.text, confidence: result.confidence, usedSharp: true };
}

export async function ocrRecognizeImageFileWithPurpleMask(args: {
  filePath: string;
  lang: string;
  langPathEffective: string | null;
  maxPixels?: number;
  minPrimary?: number;
  maxGreen?: number;
  minDelta?: number;
  upscale?: number;
  blurSigma?: number;
  threshold?: number;
}): Promise<{
  text: string;
  confidence: number | null;
  words: OcrWord[];
  lines: OcrLine[];
  usedSharp: boolean;
  upscale: number;
}> {
  const sharp = await getSharpOptional();
  if (!sharp) {
    throw new Error("Missing optional dependency: sharp. Install it to use color-masked OCR.");
  }

  const buffer = await readFile(args.filePath);
  const image = sharp(buffer);
  const meta = await image.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new Error("Unable to read image dimensions");

  const maxPixels = typeof args.maxPixels === "number" && args.maxPixels > 0 ? args.maxPixels : 6_000_000;
  if (w * h > maxPixels) {
    throw new Error(`Refusing huge image (${w}x${h}) for masked OCR (maxPixels=${maxPixels})`);
  }

  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height);

  // Purple labels: high R and B, relatively low G.
  const minPrimary = typeof args.minPrimary === "number" && Number.isFinite(args.minPrimary) ? args.minPrimary : 90;
  const maxGreen = typeof args.maxGreen === "number" && Number.isFinite(args.maxGreen) ? args.maxGreen : 170;
  const minDelta = typeof args.minDelta === "number" && Number.isFinite(args.minDelta) ? args.minDelta : 25;
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    const match =
      a >= 40 && r >= minPrimary && b >= minPrimary && g <= maxGreen && r - g >= minDelta && b - g >= minDelta;
    out[j] = match ? 0 : 255;
  }

  // Upscale for OCR; keep it deterministic.
  const requestedUpscale =
    typeof args.upscale === "number" && Number.isFinite(args.upscale) && args.upscale >= 1
      ? Math.trunc(args.upscale)
      : info.width < 900
        ? 4
        : info.width < 1600
          ? 3
          : 2;

  // Don't allow the upscaled image to explode in size.
  const scaledMaxPixels = Math.max(maxPixels, Math.floor(maxPixels * 4));
  let upscale = Math.max(1, Math.min(10, requestedUpscale));
  while (upscale > 1 && info.width * upscale * info.height * upscale > scaledMaxPixels) upscale--;

  const blurSigma =
    typeof args.blurSigma === "number" && Number.isFinite(args.blurSigma) ? clampNumber(args.blurSigma, 0, 10) : 0.3;
  const threshold =
    typeof args.threshold === "number" && Number.isFinite(args.threshold) ? clampInt(args.threshold, 180, 1, 254) : 180;

  let pipeline = sharp(out, { raw: { width: info.width, height: info.height, channels: 1 } }).resize({
    width: info.width * upscale,
    height: info.height * upscale,
    kernel: "nearest",
  });
  if (blurSigma >= 0.3) pipeline = pipeline.blur(blurSigma);

  const masked = await pipeline.threshold(threshold).png().toBuffer();

  const result = await ocrRecognizeBuffer({
    buffer: masked,
    lang: args.lang,
    langPathEffective: args.langPathEffective,
    tessOptions: {
      tessedit_char_whitelist: "0123456789.",
      // Sparse text works better for isolated numeric labels.
      tessedit_pageseg_mode: "11",
      user_defined_dpi: "300",
    },
    output: { text: true, tsv: true },
  });

  return { ...result, usedSharp: true, upscale };
}

export type ThinBar = { x0: number; x1: number; y0: number; y1: number; cx: number; cy: number; len: number };

export function rectHasInk(
  bw: Uint8Array,
  width: number,
  height: number,
  rect: { x0: number; y0: number; x1: number; y1: number },
  minCount: number
): boolean {
  if (!width || !height) return false;
  const need = Math.max(1, Math.trunc(minCount));

  const x0 = clampInt(Math.trunc(rect.x0), 0, 0, width - 1);
  const x1 = clampInt(Math.trunc(rect.x1), width - 1, 0, width - 1);
  const y0 = clampInt(Math.trunc(rect.y0), 0, 0, height - 1);
  const y1 = clampInt(Math.trunc(rect.y1), height - 1, 0, height - 1);
  if (x1 < x0 || y1 < y0) return false;

  let count = 0;
  for (let y = y0; y <= y1; y++) {
    const off = y * width;
    for (let x = x0; x <= x1; x++) {
      if (bw[off + x] < 128) {
        count++;
        if (count >= need) return true;
      }
    }
  }
  return false;
}

export function rectInkBounds(
  bw: Uint8Array,
  width: number,
  height: number,
  rect: { x0: number; y0: number; x1: number; y1: number },
  minCount: number
): { x0: number; y0: number; x1: number; y1: number; count: number } | null {
  if (!width || !height) return null;
  const need = Math.max(1, Math.trunc(minCount));

  const x0 = clampInt(Math.trunc(rect.x0), 0, 0, width - 1);
  const x1 = clampInt(Math.trunc(rect.x1), width - 1, 0, width - 1);
  const y0 = clampInt(Math.trunc(rect.y0), 0, 0, height - 1);
  const y1 = clampInt(Math.trunc(rect.y1), height - 1, 0, height - 1);
  if (x1 < x0 || y1 < y0) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let count = 0;

  for (let y = y0; y <= y1; y++) {
    const off = y * width;
    for (let x = x0; x <= x1; x++) {
      if (bw[off + x] < 128) {
        count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (count < need) return null;
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
  return { x0: minX, y0: minY, x1: maxX, y1: maxY, count };
}

export function detectThinHorizontalBarsFromBw(
  bw: Uint8Array,
  width: number,
  height: number,
  opts: { minRun: number; maxThickness?: number; mergeY?: number; overlapRatio?: number }
): ThinBar[] {
  const minRun = Math.max(1, Math.trunc(opts.minRun));
  const maxThickness = typeof opts.maxThickness === "number" ? Math.max(1, Math.trunc(opts.maxThickness)) : 12;
  const mergeY = typeof opts.mergeY === "number" ? Math.max(0, Math.trunc(opts.mergeY)) : 2;
  const overlapRatio = typeof opts.overlapRatio === "number" ? clampNumber(opts.overlapRatio, 0.1, 1) : 0.6;

  if (!width || !height) return [];

  const segments: Array<{ x0: number; x1: number; y: number }> = [];
  for (let y = 0; y < height; y++) {
    const rowOff = y * width;
    let x = 0;
    while (x < width) {
      while (x < width && bw[rowOff + x] >= 128) x++;
      const x0 = x;
      while (x < width && bw[rowOff + x] < 128) x++;
      const x1 = x - 1;
      if (x1 >= x0) {
        const len = x1 - x0 + 1;
        if (len >= minRun) segments.push({ x0, x1, y });
      }
    }
  }

  // Merge segments across adjacent rows if they overlap significantly in X.
  const bars: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
  for (const s of segments) {
    let merged = false;
    for (const b of bars) {
      if (s.y > b.y1 + mergeY) continue;
      if (s.y < b.y0 - mergeY) continue;

      const overlap = Math.max(0, Math.min(b.x1, s.x1) - Math.max(b.x0, s.x0) + 1);
      const minLen = Math.max(1, Math.min(b.x1 - b.x0 + 1, s.x1 - s.x0 + 1));
      if (overlap >= minLen * overlapRatio) {
        b.x0 = Math.min(b.x0, s.x0);
        b.x1 = Math.max(b.x1, s.x1);
        b.y0 = Math.min(b.y0, s.y);
        b.y1 = Math.max(b.y1, s.y);
        merged = true;
        break;
      }
    }
    if (!merged) bars.push({ x0: s.x0, x1: s.x1, y0: s.y, y1: s.y });
  }

  return bars
    .filter((b) => b.x1 - b.x0 + 1 >= minRun)
    .filter((b) => b.y1 - b.y0 + 1 <= maxThickness)
    .map((b) => {
      const x0 = clampInt(b.x0, 0, 0, width - 1);
      const x1 = clampInt(b.x1, width - 1, 0, width - 1);
      const y0 = clampInt(b.y0, 0, 0, height - 1);
      const y1 = clampInt(b.y1, height - 1, 0, height - 1);
      const len = x1 - x0 + 1;
      return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, len };
    })
    .sort((a, b) => a.cy - b.cy || a.cx - b.cx);
}

export function detectThinVerticalBarsFromBw(
  bw: Uint8Array,
  width: number,
  height: number,
  opts: { minRun: number; maxThickness?: number; mergeX?: number; overlapRatio?: number }
): ThinBar[] {
  const minRun = Math.max(1, Math.trunc(opts.minRun));
  const maxThickness = typeof opts.maxThickness === "number" ? Math.max(1, Math.trunc(opts.maxThickness)) : 12;
  const mergeX = typeof opts.mergeX === "number" ? Math.max(0, Math.trunc(opts.mergeX)) : 2;
  const overlapRatio = typeof opts.overlapRatio === "number" ? clampNumber(opts.overlapRatio, 0.1, 1) : 0.6;

  if (!width || !height) return [];

  const segments: Array<{ y0: number; y1: number; x: number }> = [];
  for (let x = 0; x < width; x++) {
    let y = 0;
    while (y < height) {
      while (y < height && bw[y * width + x] >= 128) y++;
      const y0 = y;
      while (y < height && bw[y * width + x] < 128) y++;
      const y1 = y - 1;
      if (y1 >= y0) {
        const len = y1 - y0 + 1;
        if (len >= minRun) segments.push({ y0, y1, x });
      }
    }
  }

  // Merge segments across adjacent columns if they overlap significantly in Y.
  const bars: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
  for (const s of segments) {
    let merged = false;
    for (const b of bars) {
      if (s.x > b.x1 + mergeX) continue;
      if (s.x < b.x0 - mergeX) continue;

      const overlap = Math.max(0, Math.min(b.y1, s.y1) - Math.max(b.y0, s.y0) + 1);
      const minLen = Math.max(1, Math.min(b.y1 - b.y0 + 1, s.y1 - s.y0 + 1));
      if (overlap >= minLen * overlapRatio) {
        b.x0 = Math.min(b.x0, s.x);
        b.x1 = Math.max(b.x1, s.x);
        b.y0 = Math.min(b.y0, s.y0);
        b.y1 = Math.max(b.y1, s.y1);
        merged = true;
        break;
      }
    }
    if (!merged) bars.push({ x0: s.x, x1: s.x, y0: s.y0, y1: s.y1 });
  }

  return bars
    .filter((b) => b.y1 - b.y0 + 1 >= minRun)
    .filter((b) => b.x1 - b.x0 + 1 <= maxThickness)
    .map((b) => {
      const x0 = clampInt(b.x0, 0, 0, width - 1);
      const x1 = clampInt(b.x1, width - 1, 0, width - 1);
      const y0 = clampInt(b.y0, 0, 0, height - 1);
      const y1 = clampInt(b.y1, height - 1, 0, height - 1);
      const len = y1 - y0 + 1;
      return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, len };
    })
    .sort((a, b) => a.cx - b.cx || a.cy - b.cy);
}

export async function ocrIntegerFromImageRegion(args: {
  sharp: any;
  source: Buffer;
  left: number;
  top: number;
  width: number;
  height: number;
  threshold: number;
  thresholds?: number[];
  lang: string;
  langPathEffective: string | null;
  psms: number[];
  minValue?: number;
  maxValue?: number;
}): Promise<number | null> {
  const left = Math.trunc(args.left);
  const top = Math.trunc(args.top);
  const width = Math.trunc(args.width);
  const height = Math.trunc(args.height);
  if (width <= 0 || height <= 0) return null;

  const minValue = typeof args.minValue === "number" && Number.isFinite(args.minValue) ? args.minValue : null;
  const maxValue = typeof args.maxValue === "number" && Number.isFinite(args.maxValue) ? args.maxValue : null;

  const thresholdListRaw = Array.isArray(args.thresholds) && args.thresholds.length ? args.thresholds : [args.threshold];
  const thresholdList = thresholdListRaw
    .map((t) => clampInt(t, 200, 1, 254))
    .filter((t, i, arr) => arr.indexOf(t) === i);

  let best: { n: number; confidence: number; digits: number } | null = null;

  for (const thr of thresholdList) {
    let buf: Buffer;
    try {
      // Many GAIA image tasks contain tiny digits; upscaling materially improves OCR recall.
      const targetW = 320;
      const scale = width > 0 && width < targetW ? Math.max(1, Math.min(8, Math.ceil(targetW / width))) : 1;
      let pipeline = args.sharp(args.source).extract({ left, top, width, height }).grayscale().normalize();
      if (scale > 1) {
        pipeline = pipeline.resize({ width: width * scale, height: height * scale, kernel: "nearest" });
      }
      buf = await pipeline.threshold(thr).png().toBuffer();
    } catch {
      continue;
    }

    for (const psm of args.psms) {
      const out = await ocrRecognizeBuffer({
        buffer: buf,
        lang: args.lang,
        langPathEffective: args.langPathEffective,
        tessOptions: {
          tessedit_char_whitelist: "0123456789",
          tessedit_pageseg_mode: String(Math.trunc(psm)),
          user_defined_dpi: "300",
        },
        output: { text: true, tsv: false },
      });

      const rawText = String(out.text ?? "").trim();
      const runs = rawText.match(/-?\d+/g) ?? [];
      if (!runs.length) continue;

      // Prefer longer digit runs (avoids picking the row index "1" when the crop also contains "29").
      // Also add suffix candidates to repair common OCR concatenation like "129" (index + number).
      const candidates: Array<{ n: number; digits: number }> = [];
      for (const r0 of runs) {
        const r = String(r0 ?? "").trim();
        const digits = r.replace(/^-/, "").length;
        const n0 = Number.parseInt(r, 10);
        if (Number.isFinite(n0)) candidates.push({ n: n0, digits });
        if (digits >= 3) {
          const suff2 = r.replace(/^-/, "").slice(-2);
          const n2 = Number.parseInt(suff2, 10);
          if (Number.isFinite(n2)) candidates.push({ n: n2, digits: 2 });
          const suff1 = r.replace(/^-/, "").slice(-1);
          const n1 = Number.parseInt(suff1, 10);
          if (Number.isFinite(n1)) candidates.push({ n: n1, digits: 1 });
        }
      }

      const filtered = candidates
        .filter((c) => Number.isFinite(c.n))
        .filter((c) => (minValue !== null ? c.n >= minValue : true))
        .filter((c) => (maxValue !== null ? c.n <= maxValue : true));
      if (!filtered.length) continue;

      filtered.sort((a, b) => b.digits - a.digits || b.n - a.n);
      const picked = filtered[0];

      const conf = typeof out.confidence === "number" && Number.isFinite(out.confidence) ? out.confidence : -1;
      // Primary key: digits (implicit via selection); secondary: OCR confidence.
      // Use confidence to break ties across different threshold/PSM attempts.
      if (!best || picked.digits > best.digits || (picked.digits === best.digits && conf > best.confidence)) {
        best = { n: picked.n, confidence: conf, digits: picked.digits };
      }
    }
  }

  return best ? best.n : null;
}

export async function gradeFractionQuizFromImageRowBands(args: {
  sharp: any;
  filePath: string;
  lang: string;
  langPathEffective: string | null;
  bonusPoints: number;
  pointsAddSubtract: number;
  pointsMultiplyDivide: number;
  pointsImproperFraction: number;
  pointsMixedNumber: number;
}): Promise<
  | {
      extractedQuestionCount: number;
      score: number;
      perQuestion: Array<{
        index: number;
        type: string;
        correct: boolean;
        points: number;
        studentAnswer: string | null;
        correctAnswer: string;
        debug?: any;
      }>;
    }
  | null
> {
  const debugEnabled = process.env.NODEBENCH_DEBUG_FRACTION_QUIZ === "1";

  const meta = await args.sharp(args.filePath).metadata();
  const w0 = meta.width ?? 0;
  const h0 = meta.height ?? 0;
  if (!w0 || !h0) return null;

  const scale = w0 < 1200 ? 3 : w0 < 2000 ? 2 : 1;
  const width = w0 * scale;
  const height = h0 * scale;

  const base = await args.sharp(args.filePath)
    .grayscale()
    .resize({ width, height, kernel: "lanczos3" })
    .normalize()
    .png()
    .toBuffer();

  // Detect question row centers from a narrow left strip so math digits don't dominate.
  const { data: bw, info } = await args.sharp(base)
    .grayscale()
    .threshold(210)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bwW = info.width;
  const bwH = info.height;

  const leftW = Math.max(20, Math.floor(bwW * 0.04));
  const yMin = Math.floor(bwH * 0.08);
  const yMax = Math.floor(bwH * 0.92);

  const rowCounts = new Array<number>(bwH).fill(0);
  let maxRow = 0;
  for (let y = yMin; y < yMax; y++) {
    let c = 0;
    const off = y * bwW;
    for (let x = 0; x < leftW; x++) if (bw[off + x] < 128) c++;
    rowCounts[y] = c;
    if (c > maxRow) maxRow = c;
  }
  if (maxRow <= 0) return null;

  const peakThresh = Math.max(2, Math.floor(maxRow * 0.45));
  const segs: Array<{ cy: number; peak: number }> = [];
  for (let y = yMin; y < yMax; y++) {
    if (rowCounts[y] < peakThresh) continue;
    let y2 = y;
    let peak = rowCounts[y];
    while (y2 + 1 < yMax && rowCounts[y2 + 1] >= peakThresh) {
      y2++;
      peak = Math.max(peak, rowCounts[y2]);
    }
    segs.push({ cy: (y + y2) / 2, peak });
    y = y2;
  }
  if (segs.length < 6) return null;

  segs.sort((a, b) => a.cy - b.cy);

  // Merge nearby segments (digits like "10" can produce multiple peaks).
  const merged: Array<{ cy: number; peak: number }> = [];
  const mergeTol = Math.max(20, Math.round(bwH * 0.018));
  for (const s of segs) {
    const last = merged[merged.length - 1];
    if (!last || Math.abs(s.cy - last.cy) > mergeTol) {
      merged.push({ ...s });
      continue;
    }
    const wA = Math.max(1, last.peak);
    const wB = Math.max(1, s.peak);
    last.cy = (last.cy * wA + s.cy * wB) / (wA + wB);
    last.peak = Math.max(last.peak, s.peak);
  }

  const pickBestWindow = (centers: number[], k: number) => {
    if (centers.length <= k) return centers;
    let best = centers.slice(0, k);
    let bestScore = Number.POSITIVE_INFINITY;
    for (let i = 0; i + k - 1 < centers.length; i++) {
      const cand = centers.slice(i, i + k);
      const spacings = cand.slice(1).map((y, j) => y - cand[j]);
      const avg = spacings.reduce((s, n) => s + n, 0) / spacings.length;
      const variance = spacings.reduce((s, n) => s + (n - avg) * (n - avg), 0) / spacings.length;
      if (variance < bestScore) {
        bestScore = variance;
        best = cand;
      }
    }
    return best;
  };

  const centersAll = merged.map((m) => m.cy).filter((n) => Number.isFinite(n));
  const targetK = centersAll.length >= 10 ? 10 : centersAll.length;
  const centers = pickBestWindow(centersAll, targetK).sort((a, b) => a - b);
  if (centers.length < 6) return null;

  // Use padded bands around each detected row-center. Midpoint-only bands were too tight on
  // GAIA's fraction quiz screenshots and could clip stacked numerators/denominators or the
  // answer box (conversion rows often place the box on the next line).
  const spacingAt = (i: number) => {
    const prev = i > 0 ? centers[i] - centers[i - 1] : centers.length > 1 ? centers[1] - centers[0] : height;
    const next = i + 1 < centers.length ? centers[i + 1] - centers[i] : prev;
    const s = Math.max(1, Math.min(prev, next));
    return s;
  };

  const rowBand = (i: number): { y0: number; y1: number; spacing: number } => {
    const spacing = spacingAt(i);
    const padTop = Math.max(24, Math.round(spacing * 0.45));
    const padBot = Math.max(24, Math.round(spacing * 0.75));
    const y0 = clampInt(Math.floor(centers[i] - padTop), 0, 0, height - 1);
    const y1 = clampInt(Math.ceil(centers[i] + padBot), height, y0 + 1, height);
    return { y0, y1, spacing };
  };

  // These ratios are tuned to GAIA's fraction quiz screenshot layout.
  // Expression region must be wide enough to include stacked fractions.
  // Expression region must be wide enough to include stacked fractions.
  const exprX1 = Math.min(width, Math.floor(width * 0.55));
  const answerX0 = Math.floor(width * 0.12);
  const answerX1 = Math.min(width, Math.floor(width * 0.46));

  const perQuestion: Array<{
    index: number;
    type: string;
    correct: boolean;
    points: number;
    studentAnswer: string | null;
    correctAnswer: string;
    debug?: any;
  }> = [];

  let total = 0;

  const parseAllFractionsLoose = (text: string): Fraction[] => {
    const out: Fraction[] = [];
    for (const m of String(text ?? "").matchAll(/(-?\d+)\s*\/\s*(\d+)/g)) {
      const n = Number.parseInt(m[1], 10);
      const d = Number.parseInt(m[2], 10);
      if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) continue;
      try {
        out.push(normalizeFraction({ n, d }));
      } catch {
        // ignore
      }
    }
    return out;
  };

  const parseAllMixedNumbersLoose = (text: string): Array<{ whole: number; frac: Fraction }> => {
    const out: Array<{ whole: number; frac: Fraction }> = [];
    for (const m of String(text ?? "").matchAll(/(-?\d+)\s+(-?\d+)\s*\/\s*(\d+)/g)) {
      const whole = Number.parseInt(m[1], 10);
      const n = Number.parseInt(m[2], 10);
      const d = Number.parseInt(m[3], 10);
      if (!Number.isFinite(whole) || !Number.isFinite(n) || !Number.isFinite(d) || d === 0) continue;
      try {
        out.push({ whole, frac: normalizeFraction({ n, d }) });
      } catch {
        // ignore
      }
    }
    return out;
  };

  for (let i = 0; i < centers.length; i++) {
    const idx = i + 1;
    const band = rowBand(i);
    const y0 = band.y0;
    const y1 = band.y1;
    const rowH = Math.max(1, y1 - y0);

    // Detect the answer box X-range for this row. We use it to:
    // 1) Exclude answer-box fraction bars from operand extraction (critical for conversion rows)
    // 2) Narrow answer OCR to the box region for cleaner parsing.
    const rowGrayFull = await args.sharp(base)
      .extract({ left: 0, top: y0, width, height: rowH })
      .png()
      .toBuffer();
    const { data: rowBwFull, info: rowInfo } = await args.sharp(rowGrayFull)
      .grayscale()
      .threshold(210)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Light OCR on the row text to detect conversion prompts ("Turn ... into ...").
    // We keep this cheap (no TSV) and deterministic.
    const rowTextBuf = await args.sharp(base)
      .extract({ left: 0, top: y0, width: Math.max(1, Math.floor(width * 0.62)), height: rowH })
      .grayscale()
      .normalize()
      .threshold(200)
      .png()
      .toBuffer();
    const rowOcr = await ocrRecognizeBuffer({
      buffer: rowTextBuf,
      lang: args.lang,
      langPathEffective: args.langPathEffective,
      tessOptions: { tessedit_pageseg_mode: "6", user_defined_dpi: "300" },
      output: { text: true, tsv: false },
    });
    const rowLower = rowOcr.text.toLowerCase();
    const rowHasTurn = rowLower.includes("turn");
    const rowHintMixed = rowLower.includes("mixed");
    const rowHintImproper = rowLower.includes("improper");

    const detectAnswerBoxRect = (): { x0: number; x1: number; y0: number; y1: number } | null => {
      // Answer boxes are drawn as rectangles with long-ish horizontal borders.
      // Detect the longest horizontal bar that isn't the page border, then expand to all overlapping bars.
      const minRun = Math.max(30, Math.round(rowInfo.width * 0.06));
      const maxThickness = Math.max(2, Math.round(rowInfo.height * 0.18));
      const bars = detectThinHorizontalBarsFromBw(rowBwFull, rowInfo.width, rowInfo.height, {
        minRun,
        maxThickness,
        mergeY: 1,
        overlapRatio: 0.65,
      })
        // Exclude anything that starts in the left margin (question numbers).
        .filter((b) => b.x0 >= Math.round(rowInfo.width * 0.08))
        // Exclude extremely long lines (page borders / separators).
        .filter((b) => b.len <= Math.round(rowInfo.width * 0.5));

      if (!bars.length) return null;
      const best = [...bars].sort((a, b) => b.len - a.len)[0];
      const overlap = (a: ThinBar, b: ThinBar) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + 1);
      const overlapsBest = bars.filter((b) => {
        const ov = overlap(best, b);
        const minLen = Math.max(1, Math.min(best.len, b.len));
        return ov >= minLen * 0.72;
      });

      let x0 = best.x0;
      let x1 = best.x1;
      let y0 = best.y0;
      let y1 = best.y1;
      for (const b of overlapsBest) {
        if (b.x0 < x0) x0 = b.x0;
        if (b.x1 > x1) x1 = b.x1;
        if (b.y0 < y0) y0 = b.y0;
        if (b.y1 > y1) y1 = b.y1;
      }

      // Sanity: require a reasonable box width.
      const boxW = x1 - x0 + 1;
      if (boxW < Math.round(rowInfo.width * 0.06) || boxW > Math.round(rowInfo.width * 0.45)) return null;
      const boxH = y1 - y0 + 1;
      if (boxH < Math.max(10, Math.round(rowInfo.height * 0.12)) || boxH > Math.round(rowInfo.height * 0.9)) {
        return null;
      }
      return { x0, x1, y0, y1 };
    };

    const answerBox = detectAnswerBoxRect();

    // Pixel-run fraction-bar detection is more reliable than OCR token geometry for stacked fractions.
    // OCR struggles to emit numerator/denominator tokens consistently for tiny stacked fractions.
    const exprGray = await args.sharp(base)
      .extract({
        left: 0,
        top: y0,
        width: Math.max(
          1,
          Math.min(
            exprX1,
            // Prefer excluding the answer box so we don't treat student-answer fractions as operands.
            answerBox ? Math.max(1, Math.round(answerBox.x0 - Math.max(10, rowInfo.width * 0.01))) : exprX1
          )
        ),
        height: rowH,
      })
      .png()
      .toBuffer();

    const { data: exprBw, info: exprInfo } = await args.sharp(exprGray)
      .grayscale()
      .threshold(210)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Fraction bars are short relative to the row width; keep minRun small and filter by ink above/below.
    // Raise the minimum run length to avoid misclassifying operator glyphs (notably the "÷" bar)
    // as fraction bars. Stacked fraction bars in this screenshot are materially longer.
    const minBarRun = Math.max(18, Math.round(exprInfo.width * 0.02));
    const bars = detectThinHorizontalBarsFromBw(exprBw, exprInfo.width, exprInfo.height, {
      minRun: minBarRun,
      maxThickness: Math.max(2, Math.round(exprInfo.height * 0.14)),
    });

    const rowCenterLocal = centers[i] - y0;
    // Use row spacing (not row crop height) to keep parsing stable even if bands overlap slightly.
    const yWindow = Math.max(30, Math.round(band.spacing * 0.42));
    const aboveH = Math.max(8, Math.round(exprInfo.height * 0.18));
    const belowH = aboveH;

    const candidateBars = bars
      .filter((b) => Math.abs(b.cy - rowCenterLocal) <= yWindow)
      .filter((b) => b.len >= minBarRun)
      // Avoid giant horizontal lines like answer-box borders.
      .filter((b) => b.len <= Math.max(minBarRun, Math.round(exprInfo.width * 0.28)))
      .filter((b) => {
        const padX = Math.max(2, Math.round(b.len * 0.25));
        const x0 = clampInt(b.x0 - padX, 0, 0, exprInfo.width - 1);
        const x1 = clampInt(b.x1 + padX, exprInfo.width - 1, 0, exprInfo.width - 1);

        const aboveY0 = clampInt(b.y0 - aboveH, 0, 0, exprInfo.height - 1);
        const aboveY1 = clampInt(b.y0 - 1, exprInfo.height - 1, 0, exprInfo.height - 1);
        const belowY0 = clampInt(b.y1 + 1, exprInfo.height - 1, 0, exprInfo.height - 1);
        const belowY1 = clampInt(b.y1 + belowH, exprInfo.height - 1, 0, exprInfo.height - 1);

        const minInk = Math.max(4, Math.round(b.len * 0.05));
        return (
          rectHasInk(exprBw, exprInfo.width, exprInfo.height, { x0, y0: aboveY0, x1, y1: aboveY1 }, minInk) &&
          rectHasInk(exprBw, exprInfo.width, exprInfo.height, { x0, y0: belowY0, x1, y1: belowY1 }, minInk)
        );
      })
      .sort(
        (a, b) =>
          Math.abs(a.cy - rowCenterLocal) - Math.abs(b.cy - rowCenterLocal) || b.len - a.len || a.cx - b.cx
      );

    const fracPairs: Array<{ x: number; frac: Fraction; bar: ThinBar }> = [];
    for (const bar of candidateBars) {
      // Adaptive crop sizes: longer fraction bars generally mean larger numerators/denominators (more digits).
      const padY = Math.max(1, Math.round(exprInfo.height * 0.012));
      const boxH = clampInt(Math.round(Math.max(exprInfo.height * 0.18, bar.len * 0.85)), 44, 14, 80);

      // Bar detection sometimes yields a short segment of the true fraction bar (especially under thin fonts).
      // Use a wider, center-based crop so 2-digit numerators/denominators aren't clipped.
      const desiredW = clampInt(
        Math.round(bar.len * 2.4),
        80,
        Math.max(44, Math.round(exprInfo.width * 0.035)),
        Math.max(80, Math.round(exprInfo.width * 0.22))
      );
      const cropX0 = clampInt(Math.round(bar.cx - desiredW / 2), 0, 0, exprInfo.width - 1);
      const cropX1 = clampInt(cropX0 + desiredW - 1, exprInfo.width - 1, 0, exprInfo.width - 1);
      const cropW = Math.max(1, cropX1 - cropX0 + 1);

      const numY1 = clampInt(bar.y0 - padY, exprInfo.height, 0, exprInfo.height);
      const numY0 = clampInt(numY1 - boxH, 0, 0, numY1);
      const numH = numY1 - numY0;

      const denY0 = clampInt(bar.y1 + padY, exprInfo.height - 1, 0, exprInfo.height - 1);
      const denY1 = clampInt(denY0 + boxH, exprInfo.height, denY0, exprInfo.height);
      const denH = denY1 - denY0;

      if (numH < 6 || denH < 6) continue;

      const tightenForOcr = (rect: { x0: number; y0: number; x1: number; y1: number }): { left: number; top: number; width: number; height: number } => {
        const minInk = Math.max(2, Math.round(bar.len * 0.03));
        const bounds = rectInkBounds(exprBw, exprInfo.width, exprInfo.height, rect, minInk);
        if (!bounds) {
          return {
            left: rect.x0,
            top: rect.y0,
            width: Math.max(1, rect.x1 - rect.x0 + 1),
            height: Math.max(1, rect.y1 - rect.y0 + 1),
          };
        }

        const pad = Math.max(2, Math.round(bar.len * 0.08));
        const x0 = clampInt(bounds.x0 - pad, 0, 0, exprInfo.width - 1);
        const x1 = clampInt(bounds.x1 + pad, exprInfo.width - 1, 0, exprInfo.width - 1);
        const y0 = clampInt(bounds.y0 - pad, 0, 0, exprInfo.height - 1);
        const y1 = clampInt(bounds.y1 + pad, exprInfo.height - 1, 0, exprInfo.height - 1);
        return {
          left: x0,
          top: y0,
          width: Math.max(1, x1 - x0 + 1),
          height: Math.max(1, y1 - y0 + 1),
        };
      };

      const numCrop = tightenForOcr({ x0: cropX0, y0: numY0, x1: cropX0 + cropW - 1, y1: numY0 + numH - 1 });
      const denCrop = tightenForOcr({ x0: cropX0, y0: denY0, x1: cropX0 + cropW - 1, y1: denY0 + denH - 1 });

      const n = await ocrIntegerFromImageRegion({
        sharp: args.sharp,
        source: exprGray,
        left: numCrop.left,
        top: numCrop.top,
        width: numCrop.width,
        height: numCrop.height,
        threshold: 200,
        thresholds: [150, 170, 190, 210],
        lang: args.lang,
        langPathEffective: args.langPathEffective,
        psms: [11, 7],
        minValue: 0,
        maxValue: 99,
      });
      const d = await ocrIntegerFromImageRegion({
        sharp: args.sharp,
        source: exprGray,
        left: denCrop.left,
        top: denCrop.top,
        width: denCrop.width,
        height: denCrop.height,
        threshold: 200,
        thresholds: [150, 170, 190, 210],
        lang: args.lang,
        langPathEffective: args.langPathEffective,
        psms: [7, 6],
        minValue: 1,
        maxValue: 99,
      });

      if (n === null || d === null || d === 0) continue;

      try {
        fracPairs.push({ x: bar.cx, frac: normalizeFraction({ n, d }), bar });
      } catch {
        // ignore
      }

      // Keep scanning a bit: OCR can fail for one bar; grabbing multiple candidates improves recall.
      if (fracPairs.length >= 4) break;
    }

    fracPairs.sort((a, b) => a.x - b.x);
    const fracs: Array<{ x: number; frac: Fraction; bar: ThinBar }> = [];
    const minDx = Math.max(10, Math.round(exprInfo.width * 0.035));
    for (const fp of fracPairs) {
      const last = fracs[fracs.length - 1];
      if (last && Math.abs(fp.x - last.x) < minDx) continue;
      fracs.push(fp);
      if (fracs.length >= 2) break;
    }

    // OCR answer box (digits + slash). Some rows place the answer box on the next line and slightly more
    // to the left; if the primary crop yields nothing parseable, do a second pass on the lower portion.
    const ocrAnswerFromCrop = async (crop: { left: number; top: number; width: number; height: number }) => {
      const buf = await args.sharp(base).extract(crop).png().toBuffer();
      const out = await ocrRecognizeBuffer({
        buffer: buf,
        lang: args.lang,
        langPathEffective: args.langPathEffective,
        tessOptions: {
          tessedit_char_whitelist: "0123456789/- ",
          tessedit_pageseg_mode: "7",
          user_defined_dpi: "300",
        },
        output: { text: true, tsv: false },
      });
      return out.text.replace(/\r/g, "\n").trim();
    };

    const defaultAnswerCrop = {
      left: answerX0,
      top: y0,
      width: Math.max(1, answerX1 - answerX0),
      height: rowH,
    };
    const answerCrop = (() => {
      if (!answerBox) return defaultAnswerCrop;

      // Crop tightly to the answer box's vertical range to avoid including operand fractions
      // (which can prepend extra digits like the row index).
      const padX = Math.max(6, Math.round(rowInfo.width * 0.01));
      const padY = Math.max(6, Math.round(rowInfo.height * 0.06));

      const left = clampInt(answerBox.x0 - padX, 0, 0, width - 1);
      const right = clampInt(answerBox.x1 + padX, width - 1, 0, width - 1);
      const w = Math.max(1, right - left + 1);

      const top = clampInt(y0 + answerBox.y0 - padY, 0, 0, height - 1);
      const bottom = clampInt(y0 + answerBox.y1 + padY, height, top + 1, height);
      return { left, top, width: w, height: Math.max(1, bottom - top) };
    })();

    let ansText = await ocrAnswerFromCrop({
      left: answerCrop.left,
      top: answerCrop.top,
      width: answerCrop.width,
      height: answerCrop.height,
    });
    let studentMixedAll = parseAllMixedNumbersLoose(ansText);
    let studentFracAll = parseAllFractionsLoose(ansText);

    if (!studentMixedAll.length && !studentFracAll.length) {
      const altLeft = Math.floor(width * 0.05);
      const altRight = Math.min(width, Math.floor(width * 0.45));
      const altTop = y0 + Math.floor(rowH * 0.35);
      if (altRight > altLeft && altTop < y1) {
        const altText = await ocrAnswerFromCrop({
          left: altLeft,
          top: altTop,
          width: Math.max(1, altRight - altLeft),
          height: Math.max(1, y1 - altTop),
        });
        const mixedAlt = parseAllMixedNumbersLoose(altText);
        const fracAlt = parseAllFractionsLoose(altText);
        if (mixedAlt.length || fracAlt.length) {
          ansText = altText;
          studentMixedAll = mixedAlt;
          studentFracAll = fracAlt;
        }
      }
    }

    // Conversion rows can place the answer box below the row midpoint band.
    // If we suspect a conversion prompt and still found nothing, scan lower (but stop before the next row center).
    if (rowHasTurn && !studentMixedAll.length && !studentFracAll.length && i + 1 < centers.length) {
      const spacing = centers[i + 1] - centers[i];
      const y1Ext = clampInt(Math.ceil(centers[i] + spacing * 0.9), height, y1, height);
      const extLeft = Math.floor(width * 0.05);
      const extRight = Math.min(width, Math.floor(width * 0.55));
      if (y1Ext > y0 + 8 && extRight > extLeft + 20) {
        const extText = await ocrAnswerFromCrop({
          left: extLeft,
          top: y0,
          width: Math.max(1, extRight - extLeft),
          height: Math.max(1, y1Ext - y0),
        });
        const mixedExt = parseAllMixedNumbersLoose(extText);
        const fracExt = parseAllFractionsLoose(extText);
        if (mixedExt.length || fracExt.length) {
          ansText = extText;
          studentMixedAll = mixedExt;
          studentFracAll = fracExt;
        }
      }
    }

    // Decide if this is a conversion row ("Turn ..."). Prefer explicit row text.
    const conversionModeHint: "improper" | "mixed" | null = rowHasTurn
      ? rowHintImproper && !rowHintMixed
        ? "improper"
        : rowHintMixed && !rowHintImproper
          ? "mixed"
          : null
      : null;

    let conversionMode: "improper" | "mixed" | null = null;
    if (conversionModeHint) conversionMode = conversionModeHint;
    else if (rowHasTurn) {
      // If OCR missed the keywords, infer from the student's answer shape.
      if (studentMixedAll.length > 0) conversionMode = "mixed";
      else if (studentFracAll.length > 0) conversionMode = "improper";
    }

    // Grade conversion tasks first. Even if bar detection accidentally yields 2 fractions, "Turn" rows are conversions.
    if (rowHasTurn && conversionMode && fracs.length >= 1) {
      const givenEntry = [...fracs].sort((a, b) => b.bar.len - a.bar.len || a.x - b.x)[0];
      const given = givenEntry.frac;
      const givenBar = givenEntry.bar;

      if (conversionMode === "improper") {
        // Turn W N/D into an improper fraction.
        let whole: number | null = null;
        const m = rowLower.match(/turn\s+(-?\d+)/);
        const wholeFromText = m ? toIntegerOrNull(m[1]) : null;
        if (typeof wholeFromText === "number" && Number.isFinite(wholeFromText)) {
          whole = wholeFromText;
        }

        // OCR the number just to the left of the fraction (avoid the question index column). Prefer pixel OCR if it succeeds.
        const regionX1 = givenBar.x0 - 1;
        const regionW = Math.max(24, Math.round(exprInfo.width * 0.26));
        const idxColX1 = Math.round(exprInfo.width * 0.12);
        const regionX0 = Math.max(idxColX1, Math.max(0, regionX1 - regionW));
        const cropW = regionX1 - regionX0 + 1;
        if (regionX1 >= regionX0 && cropW >= 10) {
          const boxH = clampInt(
            Math.round(givenBar.len * 1.2),
            Math.round(exprInfo.height * 0.28),
            14,
            Math.max(14, Math.round(exprInfo.height * 0.55))
          );
          const y0w = clampInt(Math.round(givenBar.cy - boxH), 0, 0, exprInfo.height - 1);
          const y1w = clampInt(Math.round(givenBar.cy + boxH), exprInfo.height, y0w + 1, exprInfo.height);
          const h = y1w - y0w;
          if (h >= 8) {
            const wholeFromPixels = await ocrIntegerFromImageRegion({
              sharp: args.sharp,
              source: exprGray,
              left: regionX0,
              top: y0w,
              width: cropW,
              height: h,
              threshold: 200,
              thresholds: [150, 170, 190, 210],
              lang: args.lang,
              langPathEffective: args.langPathEffective,
              psms: [7, 6, 11],
              minValue: 0,
              maxValue: 200,
            });
            if (wholeFromPixels !== null) whole = wholeFromPixels;
          }
        }

        if (whole === null) continue;
        const correct = normalizeFraction({ n: whole * given.d + Math.abs(given.n), d: given.d });
        const picked = studentFracAll.find((f) => fractionsEqual(f, correct)) ?? null;
        const ok = !!picked;
        const pts = ok ? args.pointsImproperFraction : 0;
        total += pts;
        perQuestion.push({
          index: idx,
          type: "improper_fraction",
          correct: ok,
          points: pts,
          studentAnswer: picked
            ? fractionToString(picked)
            : studentFracAll[0]
              ? fractionToString(studentFracAll[0])
              : null,
          correctAnswer: fractionToString(correct),
        });
        continue;
      }

      // conversionMode === "mixed"
      const wholeOut = Math.trunc(given.n / given.d);
      const rem = Math.abs(given.n % given.d);
      const correctFrac = normalizeFraction({ n: rem, d: given.d });
      const picked =
        studentMixedAll.find((m) => m.whole === wholeOut && fractionsEqual(m.frac, correctFrac)) ?? null;
      const ok = !!picked;
      const pts = ok ? args.pointsMixedNumber : 0;
      total += pts;
      perQuestion.push({
        index: idx,
        type: "mixed_number",
        correct: ok,
        points: pts,
        studentAnswer: picked
          ? mixedNumberToString(picked.whole, picked.frac)
          : studentMixedAll[0]
            ? mixedNumberToString(studentMixedAll[0].whole, studentMixedAll[0].frac)
            : null,
        correctAnswer: mixedNumberToString(wholeOut, correctFrac),
      });
      continue;
    }

    // Grade arithmetic by matching the student's answer against all possible ops.
    if (fracs.length >= 2) {
      const a = fracs[0].frac;
      const b = fracs[1].frac;
      const candidates: Array<{ kind: "add_subtract" | "multiply_divide"; frac: Fraction; pts: number }> = [];
      try {
        candidates.push({ kind: "add_subtract", frac: addFractions(a, b), pts: args.pointsAddSubtract });
      } catch {}
      try {
        candidates.push({ kind: "add_subtract", frac: subFractions(a, b), pts: args.pointsAddSubtract });
      } catch {}
      try {
        candidates.push({ kind: "multiply_divide", frac: mulFractions(a, b), pts: args.pointsMultiplyDivide });
      } catch {}
      try {
        candidates.push({ kind: "multiply_divide", frac: divFractions(a, b), pts: args.pointsMultiplyDivide });
      } catch {}

      let match: (typeof candidates)[number] | null = null;
      let studentPicked: Fraction | null = null;
      for (const sf of studentFracAll) {
        const m = candidates.find((c) => fractionsEqual(sf, c.frac));
        if (m) {
          match = m;
          studentPicked = sf;
          break;
        }
      }

      const ok = !!match;
      const pts = ok && match ? match.pts : 0;
      total += pts;
      perQuestion.push({
        index: idx,
        type: match?.kind ?? "arithmetic",
        correct: ok,
        points: pts,
        studentAnswer: studentPicked
          ? fractionToString(studentPicked)
          : studentFracAll[0]
            ? fractionToString(studentFracAll[0])
            : null,
        correctAnswer: match ? fractionToString(match.frac) : fractionToString(addFractions(a, b)),
        debug: debugEnabled
          ? {
              operands: [fractionToString(a), fractionToString(b)],
              studentCandidates: studentFracAll.map(fractionToString).slice(0, 8),
            }
          : undefined,
      });
      continue;
    }
  }

  total += args.bonusPoints;

  // Return only if we graded a meaningful number of rows (avoids false positives on unrelated images).
  if (perQuestion.length < Math.min(centers.length, 6)) return null;

  return { extractedQuestionCount: perQuestion.length, score: total, perQuestion };
}


export const FASTER_WHISPER_PY_SCRIPT_V1 = `# NodeBench MCP audio transcription helper (faster-whisper)
# This file is written to a temp directory at runtime.
import argparse
import json
import sys


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--path", required=True)
    p.add_argument("--model", default="tiny.en")
    p.add_argument("--language", default="")
    p.add_argument("--task", default="transcribe")
    p.add_argument("--beam-size", type=int, default=5)
    p.add_argument("--vad-filter", type=int, default=0)
    p.add_argument("--max-chars", type=int, default=12000)
    p.add_argument("--include-segments", type=int, default=0)
    args = p.parse_args()

    try:
        from faster_whisper import WhisperModel
    except Exception:
        sys.stderr.write(
            "Missing python dependency: faster-whisper. Install with: pip install faster-whisper\\n"
        )
        raise

    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        args.path,
        beam_size=max(1, int(args.beam_size)),
        language=(args.language or None),
        task=(args.task or "transcribe"),
        vad_filter=bool(int(args.vad_filter)),
        word_timestamps=False,
        temperature=0.0,
    )

    include_segments = bool(int(args.include_segments))
    max_chars = max(200, int(args.max_chars))

    parts = []
    segs = []
    char_budget = 0
    truncated = False

    for seg in segments:
        t = str(getattr(seg, "text", "") or "")
        if not t:
            continue
        parts.append(t)
        if include_segments:
            segs.append(
                {
                    "start": float(getattr(seg, "start", 0.0) or 0.0),
                    "end": float(getattr(seg, "end", 0.0) or 0.0),
                    "text": t,
                }
            )
        char_budget += len(t)
        if char_budget >= max_chars:
            truncated = True
            break

    text = "".join(parts).strip()
    if len(text) > max_chars:
        text = text[:max_chars]
        truncated = True

    out = {
        "path": args.path,
        "model": args.model,
        "task": args.task,
        "language": getattr(info, "language", None),
        "languageProbability": getattr(info, "language_probability", None),
        "durationSeconds": getattr(info, "duration", None),
        "beamSize": int(args.beam_size),
        "vadFilter": bool(int(args.vad_filter)),
        "maxChars": max_chars,
        "truncated": truncated,
        "text": text,
    }
    if include_segments:
        out["segments"] = segs
    sys.stdout.write(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
`;

export function findPythonExecutable(): string {
  const override =
    process.env.NODEBENCH_PYTHON ||
    process.env.NODEBENCH_AUDIO_PYTHON ||
    process.env.PYTHON ||
    process.env.PYTHON_EXE ||
    "";
  if (override) return String(override);

  const candidates = [
    path.join(process.cwd(), "python-mcp-servers", ".venv", "Scripts", "python.exe"),
    path.join(process.cwd(), "python-mcp-servers", ".venv", "bin", "python"),
    path.join(process.cwd(), "..", "python-mcp-servers", ".venv", "Scripts", "python.exe"),
    path.join(process.cwd(), "..", "python-mcp-servers", ".venv", "bin", "python"),
    path.join(process.cwd(), "..", "..", "python-mcp-servers", ".venv", "Scripts", "python.exe"),
    path.join(process.cwd(), "..", "..", "python-mcp-servers", ".venv", "bin", "python"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  return "python";
}

export async function ensureFasterWhisperHelperScript(): Promise<string> {
  const dir = path.join(os.tmpdir(), "nodebench-mcp", "audio");
  const scriptPath = path.join(dir, "transcribe_faster_whisper_v1.py");

  if (!existsSync(scriptPath)) {
    const fs = await import("node:fs/promises");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(scriptPath, FASTER_WHISPER_PY_SCRIPT_V1, "utf8");
  }

  return scriptPath;
}

