/**
 * RichPreviews - High-fidelity "Miniature Twin" previews for document cards
 * 
 * Instead of abstract file representations, these components render
 * miniature versions of actual content types:
 * - Spreadsheets: CSS Grid tables with cells and data bars
 * - HTML/Code: Mini-IDE with syntax coloring
 * - Markdown/Docs: Typography layout with headings and paragraphs
 * - Empty state: Warning overlay with cleanup suggestion
 */

import { AlertTriangle, ImageOff, FileQuestion } from "lucide-react";

// ============================================================================
// Spreadsheet Preview - Looks like a real Excel grid
// ============================================================================
export function SpreadsheetPreview() {
  return (
    <div className="w-full h-full bg-white p-1.5 flex flex-col gap-0 border-t border-l border-gray-100 overflow-hidden">
      {/* Header Row */}
      <div className="flex w-full shrink-0">
        <div className="w-5 h-3.5 bg-gray-50 border-r border-b border-gray-200 flex items-center justify-center">
          <span className="text-[5px] text-gray-400">#</span>
        </div>
        {["A", "B", "C", "D"].map((col) => (
          <div
            key={col}
            className="flex-1 h-3.5 bg-gray-50 border-r border-b border-gray-200 flex items-center justify-center"
          >
            <span className="text-[6px] font-medium text-gray-400">{col}</span>
          </div>
        ))}
      </div>
      {/* Data Rows */}
      {[1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="flex w-full shrink-0">
          <div className="w-5 h-3.5 bg-gray-50 border-r border-b border-gray-100 flex items-center justify-center">
            <span className="text-[5px] text-gray-400">{row}</span>
          </div>
          <div className="flex-1 h-3.5 border-r border-b border-gray-100 p-0.5 flex items-center">
            <div className={`h-1.5 bg-emerald-100 rounded-[1px] ${row === 1 ? "w-4/5" : row % 2 === 0 ? "w-1/2" : "w-2/3"}`} />
          </div>
          <div className="flex-1 h-3.5 border-r border-b border-gray-100 p-0.5 flex items-center">
            <div className={`h-1.5 bg-blue-50 rounded-[1px] ${row === 1 ? "w-3/5" : "w-1/3"}`} />
          </div>
          <div className="flex-1 h-3.5 border-r border-b border-gray-100 p-0.5 flex items-center">
            <div className={`h-1.5 bg-gray-100 rounded-[1px] ${row % 2 === 0 ? "w-full" : "w-4/5"}`} />
          </div>
          <div className="flex-1 h-3.5 border-b border-gray-100 p-0.5 flex items-center">
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
    <div className="w-full h-full bg-white p-2.5 flex flex-col gap-1.5 overflow-hidden">
      {/* H1 Title */}
      <div className="w-3/4 h-2 bg-gray-800 rounded-[1px]" />
      {/* Paragraph lines */}
      <div className="mt-1 w-full h-1 bg-gray-200 rounded-[1px]" />
      <div className="w-5/6 h-1 bg-gray-200 rounded-[1px]" />
      <div className="w-full h-1 bg-gray-200 rounded-[1px]" />
      <div className="w-1/2 h-1 bg-gray-200 rounded-[1px]" />
      {/* Second paragraph */}
      <div className="mt-1 w-full h-1 bg-gray-100 rounded-[1px]" />
      <div className="w-4/5 h-1 bg-gray-100 rounded-[1px]" />
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
      color: "text-gray-400",
      bg: "bg-gray-50/90",
    },
  };
  const { icon: Icon, label, color, bg } = config[variant];

  return (
    <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center ${bg} backdrop-blur-[1px]`}>
      <Icon className={`w-5 h-5 ${color} mb-1`} />
      <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ============================================================================
// Image Fallback - Shows when image fails to load
// ============================================================================
export function ImageFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="flex flex-col items-center gap-1">
        <ImageOff className="w-6 h-6 text-gray-300" />
        <span className="text-[8px] text-gray-400">Image unavailable</span>
      </div>
    </div>
  );
}

