import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { 
  Loader2,
  Eye,
  Download,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  Save,
  FileDown,
  Star,
  Share,
  MoreHorizontal,
  Globe,
  Lock,
  WrapText,
} from 'lucide-react';
import { PresenceIndicator } from './PresenceIndicator';
import { ZoomState, ZoomControls } from '../hooks/useZoom';
import { ZoomControls as ZoomControlsComponent } from './ZoomControls';

import EditorJS from '@editorjs/editorjs';
import Table from '@editorjs/table';
import Papa from 'papaparse';

interface SpreadsheetViewProps {
  documentId: Id<"documents">;
  isGridMode?: boolean;
  isFullscreen?: boolean;
  zoomState?: ZoomState;
  zoomControls?: ZoomControls;
}

interface CSVData {
  headers: string[];
  rows: string[][];
}

// (manual table sort/editing interfaces removed)

interface ModifiedCell {
  row: number;
  col: number;
  originalValue: string;
  newValue: string;
}

// (manual table comment interface removed)

export const SpreadsheetView: React.FC<SpreadsheetViewProps> = ({ 
  documentId, 
  isGridMode = false, 
  isFullscreen = false,
  zoomState,
  zoomControls
}) => {
  const fileDocument = useQuery(api.fileDocuments.getFileDocument, { documentId });
  const exportCsvMutation = useMutation(api.files.prepareCsvExport);
  const genUploadUrl = useMutation(api.files.generateUploadUrl);
  const finalizeCsv = useMutation(api.files.finalizeCsvReplace);


  
  // Document header functionality
  const updateDocument = useMutation(api.documents.update);
  const userId = useQuery(api.presence.getUserId);
  
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  // (manual table search/sort/pagination/editing state removed)
  
  // Advanced features state
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveHint, setSaveHint] = useState<'idle'|'unsaved'|'saving'|'saved'>('idle');
  const autoSaveTimer = useRef<number | null>(null);
  const lastSavedCsvStringRef = useRef<string | null>(null);
  
  // Document header state
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [title, setTitle] = useState(fileDocument?.document?.title || '');
  const [wrapCells, setWrapCells] = useState(false);
  
  // (manual table column resizing state removed)

  // EditorJS Table state/refs
  const tableHolderRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const originalCsvRef = useRef<CSVData | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);

  // // NEW: Generate Workflow state
  // const [showWorkflow, setShowWorkflow] = useState(true);
  // const [companyCol, setCompanyCol] = useState<number | null>(null);
  // const [websiteCol, setWebsiteCol] = useState<number | null>(null);
  // const [industryCol, setIndustryCol] = useState<number | null>(null);
  // const [emailCol, setEmailCol] = useState<number | null>(null);
  // const [seedQuery, setSeedQuery] = useState<string>("AI startups last 7 days site:techcrunch.com OR site:news.ycombinator.com");
  // const [artifacts, setArtifacts] = useState<{
  //   rulesMd?: string;
  //   tasksMd?: string;
  //   urlsTxt?: string;
  //   prospectCsv?: string;
  // }>({});
  // const [generating, setGenerating] = useState(false);

  // (manual table comments state removed)

  // (manual table comment tooltip logic removed)

  // Update title when document changes
  useEffect(() => {
    if (fileDocument?.document?.title) {
      setTitle(fileDocument.document.title);
    }
  }, [fileDocument?.document?.title]);

  // (manual table column width initialization removed)

  // (manual table modifiedData initialization removed)

  // (manual table column resizing handlers removed)

  // Document header handlers
  const handleTitleSubmit = async () => {
    if (title.trim() !== fileDocument?.document?.title && fileDocument?.document) {
      await updateDocument({ id: fileDocument.document._id, title: title.trim() || "Untitled" });
    }
    setIsEditing(false);
  };

  // Helpers to extract CSV from EditorJS Table and compute diffs
  const getCsvFromEditor = async (): Promise<CSVData | null> => {
    const ed = editorRef.current;
    if (!ed) return null;
    const output: any = await ed.save();
    const tableBlock = Array.isArray(output?.blocks) ? output.blocks.find((b: any) => b.type === 'table') : null;
    const content: string[][] = tableBlock?.data?.content || [];
    if (!content || content.length === 0) return { headers: [], rows: [] };
    const headers = content[0] || [];
    const rows = content.slice(1) || [];
    return { headers, rows };
  };

  const csvToString = (csv: CSVData): string => {
    return Papa.unparse([csv.headers, ...csv.rows], { quotes: false, newline: "\n" });
  };

  const computeDiff = (orig: CSVData | null, curr: CSVData): ModifiedCell[] => {
    if (!orig) {
      // Mark all non-empty cells as new
      const diffs: ModifiedCell[] = [];
      for (let r = 0; r < curr.rows.length; r++) {
        const row = curr.rows[r];
        for (let c = 0; c < Math.max(curr.headers.length, row.length); c++) {
          const nv = row[c] ?? '';
          if (nv) diffs.push({ row: r, col: c, originalValue: '', newValue: nv });
        }
      }
      return diffs;
    }
    const diffs: ModifiedCell[] = [];
    const maxRows = Math.max(orig.rows.length, curr.rows.length);
    const maxCols = Math.max(orig.headers.length, curr.headers.length);
    for (let r = 0; r < maxRows; r++) {
      for (let c = 0; c < maxCols; c++) {
        const ov = orig.rows[r]?.[c] ?? '';
        const nv = curr.rows[r]?.[c] ?? '';
        if (ov !== nv) diffs.push({ row: r, col: c, originalValue: ov, newValue: nv });
      }
    }
    return diffs;
  };

  const handleSaveChanges = useCallback(async (fromAuto: boolean = false) => {
    if (!fileDocument?.file?._id) {
      toast.error('No file to save');
      return;
    }
    setIsSaving(true);
    setSaveHint('saving');
    try {
      const currentCsv = await getCsvFromEditor();
      if (!currentCsv) {
        toast.error('Nothing to save');
        setSaveHint('idle');
        return;
      }
      const csvContent = csvToString(currentCsv);
      if (fromAuto && lastSavedCsvStringRef.current === csvContent) {
        setSaveHint('idle');
        return;
      }
      const diffs = computeDiff(originalCsvRef.current, currentCsv);
      // Upload new bytes and finalize
      const uploadUrl = await genUploadUrl();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: blob });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const { storageId } = await res.json();
      if (!storageId) throw new Error('Upload did not return storageId');
      await finalizeCsv({ fileId: fileDocument.file._id, newStorageId: storageId, newFileSize: blob.size, modifiedCells: diffs });
      if (!fromAuto) toast.success(`Saved ${diffs.length} changes to ${fileDocument.file.fileName}`);
      originalCsvRef.current = currentCsv;
      lastSavedCsvStringRef.current = csvContent;
      setSaveHint('saved');
      window.setTimeout(() => setSaveHint('idle'), 1200);
    } catch (error) {
      console.error('Save failed:', error);
      if (!fromAuto) toast.error('Failed to save changes: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setSaveHint('unsaved');
    } finally { setIsSaving(false); }
  }, [fileDocument?.file?._id, fileDocument?.file?.fileName, genUploadUrl, finalizeCsv]);

  // Keyboard shortcut: Ctrl/Cmd+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';
      if (isSave) {
        e.preventDefault();
        void handleSaveChanges(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSaveChanges]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void handleTitleSubmit();
    if (e.key === "Escape") {
      setTitle(fileDocument?.document?.title || '');
      setIsEditing(false);
    }
  };

  const handleTogglePublic = async () => {
    if (fileDocument?.document) {
      await updateDocument({ id: fileDocument.document._id, isPublic: !fileDocument.document.isPublic });
    }
  };

  const handleToggleFavorite = async () => {
    if (fileDocument?.document) {
      console.log('Toggle favorite functionality to be implemented');
    }
  };

  // Load CSV data
  useEffect(() => {
    if (fileDocument?.file && fileDocument.document.fileType === 'csv' && fileDocument.storageUrl) {
      setCsvLoading(true);
      setCsvError(null);
      fetch(fileDocument.storageUrl)
        .then(response => response.text())
        .then(csvText => {
          try {
            const parsed = Papa.parse<string[]>(csvText, { delimiter: ",", newline: "\n", quoteChar: '"', escapeChar: '"', skipEmptyLines: false });
            if (parsed.errors && parsed.errors.length > 0) {
              console.warn('CSV parse warnings:', parsed.errors);
            }
            const rowsAll = (parsed.data || []).map((r: string[]) => r.map((c: string) => (c ?? '')));
            if (rowsAll.length === 0) throw new Error('Empty CSV file');
            const headers = rowsAll[0] || [];
            const rows = rowsAll.slice(1);
            const csv: CSVData = { headers, rows };
            setCsvData(csv);
            originalCsvRef.current = csv;
            lastSavedCsvStringRef.current = Papa.unparse([headers, ...rows], { quotes: false, newline: "\n" });
          } catch (error) {
            setCsvError(error instanceof Error ? error.message : 'Failed to parse CSV');
          }
        })
        .catch(() => setCsvError('Failed to load CSV file'))
        .finally(() => setCsvLoading(false));
    }
  }, [fileDocument]);

  // Initialize EditorJS Table when CSV data is ready
  useEffect(() => {
    if (!csvData || !tableHolderRef.current) return;
    let destroyed = false;
    const init = async () => {
      try {
        // Destroy previous editor if present
        if (editorRef.current) {
          try { await editorRef.current.isReady; } catch { /* noop */ }
          try { editorRef.current.destroy(); } catch { /* noop */ }
          editorRef.current = null;
        }
        setEditorError(null);
        // Normalize content so every row has the same number of columns.
        // EditorJS Table expects a rectangular matrix; if rows are jagged
        // the plugin can crash attempting to set innerHTML on an undefined cell.
        const maxCols = Math.max(
          1,
          csvData.headers?.length ?? 0,
          ...csvData.rows.map((r) => r?.length ?? 0),
        );
        const normalizedHeaders = Array.from({ length: maxCols }, (_, i) => {
          const val = csvData.headers?.[i];
          return typeof val === 'string' ? val : '';
        });
        const normalizedRows = csvData.rows.map((row) =>
          Array.from({ length: maxCols }, (_, i) => {
            const v = row?.[i];
            return typeof v === 'string' ? v : v == null ? '' : String(v);
          }),
        );
        // Ensure at least one row so columns are visible even for empty CSVs
        if (normalizedRows.length === 0) {
          normalizedRows.push(Array.from({ length: maxCols }, () => ''));
        }

        const data = {
          time: Date.now(),
          blocks: [
            {
              type: 'table',
              data: {
                withHeadings: true,
                content: [normalizedHeaders, ...normalizedRows],
              },
            },
          ],
        } as any;
        const holderEl = tableHolderRef.current as HTMLElement;
        const ed = new EditorJS({
          holder: holderEl,
          minHeight: 300,
          autofocus: false,
          data,
          tools: {
            table: {
              class: Table,
              inlineToolbar: true,
            },
          },
          onReady: () => {
            if (!destroyed) {
              setEditorReady(true);
              // Verify a table actually rendered with cells; otherwise show fallback
              setTimeout(() => {
                const holder = tableHolderRef.current;
                if (!holder) return;
                const tableEl = holder.querySelector('table');
                const cellCount = tableEl ? tableEl.querySelectorAll('th,td').length : 0;
                if (!tableEl || cellCount === 0) {
                  setEditorError('Table rendered with no columns/cells');
                } else {
                  setEditorError(null);
                }
              }, 0);
            }
          },
          onChange: () => {
            // Mark unsaved and start/restart the autosave timer
            setSaveHint(prev => (prev === 'saving' ? prev : 'unsaved'));
            if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
            autoSaveTimer.current = window.setTimeout(() => {
              // Fire-and-forget; errors are surfaced by saver toast logic
              void handleSaveChanges(true).catch(() => {});
            }, 2000);
          },
        });
        editorRef.current = ed;
      } catch (e) {
        console.error('Failed to init EditorJS Table', e);
        setEditorError(e instanceof Error ? e.message : 'Failed to initialize editor');
      }
    };
    void init();
    return () => {
      destroyed = true;
      setEditorReady(false);
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
      try { editorRef.current?.destroy?.(); } catch { /* noop */ }
      editorRef.current = null;
    };
  }, [csvData, handleSaveChanges]);

  // // Auto-map columns on load
  // useEffect(() => {
  //   if (!csvData) return;
  //   const lower = csvData.headers.map(h => h.toLowerCase());
  //   const find = (keys: string[]) => {
  //     for (let i = 0; i < lower.length; i++) {
  //       if (keys.some(k => lower[i].includes(k))) return i;
  //     }
  //     return null;
  //   };
  //   setCompanyCol(prev => prev ?? find(['company', 'name', 'org']));
  //   setWebsiteCol(prev => prev ?? find(['website', 'url', 'domain', 'link']));
  //   setIndustryCol(prev => prev ?? find(['industry', 'sector', 'category']));
  //   setEmailCol(prev => prev ?? find(['email', 'mail']));
  // }, [csvData]);

  // (manual table cell editing handlers removed)

  // (manual table commenting handlers removed)


  const handleExportCsv = async () => {
    if (!fileDocument?.file) { toast.error('No data to export'); return; }
    setIsExporting(true);
    try {
      const currentCsv = (await getCsvFromEditor()) ?? csvData;
      if (!currentCsv) { toast.error('No data to export'); return; }
      const csvContent = csvToString(currentCsv);
      const originalName = fileDocument.file.fileName;
      const baseName = originalName.replace(/\.csv$/i, '');
      const newFileName = `${baseName}_modified_${Date.now()}.csv`;

      await exportCsvMutation({ originalFileId: fileDocument.file._id, csvContent, newFileName });
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url; anchor.download = newFileName;
      window.document.body.appendChild(anchor); anchor.click();
      window.document.body.removeChild(anchor); URL.revokeObjectURL(url);
      toast.success(`Exported as ${newFileName}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export CSV: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally { setIsExporting(false); }
  };

  // (manual table row/column modification helpers removed)

  // (manual table filter/sort/paginate removed)

  // // ---------- Generate Workflow helpers ----------
  // const extractUrlsFromCol = (col: number | null, rows: string[][]): string[] => {
  //   if (col === null) return [];
  //   const urlRegex = /https?:\/\/[^\s/$.?#].[^\s"]*/gi;
  //   const set = new Set<string>();
  //   for (const r of rows) {
  //     const cell = (r[col] || '').trim();
  //     if (!cell) continue;
  //     // if cell already looks like a URL, use it; else scan for URLs
  //     if (/^https?:\/\//i.test(cell)) set.add(cell);
  //     else {
  //       const found = cell.match(urlRegex);
  //       if (found) found.forEach(u => set.add(u));
  //     }
  //   }
  //   return Array.from(set);
  // };

  // const buildRulesMd = () => {
  //   const nameH = companyCol != null ? csvData?.headers[companyCol] : 'Company';
  //   const industryH = industryCol != null ? csvData?.headers[industryCol] : 'Industry';
  //   return [
  //     `# Scoring Rules`,
  //     ``,
  //     `- **Primary key**: ${nameH}`,
  //     `- **Industry field**: ${industryH}`,
  //     `- Prefer companies with recent funding, clear ICP match, and active hiring.`,
  //     `- Disqualifiers: no website, stealth with zero signal, obvious non‑ICP.`,
  //     `- Signals: blog cadence, product pages, careers page.`,
  //     ``
  //   ].join('\n');
  // };

  // const buildTasksMd = () => [
  //   `# Tasks`,
  //   ``,
  //   `1. Use Tavily MCP to search initial candidates.`,
  //   `2. Extract website + metadata; append to spreadsheet.`,
  //   `3. Score per rules; export priority list.`,
  //   `4. Save URLs to Convex; schedule daily scrape.`,
  //   ``
  // ].join('\n');

  // const buildProspectCsv = (rows: string[][]) => {
  //   const cols: number[] = [];
  //   if (companyCol != null) cols.push(companyCol);
  //   if (websiteCol != null && websiteCol !== companyCol) cols.push(websiteCol);
  //   if (industryCol != null && !cols.includes(industryCol)) cols.push(industryCol);
  //   const headers = cols.map(i => csvData?.headers[i] ?? `Col${i}`);
  //   const outRows = rows.map(r => cols.map(i => r[i] ?? ''));
  //   const toCsv = (arr: string[][]) =>
  //     [headers.join(','), ...arr.map(row => row.map(cell =>
  //       (cell.includes(',') || cell.includes('"') || cell.includes('\n')) ? `"${cell.replace(/"/g,'""')}"` : cell
  //     ).join(','))].join('\n');
  //   return toCsv(outRows);
  // };

  // const generateArtifacts = async () => {
  //   if (!csvData) return;
  //   setGenerating(true);
  //   try {
  //     const u = extractUrlsFromCol(websiteCol, csvData.rows);
  //     const urlsTxt = u.join('\n');
  //     const rulesMd = buildRulesMd();
  //     const tasksMd = buildTasksMd();
  //     const prospectCsv = buildProspectCsv(csvData.rows);
  //     setArtifacts({ rulesMd, tasksMd, urlsTxt, prospectCsv });
  //     toast.success(`Generated artifacts • ${u.length} URLs`);
  //   } catch (e: any) {
  //     toast.error(e?.message || 'Failed to generate artifacts');
  //   } finally {
  //     setGenerating(false);
  //   }
  // };

  // const downloadText = (name: string, text?: string) => {
  //   if (!text || typeof document === 'undefined') return;
  //   const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement('a');
  //   a.href = url; a.download = name; a.click();
  //   URL.revokeObjectURL(url);
  // };



  // ---------- RENDER ----------
  if (!fileDocument) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading spreadsheet...
        </div>
      </div>
    );
  }

  const { document: docData, file, storageUrl } = fileDocument;

  if (csvLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-[var(--accent-primary)] animate-spin" />
          <div className="text-center">
            <p className="text-lg font-medium text-[var(--text-primary)]">Loading Spreadsheet</p>
            <p className="text-sm text-[var(--text-muted)]">Parsing CSV data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (csvError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-red-500">
          <AlertCircle className="h-8 w-8" />
          <div className="text-center">
            <p className="text-lg font-medium">Error Loading Spreadsheet</p>
            <p className="text-sm text-[var(--text-muted)]">{csvError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!csvData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileSpreadsheet className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-[var(--text-secondary)]">No spreadsheet data available</p>
        </div>
      </div>
    );
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] relative">
      {/* Scoped styles to improve table formatting and enable natural sizing */}
      <style>
        {`
        /* EditorJS Table formatting within spreadsheet view */
        .nb-spreadsheet .tc-table {
          width: max-content;
          border-collapse: collapse;
          table-layout: auto;
        }
        .nb-spreadsheet .tc-table th,
        .nb-spreadsheet .tc-table td {
          white-space: nowrap;
          padding: 6px 8px;
          border: 1px solid var(--border-color);
          min-width: 96px; /* ensure columns are visible even if empty */
          vertical-align: top;
        }
        /* When wrapping is enabled */
        .nb-spreadsheet.nb-wrap .tc-table th,
        .nb-spreadsheet.nb-wrap .tc-table td {
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        /* Sticky header support: thead for fallback, first row for EditorJS */
        .nb-spreadsheet .tc-table thead th {
          position: sticky;
          top: 0;
          background: var(--bg-primary);
          z-index: 2;
        }
        .nb-spreadsheet .tc-table tr:first-child th,
        .nb-spreadsheet .tc-table tr:first-child td {
          position: sticky;
          top: 0;
          background: var(--bg-primary);
          z-index: 1;
        }
        /* Allow EditorJS container to size to content */
        .nb-spreadsheet .codex-editor {
          max-width: none !important;
          width: max-content !important;
        }
        /* Reduce default EditorJS paddings for tighter spreadsheet look */
        .nb-spreadsheet .ce-block__content { padding: 0 !important; }
        .nb-spreadsheet .ce-toolbar__plus,
        .nb-spreadsheet .ce-toolbar__settings-btn { display: none; }
        .nb-spreadsheet .ce-block { margin: 0; }
        .nb-spreadsheet .codex-editor__redactor { padding: 0 !important; }
        `}
      </style>
      {/* Document header - only show in fullscreen mode or when not in grid mode */}
      {(!isGridMode || isFullscreen) && (
        <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {docData.isPublic ? (<Globe className="h-4 w-4 text-[var(--accent-green)]" />) : (<Lock className="h-4 w-4 text-[var(--text-muted)]" />)}
                <span className="text-sm text-[var(--text-secondary)]">{docData.isPublic ? "Public" : "Private"}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { void handleToggleFavorite(); }} className="p-2 hover:bg-[var(--bg-hover)] rounded-md transition-colors" title="Favorite">
                  <Star className="h-4 w-4 text-[var(--text-muted)]" />
                </button>
                <button className="p-2 hover:bg-[var(--bg-hover)] rounded-md transition-colors" title="Share">
                  <Share className="h-4 w-4 text-[var(--text-secondary)]" />
                </button>
                <div className="relative">
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-[var(--bg-hover)] rounded-md transition-colors" title="More options">
                    <MoreHorizontal className="h-4 w-4 text-[var(--text-secondary)]" />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg z-10">
                      <button onClick={() => { void handleTogglePublic(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-hover)] transition-colors">
                        {docData.isPublic ? "Make Private" : "Make Public"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 text-green-500" />
              {isEditing ? (
                <input
                  type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => { void handleTitleSubmit(); }} onKeyDown={handleKeyDown}
                  className="text-3xl font-bold text-[var(--text-primary)] bg-transparent border-b-2 border-[var(--accent-primary)] focus:outline-none flex-1"
                  autoFocus
                />
              ) : (
                <h1 className="text-3xl font-bold text-[var(--text-primary)] cursor-pointer hover:bg-[var(--bg-hover)] px-2 py-1 rounded flex-1" onClick={() => setIsEditing(true)}>
                  {docData.title}
                </h1>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 px-2">
              <div className="flex items-center gap-3">
                {userId ? (
                  <PresenceIndicator documentId={documentId} userId={userId} />
                ) : null}
                <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                  <span>{formatFileSize(file.fileSize)}</span>
                  <span>{csvData.rows.length.toLocaleString()} rows × {csvData.headers.length} columns</span>
                  {storageUrl && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => window.open(storageUrl, '_blank')} className="flex items-center gap-1 px-2 py-1 text-xs border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)] transition-colors">
                        <Eye className="h-3 w-3" /> Open
                      </button>
                      <a href={storageUrl} download={file.fileName} className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--accent-primary)] text-white rounded hover:bg-[var(--accent-primary)]/90 transition-colors">
                        <Download className="h-3 w-3" /> Download
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <span>updated</span>
                  <span>{docData.lastModified ? new Date(docData.lastModified).toLocaleDateString() : 'Never'}</span>
                  <span>{docData.lastModified ? new Date(docData.lastModified).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                  {userId && (<span className="text-[10px] text-[var(--text-muted)] opacity-60 italic" title={`User ID: ${userId}`}>by {userId.slice(-8)}</span>)}
                  <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full"></span>
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] opacity-75">
                  <span>created</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
    )}

    {/* Spreadsheet Controls (simplified) */}
    <div className="flex-shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWrapCells((w) => !w)}
            className="flex items-center gap-1 px-2 py-1 text-xs border border-[var(--border-color)] rounded hover:bg-[var(--bg-hover)] transition-colors"
            title={wrapCells ? 'Disable wrap' : 'Wrap cells'}
          >
            <WrapText className="h-3.5 w-3.5" /> {wrapCells ? 'Wrapped' : 'No wrap'}
          </button>
          <div className="text-[11px] text-[var(--text-muted)]">
            {saveHint === 'saving' ? 'Saving…' : saveHint === 'saved' ? 'Saved' : saveHint === 'unsaved' ? 'Unsaved changes' : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void handleSaveChanges()} disabled={isSaving} className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50" title="Save changes">
            {isSaving ? (<Loader2 className="h-4 w-4 animate-spin" />) : (<Save className="h-4 w-4" />)}
            Save
          </button>
          <button onClick={() => void handleExportCsv()} disabled={isExporting} className="flex items-center gap-2 px-3 py-2 text-sm border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50" title="Export CSV">
            {isExporting ? (<Loader2 className="h-4 w-4 animate-spin" />) : (<FileDown className="h-4 w-4" />)}
            Export
          </button>
        </div>
      </div>
    </div>

    {/* EditorJS Table Holder */}
    <div className={`flex-1 min-h-0 overflow-auto nb-spreadsheet ${wrapCells ? 'nb-wrap' : ''}`}>
      <div
        className="inline-block w-max"
        style={{
          transform: zoomState ? `scale(${zoomState.scale})` : undefined,
          transformOrigin: 'top left',
          minWidth: 'max-content',
        }}
      >
        <div ref={tableHolderRef} className="px-4 py-4" />
        {!editorReady && !editorError && (
          <div className="flex items-center gap-2 px-4 py-2 text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Initializing editor…
          </div>
        )}
        {editorError && (
          <div className="px-4 py-3">
            <div className="text-xs text-red-500 mb-2">Editor preview unavailable: {editorError}. Showing fallback preview.</div>
              {/* Fallback HTML table preview */}
              {(() => {
                const maxCols = Math.max(
                  1,
                  csvData.headers?.length ?? 0,
                  ...csvData.rows.map((r) => r?.length ?? 0),
                );
                const headers = Array.from({ length: maxCols }, (_, i) => csvData.headers?.[i] ?? '');
                const rows = (() => {
                  const r = csvData.rows.map((row) =>
                    Array.from({ length: maxCols }, (_, i) => row?.[i] ?? ''),
                  );
                  return r.length === 0 ? [Array.from({ length: maxCols }, () => '')] : r;
                })();
                return (
                  <div className="overflow-auto">
                    <table className="tc-table">
                      <thead>
                        <tr>
                          {headers.map((h, idx) => (
                            <th key={idx}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, ri) => (
                          <tr key={ri}>
                            {r.map((c, ci) => (
                              <td key={ci}>{c}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      
      {/* Zoom Controls - show when zoom props are available */}
      {zoomState && zoomControls && (
        <ZoomControlsComponent 
          zoomState={zoomState} 
          zoomControls={zoomControls} 
          position="bottom-right"
        />
      )}
    </div>
  );
};

export default SpreadsheetView;
