import { useQuery, useAction } from "convex/react";
import { useRef, useState, useMemo } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { PanelGroup, Panel, PanelResizeHandle, type ImperativePanelGroupHandle, type ImperativePanelHandle } from "react-resizable-panels";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Sparkles, Loader2, Video, Image as ImageIcon, FileText } from "lucide-react";
import { DossierHeader } from "./dossier/DossierHeader";
import { DossierTranscript } from "./dossier/DossierTranscript";
import { DossierMediaGallery } from "./dossier/DossierMediaGallery";
import { extractMediaFromBlocks, countMediaAssets } from "./dossier/mediaExtractor";
import UnifiedEditor from "@/components/UnifiedEditor";
import type { VideoAsset, ImageAsset, DocumentAsset } from "./dossier/mediaExtractor";

interface DossierViewerProps {
  documentId: Id<"documents">;
  isGridMode?: boolean;
  isFullscreen?: boolean;
}

/**
 * DossierViewer - Split-panel viewer for chat session dossiers
 * Left panel (65%): Media gallery with videos, images, and documents
 * Right panel (35%): Research panel with vertical split (transcript + quick notes)
 */
export function DossierViewer({ documentId, isGridMode = false, isFullscreen = false }: DossierViewerProps) {
  const document = useQuery(api.documents.getById, { documentId });
  const analyzeFileWithGenAI = useAction(api.fileAnalysis.analyzeFileWithGenAI);

  // Panel state - Horizontal (left/right)
  const DEFAULT_H_LAYOUT = [65, 35] as const;
  const hGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const researchPanelRef = useRef<ImperativePanelHandle>(null);
  const lastResearchSizeRef = useRef<number>(DEFAULT_H_LAYOUT[1]);
  const [researchCollapsed, setResearchCollapsed] = useState(false);

  // Panel state - Vertical (transcript/notes)
  const DEFAULT_V_LAYOUT = [50, 50] as const;
  const vGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const notesPanelRef = useRef<ImperativePanelHandle>(null);
  const lastNotesSizeRef = useRef<number>(DEFAULT_V_LAYOUT[1]);
  const [notesCollapsed, setNotesCollapsed] = useState(false);

  // Media highlighting
  const [highlightedSection, setHighlightedSection] = useState<'videos' | 'images' | 'documents' | null>(null);

  // Analysis state
  const [showAnalysisPopover, setShowAnalysisPopover] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [savePromptDefault, setSavePromptDefault] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });

  const onHorizontalLayout = (sizes: number[]) => {
    lastResearchSizeRef.current = sizes[1] ?? lastResearchSizeRef.current;
    setResearchCollapsed((sizes[1] ?? 0) < 5);
  };

  const onVerticalLayout = (sizes: number[]) => {
    lastNotesSizeRef.current = sizes[1] ?? lastNotesSizeRef.current;
    setNotesCollapsed((sizes[1] ?? 0) < 5);
  };

  const resetHorizontal = () => {
    hGroupRef.current?.setLayout?.([...DEFAULT_H_LAYOUT]);
  };

  const resetVertical = () => {
    vGroupRef.current?.setLayout?.([...DEFAULT_V_LAYOUT]);
  };

  const toggleResearch = () => {
    const size = researchPanelRef.current?.getSize?.() ?? 0;
    if (size < 5) {
      const target = lastResearchSizeRef.current || DEFAULT_H_LAYOUT[1];
      hGroupRef.current?.setLayout?.([Math.max(0, 100 - target), Math.min(100, target)]);
      researchPanelRef.current?.expand?.();
    } else {
      lastResearchSizeRef.current = size;
      researchPanelRef.current?.collapse?.();
    }
  };

  const toggleNotes = () => {
    const size = notesPanelRef.current?.getSize?.() ?? 0;
    if (size < 5) {
      const target = lastNotesSizeRef.current || DEFAULT_V_LAYOUT[1];
      vGroupRef.current?.setLayout?.([Math.max(0, 100 - target), Math.min(100, target)]);
      notesPanelRef.current?.expand?.();
    } else {
      lastNotesSizeRef.current = size;
      notesPanelRef.current?.collapse?.();
    }
  };

  // Load default analysis prompt from localStorage
  useMemo(() => {
    try {
      const saved = localStorage.getItem('nb:dossierAnalysisPrompt');
      if (saved) {
        setAnalysisPrompt(saved);
      } else {
        setAnalysisPrompt('Analyze this content from the dossier and provide key insights, patterns, and actionable recommendations.');
      }
    } catch {
      setAnalysisPrompt('Analyze this content from the dossier and provide key insights, patterns, and actionable recommendations.');
    }
  }, []);

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
      </div>
    );
  }

  // Parse EditorJS content
  let editorJsContent: any = null;
  try {
    if (typeof document.content === "string") {
      editorJsContent = JSON.parse(document.content);
    }
  } catch (error) {
    console.error("Failed to parse dossier content:", error);
  }

  if (!editorJsContent || !Array.isArray(editorJsContent.blocks)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-[var(--text-secondary)]">No content available</p>
        </div>
      </div>
    );
  }

  const blocks = editorJsContent.blocks;

  // Extract media assets
  const extractedMedia = useMemo(() => extractMediaFromBlocks(blocks), [blocks]);
  const mediaCounts = useMemo(() => countMediaAssets(extractedMedia), [extractedMedia]);

  // Build selectable file list
  const selectableFiles = useMemo(() => {
    const files: Array<{ id: string; type: 'video' | 'image' | 'document'; title: string; asset: VideoAsset | ImageAsset | DocumentAsset }> = [];

    extractedMedia.videos.forEach((video, idx) => {
      files.push({
        id: `video-${idx}`,
        type: 'video',
        title: video.caption || `Video ${idx + 1}`,
        asset: video,
      });
    });

    extractedMedia.images.forEach((image, idx) => {
      files.push({
        id: `image-${idx}`,
        type: 'image',
        title: image.caption || image.alt || `Image ${idx + 1}`,
        asset: image,
      });
    });

    extractedMedia.documents.forEach((doc, idx) => {
      files.push({
        id: `document-${idx}`,
        type: 'document',
        title: doc.title || `Document ${idx + 1}`,
        asset: doc,
      });
    });

    return files;
  }, [extractedMedia]);

  // Handle media reference clicks
  const handleMediaClick = (type: 'video' | 'image' | 'document') => {
    // Highlight the section
    const sectionMap = {
      video: 'videos' as const,
      image: 'images' as const,
      document: 'documents' as const,
    };
    setHighlightedSection(sectionMap[type]);

    // Clear highlight after 2 seconds
    setTimeout(() => setHighlightedSection(null), 2000);
  };

  // Handle analysis
  const handleAnalyze = async () => {
    if (selectedFiles.size === 0) {
      alert('Please select at least one file to analyze');
      return;
    }

    // Save prompt if requested
    if (savePromptDefault) {
      try {
        localStorage.setItem('nb:dossierAnalysisPrompt', analysisPrompt);
      } catch (error) {
        console.error('Failed to save prompt:', error);
      }
    }

    setIsAnalyzing(true);
    setAnalysisProgress({ current: 0, total: selectedFiles.size });

    const results: Array<{ file: string; analysis: string }> = [];
    let current = 0;

    // Analyze files in parallel
    const selectedFilesList = Array.from(selectedFiles).map(id =>
      selectableFiles.find(f => f.id === id)!
    );

    try {
      await Promise.all(
        selectedFilesList.map(async (file) => {
          try {
            // For URLs (videos and documents), use url parameter
            const isUrl = file.type === 'video' || file.type === 'document';
            const result = await analyzeFileWithGenAI({
              url: isUrl ? (file.asset as VideoAsset | DocumentAsset).url : undefined,
              analysisPrompt,
              analysisType: file.type,
            });

            if ((result as any)?.success) {
              results.push({
                file: file.title,
                analysis: (result as any).analysis,
              });
            }
          } catch (error) {
            console.error(`Failed to analyze ${file.title}:`, error);
            results.push({
              file: file.title,
              analysis: `Error: ${error instanceof Error ? error.message : 'Analysis failed'}`,
            });
          } finally {
            current++;
            setAnalysisProgress({ current, total: selectedFiles.size });
          }
        })
      );

      // TODO: Perform final synthesis with LLM
      // For now, just append results to notes

      setShowAnalysisPopover(false);
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress({ current: 0, total: 0 });
    }
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === selectableFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(selectableFiles.map(f => f.id)));
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <DossierHeader
        documentId={documentId}
        title={document.title}
        isPublic={document.isPublic}
        isFavorite={document.isFavorite}
        tags={(document as any).tags || []}
        videoCount={mediaCounts.videos}
        imageCount={mediaCounts.images}
        documentCount={mediaCounts.documents}
        messageCount={blocks.length}
      />

      {/* Split Panel Layout */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <PanelGroup
          ref={hGroupRef}
          direction="horizontal"
          autoSaveId="dossierViewer:h"
          onLayout={onHorizontalLayout}
        >
          {/* Left Panel: Media Gallery */}
          <Panel defaultSize={65} minSize={35}>
            <div className="h-full flex flex-col">
              <DossierMediaGallery
                videos={extractedMedia.videos}
                images={extractedMedia.images}
                documents={extractedMedia.documents}
                highlightedSection={highlightedSection}
              />
            </div>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle
            className="w-1 bg-[var(--border-color)] hover:bg-[var(--accent-primary)] transition-colors cursor-col-resize"
            onDoubleClick={resetHorizontal}
            title="Double-click to reset layout"
          />

          {/* Right Panel: Research Panel with Vertical Split */}
          <Panel ref={researchPanelRef} defaultSize={35} minSize={0} collapsible>
            <div className="h-full border-l border-[var(--border-color)] flex flex-col">
              {/* Research Panel Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                <h4 className="text-sm font-medium text-[var(--text-primary)]">Research Panel</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAnalysisPopover(!showAnalysisPopover)}
                    disabled={isAnalyzing || selectableFiles.length === 0}
                    className="p-1 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Analyze files"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" />
                    )}
                  </button>
                  <button
                    onClick={toggleResearch}
                    className="p-1 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]"
                    title={researchCollapsed ? 'Expand Research Panel' : 'Collapse Research Panel'}
                  >
                    {researchCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Vertical Split: Transcript + Notes */}
              <div className="flex-1 min-h-0">
                <PanelGroup
                  ref={vGroupRef}
                  direction="vertical"
                  autoSaveId="dossierViewer:v"
                  onLayout={onVerticalLayout}
                >
                  {/* Top: Transcript */}
                  <Panel defaultSize={50} minSize={20}>
                    <div className="h-full overflow-y-auto p-4">
                      <DossierTranscript
                        blocks={blocks}
                        onMediaClick={handleMediaClick}
                      />
                    </div>
                  </Panel>

                  {/* Vertical Resize Handle */}
                  <PanelResizeHandle
                    className="h-1 bg-[var(--border-color)] hover:bg-[var(--accent-primary)] transition-colors cursor-row-resize"
                    onDoubleClick={resetVertical}
                    title="Double-click to reset layout"
                  />

                  {/* Bottom: Quick Notes */}
                  <Panel ref={notesPanelRef} defaultSize={50} minSize={0} collapsible>
                    <div className="h-full border-t border-[var(--border-color)] p-4 overflow-auto">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-[var(--text-primary)]">Quick Notes</h4>
                        <button
                          onClick={toggleNotes}
                          className="p-1 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]"
                          title={notesCollapsed ? 'Expand Quick Notes' : 'Collapse Quick Notes'}
                        >
                          {notesCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
          </Panel>
        </PanelGroup>
      </div>

      {/* Analysis Popover */}
      {showAnalysisPopover && (
        <AnalysisPopover
          files={selectableFiles}
          selectedFiles={selectedFiles}
          onToggleFile={(id) => {
            const newSet = new Set(selectedFiles);
            if (newSet.has(id)) {
              newSet.delete(id);
            } else {
              newSet.add(id);
            }
            setSelectedFiles(newSet);
          }}
          onToggleAll={toggleSelectAll}
          analysisPrompt={analysisPrompt}
          onPromptChange={setAnalysisPrompt}
          savePromptDefault={savePromptDefault}
          onSaveDefaultChange={setSavePromptDefault}
          onAnalyze={handleAnalyze}
          onClose={() => setShowAnalysisPopover(false)}
          isAnalyzing={isAnalyzing}
          progress={analysisProgress}
        />
      )}
    </div>
  );
}

