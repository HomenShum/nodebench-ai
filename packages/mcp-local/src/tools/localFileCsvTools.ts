/**
 * CSV and XLSX file parsing tools.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { McpTool } from "../types.js";
import {
  resolveLocalPath,
  clampInt,
  truncateCell,
  toText,
  toNumberOrNull,
  toIntegerOrNull,
  mean,
  pstdev,
  stdev,
  resolveColumnIndex,
  WHERE_OPS,
  compileWhere,
  rowMatchesWhere,
  getPapaParse,
  loadCsvTable,
  loadXlsxTable,
} from "./localFileHelpers.js";

export const localFileCsvTools: McpTool[] = [
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

      const maxRows = clampInt(args?.maxRows, 200, 1, 5000);
      const maxCols = clampInt(args?.maxCols, 50, 1, 500);
      const maxCellChars = clampInt(args?.maxCellChars, 2000, 20, 20000);
      const table = await loadXlsxTable(args, {
        filePath,
        maxScanRows: maxRows,
        maxCols,
        maxCellChars,
      });

      const outHeaders = table.headers.slice(0, maxCols);
      const outRows = table.dataRows.map((r: unknown[]) => r.slice(0, maxCols));
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
        sheets: table.sheets,
        sheetName: table.sheetName,
        headerRow: table.headerRow,
        rangeA1: table.rangeA1,
        rowCount: table.totalDataRows,
        returnedRows: table.dataRows.length,
        colCount: table.headers.length,
        truncated: table.truncated,
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
];
