import React, { useState, useEffect } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import UnifiedEditor from "@/components/UnifiedEditor";
import { PanelGroup, Panel, PanelResizeHandle, type ImperativePanelGroupHandle, type ImperativePanelHandle } from "react-resizable-panels";
import {
  FileText,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  File,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  Table,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  StretchHorizontal,
  StretchVertical
} from 'lucide-react';
import Spreadsheet from 'react-spreadsheet';
import * as XLSX from 'xlsx';


// Build a display matrix from a worksheet, expanding merged cells so content shows up
function wsToDisplayAOA(ws: XLSX.WorkSheet): string[][] {
  const ref = (ws as any)['!ref'] || 'A1';
  const R = XLSX.utils.decode_range(ref);
  const rows = R.e.r - R.s.r + 1;
  const cols = R.e.c - R.s.c + 1;
  const out: string[][] = Array.from({ length: rows }, () => Array(cols).fill(""));
  // Fill from cells
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
  // Expand merges for display
  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = (ws as any)['!merges'] || [];
  for (const m of merges) {
    const vCell: any = (ws as any)[XLSX.utils.encode_cell(m.s)];
    const v = vCell?.v;
    if (v == null) continue;
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        const rr = r - R.s.r;
        const cc = c - R.s.c;
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
          out[rr][cc] = String(v);
        }
      }
    }
  }
  return out;
}


interface FileViewerProps {
  documentId: Id<"documents">;
  className?: string;
}

