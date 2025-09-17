import React, { useCallback, useEffect, useRef, useState } from "react";
import { Save, X } from "lucide-react";
import EditorJS from "@editorjs/editorjs";
import Table from "@editorjs/table";

export type PopoverMiniSheetEditorProps = {
  headers: string[];
  rows: string[][];
  onSave: (payload: { headers: string[]; rows: string[][]; json?: any }) => void | Promise<void>;
  onCancel: () => void;
  title?: string;
  saveLabel?: string;
  cancelLabel?: string;
  withHeadings?: boolean;
};

export default function PopoverMiniSheetEditor({
  headers,
  rows,
  onSave,
  onCancel,
  title = "",
  saveLabel = "Save",
  cancelLabel = "Close",
  withHeadings = true,
}: PopoverMiniSheetEditorProps) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const changeTimer = useRef<number | null>(null);

  const initialSignatureRef = useRef<string>(JSON.stringify({ headers, rows }));

  const extractTable = useCallback(async (): Promise<{ headers: string[]; rows: string[][]; json?: any }> => {
    const ed = editorRef.current;
    if (!ed) return { headers, rows };
    const out: any = await ed.save();
    const tableBlock = Array.isArray(out?.blocks) ? out.blocks.find((b: any) => b.type === "table") : null;
    const content: string[][] = tableBlock?.data?.content || [];
    const newHeaders = content[0] || [];
    const newRows = content.slice(1) || [];
    return { headers: newHeaders, rows: newRows, json: out };
  }, [headers, rows]);

  useEffect(() => {
    if (!holderRef.current) return;
    let cancelled = false;

    const init = async () => {
      try {
        if (editorRef.current) {
          try { await editorRef.current.isReady; } catch {}
          try { editorRef.current.destroy(); } catch {}
          editorRef.current = null;
        }
        const data = {
          time: Date.now(),
          blocks: [
            {
              type: "table",
              data: {
                withHeadings,
                content: [headers, ...rows],
              },
            },
          ],
        } as any;
        const ed = new EditorJS({
          holder: holderRef.current!,
          minHeight: 200,
          autofocus: true,
          data,
          tools: {
            table: { class: Table, inlineToolbar: true },
          },
          onReady: () => { if (!cancelled) setReady(true); },
          onChange: () => {
            if (changeTimer.current) window.clearTimeout(changeTimer.current);
            changeTimer.current = window.setTimeout(async () => {
              try {
                const { headers: h, rows: r } = await extractTable();
                const sig = JSON.stringify({ headers: h, rows: r });
                setDirty(sig !== initialSignatureRef.current);
              } catch {
                /* ignore */
              }
            }, 200);
          },
        });
        editorRef.current = ed;
      } catch (e) {
        console.error("Failed to init PopoverMiniSheetEditor", e);
      }
    };

    void init();
    return () => {
      cancelled = true;
      if (changeTimer.current) window.clearTimeout(changeTimer.current);
      try { editorRef.current?.destroy?.(); } catch {}
      editorRef.current = null;
      setReady(false);
      setDirty(false);
    };
  }, [headers, rows, withHeadings, extractTable]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { headers: h, rows: r, json } = await extractTable();
      await onSave({ headers: h, rows: r, json });
      initialSignatureRef.current = JSON.stringify({ headers: h, rows: r });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [extractTable, onSave, saving]);

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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave, onCancel]);

  return (
    <div className="mt-2 rounded-lg p-3 bg-[var(--bg-primary)] border border-[var(--border-color)]/60 transition-all relative z-10 pointer-events-auto" data-inline-editor="true">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] text-[var(--text-muted)]">Press Esc to close · Ctrl/Cmd+S to save</div>
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
        <div className="min-h-[200px]">
          <div ref={holderRef} className="min-h-[200px] px-3 py-2 text-sm" />
          {!ready && (
            <div className="text-[12px] text-[var(--text-muted)] px-3 py-2">Initializing table editor…</div>
          )}
        </div>
      </div>
    </div>
  );
}
