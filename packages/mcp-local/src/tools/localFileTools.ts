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

export const localFileTools: McpTool[] = [
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
        headers: headers.slice(0, maxCols),
        rows: limitedRows.map((r) => r.slice(0, maxCols)),
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
        headers: headers.slice(0, maxCols),
        rows: limitedRows.map((r) => r.slice(0, maxCols)),
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
];
