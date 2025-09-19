import React, { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import Spreadsheet from "react-spreadsheet";
import * as XLSX from 'xlsx';


// Build a display matrix from a worksheet, expanding merged cells so content shows up
function wsToDisplayAOA(ws: XLSX.WorkSheet): string[][] {
  const ref = (ws as any)['!ref'] || 'A1';
  const R = XLSX.utils.decode_range(ref);
  const rows = R.e.r - R.s.r + 1;
  const cols = R.e.c - R.s.c + 1;
  const out: string[][] = Array.from({ length: rows }, () => Array(cols).fill(""));
  for (const addr in ws) {
    if (!Object.prototype.hasOwnProperty.call(ws, addr)) continue;
    if (addr[0] === '!') continue;
    const cell: any = (ws as any)[addr];
    const pos = XLSX.utils.decode_cell(addr);
    const rr = pos.r - R.s.r;
    const cc = pos.c - R.s.c;
    if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
      const v = cell?.v;
      out[rr][cc] = v != null ? String(v) : "";
    }
  }
  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = (ws as any)['!merges'] || [];
  for (const m of merges) {
    const vCell: any = (ws as any)[XLSX.utils.encode_cell(m.s)];
    const v = vCell?.v;
    if (v == null) continue;
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        const rr = r - R.s.r;
        const cc = c - R.s.c;
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) out[rr][cc] = String(v);
      }
    }
  }
  return out;
}


