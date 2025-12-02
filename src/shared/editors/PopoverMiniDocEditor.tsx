import React, { useCallback, useEffect, useRef, useState } from "react";
import { Save, X } from "lucide-react";
import InlineRichEditor from "./InlineRichEditor";

export type PopoverMiniDocEditorProps = {
  initialValue?: string;
  initialJson?: string | null;
  onSave: (payload: { text: string; json?: Record<string, unknown> | undefined }) => void | Promise<void>;
  onCancel: () => void;
  title?: string;
  saveLabel?: string;
  cancelLabel?: string;
  enableCtrlEnter?: boolean; // Phase 2: Enable Ctrl+Enter to save
};

export default function PopoverMiniDocEditor({
  initialValue = "",
  initialJson = null,
  onSave,
  onCancel,
  title = "",
  saveLabel = "Save",
  cancelLabel = "Close",
  enableCtrlEnter = false,
}: PopoverMiniDocEditorProps) {
  const [text, setText] = useState<string>(initialValue ?? "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const getEditorJsonRef = useRef<null | (() => Promise<any>)>(null);
  const initialRef = useRef<string>(initialValue ?? "");

  useEffect(() => {
    setText(initialValue ?? "");
    initialRef.current = initialValue ?? "";
    setDirty(false);
  }, [initialValue]);

  useEffect(() => {
    setDirty(text.trim() !== (initialRef.current || "").trim());
  }, [text]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      let json: Record<string, unknown> | undefined = undefined;
      if (getEditorJsonRef.current) {
        try {
          const out = await getEditorJsonRef.current();
          if (out && out.blocks) json = out;
        } catch {
          /* ignore extractor errors */
        }
      }
      await onSave({ text: text.trim(), json });
    } finally {
      setSaving(false);
    }
  }, [onSave, text, saving]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
      // Phase 2: Ctrl+Enter to save
      if (enableCtrlEnter && (e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave, onCancel, enableCtrlEnter]);

  return (
    <div className="mt-2 rounded-lg p-3 bg-[var(--bg-primary)] border border-[var(--border-color)]/60 transition-all relative z-10 pointer-events-auto" data-inline-editor="true">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] text-[var(--text-muted)]">
          Press Esc to close · Ctrl/Cmd+S to save{enableCtrlEnter ? " · Ctrl/Cmd+Enter to save" : ""}
        </div>
        <div className="flex items-center gap-2">
          {title ? <div className="text-[11px] text-[var(--text-muted)]">{title}</div> : null}
          <button
            className={`h-7 px-3 rounded-md flex items-center justify-center border text-[12px] ${dirty ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] opacity-70 cursor-not-allowed"}`}
            title={saveLabel}
            onClick={() => void handleSave()}
            disabled={!dirty || saving}
          >
            <span className="inline-flex items-center gap-1">
              <Save className="w-3.5 h-3.5" /> {saveLabel}
            </span>
          </button>
          <button
            className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]"
            title={cancelLabel}
            onClick={onCancel}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="w-full border border-[var(--border-color)]/60 rounded-md bg-[var(--bg-secondary)]">
        <InlineRichEditor
          value={text}
          onChange={setText}
          placeholder="Write details…"
          initialJson={initialJson}
          registerSaveExtractor={(fn) => {
            getEditorJsonRef.current = fn;
          }}
        />
      </div>
    </div>
  );
}