export const FileViewer: React.FC<FileViewerProps> = ({ documentId, className = "" }) => {
  const fileDocument = useQuery(api.fileDocuments.getFileDocument, { documentId });
  const analyzeWithGenAI = useAction(api.fileAnalysis.analyzeFileWithGenAI);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Shared configurable analysis prompt (matches SpreadsheetView behavior)
  const DEFAULT_ANALYSIS_PROMPT = `Analyze this file to extract structured tags and context.
- Domain/Subject area (e.g., finance, AI research)
- Key topics/themes (bullet list)
- Key people and organizations (with roles)
- Important entities (products, projects, places)
- Relationships between entities (who/what is related to whom/what, how)
- Timeline or phases if present
Return concise Markdown with sections and bullet lists. Avoid verbosity.`;
  const [analysisPrompt, setAnalysisPrompt] = useState<string>(() =>
    localStorage.getItem('nb:fileAnalysisPrompt') || DEFAULT_ANALYSIS_PROMPT
  );
  const [savePromptDefault, setSavePromptDefault] = useState(false);
  const [showPromptPopover, setShowPromptPopover] = useState(false);
  const handleOpenAnalysisPopover = () => setShowPromptPopover((s) => !s);
  const handleCloseAnalysisPopover = () => setShowPromptPopover(false);

  // Panel layout persistence and controls

  const DEFAULT_H_LAYOUT = [65, 35];


  const hGroupRef = React.useRef<ImperativePanelGroupHandle>(null);
  const notesPanelRef = React.useRef<ImperativePanelHandle>(null);
  const lastNotesSizeRef = React.useRef<number>(DEFAULT_H_LAYOUT[1]);
  const [notesCollapsed, setNotesCollapsed] = useState(false);

  // No explicit persistence needed for vertical group; we use autoSaveId on the PanelGroup
  const onHorizontalLayout = (sizes: number[]) => {
    lastNotesSizeRef.current = sizes[1] ?? lastNotesSizeRef.current;
    setNotesCollapsed((sizes[1] ?? 0) < 5);
  };

  const resetHorizontal = () => { hGroupRef.current?.setLayout?.(DEFAULT_H_LAYOUT); };
  const toggleNotes = () => {
    const size = notesPanelRef.current?.getSize?.() ?? 0;
    if (size < 5) {
      const target = lastNotesSizeRef.current || DEFAULT_H_LAYOUT[1];
      // Restore previous layout with the desired right panel size
      hGroupRef.current?.setLayout?.([Math.max(0, 100 - target), Math.min(100, target)]);
      notesPanelRef.current?.expand?.();
    } else {
      lastNotesSizeRef.current = size;
      notesPanelRef.current?.collapse?.();
    }
  };

  // Zoom controls for PDF/Image/Video
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 3;
  const ZOOM_STEP = 0.1;
  const [zoom, setZoom] = useState(1);
  const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit');
  const [fitAxis, setFitAxis] = useState<'height' | 'width'>('height');
  const canZoom = !!fileDocument && (fileDocument.document.fileType === 'pdf' || fileDocument.document.fileType === 'image' || fileDocument.document.fileType === 'video');
  const isImageOrVideo = !!fileDocument && (fileDocument.document.fileType === 'image' || fileDocument.document.fileType === 'video');
  const zoomIn = () => { setZoomMode('manual'); setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))); };
  // Spreadsheet data (for CSV/Excel inline preview)
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<any[][] | null>(null);

  const zoomOut = () => { setZoomMode('manual'); setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))); };
  const zoomFit = () => { setZoomMode('fit'); setZoom(1); };

  // Multi-sheet support for spreadsheet previews
  const [sheetList, setSheetList] = useState<Array<{ name: string; data: any[][] }>>([]);
  const [activeSheet, setActiveSheet] = useState(0);



  const handleRunAnalysis = async () => {
    try {
      if (!fileDocument?.file?._id) return;
      setIsAnalyzing(true);
      if (savePromptDefault) {
        try { localStorage.setItem('nb:fileAnalysisPrompt', analysisPrompt); } catch { /* noop */ }
      }
      const res: any = await analyzeWithGenAI({
        fileId: fileDocument.file._id,
        analysisPrompt,
        analysisType: fileDocument.document.fileType || "document",
      });
      const analysisText: string = (res && res.analysis) ? res.analysis : (fileDocument.file.analysis || "");
      const md = `### AI Analysis for ${fileDocument.file.fileName}\n\n${analysisText}`;
      try {
        window.dispatchEvent(new CustomEvent('nodebench:applyActions', {
          detail: { actions: [{ type: 'createNode', markdown: md }] },
        }));
      } catch { /* noop */ }
      try {
        window.dispatchEvent(new CustomEvent('nodebench:generateTags', {
          detail: { documentId },
        }));
      } catch { /* noop */ }
    } catch (e) {
      console.warn('[FileViewer] Analyze to notes failed', e);
      alert('Failed to analyze file with Gemini. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setShowPromptPopover(false);
    }
  };


  // Ensure PDFs use "fit" by default, or a specific zoom percent in manual mode
  const withPdfZoom = (url: string, mode: 'fit' | number) => {
    try {
      const sep = url.includes('#') ? '&' : '#';
      if (mode === 'fit') return `${url}${sep}zoom=page-fit`;
      const percent = Math.max(10, Math.min(500, Math.round(mode)));
      return `${url}${sep}zoom=${percent}`;
    } catch {
      return url;
    }
  };

  // Load CSV data when file is a CSV (and hydrate unified sheetData)
  useEffect(() => {
    if (fileDocument?.file && fileDocument.document.fileType === 'csv' && fileDocument.storageUrl) {
      setSheetLoading(true);
      setSheetError(null);
      setSheetData(null);

      fetch(fileDocument.storageUrl)
        .then(response => response.text())
        .then(csvText => {
          try {
            const lines = csvText.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
              throw new Error('Empty CSV file');
            }

            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const rows = lines.slice(1).map(line =>
              line.split(',').map(cell => cell.trim().replace(/"/g, ''))
            );

            const data = [headers, ...rows].map(r => r.map(c => ({ value: String(c ?? '') })));
            setSheetList([{ name: 'Sheet1', data }]);
            setActiveSheet(0);
            setSheetData(data);
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to parse CSV';
            setSheetError(msg);
          }
        })
        .catch(() => {
          setSheetError('Failed to load CSV file');
        })
        .finally(() => {
          setSheetLoading(false);
        });
    }
  }, [fileDocument]);
  // Load Excel data when file is an Excel spreadsheet (by type or extension)
  useEffect(() => {
    if (!fileDocument?.file || !fileDocument?.storageUrl) return;
    const name = (fileDocument.file.fileName || '').toLowerCase();
    const isExcel = (fileDocument.document.fileType === 'excel') || /\.xlsx?$/.test(name);
    if (!isExcel) return;
    setSheetLoading(true);
    setSheetError(null);
    setSheetData(null);
    void (async () => {
        try {
          const resp = await fetch(fileDocument.storageUrl!);
          const buf = await resp.arrayBuffer();
          const wb = XLSX.read(buf, { type: 'array' });
          const sheets = wb.SheetNames.map((name: string) => {
            const ws = wb.Sheets[name];
            const aoa = wsToDisplayAOA(ws);
            const data = aoa.map(r => r.map(c => ({ value: c })));
            return { name, data };
          });
          setSheetList(sheets);
          setActiveSheet(0);
          setSheetData(sheets[0]?.data ?? null);
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to load Excel';
          setSheetError(msg);
        } finally {
          setSheetLoading(false);
        }
      })();

  }, [fileDocument]);


  if (!fileDocument) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Loader2 strokeWidth={1.25} className="h-4 w-4 animate-spin" />
          Loading file...
        </div>
      </div>
    );
  }

  const { document, file, storageUrl } = fileDocument;
  // Resolve file type using stored type or filename extension
  const fileNameLower = String(file?.fileName || document.title || '').toLowerCase();
  const resolvedType: string = (() => {
    const ft = String(document.fileType || '').toLowerCase();
    if (["csv","excel","image","video","audio","pdf","text"].includes(ft)) return ft;
    if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) return 'excel';
    if (fileNameLower.endsWith('.csv')) return 'csv';
    if (fileNameLower.endsWith('.pdf')) return 'pdf';
    if (/\.(png|jpg|jpeg|webp|gif|svg)$/.test(fileNameLower)) return 'image';
    if (/\.(mp4|mov|webm|avi|mkv)$/.test(fileNameLower)) return 'video';
    if (/\.(mp3|wav|m4a|aac|flac|ogg)$/.test(fileNameLower)) return 'audio';
    return ft || 'file';
  })();


  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    // Align colors with global document themes for consistency across cards and viewers
    // csv/excel: emerald, image: cyan, video: violet (purple), audio: amber, pdf: red, text: gray
    switch (fileType) {
      case 'csv':
      case 'excel':
        return <Table className="h-8 w-8 text-emerald-500" />;
      case 'image':
        return <ImageIcon className="h-8 w-8 text-cyan-500" />;
      case 'video':
        return <FileVideo className="h-8 w-8 text-violet-500" />;
      case 'audio':
        return <FileAudio className="h-8 w-8 text-amber-500" />;
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'text':
        return <FileText className="h-8 w-8 text-gray-500" />;
      default:
        return <File className="h-8 w-8 text-[var(--text-muted)]" />;
    }
  };

  const renderFileContent = () => {
    switch (resolvedType) {
      case 'csv':
      case 'excel':
        return renderSpreadsheetContent();
      case 'image':
        return renderImageContent();
      case 'pdf':
        return renderPDFContent();
      case 'text':
        return renderTextContent();
      case 'video':
        return renderVideoContent();
      case 'audio':
        return renderAudioContent();
      default:
        return renderGenericContent();
    }
  };

  const renderSpreadsheetContent = () => {
    if (sheetLoading) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Loader2 strokeWidth={1.25} className="h-4 w-4 animate-spin" />
            Loading spreadsheet...
          </div>
        </div>
      );
    }

    if (sheetError) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle strokeWidth={1.25} className="h-4 w-4" />
            {sheetError}
          </div>
        </div>
      );
    }

    const currentData = sheetList.length > 0 ? (sheetList[activeSheet]?.data ?? null) : sheetData;
    if (!currentData) return null;

    return (
      <div className="w-full h-full min-h-0">
        {/* Sheet tabs for Excel workbooks */}
        {sheetList.length > 1 && (
          <div className="flex items-center gap-2 px-2 py-1 border-b border-[var(--border-color)] overflow-x-auto">
            {sheetList.map((s, i) => (
              <button
                key={`${s.name}-${i}`}
                onClick={() => setActiveSheet(i)}
                className={`px-2 py-1 text-xs rounded-md whitespace-nowrap ${i === activeSheet ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]' : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}
                title={s.name}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        <div className="w-full h-[calc(100%-2rem)] overflow-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-2">
          <Spreadsheet data={currentData} />
        </div>
      </div>
    );
  };

  const renderImageContent = () => {
    if (!storageUrl) return renderGenericContent();

    return (
      <div className="w-full h-full min-h-0 overflow-auto flex items-center justify-center">
        <div
          className={
            zoomMode === 'fit'
              ? (fitAxis === 'height' ? "inline-block h-full" : "inline-block w-full")
              : "inline-block"
          }
          style={zoomMode === 'manual' ? { transform: `scale(${zoom})`, transformOrigin: 'center' } : undefined}
        >
          <img
            src={storageUrl}
            alt={file.fileName}
            className={
              zoomMode === 'fit'
                ? (fitAxis === 'height'
                    ? "h-full w-auto object-contain rounded-lg border border-[var(--border-color)]"
                    : "w-full h-auto object-contain rounded-lg border border-[var(--border-color)]")
                : "max-w-none max-h-none object-contain rounded-lg border border-[var(--border-color)]"
            }
          />
        </div>
      </div>
    );
  };

  const renderPDFContent = () => {
    if (!storageUrl) return renderGenericContent();

    return (
      <div className="w-full h-full min-h-0">
        <iframe
          src={zoomMode === 'fit' ? withPdfZoom(storageUrl, 'fit') : withPdfZoom(storageUrl, Math.round(zoom * 100))}
          className="w-full h-full border border-[var(--border-color)] rounded-lg"
          title={file.fileName}
        />
      </div>
    );
  };

  const renderTextContent = () => {
    if (!storageUrl) return renderGenericContent();

    return (
      <div className="w-full h-full min-h-0">
        <iframe
          src={storageUrl}
          className="w-full h-full border border-[var(--border-color)] rounded-lg bg-white"
          title={file.fileName}
        />
      </div>
    );
  };

  const renderVideoContent = () => {
    if (!storageUrl) return renderGenericContent();

    return (
      <div className="w-full h-full min-h-0 overflow-auto flex items-center justify-center bg-black rounded-lg border border-[var(--border-color)]">
        <div
          className={
            zoomMode === 'fit'
              ? (fitAxis === 'height' ? "inline-block h-full" : "inline-block w-full")
              : "inline-block"
          }
          style={zoomMode === 'manual' ? { transform: `scale(${zoom})`, transformOrigin: 'center' } : undefined}
        >
          <video
            controls
            className={
              zoomMode === 'fit'
                ? (fitAxis === 'height'
                    ? "h-full w-auto object-contain rounded-lg"
                    : "w-full h-auto object-contain rounded-lg")
                : "max-w-none max-h-none rounded-lg"
            }
          >
            <source src={storageUrl} type={document.mimeType} />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    );
  };

  const renderAudioContent = () => {
    if (!storageUrl) return renderGenericContent();

    return (
      <div className="flex justify-center">
        <audio
          controls
          className="w-full max-w-md"
        >
          <source src={storageUrl} type={document.mimeType} />
          Your browser does not support the audio tag.
        </audio>
      </div>
    );
  };

  const renderGenericContent = () => {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-4">
        {getFileIcon(resolvedType || 'unknown')}
        <div className="text-center">
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            Preview not available for this file type
          </p>
          {storageUrl && (
            <a
              href={storageUrl}
              download={file.fileName}
              className="inline-flex items-center gap-2 text-sm text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download {file.fileName}
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full h-full bg-[var(--bg-primary)] ${className}`}>
      <div className="flex h-full flex-col">
        {/* Fixed header (constrained width to match app header) */}
        <div className="border-b border-[var(--border-color)]">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getFileIcon(resolvedType || 'unknown')}
                <div>
                  <h3 className="text-lg font-medium text-[var(--text-primary)]">
                    {document.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    <span>{formatFileSize(file.fileSize)}</span>
                    <span>{document.mimeType}</span>
                    {document.lastModified && (
                      <span>
                        Modified {new Date(document.lastModified).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canZoom && (
                  <div className="flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-sm p-1">
                    <button onClick={zoomOut} className="p-1 rounded-md hover:bg-[var(--bg-hover)]" title="Zoom out" disabled={zoomMode === 'manual' ? zoom <= ZOOM_MIN : false}>
                      <ZoomOut strokeWidth={1.25} className="h-4 w-4" />
                    </button>
                    <button onClick={zoomFit} className="p-1 rounded-md hover:bg-[var(--bg-hover)]" title="Fit to view">
                      <RotateCcw strokeWidth={1.25} className="h-4 w-4" />
                    </button>
                    {isImageOrVideo && (
                      <>
                        <button onClick={() => { setFitAxis('height'); setZoomMode('fit'); }} className={`p-1 rounded-md ${fitAxis === 'height' && zoomMode === 'fit' ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`} title="Fit height">
                          <StretchVertical strokeWidth={1.25} className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setFitAxis('width'); setZoomMode('fit'); }} className={`p-1 rounded-md ${fitAxis === 'width' && zoomMode === 'fit' ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]' : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`} title="Fit width">
                          <StretchHorizontal strokeWidth={1.25} className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button onClick={zoomIn} className="p-1 rounded-md hover:bg-[var(--bg-hover)]" title="Zoom in" disabled={zoomMode === 'manual' ? zoom >= ZOOM_MAX : false}>
                      <ZoomIn strokeWidth={1.25} className="h-4 w-4" />
                    </button>
                    <span className="ml-1 text-xs text-[var(--text-secondary)] px-1 py-0.5 rounded bg-[var(--bg-secondary)]/70">
                      {zoomMode === 'fit' ? (isImageOrVideo ? `Fit (${fitAxis === 'height' ? 'H' : 'W'})` : 'Fit') : `${Math.round(zoom * 100)}%`}
                    </span>
                  </div>
                )}

                <div className="relative">
                  <button
                    onClick={handleOpenAnalysisPopover}
                    disabled={isAnalyzing}
                    className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-60"
                    title="Analyze with Gemini and add to Quick notes"
                  >
                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </button>
                  {showPromptPopover && (
                    <div className="absolute z-20 right-0 mt-2 w-[360px] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg p-3">
                      <div className="text-sm font-medium mb-2 text-[var(--text-primary)]">File analysis prompt</div>
                      <textarea
                        className="w-full h-28 text-xs p-2 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                        value={analysisPrompt}
                        onChange={(e) => setAnalysisPrompt(e.target.value)}
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                          <input type="checkbox" checked={savePromptDefault} onChange={(e) => setSavePromptDefault(e.target.checked)} />
                          Remember as default
                        </label>
                        <div className="flex items-center gap-2">
                          <button onClick={handleCloseAnalysisPopover} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)]">Cancel</button>
                          <button onClick={() => void handleRunAnalysis()} className="px-2 py-1 text-xs rounded bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90">Analyze</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {storageUrl && (
                  <>
                    <button
                      onClick={() => window.open(storageUrl, '_blank')}
                      className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors"
                      title="Open in new tab"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <a
                      href={storageUrl}
                      download={file.fileName}
                      className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors"
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content area with horizontal split */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <PanelGroup ref={hGroupRef} direction="horizontal" autoSaveId="fileViewer:h" onLayout={onHorizontalLayout}>
            <Panel defaultSize={65} minSize={35}>
              <div className="p-4 h-full min-h-0 overflow-hidden relative">
                {renderFileContent()}
              </div>
            </Panel>
            <PanelResizeHandle
              className="w-1 bg-[var(--border-color)] hover:bg-[var(--accent-primary)] transition-colors cursor-col-resize"
              onDoubleClick={resetHorizontal}
              title="Double-click to reset layout"
            />
            <Panel ref={notesPanelRef} defaultSize={35} minSize={0} collapsible>
              <div className="h-full border-l border-[var(--border-color)] p-4 overflow-auto">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-[var(--text-primary)]">Quick notes</h4>
                  <button
                    onClick={toggleNotes}
                    className="p-1 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]"
                    title={notesCollapsed ? 'Expand Quick notes' : 'Collapse Quick notes'}
                  >
                    {notesCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
                <div className="min-h-[240px]">
                  <UnifiedEditor documentId={documentId} mode="quickNote" autoCreateIfEmpty />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </div>
      </div>
    </div>
  );
};

export default FileViewer;
