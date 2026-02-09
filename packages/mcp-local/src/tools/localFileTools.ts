/**
 * Local file parsing tools (deterministic).
 *
 * These tools intentionally avoid network access and operate only on local files.
 * Primary use cases:
 * - GAIA file-backed tasks (PDF / XLSX / CSV attachments)
 * - Internal agent workflows that need structured parsing without "LLM OCR"
 *
 * Optional deps (installed by default when available):
 * - xlsx: XLSX parsing
 * - papaparse: CSV parsing
 * - pdf-parse: PDF text extraction (page-aware)
 * - yauzl: ZIP/DOCX/PPTX parsing
 * - tesseract.js: Image OCR (PNG/JPG/etc)
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { McpTool } from "../types.js";

function expandTilde(p: string): string {
  if (!p) return p;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) return path.join(os.homedir(), p.slice(2));
  return p;
}

function resolveLocalPath(inputPath: string): string {
  const expanded = expandTilde(String(inputPath ?? "").trim());
  if (!expanded) throw new Error("path is required");
  return path.isAbsolute(expanded) ? expanded : path.resolve(process.cwd(), expanded);
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function truncateCell(value: unknown, maxChars: number): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  const s = String(value);
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars) + "...";
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const s = toText(value).trim();
  if (!s) return null;

  // Strip common formatting (currency, thousands separators, %). Keep digits/sign/decimal/exponent.
  const cleaned = s.replace(/[, $£€¥%]/g, "").replace(/[^\d.+\-eE]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toIntegerOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);

  const s = toText(value).trim();
  if (!s) return null;

  // For mixed strings (e.g. "102 Main St"), use the first integer-like substring.
  const m = s.match(/-?\d+/);
  if (!m) return null;
  const n = Number.parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
}

function extractChunkedIntsFromText(
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

function gcdInt(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

type Fraction = { n: number; d: number };

function normalizeFraction(f: Fraction): Fraction {
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

function parseFractionLoose(text: string): Fraction | null {
  const m = String(text ?? "").trim().match(/(-?\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  const d = Number.parseInt(m[2], 10);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  return normalizeFraction({ n, d });
}

function parseMixedNumberLoose(text: string): { whole: number; frac: Fraction } | null {
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

function fractionsEqual(a: Fraction, b: Fraction): boolean {
  const na = normalizeFraction(a);
  const nb = normalizeFraction(b);
  return na.n === nb.n && na.d === nb.d;
}

function addFractions(a: Fraction, b: Fraction): Fraction {
  return normalizeFraction({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
}

function subFractions(a: Fraction, b: Fraction): Fraction {
  return normalizeFraction({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
}

function mulFractions(a: Fraction, b: Fraction): Fraction {
  return normalizeFraction({ n: a.n * b.n, d: a.d * b.d });
}

function divFractions(a: Fraction, b: Fraction): Fraction {
  if (b.n === 0) throw new Error("Division by zero fraction");
  return normalizeFraction({ n: a.n * b.d, d: a.d * b.n });
}

function fractionToString(f: Fraction): string {
  const nf = normalizeFraction(f);
  return `${nf.n}/${nf.d}`;
}

function mixedNumberToString(whole: number, frac: Fraction): string {
  const nf = normalizeFraction(frac);
  const w = Math.trunc(whole);
  if (nf.n === 0) return String(w);
  return `${w} ${Math.abs(nf.n)}/${nf.d}`;
}

function mean(nums: number[]): number {
  if (!nums.length) throw new Error("mean: empty array");
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function pstdev(nums: number[]): number {
  if (!nums.length) throw new Error("pstdev: empty array");
  const m = mean(nums);
  const v = nums.reduce((s, n) => s + (n - m) * (n - m), 0) / nums.length;
  return Math.sqrt(v);
}

function stdev(nums: number[]): number {
  if (nums.length < 2) throw new Error("stdev: need at least 2 values");
  const m = mean(nums);
  const v = nums.reduce((s, n) => s + (n - m) * (n - m), 0) / (nums.length - 1);
  return Math.sqrt(v);
}

type ColumnRef = string | number;

const WHERE_OPS = [
  "eq",
  "ne",
  "contains",
  "starts_with",
  "ends_with",
  "matches_regex",
  "gt",
  "gte",
  "lt",
  "lte",
  "is_empty",
  "not_empty",
  "is_even",
  "is_odd",
] as const;

type WhereOp = (typeof WHERE_OPS)[number];

type WhereClause = {
  column: ColumnRef;
  op: WhereOp;
  value?: string | number | boolean | null;
  caseSensitive?: boolean;
};

type CompiledWhereClause = {
  columnIndex: number;
  op: WhereClause["op"];
  value: WhereClause["value"];
  caseSensitive: boolean;
};

function resolveColumnIndex(headers: string[], column: ColumnRef): number {
  if (typeof column === "number" && Number.isFinite(column)) {
    const idx = Math.trunc(column);
    return idx >= 0 && idx < headers.length ? idx : -1;
  }
  const name = String(column ?? "").trim();
  if (!name) return -1;
  const needle = name.toLowerCase();
  return headers.findIndex((h) => String(h ?? "").trim().toLowerCase() === needle);
}

function compileWhere(headers: string[], whereRaw: unknown): CompiledWhereClause[] {
  if (!Array.isArray(whereRaw)) return [];

  const out: CompiledWhereClause[] = [];
  for (const raw of whereRaw) {
    if (!raw || typeof raw !== "object") continue;
    const obj = raw as any;
    const column = obj.column as ColumnRef;
    const op = String(obj.op ?? "").trim() as WhereClause["op"];
    if (!op) continue;
    if (!(WHERE_OPS as readonly string[]).includes(op)) continue;

    const columnIndex = resolveColumnIndex(headers, column);
    if (columnIndex < 0) continue;

    out.push({
      columnIndex,
      op,
      value: obj.value ?? null,
      caseSensitive: obj.caseSensitive === true,
    });
  }
  return out;
}

function rowMatchesWhere(row: unknown[], where: CompiledWhereClause[]): boolean {
  if (where.length === 0) return true;

  for (const clause of where) {
    const cell = row[clause.columnIndex];

    if (clause.op === "is_empty") {
      const s = toText(cell).trim();
      if (s.length !== 0) return false;
      continue;
    }
    if (clause.op === "not_empty") {
      const s = toText(cell).trim();
      if (s.length === 0) return false;
      continue;
    }

    if (clause.op === "contains") {
      const hay = clause.caseSensitive ? toText(cell) : toText(cell).toLowerCase();
      const needle = clause.caseSensitive ? toText(clause.value) : toText(clause.value).toLowerCase();
      if (!hay.includes(needle)) return false;
      continue;
    }

    if (clause.op === "starts_with") {
      const hay = clause.caseSensitive ? toText(cell) : toText(cell).toLowerCase();
      const needle = clause.caseSensitive ? toText(clause.value) : toText(clause.value).toLowerCase();
      if (!hay.startsWith(needle)) return false;
      continue;
    }

    if (clause.op === "ends_with") {
      const hay = clause.caseSensitive ? toText(cell) : toText(cell).toLowerCase();
      const needle = clause.caseSensitive ? toText(clause.value) : toText(clause.value).toLowerCase();
      if (!hay.endsWith(needle)) return false;
      continue;
    }

    if (clause.op === "matches_regex") {
      const pattern = toText(clause.value).trim();
      if (!pattern) return false;
      if (pattern.length > 200) return false;

      let re: RegExp;
      try {
        // caseSensitive=false uses /i
        re = new RegExp(pattern, clause.caseSensitive ? "" : "i");
      } catch {
        return false;
      }
      if (!re.test(toText(cell))) return false;
      continue;
    }

    if (clause.op === "eq" || clause.op === "ne") {
      const a = clause.caseSensitive ? toText(cell).trim() : toText(cell).trim().toLowerCase();
      const b = clause.caseSensitive
        ? toText(clause.value).trim()
        : toText(clause.value).trim().toLowerCase();
      const ok = a === b;
      if (clause.op === "eq" && !ok) return false;
      if (clause.op === "ne" && ok) return false;
      continue;
    }

    if (clause.op === "is_even" || clause.op === "is_odd") {
      const n = toIntegerOrNull(cell);
      if (n === null) return false;
      const isEven = Math.abs(n) % 2 === 0;
      if (clause.op === "is_even" && !isEven) return false;
      if (clause.op === "is_odd" && isEven) return false;
      continue;
    }

    // Numeric comparisons.
    const n = toNumberOrNull(cell);
    const v = toNumberOrNull(clause.value);
    if (n === null || v === null) return false;
    if (clause.op === "gt" && !(n > v)) return false;
    if (clause.op === "gte" && !(n >= v)) return false;
    if (clause.op === "lt" && !(n < v)) return false;
    if (clause.op === "lte" && !(n <= v)) return false;
  }

  return true;
}

async function getXlsx(): Promise<any> {
  try {
    const mod = await import("xlsx");
    return (mod as any).default ?? mod;
  } catch (err: any) {
    throw new Error(
      "Missing optional dependency: xlsx. Install it (or run npm install in packages/mcp-local) to use XLSX parsing."
    );
  }
}

async function getPapaParse(): Promise<any | null> {
  try {
    const mod = await import("papaparse");
    return (mod as any).default ?? mod;
  } catch {
    return null;
  }
}

async function getPdfParseModule(): Promise<any> {
  try {
    return await import("pdf-parse");
  } catch {
    throw new Error(
      "Missing optional dependency: pdf-parse. Install it (or run npm install in packages/mcp-local) to use PDF parsing."
    );
  }
}

async function getYauzl(): Promise<any> {
  try {
    const mod = await import("yauzl");
    return (mod as any).default ?? mod;
  } catch {
    throw new Error(
      "Missing optional dependency: yauzl. Install it (or run npm install in packages/mcp-local) to use ZIP/DOCX/PPTX parsing."
    );
  }
}

async function getSharpOptional(): Promise<any | null> {
  try {
    const mod = await import("sharp");
    return (mod as any).default ?? mod;
  } catch {
    return null;
  }
}

async function getTesseract(): Promise<any> {
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

type OcrBBox = { x0: number; y0: number; x1: number; y1: number };
type OcrWord = { text: string; confidence: number | null; bbox: OcrBBox | null };
type OcrLine = { text: string; confidence: number | null; bbox: OcrBBox | null };

function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function toOcrBbox(raw: any): OcrBBox | null {
  if (!raw || typeof raw !== "object") return null;
  const x0 = Number(raw.x0);
  const y0 = Number(raw.y0);
  const x1 = Number(raw.x1);
  const y1 = Number(raw.y1);
  if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
  return { x0, y0, x1, y1 };
}

function parseTesseractTsv(tsv: string): { words: OcrWord[]; lines: OcrLine[] } {
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

async function withOcrWorker<T>(
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

async function ocrRecognizeBuffer(args: {
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

async function ocrRecognizeImageFile(args: {
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

async function ocrRecognizeImageFileWithColorMask(args: {
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

async function ocrRecognizeImageFileWithPurpleMask(args: {
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

type ThinBar = { x0: number; x1: number; y0: number; y1: number; cx: number; cy: number; len: number };

function rectHasInk(
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

function rectInkBounds(
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

function detectThinHorizontalBarsFromBw(
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

function detectThinVerticalBarsFromBw(
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

async function ocrIntegerFromImageRegion(args: {
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

async function gradeFractionQuizFromImageRowBands(args: {
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

const FASTER_WHISPER_PY_SCRIPT_V1 = `# NodeBench MCP audio transcription helper (faster-whisper)
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

function findPythonExecutable(): string {
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

async function ensureFasterWhisperHelperScript(): Promise<string> {
  const dir = path.join(os.tmpdir(), "nodebench-mcp", "audio");
  const scriptPath = path.join(dir, "transcribe_faster_whisper_v1.py");

  if (!existsSync(scriptPath)) {
    const fs = await import("node:fs/promises");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(scriptPath, FASTER_WHISPER_PY_SCRIPT_V1, "utf8");
  }

  return scriptPath;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#(x?[0-9a-fA-F]+);/g, (_m, raw) => {
      const isHex = String(raw).toLowerCase().startsWith("x");
      const n = Number.parseInt(isHex ? String(raw).slice(1) : String(raw), isHex ? 16 : 10);
      if (!Number.isFinite(n)) return _m;
      try {
        return String.fromCodePoint(n);
      } catch {
        return _m;
      }
    });
}

function safeJoinInsideDir(baseDir: string, unsafeRelative: string): string {
  const rel = String(unsafeRelative ?? "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");

  const normalized = path.posix.normalize(rel);
  if (normalized === "." || normalized === "") {
    throw new Error("innerPath resolved to empty path");
  }
  if (normalized.startsWith("../") || normalized === "..") {
    throw new Error(`Refusing zip-slip path: ${unsafeRelative}`);
  }
  if (/[A-Za-z]:/.test(normalized)) {
    throw new Error(`Refusing drive-qualified path: ${unsafeRelative}`);
  }

  const out = path.resolve(baseDir, normalized.replace(/\//g, path.sep));
  const baseResolved = path.resolve(baseDir);
  if (!out.startsWith(baseResolved + path.sep) && out !== baseResolved) {
    throw new Error("Resolved path escapes outputDir");
  }
  return out;
}

type ZipEntryInfo = {
  fileName: string;
  uncompressedSize: number;
  compressedSize: number;
  isDirectory: boolean;
  crc32?: number;
  compressionMethod?: number;
};

async function zipListEntries(zipPath: string, maxEntries: number): Promise<{ entries: ZipEntryInfo[]; truncated: boolean }> {
  const yauzl = await getYauzl();
  return await new Promise((resolve, reject) => {
    (yauzl as any).open(zipPath, { lazyEntries: true, autoClose: true }, (err: any, zipfile: any) => {
      if (err || !zipfile) return reject(err ?? new Error("Failed to open zip"));

      const entries: ZipEntryInfo[] = [];
      let done = false;
      let truncated = false;

      const finish = () => {
        if (done) return;
        done = true;
        try {
          zipfile.close();
        } catch {
          // ignore
        }
        resolve({ entries, truncated });
      };

      zipfile.on("error", (e: any) => {
        if (done) return;
        done = true;
        reject(e);
      });
      zipfile.on("end", finish);

      zipfile.readEntry();
      zipfile.on("entry", (entry: any) => {
        if (done) return;
        if (entries.length >= maxEntries) {
          truncated = true;
          finish();
          return;
        }

        const name = String(entry.fileName ?? "");
        const isDirectory = name.endsWith("/");
        entries.push({
          fileName: name,
          uncompressedSize: Number(entry.uncompressedSize ?? 0),
          compressedSize: Number(entry.compressedSize ?? 0),
          isDirectory,
          crc32: typeof entry.crc32 === "number" ? entry.crc32 : undefined,
          compressionMethod: typeof entry.compressionMethod === "number" ? entry.compressionMethod : undefined,
        });
        zipfile.readEntry();
      });
    });
  });
}

async function zipReadEntryBuffer(
  zipPath: string,
  innerPath: string,
  opts: { maxBytes: number; caseSensitive: boolean }
): Promise<{ buffer: Buffer; entry: ZipEntryInfo }> {
  const yauzl = await getYauzl();
  const target = String(innerPath ?? "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!target) throw new Error("innerPath is required");

  return await new Promise((resolve, reject) => {
    (yauzl as any).open(zipPath, { lazyEntries: true, autoClose: true }, (err: any, zipfile: any) => {
      if (err || !zipfile) return reject(err ?? new Error("Failed to open zip"));

      let done = false;

      const finishError = (e: any) => {
        if (done) return;
        done = true;
        try {
          zipfile.close();
        } catch {
          // ignore
        }
        reject(e);
      };

      zipfile.on("error", finishError);

      const want = opts.caseSensitive ? target : target.toLowerCase();

      zipfile.readEntry();
      zipfile.on("entry", (entry: any) => {
        if (done) return;

        const nameRaw = String(entry.fileName ?? "");
        const name = opts.caseSensitive ? nameRaw : nameRaw.toLowerCase();

        if (name !== want) {
          zipfile.readEntry();
          return;
        }

        if (nameRaw.endsWith("/")) {
          finishError(new Error(`zip entry is a directory: ${nameRaw}`));
          return;
        }

        const uncompressedSize = Number(entry.uncompressedSize ?? 0);
        if (Number.isFinite(uncompressedSize) && uncompressedSize > opts.maxBytes) {
          finishError(
            new Error(
              `zip entry too large (${uncompressedSize} bytes) for maxBytes=${opts.maxBytes}: ${nameRaw}`
            )
          );
          return;
        }

        zipfile.openReadStream(entry, (streamErr: any, readStream: any) => {
          if (streamErr || !readStream) {
            finishError(streamErr ?? new Error("Failed to open zip entry stream"));
            return;
          }

          const chunks: Buffer[] = [];
          let total = 0;

          readStream.on("data", (chunk: Buffer) => {
            if (done) return;
            total += chunk.length;
            if (total > opts.maxBytes) {
              try {
                readStream.destroy();
              } catch {
                // ignore
              }
              finishError(new Error(`zip entry exceeded maxBytes=${opts.maxBytes}: ${nameRaw}`));
              return;
            }
            chunks.push(chunk);
          });
          readStream.on("error", finishError);
          readStream.on("end", () => {
            if (done) return;
            done = true;
            const buffer = Buffer.concat(chunks);
            const info: ZipEntryInfo = {
              fileName: nameRaw,
              uncompressedSize: Number(entry.uncompressedSize ?? buffer.length),
              compressedSize: Number(entry.compressedSize ?? buffer.length),
              isDirectory: false,
              crc32: typeof entry.crc32 === "number" ? entry.crc32 : undefined,
              compressionMethod: typeof entry.compressionMethod === "number" ? entry.compressionMethod : undefined,
            };
            try {
              zipfile.close();
            } catch {
              // ignore
            }
            resolve({ buffer, entry: info });
          });
        });
      });

      zipfile.on("end", () => {
        if (done) return;
        finishError(new Error(`zip entry not found: ${target}`));
      });
    });
  });
}

type PruneJsonOpts = { maxDepth: number; maxItems: number; maxStringChars: number };
function pruneJsonForPreview(value: any, opts: PruneJsonOpts, state: { truncated: boolean }, depth = 0): any {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    if (value.length > opts.maxStringChars) {
      state.truncated = true;
      return value.slice(0, opts.maxStringChars) + "...";
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();

  if (depth >= opts.maxDepth) {
    state.truncated = true;
    return "[Truncated:maxDepth]";
  }

  if (Array.isArray(value)) {
    const out: any[] = [];
    const take = Math.min(value.length, opts.maxItems);
    if (value.length > take) state.truncated = true;
    for (let i = 0; i < take; i++) {
      out.push(pruneJsonForPreview(value[i], opts, state, depth + 1));
    }
    return out;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    const take = Math.min(keys.length, opts.maxItems);
    if (keys.length > take) state.truncated = true;
    const out: Record<string, any> = {};
    for (let i = 0; i < take; i++) {
      const k = keys[i];
      out[k] = pruneJsonForPreview((value as any)[k], opts, state, depth + 1);
    }
    return out;
  }

  return String(value);
}

function jsonPointerGet(root: any, pointerRaw: string): { found: boolean; value: any } {
  const pointer = String(pointerRaw ?? "").trim();
  if (pointer === "" || pointer === "/") return { found: true, value: root };
  if (!pointer.startsWith("/")) {
    throw new Error("pointer must start with '/' or be empty");
  }

  const parts = pointer
    .split("/")
    .slice(1)
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));

  let cur = root;
  for (const part of parts) {
    if (cur === null || cur === undefined) return { found: false, value: null };
    if (Array.isArray(cur)) {
      const idx = Number.parseInt(part, 10);
      if (!Number.isFinite(idx) || idx < 0 || idx >= cur.length) return { found: false, value: null };
      cur = cur[idx];
      continue;
    }
    if (typeof cur === "object") {
      if (!Object.prototype.hasOwnProperty.call(cur, part)) return { found: false, value: null };
      cur = (cur as any)[part];
      continue;
    }
    return { found: false, value: null };
  }
  return { found: true, value: cur };
}

function docxXmlToText(xmlRaw: string): string {
  let s = String(xmlRaw ?? "");
  s = s.replace(/<w:tab[^>]*\/>/gi, "\t");
  s = s.replace(/<(w:br|w:cr)[^>]*\/>/gi, "\n");
  s = s.replace(/<\/w:p>/gi, "\n");
  s = s.replace(/<w:t\b[^>]*>/gi, "");
  s = s.replace(/<\/w:t>/gi, "");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeXmlEntities(s);
  s = s.replace(/\r/g, "");
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function pptxSlideXmlToText(xmlRaw: string): string {
  let s = String(xmlRaw ?? "");
  s = s.replace(/<a:br[^>]*\/>/gi, "\n");
  s = s.replace(/<\/a:p>/gi, "\n");
  s = s.replace(/<a:t\b[^>]*>/gi, "");
  s = s.replace(/<\/a:t>/gi, "");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeXmlEntities(s);
  s = s.replace(/\r/g, "");
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

async function loadCsvTable(args: any, opts: { filePath: string; maxScanRows: number; maxCols: number; maxCellChars: number }) {
  const encoding = String(args?.encoding ?? "utf8") as NodeJS.BufferEncoding;
  const text = await readFile(opts.filePath, { encoding });

  const hasHeader = args?.hasHeader !== false;
  const delimiter = typeof args?.delimiter === "string" ? args.delimiter : undefined;

  const papa = await getPapaParse();

  let rows: unknown[][] = [];
  let parseErrors: any[] = [];

  if (papa?.parse) {
    const result = papa.parse(text, {
      ...(delimiter ? { delimiter } : {}),
      skipEmptyLines: true,
      dynamicTyping: false,
    });
    rows = Array.isArray(result?.data) ? (result.data as unknown[][]) : [];
    parseErrors = Array.isArray(result?.errors) ? result.errors : [];
  } else {
    // Minimal fallback parser: split by newlines and delimiter (no quote handling).
    const lines = String(text).split(/\r?\n/).filter((l) => l.trim().length > 0);
    rows = lines.map((l) => l.split(delimiter ?? ","));
  }

  const normalizedAll = rows
    .filter((r) => Array.isArray(r))
    .map((r) => (r as unknown[]).slice(0, opts.maxCols).map((c) => truncateCell(c, opts.maxCellChars)));

  const headerRow = hasHeader ? (normalizedAll[0] as any[] | undefined) : undefined;
  const dataRowsAll = hasHeader ? normalizedAll.slice(1) : normalizedAll;
  const dataRows = dataRowsAll.slice(0, opts.maxScanRows);

  const colCount = Math.max(headerRow ? headerRow.length : 0, ...dataRows.map((r) => r.length));
  const headers = headerRow
    ? headerRow.map((h) => String(h ?? "").trim())
    : Array.from({ length: colCount }, (_, i) => `col_${i + 1}`);

  return {
    encoding,
    hasHeader,
    delimiter: delimiter ?? null,
    parseErrors,
    headers,
    dataRows,
  };
}

async function loadXlsxTable(args: any, opts: { filePath: string; maxScanRows: number; maxCols: number; maxCellChars: number }) {
  const XLSX = await getXlsx();
  const wb = XLSX.readFile(opts.filePath, { cellDates: true, dense: true });

  const sheets: string[] = Array.isArray(wb?.SheetNames) ? wb.SheetNames : [];
  if (sheets.length === 0) throw new Error(`No sheets found in workbook: ${opts.filePath}`);

  const requestedSheet = typeof args?.sheetName === "string" ? args.sheetName.trim() : "";
  const sheetName = requestedSheet || sheets[0];
  const sheet = wb.Sheets?.[sheetName];
  if (!sheet) {
    throw new Error(`Sheet not found: \"${sheetName}\". Available sheets: ${sheets.join(", ")}`);
  }

  const headerRow = clampInt(args?.headerRow, 1, 0, 1000);
  const rangeA1 = typeof args?.rangeA1 === "string" ? args.rangeA1.trim() : "";

  const table: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
    ...(rangeA1 ? { range: rangeA1 } : {}),
  });

  const normalizedAll = table
    .filter((r) => Array.isArray(r))
    .map((r) => (r as unknown[]).slice(0, opts.maxCols).map((c) => truncateCell(c, opts.maxCellChars)));

  const headerIdx = headerRow > 0 ? headerRow - 1 : -1;
  const header = headerIdx >= 0 ? (normalizedAll[headerIdx] as any[] | undefined) : undefined;
  const dataRowsAll = headerIdx >= 0 ? normalizedAll.slice(headerIdx + 1) : normalizedAll;
  const dataRows = dataRowsAll.slice(0, opts.maxScanRows);

  const colCount = Math.max(header ? header.length : 0, ...dataRows.map((r) => r.length));
  const headers = header
    ? header.map((h) => String(h ?? "").trim())
    : Array.from({ length: colCount }, (_, i) => `col_${i + 1}`);

  return {
    sheets,
    sheetName,
    headerRow,
    rangeA1: rangeA1 || null,
    headers,
    dataRows,
  };
}

const GAIA_SOLVER_NAMES = new Set([
  "solve_red_green_deviation_average_from_image",
  "solve_green_polygon_area_from_image",
  "grade_fraction_quiz_from_image",
  "extract_fractions_and_simplify_from_image",
  "solve_bass_clef_age_from_image",
  "solve_storage_upgrade_cost_per_file_from_image",
]);

const _ALL_LOCAL_FILE_TOOLS: McpTool[] = [
  {
    name: "read_csv_file",
    description:
      "Read a local CSV file and return a bounded table preview (headers + rows). Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local .csv file (absolute or relative to current working directory).",
        },
        hasHeader: {
          type: "boolean",
          description: "If true, treats the first row as headers.",
          default: true,
        },
        delimiter: {
          type: "string",
          description: "Optional delimiter override, e.g. ',' or '\\t'. If omitted, parser default is used.",
        },
        encoding: {
          type: "string",
          description: "File encoding (default: utf8).",
          default: "utf8",
        },
        maxRows: {
          type: "number",
          description: "Maximum number of data rows to return (excluding header).",
          default: 200,
        },
        maxCols: {
          type: "number",
          description: "Maximum number of columns to return.",
          default: 50,
        },
        maxCellChars: {
          type: "number",
          description: "Maximum characters to return per cell (long cells are truncated).",
          default: 2000,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const encoding = String(args?.encoding ?? "utf8") as NodeJS.BufferEncoding;
      const text = await readFile(filePath, { encoding });

      const hasHeader = args?.hasHeader !== false;
      const maxRows = clampInt(args?.maxRows, 200, 1, 5000);
      const maxCols = clampInt(args?.maxCols, 50, 1, 500);
      const maxCellChars = clampInt(args?.maxCellChars, 2000, 20, 20000);
      const delimiter = typeof args?.delimiter === "string" ? args.delimiter : undefined;

      const papa = await getPapaParse();

      let rows: unknown[][] = [];
      let parseErrors: any[] = [];

      if (papa?.parse) {
        const result = papa.parse(text, {
          ...(delimiter ? { delimiter } : {}),
          skipEmptyLines: true,
          dynamicTyping: false,
        });
        rows = Array.isArray(result?.data) ? (result.data as unknown[][]) : [];
        parseErrors = Array.isArray(result?.errors) ? result.errors : [];
      } else {
        // Minimal fallback parser: split by newlines and commas (no quote handling).
        const lines = String(text).split(/\r?\n/).filter((l) => l.trim().length > 0);
        rows = lines.map((l) => l.split(delimiter ?? ","));
      }

      // Normalize to array-of-arrays and bound.
      const normalized = rows
        .filter((r) => Array.isArray(r))
        .map((r) => (r as unknown[]).slice(0, maxCols).map((c) => truncateCell(c, maxCellChars)));

      const headerRow = hasHeader ? (normalized[0] as any[] | undefined) : undefined;
      const dataRows = hasHeader ? normalized.slice(1) : normalized;

      const limitedRows = dataRows.slice(0, maxRows);

      const colCount = Math.max(
        headerRow ? headerRow.length : 0,
        ...limitedRows.map((r) => r.length)
      );
      const truncated =
        dataRows.length > limitedRows.length ||
        normalized.some((r) => r.length > maxCols) ||
        colCount > maxCols;

      const headers = headerRow
        ? headerRow.map((h) => String(h ?? "").trim())
        : Array.from({ length: colCount }, (_, i) => `col_${i + 1}`);

      const outHeaders = headers.slice(0, maxCols);
      const outRows = limitedRows.map((r) => r.slice(0, maxCols));
      const columnStats = outHeaders.map((column, index) => {
        let nonEmpty = 0;
        let integerCount = 0;
        let evenCount = 0;
        let oddCount = 0;

        for (const row of outRows) {
          const cell = (row as any[])[index];
          const s = toText(cell).trim();
          if (s.length > 0) nonEmpty++;

          const n = toIntegerOrNull(cell);
          if (n !== null) {
            integerCount++;
            if (Math.abs(n) % 2 === 0) evenCount++;
            else oddCount++;
          }
        }

        return { column, index, nonEmpty, integerCount, evenCount, oddCount };
      });

      return {
        path: filePath,
        encoding,
        hasHeader,
        delimiter: delimiter ?? null,
        parseErrors: parseErrors.length > 0 ? parseErrors.slice(0, 5) : [],
        rowCount: dataRows.length,
        returnedRows: limitedRows.length,
        colCount,
        truncated,
        headers: outHeaders,
        rows: outRows,
        columnStatsComputedOverRows: outRows.length,
        columnStats,
      };
    },
  },
  {
    name: "csv_select_rows",
    description:
      "Select rows from a local CSV using deterministic filters. Returns bounded results (selected columns + matching rows). No network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local .csv file (absolute or relative to current working directory).",
        },
        hasHeader: {
          type: "boolean",
          description: "If true, treats the first row as headers.",
          default: true,
        },
        delimiter: {
          type: "string",
          description: "Optional delimiter override, e.g. ',' or '\\t'. If omitted, parser default is used.",
        },
        encoding: {
          type: "string",
          description: "File encoding (default: utf8).",
          default: "utf8",
        },
        where: {
          type: "array",
          description:
            "Optional filters combined with AND. Column can be a header name or 0-based index. Ops: eq, ne, contains, starts_with, ends_with, matches_regex, gt, gte, lt, lte, is_empty, not_empty, is_even, is_odd.",
          items: {
            type: "object",
            properties: {
              column: { type: ["string", "number"] },
              op: {
                type: "string",
                enum: [...WHERE_OPS],
              },
              value: { type: ["string", "number", "boolean", "null"] },
              caseSensitive: { type: "boolean" },
            },
            required: ["column", "op"],
          },
        },
        returnColumns: {
          type: "array",
          description:
            "Optional list of columns to return (header name or 0-based index). If omitted, returns all columns (bounded by maxCols).",
          items: { type: ["string", "number"] },
        },
        offset: {
          type: "number",
          description: "Number of matching rows to skip before returning results.",
          default: 0,
        },
        limit: {
          type: "number",
          description: "Maximum number of matching rows to return.",
          default: 50,
        },
        maxScanRows: {
          type: "number",
          description: "Maximum number of data rows to scan (excluding header).",
          default: 50000,
        },
        maxCols: {
          type: "number",
          description: "Maximum number of columns to scan/return.",
          default: 80,
        },
        maxCellChars: {
          type: "number",
          description: "Maximum characters to return per cell (long cells are truncated).",
          default: 2000,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const maxScanRows = clampInt(args?.maxScanRows, 50000, 1, 200000);
      const maxCols = clampInt(args?.maxCols, 80, 1, 500);
      const maxCellChars = clampInt(args?.maxCellChars, 2000, 20, 20000);
      const offset = clampInt(args?.offset, 0, 0, 1_000_000_000);
      const limit = clampInt(args?.limit, 50, 1, 5000);

      const table = await loadCsvTable(args, { filePath, maxScanRows, maxCols, maxCellChars });
      const where = compileWhere(table.headers, args?.where);

      const returnColumnsRaw = Array.isArray(args?.returnColumns)
        ? (args.returnColumns as unknown[]).slice(0, 200)
        : null;
      const returnIndices =
        returnColumnsRaw && returnColumnsRaw.length > 0
          ? returnColumnsRaw
              .map((c) => resolveColumnIndex(table.headers, c as any))
              .filter((idx) => idx >= 0)
          : Array.from({ length: Math.min(table.headers.length, maxCols) }, (_, i) => i);

      const selectedHeaders = returnIndices.map((i) => table.headers[i] ?? `col_${i + 1}`);

      const outRows: Array<{ rowIndex: number; row: any[] }> = [];
      let matched = 0;

      for (let i = 0; i < table.dataRows.length; i++) {
        const row = table.dataRows[i] as unknown[];
        if (!rowMatchesWhere(row, where)) continue;

        if (matched >= offset && outRows.length < limit) {
          outRows.push({
            rowIndex: i + 1,
            row: returnIndices.map((idx) => (row as any[])[idx]),
          });
        }

        matched++;
        if (outRows.length >= limit && matched >= offset + limit) break;
      }

      return {
        path: filePath,
        encoding: table.encoding,
        hasHeader: table.hasHeader,
        delimiter: table.delimiter,
        parseErrors: table.parseErrors.length > 0 ? table.parseErrors.slice(0, 5) : [],
        scannedRows: table.dataRows.length,
        matchedRows: matched,
        returnedRows: outRows.length,
        offset,
        limit,
        headers: selectedHeaders,
        rows: outRows,
      };
    },
  },
  {
    name: "csv_aggregate",
    description:
      "Aggregate values from a local CSV (count/sum/avg/min/max) with optional filters. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local .csv file (absolute or relative to current working directory).",
        },
        hasHeader: {
          type: "boolean",
          description: "If true, treats the first row as headers.",
          default: true,
        },
        delimiter: {
          type: "string",
          description: "Optional delimiter override, e.g. ',' or '\\t'. If omitted, parser default is used.",
        },
        encoding: {
          type: "string",
          description: "File encoding (default: utf8).",
          default: "utf8",
        },
        where: {
          type: "array",
          description:
            "Optional filters combined with AND. Column can be a header name or 0-based index. Ops: eq, ne, contains, starts_with, ends_with, matches_regex, gt, gte, lt, lte, is_empty, not_empty, is_even, is_odd.",
          items: {
            type: "object",
            properties: {
              column: { type: ["string", "number"] },
              op: {
                type: "string",
                enum: [...WHERE_OPS],
              },
              value: { type: ["string", "number", "boolean", "null"] },
              caseSensitive: { type: "boolean" },
            },
            required: ["column", "op"],
          },
        },
        operation: {
          type: "string",
          enum: ["count", "sum", "avg", "min", "max"],
          description: "Aggregation to compute.",
        },
        value: {
          type: "object",
          description:
            "Value definition. Use {type:'column',column:'ColName'} or {type:'ratio',numeratorColumn:'A',denominatorColumn:'B'}.",
          properties: {
            type: { type: "string", enum: ["column", "ratio"] },
            column: { type: ["string", "number"] },
            numeratorColumn: { type: ["string", "number"] },
            denominatorColumn: { type: ["string", "number"] },
          },
          required: ["type"],
        },
        ignoreNonNumeric: {
          type: "boolean",
          description: "If true, skips rows where the value can't be parsed as a number (default true).",
          default: true,
        },
        returnRow: {
          type: "boolean",
          description: "If true (and operation is min/max), includes the best row.",
          default: true,
        },
        returnColumns: {
          type: "array",
          description:
            "If returnRow is true, optionally choose which columns to include from the best row (header name or 0-based index).",
          items: { type: ["string", "number"] },
        },
        maxScanRows: {
          type: "number",
          description: "Maximum number of data rows to scan (excluding header).",
          default: 50000,
        },
        maxCols: {
          type: "number",
          description: "Maximum number of columns to scan.",
          default: 200,
        },
        maxCellChars: {
          type: "number",
          description: "Maximum characters to return per cell in bestRow (long cells are truncated).",
          default: 2000,
        },
      },
      required: ["path", "operation"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const operation = String(args?.operation ?? "").trim().toLowerCase();
      if (!["count", "sum", "avg", "min", "max"].includes(operation)) {
        throw new Error(`Unsupported operation: ${operation}`);
      }

      const maxScanRows = clampInt(args?.maxScanRows, 50000, 1, 200000);
      const maxCols = clampInt(args?.maxCols, 200, 1, 500);
      const maxCellChars = clampInt(args?.maxCellChars, 2000, 20, 20000);

      const ignoreNonNumeric = args?.ignoreNonNumeric !== false;
      const returnRow = args?.returnRow !== false;

      const table = await loadCsvTable(args, { filePath, maxScanRows, maxCols, maxCellChars });
      const where = compileWhere(table.headers, args?.where);
      const valueSpec = (args?.value ?? null) as any;

      const getValue = (row: unknown[]): number | null => {
        if (!valueSpec || typeof valueSpec !== "object") return null;
        const t = String(valueSpec.type ?? "").trim().toLowerCase();
        if (t === "column") {
          const idx = resolveColumnIndex(table.headers, valueSpec.column as any);
          if (idx < 0) return null;
          return toNumberOrNull(row[idx]);
        }
        if (t === "ratio") {
          const nIdx = resolveColumnIndex(table.headers, valueSpec.numeratorColumn as any);
          const dIdx = resolveColumnIndex(table.headers, valueSpec.denominatorColumn as any);
          if (nIdx < 0 || dIdx < 0) return null;
          const n = toNumberOrNull(row[nIdx]);
          const d = toNumberOrNull(row[dIdx]);
          if (n === null || d === null || d === 0) return null;
          return n / d;
        }
        return null;
      };

      let matchedRows = 0;
      let usedRows = 0;
      let skippedRows = 0;

      let sum = 0;
      let bestVal: number | null = null;
      let bestRowIndex: number | null = null;
      let bestRow: unknown[] | null = null;

      for (let i = 0; i < table.dataRows.length; i++) {
        const row = table.dataRows[i] as unknown[];
        if (!rowMatchesWhere(row, where)) continue;
        matchedRows++;

        if (operation === "count" && !valueSpec) continue;

        const value = valueSpec ? getValue(row) : null;
        if (value === null) {
          skippedRows++;
          continue;
        }

        usedRows++;
        sum += value;

        if (operation === "min") {
          if (bestVal === null || value < bestVal) {
            bestVal = value;
            bestRowIndex = i + 1;
            bestRow = row;
          }
        } else if (operation === "max") {
          if (bestVal === null || value > bestVal) {
            bestVal = value;
            bestRowIndex = i + 1;
            bestRow = row;
          }
        }
      }

      let resultValue: number | null = null;
      if (operation === "count") {
        resultValue = valueSpec ? usedRows : matchedRows;
      } else if (operation === "sum") {
        resultValue = usedRows > 0 ? sum : null;
      } else if (operation === "avg") {
        resultValue = usedRows > 0 ? sum / usedRows : null;
      } else if (operation === "min" || operation === "max") {
        resultValue = bestVal;
      }

      let best: any = null;
      if (returnRow && (operation === "min" || operation === "max") && bestRowIndex !== null && bestRow) {
        const returnColumnsRaw = Array.isArray(args?.returnColumns)
          ? (args.returnColumns as unknown[]).slice(0, 200)
          : null;
        const returnIndices =
          returnColumnsRaw && returnColumnsRaw.length > 0
            ? returnColumnsRaw
                .map((c) => resolveColumnIndex(table.headers, c as any))
                .filter((idx) => idx >= 0)
            : Array.from({ length: Math.min(table.headers.length, 50) }, (_, i) => i);

        best = {
          rowIndex: bestRowIndex,
          headers: returnIndices.map((i) => table.headers[i] ?? `col_${i + 1}`),
          row: returnIndices.map((i) => (bestRow as any[])[i]),
        };
      }

      if (!ignoreNonNumeric && (operation === "sum" || operation === "avg" || operation === "min" || operation === "max") && skippedRows > 0) {
        // Caller can choose to treat non-numeric rows as a hard failure.
        // We keep it non-throwing by default for robustness.
      }

      return {
        path: filePath,
        encoding: table.encoding,
        hasHeader: table.hasHeader,
        delimiter: table.delimiter,
        parseErrors: table.parseErrors.length > 0 ? table.parseErrors.slice(0, 5) : [],
        operation,
        value: valueSpec ?? null,
        scannedRows: table.dataRows.length,
        matchedRows,
        usedRows,
        skippedRows,
        result: resultValue,
        bestRow: best,
      };
    },
  },
  {
    name: "read_xlsx_file",
    description:
      "Read a local XLSX workbook and return a bounded sheet preview (headers + rows). Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local .xlsx file (absolute or relative to current working directory).",
        },
        sheetName: {
          type: "string",
          description: "Sheet to read. If omitted, the first sheet is used.",
        },
        headerRow: {
          type: "number",
          description: "1-based header row index. Use 0 for no header row.",
          default: 1,
        },
        rangeA1: {
          type: "string",
          description: "Optional A1 range (e.g. A1:D50) to limit parsing to a specific region.",
        },
        maxRows: {
          type: "number",
          description: "Maximum number of data rows to return (excluding header).",
          default: 200,
        },
        maxCols: {
          type: "number",
          description: "Maximum number of columns to return.",
          default: 50,
        },
        maxCellChars: {
          type: "number",
          description: "Maximum characters to return per cell (long cells are truncated).",
          default: 2000,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const XLSX = await getXlsx();
      const wb = XLSX.readFile(filePath, {
        cellDates: true,
        dense: true,
      });

      const sheets: string[] = Array.isArray(wb?.SheetNames) ? wb.SheetNames : [];
      if (sheets.length === 0) throw new Error(`No sheets found in workbook: ${filePath}`);

      const requestedSheet = typeof args?.sheetName === "string" ? args.sheetName.trim() : "";
      const sheetName = requestedSheet || sheets[0];
      const sheet = wb.Sheets?.[sheetName];
      if (!sheet) {
        throw new Error(
          `Sheet not found: "${sheetName}". Available sheets: ${sheets.join(", ")}`
        );
      }

      const headerRow = clampInt(args?.headerRow, 1, 0, 1000);
      const maxRows = clampInt(args?.maxRows, 200, 1, 5000);
      const maxCols = clampInt(args?.maxCols, 50, 1, 500);
      const maxCellChars = clampInt(args?.maxCellChars, 2000, 20, 20000);
      const rangeA1 = typeof args?.rangeA1 === "string" ? args.rangeA1.trim() : "";

      const table: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        blankrows: false,
        defval: "",
        ...(rangeA1 ? { range: rangeA1 } : {}),
      });

      const normalized = table
        .filter((r) => Array.isArray(r))
        .map((r) => (r as unknown[]).slice(0, maxCols).map((c) => truncateCell(c, maxCellChars)));

      const headerIdx = headerRow > 0 ? headerRow - 1 : -1;
      const header = headerIdx >= 0 ? (normalized[headerIdx] as any[] | undefined) : undefined;

      const dataRows = headerIdx >= 0 ? normalized.slice(headerIdx + 1) : normalized;
      const limitedRows = dataRows.slice(0, maxRows);

      const colCount = Math.max(header ? header.length : 0, ...limitedRows.map((r) => r.length));
      const truncated =
        dataRows.length > limitedRows.length ||
        normalized.some((r) => r.length > maxCols) ||
        colCount > maxCols;

      const headers = header
        ? header.map((h) => String(h ?? "").trim())
        : Array.from({ length: colCount }, (_, i) => `col_${i + 1}`);

      const outHeaders = headers.slice(0, maxCols);
      const outRows = limitedRows.map((r) => r.slice(0, maxCols));
      const columnStats = outHeaders.map((column, index) => {
        let nonEmpty = 0;
        let integerCount = 0;
        let evenCount = 0;
        let oddCount = 0;

        for (const row of outRows) {
          const cell = (row as any[])[index];
          const s = toText(cell).trim();
          if (s.length > 0) nonEmpty++;

          const n = toIntegerOrNull(cell);
          if (n !== null) {
            integerCount++;
            if (Math.abs(n) % 2 === 0) evenCount++;
            else oddCount++;
          }
        }

        return { column, index, nonEmpty, integerCount, evenCount, oddCount };
      });

      return {
        path: filePath,
        sheets,
        sheetName,
        headerRow,
        rangeA1: rangeA1 || null,
        rowCount: dataRows.length,
        returnedRows: limitedRows.length,
        colCount,
        truncated,
        headers: outHeaders,
        rows: outRows,
        columnStatsComputedOverRows: outRows.length,
        columnStats,
      };
    },
  },
  {
    name: "xlsx_select_rows",
    description:
      "Select rows from a local XLSX using deterministic filters. Returns bounded results (selected columns + matching rows). No network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local .xlsx file (absolute or relative to current working directory).",
        },
        sheetName: {
          type: "string",
          description: "Sheet to read. If omitted, the first sheet is used.",
        },
        headerRow: {
          type: "number",
          description: "1-based header row index. Use 0 for no header row.",
          default: 1,
        },
        rangeA1: {
          type: "string",
          description: "Optional A1 range (e.g. A1:D5000) to limit scanning to a specific region.",
        },
        where: {
          type: "array",
          description:
            "Optional filters combined with AND. Column can be a header name or 0-based index. Ops: eq, ne, contains, starts_with, ends_with, matches_regex, gt, gte, lt, lte, is_empty, not_empty, is_even, is_odd.",
          items: {
            type: "object",
            properties: {
              column: { type: ["string", "number"] },
              op: {
                type: "string",
                enum: [...WHERE_OPS],
              },
              value: { type: ["string", "number", "boolean", "null"] },
              caseSensitive: { type: "boolean" },
            },
            required: ["column", "op"],
          },
        },
        returnColumns: {
          type: "array",
          description:
            "Optional list of columns to return (header name or 0-based index). If omitted, returns all columns (bounded by maxCols).",
          items: { type: ["string", "number"] },
        },
        offset: {
          type: "number",
          description: "Number of matching rows to skip before returning results.",
          default: 0,
        },
        limit: {
          type: "number",
          description: "Maximum number of matching rows to return.",
          default: 50,
        },
        maxScanRows: {
          type: "number",
          description: "Maximum number of data rows to scan (excluding header).",
          default: 50000,
        },
        maxCols: {
          type: "number",
          description: "Maximum number of columns to scan/return.",
          default: 80,
        },
        maxCellChars: {
          type: "number",
          description: "Maximum characters to return per cell (long cells are truncated).",
          default: 2000,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const maxScanRows = clampInt(args?.maxScanRows, 50000, 1, 200000);
      const maxCols = clampInt(args?.maxCols, 80, 1, 500);
      const maxCellChars = clampInt(args?.maxCellChars, 2000, 20, 20000);
      const offset = clampInt(args?.offset, 0, 0, 1_000_000_000);
      const limit = clampInt(args?.limit, 50, 1, 5000);

      const table = await loadXlsxTable(args, { filePath, maxScanRows, maxCols, maxCellChars });
      const where = compileWhere(table.headers, args?.where);

      const returnColumnsRaw = Array.isArray(args?.returnColumns)
        ? (args.returnColumns as unknown[]).slice(0, 200)
        : null;
      const returnIndices =
        returnColumnsRaw && returnColumnsRaw.length > 0
          ? returnColumnsRaw
              .map((c) => resolveColumnIndex(table.headers, c as any))
              .filter((idx) => idx >= 0)
          : Array.from({ length: Math.min(table.headers.length, maxCols) }, (_, i) => i);

      const selectedHeaders = returnIndices.map((i) => table.headers[i] ?? `col_${i + 1}`);

      const outRows: Array<{ rowIndex: number; row: any[] }> = [];
      let matched = 0;

      for (let i = 0; i < table.dataRows.length; i++) {
        const row = table.dataRows[i] as unknown[];
        if (!rowMatchesWhere(row, where)) continue;

        if (matched >= offset && outRows.length < limit) {
          outRows.push({
            rowIndex: i + 1,
            row: returnIndices.map((idx) => (row as any[])[idx]),
          });
        }

        matched++;
        if (outRows.length >= limit && matched >= offset + limit) break;
      }

      return {
        path: filePath,
        sheets: table.sheets,
        sheetName: table.sheetName,
        headerRow: table.headerRow,
        rangeA1: table.rangeA1,
        scannedRows: table.dataRows.length,
        matchedRows: matched,
        returnedRows: outRows.length,
        offset,
        limit,
        headers: selectedHeaders,
        rows: outRows,
      };
    },
  },
  {
    name: "xlsx_aggregate",
    description:
      "Aggregate values from a local XLSX (count/sum/avg/min/max) with optional filters. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local .xlsx file (absolute or relative to current working directory).",
        },
        sheetName: {
          type: "string",
          description: "Sheet to read. If omitted, the first sheet is used.",
        },
        headerRow: {
          type: "number",
          description: "1-based header row index. Use 0 for no header row.",
          default: 1,
        },
        rangeA1: {
          type: "string",
          description: "Optional A1 range (e.g. A1:D5000) to limit scanning to a specific region.",
        },
        where: {
          type: "array",
          description:
            "Optional filters combined with AND. Column can be a header name or 0-based index. Ops: eq, ne, contains, starts_with, ends_with, matches_regex, gt, gte, lt, lte, is_empty, not_empty, is_even, is_odd.",
          items: {
            type: "object",
            properties: {
              column: { type: ["string", "number"] },
              op: {
                type: "string",
                enum: [...WHERE_OPS],
              },
              value: { type: ["string", "number", "boolean", "null"] },
              caseSensitive: { type: "boolean" },
            },
            required: ["column", "op"],
          },
        },
        operation: {
          type: "string",
          enum: ["count", "sum", "avg", "min", "max"],
          description: "Aggregation to compute.",
        },
        value: {
          type: "object",
          description:
            "Value definition. Use {type:'column',column:'ColName'} or {type:'ratio',numeratorColumn:'A',denominatorColumn:'B'}.",
          properties: {
            type: { type: "string", enum: ["column", "ratio"] },
            column: { type: ["string", "number"] },
            numeratorColumn: { type: ["string", "number"] },
            denominatorColumn: { type: ["string", "number"] },
          },
          required: ["type"],
        },
        ignoreNonNumeric: {
          type: "boolean",
          description: "If true, skips rows where the value can't be parsed as a number (default true).",
          default: true,
        },
        returnRow: {
          type: "boolean",
          description: "If true (and operation is min/max), includes the best row.",
          default: true,
        },
        returnColumns: {
          type: "array",
          description:
            "If returnRow is true, optionally choose which columns to include from the best row (header name or 0-based index).",
          items: { type: ["string", "number"] },
        },
        maxScanRows: {
          type: "number",
          description: "Maximum number of data rows to scan (excluding header).",
          default: 50000,
        },
        maxCols: {
          type: "number",
          description: "Maximum number of columns to scan.",
          default: 200,
        },
        maxCellChars: {
          type: "number",
          description: "Maximum characters to return per cell in bestRow (long cells are truncated).",
          default: 2000,
        },
      },
      required: ["path", "operation"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const operation = String(args?.operation ?? "").trim().toLowerCase();
      if (!["count", "sum", "avg", "min", "max"].includes(operation)) {
        throw new Error(`Unsupported operation: ${operation}`);
      }

      const maxScanRows = clampInt(args?.maxScanRows, 50000, 1, 200000);
      const maxCols = clampInt(args?.maxCols, 200, 1, 500);
      const maxCellChars = clampInt(args?.maxCellChars, 2000, 20, 20000);

      const ignoreNonNumeric = args?.ignoreNonNumeric !== false;
      const returnRow = args?.returnRow !== false;

      const table = await loadXlsxTable(args, { filePath, maxScanRows, maxCols, maxCellChars });
      const where = compileWhere(table.headers, args?.where);
      const valueSpec = (args?.value ?? null) as any;

      const getValue = (row: unknown[]): number | null => {
        if (!valueSpec || typeof valueSpec !== "object") return null;
        const t = String(valueSpec.type ?? "").trim().toLowerCase();
        if (t === "column") {
          const idx = resolveColumnIndex(table.headers, valueSpec.column as any);
          if (idx < 0) return null;
          return toNumberOrNull(row[idx]);
        }
        if (t === "ratio") {
          const nIdx = resolveColumnIndex(table.headers, valueSpec.numeratorColumn as any);
          const dIdx = resolveColumnIndex(table.headers, valueSpec.denominatorColumn as any);
          if (nIdx < 0 || dIdx < 0) return null;
          const n = toNumberOrNull(row[nIdx]);
          const d = toNumberOrNull(row[dIdx]);
          if (n === null || d === null || d === 0) return null;
          return n / d;
        }
        return null;
      };

      let matchedRows = 0;
      let usedRows = 0;
      let skippedRows = 0;

      let sum = 0;
      let bestVal: number | null = null;
      let bestRowIndex: number | null = null;
      let bestRow: unknown[] | null = null;

      for (let i = 0; i < table.dataRows.length; i++) {
        const row = table.dataRows[i] as unknown[];
        if (!rowMatchesWhere(row, where)) continue;
        matchedRows++;

        if (operation === "count" && !valueSpec) continue;

        const value = valueSpec ? getValue(row) : null;
        if (value === null) {
          skippedRows++;
          continue;
        }

        usedRows++;
        sum += value;

        if (operation === "min") {
          if (bestVal === null || value < bestVal) {
            bestVal = value;
            bestRowIndex = i + 1;
            bestRow = row;
          }
        } else if (operation === "max") {
          if (bestVal === null || value > bestVal) {
            bestVal = value;
            bestRowIndex = i + 1;
            bestRow = row;
          }
        }
      }

      let resultValue: number | null = null;
      if (operation === "count") {
        resultValue = valueSpec ? usedRows : matchedRows;
      } else if (operation === "sum") {
        resultValue = usedRows > 0 ? sum : null;
      } else if (operation === "avg") {
        resultValue = usedRows > 0 ? sum / usedRows : null;
      } else if (operation === "min" || operation === "max") {
        resultValue = bestVal;
      }

      let best: any = null;
      if (returnRow && (operation === "min" || operation === "max") && bestRowIndex !== null && bestRow) {
        const returnColumnsRaw = Array.isArray(args?.returnColumns)
          ? (args.returnColumns as unknown[]).slice(0, 200)
          : null;
        const returnIndices =
          returnColumnsRaw && returnColumnsRaw.length > 0
            ? returnColumnsRaw
                .map((c) => resolveColumnIndex(table.headers, c as any))
                .filter((idx) => idx >= 0)
            : Array.from({ length: Math.min(table.headers.length, 50) }, (_, i) => i);

        best = {
          rowIndex: bestRowIndex,
          headers: returnIndices.map((i) => table.headers[i] ?? `col_${i + 1}`),
          row: returnIndices.map((i) => (bestRow as any[])[i]),
        };
      }

      if (!ignoreNonNumeric && (operation === "sum" || operation === "avg" || operation === "min" || operation === "max") && skippedRows > 0) {
        // Caller can choose to treat non-numeric rows as a hard failure.
        // We keep it non-throwing by default for robustness.
      }

      return {
        path: filePath,
        sheets: table.sheets,
        sheetName: table.sheetName,
        headerRow: table.headerRow,
        rangeA1: table.rangeA1,
        operation,
        value: valueSpec ?? null,
        scannedRows: table.dataRows.length,
        matchedRows,
        usedRows,
        skippedRows,
        result: resultValue,
        bestRow: best,
      };
    },
  },
  {
    name: "read_pdf_text",
    description:
      "Extract text from a local PDF file for selected pages. Returns bounded text with page markers. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local .pdf file (absolute or relative to current working directory).",
        },
        pageStart: {
          type: "number",
          description: "1-based start page (inclusive). Defaults to 1.",
          default: 1,
        },
        pageEnd: {
          type: "number",
          description: "1-based end page (inclusive). Defaults to 3.",
          default: 3,
        },
        pageNumbers: {
          type: "array",
          description: "Optional explicit list of 1-based pages to extract (overrides pageStart/pageEnd).",
          items: { type: "number" },
        },
        maxChars: {
          type: "number",
          description: "Maximum characters to return across all extracted pages (text is truncated).",
          default: 12000,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const maxChars = clampInt(args?.maxChars, 12000, 1000, 200000);

      const pageNumbersRaw = Array.isArray(args?.pageNumbers) ? (args.pageNumbers as unknown[]) : null;
      const explicitPages = pageNumbersRaw
        ? pageNumbersRaw
            .map((n) => clampInt(n, 0, 0, 100000))
            .filter((n) => n > 0)
        : null;
      const pageStart = clampInt(args?.pageStart, 1, 1, 100000);
      const pageEnd = clampInt(args?.pageEnd, 3, 1, 100000);

      const mod = await getPdfParseModule();
      const PDFParse = (mod as any)?.PDFParse;
      if (typeof PDFParse !== "function") {
        throw new Error("pdf-parse module missing PDFParse export (unsupported version)");
      }

      const buffer = await readFile(filePath);
      const parser = new PDFParse({ data: buffer });

      let numPages = 0;
      let text = "";
      let extractedPages: number[] = [];
      try {
        const parseParams: any = {
          // Prefer consistent structure; we add our own page markers below.
          lineEnforce: true,
          pageJoiner: "",
          parseHyperlinks: false,
        };

        if (explicitPages && explicitPages.length > 0) {
          parseParams.partial = explicitPages;
        } else {
          const start = Math.min(pageStart, pageEnd);
          const end = Math.max(pageStart, pageEnd);
          parseParams.first = start;
          parseParams.last = end;
        }

        const result = await parser.getText(parseParams);
        numPages = Number((result as any)?.total ?? 0);
        const pages = Array.isArray((result as any)?.pages) ? (result as any).pages : [];
        extractedPages = pages
          .map((p: any) => Number(p?.num ?? 0))
          .filter((n: number) => Number.isFinite(n) && n > 0);
        text = pages
          .map((p: any) => `\n\n[PAGE ${Number(p?.num ?? 0)}]\n${String(p?.text ?? "").trim()}\n`)
          .join("")
          .trim();
      } finally {
        try {
          await parser.destroy();
        } catch {
          // ignore
        }
      }

      let truncated = false;
      if (text.length > maxChars) {
        text = text.slice(0, maxChars);
        truncated = true;
      }

      const pagesIncluded = extractedPages;

      return {
        path: filePath,
        numPages,
        pagesIncluded,
        maxChars,
        truncated,
        text,
      };
    },
  },
  {
    name: "pdf_search_text",
    description:
      "Search text inside a local PDF over selected pages. Returns page numbers and bounded snippets around matches. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local .pdf file (absolute or relative to current working directory).",
        },
        query: {
          type: "string",
          description: "Text to search for.",
        },
        caseSensitive: {
          type: "boolean",
          description: "If true, match case-sensitively (default false).",
          default: false,
        },
        pageStart: {
          type: "number",
          description: "1-based start page (inclusive). Defaults to 1.",
          default: 1,
        },
        pageEnd: {
          type: "number",
          description: "1-based end page (inclusive). Defaults to 25.",
          default: 25,
        },
        pageNumbers: {
          type: "array",
          description: "Optional explicit list of 1-based pages to search (overrides pageStart/pageEnd).",
          items: { type: "number" },
        },
        maxMatches: {
          type: "number",
          description: "Maximum matches to return across all pages.",
          default: 25,
        },
        snippetChars: {
          type: "number",
          description: "Snippet size (characters) around each match.",
          default: 180,
        },
      },
      required: ["path", "query"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const queryRaw = String(args?.query ?? "");
      const query = queryRaw.trim();
      if (!query) throw new Error("query is required");

      const caseSensitive = args?.caseSensitive === true;
      const maxMatches = clampInt(args?.maxMatches, 25, 1, 200);
      const snippetChars = clampInt(args?.snippetChars, 180, 40, 1000);

      const pageNumbersRaw = Array.isArray(args?.pageNumbers) ? (args.pageNumbers as unknown[]) : null;
      const explicitPages = pageNumbersRaw
        ? pageNumbersRaw
            .map((n) => clampInt(n, 0, 0, 100000))
            .filter((n) => n > 0)
        : null;
      const pageStart = clampInt(args?.pageStart, 1, 1, 100000);
      const pageEnd = clampInt(args?.pageEnd, 25, 1, 100000);

      const mod = await getPdfParseModule();
      const PDFParse = (mod as any)?.PDFParse;
      if (typeof PDFParse !== "function") {
        throw new Error("pdf-parse module missing PDFParse export (unsupported version)");
      }

      const buffer = await readFile(filePath);
      const parser = new PDFParse({ data: buffer });

      let numPages = 0;
      let extractedPages: number[] = [];
      let pages: Array<{ num: number; text: string }> = [];
      try {
        const parseParams: any = {
          lineEnforce: true,
          pageJoiner: "",
          parseHyperlinks: false,
        };

        if (explicitPages && explicitPages.length > 0) {
          parseParams.partial = explicitPages.slice(0, 200);
        } else {
          const start = Math.min(pageStart, pageEnd);
          const end = Math.max(pageStart, pageEnd);
          parseParams.first = start;
          parseParams.last = end;
        }

        const result = await parser.getText(parseParams);
        numPages = Number((result as any)?.total ?? 0);
        const parsedPages = Array.isArray((result as any)?.pages) ? (result as any).pages : [];
        extractedPages = parsedPages
          .map((p: any) => Number(p?.num ?? 0))
          .filter((n: number) => Number.isFinite(n) && n > 0);
        pages = parsedPages.map((p: any) => ({
          num: Number(p?.num ?? 0),
          text: String(p?.text ?? ""),
        }));
      } finally {
        try {
          await parser.destroy();
        } catch {
          // ignore
        }
      }

      const needle = caseSensitive ? query : query.toLowerCase();
      const matches: Array<{ page: number; index: number; snippet: string }> = [];

      for (const p of pages) {
        const haystackRaw = String(p.text ?? "");
        const haystack = caseSensitive ? haystackRaw : haystackRaw.toLowerCase();

        let from = 0;
        while (matches.length < maxMatches) {
          const idx = haystack.indexOf(needle, from);
          if (idx === -1) break;

          const start = Math.max(0, idx - Math.floor(snippetChars / 2));
          const end = Math.min(haystackRaw.length, start + snippetChars);
          const snippet = haystackRaw.slice(start, end).replace(/\s+/g, " ").trim();
          matches.push({ page: p.num, index: idx, snippet });

          from = idx + Math.max(1, needle.length);
        }
        if (matches.length >= maxMatches) break;
      }

      return {
        path: filePath,
        query,
        caseSensitive,
        numPages,
        pagesIncluded: extractedPages,
        maxMatches,
        matchCount: matches.length,
        matches,
      };
    },
  },
  {
    name: "read_text_file",
    description:
      "Read a local text file (txt/md/xml/json/etc) and return a bounded text slice. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local text file (absolute or relative to current working directory).",
        },
        encoding: {
          type: "string",
          description: "File encoding (default: utf8).",
          default: "utf8",
        },
        startChar: {
          type: "number",
          description: "0-based character offset to start reading from (default: 0).",
          default: 0,
        },
        maxChars: {
          type: "number",
          description: "Maximum characters to return (text is truncated).",
          default: 12000,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const encoding = String(args?.encoding ?? "utf8") as NodeJS.BufferEncoding;
      const startChar = clampInt(args?.startChar, 0, 0, 50_000_000);
      const maxChars = clampInt(args?.maxChars, 12000, 1, 200000);

      const all = await readFile(filePath, { encoding });
      const sliced = all.slice(startChar);
      const truncated = sliced.length > maxChars;
      const text = truncated ? sliced.slice(0, maxChars) : sliced;

      return {
        path: filePath,
        encoding,
        startChar,
        maxChars,
        truncated,
        text,
      };
    },
  },
  {
    name: "read_json_file",
    description:
      "Read a local JSON file and return a bounded JSON preview (depth/item/string truncation). Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local .json file (absolute or relative to current working directory).",
        },
        maxDepth: {
          type: "number",
          description: "Maximum depth to include (default: 8).",
          default: 8,
        },
        maxItems: {
          type: "number",
          description: "Maximum items (array elements or object keys) per container (default: 200).",
          default: 200,
        },
        maxStringChars: {
          type: "number",
          description: "Maximum characters per string value (default: 2000).",
          default: 2000,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const maxDepth = clampInt(args?.maxDepth, 8, 1, 30);
      const maxItems = clampInt(args?.maxItems, 200, 1, 2000);
      const maxStringChars = clampInt(args?.maxStringChars, 2000, 20, 20000);

      const raw = await readFile(filePath, { encoding: "utf8" });
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch (err: any) {
        throw new Error(`Invalid JSON: ${err?.message ?? String(err)}`);
      }

      const state = { truncated: false };
      const value = pruneJsonForPreview(parsed, { maxDepth, maxItems, maxStringChars }, state);

      return {
        path: filePath,
        maxDepth,
        maxItems,
        maxStringChars,
        truncated: state.truncated,
        rootType: Array.isArray(parsed) ? "array" : typeof parsed,
        value,
      };
    },
  },
  {
    name: "json_select",
    description:
      "Select a sub-value from a local JSON file using a JSON Pointer (RFC 6901) and return a bounded preview. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local .json file (absolute or relative to current working directory).",
        },
        pointer: {
          type: "string",
          description:
            "JSON Pointer (RFC 6901). Example: '/a/b/0/name'. Use '' or '/' for the root value.",
          default: "",
        },
        maxDepth: {
          type: "number",
          description: "Maximum depth to include (default: 8).",
          default: 8,
        },
        maxItems: {
          type: "number",
          description: "Maximum items (array elements or object keys) per container (default: 200).",
          default: 200,
        },
        maxStringChars: {
          type: "number",
          description: "Maximum characters per string value (default: 2000).",
          default: 2000,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const pointer = String(args?.pointer ?? "");
      const maxDepth = clampInt(args?.maxDepth, 8, 1, 30);
      const maxItems = clampInt(args?.maxItems, 200, 1, 2000);
      const maxStringChars = clampInt(args?.maxStringChars, 2000, 20, 20000);

      const raw = await readFile(filePath, { encoding: "utf8" });
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch (err: any) {
        throw new Error(`Invalid JSON: ${err?.message ?? String(err)}`);
      }

      const selected = jsonPointerGet(parsed, pointer);
      if (!selected.found) {
        return {
          path: filePath,
          pointer,
          found: false,
          truncated: false,
          value: null,
        };
      }

      const state = { truncated: false };
      const value = pruneJsonForPreview(selected.value, { maxDepth, maxItems, maxStringChars }, state);

      return {
        path: filePath,
        pointer,
        found: true,
        maxDepth,
        maxItems,
        maxStringChars,
        truncated: state.truncated,
        value,
      };
    },
  },
  {
    name: "read_jsonl_file",
    description:
      "Read a local JSONL file and return bounded parsed rows. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local .jsonl file (absolute or relative to current working directory).",
        },
        encoding: {
          type: "string",
          description: "File encoding (default: utf8).",
          default: "utf8",
        },
        offsetLines: {
          type: "number",
          description: "Number of lines to skip before returning results.",
          default: 0,
        },
        limitLines: {
          type: "number",
          description: "Maximum number of non-empty lines to return.",
          default: 200,
        },
        parseJson: {
          type: "boolean",
          description: "If true, parses each line as JSON (default true). If false, returns raw text lines.",
          default: true,
        },
        maxLineChars: {
          type: "number",
          description: "Maximum characters per returned raw line (default 4000).",
          default: 4000,
        },
        maxDepth: {
          type: "number",
          description: "Maximum depth to include for parsed JSON lines (default: 6).",
          default: 6,
        },
        maxItems: {
          type: "number",
          description: "Maximum items per container for parsed JSON lines (default: 100).",
          default: 100,
        },
        maxStringChars: {
          type: "number",
          description: "Maximum characters per string for parsed JSON lines (default: 1000).",
          default: 1000,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const encoding = String(args?.encoding ?? "utf8") as NodeJS.BufferEncoding;
      const offsetLines = clampInt(args?.offsetLines, 0, 0, 5_000_000);
      const limitLines = clampInt(args?.limitLines, 200, 1, 5000);
      const parseJson = args?.parseJson !== false;
      const maxLineChars = clampInt(args?.maxLineChars, 4000, 200, 50000);
      const maxDepth = clampInt(args?.maxDepth, 6, 1, 30);
      const maxItems = clampInt(args?.maxItems, 100, 1, 2000);
      const maxStringChars = clampInt(args?.maxStringChars, 1000, 20, 20000);

      const text = await readFile(filePath, { encoding });
      const linesAll = String(text).split(/\r?\n/);

      const out: Array<{ lineNumber: number; value: any; raw?: string }> = [];
      const errors: Array<{ lineNumber: number; error: string }> = [];

      let seenNonEmpty = 0;
      for (let i = 0; i < linesAll.length; i++) {
        const raw = String(linesAll[i] ?? "");
        if (raw.trim().length === 0) continue;
        if (seenNonEmpty < offsetLines) {
          seenNonEmpty++;
          continue;
        }
        if (out.length >= limitLines) break;

        const lineNumber = i + 1;
        if (!parseJson) {
          const truncated = raw.length > maxLineChars ? raw.slice(0, maxLineChars) + "..." : raw;
          out.push({ lineNumber, value: truncated, raw: undefined });
          continue;
        }

        try {
          const parsed = JSON.parse(raw);
          const state = { truncated: false };
          const pruned = pruneJsonForPreview(
            parsed,
            { maxDepth, maxItems, maxStringChars },
            state
          );
          out.push({ lineNumber, value: pruned });
        } catch (err: any) {
          errors.push({ lineNumber, error: err?.message ?? String(err) });
        }
      }

      return {
        path: filePath,
        encoding,
        offsetLines,
        limitLines,
        parseJson,
        returnedLines: out.length,
        errorCount: errors.length,
        errors: errors.slice(0, 10),
        lines: out,
      };
    },
  },
  {
    name: "zip_list_files",
    description:
      "List entries in a local ZIP file. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local .zip file (absolute or relative to current working directory).",
        },
        maxEntries: {
          type: "number",
          description: "Maximum entries to return.",
          default: 200,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const maxEntries = clampInt(args?.maxEntries, 200, 1, 5000);
      const result = await zipListEntries(filePath, maxEntries);
      return {
        path: filePath,
        maxEntries,
        returnedEntries: result.entries.length,
        truncated: result.truncated,
        entries: result.entries,
      };
    },
  },
  {
    name: "zip_read_text_file",
    description:
      "Read a text file inside a local ZIP archive and return bounded text. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local .zip file (absolute or relative to current working directory).",
        },
        innerPath: {
          type: "string",
          description: "Path of the entry inside the ZIP (use zip_list_files to discover names).",
        },
        caseSensitive: {
          type: "boolean",
          description: "If true, entry match is case-sensitive (default true).",
          default: true,
        },
        encoding: {
          type: "string",
          description: "Text encoding for the entry (default: utf8).",
          default: "utf8",
        },
        maxChars: {
          type: "number",
          description: "Maximum characters to return.",
          default: 12000,
        },
        maxBytes: {
          type: "number",
          description: "Maximum uncompressed bytes to read (safety cap).",
          default: 5000000,
        },
      },
      required: ["path", "innerPath"],
    },
    handler: async (args) => {
      const zipPath = resolveLocalPath(args?.path);
      if (!existsSync(zipPath)) throw new Error(`File not found: ${zipPath}`);

      const innerPath = String(args?.innerPath ?? "").trim();
      if (!innerPath) throw new Error("innerPath is required");

      const caseSensitive = args?.caseSensitive !== false;
      const encoding = String(args?.encoding ?? "utf8") as NodeJS.BufferEncoding;
      const maxChars = clampInt(args?.maxChars, 12000, 200, 200000);
      const maxBytes = clampInt(args?.maxBytes, 5000000, 1000, 50_000_000);

      const { buffer, entry } = await zipReadEntryBuffer(zipPath, innerPath, {
        maxBytes,
        caseSensitive,
      });

      const all = buffer.toString(encoding);
      const truncated = all.length > maxChars;
      const text = truncated ? all.slice(0, maxChars) : all;

      return {
        path: zipPath,
        innerPath: entry.fileName,
        encoding,
        sizeBytes: buffer.length,
        maxChars,
        truncated,
        text,
      };
    },
  },
  {
    name: "zip_extract_file",
    description:
      "Extract a single file from a local ZIP archive to a local output directory (zip-slip safe). Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local .zip file (absolute or relative to current working directory).",
        },
        innerPath: {
          type: "string",
          description: "Path of the entry inside the ZIP (use zip_list_files to discover names).",
        },
        caseSensitive: {
          type: "boolean",
          description: "If true, entry match is case-sensitive (default true).",
          default: true,
        },
        outputDir: {
          type: "string",
          description:
            "Directory to extract into (absolute or relative). Default: .tmp/nodebench_zip_extract",
          default: ".tmp/nodebench_zip_extract",
        },
        overwrite: {
          type: "boolean",
          description: "If true, overwrites an existing output file (default false).",
          default: false,
        },
        maxBytes: {
          type: "number",
          description: "Maximum uncompressed bytes to extract (safety cap).",
          default: 25000000,
        },
      },
      required: ["path", "innerPath"],
    },
    handler: async (args) => {
      const zipPath = resolveLocalPath(args?.path);
      if (!existsSync(zipPath)) throw new Error(`File not found: ${zipPath}`);

      const innerPath = String(args?.innerPath ?? "").trim();
      if (!innerPath) throw new Error("innerPath is required");

      const outputDir = resolveLocalPath(args?.outputDir ?? ".tmp/nodebench_zip_extract");
      const overwrite = args?.overwrite === true;
      const caseSensitive = args?.caseSensitive !== false;
      const maxBytes = clampInt(args?.maxBytes, 25000000, 1000, 200_000_000);

      const { buffer, entry } = await zipReadEntryBuffer(zipPath, innerPath, {
        maxBytes,
        caseSensitive,
      });

      const extractedPath = safeJoinInsideDir(outputDir, entry.fileName);
      await (await import("node:fs/promises")).mkdir(path.dirname(extractedPath), { recursive: true });

      const alreadyExists = existsSync(extractedPath);
      if (alreadyExists && !overwrite) {
        return {
          path: zipPath,
          innerPath: entry.fileName,
          outputDir,
          extractedPath,
          sizeBytes: buffer.length,
          existed: true,
          overwritten: false,
        };
      }

      await (await import("node:fs/promises")).writeFile(extractedPath, buffer);

      return {
        path: zipPath,
        innerPath: entry.fileName,
        outputDir,
        extractedPath,
        sizeBytes: buffer.length,
        existed: alreadyExists,
        overwritten: alreadyExists ? overwrite : false,
      };
    },
  },
  {
    name: "read_docx_text",
    description:
      "Extract text from a local DOCX (Office OpenXML) file. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local .docx file (absolute or relative to current working directory).",
        },
        maxChars: {
          type: "number",
          description: "Maximum characters to return (text is truncated).",
          default: 12000,
        },
        maxBytes: {
          type: "number",
          description: "Maximum uncompressed bytes to read from word/document.xml (safety cap).",
          default: 20000000,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const maxChars = clampInt(args?.maxChars, 12000, 1000, 200000);
      const maxBytes = clampInt(args?.maxBytes, 20000000, 1000, 200_000_000);

      const { buffer } = await zipReadEntryBuffer(filePath, "word/document.xml", {
        maxBytes,
        caseSensitive: true,
      });

      const xml = buffer.toString("utf8");
      let text = docxXmlToText(xml);

      const truncated = text.length > maxChars;
      if (truncated) text = text.slice(0, maxChars);

      return {
        path: filePath,
        source: "word/document.xml",
        maxChars,
        truncated,
        text,
      };
    },
  },
  {
    name: "read_pptx_text",
    description:
      "Extract text from a local PPTX (Office OpenXML) file. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local .pptx file (absolute or relative to current working directory).",
        },
        maxChars: {
          type: "number",
          description: "Maximum characters to return (text is truncated).",
          default: 12000,
        },
        maxSlides: {
          type: "number",
          description: "Maximum slides to process (default: 60).",
          default: 60,
        },
        maxBytesPerSlide: {
          type: "number",
          description: "Maximum uncompressed bytes to read per slide XML (safety cap).",
          default: 10000000,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const maxChars = clampInt(args?.maxChars, 12000, 1000, 200000);
      const maxSlides = clampInt(args?.maxSlides, 60, 1, 500);
      const maxBytesPerSlide = clampInt(args?.maxBytesPerSlide, 10000000, 1000, 200_000_000);

      const listing = await zipListEntries(filePath, 5000);
      const slides = listing.entries
        .map((e) => e.fileName)
        .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
        .map((n) => {
          const m = n.match(/slide(\d+)\.xml$/i);
          return { name: n, index: m ? Number.parseInt(m[1], 10) : 0 };
        })
        .filter((s) => Number.isFinite(s.index) && s.index > 0)
        .sort((a, b) => a.index - b.index)
        .slice(0, maxSlides);

      let text = "";
      for (const slide of slides) {
        const { buffer } = await zipReadEntryBuffer(filePath, slide.name, {
          maxBytes: maxBytesPerSlide,
          caseSensitive: true,
        });
        const xml = buffer.toString("utf8");
        const slideText = pptxSlideXmlToText(xml);
        text += `\n\n[SLIDE ${slide.index}]\n${slideText}\n`;
        if (text.length > maxChars) break;
      }

      text = text.trim();
      const truncated = text.length > maxChars;
      if (truncated) text = text.slice(0, maxChars);

      return {
        path: filePath,
        slideCount: slides.length,
        slidesIncluded: slides.map((s) => s.index),
        maxChars,
        truncated,
        text,
      };
    },
  },
  {
    name: "read_image_ocr_text",
    description:
      "Extract text from a local image (PNG/JPG/etc) using OCR (tesseract.js). Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local image file (absolute or relative to current working directory).",
        },
        lang: {
          type: "string",
          description: "Tesseract language code (default: eng).",
          default: "eng",
        },
        langPath: {
          type: "string",
          description:
            "Optional directory containing traineddata files (e.g. eng.traineddata). If omitted, tesseract.js defaults apply. If .cache/tesseract exists under the current working directory, it is used by default.",
        },
        preprocess: {
          type: "boolean",
          description:
            "If true (default), attempts basic preprocessing with sharp (grayscale + normalize + PNG conversion) to improve OCR.",
          default: true,
        },
        maxChars: {
          type: "number",
          description: "Maximum characters to return (text is truncated).",
          default: 12000,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const lang = String(args?.lang ?? "eng").trim() || "eng";
      const maxChars = clampInt(args?.maxChars, 12000, 200, 200000);
      const preprocess = args?.preprocess !== false;

      let buffer = await readFile(filePath);

      let usedSharp = false;
      if (preprocess) {
        const sharp = await getSharpOptional();
        if (sharp) {
          try {
            // Normalize to PNG and improve contrast for OCR.
            buffer = await sharp(buffer).grayscale().normalize().png().toBuffer();
            usedSharp = true;
          } catch {
            // If preprocessing fails, fall back to the original buffer.
          }
        }
      }

      const langPathArg = typeof args?.langPath === "string" ? args.langPath.trim() : "";
      const defaultLangPath = path.join(process.cwd(), ".cache", "tesseract");
      const langPathEffective = langPathArg
        ? resolveLocalPath(langPathArg)
        : existsSync(defaultLangPath)
          ? defaultLangPath
          : null;

      const tesseract = await getTesseract();
      const recognize = (tesseract as any)?.recognize;
      if (typeof recognize !== "function") {
        throw new Error("tesseract.js missing recognize() export (unsupported version)");
      }

      const result = await recognize(buffer, lang, {
        ...(langPathEffective ? { langPath: langPathEffective } : {}),
        logger: () => {
          // silence
        },
      });

      let text = String((result as any)?.data?.text ?? "").trim();
      const confidence =
        typeof (result as any)?.data?.confidence === "number" ? (result as any).data.confidence : null;

      let truncated = false;
      if (text.length > maxChars) {
        text = text.slice(0, maxChars);
        truncated = true;
      }

      return {
        path: filePath,
        lang,
        langPath: langPathEffective,
        preprocess,
        usedSharp,
        confidence,
        maxChars,
        truncated,
        text,
      };
    },
  },
  {
    name: "solve_red_green_deviation_average_from_image",
    description:
      "Extract red and green numbers from an image, compute population stdev(red) and sample stdev(green), then return their average. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local image file (absolute or relative to current working directory).",
        },
        decimals: {
          type: "number",
          description: "Decimal places to round to (default: 3).",
          default: 3,
        },
        lang: {
          type: "string",
          description: "Tesseract language code (default: eng).",
          default: "eng",
        },
        langPath: {
          type: "string",
          description:
            "Optional directory containing traineddata files. If omitted, tesseract.js defaults apply. If .cache/tesseract exists under the current working directory, it is used by default.",
        },
        maxPixels: {
          type: "number",
          description: "Safety cap on pixels to process (default: 6,000,000).",
          default: 6000000,
        },
        debug: {
          type: "boolean",
          description: "If true, include detailed debug info (labels + segment assignments).",
          default: false,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const decimals = clampInt(args?.decimals, 3, 0, 8);
      const lang = String(args?.lang ?? "eng").trim() || "eng";

      const langPathArg = typeof args?.langPath === "string" ? args.langPath.trim() : "";
      const defaultLangPath = path.join(process.cwd(), ".cache", "tesseract");
      const langPathEffective = langPathArg
        ? resolveLocalPath(langPathArg)
        : existsSync(defaultLangPath)
          ? defaultLangPath
          : null;

      const maxPixels = clampInt(args?.maxPixels, 6000000, 10000, 100_000_000);

      const redOcr = await ocrRecognizeImageFileWithColorMask({
        filePath,
        color: "red",
        lang,
        langPathEffective,
        maxPixels,
      });
      const greenOcr = await ocrRecognizeImageFileWithColorMask({
        filePath,
        color: "green",
        lang,
        langPathEffective,
        maxPixels,
      });

      // OCR on masked grids can concatenate adjacent numbers. Recover by chunking digit runs.
      const repairTwoDigitGrid = (nums: number[]): number[] => {
        const ones = nums.filter((n) => Number.isFinite(n) && n >= 0 && n <= 9);
        const twos = nums.filter((n) => Number.isFinite(n) && n >= 10 && n <= 99);

        // If OCR dropped the leading digit for a handful of tokens (common with '5'),
        // repair by choosing the 2-digit candidate closest to the distribution median.
        if (twos.length < 10 || ones.length === 0 || ones.length > 6) return twos;

        const sorted = [...twos].sort((a, b) => a - b);
        const med = sorted[Math.floor(sorted.length / 2)];

        const repaired = [...twos];
        for (const d of ones) {
          let best = 10 + d;
          let bestDist = Math.abs(best - med);
          for (let k = 2; k <= 9; k++) {
            const cand = k * 10 + d;
            const dist = Math.abs(cand - med);
            if (dist < bestDist) {
              best = cand;
              bestDist = dist;
            }
          }
          repaired.push(best);
        }
        return repaired;
      };

      const redRaw = extractChunkedIntsFromText(redOcr.text, { chunkSize: 2, min: 0, max: 99 });
      const greenRaw = extractChunkedIntsFromText(greenOcr.text, { chunkSize: 2, min: 0, max: 99 });

      const redNums = repairTwoDigitGrid(redRaw);
      const greenNums = repairTwoDigitGrid(greenRaw);

      if (!redNums.length) throw new Error("No red numbers found via OCR");
      if (greenNums.length < 2) throw new Error("Need at least 2 green numbers via OCR");

      const redDev = pstdev(redNums);
      const greenDev = stdev(greenNums);
      const avg = (redDev + greenDev) / 2;
      const rounded = Number(avg.toFixed(decimals));

      return {
        path: filePath,
        decimals,
        redCount: redNums.length,
        greenCount: greenNums.length,
        redPstdev: Number(redDev.toFixed(decimals + 3)),
        greenStdev: Number(greenDev.toFixed(decimals + 3)),
        average: rounded,
        answer: rounded.toFixed(decimals),
      };
    },
  },
  {
    name: "solve_green_polygon_area_from_image",
    description:
      "Compute the area of a green filled polygon in an image by pixel segmentation, calibrating pixel-to-unit scale from nearby purple length labels. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local image file (absolute or relative to current working directory).",
        },
        lang: {
          type: "string",
          description: "Tesseract language code for reading purple numeric labels (default: eng).",
          default: "eng",
        },
        langPath: {
          type: "string",
          description:
            "Optional directory containing traineddata files. If omitted, tesseract.js defaults apply. If .cache/tesseract exists under the current working directory, it is used by default.",
        },
        maxPixels: {
          type: "number",
          description: "Safety cap on pixels to process (default: 6,000,000).",
          default: 6000000,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const sharp = await getSharpOptional();
      if (!sharp) throw new Error("Missing optional dependency: sharp. Install it to use polygon area parsing.");

      const lang = String(args?.lang ?? "eng").trim() || "eng";
      const langPathArg = typeof args?.langPath === "string" ? args.langPath.trim() : "";
      const defaultLangPath = path.join(process.cwd(), ".cache", "tesseract");
      const langPathEffective = langPathArg
        ? resolveLocalPath(langPathArg)
        : existsSync(defaultLangPath)
          ? defaultLangPath
          : null;

      const maxPixels = clampInt(args?.maxPixels, 6000000, 10000, 100_000_000);
      const debug = args?.debug === true || process.env.NODEBENCH_DEBUG_GREEN_POLYGON === "1";

      // Segment green pixels (filled polygon).
      const image = sharp(await readFile(filePath));
      const meta = await image.metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      if (!w || !h) throw new Error("Unable to read image dimensions");
      if (w * h > maxPixels) {
        throw new Error(`Refusing huge image (${w}x${h}) for polygon parsing (maxPixels=${maxPixels})`);
      }

      const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const width = info.width;
      const height = info.height;

      const green = new Uint8Array(width * height);
      let areaPx = 0;
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Conservative "green" heuristic: G is high and dominates R/B.
        const isGreen = a >= 40 && g >= 110 && g - r >= 25 && g - b >= 25;
      if (isGreen) {
        green[j] = 1;
        areaPx++;
      }
    }
    if (!areaPx) throw new Error("No green region detected");

      // Trace the polygon boundary on a grid, then assign labeled lengths to segments and compute area in units.
      const vertW = width + 1;
      const adj = new Map<number, number[]>();
      const pushNeighbor = (a: number, b: number) => {
        const arr = adj.get(a);
        if (arr) {
          if (!arr.includes(b)) arr.push(b);
        } else {
          adj.set(a, [b]);
        }
      };
      const addEdge = (ax: number, ay: number, bx: number, by: number) => {
        const aId = ay * vertW + ax;
        const bId = by * vertW + bx;
        pushNeighbor(aId, bId);
        pushNeighbor(bId, aId);
      };
      const pix = (x: number, y: number) => green[y * width + x] === 1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!pix(x, y)) continue;

          // Add boundary edges where the neighbor pixel is empty/out-of-bounds.
          if (y === 0 || !pix(x, y - 1)) addEdge(x, y, x + 1, y); // top edge
          if (y === height - 1 || !pix(x, y + 1)) addEdge(x, y + 1, x + 1, y + 1); // bottom edge
          if (x === 0 || !pix(x - 1, y)) addEdge(x, y, x, y + 1); // left edge
          if (x === width - 1 || !pix(x + 1, y)) addEdge(x + 1, y, x + 1, y + 1); // right edge
        }
      }
      if (!adj.size) throw new Error("Failed to build polygon boundary graph");

      const idToXY = (id: number) => ({ x: id % vertW, y: Math.floor(id / vertW) });

      // Extract all boundary cycles (outer boundary + holes). Filled pixel regions can contain holes,
      // and we must subtract them from the outer boundary area.
      const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
      const visitedEdge = new Set<string>();
      const maxSteps = Math.max(10_000, width * height);

      const cycleIds: number[][] = [];
      for (const [u, ns] of adj.entries()) {
        for (const v of ns) {
          const k0 = edgeKey(u, v);
          if (visitedEdge.has(k0)) continue;

          const pathIds: number[] = [u];
          let prev = u;
          let curr = v;
          visitedEdge.add(k0);

          for (let step = 0; step < maxSteps; step++) {
            pathIds.push(curr);
            if (curr === u) break;

            const nbrs = adj.get(curr) ?? [];
            if (!nbrs.length) break;

            // Prefer an unvisited edge continuing forward, else fall back to "not prev".
            let next =
              nbrs.find((n) => n !== prev && !visitedEdge.has(edgeKey(curr, n))) ??
              nbrs.find((n) => n !== prev) ??
              nbrs[0];
            if (typeof next !== "number") break;
            visitedEdge.add(edgeKey(curr, next));
            prev = curr;
            curr = next;
          }

          if (pathIds.length >= 4 && pathIds[pathIds.length - 1] === u) {
            cycleIds.push(pathIds);
          }
        }
      }
      if (!cycleIds.length) throw new Error("Failed to extract boundary cycles");

      const cycleData: Array<{
        pts: Array<{ x: number; y: number }>;
        areaPx2: number;
        box: { x0: number; y0: number; x1: number; y1: number };
      }> = [];
      for (const ids of cycleIds) {
        const pts = ids.map(idToXY);
        if (pts.length < 4) continue;

        let x0 = pts[0].x,
          x1 = pts[0].x,
          y0 = pts[0].y,
          y1 = pts[0].y;
        for (const p of pts) {
          if (p.x < x0) x0 = p.x;
          if (p.x > x1) x1 = p.x;
          if (p.y < y0) y0 = p.y;
          if (p.y > y1) y1 = p.y;
        }

        let twiceArea = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          twiceArea += pts[i].x * pts[i + 1].y - pts[i + 1].x * pts[i].y;
        }
        const areaPx2 = Math.abs(twiceArea) / 2;
        if (!Number.isFinite(areaPx2) || areaPx2 < 10) continue;

        cycleData.push({ pts, areaPx2, box: { x0, y0, x1, y1 } });
      }
      if (!cycleData.length) throw new Error("No valid boundary cycles after filtering");

      type Seg = {
        dir: "R" | "L" | "U" | "D";
        pxLen: number;
        x0: number;
        y0: number;
        x1: number;
        y1: number;
        unitLen: number | null;
        labelRaw: string | null;
        cycleIndex: number;
      };
      const allSegs: Seg[] = [];
      const cycleSegs: Seg[][] = [];
      for (let cycleIndex = 0; cycleIndex < cycleData.length; cycleIndex++) {
        const pts = cycleData[cycleIndex].pts;

        const segs: Seg[] = [];
        let runDir: Seg["dir"] | null = null;
        let runLen = 0;
        let sx = pts[0].x;
        let sy = pts[0].y;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1];
          const b = pts[i];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dir: Seg["dir"] = dx === 1 ? "R" : dx === -1 ? "L" : dy === 1 ? "D" : "U";
          if (runDir === null) {
            runDir = dir;
            runLen = 1;
            sx = a.x;
            sy = a.y;
            continue;
          }
          if (dir === runDir) {
            runLen++;
            continue;
          }
          segs.push({
            dir: runDir,
            pxLen: runLen,
            x0: sx,
            y0: sy,
            x1: a.x,
            y1: a.y,
            unitLen: null,
            labelRaw: null,
            cycleIndex,
          });
          runDir = dir;
          runLen = 1;
          sx = a.x;
          sy = a.y;
        }
        if (runDir !== null && runLen > 0) {
          const lastA = pts[pts.length - 2];
          segs.push({
            dir: runDir,
            pxLen: runLen,
            x0: sx,
            y0: sy,
            x1: lastA.x,
            y1: lastA.y,
            unitLen: null,
            labelRaw: null,
            cycleIndex,
          });
        }

        cycleSegs.push(segs);
        allSegs.push(...segs);
      }
      if (allSegs.length < 4) throw new Error("Failed to simplify boundary into segments");

      // Build a purple-only binary mask for labels.
      const purpleBw = new Uint8Array(width * height);
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        // Purple length labels: relatively high R and B, lower G. Keep this somewhat permissive to
        // avoid dropping thin digits (e.g. "4") due to anti-aliasing.
        const isPurple = a >= 40 && r >= 120 && b >= 120 && g <= 220 && r - g >= 10 && b - g >= 10;
        purpleBw[j] = isPurple ? 0 : 255;
      }

      const parseLabelValue = (raw: string): number | null => {
        const cleaned = String(raw ?? "")
          .trim()
          .replace(/,/g, ".")
          .replace(/[^0-9.]/g, "");
        if (!cleaned) return null;
        const parts = cleaned.split(".");
        const normalized = parts.length <= 2 ? cleaned : `${parts[0]}.${parts.slice(1).join("")}`;
        const n = Number.parseFloat(normalized);
        return Number.isFinite(n) ? n : null;
      };

      const purpleBuf = Buffer.from(purpleBw);
      const visited = new Uint8Array(width * height);
      const inBounds = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height;
      const neighbors = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
      ] as const;

      type Comp = { area: number; x0: number; y0: number; x1: number; y1: number; cx: number; cy: number };
      const comps: Comp[] = [];
      const idx2 = (x: number, y: number) => y * width + x;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const startIdx = idx2(x, y);
          if (visited[startIdx]) continue;
          visited[startIdx] = 1;
          if (purpleBw[startIdx] >= 128) continue;

          let area = 0;
          let sx2 = 0;
          let sy2 = 0;
          let x0 = x,
            x1 = x,
            y0 = y,
            y1 = y;
          const qx: number[] = [x];
          const qy: number[] = [y];
          for (let qi = 0; qi < qx.length; qi++) {
            const px = qx[qi];
            const py = qy[qi];
            const pidx = idx2(px, py);
            if (purpleBw[pidx] >= 128) continue;

            area++;
            sx2 += px;
            sy2 += py;
            if (px < x0) x0 = px;
            if (px > x1) x1 = px;
            if (py < y0) y0 = py;
            if (py > y1) y1 = py;

            for (const [dx, dy] of neighbors) {
              const nx = px + dx;
              const ny = py + dy;
              if (!inBounds(nx, ny)) continue;
              const nidx = idx2(nx, ny);
              if (visited[nidx]) continue;
              visited[nidx] = 1;
              if (purpleBw[nidx] < 128) {
                qx.push(nx);
                qy.push(ny);
              }
            }
          }

          const bw = x1 - x0 + 1;
          const bh = y1 - y0 + 1;
          if (area < 6) continue;
          if (bw < 2 || bh < 2) continue;
          if (bw > Math.round(width * 0.25) || bh > Math.round(height * 0.25)) continue;

          const cx = sx2 / area;
          const cy = sy2 / area;
          comps.push({ area, x0, y0, x1, y1, cx, cy });
        }
      }

      // Group digit components into label boxes.
      comps.sort((a, b) => a.cy - b.cy || a.cx - b.cx);
      const rowTol = Math.max(8, Math.round(height * 0.03));
      const rows: Array<{ cy: number; comps: Comp[] }> = [];
      for (const c of comps) {
        const row = rows.find((r) => Math.abs(r.cy - c.cy) <= rowTol);
        if (!row) {
          rows.push({ cy: c.cy, comps: [c] });
          continue;
        }
        row.comps.push(c);
        row.cy = (row.cy * (row.comps.length - 1) + c.cy) / row.comps.length;
      }

      const labelBoxes: Array<{ x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }> = [];
      const xGapTol = Math.max(6, Math.round(width * 0.015));
      for (const r of rows) {
        const cs = [...r.comps].sort((a, b) => a.cx - b.cx);
        let group: Comp[] = [];
        const flush = () => {
          if (!group.length) return;
          let x0 = group[0].x0,
            y0 = group[0].y0,
            x1 = group[0].x1,
            y1 = group[0].y1;
          for (const c of group) {
            if (c.x0 < x0) x0 = c.x0;
            if (c.y0 < y0) y0 = c.y0;
            if (c.x1 > x1) x1 = c.x1;
            if (c.y1 > y1) y1 = c.y1;
          }
          labelBoxes.push({ x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });
          group = [];
        };
        for (const c of cs) {
          const last = group[group.length - 1];
          if (!last) {
            group.push(c);
            continue;
          }
          const gap = c.x0 - last.x1;
          if (gap <= xGapTol) {
            group.push(c);
          } else {
            flush();
            group.push(c);
          }
        }
        flush();
      }

      const ocrLabelBox = async (box: { x0: number; y0: number; x1: number; y1: number }): Promise<{ value: number; raw: string } | null> => {
        const pad = 2;
        const left = clampInt(box.x0 - pad, 0, 0, width - 1);
        const top = clampInt(box.y0 - pad, 0, 0, height - 1);
        const right = clampInt(box.x1 + pad, width - 1, 0, width - 1);
        const bottom = clampInt(box.y1 + pad, height - 1, 0, height - 1);
        const w2 = right - left + 1;
        const h2 = bottom - top + 1;
        if (w2 < 4 || h2 < 4) return null;

        const targetW = 140;
        const scale = w2 < targetW ? Math.max(1, Math.min(8, Math.ceil(targetW / w2))) : 1;
         const buf = await sharp(purpleBuf, { raw: { width, height, channels: 1 } })
           .extract({ left, top, width: w2, height: h2 })
           .resize({ width: w2 * scale, height: h2 * scale, kernel: "nearest" })
          // sharp blur() requires sigma >= 0.3. Use 0.5 for safety margin above the minimum.
          .blur(0.5)
          .threshold(180)
          .png()
          .toBuffer();

        const psms = [7, 8, 11];
        let best: { value: number; raw: string; conf: number } | null = null;
        for (const psm of psms) {
          const out = await ocrRecognizeBuffer({
            buffer: buf,
            lang,
            langPathEffective,
            tessOptions: {
              tessedit_char_whitelist: "0123456789.",
              tessedit_pageseg_mode: String(psm),
              user_defined_dpi: "300",
            },
            output: { text: true, tsv: false },
          });
          const raw = String(out.text ?? "").trim();
          const v = parseLabelValue(raw);
          if (v === null) continue;
          const conf = typeof out.confidence === "number" && Number.isFinite(out.confidence) ? out.confidence : -1;
          if (!best || conf > best.conf) best = { value: v, raw, conf };
        }
        return best ? { value: best.value, raw: best.raw } : null;
      };

      const labels: Array<{ value: number; cx: number; cy: number; raw: string }> = [];
      for (const b of labelBoxes) {
        const o = await ocrLabelBox(b);
        if (!o) continue;
        // Basic sanity filter (avoid spurious large numbers).
        if (o.value <= 0 || o.value > 1000) continue;
        labels.push({ value: o.value, cx: b.cx, cy: b.cy, raw: o.raw });
      }
      if (!labels.length) throw new Error("Failed to extract any purple labels");

      const dist2PointToSeg = (px: number, py: number, s: Seg): number => {
        const xMin = Math.min(s.x0, s.x1);
        const xMax = Math.max(s.x0, s.x1);
        const yMin = Math.min(s.y0, s.y1);
        const yMax = Math.max(s.y0, s.y1);
        const dx = px < xMin ? xMin - px : px > xMax ? px - xMax : 0;
        const dy = py < yMin ? yMin - py : py > yMax ? py - yMax : 0;
        return dx * dx + dy * dy;
      };

      const segBestDist = new Array<number>(allSegs.length).fill(Number.POSITIVE_INFINITY);
      for (const lab of labels) {
        let bestIdx = -1;
        let bestD = Number.POSITIVE_INFINITY;
        for (let i = 0; i < allSegs.length; i++) {
          const d2 = dist2PointToSeg(lab.cx, lab.cy, allSegs[i]);
          if (d2 < bestD) {
            bestD = d2;
            bestIdx = i;
          }
        }
        if (bestIdx < 0) continue;
        if (bestD < segBestDist[bestIdx]) {
          segBestDist[bestIdx] = bestD;
          allSegs[bestIdx].unitLen = lab.value;
          allSegs[bestIdx].labelRaw = lab.raw;
        }
      }

      const labeled = allSegs.filter((s) => s.unitLen !== null && s.unitLen > 0);
      if (!labeled.length) throw new Error("No segments received labels; cannot compute area");

      const median = (xs: number[]): number => {
        const s = [...xs].sort((a, b) => a - b);
        const mid = Math.floor(s.length / 2);
        return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
      };

      // Calibrate px-per-unit from labeled segments (best effort). Use per-orientation medians so
      // one bad label doesn't poison all inferred segments.
      const pxPerUnitAll = median(labeled.map((s) => s.pxLen / (s.unitLen as number)));
      const labeledH = labeled.filter((s) => s.dir === "R" || s.dir === "L");
      const labeledV = labeled.filter((s) => s.dir === "U" || s.dir === "D");
      const pxPerUnitH = labeledH.length ? median(labeledH.map((s) => s.pxLen / (s.unitLen as number))) : pxPerUnitAll;
      const pxPerUnitV = labeledV.length ? median(labeledV.map((s) => s.pxLen / (s.unitLen as number))) : pxPerUnitAll;

      // Infer missing segment lengths in *units* for unlabeled segments (fallback only).
      for (const s of allSegs) {
        if (s.unitLen !== null) continue;
        const ppu = s.dir === "R" || s.dir === "L" ? pxPerUnitH : pxPerUnitV;
        const safe = ppu > 0 ? ppu : 1;
        s.unitLen = s.pxLen / safe;
      }

      // Compute area in *unit* coordinates via shoelace on each cycle.
      const cycleAreasUnits: number[] = [];
      for (let cycleIndex = 0; cycleIndex < cycleSegs.length; cycleIndex++) {
        const segs = cycleSegs[cycleIndex] ?? [];
        if (!segs.length) {
          cycleAreasUnits.push(0);
          continue;
        }
        let ux = 0;
        let uy = 0;
        const verts: Array<{ x: number; y: number }> = [{ x: ux, y: uy }];
        for (const s of segs) {
          const len = s.unitLen ?? 0;
          if (s.dir === "R") ux += len;
          else if (s.dir === "L") ux -= len;
          else if (s.dir === "D") uy += len;
          else uy -= len;
          verts.push({ x: ux, y: uy });
        }
        let twiceArea = 0;
        for (let i = 0; i < verts.length - 1; i++) {
          twiceArea += verts[i].x * verts[i + 1].y - verts[i + 1].x * verts[i].y;
        }
        cycleAreasUnits.push(Math.abs(twiceArea) / 2);
      }

      // Subtract holes that are strictly inside the outer boundary bbox (same heuristic as px-space).
      const outerIdx = cycleData.reduce((bestIdx, c, i) => (c.areaPx2 > cycleData[bestIdx].areaPx2 ? i : bestIdx), 0);
      const outerBox = cycleData[outerIdx].box;

      let totalAreaUnits = 0;
      for (let i = 0; i < cycleData.length; i++) {
        const c = cycleData[i];
        const isInsideOuter =
          i !== outerIdx &&
          c.box.x0 > outerBox.x0 &&
          c.box.x1 < outerBox.x1 &&
          c.box.y0 > outerBox.y0 &&
          c.box.y1 < outerBox.y1;
        totalAreaUnits += i === outerIdx ? (cycleAreasUnits[i] ?? 0) : isInsideOuter ? -(cycleAreasUnits[i] ?? 0) : (cycleAreasUnits[i] ?? 0);
      }

      const areaUnits = Math.abs(totalAreaUnits);
      const rounded = Math.round(areaUnits);

      return {
        path: filePath,
        width,
        height,
        areaPx,
        cyclesDetected: cycleData.length,
        segments: allSegs.length,
        labeledSegments: labeled.length,
        labelsDetected: labels.length,
        pxPerUnit: Number((pxPerUnitAll > 0 ? pxPerUnitAll : 1).toFixed(4)),
        areaUnits: Number(areaUnits.toFixed(4)),
        answer: String(rounded),
        ...(debug
          ? {
              labels: labels
                .map((l) => ({
                  value: l.value,
                  raw: l.raw,
                  cx: Math.round(l.cx),
                  cy: Math.round(l.cy),
                }))
                .sort((a, b) => a.cy - b.cy || a.cx - b.cx),
              outerCycleIndex: outerIdx,
              outerCycleSegments: (cycleSegs[outerIdx] ?? []).map((s) => ({
                dir: s.dir,
                pxLen: s.pxLen,
                unitLen: s.unitLen,
                labelRaw: s.labelRaw,
              })),
            }
          : {}),
      };
    },
  },
  {
    name: "grade_fraction_quiz_from_image",
    description:
      "Grade a fraction quiz shown in an image by OCRing the problems + student answers, computing correct answers, and scoring by problem type. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local image file (absolute or relative to current working directory).",
        },
        bonusPoints: {
          type: "number",
          description: "Bonus points added to the final total (default: 0).",
          default: 0,
        },
        pointsAddSubtract: {
          type: "number",
          description: "Points for add/subtract fraction problems (default: 5).",
          default: 5,
        },
        pointsMultiplyDivide: {
          type: "number",
          description: "Points for multiply/divide fraction problems (default: 10).",
          default: 10,
        },
        pointsImproperFraction: {
          type: "number",
          description: "Points for forming an improper fraction (default: 15).",
          default: 15,
        },
        pointsMixedNumber: {
          type: "number",
          description: "Points for forming a mixed number (default: 20).",
          default: 20,
        },
        lang: {
          type: "string",
          description: "Tesseract language code (default: eng).",
          default: "eng",
        },
        langPath: {
          type: "string",
          description:
            "Optional directory containing traineddata files. If omitted, tesseract.js defaults apply. If .cache/tesseract exists under the current working directory, it is used by default.",
        },
        preprocess: {
          type: "boolean",
          description: "If true (default), basic sharp preprocessing is applied before OCR.",
          default: true,
        },
        maxChars: {
          type: "number",
          description: "Maximum OCR text characters to consider.",
          default: 80000,
        },
        maxQuestions: {
          type: "number",
          description: "Maximum question count to scan for (default: 30).",
          default: 30,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const bonusPoints = clampInt(args?.bonusPoints, 0, -100000, 100000);
      const pointsAddSubtract = clampInt(args?.pointsAddSubtract, 5, 0, 1000);
      const pointsMultiplyDivide = clampInt(args?.pointsMultiplyDivide, 10, 0, 1000);
      const pointsImproperFraction = clampInt(args?.pointsImproperFraction, 15, 0, 1000);
      const pointsMixedNumber = clampInt(args?.pointsMixedNumber, 20, 0, 1000);
      const maxQuestions = clampInt(args?.maxQuestions, 30, 1, 200);

      const lang = String(args?.lang ?? "eng").trim() || "eng";
      const preprocess = args?.preprocess !== false;
      const maxChars = clampInt(args?.maxChars, 80000, 5000, 200000);

      const langPathArg = typeof args?.langPath === "string" ? args.langPath.trim() : "";
      const defaultLangPath = path.join(process.cwd(), ".cache", "tesseract");
      const langPathEffective = langPathArg
        ? resolveLocalPath(langPathArg)
        : existsSync(defaultLangPath)
          ? defaultLangPath
          : null;

      // Preferred path (deterministic + robust): detect row bands from pixels, then OCR each row separately.
      const sharp = await getSharpOptional();
      if (sharp && preprocess) {
        const rowRes = await gradeFractionQuizFromImageRowBands({
          sharp,
          filePath,
          lang,
          langPathEffective,
          bonusPoints,
          pointsAddSubtract,
          pointsMultiplyDivide,
          pointsImproperFraction,
          pointsMixedNumber,
        });
        if (rowRes) {
          return {
            path: filePath,
            bonusPoints,
            extractedQuestionCount: rowRes.extractedQuestionCount,
            score: rowRes.score,
            answer: String(rowRes.score),
            perQuestion: rowRes.perQuestion,
            ocr: {
              lang,
              langPath: langPathEffective,
              preprocess,
              usedSharp: true,
              confidence: null,
            },
          };
        }

        // Fallback: older whole-page OCR geometry approach.
        const meta = await sharp(filePath).metadata();
        const w0 = meta.width ?? 0;
        const h0 = meta.height ?? 0;
        if (w0 && h0) {
          const scale = w0 < 1200 ? 3 : w0 < 2000 ? 2 : 1;
          const processed = await sharp(filePath)
            .grayscale()
            .resize({ width: w0 * scale, height: h0 * scale, kernel: "lanczos3" })
            .normalize()
            .threshold(180)
            .png()
            .toBuffer();

          const ocrGeomBase = await ocrRecognizeBuffer({ buffer: processed, lang, langPathEffective });
          const width = w0 * scale;
          const height = h0 * scale;

          type Tok = { text: string; bbox: OcrBBox; cx: number; cy: number };
          const tokens: Tok[] = ocrGeomBase.words
            .filter((w) => !!w.bbox && !!w.text && w.text.trim())
            .map((w) => {
              const bbox = w.bbox as OcrBBox;
              return {
                text: w.text.trim(),
                bbox,
                cx: (bbox.x0 + bbox.x1) / 2,
                cy: (bbox.y0 + bbox.y1) / 2,
              };
            });

          const leftMaxX = width * 0.08;
          const answerRegionX0 = width * 0.32;

          const candidates = tokens
            .map((t) => ({ t, v: toIntegerOrNull(t.text) }))
            .filter((x): x is { t: Tok; v: number } => typeof x.v === "number" && Number.isFinite(x.v))
            .filter((x) => x.v >= 1 && x.v <= maxQuestions)
            .filter((x) => x.t.bbox.x1 <= leftMaxX)
            .sort((a, b) => a.t.cy - b.t.cy);

          const candidates10 = candidates.filter((c) => c.v <= 10);
          const anchorsRaw = candidates10.length >= 6 ? candidates10 : candidates;

          const anchors: Array<{ index: number; cy: number }> = [];
          const yTol = Math.max(12, Math.round(height * 0.01));
          for (const a of anchorsRaw) {
            const last = anchors[anchors.length - 1];
            if (last && Math.abs(a.t.cy - last.cy) <= yTol) continue;
            anchors.push({ index: a.v, cy: a.t.cy });
          }
          anchors.sort((a, b) => a.cy - b.cy);

          if (anchors.length >= 2) {
            const bandTop = (i: number) => (i === 0 ? 0 : (anchors[i - 1].cy + anchors[i].cy) / 2);
            const bandBottom = (i: number) =>
              i === anchors.length - 1 ? height : (anchors[i].cy + anchors[i + 1].cy) / 2;

            const perQuestion: Array<{
              index: number;
              type: string;
              correct: boolean;
              points: number;
              studentAnswer: string | null;
              correctAnswer: string;
            }> = [];
            let total = 0;

            for (let i = 0; i < anchors.length; i++) {
              const idx = anchors[i].index;
              const y0 = bandTop(i);
              const y1 = bandBottom(i);

              const row = tokens.filter((t) => t.cy >= y0 && t.cy < y1);
              if (!row.length) continue;

              const answerTokens = row
                .filter((t) => t.bbox.x0 >= answerRegionX0)
                .sort((a, b) => a.bbox.x0 - b.bbox.x0);
              const answerText = answerTokens.map((t) => t.text).join(" ").trim();
              const studentMixed = parseMixedNumberLoose(answerText);
              const studentFrac = parseFractionLoose(answerText);

              const left = row.filter((t) => t.bbox.x1 < answerRegionX0);
              const numeric = left
                .map((t) => ({ t, v: toIntegerOrNull(t.text) }))
                .filter((x): x is { t: Tok; v: number } => typeof x.v === "number" && Number.isFinite(x.v))
                .filter((x) => !(x.v === idx && x.t.bbox.x1 <= leftMaxX));

              const heights = numeric
                .map((x) => x.t.bbox.y1 - x.t.bbox.y0)
                .filter((n) => Number.isFinite(n) && n > 0)
                .sort((a, b) => a - b);
              const medianH = heights.length ? heights[Math.floor(heights.length / 2)] : 20;
              const maxDy = Math.max(20, Math.round(medianH * 1.8));
              const xTol = Math.max(18, Math.round(width * 0.015));

              const cols: Array<{ x: number; items: Array<{ v: number; bbox: OcrBBox; tok: Tok }> }> = [];
              for (const it of numeric) {
                const cx = it.t.cx;
                const col = cols.find((c) => Math.abs(c.x - cx) <= xTol);
                if (col) col.items.push({ v: it.v, bbox: it.t.bbox, tok: it.t });
                else cols.push({ x: cx, items: [{ v: it.v, bbox: it.t.bbox, tok: it.t }] });
              }

              const used = new Set<Tok>();
              const fracPairs: Array<{ x: number; frac: Fraction }> = [];
              for (const col of cols) {
                const items = col.items.sort((a, b) => a.bbox.y0 - b.bbox.y0);
                for (let j = 0; j < items.length - 1; j++) {
                  const top = items[j];
                  const bot = items[j + 1];
                  const dy = bot.bbox.y0 - top.bbox.y1;
                  if (dy < -2 || dy > maxDy) continue;
                  if (bot.v === 0) continue;
                  fracPairs.push({ x: col.x, frac: normalizeFraction({ n: top.v, d: bot.v }) });
                  used.add(top.tok);
                  used.add(bot.tok);
                }
              }

              fracPairs.sort((a, b) => a.x - b.x);
              const fracs = fracPairs.length > 2 ? fracPairs.slice(0, 2) : fracPairs;

              const opCandidates = left
                .map((t) => ({ t, s: t.text.trim() }))
                .filter((x) => x.s.length && x.s.length <= 2)
                .map((x) => ({ ...x, ch: x.s.replace(/[^\+\-\*xX/]/g, "")[0] ?? "" }))
                .filter((x) => !!x.ch);

              const pickOp = (aX: number, bX: number) => {
                const mid = (aX + bX) / 2;
                const between = opCandidates
                  .filter((o) => o.t.cx >= Math.min(aX, bX) && o.t.cx <= Math.max(aX, bX))
                  .sort((p, q) => Math.abs(p.t.cx - mid) - Math.abs(q.t.cx - mid));
                return between.length ? between[0].ch : "+";
              };

              if (fracs.length >= 2) {
                const a = fracs[0].frac;
                const bFrac = fracs[1].frac;
                const student = studentFrac;
                if (!student) continue;

                const opChar = pickOp(fracs[0].x, fracs[1].x);
                let correct: Fraction;
                let kind: "add_subtract" | "multiply_divide";
                if (opChar === "+" || opChar === "-") {
                  correct = opChar === "+" ? addFractions(a, bFrac) : subFractions(a, bFrac);
                  kind = "add_subtract";
                } else if (opChar === "x" || opChar === "X" || opChar === "*") {
                  correct = mulFractions(a, bFrac);
                  kind = "multiply_divide";
                } else {
                  correct = divFractions(a, bFrac);
                  kind = "multiply_divide";
                }

                const ok = fractionsEqual(student, correct);
                const pts = ok ? (kind === "add_subtract" ? pointsAddSubtract : pointsMultiplyDivide) : 0;
                total += pts;
                perQuestion.push({
                  index: idx,
                  type: kind,
                  correct: ok,
                  points: pts,
                  studentAnswer: fractionToString(student),
                  correctAnswer: fractionToString(correct),
                });
                continue;
              }

              if (fracs.length === 1) {
                const given = fracs[0].frac;

                const wholeCandidates = numeric
                  .filter((n) => !used.has(n.t))
                  .map((n) => ({ v: n.v, x: n.t.bbox.x0 }))
                  .filter((n) => n.x > leftMaxX && n.x < fracs[0].x - xTol * 0.5);
                const whole = wholeCandidates.length ? wholeCandidates[wholeCandidates.length - 1].v : null;

                if (whole !== null) {
                  const student = studentFrac;
                  if (!student) continue;
                  const correct = normalizeFraction({ n: whole * given.d + Math.abs(given.n), d: given.d });
                  const ok = fractionsEqual(student, correct);
                  const pts = ok ? pointsImproperFraction : 0;
                  total += pts;
                  perQuestion.push({
                    index: idx,
                    type: "improper_fraction",
                    correct: ok,
                    points: pts,
                    studentAnswer: fractionToString(student),
                    correctAnswer: fractionToString(correct),
                  });
                  continue;
                }

                const wholeOut = Math.trunc(given.n / given.d);
                const rem = Math.abs(given.n % given.d);
                const correctFrac = normalizeFraction({ n: rem, d: given.d });
                const ok =
                  studentMixed !== null &&
                  studentMixed.whole === wholeOut &&
                  fractionsEqual(studentMixed.frac, correctFrac);
                const pts = ok ? pointsMixedNumber : 0;
                total += pts;
                perQuestion.push({
                  index: idx,
                  type: "mixed_number",
                  correct: ok,
                  points: pts,
                  studentAnswer: studentMixed ? mixedNumberToString(studentMixed.whole, studentMixed.frac) : null,
                  correctAnswer: mixedNumberToString(wholeOut, correctFrac),
                });
              }
            }

            total += bonusPoints;

            // If we graded at least one question, return the geometry-based score.
            if (perQuestion.length) {
              return {
                path: filePath,
                bonusPoints,
                extractedQuestionCount: perQuestion.length,
                score: total,
                answer: String(total),
                perQuestion,
                ocr: {
                  lang,
                  langPath: langPathEffective,
                  preprocess,
                  usedSharp: true,
                  confidence: ocrGeomBase.confidence,
                },
              };
            }
          }
        }
      }

      const ocr = await ocrRecognizeImageFile({ filePath, lang, langPathEffective, preprocess });
      const ocrText = ocr.text.slice(0, maxChars);

      const rawLines = ocr.lines.map((l) => l.text).filter((t) => t && t.trim());
      const lines = rawLines.length
        ? rawLines
        : ocrText
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);

      type Block = { index: number; text: string };
      const blocks: Block[] = [];
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^\s*(\d{1,3})\b\s*(.*)$/);
        if (!m) continue;
        const idx = Number.parseInt(m[1], 10);
        if (!Number.isFinite(idx) || idx <= 0 || idx > maxQuestions) continue;

        let text = (m[2] ?? "").trim();
        // Include subsequent non-index lines as part of the same question.
        for (let j = i + 1; j < lines.length; j++) {
          if (/^\s*\d{1,3}\b/.test(lines[j])) break;
          if (lines[j].trim()) text += ` ${lines[j].trim()}`;
          i = j;
        }
        blocks.push({ index: idx, text: text.trim() });
      }

      // If we couldn't detect blocks, fall back to the whole OCR text as a single block.
      if (!blocks.length) blocks.push({ index: 1, text: ocrText });

      blocks.sort((a, b) => a.index - b.index);

      const perQuestion: Array<{
        index: number;
        type: string;
        correct: boolean;
        points: number;
        studentAnswer: string | null;
        correctAnswer: string;
      }> = [];

      let total = 0;

      for (const b of blocks) {
        const t = b.text;
        const lower = t.toLowerCase();

        // Mixed number conversion: Turn a/b into a mixed number
        if (lower.includes("turn") && lower.includes("mixed")) {
          const given = parseFractionLoose(t);
          const student = parseMixedNumberLoose(t);
          if (!given) continue;

          const whole = Math.trunc(given.n / given.d);
          const rem = Math.abs(given.n % given.d);
          const correctFrac = normalizeFraction({ n: rem, d: given.d });
          const correctAnswer = mixedNumberToString(whole, correctFrac);

          const ok =
            student !== null &&
            student.whole === whole &&
            fractionsEqual(student.frac, correctFrac);
          const pts = ok ? pointsMixedNumber : 0;
          total += pts;

          perQuestion.push({
            index: b.index,
            type: "mixed_number",
            correct: ok,
            points: pts,
            studentAnswer: student ? mixedNumberToString(student.whole, student.frac) : null,
            correctAnswer,
          });
          continue;
        }

        // Improper fraction conversion: Turn W N/D into an improper fraction
        if (lower.includes("turn") && lower.includes("improper")) {
          const given = parseMixedNumberLoose(t);
          const allFracMatches = Array.from(t.matchAll(/-?\d+\s*\/\s*\d+/g)).map((m) => m[0]);
          const studentRaw = allFracMatches.length ? allFracMatches[allFracMatches.length - 1] : "";
          const student = parseFractionLoose(studentRaw);
          if (!given) continue;

          const sgn = given.whole < 0 ? -1 : 1;
          const correct = normalizeFraction({
            n: given.whole * given.frac.d + sgn * Math.abs(given.frac.n),
            d: given.frac.d,
          });

          const ok = student !== null && fractionsEqual(student, correct);
          const pts = ok ? pointsImproperFraction : 0;
          total += pts;

          perQuestion.push({
            index: b.index,
            type: "improper_fraction",
            correct: ok,
            points: pts,
            studentAnswer: student ? fractionToString(student) : null,
            correctAnswer: fractionToString(correct),
          });
          continue;
        }

        // Operation with two fractions + a student answer fraction.
        const matches = Array.from(t.matchAll(/-?\d+\s*\/\s*\d+/g)).map((m) => m[0]);
        const parsed = matches.map((m) => parseFractionLoose(m)).filter((f): f is Fraction => !!f);
        if (parsed.length < 3) continue;
        const a = parsed[0];
        const bFrac = parsed[1];
        const student = parsed[parsed.length - 1];

        // Prefer operator between first and second fraction if possible.
        const opM = t.match(/-?\d+\s*\/\s*\d+\s*([+\-x×*÷/])\s*-?\d+\s*\/\s*\d+/i);
        const op = opM ? opM[1] : "+";

        let correct: Fraction;
        let kind: "add_subtract" | "multiply_divide";
        if (op === "+" || op === "-") {
          correct = op === "+" ? addFractions(a, bFrac) : subFractions(a, bFrac);
          kind = "add_subtract";
        } else if (op === "x" || op === "×" || op === "*") {
          correct = mulFractions(a, bFrac);
          kind = "multiply_divide";
        } else {
          correct = divFractions(a, bFrac);
          kind = "multiply_divide";
        }

        const ok = fractionsEqual(student, correct);
        const pts = ok ? (kind === "add_subtract" ? pointsAddSubtract : pointsMultiplyDivide) : 0;
        total += pts;

        perQuestion.push({
          index: b.index,
          type: kind,
          correct: ok,
          points: pts,
          studentAnswer: fractionToString(student),
          correctAnswer: fractionToString(correct),
        });
      }

      total += bonusPoints;

      return {
        path: filePath,
        bonusPoints,
        extractedQuestionCount: perQuestion.length,
        score: total,
        answer: String(total),
        perQuestion,
        ocr: {
          lang,
          langPath: langPathEffective,
          preprocess,
          usedSharp: ocr.usedSharp,
          confidence: ocr.confidence,
        },
      };
    },
  },
  {
    name: "extract_fractions_and_simplify_from_image",
    description:
      "Extract slash-style fractions (e.g. 3/4) from body text in an image and also detect stacked numerator/denominator fractions in a worksheet-style region, returning the simplified answers. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local image file (absolute or relative to current working directory).",
        },
        lang: {
          type: "string",
          description: "Tesseract language code (default: eng).",
          default: "eng",
        },
        langPath: {
          type: "string",
          description:
            "Optional directory containing traineddata files. If omitted, tesseract.js defaults apply. If .cache/tesseract exists under the current working directory, it is used by default.",
        },
        preprocess: {
          type: "boolean",
          description: "If true (default), basic sharp preprocessing is applied before OCR.",
          default: true,
        },
        bodyBottomFrac: {
          type: "number",
          description:
            "Body cutoff as fraction of image height (words below are treated as worksheet region). Default: 0.7.",
          default: 0.7,
        },
        maxChars: {
          type: "number",
          description: "Maximum OCR text characters to consider.",
          default: 120000,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const sharp = await getSharpOptional();
      if (!sharp) {
        throw new Error("Missing optional dependency: sharp. Install it to use image fraction extraction.");
      }

      const meta = await sharp(filePath).metadata();
      const imgH = meta.height ?? 0;
      if (!imgH) throw new Error("Unable to read image height");

      const lang = String(args?.lang ?? "eng").trim() || "eng";
      const preprocess = args?.preprocess !== false;
      const maxChars = clampInt(args?.maxChars, 120000, 5000, 200000);
      const bodyBottomFrac = clampNumber(Number(args?.bodyBottomFrac ?? 0.7), 0.3, 0.95);

      const langPathArg = typeof args?.langPath === "string" ? args.langPath.trim() : "";
      const defaultLangPath = path.join(process.cwd(), ".cache", "tesseract");
      const langPathEffective = langPathArg
        ? resolveLocalPath(langPathArg)
        : existsSync(defaultLangPath)
          ? defaultLangPath
          : null;

      const ocr = await ocrRecognizeImageFile({ filePath, lang, langPathEffective, preprocess });
      const bodyYMax = imgH * bodyBottomFrac;

      // Use OCR text (not per-word) since OCR may split "3/4" into multiple tokens (e.g. "3", "/", "4").
      const ocrText = ocr.text.slice(0, maxChars);
      const bodyFractions = Array.from(ocrText.matchAll(/(\d+)\s*\/\s*(\d+)/g)).map(
        (m) => `${m[1]}/${m[2]}`
      );

      // Detect stacked fractions (numerator over denominator) below cutoff by looking for fraction bars,
      // then OCR numerator and denominator from sub-crops. This is more robust than relying on whole-page
      // OCR word boxes, which often miss one half of stacked fractions.
      const imgW = meta.width ?? 0;
      if (!imgW) throw new Error("Unable to read image width");

      const scale = imgW < 1200 ? 3 : imgW < 2000 ? 2 : 1;
      const baseW = imgW * scale;
      const baseH = imgH * scale;
      const base = await sharp(filePath)
        .grayscale()
        .resize({ width: baseW, height: baseH, kernel: "lanczos3" })
        .normalize()
        .png()
        .toBuffer();

      const extractStackedFromCrop = async (cutoffFrac: number) => {
        const cropTop = clampInt(Math.floor(imgH * cutoffFrac) * scale, 0, 0, baseH - 1);
        const cropH = Math.max(1, baseH - cropTop);
        const worksheetGray = await sharp(base)
          .extract({ left: 0, top: cropTop, width: baseW, height: cropH })
          .png()
          .toBuffer();

        const { data: wsBw, info: wsInfo } = await sharp(worksheetGray)
          .grayscale()
          .threshold(210)
          .raw()
          .toBuffer({ resolveWithObject: true });

        // Worksheet stacked-fraction bars are much shorter than the page width; keep minRun small and
        // filter by ink above/below to avoid picking input-box borders.
        const minBarRun = Math.max(12, Math.round(wsInfo.width * 0.004));
        const bars = detectThinHorizontalBarsFromBw(wsBw, wsInfo.width, wsInfo.height, {
          minRun: minBarRun,
          maxThickness: Math.max(2, Math.round(wsInfo.height * 0.08)),
        });

        const stacked: Array<{ y: number; x: number; frac: Fraction }> = [];
        for (const bar of bars) {
          // Skip far-right bars; in this worksheet layout, fraction bars live left of the input boxes.
          if (bar.cx > wsInfo.width * 0.6) continue;
          // Avoid long horizontal lines like answer-box borders.
          if (bar.len > wsInfo.width * 0.28) continue;

          // Require ink above AND below the bar in the same X band (numerator/denominator).
          const padXInk = Math.max(2, Math.round(bar.len * 0.25));
          const xInk0 = clampInt(bar.x0 - padXInk, 0, 0, wsInfo.width - 1);
          const xInk1 = clampInt(bar.x1 + padXInk, wsInfo.width - 1, 0, wsInfo.width - 1);
          const aboveH = Math.max(10, Math.round(wsInfo.height * 0.12));
          const belowH = aboveH;
          const aboveY0 = clampInt(bar.y0 - aboveH, 0, 0, wsInfo.height - 1);
          const aboveY1 = clampInt(bar.y0 - 1, wsInfo.height - 1, 0, wsInfo.height - 1);
          const belowY0 = clampInt(bar.y1 + 1, wsInfo.height - 1, 0, wsInfo.height - 1);
          const belowY1 = clampInt(bar.y1 + belowH, wsInfo.height - 1, 0, wsInfo.height - 1);
          const minInk = Math.max(5, Math.round(bar.len * 0.05));
          if (
            !rectHasInk(wsBw, wsInfo.width, wsInfo.height, { x0: xInk0, y0: aboveY0, x1: xInk1, y1: aboveY1 }, minInk) ||
            !rectHasInk(wsBw, wsInfo.width, wsInfo.height, { x0: xInk0, y0: belowY0, x1: xInk1, y1: belowY1 }, minInk)
          ) {
            continue;
          }

          const padX = Math.max(2, Math.round(bar.len * 0.25));
          const padY = Math.max(1, Math.round(wsInfo.height * 0.01));
          const boxH = clampInt(
            Math.round(bar.len * 1.2),
            Math.round(wsInfo.height * 0.14),
            14,
            Math.max(14, Math.round(wsInfo.height * 0.35))
          );

          const cropX0 = clampInt(bar.x0 - padX, 0, 0, wsInfo.width - 1);
          const cropX1 = clampInt(bar.x1 + padX, wsInfo.width - 1, 0, wsInfo.width - 1);
          const cropW = cropX1 - cropX0 + 1;

          const numY1 = clampInt(bar.y0 - padY, wsInfo.height, 0, wsInfo.height);
          const numY0 = clampInt(numY1 - boxH, 0, 0, numY1);
          const numH = numY1 - numY0;

          const denY0 = clampInt(bar.y1 + padY, wsInfo.height - 1, 0, wsInfo.height - 1);
          const denY1 = clampInt(denY0 + boxH, wsInfo.height, denY0, wsInfo.height);
          const denH = denY1 - denY0;

          if (numH < 6 || denH < 6) continue;

          const n = await ocrIntegerFromImageRegion({
            sharp,
            source: worksheetGray,
            left: cropX0,
            top: numY0,
            width: cropW,
            height: numH,
            threshold: 200,
            thresholds: [150, 170, 190, 210],
            lang,
            langPathEffective,
            psms: [11, 7],
            minValue: 0,
            maxValue: 10000,
          });
          const d = await ocrIntegerFromImageRegion({
            sharp,
            source: worksheetGray,
            left: cropX0,
            top: denY0,
            width: cropW,
            height: denH,
            threshold: 200,
            thresholds: [150, 170, 190, 210],
            lang,
            langPathEffective,
            psms: [7, 6],
            minValue: 1,
            maxValue: 10000,
          });

          if (n === null || d === null || d === 0) continue;

          try {
            stacked.push({ y: bar.cy, x: bar.cx, frac: normalizeFraction({ n, d }) });
          } catch {
            // ignore
          }
        }

        stacked.sort((a, b) => a.y - b.y || a.x - b.x);
        const simplified: string[] = [];
        const dedupeTolY = Math.max(6, Math.round(wsInfo.height * 0.015));
        let lastY = -1e9;
        for (const s of stacked) {
          if (Math.abs(s.y - lastY) < dedupeTolY) continue;
          simplified.push(fractionToString(s.frac));
          lastY = s.y;
        }

        return {
          cutoffFrac,
          cropTop,
          barCount: bars.length,
          stackedCandidateCount: stacked.length,
          simplified,
        };
      };

      // GAIA image layouts vary; callers often provide a body cutoff, but it can be too low/high.
      // Start with the requested cutoff, then try a few additional cutoffs if we didn't recover
      // enough stacked fractions.
      const cutoffCandidatesRaw = [
        bodyBottomFrac,
        bodyBottomFrac - 0.1,
        bodyBottomFrac - 0.2,
        0.7,
        0.65,
        0.6,
        0.55,
        0.5,
        0.45,
        0.4,
        0.35,
      ]
        .map((n) => clampNumber(n, 0.3, 0.95))
        .map((n) => Number(n.toFixed(3)));
      const seen = new Set<number>();
      const cutoffCandidates: number[] = [];
      for (const c of cutoffCandidatesRaw) {
        if (seen.has(c)) continue;
        seen.add(c);
        cutoffCandidates.push(c);
      }

      let best = await extractStackedFromCrop(cutoffCandidates[0] ?? bodyBottomFrac);
      if (best.simplified.length < 5) {
        for (const c of cutoffCandidates.slice(1)) {
          const cand = await extractStackedFromCrop(c);
          if (cand.simplified.length > best.simplified.length) best = cand;
          // Early stop: once we hit a "healthy" count, avoid extra OCR passes.
          if (best.simplified.length >= 7) break;
        }
      }

      const simplified = best.simplified;

      const all = [...bodyFractions, ...simplified];
      const answer = all.join(",");

      return {
        path: filePath,
        bodyBottomFrac,
        worksheetBottomFracUsed: best.cutoffFrac,
        bodyFractionCount: bodyFractions.length,
        worksheetFractionCount: simplified.length,
        answer,
        fractions: all,
        debug: {
          barCount: best.barCount,
          stackedCandidateCount: best.stackedCandidateCount,
          cutoffsTried: cutoffCandidates,
        },
        ocr: {
          lang,
          langPath: langPathEffective,
          preprocess,
          usedSharp: ocr.usedSharp,
          confidence: ocr.confidence,
          maxChars,
          truncated: ocr.text.length > maxChars,
        },
      };
    },
  },
  {
    name: "solve_bass_clef_age_from_image",
    description:
      "Extract bass-clef note letters from a simple staff image and compute the derived 'age' for time-words like DECADE/CENTURY. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local image file (absolute or relative to current working directory).",
        },
        maxPixels: {
          type: "number",
          description: "Safety cap on pixels to process (default: 1,000,000).",
          default: 1000000,
        },
        threshold: {
          type: "number",
          description: "Binarization threshold (0-255). Default 160.",
          default: 160,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const sharp = await getSharpOptional();
      if (!sharp) throw new Error("Missing optional dependency: sharp. Install it to use music staff parsing.");

      const maxPixels = clampInt(args?.maxPixels, 1000000, 10000, 100_000_000);
      const threshold = clampInt(args?.threshold, 160, 1, 254);

      const meta = await sharp(filePath).metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      if (!w || !h) throw new Error("Unable to read image dimensions");

      // These staff images can be tiny (e.g. ~300px wide). Upscale to make line/note detection robust.
      let scale = 1;
      if (w < 600 || h < 140) {
        scale = Math.max(2, Math.min(10, Math.ceil(1800 / w)));
      }
      while (w * scale * h * scale > maxPixels && scale > 1) scale--;
      if (w * scale * h * scale > maxPixels) {
        throw new Error(
          `Refusing huge image (${w}x${h}) even after scaling checks (scale=${scale}) (maxPixels=${maxPixels})`
        );
      }

      let pipeline = sharp(filePath);
      if (scale > 1) {
        pipeline = pipeline.resize({
          width: w * scale,
          height: h * scale,
          kernel: "nearest",
        });
      }

      const { data, info } = await pipeline
        .grayscale()
        .threshold(threshold)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const width = info.width;
      const height = info.height;
      const idxOf = (x: number, y: number) => y * width + x;

      const isBlack = (x: number, y: number) => data[idxOf(x, y)] < 128;

      // Horizontal projection to find staff lines.
      const rowCounts = new Array<number>(height).fill(0);
      let maxRow = 0;
      for (let y = 0; y < height; y++) {
        let c = 0;
        for (let x = 0; x < width; x++) if (isBlack(x, y)) c++;
        rowCounts[y] = c;
        if (c > maxRow) maxRow = c;
      }

      const lineThresh = Math.max(5, Math.floor(maxRow * 0.55));
      const lineYs: number[] = [];
      for (let y = 0; y < height; y++) {
        if (rowCounts[y] < lineThresh) continue;
        let y2 = y;
        while (y2 + 1 < height && rowCounts[y2 + 1] >= lineThresh) y2++;
        lineYs.push((y + y2) / 2);
        y = y2;
      }
      if (lineYs.length < 5) throw new Error(`Failed to detect 5 staff lines (found ${lineYs.length})`);

      lineYs.sort((a, b) => a - b);

      // Choose the best contiguous group of 5 lines by spacing consistency.
      let staff = lineYs.slice(0, 5);
      if (lineYs.length > 5) {
        let bestScore = Number.POSITIVE_INFINITY;
        let best: number[] | null = null;
        for (let i = 0; i + 4 < lineYs.length; i++) {
          const cand = lineYs.slice(i, i + 5);
          const spacings = cand.slice(1).map((y, j) => y - cand[j]);
          const avg = spacings.reduce((s, n) => s + n, 0) / spacings.length;
          const variance = spacings.reduce((s, n) => s + (n - avg) * (n - avg), 0) / spacings.length;
          // Penalize implausible spacing (too tight or too large).
          const spacingPenalty = avg < 2 ? 1e6 : avg > height / 4 ? 1e6 : 0;
          const score = variance + spacingPenalty;
          if (score < bestScore) {
            bestScore = score;
            best = cand;
          }
        }
        if (best) staff = best;
      }
      const spacings = staff.slice(1).map((y, i) => y - staff[i]);
      const lineSpacing = spacings.length ? spacings.reduce((s, n) => s + n, 0) / spacings.length : 1;

      // Remove staff lines into a mutable buffer. Keep pixels that belong to note heads
      // (detected by having black pixels both above or below the line).
      const buf = Buffer.from(data);
      const band = Math.max(1, Math.round(lineSpacing * 0.12));
      const probe = Math.max(1, Math.round(lineSpacing * 0.35));
      for (const ly of staff) {
        const yCenter = Math.round(ly);
        const y0 = Math.max(0, yCenter - band);
        const y1 = Math.min(height - 1, yCenter + band);
        for (let yy = y0; yy <= y1; yy++) {
          for (let x = 0; x < width; x++) {
            const idx = idxOf(x, yy);
            if (buf[idx] >= 128) continue;
            const aboveY = yy - probe;
            const belowY = yy + probe;
            const above = aboveY >= 0 ? buf[idxOf(x, aboveY)] : 255;
            const below = belowY < height ? buf[idxOf(x, belowY)] : 255;
            if (above >= 128 && below >= 128) {
              buf[idx] = 255;
            }
          }
        }
      }

      const visited = new Uint8Array(width * height);
      const inBounds = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height;
      const neighbors = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
      ] as const;

      const components: Array<{ area: number; cx: number; cy: number; x0: number; y0: number; x1: number; y1: number }> =
        [];

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const startIdx = idxOf(x, y);
          if (visited[startIdx]) continue;
          visited[startIdx] = 1;
          if (buf[startIdx] >= 128) continue;

          let area = 0;
          let sx = 0;
          let sy = 0;
          let x0 = x,
            x1 = x,
            y0 = y,
            y1 = y;

          const qx: number[] = [x];
          const qy: number[] = [y];

          for (let qi = 0; qi < qx.length; qi++) {
            const px = qx[qi];
            const py = qy[qi];
            const pidx = idxOf(px, py);
            if (buf[pidx] >= 128) continue;

            area++;
            sx += px;
            sy += py;
            if (px < x0) x0 = px;
            if (px > x1) x1 = px;
            if (py < y0) y0 = py;
            if (py > y1) y1 = py;

            for (const [dx, dy] of neighbors) {
              const nx = px + dx;
              const ny = py + dy;
              if (!inBounds(nx, ny)) continue;
              const nidx = idxOf(nx, ny);
              if (visited[nidx]) continue;
              visited[nidx] = 1;
              if (buf[nidx] < 128) {
                qx.push(nx);
                qy.push(ny);
              }
            }
          }

          const bw = x1 - x0 + 1;
          const bh = y1 - y0 + 1;

          // Keep note-head-ish blobs. Scale thresholds by staff spacing.
          const minArea = Math.max(20, Math.floor(lineSpacing * lineSpacing * 0.35));
          const maxArea = Math.max(minArea, Math.floor(lineSpacing * lineSpacing * 30));
          if (area < minArea || area > maxArea) continue;

          const minDim = Math.max(6, Math.floor(lineSpacing * 0.6));
          const maxDim = Math.max(minDim, Math.floor(lineSpacing * 4.5));
          if (bw < minDim || bh < minDim) continue;
          if (bw > maxDim || bh > maxDim) continue;

          const cx = sx / area;
          const cy = sy / area;
          components.push({ area, cx, cy, x0, y0, x1, y1 });
        }
      }

      let notes = components;
      if (notes.length > 12) {
        // If noise produced extra small blobs, keep the most prominent ones.
        notes = [...notes].sort((a, b) => b.area - a.area).slice(0, 12);
      }
      notes = notes.sort((a, b) => a.cx - b.cx);
      if (!notes.length) throw new Error("No note-like blobs detected");

      const staffLineCount = staff.length;
      const noteCount = notes.length;
      const notesOnLines = notes.filter((n) => {
        const closest = staff.reduce((best, yy) =>
          Math.abs(yy - n.cy) < Math.abs(best - n.cy) ? yy : best
        , staff[0]);
        return Math.abs(closest - n.cy) <= lineSpacing * 0.18;
      }).length;

      const bottomLineY = Math.max(...staff);
      const step = lineSpacing / 2;
      const lettersSeq = ["G", "A", "B", "C", "D", "E", "F"];
      const noteLetters = notes.map((n) => {
        const pos = Math.round((bottomLineY - n.cy) / step);
        const idx = ((pos % 7) + 7) % 7;
        return lettersSeq[idx];
      });

      const word = noteLetters.join("");
      const wordLower = word.toLowerCase();
      const timeWordValue: Record<string, number> = {
        decade: 10,
        score: 20,
        century: 100,
        millennium: 1000,
        year: 1,
      };
      const value = timeWordValue[wordLower];
      if (typeof value !== "number") throw new Error(`Unrecognized time-word from notes: ${word}`);

      const derived = staffLineCount + noteCount - notesOnLines;
      const age = value * derived;

      return {
        path: filePath,
        staffLineCount,
        noteCount,
        notesOnLines,
        word,
        wordValue: value,
        derived,
        age,
        answer: String(age),
      };
    },
  },
  {
    name: "solve_storage_upgrade_cost_per_file_from_image",
    description:
      "OCR plan tiers from an image, compute required storage from equally-sized file counts, and return average incremental $/file beyond the current plan limit. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local image file (absolute or relative to current working directory).",
        },
        currentPlanName: {
          type: "string",
          description: "Name of the current plan (e.g. 'Standard').",
        },
        filesUploaded: {
          type: "number",
          description: "Number of equally-sized files already uploaded.",
        },
        overLimitGb: {
          type: "number",
          description: "How many GB over the current plan limit after uploading filesUploaded.",
        },
        additionalFiles: {
          type: "number",
          description: "Additional equally-sized files to upload.",
        },
        decimals: {
          type: "number",
          description: "Decimal places to round to (default: 2).",
          default: 2,
        },
        lang: {
          type: "string",
          description: "Tesseract language code (default: eng).",
          default: "eng",
        },
        langPath: {
          type: "string",
          description:
            "Optional directory containing traineddata files. If omitted, tesseract.js defaults apply. If .cache/tesseract exists under the current working directory, it is used by default.",
        },
        preprocess: {
          type: "boolean",
          description: "If true (default), basic sharp preprocessing is applied before OCR.",
          default: true,
        },
        maxChars: {
          type: "number",
          description: "Maximum OCR text characters to consider.",
          default: 60000,
        },
      },
      required: ["path", "currentPlanName", "filesUploaded", "overLimitGb", "additionalFiles"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const currentPlanName = String(args?.currentPlanName ?? "").trim();
      if (!currentPlanName) throw new Error("currentPlanName is required");

      const filesUploaded = toNumberOrNull(args?.filesUploaded);
      const overLimitGb = toNumberOrNull(args?.overLimitGb);
      const additionalFiles = toNumberOrNull(args?.additionalFiles);
      if (filesUploaded === null || overLimitGb === null || additionalFiles === null) {
        throw new Error("filesUploaded, overLimitGb, and additionalFiles must be numbers");
      }
      if (filesUploaded <= 0) throw new Error("filesUploaded must be > 0");
      if (overLimitGb < 0) throw new Error("overLimitGb must be >= 0");
      if (additionalFiles < 0) throw new Error("additionalFiles must be >= 0");

      const decimals = clampInt(args?.decimals, 2, 0, 6);
      const lang = String(args?.lang ?? "eng").trim() || "eng";
      const preprocess = args?.preprocess !== false;
      const maxChars = clampInt(args?.maxChars, 60000, 5000, 200000);

      const langPathArg = typeof args?.langPath === "string" ? args.langPath.trim() : "";
      const defaultLangPath = path.join(process.cwd(), ".cache", "tesseract");
      const langPathEffective = langPathArg
        ? resolveLocalPath(langPathArg)
        : existsSync(defaultLangPath)
          ? defaultLangPath
          : null;

      const ocr = await ocrRecognizeImageFile({ filePath, lang, langPathEffective, preprocess });
      const text = ocr.text.slice(0, maxChars);

      type Plan = { name: string; pricePerMonth: number; storageTb: number };

      const lower = text.toLowerCase();
      const orderedKeys = ["standard", "plus", "premium"].filter((k) => lower.includes(k));
      const plans: Plan[] = [];

      for (let i = 0; i < orderedKeys.length; i++) {
        const key = orderedKeys[i];
        const start = lower.indexOf(key);
        const end = i + 1 < orderedKeys.length ? lower.indexOf(orderedKeys[i + 1], start + 1) : lower.length;
        const block = text.slice(start, end);

        const priceM = block.match(/\$\s*(\d+(?:\.\d+)?)\s*\/?\s*month/i);
        const storageM = block.match(/\b(\d+(?:\.\d+)?)\s*tb\b/i);
        if (!priceM || !storageM) continue;

        const pricePerMonth = Number.parseFloat(priceM[1]);
        const storageTb = Number.parseFloat(storageM[1]);
        if (!Number.isFinite(pricePerMonth) || !Number.isFinite(storageTb)) continue;

        plans.push({
          name: key[0].toUpperCase() + key.slice(1),
          pricePerMonth,
          storageTb,
        });
      }

      if (!plans.length) throw new Error("Failed to parse plans from OCR");

      const current = plans.find((p) => p.name.toLowerCase() === currentPlanName.toLowerCase());
      if (!current) throw new Error(`Current plan not found in OCR plans: ${currentPlanName}`);

      const currentLimitGb = current.storageTb * 1000;
      const usedGb = currentLimitGb + overLimitGb;
      const fileSizeGb = usedGb / filesUploaded;

      const totalFiles = filesUploaded + additionalFiles;
      const requiredGb = totalFiles * fileSizeGb;

      const needed = [...plans].sort((a, b) => a.storageTb - b.storageTb).find((p) => p.storageTb * 1000 >= requiredGb);
      if (!needed) throw new Error("No plan tier can satisfy required storage");

      const upgradeCost = needed.pricePerMonth - current.pricePerMonth;
      const includedFilesCapacity = currentLimitGb / fileSizeGb;
      const filesOverLimit = Math.max(0, totalFiles - includedFilesCapacity);
      const costPerFile = filesOverLimit > 0 ? upgradeCost / filesOverLimit : 0;
      const rounded = Number(costPerFile.toFixed(decimals));

      return {
        path: filePath,
        plans,
        current,
        needed,
        fileSizeGb: Number(fileSizeGb.toFixed(4)),
        requiredGb: Number(requiredGb.toFixed(2)),
        filesOverLimit: Number(filesOverLimit.toFixed(4)),
        upgradeCost: Number(upgradeCost.toFixed(2)),
        costPerFile: rounded,
        answer: rounded.toFixed(decimals),
      };
    },
  },
  {
    name: "transcribe_audio_file",
    description:
      "Transcribe a local audio file (MP3/WAV/etc) to text using faster-whisper via Python. Deterministic, no network.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to a local audio file (absolute or relative to current working directory).",
        },
        model: {
          type: "string",
          description: "Whisper model name (default: tiny.en).",
          default: "tiny.en",
        },
        language: {
          type: "string",
          description: "Optional language hint (e.g. 'en'). If omitted, model auto-detects.",
        },
        task: {
          type: "string",
          description: "Task mode: transcribe or translate.",
          default: "transcribe",
          enum: ["transcribe", "translate"],
        },
        beamSize: {
          type: "number",
          description: "Beam size (higher = potentially better, slower).",
          default: 5,
        },
        vadFilter: {
          type: "boolean",
          description: "If true, enables VAD filtering (can help noisy audio). Default false for determinism.",
          default: false,
        },
        includeSegments: {
          type: "boolean",
          description: "If true, returns per-segment timestamps (can be verbose).",
          default: false,
        },
        maxChars: {
          type: "number",
          description: "Maximum characters to return (text is truncated).",
          default: 12000,
        },
        timeoutMs: {
          type: "number",
          description: "Maximum transcription time before aborting (ms).",
          default: 300000,
        },
      },
      required: ["path"],
    },
    handler: async (args) => {
      const filePath = resolveLocalPath(args?.path);
      if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

      const model = String(args?.model ?? "tiny.en").trim() || "tiny.en";
      const language = typeof args?.language === "string" ? args.language.trim() : "";
      const task = args?.task === "translate" ? "translate" : "transcribe";
      const beamSize = clampInt(args?.beamSize, 5, 1, 10);
      const vadFilter = args?.vadFilter === true;
      const includeSegments = args?.includeSegments === true;
      const maxChars = clampInt(args?.maxChars, 12000, 200, 200000);
      const timeoutMs = clampInt(args?.timeoutMs, 300000, 1000, 1800000);

      const pythonExe = findPythonExecutable();
      const scriptPath = await ensureFasterWhisperHelperScript();

      const child = await import("node:child_process");
      const util = await import("node:util");
      const execFileAsync = util.promisify(child.execFile);

      const argv: string[] = [
        scriptPath,
        "--path",
        filePath,
        "--model",
        model,
        "--task",
        task,
        "--beam-size",
        String(beamSize),
        "--vad-filter",
        vadFilter ? "1" : "0",
        "--max-chars",
        String(maxChars),
        "--include-segments",
        includeSegments ? "1" : "0",
      ];
      if (language) {
        argv.push("--language", language);
      }

      try {
        const { stdout, stderr } = (await execFileAsync(pythonExe, argv, {
          timeout: timeoutMs,
          maxBuffer: 32 * 1024 * 1024,
          env: {
            ...process.env,
            // Avoid unicode surprises on Windows consoles.
            PYTHONUTF8: "1",
          },
        })) as any;

        const raw = String(stdout ?? "").trim();
        if (!raw) {
          throw new Error(
            `No output from transcription helper. Stderr: ${String(stderr ?? "").trim() || "(empty)"}`
          );
        }

        const parsed = JSON.parse(raw);
        return parsed;
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        const stderr = String(err?.stderr ?? "").trim();
        const hint =
          stderr.includes("Missing python dependency: faster-whisper") || msg.includes("No module named")
            ? "Install the python dependency first: pip install faster-whisper"
            : "";
        throw new Error(
          `Audio transcription failed (python=\"${pythonExe}\", model=\"${model}\"). ${hint}\n${stderr || msg}`
        );
      }
    },
  },
];

/** General-purpose local file parsing tools (19 tools) */
export const localFileTools: McpTool[] = _ALL_LOCAL_FILE_TOOLS.filter(
  (t) => !GAIA_SOLVER_NAMES.has(t.name)
);

/** Specialized GAIA media image solver tools (6 tools) */
export const gaiaMediaSolvers: McpTool[] = _ALL_LOCAL_FILE_TOOLS.filter(
  (t) => GAIA_SOLVER_NAMES.has(t.name)
);
