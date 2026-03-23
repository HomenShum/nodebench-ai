/**
 * Specialized GAIA media image solver tools (6 tools).
 * These are deterministic image analysis tools for specific GAIA benchmark tasks.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { McpTool } from "../types.js";
import {
  resolveLocalPath,
  clampInt,
  toText,
  toNumberOrNull,
  toIntegerOrNull,
  pstdev,
  stdev,
} from "./localFileHelpers.js";
import {
  type Fraction,
  type OcrBBox,
  extractChunkedIntsFromText,
  normalizeFraction,
  parseFractionLoose,
  parseMixedNumberLoose,
  fractionsEqual,
  addFractions,
  subFractions,
  mulFractions,
  divFractions,
  fractionToString,
  mixedNumberToString,
  clampNumber,
  getSharpOptional,
  ocrRecognizeBuffer,
  ocrRecognizeImageFile,
  ocrRecognizeImageFileWithColorMask,
  rectHasInk,
  detectThinHorizontalBarsFromBw,
  ocrIntegerFromImageRegion,
  gradeFractionQuizFromImageRowBands,
} from "./localFileOcrHelpers.js";

export const localFileGaiaSolverTools: McpTool[] = [
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
];
