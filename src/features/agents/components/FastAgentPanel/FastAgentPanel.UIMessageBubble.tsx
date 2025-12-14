// src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx
// Message bubble component optimized for UIMessage format from Agent component

import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Bot, Wrench, Image as ImageIcon, AlertCircle, Loader2, RefreshCw, Trash2, ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock, Copy, Check, BrainCircuit, Zap } from 'lucide-react';
import { useSmoothText, type UIMessage } from '@convex-dev/agent/react';
import { cn } from '@/lib/utils';
import type { FileUIPart, ToolUIPart } from 'ai';
import { YouTubeGallery, type YouTubeVideo, type SECDocument } from './MediaGallery';
import { MermaidDiagram } from './MermaidDiagram';
import { FileViewer, type FileViewerFile } from './FileViewer';
import { CompanySelectionCard, type CompanyOption } from './CompanySelectionCard';
import { PeopleSelectionCard, type PersonOption } from './PeopleSelectionCard';
import { EventSelectionCard, type EventOption } from './EventSelectionCard';
import { NewsSelectionCard, type NewsArticleOption } from './NewsSelectionCard';
import { RichMediaSection } from './RichMediaSection';
import { extractMediaFromText, removeMediaMarkersFromText } from './utils/mediaExtractor';
import { GoalCard, type TaskStatusItem } from './FastAgentPanel.GoalCard';
import { DocumentActionGrid, extractDocumentActions, removeDocumentActionMarkers } from './DocumentActionCard';
import {
  ArbitrageCitation,
  StatusBadge,
  parseArbitrageCitation,
  parseLegacyCitation,
  type ArbitrageStatus
} from './FastAgentPanel.VisualCitation';
import { ArbitrageReportCard } from './ArbitrageReportCard';
import { MemoryPill } from './MemoryPill';
import { FusedSearchResults, type FusedResult, type SourceError, type SearchSource } from './FusedSearchResults';

interface FastAgentUIMessageBubbleProps {
  message: UIMessage;
  onMermaidRetry?: (error: string, code: string) => void;
  onRegenerateMessage?: () => void;
  onDeleteMessage?: () => void;
  onCompanySelect?: (company: CompanyOption) => void;
  onPersonSelect?: (person: PersonOption) => void;
  onEventSelect?: (event: EventOption) => void;
  onNewsSelect?: (article: NewsArticleOption) => void;
  onDocumentSelect?: (documentId: string) => void;
  isParent?: boolean; // Whether this message has child messages
  isChild?: boolean; // Whether this is a child message (specialized agent)
  agentRole?: 'coordinator' | 'documentAgent' | 'mediaAgent' | 'secAgent' | 'webAgent';
}

/**
 * Image component with loading and error states
 */
function SafeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <div className="text-sm text-[var(--text-primary)]">
          <div className="font-medium">Failed to load image</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">The file may be too large or unavailable</div>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-xs mt-1 inline-block"
          >
            Try opening directly
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-tertiary)] rounded">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(className, loading && 'opacity-0')}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </div>
  );
}

/**
 * Helper to render tool output with markdown support and gallery layout for images, videos, and SEC documents
 */
