import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { ArrowUp, Camera, CheckSquare, FileText, Loader2, Mic, Paperclip, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { LENSES, type LensId } from "@/features/controlPlane/components/searchTypes";
import type { ProductDraftFile } from "@/features/product/lib/productSession";
import { useScreenCapture } from "@/hooks/useScreenCapture";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";

export type ProductComposerMode = "ask" | "note" | "task";

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
  submitPending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  submitLabel?: string;
  className?: string;
  variant?: "page" | "drawer";
  showLensSelector?: boolean;
  showOperatorContextChip?: boolean;
  showOperatorContextHint?: boolean;
  autoFocus?: boolean;
  mode?: ProductComposerMode;
  onModeChange?: (mode: ProductComposerMode) => void;
  showCaptureModes?: boolean;
  onSaveCapture?: (mode: Exclude<ProductComposerMode, "ask">, value: string) => Promise<void> | void;
  captureSavePending?: boolean;
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
  submitPending = false,
  disabled = false,
  placeholder = "Paste your notes, links, and ask here...",
  helperText = "Paste the full packet in one box, then drop PDFs, screenshots, or resumes below.",
  submitLabel = "Run",
  className,
  variant = "page",
  showLensSelector = true,
  showOperatorContextChip = true,
  showOperatorContextHint = true,
  autoFocus = false,
  mode = "ask",
  onModeChange,
  showCaptureModes = false,
  onSaveCapture,
  captureSavePending = false,
}: ProductIntakeComposerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [captureAttachmentPending, setCaptureAttachmentPending] = useState(false);
  const isCaptureMode = mode !== "ask";
  const showIntegratedCaptureModes = showCaptureModes && Boolean(onModeChange && onSaveCapture);

  const {
    isRecording,
    audioBlob,
    duration,
    error: voiceError,
    startRecording,
    stopRecording,
    clearRecording,
  } = useVoiceRecording();
  const { isCapturing, captureScreen, clearScreenshot } = useScreenCapture();

  const captureModes: Array<{ id: ProductComposerMode; label: string; icon: typeof FileText }> = [
    { id: "ask", label: "Ask", icon: FileText },
    { id: "note", label: "Note", icon: FileText },
    { id: "task", label: "Task", icon: CheckSquare },
  ];

  const attachmentLabel = useMemo(() => {
    if (isCaptureMode) {
      return mode === "note"
        ? "Quick notes save directly from this composer. Switch back to Ask for files and report runs."
        : "Quick tasks save directly from this composer. Switch back to Ask for files and report runs.";
    }
    if (files.length === 0) return helperText;
    return `${files.length} attachment${files.length === 1 ? "" : "s"} ready for the next run.`;
  }, [files.length, helperText, isCaptureMode, mode]);

  const effectivePlaceholder = useMemo(() => {
    if (mode === "note") return "Capture a thought worth keeping...";
    if (mode === "task") return "Capture a task, follow-up, or reminder...";
    return placeholder;
  }, [mode, placeholder]);

  const primaryLabel = useMemo(() => {
    if (mode === "note") return captureSavePending ? "Saving..." : "Save note";
    if (mode === "task") return captureSavePending ? "Saving..." : "Save task";
    return submitPending ? "Running..." : submitLabel;
  }, [captureSavePending, mode, submitLabel, submitPending]);

  const primaryDisabled =
    disabled ||
    captureAttachmentPending ||
    (mode === "ask"
      ? submitPending || !value.trim()
      : captureSavePending || !value.trim() || !onSaveCapture);

  const handlePrimaryAction = () => {
    if (primaryDisabled || !value.trim()) return;
    if (mode === "ask") {
      onSubmit();
      return;
    }
    if (onSaveCapture) {
      void onSaveCapture(mode, value);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handlePrimaryAction();
    }
  };

  const attachGeneratedFile = async (file: File, successMessage: string) => {
    setCaptureAttachmentPending(true);
    try {
      await Promise.resolve(onFilesSelected([file]));
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to attach capture");
    } finally {
      setCaptureAttachmentPending(false);
    }
  };

  const handleVoiceCapture = async () => {
    if (disabled || isCaptureMode || captureAttachmentPending) return;
    if (isRecording) {
      stopRecording();
      return;
    }
    try {
      await startRecording();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start recording");
    }
  };

  const handleScreenshotCapture = async () => {
    if (disabled || isCaptureMode || captureAttachmentPending) return;
    const screenshotData = await captureScreen();
    if (!screenshotData) return;
    try {
      const blob = await fetch(screenshotData).then((response) => response.blob());
      const file = new File([blob], `nodebench-screenshot-${Date.now()}.png`, {
        type: "image/png",
      });
      await attachGeneratedFile(file, "Screenshot attached");
    } finally {
      clearScreenshot();
    }
  };

  const handleDragState = (event: DragEvent<HTMLDivElement>, active: boolean) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled || isCaptureMode) return;
    setDragActive(active);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (disabled || isCaptureMode) return;
    const dropped = Array.from(event.dataTransfer.files ?? []);
    if (!dropped.length) return;
    await onFilesSelected(dropped);
  };

  useEffect(() => {
    if (!audioBlob) return;
    const extension = audioBlob.type.includes("mp4") ? "m4a" : "webm";
    const file = new File([audioBlob], `nodebench-voice-${Date.now()}.${extension}`, {
      type: audioBlob.type || "audio/webm",
    });
    void attachGeneratedFile(file, "Voice memo attached").finally(() => {
      clearRecording();
    });
  }, [audioBlob, clearRecording]);

  useEffect(() => {
    if (!voiceError) return;
    toast.error(voiceError);
  }, [voiceError]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const maxHeight = variant === "drawer" ? 224 : 320;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [value, variant]);

  useEffect(() => {
    if (!autoFocus) return;
    textareaRef.current?.focus();
  }, [autoFocus]);

  return (
    <div
      className={`${variant === "drawer" ? "rounded-[24px] p-2" : "rounded-[28px] p-2.5 sm:p-3"} border border-gray-200 bg-white shadow-[0_18px_60px_-42px_rgba(15,23,42,0.32)] dark:border-white/[0.12] dark:bg-[#171b20] dark:shadow-[0_28px_90px_-56px_rgba(0,0,0,0.82)] ${className ?? ""}`}
      onDragEnter={(event) => handleDragState(event, true)}
      onDragOver={(event) => handleDragState(event, true)}
      onDragLeave={(event) => handleDragState(event, false)}
      onDrop={handleDrop}
    >
      {showIntegratedCaptureModes ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <div
            role="tablist"
            aria-label="Composer mode"
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50/80 p-1 dark:border-white/[0.08] dark:bg-white/[0.03]"
          >
            {captureModes.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => onModeChange?.(id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-fast ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 motion-reduce:transform-none motion-reduce:transition-none ${
                  mode === id
                    ? "bg-white text-gray-900 shadow-sm dark:bg-[#171c22] dark:text-white"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            One composer, different intents.
          </span>
        </div>
      ) : null}

      <div
        data-nb-composer="intake"
        data-nb-composer-variant={variant}
        data-nb-composer-mode={mode}
        className={`nb-composer-surface ${variant === "drawer" ? "rounded-[18px] px-3 py-2.5" : "rounded-[22px] px-3 py-3 sm:px-4"} border bg-white transition-all duration-normal dark:bg-[#11161c] ${
          dragActive
            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 dark:bg-[var(--accent-primary)]/10"
            : "border-gray-200 dark:border-white/[0.1]"
        }`}
      >
        <textarea
          ref={textareaRef}
          id="product-intake-query"
          name="productIntakeQuery"
          aria-label={mode === "ask" ? "Paste notes, links, or your ask" : `Write your ${mode}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={effectivePlaceholder}
          rows={variant === "drawer" ? 3 : 4}
          disabled={disabled}
          className={`${variant === "drawer" ? "min-h-[72px]" : "min-h-[96px]"} max-h-[320px] w-full resize-none bg-transparent text-[15px] leading-6 text-gray-900 outline-none transition-[height] duration-fast ease-out placeholder:text-gray-400 disabled:cursor-not-allowed motion-reduce:transition-none dark:text-gray-100 dark:placeholder:text-gray-500`}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200/80 pt-3 dark:border-white/[0.08]">
          <div className="flex min-w-0 items-start gap-2 text-left text-xs text-gray-500 dark:text-gray-400">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
            <div className="min-w-0">
              <div className="leading-5">
                {attachmentLabel}
                {!isCaptureMode && dragActive ? " Drop files to attach them." : null}
                {!isCaptureMode && !dragActive ? " Drag files or attach them below." : null}
              </div>
              {isRecording ? (
                <div className="mt-1 text-[11px] text-[var(--accent-primary)]">
                  Recording voice memo... {Math.floor(duration / 60)}:{`${duration % 60}`.padStart(2, "0")}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isCaptureMode ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleVoiceCapture()}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all duration-fast ease-out hover:bg-gray-100 hover:text-gray-900 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 disabled:opacity-40 motion-reduce:transform-none motion-reduce:transition-none dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100 ${
                    isRecording ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]" : "text-gray-500"
                  }`}
                  disabled={disabled || captureAttachmentPending}
                  aria-label={isRecording ? "Stop voice capture" : "Record voice memo"}
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{isRecording ? "Stop" : "Voice"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleScreenshotCapture()}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-all duration-fast ease-out hover:bg-gray-100 hover:text-gray-900 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 disabled:opacity-40 motion-reduce:transform-none motion-reduce:transition-none dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100"
                  disabled={disabled || isCapturing || captureAttachmentPending}
                  aria-label={isCapturing ? "Capturing screenshot" : "Attach screenshot"}
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{isCapturing ? "Capturing..." : "Screenshot"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-all duration-fast ease-out hover:bg-gray-100 hover:text-gray-900 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 disabled:opacity-40 motion-reduce:transform-none motion-reduce:transition-none dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100"
                  disabled={disabled || uploadingFiles || captureAttachmentPending}
                  aria-label={uploadingFiles ? "Uploading files" : "Attach files"}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {uploadingFiles ? "Uploading..." : "Attach files"}
                  </span>
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={primaryDisabled}
              aria-busy={mode === "ask" ? submitPending : captureSavePending}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-all duration-fast ease-out hover:bg-[var(--accent-primary-hover)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-40 disabled:active:scale-100 motion-reduce:transform-none motion-reduce:transition-none dark:focus-visible:ring-offset-[#11161c]"
              aria-label={primaryLabel}
            >
              <span>{primaryLabel}</span>
              {mode === "ask" && submitPending ? (
                <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
              ) : mode !== "ask" && captureSavePending ? (
                <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
              ) : value.trim() ? (
                mode === "ask" ? (
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium leading-none">
                    Ctrl+Enter
                  </kbd>
                ) : null
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {showOperatorContextChip && operatorContextLabel ? (
          <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 dark:border-white/[0.12] dark:bg-[#171c22] dark:text-gray-300">
            <span className="font-medium">Using your context</span>
            <span className="text-gray-400 dark:text-gray-500">{operatorContextLabel}</span>
          </div>
        ) : null}

        {showOperatorContextHint && operatorContextHint ? (
          <div className="mt-3 rounded-2xl border border-gray-200/80 bg-gray-50 px-3 py-2 text-left text-xs leading-5 text-gray-500 dark:border-white/[0.08] dark:bg-[#11161c] dark:text-gray-400">
            {operatorContextHint}
          </div>
        ) : null}

        {showLensSelector && !isCaptureMode ? (
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
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all duration-fast ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 motion-reduce:transform-none motion-reduce:transition-none ${
                  lens === option.id
                    ? "bg-[var(--accent-primary)] text-white shadow-sm"
                    : "text-gray-500 hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

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
