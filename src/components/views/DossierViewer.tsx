import { useQuery, useAction } from "convex/react";
import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { PanelGroup, Panel, PanelResizeHandle, type ImperativePanelGroupHandle, type ImperativePanelHandle } from "react-resizable-panels";
import { ChevronLeft, ChevronRight, Sparkles, Loader2, Video, Image as ImageIcon, FileText, Maximize2, Edit3 } from "lucide-react";
import { DossierMediaGallery } from "./dossier/DossierMediaGallery";
import { extractMediaFromTipTap, countMediaAssets, type TipTapDocument } from "./dossier/tipTapMediaExtractor";
import UnifiedEditor from "@/components/UnifiedEditor";
import type { VideoAsset, ImageAsset, DocumentAsset } from "./dossier/mediaExtractor";

type ViewMode = 'split' | 'unified';

interface DossierViewerProps {
  documentId: Id<"documents">;
  isGridMode?: boolean;
  isFullscreen?: boolean;
}

/**
 * DossierViewer - Flexible viewer for dossier documents with rich media
 *
 * Two view modes:
 * - Split Panel Mode (default): Left panel shows media gallery (65%), right panel shows transcript (35%)
 * - Unified Editor Mode: Full-width editable UnifiedEditor for direct content editing
 */
export function DossierViewer({ documentId, isGridMode = false, isFullscreen = false }: DossierViewerProps) {
  const document = useQuery(api.documents.getById, { documentId });
  const linkedAssets = useQuery(api.documents.getLinkedAssets, { dossierId: documentId });
  const analyzeFileWithGenAI = useAction(api.fileAnalysis.analyzeFileWithGenAI);

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  // Panel state - Horizontal (left/right)
  const DEFAULT_H_LAYOUT = [65, 35] as const;
  const hGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const researchPanelRef = useRef<ImperativePanelHandle>(null);
  const lastResearchSizeRef = useRef<number>(DEFAULT_H_LAYOUT[1]);
  const [researchCollapsed, setResearchCollapsed] = useState(false);

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

  const resetHorizontal = () => {
    hGroupRef.current?.setLayout?.([...DEFAULT_H_LAYOUT]);
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

  // Load default analysis prompt from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nb:dossierAnalysisPrompt');
      setAnalysisPrompt(
        saved || 'Analyze this content from the dossier and provide key insights, patterns, and actionable recommendations.'
      );
    } catch {
      setAnalysisPrompt('Analyze this content from the dossier and provide key insights, patterns, and actionable recommendations.');
    }
  }, []);

  // Parse TipTap content
  let tipTapContent: TipTapDocument | null = null;
  try {
    if (typeof document?.content === "string") {
      const parsed = JSON.parse(document.content);
      // Check if it's TipTap format (has type: "doc")
      if (parsed.type === "doc" && Array.isArray(parsed.content)) {
        tipTapContent = parsed as TipTapDocument;
      }
    }
  } catch (error) {
    console.error("Failed to parse dossier content:", error);
  }

  // Extract media assets from TipTap document
  const extractedMedia = useMemo(() => extractMediaFromTipTap(tipTapContent), [tipTapContent]);

  // Also extract linked assets from Convex (child docs under this dossier)
  const linkedMedia = useMemo(() => {
    const videos: VideoAsset[] = [];
    const images: ImageAsset[] = [];
    const documents: DocumentAsset[] = [];

    (linkedAssets ?? []).forEach((asset: any) => {
      const md = asset?.assetMetadata;
      const title: string = asset?.title || '';
      if (!md || !md.sourceUrl) return;

      const url: string = md.sourceUrl;
      switch (md.assetType) {
        case 'youtube': {
          // Parse videoId similar to mediaExtractor
          let videoId = '';
          if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('v=')[1]?.split('&')[0] || '';
          } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
          } else if (url.includes('youtube.com/embed/')) {
            videoId = url.split('embed/')[1]?.split('?')[0] || '';
          }
          if (videoId) {
            videos.push({
              type: 'youtube',
              videoId,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              title,
            });
          }
          break;
        }
        case 'image': {
          images.push({ type: 'image', url, caption: title, alt: title });
          break;
        }
        default: {
          // Treat other asset types as document links (pdf, sec-document, news, file, video)
          documents.push({ type: 'document', url, title: title || url, thumbnail: md.thumbnailUrl });
        }
      }
    });

    return { videos, images, documents };
  }, [linkedAssets]);

  // Merge both sources
  const mergedMedia = useMemo(() => ({
    videos: [...extractedMedia.videos, ...linkedMedia.videos],
    images: [...extractedMedia.images, ...linkedMedia.images],
    documents: [...extractedMedia.documents, ...linkedMedia.documents],
  }), [extractedMedia, linkedMedia]);

  const mediaCounts = useMemo(() => countMediaAssets(mergedMedia), [mergedMedia]);

  // Build selectable file list from merged media
  const selectableFiles = useMemo(() => {
    const files: Array<{ id: string; type: 'video' | 'image' | 'document'; title: string; asset: VideoAsset | ImageAsset | DocumentAsset }> = [];

    mergedMedia.videos.forEach((video, idx) => {
      files.push({
        id: `video-${idx}`,
        type: 'video',
        title: video.title || video.caption || `Video ${idx + 1}`,
        asset: video,
      });
    });

    mergedMedia.images.forEach((image, idx) => {
      files.push({
        id: `image-${idx}`,
        type: 'image',
        title: image.caption || image.alt || `Image ${idx + 1}`,
        asset: image,
      });
    });

    mergedMedia.documents.forEach((doc, idx) => {
      files.push({
        id: `document-${idx}`,
        type: 'document',
        title: doc.title || `Document ${idx + 1}`,
        asset: doc,
      });
    });

    return files;
  }, [mergedMedia]);

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

  // Helper function to render TipTap nodes as read-only content
  const renderTipTapNode = (node: any): React.ReactNode => {
    switch (node.type) {
      case 'heading': {
        const level = node.attrs?.level || 1;
        const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
        return <HeadingTag className={`text-${4 - level}xl font-bold mb-2`}>{renderContent(node.content)}</HeadingTag>;
      }

      case 'paragraph':
        return <p className="mb-2">{renderContent(node.content)}</p>;

      case 'blockquote':
        return <blockquote className="border-l-4 border-[var(--accent-primary)] pl-4 italic my-4">{renderContent(node.content)}</blockquote>;

      case 'codeBlock':
        return <pre className="bg-[var(--bg-secondary)] p-4 rounded my-4 overflow-x-auto"><code>{renderContent(node.content)}</code></pre>;

      case 'video': {
        const videoUrl = node.attrs?.url;
        if (videoUrl && videoUrl.includes('youtube')) {
          const videoId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
          if (videoId) {
            return (
              <div className="my-4 aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="YouTube video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            );
          }
        }
        return <div className="text-[var(--text-muted)] my-2">Video: {videoUrl}</div>;
      }

      case 'image':
        return <img src={node.attrs?.url} alt={node.attrs?.caption || 'Image'} className="max-w-full h-auto my-4 rounded" />;

      case 'file':
        return (
          <a href={node.attrs?.url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] hover:underline my-2 block">
            📄 {node.attrs?.name || node.attrs?.caption || 'Download file'}
          </a>
        );

      default:
        return null;
    }
  };

  // Click handler for document links with single/double click detection
  const handleDocumentLinkClick = useCallback((docId: Id<"documents">, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    const target = e.currentTarget;
    const clickCount = (e.detail || 1);

    if (clickCount === 1) {
      // Single click - show mini popover
      // Use the existing nodebench:showMentionPopover event that MainLayout listens to
      // Add data attribute so MainLayout can find the anchor element
      target.setAttribute('data-document-id', docId);

      window.dispatchEvent(
        new CustomEvent('nodebench:showMentionPopover', {
          detail: {
            documentId: docId
          }
        })
      );
    } else if (clickCount >= 2) {
      // Double click - open full document
      window.dispatchEvent(
        new CustomEvent('nodebench:openDocument', {
          detail: { documentId: docId }
        })
      );
    }
  }, []);

  const renderContent = (content: any[] | undefined): React.ReactNode => {
    if (!content) return null;
    return content.map((node, idx) => {
      if (node.type === 'text') {
        let text = node.text || '';
        if (node.marks) {
          for (const mark of node.marks) {
            if (mark.type === 'bold') text = <strong key={idx}>{text}</strong>;
            if (mark.type === 'italic') text = <em key={idx}>{text}</em>;
            if (mark.type === 'code') text = <code key={idx} className="bg-[var(--bg-secondary)] px-1 rounded">{text}</code>;
            if (mark.type === 'link') {
              const href = mark.attrs?.href;
              const isLocalDocument = href?.startsWith('/documents/');

              if (isLocalDocument) {
                // Local document link - handle with single/double click
                const docId = href.split('/documents/')[1] as Id<"documents">;
                text = (
                  <a
                    key={idx}
                    href={href}
                    className="text-[var(--accent-primary)] hover:underline cursor-pointer"
                    onClick={(e) => handleDocumentLinkClick(docId, e)}
                  >
                    {text}
                  </a>
                );
              } else {
                // External link - open in new tab
                text = (
                  <a
                    key={idx}
                    href={href}
                    className="text-[var(--accent-primary)] hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {text}
                  </a>
                );
              }
            }
          }
        }
        return text;
      }
      return renderTipTapNode(node);
    });
  };

  // If in unified editor mode, render full-width editor
  if (viewMode === 'unified') {
    return (
      <div className="h-full flex flex-col bg-[var(--bg-primary)]">
        {/* Header with view mode toggle */}
        <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {document?.title || 'Untitled Dossier'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span>{mediaCounts.total} media assets</span>
              </div>
            </div>
            <button
              onClick={() => setViewMode('split')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              title="Switch to split panel view"
            >
              <Maximize2 className="h-4 w-4" />
              <span>Split View</span>
            </button>
          </div>
        </div>

        {/* Full-width Unified Editor */}
        <div className="flex-1 overflow-hidden">
          <UnifiedEditor documentId={documentId} />
        </div>
      </div>
    );
  }

  // Default: Split panel mode
  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      {/* Header with view mode toggle */}
      <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {document?.title || 'Untitled Dossier'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Video className="h-3 w-3" />
              <span>{mediaCounts.videos}</span>
              <ImageIcon className="h-3 w-3 ml-2" />
              <span>{mediaCounts.images}</span>
              <FileText className="h-3 w-3 ml-2" />
              <span>{mediaCounts.documents}</span>
            </div>
          </div>
          <button
            onClick={() => setViewMode('unified')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            title="Switch to unified editor view"
          >
            <Edit3 className="h-4 w-4" />
            <span>Edit Mode</span>
          </button>
        </div>
      </div>

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
                videos={mergedMedia.videos}
                images={mergedMedia.images}
                documents={mergedMedia.documents}
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

              {/* Transcript Panel - Full height, no quick notes */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {tipTapContent ? (
                  <div className="prose prose-lg max-w-none">
                    <div className="text-[var(--text-primary)]">
                      {/* Render TipTap content as read-only text */}
                      {tipTapContent.content.map((node, idx) => (
                        <div key={idx} className="mb-4">
                          {renderTipTapNode(node)}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-[var(--text-muted)] py-8">
                    No transcript available
                  </div>
                )}
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
