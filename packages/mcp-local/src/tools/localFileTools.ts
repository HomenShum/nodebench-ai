/**
 * Local file parsing tools (deterministic).
 *
 * These tools intentionally avoid network access and operate only on local files.
 * Primary use cases:
 * - GAIA file-backed tasks (PDF / XLSX / CSV attachments)
 * - Internal agent workflows that need structured parsing without "LLM OCR"
 *
 * This barrel module re-exports tools from submodules for backward compatibility.
 * Submodules:
 * - localFileCsvTools.ts — CSV and XLSX parsing, selection, aggregation (6 tools)
 * - localFilePdfTools.ts — PDF text extraction and search (2 tools)
 * - localFileTextTools.ts — Plain text file reading (1 tool)
 * - localFileJsonTools.ts — JSON, JSONL parsing and selection (3 tools)
 * - localFileArchiveTools.ts — ZIP, DOCX, PPTX archive parsing (5 tools)
 * - localFileMediaTools.ts — Image OCR and audio transcription (2 tools)
 * - localFileGaiaSolverTools.ts — Specialized GAIA image solver tools (6 tools)
 * - localFileHelpers.ts — Shared helper utilities (path resolution, table loading, etc.)
 * - localFileOcrHelpers.ts — OCR infrastructure, image analysis, fraction math
 */

import type { McpTool } from "../types.js";
import { localFileCsvTools } from "./localFileCsvTools.js";
import { localFilePdfTools } from "./localFilePdfTools.js";
import { localFileTextTools } from "./localFileTextTools.js";
import { localFileJsonTools } from "./localFileJsonTools.js";
import { localFileArchiveTools } from "./localFileArchiveTools.js";
import { localFileMediaTools } from "./localFileMediaTools.js";
import { localFileGaiaSolverTools } from "./localFileGaiaSolverTools.js";

/** General-purpose local file parsing tools (19 tools) */
export const localFileTools: McpTool[] = [
  ...localFileCsvTools,
  ...localFilePdfTools,
  ...localFileTextTools,
  ...localFileJsonTools,
  ...localFileArchiveTools,
  ...localFileMediaTools,
];

/** Specialized GAIA media image solver tools (6 tools) */
export const gaiaMediaSolvers: McpTool[] = localFileGaiaSolverTools;
