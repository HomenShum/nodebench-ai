/**
 * Image OCR and audio transcription tools.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { McpTool } from "../types.js";
import { resolveLocalPath, clampInt } from "./localFileHelpers.js";
import {
  getSharpOptional,
  getTesseract,
  findPythonExecutable,
  ensureFasterWhisperHelperScript,
} from "./localFileOcrHelpers.js";

export const localFileMediaTools: McpTool[] = [
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
