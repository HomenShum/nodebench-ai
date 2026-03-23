/**
 * Text file reading tools.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { McpTool } from "../types.js";
import { resolveLocalPath, clampInt } from "./localFileHelpers.js";

export const localFileTextTools: McpTool[] = [
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
];
