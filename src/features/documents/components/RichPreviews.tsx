/**
 * RichPreviews - High-fidelity "Miniature Twin" previews for document cards
 *
 * Instead of abstract file representations, these components render
 * miniature versions of actual content types:
 * - Spreadsheets: Real CSV/Excel data when available, or abstract grid fallback
 * - HTML/Code: Mini-IDE with syntax coloring (dark VS Code theme)
 * - Markdown/Docs: Typography layout with headings and paragraphs
 * - Quick Notes: Sticky note / paper pad look with yellow tint
 * - Empty state: Warning overlay with cleanup suggestion
 */

import { useMemo, useState, useEffect } from "react";
import { AlertTriangle, ImageOff, FileQuestion } from "lucide-react";
import * as XLSX from "xlsx";

// ============================================================================
// CSV Parser Utility - Parses CSV text into rows/columns
// ============================================================================
function parseCsvContent(text: string): string[][] | null {
  if (!text || text.trim().length === 0) return null;

  // Parse first 6 lines, split by comma, clean quotes
  const rows = text
    .split('\n')
    .slice(0, 6)
    .map(row =>
      row.split(',').map(cell =>
        cell.replace(/^"|"$/g, '').trim().substring(0, 20) // Truncate cells
      )
    )
    .filter(row => row.length > 0 && row.some(c => c.length > 0));

  return rows.length > 0 ? rows : null;
}

