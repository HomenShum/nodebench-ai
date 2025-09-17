import React, { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import PopoverMiniSheetEditor from "../../common/PopoverMiniSheetEditor";

export default function SpreadsheetMiniEditor({ documentId, onClose }: { documentId: Id<"documents">; onClose: () => void }) {
  const fileDoc = useQuery(api.fileDocuments.getFileDocument, { documentId });
  const updateDocument = useMutation(api.documents.update);
  const renameFile = useMutation(api.files.renameFile);

  const [title, setTitle] = useState("");
  const [fileName, setFileName] = useState("");
  const [saveHint, setSaveHint] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");
  const [isSaving, setIsSaving] = useState(false);
  const prepareCsvExport = useMutation(api.files.prepareCsvExport);
  const lastSavedRef = useRef<string>("");

  // Quick table editor state
  const [fullHeaders, setFullHeaders] = useState<string[] | null>(null);
  const [fullRows, setFullRows] = useState<string[][] | null>(null);
  const [subsetHeaders, setSubsetHeaders] = useState<string[]>([]);
  const [subsetRows, setSubsetRows] = useState<string[][]>([]);
  const SUBSET_COLS = 6;
  const SUBSET_ROWS = 12;

  useEffect(() => {
    if (!fileDoc) return;
    setTitle(fileDoc.document.title || "");
    setFileName(fileDoc.file.fileName || "");
    lastSavedRef.current = JSON.stringify({ t: fileDoc.document.title || "", f: fileDoc.file.fileName || "" });
  }, [fileDoc]);

  useEffect(() => {
    if (!fileDoc) return;
    const current = JSON.stringify({ t: title, f: fileName });
    setSaveHint(current === lastSavedRef.current ? (saveHint === "saved" ? "saved" : "idle") : "unsaved");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, fileName, fileDoc]);

  const handleSave = useCallback(async () => {
    if (!fileDoc) return;
    const nextTitle = (title || "").trim();
    const nextFileName = (fileName || "").trim();

    if (nextTitle === (fileDoc.document.title || "") && nextFileName === (fileDoc.file.fileName || "")) {
      setSaveHint("idle");
      return;
    }

    try {
      setIsSaving(true);
      setSaveHint("saving");
      // Update doc title if changed
      if (nextTitle !== (fileDoc.document.title || "")) {
        await updateDocument({ id: fileDoc.document._id, title: nextTitle || "Untitled" });
      }
      // Update file name if changed
      if (nextFileName !== (fileDoc.file.fileName || "")) {
        await renameFile({ fileId: fileDoc.file._id, fileName: nextFileName });
      }
      lastSavedRef.current = JSON.stringify({ t: nextTitle || "Untitled", f: nextFileName || fileDoc.file.fileName });
      setSaveHint("saved");
      setTimeout(() => setSaveHint("idle"), 1200);
      toast.success("Spreadsheet details updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update spreadsheet details");
      setSaveHint("unsaved");
    } finally {
      setIsSaving(false);
    }
  }, [fileDoc, title, fileName, updateDocument, renameFile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave, onClose]);

  // Load CSV and prepare subset for the mini sheet editor
  useEffect(() => {
    const run = async () => {
      try {
        if (!fileDoc?.storageUrl) return;
        const res = await fetch(fileDoc.storageUrl);
        const text = await res.text();
        const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
        const data: string[][] = (parsed.data as any[]).filter((r) => Array.isArray(r)) as string[][];
        if (!data.length) return;
        const headers = data[0] ?? [];
        const rows = data.slice(1);
        setFullHeaders(headers);
        setFullRows(rows);
        const cols = Math.min(SUBSET_COLS, headers.length);
        const rCount = Math.min(SUBSET_ROWS, rows.length);
        setSubsetHeaders(headers.slice(0, cols));
        setSubsetRows(rows.slice(0, rCount).map((r) => r.slice(0, cols)));
      } catch (e) {
        console.error("Failed to load CSV for mini editor", e);
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileDoc?.storageUrl]);

  const csvStringFrom = useCallback((headers: string[], rows: string[][]): string => {
    const esc = (cell: string) => (cell.includes(',') || cell.includes('"') || cell.includes('\n')) ? `"${cell.replace(/"/g, '""')}"` : cell;
    return [headers.map(esc).join(','), ...rows.map((row) => row.map(esc).join(','))].join('\n');
  }, []);

  const handleSaveSubset = useCallback(async ({ headers, rows }: { headers: string[]; rows: string[][] }) => {
    if (!fileDoc?.file || !fullHeaders || !fullRows) return;
    try {
      // Merge subset back into a copy of the full data (top-left region)
      const mergedHeaders = [...fullHeaders];
      for (let c = 0; c < headers.length; c++) mergedHeaders[c] = headers[c] ?? '';
      const mergedRows = fullRows.map((r) => [...r]);
      for (let r = 0; r < rows.length; r++) {
        const src = rows[r] ?? [];
        if (!mergedRows[r]) mergedRows[r] = [];
        for (let c = 0; c < headers.length; c++) {
          mergedRows[r][c] = src[c] ?? '';
        }
      }
      const csvContent = csvStringFrom(mergedHeaders, mergedRows);
      // Export as new file for safety (does not overwrite original)
      const base = fileDoc.file.fileName.replace(/\.csv$/i, "");
      const newName = `${base}_quickedit_${Date.now()}.csv`;
      await prepareCsvExport({ originalFileId: fileDoc.file._id, csvContent, newFileName: newName });
      // Download in browser
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = newName; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${newName}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to export quick edit");
    }
  }, [fileDoc?.file, fullHeaders, fullRows, prepareCsvExport, csvStringFrom]);

  if (fileDoc === undefined) {
    return (
      <div className="mt-2 border border-[var(--border-color)] rounded-xl p-3 bg-[var(--bg-secondary)]">
        <div className="animate-pulse h-4 w-28 bg-[var(--bg-primary)] rounded mb-2" />
        <div className="space-y-2">
          <div className="h-3 bg-[var(--bg-primary)] rounded" />
          <div className="h-3 bg-[var(--bg-primary)] rounded w-5/6" />
        </div>
        {/* Quick table editor (subset) */}
        {subsetHeaders.length > 0 && (
          <div>
            <label className="text-[11px] text-[var(--text-secondary)] mb-1 block">Quick table editor</label>
            <PopoverMiniSheetEditor
              headers={subsetHeaders}
              rows={subsetRows}
              onSave={handleSaveSubset}
              onCancel={() => {/* keep mini open; no-op */}}
              title={`${subsetRows.length} rows × ${subsetHeaders.length} cols`}
              saveLabel="Export CSV"
            />
          </div>
        )}
      </div>
    );
  }
  if (!fileDoc) return null;

  return (
    <div
      className="mt-2 rounded-lg p-3 bg-[var(--bg-primary)] border border-[var(--border-color)]/60 transition-all relative z-10 pointer-events-auto"
      data-inline-editor="true"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] text-[var(--text-muted)]">Press Esc to close · Ctrl/Cmd+S to save</div>
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-[var(--text-muted)]">
            {saveHint === "saving" ? "Saving…" : saveHint === "saved" ? "Saved" : saveHint === "unsaved" ? "Unsaved changes" : ""}
          </div>
          <button
            onClick={() => { void handleSave(); }}
            disabled={saveHint !== "unsaved" || isSaving}
            className={`h-7 px-3 rounded-md flex items-center justify-center border text-[12px] ${saveHint === "unsaved" && !isSaving ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] hover:opacity-90" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] opacity-70 cursor-not-allowed"}`}
            title="Save changes"
          >
            <span className="inline-flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Save</span>
          </button>
          <button
            onClick={() => onClose()}
            className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] text-[var(--text-secondary)] mb-1 block">Document title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm bg-transparent border border-transparent rounded-md px-0 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
            placeholder="Untitled spreadsheet"
          />
        </div>
        <div>
          <label className="text-[11px] text-[var(--text-secondary)] mb-1 block">File name</label>
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full text-sm bg-transparent border border-transparent rounded-md px-0 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
            placeholder="example.csv"
          />
        </div>
      </div>
    </div>
  );
}
