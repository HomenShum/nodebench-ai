/**
 * EvidenceBoard — Drop screenshots, audio, video, links, or notes.
 * NodeBench extracts text/entities and compiles them into a research packet.
 *
 * Pinterest-style research tray for the Ask landing page.
 */

import { memo, useState, useCallback, useRef, useMemo, type DragEvent } from "react";
import { Upload, X, Image, FileText, Link2, Mic, Video, Sparkles } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

export interface EvidenceItem {
  id: string;
  type: "screenshot" | "audio" | "video" | "link" | "note" | "pdf";
  name: string;
  thumbnail?: string;
  extractedText?: string;
  extractedEntities: string[];
  uploadedAt: string;
  file?: File;
  url?: string;
}

interface EvidenceBoardProps {
  onCompile: (items: EvidenceItem[], suggestedQuery: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

const TYPE_ICONS: Record<EvidenceItem["type"], typeof Image> = {
  screenshot: Image,
  audio: Mic,
  video: Video,
  link: Link2,
  note: FileText,
  pdf: FileText,
};

function fileToType(file: File): EvidenceItem["type"] {
  if (file.type.startsWith("image/")) return "screenshot";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  return "note";
}

function generateId(): string {
  return `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

async function extractThumbnail(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/")) return undefined;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

function extractEntitiesFromText(text: string): string[] {
  // Simple entity extraction: capitalized multi-word sequences
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) ?? [];
  const unique = [...new Set(matches)].slice(0, 8);
  return unique;
}

function suggestQuery(items: EvidenceItem[]): string {
  const allEntities = items.flatMap((i) => i.extractedEntities);
  const unique = [...new Set(allEntities)].slice(0, 3);
  if (unique.length > 0) return `Analyze ${unique.join(", ")}`;
  const allText = items.map((i) => i.extractedText ?? i.name).join(" ");
  const words = allText.split(/\s+/).filter((w) => w.length > 4).slice(0, 5);
  return words.length > 0 ? `Research: ${words.join(" ")}` : "Analyze uploaded evidence";
}

// ── Evidence Tile ────────────────────────────────────────────────────

function EvidenceTile({ item, onRemove }: { item: EvidenceItem; onRemove: (id: string) => void }) {
  const Icon = TYPE_ICONS[item.type];
  return (
    <div className="group relative rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 transition-colors hover:border-white/[0.1]">
      {/* Thumbnail or icon */}
      {item.thumbnail ? (
        <img
          src={item.thumbnail}
          alt={item.name}
          className="h-20 w-full rounded object-cover"
        />
      ) : (
        <div className="flex h-20 w-full items-center justify-center rounded bg-white/[0.03]">
          <Icon className="h-6 w-6 text-content-muted/40" />
        </div>
      )}

      {/* Type badge */}
      <div className="mt-2 flex items-center gap-1.5">
        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-content-muted">
          {item.type}
        </span>
        {item.extractedEntities.length > 0 && (
          <span className="text-[9px] text-emerald-400">{item.extractedEntities.length} entities</span>
        )}
      </div>

      {/* Name */}
      <div className="mt-1 truncate text-[11px] text-content-muted">{item.name}</div>

      {/* Extracted text preview */}
      {item.extractedText && (
        <div className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-content-muted/60">
          {item.extractedText.slice(0, 120)}
        </div>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label={`Remove ${item.name}`}
      >
        <X className="h-3 w-3 text-white" />
      </button>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export const EvidenceBoard = memo(function EvidenceBoard({ onCompile }: EvidenceBoardProps) {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const newItems: EvidenceItem[] = [];

    for (const file of Array.from(files).slice(0, 12)) {
      const thumbnail = await extractThumbnail(file);

      // For images, attempt basic OCR-like text extraction from filename
      // Real OCR would use a backend endpoint — this is the client-side stub
      const extractedText = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      const entities = extractEntitiesFromText(extractedText);

      newItems.push({
        id: generateId(),
        type: fileToType(file),
        name: file.name,
        thumbnail,
        extractedText,
        extractedEntities: entities,
        uploadedAt: new Date().toISOString(),
        file,
      });
    }

    setItems((prev) => [...prev, ...newItems].slice(0, 20));
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      void addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const dedupedEntities = useMemo(
    () => [...new Set(items.flatMap((i) => i.extractedEntities))].slice(0, 8),
    [items],
  );
  const suggested = useMemo(() => suggestQuery(items), [items]);

  const handleCompile = useCallback(() => {
    if (items.length === 0) return;
    onCompile(items, suggested);
  }, [items, onCompile, suggested]);

  if (items.length === 0) {
    // Compact drop zone
    return (
      <div
        className={`mx-auto mt-3 max-w-xl rounded-xl border-2 border-dashed transition-colors ${
          isDragOver
            ? "border-[#d97757]/50 bg-[#d97757]/[0.04]"
            : "border-white/[0.08] bg-transparent hover:border-white/[0.14]"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 px-4 py-3 text-[12px] text-content-muted transition-colors hover:text-content-secondary"
        >
          <Upload className="h-3.5 w-3.5" />
          Drop screenshots, audio, video, or notes to build a research packet
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,audio/*,video/*,.pdf,.txt,.md"
          onChange={(e) => e.target.files && void addFiles(e.target.files)}
          className="hidden"
          aria-label="Upload evidence files"
        />
      </div>
    );
  }

  // Board with tiles
  return (
    <div className="mx-auto mt-4 max-w-2xl">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-content-muted">
            Evidence Board ({items.length})
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-content-muted transition hover:bg-white/[0.06]"
            >
              <Upload className="mr-1 inline h-3 w-3" />Add
            </button>
            <button
              type="button"
              onClick={handleCompile}
              className="rounded-lg bg-[#d97757] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#c4684a]"
            >
              <Sparkles className="mr-1 inline h-3 w-3" />Compile Packet
            </button>
          </div>
        </div>

        {/* Tile grid */}
        <div
          className={`mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 ${isDragOver ? "ring-2 ring-[#d97757]/30 rounded-lg" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {items.map((item) => (
            <EvidenceTile key={item.id} item={item} onRemove={handleRemove} />
          ))}
        </div>

        {/* Extracted entities summary (memoized) */}
        {dedupedEntities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            <span className="text-[10px] text-content-muted/50 mr-1">Detected:</span>
            {dedupedEntities.map((entity) => (
              <span key={entity} className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                {entity}
              </span>
            ))}
          </div>
        )}

        {/* Suggested query (memoized) */}
        <div className="mt-2 text-[10px] text-content-muted/40">
          Suggested: &quot;{suggested}&quot;
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,audio/*,video/*,.pdf,.txt,.md"
        onChange={(e) => e.target.files && void addFiles(e.target.files)}
        className="hidden"
        aria-label="Upload evidence files"
      />
    </div>
  );
});

export default EvidenceBoard;
