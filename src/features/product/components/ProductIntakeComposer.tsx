import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { ArrowUp, Paperclip, Sparkles } from "lucide-react";

import { LENSES, type LensId } from "@/features/controlPlane/components/searchTypes";
import type { ProductDraftFile } from "@/features/product/lib/productSession";

type ProductIntakeComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFilesSelected: (files: File[]) => Promise<void> | void;
  files: ProductDraftFile[];
  lens: LensId;
  onLensChange: (lens: LensId) => void;
  operatorContextLabel?: string | null;
  operatorContextHint?: string | null;
  uploadingFiles?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  submitLabel?: string;
  className?: string;
};

export function ProductIntakeComposer({
  value,
  onChange,
  onSubmit,
  onFilesSelected,
  files,
  lens,
  onLensChange,
  operatorContextLabel,
  operatorContextHint,
  uploadingFiles = false,
  disabled = false,
  placeholder = "Paste your notes, links, and ask here...",
  helperText = "Paste the full packet in one box, then drop PDFs, screenshots, or resumes below.",
  submitLabel = "Run",
  className,
}: ProductIntakeComposerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const attachmentLabel = useMemo(() => {
    if (files.length === 0) return helperText;
    return `${files.length} attachment${files.length === 1 ? "" : "s"} ready for the next run.`;
  }, [files.length, helperText]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  };

  const handleDragState = (event: DragEvent<HTMLDivElement>, active: boolean) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    setDragActive(active);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    const dropped = Array.from(event.dataTransfer.files ?? []);
    if (!dropped.length) return;
    await onFilesSelected(dropped);
  };

  return (
    <div
      className={`rounded-[28px] border border-gray-200 bg-white p-2.5 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.32)] sm:p-3 dark:border-white/[0.12] dark:bg-[#171b20] dark:shadow-[0_28px_90px_-56px_rgba(0,0,0,0.82)] ${className ?? ""}`}
      onDragEnter={(event) => handleDragState(event, true)}
      onDragOver={(event) => handleDragState(event, true)}
      onDragLeave={(event) => handleDragState(event, false)}
      onDrop={handleDrop}
    >
      <div
        className={`rounded-[22px] border bg-white px-3 py-3 transition-all duration-200 sm:px-4 dark:bg-[#11161c] focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/25 focus-within:border-[var(--accent-primary)]/50 ${
          dragActive
            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 dark:bg-[var(--accent-primary)]/10"
            : "border-gray-200 dark:border-white/[0.1]"
        }`}
      >
        <textarea
          id="product-intake-query"
          name="productIntakeQuery"
          aria-label="Paste notes, links, or your ask"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={4}
          disabled={disabled}
          className="min-h-[96px] max-h-[320px] w-full resize-none bg-transparent text-[15px] leading-6 text-gray-900 outline-none transition-[height] duration-150 ease-out placeholder:text-gray-400 disabled:cursor-not-allowed motion-reduce:transition-none dark:text-gray-100 dark:placeholder:text-gray-500"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200/80 pt-3 dark:border-white/[0.08]">
          <div className="flex min-w-0 items-start gap-2 text-left text-xs text-gray-500 dark:text-gray-400">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
            <div className="min-w-0">
              <div className="leading-5">
                {attachmentLabel}
                {dragActive ? " Drop files to attach them." : " Drag files or attach them below."}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Ghost "Attach files" — demoted so "Start run" is the single
                primary action (Linear + Perplexity pattern). Icon-only on
                mobile to preserve composer width. */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-all duration-150 ease-out hover:bg-gray-100 hover:text-gray-900 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 disabled:opacity-40 motion-reduce:transform-none motion-reduce:transition-none dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100"
              disabled={disabled || uploadingFiles}
              aria-label={uploadingFiles ? "Uploading files" : "Attach files"}
            >
              <Paperclip className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {uploadingFiles ? "Uploading..." : "Attach files"}
              </span>
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={disabled || !value.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-all duration-150 ease-out hover:bg-[var(--accent-primary-hover)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-40 disabled:active:scale-100 motion-reduce:transform-none motion-reduce:transition-none dark:focus-visible:ring-offset-[#11161c]"
              aria-label={submitLabel}
            >
              <span>{submitLabel}</span>
              {/* Keyboard hint — only show when the composer has content
                  so empty-state stays minimal. */}
              {value.trim() ? (
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium leading-none">
                  ⌘↵
                </kbd>
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {operatorContextLabel ? (
          <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 dark:border-white/[0.12] dark:bg-[#171c22] dark:text-gray-300">
            <span className="font-medium">Using your context</span>
            <span className="text-gray-400 dark:text-gray-500">{operatorContextLabel}</span>
          </div>
        ) : null}

        {operatorContextHint ? (
          <div className="mt-3 rounded-2xl border border-gray-200/80 bg-gray-50 px-3 py-2 text-left text-xs leading-5 text-gray-500 dark:border-white/[0.08] dark:bg-[#11161c] dark:text-gray-400">
            Saved context from `Me` will be applied automatically. Use `Cmd/Ctrl + Enter` to run faster.
          </div>
        ) : null}

        {/* Lens segmented control — Linear-style wrapper so 6 pills read
            as one toggle group rather than six separate buttons. */}
        <div
          role="tablist"
          aria-label="Lens"
          className="no-scrollbar -mx-1 mt-3 flex items-center justify-start gap-0.5 overflow-x-auto rounded-full border border-gray-200 bg-gray-50/60 p-1 px-1 sm:justify-center sm:overflow-visible dark:border-white/[0.08] dark:bg-white/[0.02]"
        >
          {LENSES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={lens === option.id}
              onClick={() => onLensChange(option.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 motion-reduce:transform-none motion-reduce:transition-none ${
                lens === option.id
                  ? "bg-[var(--accent-primary)] text-white shadow-sm"
                  : "text-gray-500 hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {files.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <span
                key={`${file.name}-${index}`}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500 dark:border-white/[0.12] dark:bg-[#171c22] dark:text-gray-300"
              >
                {file.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          const selected = Array.from(event.target.files ?? []);
          if (!selected.length) return;
          void Promise.resolve(onFilesSelected(selected)).finally(() => {
            if (fileInputRef.current) fileInputRef.current.value = "";
          });
        }}
      />
    </div>
  );
}