export default function SpreadsheetMiniEditor({ documentId, onClose }: { documentId: Id<"documents">; onClose: () => void }) {
  const fileDoc = useQuery(api.fileDocuments.getFileDocument, { documentId });
  const updateDocument = useMutation(api.documents.update);
  const renameFile = useMutation(api.files.renameFile);

  const [title, setTitle] = useState("");
  const [fileName, setFileName] = useState("");
  const [saveHint, setSaveHint] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");
  const [isSaving, setIsSaving] = useState(false);
  const genUploadUrl = useMutation(api.files.generateUploadUrl);
  const finalizeExcel = useMutation(api.files.finalizeExcelReplace);

  const prepareCsvExport = useMutation(api.files.prepareCsvExport);
  const lastSavedRef = useRef<string>("");

  // Quick table editor state
  const [workbookSheets, setWorkbookSheets] = useState<Array<{ name: string; csv: { headers: string[]; rows: string[][] } }>>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  const [fullHeaders, setFullHeaders] = useState<string[] | null>(null);
  const [fullRows, setFullRows] = useState<string[][] | null>(null);
  const [subsetHeaders, setSubsetHeaders] = useState<string[]>([]);
  const [subsetRows, setSubsetRows] = useState<string[][]>([]);

  const isExcel = (() => {
    const name = (fileDoc?.file?.fileName || '').toLowerCase();
    const ft = String(fileDoc?.document?.fileType || '').toLowerCase();
    return ft === 'excel' || /\.(xlsx?)$/.test(name);
  })();


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
        if (!fileDoc?.storageUrl || isExcel) return;
        const res = await fetch(fileDoc.storageUrl);
        const text = await res.text();
        const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false });
        const data: string[][] = (parsed.data as any[]).filter((r) => Array.isArray(r)) as string[][];
        if (!data.length) return;
        const headers = data[0] ?? [];
        const rows = data.slice(1);
        setFullHeaders(headers);
        setFullRows(rows);
        // Fit entire CSV content into the mini grid with scroll
        const maxCols = Math.max(headers.length, ...rows.map((r) => r.length));
        const labels = Array.from({ length: maxCols }, (_, i) => (headers[i] ?? `C${i + 1}`));
        const paddedRows = rows.map((r) => {
          const copy = [...r];

          if (copy.length < maxCols) copy.length = maxCols;
          for (let i = 0; i < maxCols; i++) if (copy[i] == null) copy[i] = "";
          return copy;
        });
        setSubsetHeaders(labels);
        setSubsetRows(paddedRows);
      } catch (e) {
        console.error("Failed to load CSV for mini editor", e);
      }
    };
    void run();

  }, [fileDoc?.storageUrl]);

  const csvStringFrom = useCallback((headers: string[], rows: string[][]): string => {
    const esc = (cell: string) => (cell.includes(',') || cell.includes('"') || cell.includes('\n')) ? `"${cell.replace(/"/g, '""')}"` : cell;
    return [headers.map(esc).join(','), ...rows.map((row) => row.map(esc).join(','))].join('\n');
  }, []);
  // Load Excel workbook into mini editor when applicable
  useEffect(() => {
    if (!fileDoc?.storageUrl || !isExcel) return;
    (async () => {
      try {
        const resp = await fetch(fileDoc.storageUrl as string);
        const buf = await resp.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheets = wb.SheetNames.map((name) => {
          const ws = wb.Sheets[name];
          const aoa: string[][] = wsToDisplayAOA(ws);
          const headers = (aoa?.[0] ?? []).map((v: any) => String(v ?? ''));
          const dataRows = (aoa ?? []).slice(1).map((r: any[]) => (r ?? []).map((v: any) => String(v ?? '')));
          return { name, csv: { headers, rows: dataRows } };
        });
        setWorkbookSheets(sheets);
        setActiveSheetIndex(0);
        setSubsetHeaders(sheets[0]?.csv.headers ?? []);
        setSubsetRows(sheets[0]?.csv.rows ?? []);
      } catch (e) {
        console.error('Excel load (mini) failed', e);
      }
    })();
  }, [fileDoc?.storageUrl, isExcel]);


  const handleSaveSubset = useCallback(async ({ headers, rows }: { headers: string[]; rows: string[][] }) => {
    if (!fileDoc?.file) return;
    try {
      if (isExcel) {
        if (!fileDoc.storageUrl) throw new Error('Missing storage URL');
        const resp = await fetch(fileDoc.storageUrl as string);
        const buf = await resp.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheetName = workbookSheets[activeSheetIndex]?.name || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName] || XLSX.utils.aoa_to_sheet([]);
        const aoa: any[][] = [headers, ...rows];
        const R = aoa.length, C = (aoa[0]?.length ?? 0);
        // Skip non-anchor merged children
        const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = (ws as any)['!merges'] || [];
        const mergedChildren = new Set<string>();
        for (const m of merges) {
          for (let rr = m.s.r; rr <= m.e.r; rr++) {
            for (let cc = m.s.c; cc <= m.e.c; cc++) {
              if (rr === m.s.r && cc === m.s.c) continue;
              mergedChildren.add(XLSX.utils.encode_cell({ r: rr, c: cc }));
            }
          }
        }
        for (let r = 0; r < R; r++) {
          for (let c = 0; c < C; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            if (mergedChildren.has(addr)) continue;
            const val = aoa[r][c];
            const prev: any = ws[addr] ?? {};
            const next: any = { ...prev };
            const isFormulaText = typeof val === 'string' && val.startsWith('=');
            if (prev.f) {
              if (isFormulaText) next.f = String(val).slice(1);
            } else {
              if (isFormulaText) {
                next.f = String(val).slice(1);
                delete next.v; delete next.w;
              } else {
                next.v = typeof val === 'number' ? val : String(val ?? '');
              }
            }
            ws[addr] = next;
          }
        }
        ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(R - 1, 0), c: Math.max(C - 1, 0) } });
        const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const uploadUrl = await genUploadUrl();
        const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const up = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
        if (!up.ok) throw new Error(`Upload failed (${up.status})`);
        const { storageId } = await up.json();
        await finalizeExcel({ fileId: fileDoc.file._id, newStorageId: storageId, newFileSize: blob.size });
        toast.success('Saved sheet to workbook');
      } else {
        if (!fullHeaders || !fullRows) return;
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
      }
    } catch (e) {
      console.error(e);

      toast.error('Quick edit failed');
    }
  }, [fileDoc?.file, fileDoc?.storageUrl, isExcel, fullHeaders, fullRows, genUploadUrl, finalizeExcel, activeSheetIndex, workbookSheets, prepareCsvExport, csvStringFrom]);

  if (fileDoc === undefined) {
    return (
      <div className="mt-2 border border-[var(--border-color)] rounded-xl p-3 bg-[var(--bg-secondary)]">
        <div className="animate-pulse h-4 w-28 bg-[var(--bg-primary)] rounded mb-2" />
        <div className="space-y-2">
          <div className="h-3 bg-[var(--bg-primary)] rounded" />
          <div className="h-3 bg-[var(--bg-primary)] rounded w-5/6" />
        </div>
        <div className="text-[11px] text-[var(--text-tertiary)] mt-2">Loading preview…</div>
      </div>
    );
  }
  if (!fileDoc) return null;

  return (
    <div
      className="mt-1 rounded-md p-2 bg-[var(--bg-primary)] border border-[var(--border-color)]/60 transition-all relative z-10 pointer-events-auto"
      data-inline-editor="true"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="text-[11px] text-[var(--text-muted)]">Press Esc to close · Ctrl/Cmd+S to save</div>
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-[var(--text-muted)]">
            {saveHint === "saving" ? "Saving…" : saveHint === "saved" ? "Saved" : saveHint === "unsaved" ? "Unsaved changes" : ""}
          </div>
          <button
            onClick={() => { void handleSave(); }}
            disabled={saveHint !== "unsaved" || isSaving}
            className={`h-7 px-2 rounded-md flex items-center justify-center border text-[11px] ${saveHint === "unsaved" && !isSaving ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] hover:opacity-90" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] opacity-70 cursor-not-allowed"}`}
            title="Save changes"
          >
            <span className="inline-flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Save</span>
          </button>
          <button
            onClick={() => { void handleSaveSubset({ headers: subsetHeaders, rows: subsetRows }); }}
            disabled={subsetHeaders.length === 0}
            className={`h-7 px-2 rounded-md flex items-center justify-center border text-[11px] ${subsetHeaders.length > 0 ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] hover:opacity-90" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] opacity-70 cursor-not-allowed"}`}
            title={isExcel ? "Save sheet to workbook" : "Export CSV"}
          >
            <span className="inline-flex items-center gap-1"><Save className="w-3.5 h-3.5" /> {isExcel ? "Save Sheet" : "Export CSV"}</span>
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

      <div className="mb-2 grid grid-cols-2 gap-2">
        <div>
          <label className="sr-only">Document title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-7 text-xs bg-transparent border border-[var(--border-color)]/60 rounded-md px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
            placeholder="Title"
          />
        </div>
        <div>
          <label className="sr-only">File name</label>
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full h-7 text-xs bg-transparent border border-[var(--border-color)]/60 rounded-md px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
            placeholder="File name"
          />
        </div>
      </div>

        {/* Spreadsheet grid */}
        {subsetHeaders.length > 0 && (
          <div className="mini-grid text-[11px]">
            <div className="max-h-[300px] overflow-auto rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)]">
              <div className="p-1">
                <Spreadsheet
                  data={subsetRows.map((r) => r.map((c) => ({ value: c })))}
                  columnLabels={subsetHeaders}
                  onChange={(d: any[][]) => {
                    setSubsetRows(d.map((row) => row.map((cell: any) => String(cell?.value ?? ""))));
                    setSaveHint("unsaved");
                  }}
                />
              </div>
            </div>
      {/* Workbook sheet tabs (Excel) */}
      {isExcel && workbookSheets.length > 1 && (
        <div className="mb-2 flex items-center gap-1 overflow-x-auto">
          {workbookSheets.map((s, i) => (
            <button
              key={`${s.name}-${i}`}
              onClick={() => { setActiveSheetIndex(i); setSubsetHeaders(workbookSheets[i].csv.headers); setSubsetRows(workbookSheets[i].csv.rows); }}
              className={`px-2 py-1 text-[11px] rounded ${i === activeSheetIndex ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)]' : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}
              title={s.name}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

          </div>
        )}

    </div>
  );
}
