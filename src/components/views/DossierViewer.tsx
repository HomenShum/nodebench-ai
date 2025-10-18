import { useQuery, useAction } from "convex/react";
import { useRef, useState, useMemo } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { PanelGroup, Panel, PanelResizeHandle, type ImperativePanelGroupHandle, type ImperativePanelHandle } from "react-resizable-panels";
import { ChevronLeft, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import UnifiedEditor from "@/components/UnifiedEditor";
import { DossierHeader } from "./dossier/DossierHeader";
import { DossierTranscript } from "./dossier/DossierTranscript";
import { DossierMediaGallery } from "./dossier/DossierMediaGallery";
import { extractMediaFromBlocks, countMediaAssets } from "./dossier/mediaExtractor";

interface DossierViewerProps {
  documentId: Id<"documents">;
  isGridMode?: boolean;
  isFullscreen?: boolean;
}

/**
 * DossierViewer - Split-panel viewer for chat session dossiers
 * Left panel: Chat transcript with lightweight media references
 * Right panel: Dedicated media gallery with videos, images, and documents
 */
export function DossierViewer({ documentId, isGridMode = false, isFullscreen = false }: DossierViewerProps) {
  const document = useQuery(api.documents.getById, { documentId });
  const analyzeWithGenAI = useAction(api.fileAnalysis.analyzeFileWithGenAI);

  // File analysis state
  const DEFAULT_ANALYSIS_PROMPT = `Analyze this dossier to extract structured tags and context.
- Domain/Subject area (e.g., finance, AI research)
- Key topics/themes (bullet list)
- Key people and organizations (with roles)
- Important entities (products, projects, places)
- Relationships between entities (who/what is related to whom/what, how)
- Timeline or phases if present
Return concise Markdown with sections and bullet lists. Avoid verbosity.`;
  const [analysisPrompt, setAnalysisPrompt] = useState<string>(() =>
    localStorage.getItem('nb:dossierAnalysisPrompt') || DEFAULT_ANALYSIS_PROMPT
  );
  const [savePromptDefault, setSavePromptDefault] = useState(false);
  const [showPromptPopover, setShowPromptPopover] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Horizontal panel state (left/right split)
  const DEFAULT_H_LAYOUT = [65, 35] as const;
  const hGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const lastRightSizeRef = useRef<number>(DEFAULT_H_LAYOUT[1]);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // Vertical panel state (media gallery / quick notes split in right panel)
  const DEFAULT_V_LAYOUT = [50, 50] as const;
  const vGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const galleryPanelRef = useRef<ImperativePanelHandle>(null);
  const lastGallerySizeRef = useRef<number>(DEFAULT_V_LAYOUT[0]);
  const [galleryCollapsed, setGalleryCollapsed] = useState(false);
  const [highlightedSection, setHighlightedSection] = useState<'videos' | 'images' | 'documents' | null>(null);

  // Horizontal layout (left/right split)
  const onHorizontalLayout = (sizes: number[]) => {
    lastRightSizeRef.current = sizes[1] ?? lastRightSizeRef.current;
    setRightPanelCollapsed((sizes[1] ?? 0) < 5);
  };

  const resetHorizontal = () => {
    hGroupRef.current?.setLayout?.([...DEFAULT_H_LAYOUT]);
  };

  const toggleRightPanel = () => {
    const size = rightPanelRef.current?.getSize?.() ?? 0;
    if (size < 5) {
      const target = lastRightSizeRef.current || DEFAULT_H_LAYOUT[1];
      hGroupRef.current?.setLayout?.([Math.max(0, 100 - target), Math.min(100, target)]);
      rightPanelRef.current?.expand?.();
    } else {
      lastRightSizeRef.current = size;
      rightPanelRef.current?.collapse?.();
    }
  };

  // Vertical layout (media gallery / quick notes split)
  const onVerticalLayout = (sizes: number[]) => {
    lastGallerySizeRef.current = sizes[0] ?? lastGallerySizeRef.current;
    setGalleryCollapsed((sizes[0] ?? 0) < 5);
  };

  const resetVertical = () => {
    vGroupRef.current?.setLayout?.([...DEFAULT_V_LAYOUT]);
  };

  const toggleGallery = () => {
    const size = galleryPanelRef.current?.getSize?.() ?? 0;
    if (size < 5) {
      const target = lastGallerySizeRef.current || DEFAULT_V_LAYOUT[0];
      vGroupRef.current?.setLayout?.([Math.min(100, target), Math.max(0, 100 - target)]);
      galleryPanelRef.current?.expand?.();
    } else {
      lastGallerySizeRef.current = size;
      galleryPanelRef.current?.collapse?.();
    }
  };

  // File analysis handler
  const handleRunAnalysis = async () => {
    if (!document) return;
    setIsAnalyzing(true);
    try {
      if (savePromptDefault) {
        localStorage.setItem('nb:dossierAnalysisPrompt', analysisPrompt);
      }
      // Analyze the dossier content
      const result = await analyzeWithGenAI({
        documentId,
        analysisPrompt,
      });
      setShowPromptPopover(false);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Early return if document is still loading
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

  const blocks = (editorJsContent && Array.isArray(editorJsContent.blocks)) ? editorJsContent.blocks : [];

  // Extract media assets (must be called before any early returns)
  const extractedMedia = useMemo(() => extractMediaFromBlocks(blocks), [blocks]);
  const mediaCounts = useMemo(() => countMediaAssets(extractedMedia), [extractedMedia]);

  // Show error if no valid content
  if (!editorJsContent || !Array.isArray(editorJsContent.blocks) || blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-[var(--text-secondary)]">No content available</p>
        </div>
      </div>
    );
  }

  // Handle media reference clicks
  const handleMediaClick = (type: 'video' | 'image' | 'document') => {
    // Expand gallery if collapsed
    if (galleryCollapsed) {
      const target = lastGallerySizeRef.current || DEFAULT_H_LAYOUT[1];
      hGroupRef.current?.setLayout?.([Math.max(0, 100 - target), Math.min(100, target)]);
      galleryPanelRef.current?.expand?.();
    }

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
          {/* Left Panel: Transcript */}
          <Panel defaultSize={65} minSize={35}>
            <div className="p-4 h-full min-h-0 overflow-hidden relative">
              <div className="h-full overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                  <DossierTranscript
                    blocks={blocks}
                    onMediaClick={handleMediaClick}
                  />
                </div>
              </div>
            </div>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle
            className="w-1 bg-[var(--border-color)] hover:bg-[var(--accent-primary)] transition-colors cursor-col-resize"
            onDoubleClick={resetHorizontal}
            title="Double-click to reset layout"
          />

          {/* Right Panel: Media Gallery + Quick Notes (Vertical Split) */}
          <Panel ref={rightPanelRef} defaultSize={35} minSize={0} collapsible>
            <div className="h-full border-l border-[var(--border-color)] bg-[var(--bg-primary)] flex flex-col">
              {/* Right Panel Header with Analysis Button */}
              <div className="flex-shrink-0 border-b border-[var(--border-color)] p-4 flex items-center justify-between">
                <h4 className="text-sm font-medium text-[var(--text-primary)]">Research Panel</h4>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowPromptPopover(!showPromptPopover)}
                      disabled={isAnalyzing}
                      className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-60"
                      title="Analyze dossier with AI"
                    >
                      {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </button>
                    {showPromptPopover && (
                      <div className="absolute z-20 right-0 mt-2 w-[360px] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg p-3">
                        <div className="text-sm font-medium mb-2 text-[var(--text-primary)]">Dossier analysis prompt</div>
                        <textarea
                          className="w-full h-28 text-xs p-2 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                          value={analysisPrompt}
                          onChange={(e) => setAnalysisPrompt(e.target.value)}
                        />
                        <div className="mt-2 flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                            <input type="checkbox" checked={savePromptDefault} onChange={(e) => setSavePromptDefault(e.target.checked)} />
                            Remember as default
                          </label>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setShowPromptPopover(false)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] hover:bg-[var(--bg-hover)]">Cancel</button>
                            <button onClick={() => void handleRunAnalysis()} className="px-2 py-1 text-xs rounded bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90">Analyze</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={toggleRightPanel}
                    className="p-1 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]"
                    title={rightPanelCollapsed ? 'Expand Research Panel' : 'Collapse Research Panel'}
                  >
                    {rightPanelCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Vertical Split: Media Gallery (top) / Quick Notes (bottom) */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <PanelGroup ref={vGroupRef} direction="vertical" autoSaveId="dossierViewer:v" onLayout={onVerticalLayout}>
                  {/* Media Gallery Panel */}
                  <Panel ref={galleryPanelRef} defaultSize={50} minSize={0} collapsible>
                    <div className="h-full overflow-y-auto border-b border-[var(--border-color)]">
                      <div className="flex items-center justify-between p-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                        <h5 className="text-xs font-medium text-[var(--text-primary)]">Media Gallery</h5>
                        <button
                          onClick={toggleGallery}
                          className="p-1 rounded hover:bg-[var(--bg-hover)]"
                          title={galleryCollapsed ? 'Expand' : 'Collapse'}
                        >
                          {galleryCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronRight className="h-3 w-3 rotate-90" />}
                        </button>
                      </div>
                      <div className="p-3">
                        <DossierMediaGallery
                          videos={extractedMedia.videos}
                          images={extractedMedia.images}
                          documents={extractedMedia.documents}
                          highlightedSection={highlightedSection}
                        />
                      </div>
                    </div>
                  </Panel>

                  {/* Resize Handle */}
                  <PanelResizeHandle
                    className="h-1 bg-[var(--border-color)] hover:bg-[var(--accent-primary)] transition-colors cursor-row-resize"
                    onDoubleClick={resetVertical}
                    title="Double-click to reset layout"
                  />

                  {/* Quick Notes Panel */}
                  <Panel defaultSize={50} minSize={0} collapsible>
                    <div className="h-full overflow-y-auto flex flex-col">
                      <div className="flex-shrink-0 p-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                        <h5 className="text-xs font-medium text-[var(--text-primary)]">Quick Notes</h5>
                      </div>
                      <div className="flex-1 min-h-0 overflow-hidden p-3">
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
    </div>
  );
}