function ToolOutputRenderer({
  output,
  onCompanySelect,
  onPersonSelect,
  onEventSelect,
  onNewsSelect,
}: {
  output: unknown;
  onCompanySelect?: (company: CompanyOption) => void;
  onPersonSelect?: (person: PersonOption) => void;
  onEventSelect?: (event: EventOption) => void;
  onNewsSelect?: (article: NewsArticleOption) => void;
}) {
  const outputText = typeof output === 'string' ? output : JSON.stringify(output, null, 2);

  // Extract YouTube gallery data
  const youtubeMatch = outputText.match(/<!-- YOUTUBE_GALLERY_DATA\n([\s\S]*?)\n-->/);
  const youtubeVideos: YouTubeVideo[] = youtubeMatch ? JSON.parse(youtubeMatch[1]) : [];

  // Extract SEC gallery data
  const secMatch = outputText.match(/<!-- SEC_GALLERY_DATA\n([\s\S]*?)\n-->/);
  const secDocuments: SECDocument[] = secMatch ? JSON.parse(secMatch[1]) : [];

  // Convert SEC documents to FileViewer format
  const fileViewerFiles: FileViewerFile[] = secDocuments.map(doc => ({
    url: doc.viewerUrl || doc.documentUrl,
    fileType: doc.documentUrl.endsWith('.pdf') ? 'pdf' : 'html' as 'pdf' | 'html' | 'txt',
    title: doc.title,
    metadata: {
      formType: doc.formType,
      date: doc.filingDate,
      source: 'SEC EDGAR',
      accessionNumber: doc.accessionNumber,
    },
  }));

  // Extract company selection data
  const companySelectionMatch = outputText.match(/<!-- COMPANY_SELECTION_DATA\n([\s\S]*?)\n-->/);
  const companySelectionData: { prompt: string; companies: CompanyOption[] } | null = companySelectionMatch
    ? JSON.parse(companySelectionMatch[1])
    : null;

  // Extract people selection data
  const peopleSelectionMatch = outputText.match(/<!-- PEOPLE_SELECTION_DATA\n([\s\S]*?)\n-->/);
  const peopleSelectionData: { prompt: string; people: PersonOption[] } | null = peopleSelectionMatch
    ? JSON.parse(peopleSelectionMatch[1])
    : null;

  // Extract event selection data
  const eventSelectionMatch = outputText.match(/<!-- EVENT_SELECTION_DATA\n([\s\S]*?)\n-->/);
  const eventSelectionData: { prompt: string; events: EventOption[] } | null = eventSelectionMatch
    ? JSON.parse(eventSelectionMatch[1])
    : null;

  // Extract news selection data
  const newsSelectionMatch = outputText.match(/<!-- NEWS_SELECTION_DATA\n([\s\S]*?)\n-->/);
  const newsSelectionData: { prompt: string; articles: NewsArticleOption[] } | null = newsSelectionMatch
    ? JSON.parse(newsSelectionMatch[1])
    : null;

  // Check if this output contains multiple images (for gallery layout)
  const imageMatches = outputText.match(/!\[.*?\]\(.*?\)/g) || [];
  const imageCount = imageMatches.length;
  const hasMultipleImages = imageCount > 2;

  // Extract image URLs for gallery
  const imageUrls = imageMatches.map(match => {
    const urlMatch = match.match(/\((.*?)\)/);
    const altMatch = match.match(/!\[(.*?)\]/);
    return {
      url: urlMatch?.[1] || '',
      alt: altMatch?.[1] || 'Image'
    };
  });

  // Remove gallery data markers and all selection data from content
  const cleanedContent = outputText
    .replace(/<!-- YOUTUBE_GALLERY_DATA\n[\s\S]*?\n-->\n*/g, '')
    .replace(/<!-- SEC_GALLERY_DATA\n[\s\S]*?\n-->\n*/g, '')
    .replace(/<!-- COMPANY_SELECTION_DATA\n[\s\S]*?\n-->\n*/g, '')
    .replace(/<!-- PEOPLE_SELECTION_DATA\n[\s\S]*?\n-->\n*/g, '')
    .replace(/<!-- EVENT_SELECTION_DATA\n[\s\S]*?\n-->\n*/g, '')
    .replace(/<!-- NEWS_SELECTION_DATA\n[\s\S]*?\n-->\n*/g, '');

  // Split content to separate images section from rest
  const parts = cleanedContent.split(/## Images\s*\n*/);
  const beforeImages = parts[0];
  const afterImages = parts[1]?.split(/##/);
  const restOfContent = afterImages ? '##' + afterImages.slice(1).join('##') : '';

  return (
    <div className="text-xs text-[var(--text-secondary)] mt-1 space-y-2">
      {/* Render company selection prompt */}
      {companySelectionData && onCompanySelect && (
        <CompanySelectionCard
          prompt={companySelectionData.prompt}
          companies={companySelectionData.companies}
          onSelect={onCompanySelect}
        />
      )}

      {/* Render people selection prompt */}
      {peopleSelectionData && onPersonSelect && (
        <PeopleSelectionCard
          prompt={peopleSelectionData.prompt}
          people={peopleSelectionData.people}
          onSelect={onPersonSelect}
        />
      )}

      {/* Render event selection prompt */}
      {eventSelectionData && onEventSelect && (
        <EventSelectionCard
          prompt={eventSelectionData.prompt}
          events={eventSelectionData.events}
          onSelect={onEventSelect}
        />
      )}

      {/* Render news selection prompt */}
      {newsSelectionData && onNewsSelect && (
        <NewsSelectionCard
          prompt={newsSelectionData.prompt}
          articles={newsSelectionData.articles}
          onSelect={onNewsSelect}
        />
      )}

      {/* Render YouTube gallery */}
      {youtubeVideos.length > 0 && <YouTubeGallery videos={youtubeVideos} />}

      {/* Render FileViewer for SEC documents (replaces SECDocumentGallery) */}
      {fileViewerFiles.length > 0 && <FileViewer files={fileViewerFiles} />}

      {/* Render content before images */}
      {beforeImages && (
        <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>
          {beforeImages}
        </ReactMarkdown>
      )}

      {/* Render images gallery */}
      {hasMultipleImages && imageUrls.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mt-3 mb-2">
            Images
            <span className="text-xs font-normal text-[var(--text-muted)] ml-2">
              (scroll to see all)
            </span>
          </h2>
          <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-thin scrollbar-thumb-[var(--border-color)] scrollbar-track-[var(--bg-secondary)]" style={{ scrollbarWidth: 'thin' }}>
            {imageUrls.map((img, idx) => (
              <div key={idx} className="flex-shrink-0">
                <SafeImage
                  src={img.url}
                  alt={img.alt}
                  className="h-48 w-auto rounded-lg border border-[var(--border-color)] cursor-pointer hover:shadow-lg transition-shadow"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Render rest of content */}
      {restOfContent && (
        <ReactMarkdown
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
          components={{
            // Style links
            a: ({ node, ...props }) => (
              <a
                {...props}
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              />
            ),
            // Style headings
            h2: ({ node, ...props }) => (
              <h2 {...props} className="text-sm font-semibold text-[var(--text-primary)] mt-3 mb-2" />
            ),
            // Style paragraphs
            p: ({ node, ...props }) => (
              <p {...props} className="text-xs text-[var(--text-secondary)] mb-2" />
            ),
            // Style videos
            video: ({ node, ...props }) => (
              <video
                {...props}
                className="max-w-full h-auto rounded-lg border border-[var(--border-color)] my-2"
                style={{ maxHeight: '300px' }}
              />
            ),
            // Style audio
            audio: ({ node, ...props }) => (
              <audio {...props} className="w-full my-2" />
            ),
          }}
        >
          {restOfContent}
        </ReactMarkdown>
      )}
    </div>
  );
}

/**
 * FileTextPreview - Shows a preview of text file contents
 */
function FileTextPreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Failed to fetch file');
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };
    void fetchContent();
  }, [fileUrl]);

  return (
    <div className="flex flex-col">
      {/* Text File Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 bg-gradient-to-r from-blue-50 to-[var(--bg-primary)] dark:from-blue-900/20 dark:to-[var(--bg-primary)] flex items-center gap-3 border-b border-[var(--border-color)] hover:from-blue-100 dark:hover:from-blue-900/30 transition-colors"
      >
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
          <ImageIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-medium text-[var(--text-primary)] truncate">
            {fileName}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Text File</p>
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          {isExpanded ? 'Collapse' : 'Expand'}
        </div>
      </button>
      {/* Text Preview */}
      {isExpanded && (
        <div className="bg-[var(--bg-secondary)] p-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading file content...</span>
            </div>
          ) : error ? (
            <div className="text-sm text-red-600">
              {error}
            </div>
          ) : (
            <pre className="text-xs bg-[var(--bg-primary)] p-3 rounded border border-[var(--border-color)] overflow-x-auto max-h-96 overflow-y-auto">
              {content}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// Agent role icons and labels
const agentRoleConfig = {
  coordinator: { icon: '🎯', label: 'Coordinator', color: 'purple' },
  documentAgent: { icon: '📄', label: 'Document Agent', color: 'blue' },
  mediaAgent: { icon: '🎥', label: 'Media Agent', color: 'pink' },
  secAgent: { icon: '📊', label: 'SEC Agent', color: 'green' },
  webAgent: { icon: '🌐', label: 'Web Agent', color: 'cyan' },
};

/**
 * ThinkingAccordion - Collapsible section for agent reasoning
 */
function ThinkingAccordion({
  reasoning,
  isStreaming
}: {
  reasoning: string;
  isStreaming: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!reasoning) return null;

  return (
    <div className="mb-4 border border-[var(--border-color)] rounded-lg overflow-hidden bg-[var(--bg-secondary)]/30">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <BrainCircuit className={cn(
          "w-3 h-3 text-purple-500",
          isStreaming && "animate-pulse"
        )} />
        <span>Reasoning Process</span>
        {isStreaming && <Loader2 className="w-3 h-3 animate-spin ml-auto text-purple-500" />}
      </button>

      {isExpanded && (
        <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
          <div className="prose prose-xs max-w-none text-[var(--text-secondary)]">
            <ReactMarkdown>{reasoning}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FUSION SEARCH RESULT PARSING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Current supported version of the FusionSearchPayload schema.
 * Must match FUSION_SEARCH_PAYLOAD_VERSION from backend.
 */
const SUPPORTED_PAYLOAD_VERSION = 1;

/**
 * Parsed result from fusion search tool output.
 * Includes validation status and error details for debugging.
 */
interface ParsedFusionSearchResult {
  results: FusedResult[];
  sourcesQueried: SearchSource[];
  errors: SourceError[];
  timing: Record<SearchSource, number>;
  totalTimeMs: number;
  /** Whether parsing succeeded with valid versioned payload */
  isValid: boolean;
  /** Parse error message if isValid is false */
  parseError?: string;
  /** Schema version of the parsed payload */
  payloadVersion?: number;
  /** Whether legacy fallback was used (for observability) */
  usedLegacyFallback?: boolean;
}

/**
 * Structured event for observability logging.
 * Used to track legacy payload fallback usage.
 */
interface FusionPayloadEvent {
  event: 'fusion_payload_legacy_fallback' | 'fusion_payload_parse_error' | 'fusion_payload_success';
  toolName?: string;
  source: 'versioned' | 'legacy' | 'unknown';
  shapeSignature: string;
  payloadVersion?: number;
  error?: string;
  timestamp: string;
}

/**
 * Log structured observability event for fusion payload parsing.
 * Does NOT log payload content (PII risk).
 */
function logFusionPayloadEvent(event: FusionPayloadEvent): void {
  // Log structured event (can be picked up by observability systems)
  console.info(`[FusionPayload] ${event.event}`, {
    ...event,
    // Explicit omission of payload content for PII safety
    _note: 'Payload content intentionally omitted for PII safety',
  });
}

/**
 * Check if a tool name is a fusion search tool.
 * Used to determine render precedence for fusion results.
 */
function isFusionSearchTool(toolName: string | undefined): boolean {
  if (!toolName) return false;
  return toolName === 'fusionSearch' ||
         toolName === 'quickSearch' ||
         toolName.includes('fusion') && toolName.includes('Search');
}

/**
 * Valid search sources for validation.
 */
const VALID_SEARCH_SOURCES = ['linkup', 'sec', 'rag', 'documents', 'news', 'youtube', 'arxiv'] as const;

/**
 * Parse fusion search tool output into structured data for FusedSearchResults component.
 *
 * Supports two payload formats:
 * 1. Versioned FusionSearchPayload (preferred): { kind, version, payload, generatedAt }
 * 2. Legacy SearchResponse (fallback): { results, mode, sourcesQueried, ... }
 *
 * Contract Enforcement:
 * - Versioned payloads are validated strictly with clear error messages
 * - Legacy payloads are supported for backward compatibility but logged
 * - Invalid payloads return isValid=false with parseError details
 */
function parseFusionSearchOutput(output: unknown, toolName?: string): ParsedFusionSearchResult {
  const emptyResult: ParsedFusionSearchResult = {
    results: [],
    sourcesQueried: [],
    errors: [],
    timing: {} as Record<SearchSource, number>,
    totalTimeMs: 0,
    isValid: false,
  };

  /**
   * Helper to compute shape signature for observability (no PII)
   */
  const getShapeSignature = (obj: Record<string, unknown>): string => {
    const keys = Object.keys(obj).sort().slice(0, 5);
    return `{${keys.join(',')}}`;
  };

  if (!output) {
    logFusionPayloadEvent({
      event: 'fusion_payload_parse_error',
      toolName,
      source: 'unknown',
      shapeSignature: 'null',
      error: 'Output is null or undefined',
      timestamp: new Date().toISOString(),
    });
    return { ...emptyResult, parseError: 'Output is null or undefined' };
  }

  try {
    // Handle string output (embedded JSON in HTML comment)
    if (typeof output === 'string') {
      const jsonMatch = output.match(/<!-- FUSION_SEARCH_DATA\n([\s\S]*?)\n-->/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          return parseFusionSearchOutput(parsed, toolName);
        } catch (jsonErr) {
          logFusionPayloadEvent({
            event: 'fusion_payload_parse_error',
            toolName,
            source: 'unknown',
            shapeSignature: 'embedded-json-parse-error',
            error: `Failed to parse embedded JSON: ${jsonErr}`,
            timestamp: new Date().toISOString(),
          });
          return { ...emptyResult, parseError: `Failed to parse embedded JSON: ${jsonErr}` };
        }
      }
      return { ...emptyResult, parseError: 'String output without embedded FUSION_SEARCH_DATA marker' };
    }

    if (typeof output !== 'object') {
      logFusionPayloadEvent({
        event: 'fusion_payload_parse_error',
        toolName,
        source: 'unknown',
        shapeSignature: typeof output,
        error: `Invalid output type: ${typeof output}`,
        timestamp: new Date().toISOString(),
      });
      return { ...emptyResult, parseError: `Invalid output type: ${typeof output}` };
    }

    const data = output as Record<string, unknown>;
    const shapeSignature = getShapeSignature(data);

    // ═══════════════════════════════════════════════════════════════════════
    // VERSIONED PAYLOAD VALIDATION (preferred path)
    // ═══════════════════════════════════════════════════════════════════════
    if (data.kind === 'fusion_search_results') {
      // Validate version
      if (typeof data.version !== 'number') {
        logFusionPayloadEvent({
          event: 'fusion_payload_parse_error',
          toolName,
          source: 'versioned',
          shapeSignature,
          error: `Invalid version type: ${typeof data.version}`,
          timestamp: new Date().toISOString(),
        });
        return { ...emptyResult, parseError: `Invalid version type: ${typeof data.version}` };
      }

      if (data.version > SUPPORTED_PAYLOAD_VERSION) {
        logFusionPayloadEvent({
          event: 'fusion_payload_parse_error',
          toolName,
          source: 'versioned',
          shapeSignature,
          payloadVersion: data.version,
          error: `Unsupported payload version: ${data.version}`,
          timestamp: new Date().toISOString(),
        });
        return {
          ...emptyResult,
          parseError: `Unsupported payload version: ${data.version} (max supported: ${SUPPORTED_PAYLOAD_VERSION})`,
          payloadVersion: data.version,
        };
      }

      // Extract payload
      if (!data.payload || typeof data.payload !== 'object') {
        logFusionPayloadEvent({
          event: 'fusion_payload_parse_error',
          toolName,
          source: 'versioned',
          shapeSignature,
          payloadVersion: data.version,
          error: 'Missing or invalid payload field',
          timestamp: new Date().toISOString(),
        });
        return { ...emptyResult, parseError: 'Missing or invalid payload field' };
      }

      const payload = data.payload as Record<string, unknown>;
      const result = parseSearchResponsePayload(payload, data.version);

      // Log success for versioned payload
      if (result.isValid) {
        logFusionPayloadEvent({
          event: 'fusion_payload_success',
          toolName,
          source: 'versioned',
          shapeSignature,
          payloadVersion: data.version,
          timestamp: new Date().toISOString(),
        });
      }

      return result;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LEGACY PAYLOAD FALLBACK (for backward compatibility)
    // ═══════════════════════════════════════════════════════════════════════
    if (Array.isArray(data.results)) {
      // Log legacy fallback event (structured for observability)
      logFusionPayloadEvent({
        event: 'fusion_payload_legacy_fallback',
        toolName,
        source: 'legacy',
        shapeSignature,
        timestamp: new Date().toISOString(),
      });

      const result = parseSearchResponsePayload(data, undefined);
      return { ...result, usedLegacyFallback: true };
    }

    logFusionPayloadEvent({
      event: 'fusion_payload_parse_error',
      toolName,
      source: 'unknown',
      shapeSignature,
      error: 'Unknown payload structure: missing kind or results',
      timestamp: new Date().toISOString(),
    });
    return { ...emptyResult, parseError: 'Unknown payload structure: missing kind or results' };

  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    logFusionPayloadEvent({
      event: 'fusion_payload_parse_error',
      toolName,
      source: 'unknown',
      shapeSignature: 'exception',
      error: errorMsg,
      timestamp: new Date().toISOString(),
    });
    // NOTE: Do NOT log `e` directly as it may contain payload content (PII risk)
    console.error('[parseFusionSearchOutput] Unexpected error (details omitted for PII safety)');
    return { ...emptyResult, parseError: `Unexpected error: ${errorMsg}` };
  }
}

/**
 * Parse the inner SearchResponse payload (shared by versioned and legacy paths).
 */
function parseSearchResponsePayload(
  data: Record<string, unknown>,
  version: number | undefined
): ParsedFusionSearchResult {
  const emptyResult: ParsedFusionSearchResult = {
    results: [],
    sourcesQueried: [],
    errors: [],
    timing: {} as Record<SearchSource, number>,
    totalTimeMs: 0,
    isValid: false,
    payloadVersion: version,
  };

  // Validate results array
  if (!Array.isArray(data.results)) {
    return { ...emptyResult, parseError: 'payload.results is not an array' };
  }

  // Parse results with validation
  const results: FusedResult[] = [];
  for (let idx = 0; idx < data.results.length; idx++) {
    const r = data.results[idx] as Record<string, unknown>;

    // Required field validation
    if (!r.id || typeof r.id !== 'string') {
      console.warn(`[parseFusionSearchOutput] Result ${idx} missing valid id, using fallback`);
    }
    if (!r.source || typeof r.source !== 'string') {
      console.warn(`[parseFusionSearchOutput] Result ${idx} missing valid source, using 'linkup'`);
    }
    if (!r.title || typeof r.title !== 'string') {
      console.warn(`[parseFusionSearchOutput] Result ${idx} missing valid title, using 'Untitled'`);
    }

    // Validate source is known
    const source = String(r.source || 'linkup');
    if (!VALID_SEARCH_SOURCES.includes(source as SearchSource)) {
      console.warn(`[parseFusionSearchOutput] Result ${idx} has unknown source: ${source}`);
    }

    results.push({
      id: String(r.id || `result-${idx}`),
      source: source as SearchSource,
      title: String(r.title || 'Untitled'),
      snippet: String(r.snippet || ''),
      url: r.url ? String(r.url) : undefined,
      score: Number(r.score || 0),
      originalRank: Number(r.originalRank || idx + 1),
      fusedRank: r.fusedRank ? Number(r.fusedRank) : undefined,
      contentType: (r.contentType || 'text') as FusedResult['contentType'],
      publishedAt: r.publishedAt ? String(r.publishedAt) : undefined,
      author: r.author ? String(r.author) : undefined,
      metadata: r.metadata as Record<string, unknown> | undefined,
    });
  }

  // Parse sourcesQueried
  const sourcesQueried: SearchSource[] = Array.isArray(data.sourcesQueried)
    ? (data.sourcesQueried as string[]).filter(s => VALID_SEARCH_SOURCES.includes(s as SearchSource)) as SearchSource[]
    : [...new Set(results.map(r => r.source))];

  // Parse errors
  const errors: SourceError[] = Array.isArray(data.errors)
    ? (data.errors as Array<{source: string; error: string}>).map(e => ({
        source: e.source as SearchSource,
        error: String(e.error),
      }))
    : [];

  const timing = (data.timing || {}) as Record<SearchSource, number>;
  const totalTimeMs = Number(data.totalTimeMs || 0);

  return {
    results,
    sourcesQueried,
    errors,
    timing,
    totalTimeMs,
    isValid: results.length > 0,
    payloadVersion: version,
  };
}

/**
 * ToolStep - Renders a single tool call as a structured step with timeline
 */
function ToolStep({
  part,
  stepNumber,
  onCompanySelect,
  onPersonSelect,
  onEventSelect,
  onNewsSelect,
  isLast = false,
  showTimeline = true,
}: {
  part: ToolUIPart;
  stepNumber: number;
  onCompanySelect?: (company: CompanyOption) => void;
  onPersonSelect?: (person: PersonOption) => void;
  onEventSelect?: (event: EventOption) => void;
  onNewsSelect?: (article: NewsArticleOption) => void;
  isLast?: boolean;
  showTimeline?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const hasOutput = part.output !== undefined && part.output !== null;
  const toolName = part.type.replace('tool-', '');

  // Determine status based on part type
  const isComplete = part.type.startsWith('tool-result');
  const isError = part.type === 'tool-error';
  const isActive = !isComplete && !isError;

  return (
    <div className={cn(
      "relative",
      showTimeline && "pl-8"
    )}>
      {/* Timeline connector */}
      {showTimeline && (
        <>
          {/* Vertical line */}
          {!isLast && (
            <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
          )}
          {/* Status circle on the line */}
          <div className={cn(
            "absolute left-1 top-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white dark:bg-gray-900 z-10",
            isActive && "border-blue-500 animate-pulse",
            isComplete && "border-green-500 bg-green-500",
            isError && "border-red-500 bg-red-500"
          )}>
            {isComplete && <Check className="w-3 h-3 text-white" />}
            {isError && <XCircle className="w-2.5 h-2.5 text-white" />}
            {isActive && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
          </div>
        </>
      )}

      {/* Card */}
      <div className="mb-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-colors"
        >
          {/* Step number badge */}
          <div className={cn(
            "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
            isComplete && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            isError && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            isActive && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          )}>
            {stepNumber}
          </div>

          {/* Tool Name */}
          <div className="flex-1 text-left flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text-primary)] font-mono">{toolName}</span>
            {isComplete && <span className="text-[10px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full">Done</span>}
            {isActive && <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />}
          </div>

          {/* Expand/Collapse */}
          {isExpanded ? <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" /> : <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />}
        </button>

        {isExpanded && (
          <div className="px-3 py-2 border-t border-[var(--border-color-light)] bg-[var(--bg-secondary)]/50 text-xs">

            {/* Main Output Renderer (Visual) */}
            {hasOutput && (
              <div className="mb-2">
                <ToolOutputRenderer
                  output={part.output}
                  onCompanySelect={onCompanySelect}
                  onPersonSelect={onPersonSelect}
                  onEventSelect={onEventSelect}
                  onNewsSelect={onNewsSelect}
                />
              </div>
            )}

            {/* Collapsible Details (JSON) */}
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mt-2"
            >
              {showDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span>{showDetails ? "Hide Debug Details" : "View Debug Details"}</span>
            </button>

            {showDetails && (
              <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                {/* Arguments */}
                {(part as any).args && (
                  <div>
                    <div className="font-medium text-[var(--text-muted)] mb-1 text-[10px] uppercase tracking-wider">Input Arguments</div>
                    <pre className="bg-[var(--bg-primary)] p-2 rounded border border-[var(--border-color)] overflow-x-auto font-mono text-[10px] text-[var(--text-secondary)]">
                      {JSON.stringify((part as any).args, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Raw Output */}
                {hasOutput && (
                  <div>
                    <div className="font-medium text-[var(--text-muted)] mb-1 text-[10px] uppercase tracking-wider">Raw Output</div>
                    <pre className="bg-[var(--bg-primary)] p-2 rounded border border-[var(--border-color)] overflow-x-auto font-mono text-[10px] text-[var(--text-secondary)] max-h-60">
                      {typeof part.output === 'string' ? part.output : JSON.stringify(part.output, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {isError && (part as any).error && (
              <div className="mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400">
                {(part as any).error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * FastAgentUIMessageBubble - Renders a UIMessage with smooth streaming animation
 * Handles all UIMessage part types: text, reasoning, tool calls, files, etc.
 * Supports hierarchical rendering with agent role badges
 */
export function FastAgentUIMessageBubble({
  message,
  onMermaidRetry,
  onRegenerateMessage,
  onDeleteMessage,
  onCompanySelect,
  onPersonSelect,
  onEventSelect,
  onNewsSelect,
  onDocumentSelect,
  isParent,
  isChild,
  agentRole,
}: FastAgentUIMessageBubbleProps) {
  // Debug: Log message structure to understand role detection
  console.log('[UIMessageBubble] Message structure:', {
    role: message.role,
    text: message.text?.slice(0, 50),
    hasMessage: 'message' in message,
    messageRole: (message as any).message?.role,
    keys: Object.keys(message),
  });

  const isUser = message.role === 'user';
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get agent role configuration
  const roleConfig = agentRole ? agentRoleConfig[agentRole] : null;

  const handleRegenerate = () => {
    if (onRegenerateMessage && !isRegenerating) {
      setIsRegenerating(true);
      onRegenerateMessage();
      // Reset after a delay
      setTimeout(() => setIsRegenerating(false), 2000);
    }
  };

  const handleDelete = () => {
    if (onDeleteMessage) {
      onDeleteMessage();
      setShowDeleteConfirm(false);
    }
  };

  const handleCopy = async () => {
    try {
      // Helper function to strip all HTML and markdown formatting
      const stripFormatting = (text: string): string => {
        if (!text) return '';

        // First, decode HTML entities using DOM
        const temp = document.createElement('div');
        temp.innerHTML = text;
        let cleaned = temp.textContent || temp.innerText || '';

        // Remove markdown formatting
        cleaned = cleaned
          .replace(/\*\*([^*]+)\*\*/g, '$1')      // Bold **text**
          .replace(/\*([^*]+)\*/g, '$1')          // Italic *text*
          .replace(/__([^_]+)__/g, '$1')          // Bold __text__
          .replace(/_([^_]+)_/g, '$1')            // Italic _text_
          .replace(/~~([^~]+)~~/g, '$1')          // Strikethrough ~~text~~
          .replace(/`([^`]+)`/g, '$1')            // Inline code `code`
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links [text](url)
          .replace(/^#{1,6}\s+/gm, '')            // Headers # Header
          .replace(/^[-*+]\s+/gm, '')             // Unordered list items
          .replace(/^\d+\.\s+/gm, '')             // Ordered list items
          .replace(/^>\s+/gm, '')                 // Blockquotes
          .replace(/```[\s\S]*?```/g, '')         // Code blocks
          .replace(/`{3,}/g, '');                 // Fence markers

        return cleaned.trim();
      };

      // Extract and clean text
      let copyText = stripFormatting(message.text || '');

      // Add media references if present
      const mediaParts = message.parts?.filter((p: any) =>
        p.type === 'tool-result' &&
        (p.toolName === 'youtubeSearch' || p.toolName === 'searchSecFilings' || p.toolName === 'linkupSearch')
      );

      if (mediaParts && mediaParts.length > 0) {
        copyText += '\n\n--- Media References ---\n';
        for (const part of mediaParts) {
          const toolName = (part as any).toolName;
          copyText += `\n${toolName}:\n`;

          // Try to extract URLs from output
          const output = (part as ToolUIPart).output;
          if (output && typeof output === 'object' && 'value' in output) {
            const value = (output as any).value;
            if (typeof value === 'string') {
              copyText += stripFormatting(value) + '\n';
            }
          }
        }
      }

      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Use smooth text streaming - matches documentation pattern exactly
  const [visibleText] = useSmoothText(message.text, {
    startStreaming: message.status === 'streaming',
  });

  // Extract reasoning text from parts
  const reasoningParts = message.parts.filter((p) => p.type === 'reasoning');
  const reasoningText = reasoningParts.map((p: any) => p.text).join('\n');
  const [visibleReasoning] = useSmoothText(reasoningText, {
    startStreaming: message.status === 'streaming',
  });

  // Extract tool calls
  const toolParts = message.parts.filter((p): p is ToolUIPart =>
    p.type.startsWith('tool-')
  );

  // Extract file parts (images, etc.)
  const fileParts = message.parts.filter((p): p is FileUIPart =>
    p.type === 'file'
  );

  // Extract media from BOTH tool results AND final text
  const extractedMedia = useMemo(() => {
    if (isUser) return { youtubeVideos: [], secDocuments: [], webSources: [], profiles: [], images: [] };

    // Extract all tool-result parts from message
    const toolResultParts = message.parts.filter((p): p is any =>
      p.type === 'tool-result'
    );

    // Combine media from all tool results
    const toolMedia = toolResultParts.reduce((acc, part) => {
      const resultText = String(part.result || '');
      const media = extractMediaFromText(resultText);

      return {
        youtubeVideos: [...acc.youtubeVideos, ...media.youtubeVideos],
        secDocuments: [...acc.secDocuments, ...media.secDocuments],
        webSources: [...acc.webSources, ...media.webSources],
        profiles: [...acc.profiles, ...media.profiles],
        images: [...acc.images, ...media.images],
      };
    }, { youtubeVideos: [], secDocuments: [], webSources: [], profiles: [], images: [] });

    // ALSO extract from final text (for when agent synthesizes response)
    const textMedia = extractMediaFromText(visibleText || '');

    return {
      toolMedia,
      textMedia,
    };
  }, [message.parts, isUser, visibleText]);

  // Extract document actions from tool results
  const extractedDocuments = useMemo(() => {
    if (isUser) return [];

    // Extract all tool-result parts from message
    const toolResultParts = message.parts.filter((p): p is any =>
      p.type === 'tool-result'
    );

    // Combine documents from all tool results
    const documents = toolResultParts.reduce((acc, part) => {
      const resultText = String(part.result || '');
      const docs = extractDocumentActions(resultText);
      return [...acc, ...docs];
    }, [] as any[]);

    // ALSO extract from final text
    const textDocs = extractDocumentActions(visibleText || '');

    return [...documents, ...textDocs];
  }, [isUser, message.parts, visibleText]);

  // Extract arbitrage verification data from tool results
  const arbitrageData = useMemo(() => {
    if (isUser) return null;

    const toolResultParts = message.parts.filter((p): p is any => p.type === 'tool-result');

    for (const part of toolResultParts) {
      const resultText = String(part.result || '');
      // Look for arbitrage tool outputs
      if (part.toolName?.includes('arbitrage') ||
        part.toolName?.includes('contradiction') ||
        part.toolName?.includes('sourceQuality') ||
        part.toolName?.includes('delta')) {
        try {
          const parsed = JSON.parse(resultText);
          if (parsed.contradictions || parsed.rankedSources || parsed.deltas || parsed.healthResults) {
            return parsed;
          }
        } catch {
          // Not JSON, continue
        }
      }
    }
    return null;
  }, [isUser, message.parts]);

  // Clean text by removing media markers and document action markers (for display purposes)
  const cleanedText = useMemo(() => {
    let cleaned = removeMediaMarkersFromText(visibleText || '');
    cleaned = removeDocumentActionMarkers(cleaned);
    // Also remove arbitrage citation markers for clean display (they're rendered separately)
    cleaned = cleaned.replace(/\{\{arbitrage:[^}]+\}\}/g, '');
    cleaned = cleaned.replace(/\{\{fact:[^}]+\}\}/g, '');
    return cleaned;
  }, [visibleText]);

  return (
    <div className={cn(
      "flex gap-3 mb-6 group",
      isUser ? "justify-end" : "justify-start",
      isChild && "ml-0" // Child messages already have margin from parent container
    )}>
      {/* Agent Avatar - Show on LEFT side for agent messages */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shadow-sm ring-1 ring-white/20 backdrop-blur-sm",
            "bg-neutral-900 dark:bg-neutral-100"
          )}>
            <Bot className="w-5 h-5 text-white dark:text-neutral-900" />
          </div>
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        "flex flex-col gap-2 max-w-[85%]",
        isUser && "items-end"
      )}>
        {/* Agent Role Badge (for specialized agents) */}
        {roleConfig && !isUser && (
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium mb-1",
            "bg-gradient-to-r shadow-sm",
            roleConfig.color === 'purple' && "from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 text-purple-700 dark:text-purple-300",
            roleConfig.color === 'blue' && "from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 text-blue-700 dark:text-blue-300",
            roleConfig.color === 'pink' && "from-pink-100 to-pink-200 dark:from-pink-900/40 dark:to-pink-800/40 text-pink-700 dark:text-pink-300",
            roleConfig.color === 'green' && "from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 text-green-700 dark:text-green-300",
            roleConfig.color === 'cyan' && "from-cyan-100 to-cyan-200 dark:from-cyan-900/40 dark:to-cyan-800/40 text-cyan-700 dark:text-cyan-300"
          )}>
            <span className="text-sm">{roleConfig.icon}</span>
            <span>{roleConfig.label}</span>
          </div>
        )}

        {/* Goal Card - ONLY show for coordinator/parent messages with delegations */}
        {!isUser && isParent && !isChild && (() => {
          // Only show GoalCard for coordinator messages that delegate to sub-agents
          const delegationCalls = toolParts.filter((part: any) =>
            part.type === 'tool-call' && part.toolName?.startsWith('delegateTo')
          );

          if (delegationCalls.length === 0) return null;

          // Extract task status from delegation calls
          const tasks: TaskStatusItem[] = delegationCalls.map((part: any, idx) => {
            const toolName = part.toolName?.replace('delegateTo', '').replace('Agent', '') || 'Task';

            // Default status is queued, will be updated by child responses
            let status: 'queued' | 'active' | 'success' | 'failed' = 'queued';

            // Check if there's a corresponding result
            const resultPart = toolParts.find((p: any) =>
              p.type === 'tool-result' && p.toolCallId === (part as any).toolCallId
            );

            if (resultPart) {
              status = 'success';
            } else if (part.type === 'tool-call') {
              status = 'active';
            }

            return {
              id: `delegation-${idx}`,
              name: toolName,
              status,
            };
          });

          // Extract goal from the actual user query
          const goal = message.text?.split('\n')[0].substring(0, 150) || 'Processing your request';

          return (
            <GoalCard
              goal={goal}
              tasks={tasks}
              isStreaming={message.status === 'streaming'}
            />
          );
        })()}

        {/* Thinking Accordion */}
        {!isUser && visibleReasoning && (
          <ThinkingAccordion
            reasoning={visibleReasoning}
            isStreaming={message.status === 'streaming'}
          />
        )}

        {/*
          ═══════════════════════════════════════════════════════════════════════
          TOOL STEPS LIST - RENDER PRECEDENCE DOCUMENTATION
          ═══════════════════════════════════════════════════════════════════════

          Render precedence for tool parts (in order):

          1. FUSION SEARCH (fusionSearch, quickSearch):
             - tool-result: Render FusedSearchResults component (if valid)
             - tool-call: Skip (no spinner) - results shown when complete
             - Invalid parse: Fall through to default ToolStep

          2. MEMORY/PLANNING TOOLS (writeMemory, createPlan, etc.):
             - Render as compact ToolPill component

          3. DEFAULT:
             - Render as ToolStep with expandable details

          This ensures each tool has exactly ONE visual representation.
          ═══════════════════════════════════════════════════════════════════════
        */}
        {!isUser && toolParts.length > 0 && (
          <div className="mb-4 w-full">
            {toolParts.map((part, idx) => {
              // Only render tool calls, not results (results are nested in steps)
              if (part.type !== 'tool-call' && part.type !== 'tool-result' && part.type !== 'tool-error') return null;

              const toolName = (part as any).toolName;

              // ═══════════════════════════════════════════════════════════════
              // PRECEDENCE 1: Fusion Search tools → FusedSearchResults
              // ═══════════════════════════════════════════════════════════════
              if (isFusionSearchTool(toolName) && part.type === 'tool-result') {
                // Pass toolName for structured observability logging
                const parsed = parseFusionSearchOutput((part as ToolUIPart).output, toolName);
                if (parsed.isValid && parsed.results.length > 0) {
                  return (
                    <div key={idx} className="my-3 w-full">
                      <FusedSearchResults
                        results={parsed.results}
                        sourcesQueried={parsed.sourcesQueried}
                        errors={parsed.errors}
                        timing={parsed.timing}
                        totalTimeMs={parsed.totalTimeMs}
                        showCitations={true}
                      />
                    </div>
                  );
                }
                // If parsing failed, log and fall through to default ToolStep rendering
                if (parsed.parseError) {
                  console.warn(`[UIMessageBubble] Fusion search parse failed: ${parsed.parseError}`);
                }
              }

              // Skip tool-call for fusion search (we render the result above, no spinner needed)
              if (isFusionSearchTool(toolName) && part.type === 'tool-call') {
                return null;
              }

              // ═══════════════════════════════════════════════════════════════
              // PRECEDENCE 2: Memory/Planning tools → ToolPill
              // ═══════════════════════════════════════════════════════════════

              // Check for Memory/Planning tools to render as Pills

              if (toolName && (
                toolName.includes('writeMemory') ||
                toolName.includes('createPlan') ||
                toolName.includes('updatePlanStep') ||
                toolName.includes('logEpisodic')
              )) {

                // Determine pill type and title based on tool name
                let type: 'plan_update' | 'test_result' | 'memory_write' = 'memory_write';
                let title = 'Memory Updated';
                let details = '';

                if (toolName.includes('createPlan')) {
                  type = 'plan_update';
                  title = 'New Plan Created';
                  details = (part as any).args?.goal ? `Goal: ${(part as any).args.goal}` : 'New mission plan initialized';
                } else if (toolName.includes('updatePlanStep')) {
                  type = 'plan_update';
                  title = 'Plan Updated';
                  const status = (part as any).args?.status;
                  details = status ? `Step marked as ${status}` : 'Plan progress updated';
                } else if (toolName.includes('logEpisodic')) {
                  type = 'test_result';
                  title = 'Episodic Log';
                  details = 'System event recorded';
                } else {
                  // writeMemory
                  const key = (part as any).args?.key || 'unknown';
                  title = key.startsWith('constraint:') ? 'Constraint Added' : 'Memory Updated';
                  details = `Key: ${key}`;
                }

                // If this is a tool-call, render the pill
                // We ignore the tool-result for these as the pill usually summarizes the action
                if (part.type === 'tool-call') {
                  return (
                    <div key={idx} className="my-2 flex justify-center w-full">
                      <MemoryPill
                        event={{
                          id: `pill-${idx}`,
                          type,
                          title,
                          details,
                          timestamp: Date.now()
                        }}
                      />
                    </div>
                  );
                }
                // Skip results/errors for memory tools to keep stream clean
                return null;
              }

              // Default: Render as standard ToolStep
              return (
                <ToolStep
                  key={idx}
                  part={part}
                  stepNumber={idx + 1}
                  onCompanySelect={onCompanySelect}
                  onPersonSelect={onPersonSelect}
                  onEventSelect={onEventSelect}
                  onNewsSelect={onNewsSelect}
                />
              );
            })}
          </div>
        )}

        {/* Arbitrage Verification Report (if arbitrage tools were used) */}
        {!isUser && arbitrageData && (
          <ArbitrageReportCard data={arbitrageData} />
        )}

        {/* NEW PRESENTATION LAYER: Polished media display FIRST */}
        {!isUser && (
          <RichMediaSection media={extractedMedia} showCitations={true} />
        )}

        {/* Document Actions */}
        {!isUser && extractedDocuments.length > 0 && (
          <DocumentActionGrid
            documents={extractedDocuments}
            title="Documents"
            onDocumentSelect={onDocumentSelect}
          />
        )}

        {/* Files (images, etc.) */}
        {fileParts.map((part, idx) => {
          // FileUIPart has url and mimeType properties
          const fileUrl = (part as any).url || '';
          const mimeType = (part as any).mimeType || '';
          const fileName = (part as any).name || 'File';
          const isImage = mimeType.startsWith('image/');
          const isPDF = mimeType === 'application/pdf';
          const isText = mimeType.startsWith('text/');
          const isVideo = mimeType.startsWith('video/');
          const isAudio = mimeType.startsWith('audio/');

          return (
            <div key={idx} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm mb-2">
              {isImage ? (
                <SafeImage
                  src={fileUrl}
                  alt={fileName}
                  className="max-w-full h-auto"
                />
              ) : isText ? (
                <FileTextPreview fileUrl={fileUrl} fileName={fileName} />
              ) : (
                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white flex items-center gap-3 group hover:from-blue-50 hover:to-white transition-colors">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors block truncate"
                    >
                      {fileName}
                    </a>
                    <p className="text-xs text-gray-500 mt-0.5">File Attachment</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Main text content - THE ANSWER */}
        {!isUser || (cleanedText || visibleText) ? (
          <div
            className={cn(
              "relative p-4 rounded-xl shadow-sm transition-all duration-200 text-sm leading-relaxed",
              isUser
                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-none shadow-md"
                : "bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-bl-none shadow-sm dark:bg-[var(--bg-secondary)]",
              message.status === 'streaming' && 'animate-pulse-subtle',
              message.status === 'failed' && "bg-red-50/80 border-red-200 dark:bg-red-900/20 dark:border-red-800"
            )}
          >
            {/* Show placeholder while streaming and no text yet */}
            {!isUser && message.status === 'streaming' && !cleanedText && !visibleText ? (
              <div className="flex items-center gap-2 text-gray-500 italic">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating answer...</span>
              </div>
            ) : (
              <ReactMarkdown
                components={{
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';

                    if (!inline && language === 'mermaid') {
                      const mermaidCode = String(children).replace(/\n$/, '');
                      const isStreaming = message.status === 'streaming';
                      return (
                        <MermaidDiagram
                          code={mermaidCode}
                          onRetryRequest={onMermaidRetry}
                          isStreaming={isStreaming}
                        />
                      );
                    }

                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={language}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={cn(
                        "px-1 py-0.5 rounded text-xs font-mono",
                        isUser ? "bg-blue-700/50 text-white" : "bg-gray-100 text-gray-800"
                      )} {...props}>
                        {children}
                      </code>
                    );
                  },
                  a({ href, children }) {
                    return <a href={href} className="text-blue-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer">{children}</a>;
                  },
                }}
              >
                {isUser ? (visibleText || '...') : (cleanedText || visibleText || '...')}
              </ReactMarkdown>
            )}
          </div>
        ) : null}

        {/* Status indicator and actions */}
        <div className="flex items-center gap-2 mt-1">
          {message.status === 'streaming' && (
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Streaming...
            </div>
          )}

          {/* Action buttons for completed messages */}
          {message.status !== 'streaming' && visibleText && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Copy button */}
              <button
                type="button"
                onClick={() => { void handleCopy(); }}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                title="Copy response"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>

              {/* Regenerate button for assistant messages */}
              {!isUser && onRegenerateMessage && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="text-xs text-gray-400 hover:text-gray-600 disabled:text-gray-300 flex items-center gap-1 transition-colors"
                  title="Regenerate response"
                >
                  <RefreshCw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                </button>
              )}

              {/* Delete button */}
              {onDeleteMessage && (
                showDeleteConfirm ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors px-2 py-0.5 bg-red-50 rounded"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-0.5"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                    title="Delete message"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Avatar - Show on RIGHT side for user messages */}
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm ring-1 ring-white/50">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
