import { useQuery } from "convex/react";
import { useRef, useState, useMemo } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { PanelGroup, Panel, PanelResizeHandle, type ImperativePanelGroupHandle, type ImperativePanelHandle } from "react-resizable-panels";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  // Panel state
  const DEFAULT_H_LAYOUT = [65, 35] as const;
  const hGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const galleryPanelRef = useRef<ImperativePanelHandle>(null);
  const lastGallerySizeRef = useRef<number>(DEFAULT_H_LAYOUT[1]);
  const [galleryCollapsed, setGalleryCollapsed] = useState(false);
  const [highlightedSection, setHighlightedSection] = useState<'videos' | 'images' | 'documents' | null>(null);

  const onHorizontalLayout = (sizes: number[]) => {
    lastGallerySizeRef.current = sizes[1] ?? lastGallerySizeRef.current;
    setGalleryCollapsed((sizes[1] ?? 0) < 5);
  };

  const resetHorizontal = () => {
    hGroupRef.current?.setLayout?.([...DEFAULT_H_LAYOUT]);
  };

  const toggleGallery = () => {
    const size = galleryPanelRef.current?.getSize?.() ?? 0;
    if (size < 5) {
      const target = lastGallerySizeRef.current || DEFAULT_H_LAYOUT[1];
      hGroupRef.current?.setLayout?.([Math.max(0, 100 - target), Math.min(100, target)]);
      galleryPanelRef.current?.expand?.();
    } else {
      lastGallerySizeRef.current = size;
      galleryPanelRef.current?.collapse?.();
    }
  };

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

          {/* Right Panel: Media Gallery */}
          <Panel ref={galleryPanelRef} defaultSize={35} minSize={0} collapsible>
            <div className="h-full border-l border-[var(--border-color)] p-4 overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-[var(--text-primary)]">Media Gallery</h4>
                <button
                  onClick={toggleGallery}
                  className="p-1 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]"
                  title={galleryCollapsed ? 'Expand Media Gallery' : 'Collapse Media Gallery'}
                >
                  {galleryCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              </div>
              <div className="min-h-[240px]">
                <DossierMediaGallery
                  videos={extractedMedia.videos}
                  images={extractedMedia.images}
                  documents={extractedMedia.documents}
                  highlightedSection={highlightedSection}
                />
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

