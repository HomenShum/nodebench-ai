/**
 * JSON and JSONL file parsing tools.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { McpTool } from "../types.js";
import { resolveLocalPath, clampInt } from "./localFileHelpers.js";

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


export const localFileJsonTools: McpTool[] = [
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
];