// ============================================================================
// Excel Parser Utility - Parses Excel ArrayBuffer into rows/columns
// ============================================================================
function parseExcelContent(buffer: ArrayBuffer): string[][] | null {
  try {
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return null;

    const worksheet = workbook.Sheets[firstSheetName];
    // Convert to 2D array, limit to first 6 rows
    const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, {
      header: 1,
      defval: "",
    });

    // Take first 6 rows, truncate cell content
    const rows = jsonData.slice(0, 6).map((row) =>
      (row as unknown[]).map((cell) =>
        String(cell ?? "").substring(0, 20)
      )
    );

    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

// ============================================================================
// Spreadsheet URL Fetcher Hook - Fetches CSV or Excel from URL
// ============================================================================
function useSpreadsheetFromUrl(
  url: string | null | undefined,
  fileType?: string
): string[][] | null {
  const [data, setData] = useState<string[][] | null>(null);

  useEffect(() => {
    if (!url) {
      setData(null);
      return;
    }

    let cancelled = false;

    const fetchSpreadsheet = async () => {
      try {
        const isExcel = fileType === "excel" || url.endsWith(".xlsx") || url.endsWith(".xls");

        if (isExcel) {
          // Fetch full file for Excel (binary format)
          const response = await fetch(url);
          if (!response.ok) return;
          const buffer = await response.arrayBuffer();
          if (!cancelled) {
            setData(parseExcelContent(buffer));
          }
        } else {
          // CSV: Fetch with Range header to get only first 2KB
          const response = await fetch(url, {
            headers: { Range: "bytes=0-2047" },
          });

          if (!response.ok && response.status !== 206) {
            // If Range not supported, try full fetch
            const fullResponse = await fetch(url);
            if (!fullResponse.ok) return;
            const text = await fullResponse.text();
            if (!cancelled) {
              setData(parseCsvContent(text.substring(0, 2048)));
            }
            return;
          }

          const text = await response.text();
          if (!cancelled) {
            setData(parseCsvContent(text));
          }
        }
      } catch {
        // Silently fail - will show abstract fallback
      }
    };

    fetchSpreadsheet();

    return () => {
      cancelled = true;
    };
  }, [url, fileType]);

  return data;
}

// ============================================================================
// Spreadsheet Preview - Shows REAL data when available, or abstract fallback
// ============================================================================
export function SpreadsheetPreview({
  url,
  content,
  fileType,
  structuredPreview,
}: {
  /** URL to fetch CSV/Excel content from (Convex storage URL) */
  url?: string | null;
  /** Raw CSV/text content to parse and display */
  content?: string | null;
  /** File type hint for parsing (csv, excel) */
  fileType?: string;
  /** Pre-parsed structured preview data (LLM-cleaned) */
  structuredPreview?: string[][] | null;
}) {
  // Fetch from URL if available (handles both CSV and Excel)
  const urlData = useSpreadsheetFromUrl(url, fileType);

  // Parse content if available
  const parsedData = useMemo(() => {
    if (content) {
      return parseCsvContent(content);
    }
    return null;
  }, [content]);

  // Priority: structuredPreview (LLM-cleaned) > urlData (fetched) > parsedData (from content) > fallback
  const displayData = structuredPreview || urlData || parsedData;

  // REAL DATA RENDERER - Shows actual CSV content
  if (displayData && displayData.length > 0) {
    const headers = displayData[0];
    const rows = displayData.slice(1, 6);

    return (
      <div className="w-full h-full bg-[var(--bg-primary)] flex flex-col overflow-hidden text-[6px] font-mono leading-none select-none relative">
        {/* Header Row */}
        <div className="flex bg-gradient-to-b from-[var(--bg-hover)] to-[var(--bg-secondary)] border-b border-[var(--border-color)] sticky top-0">
          <div className="w-4 shrink-0 border-r border-[var(--border-color)] bg-[var(--bg-hover)]" />
          {headers.slice(0, 4).map((header, i) => (
            <div
              key={i}
              className="flex-1 border-r border-[var(--border-color)] px-0.5 py-0.5 font-bold text-[var(--text-secondary)] truncate uppercase tracking-tighter text-center"
            >
              {header || `Col${i+1}`}
            </div>
          ))}
        </div>

        {/* Data Rows */}
        <div className="flex-1 overflow-hidden">
          {rows.map((row, rIndex) => (
            <div
              key={rIndex}
              className="flex border-b border-[var(--border-color)] hover:bg-blue-50/30"
            >
              <div className="w-4 shrink-0 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)] flex items-center justify-center font-semibold text-[5px]">
                {rIndex + 1}
              </div>
              {row.slice(0, 4).map((cell, cIndex) => (
                <div
                  key={cIndex}
                  className="flex-1 border-r border-[var(--border-color)] px-0.5 py-0.5 text-[var(--text-primary)] truncate"
                >
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Fade hint for more content */}
        <div className="absolute bottom-0 inset-x-0 h-3 bg-gradient-to-t from-[var(--bg-primary)] to-transparent pointer-events-none" />
      </div>
    );
  }

  // ABSTRACT FALLBACK - When no real data available
  return (
    <div className="w-full h-full bg-[var(--bg-primary)] p-1.5 flex flex-col gap-0 border-t border-l border-[var(--border-color)] overflow-hidden">
      {/* Header Row */}
      <div className="flex w-full shrink-0">
        <div className="w-5 h-3.5 bg-[var(--bg-secondary)] border-r border-b border-[var(--border-color)] flex items-center justify-center">
          <span className="text-[5px] text-[var(--text-muted)]">#</span>
        </div>
        {["A", "B", "C", "D"].map((col) => (
          <div
            key={col}
            className="flex-1 h-3.5 bg-[var(--bg-secondary)] border-r border-b border-[var(--border-color)] flex items-center justify-center"
          >
            <span className="text-[6px] font-medium text-[var(--text-muted)]">{col}</span>
          </div>
        ))}
      </div>
      {/* Data Rows */}
      {[1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="flex w-full shrink-0">
          <div className="w-5 h-3.5 bg-[var(--bg-secondary)] border-r border-b border-[var(--border-color)] flex items-center justify-center">
            <span className="text-[5px] text-[var(--text-muted)]">{row}</span>
          </div>
          <div className="flex-1 h-3.5 border-r border-b border-[var(--border-color)] p-0.5 flex items-center">
            <div className={`h-1.5 bg-indigo-100 rounded-[1px] ${row === 1 ? "w-4/5" : row % 2 === 0 ? "w-1/2" : "w-2/3"}`} />
          </div>
          <div className="flex-1 h-3.5 border-r border-b border-[var(--border-color)] p-0.5 flex items-center">
            <div className={`h-1.5 bg-blue-50 rounded-[1px] ${row === 1 ? "w-3/5" : "w-1/3"}`} />
          </div>
          <div className="flex-1 h-3.5 border-r border-b border-[var(--border-color)] p-0.5 flex items-center">
            <div className={`h-1.5 bg-[var(--bg-hover)] rounded-[1px] ${row % 2 === 0 ? "w-full" : "w-4/5"}`} />
          </div>
          <div className="flex-1 h-3.5 border-b border-[var(--border-color)] p-0.5 flex items-center">
            <div className={`h-1.5 bg-amber-50 rounded-[1px] ${row === 3 ? "w-full" : "w-2/5"}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// HTML/Code Preview - Looks like a VS Code mini editor
// ============================================================================
export function CodePreview() {
  return (
    <div className="w-full h-full bg-[#1e1e1e] p-2 flex flex-col gap-1 font-mono overflow-hidden">
      {/* macOS Window Controls */}
      <div className="flex gap-1 mb-1 opacity-60">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
      </div>
      {/* Simulated Code Lines */}
      <div className="flex gap-1.5 items-center">
        <span className="text-purple-400 text-[6px]">&lt;html&gt;</span>
      </div>
      <div className="flex gap-1.5 pl-2 items-center">
        <div className="w-8 h-1 bg-blue-400/50 rounded-[1px]" />
        <div className="w-5 h-1 bg-orange-300/50 rounded-[1px]" />
      </div>
      <div className="flex gap-1.5 pl-3 items-center">
        <div className="w-12 h-1 bg-green-400/40 rounded-[1px]" />
      </div>
      <div className="flex gap-1.5 pl-3 items-center">
        <div className="w-6 h-1 bg-yellow-300/40 rounded-[1px]" />
        <div className="w-10 h-1 bg-cyan-400/40 rounded-[1px]" />
      </div>
      <div className="flex gap-1.5 pl-2 items-center">
        <div className="w-14 h-1 bg-pink-400/40 rounded-[1px]" />
      </div>
      <div className="flex gap-1.5 items-center">
        <span className="text-purple-400 text-[6px]">&lt;/html&gt;</span>
      </div>
    </div>
  );
}

// ============================================================================
// Markdown/Document Preview - Looks like a page with typography
// ============================================================================
export function MarkdownPreview({ hasContent = false }: { hasContent?: boolean }) {
  return (
    <div className="w-full h-full bg-[var(--bg-primary)] p-2.5 flex flex-col gap-1.5 overflow-hidden">
      {/* H1 Title */}
      <div className="w-3/4 h-2 bg-[var(--text-primary)] rounded-[1px]" />
      {/* Paragraph lines */}
      <div className="mt-1 w-full h-1 bg-[var(--border-color)] rounded-[1px]" />
      <div className="w-5/6 h-1 bg-[var(--border-color)] rounded-[1px]" />
      <div className="w-full h-1 bg-[var(--border-color)] rounded-[1px]" />
      <div className="w-1/2 h-1 bg-[var(--border-color)] rounded-[1px]" />
      {/* Second paragraph */}
      <div className="mt-1 w-full h-1 bg-[var(--bg-hover)] rounded-[1px]" />
      <div className="w-4/5 h-1 bg-[var(--bg-hover)] rounded-[1px]" />
    </div>
  );
}

// ============================================================================
// Note Preview - "Sticky Note" / Paper Pad look for Quick Notes
// ============================================================================
export function NotePreview() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-amber-50 via-yellow-50/80 to-orange-50/30 p-2 overflow-hidden relative">
      {/* Subtle "tape" at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-amber-200/60 rounded-b-sm" />

      {/* Red margin line (like legal pad) */}
      <div className="absolute top-0 bottom-0 left-4 w-[1px] bg-red-200/40" />

      {/* Content with lines */}
      <div className="ml-5 mt-2 flex flex-col gap-1.5">
        <div className="w-4/5 h-1.5 bg-[var(--text-secondary)]/20 rounded-[1px]" />
        <div className="w-full h-1 bg-[var(--text-secondary)]/10 rounded-[1px]" />
        <div className="w-3/4 h-1 bg-[var(--text-secondary)]/10 rounded-[1px]" />
        <div className="w-5/6 h-1 bg-[var(--text-secondary)]/10 rounded-[1px]" />
        <div className="w-1/2 h-1 bg-[var(--text-secondary)]/10 rounded-[1px]" />
      </div>

      {/* Ruled lines across the paper */}
      <div className="absolute inset-x-0 top-8 bottom-0 flex flex-col gap-2.5 px-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-full h-[0.5px] bg-blue-200/30" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Empty State Overlay - Shows warning for empty/broken files
// ============================================================================
export function EmptyStateOverlay({ variant = "empty" }: { variant?: "empty" | "broken" | "unknown" }) {
  const config = {
    empty: {
      icon: AlertTriangle,
      label: "Empty File",
      color: "text-amber-500",
      bg: "bg-amber-50/90",
    },
    broken: {
      icon: ImageOff,
      label: "Broken",
      color: "text-red-400",
      bg: "bg-red-50/90",
    },
    unknown: {
      icon: FileQuestion,
      label: "Unknown",
      color: "text-[var(--text-muted)]",
      bg: "bg-[var(--bg-secondary)]/90",
    },
  };
  const { icon: Icon, label, color, bg } = config[variant];

  return (
    <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center ${bg} backdrop-blur-[1px]`}>
      <Icon className={`w-5 h-5 ${color} mb-1`} />
      <span className="text-[9px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ============================================================================
// Image Fallback - Shows when image fails to load
// ============================================================================
export function ImageFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[var(--bg-hover)] rounded-lg">
      <div className="flex flex-col items-center gap-1">
        <ImageOff className="w-6 h-6 text-[var(--text-muted)]" />
        <span className="text-[8px] text-[var(--text-muted)]">Image unavailable</span>
      </div>
    </div>
  );
}