/**
 * Analysis Popover Component
 */
interface AnalysisPopoverProps {
  files: Array<{ id: string; type: 'video' | 'image' | 'document'; title: string; asset: any }>;
  selectedFiles: Set<string>;
  onToggleFile: (id: string) => void;
  onToggleAll: () => void;
  analysisPrompt: string;
  onPromptChange: (prompt: string) => void;
  savePromptDefault: boolean;
  onSaveDefaultChange: (save: boolean) => void;
  onAnalyze: () => void;
  onClose: () => void;
  isAnalyzing: boolean;
  progress: { current: number; total: number };
}

function AnalysisPopover({
  files,
  selectedFiles,
  onToggleFile,
  onToggleAll,
  analysisPrompt,
  onPromptChange,
  savePromptDefault,
  onSaveDefaultChange,
  onAnalyze,
  onClose,
  isAnalyzing,
  progress,
}: AnalysisPopoverProps) {
  const allSelected = selectedFiles.size === files.length && files.length > 0;

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4 text-red-600" />;
      case 'image':
        return <ImageIcon className="h-4 w-4 text-blue-600" />;
      case 'document':
        return <FileText className="h-4 w-4 text-green-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--bg-primary)] rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl border border-[var(--border-color)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h3 className="font-semibold text-[var(--text-primary)]">Analyze Dossier Files</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            title="Close"
          >
            <ChevronRight className="h-5 w-5 rotate-45" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* File Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Select Files ({selectedFiles.size} of {files.length})
              </label>
              <button
                onClick={onToggleAll}
                className="text-xs text-[var(--accent-primary)] hover:underline"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-[var(--border-color)] rounded-lg p-2">
              {files.map((file) => (
                <label
                  key={file.id}
                  className="flex items-center gap-2 p-2 hover:bg-[var(--bg-hover)] rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={() => onToggleFile(file.id)}
                    className="flex-shrink-0"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getFileIcon(file.type)}
                    <span className="text-sm text-[var(--text-primary)] truncate">{file.title}</span>
                    <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full flex-shrink-0">
                      {file.type}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Analysis Prompt */}
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] block mb-2">
              Analysis Prompt
            </label>
            <textarea
              value={analysisPrompt}
              onChange={(e) => onPromptChange(e.target.value)}
              className="w-full h-32 p-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              placeholder="Enter your analysis prompt..."
            />
          </div>

          {/* Save Default Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={savePromptDefault}
              onChange={(e) => onSaveDefaultChange(e.target.checked)}
              className="flex-shrink-0"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              Remember as default prompt
            </span>
          </label>

          {/* Progress */}
          {isAnalyzing && (
            <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]" />
                <span className="text-sm text-[var(--text-primary)]">
                  Analyzing {progress.current} of {progress.total} files...
                </span>
              </div>
              <div className="w-full bg-[var(--bg-primary)] rounded-full h-2">
                <div
                  className="bg-[var(--accent-primary)] h-2 rounded-full transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--border-color)]">
          <button
            onClick={onClose}
            disabled={isAnalyzing}
            className="px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || selectedFiles.size === 0}
            className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analyze
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
