// src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx
// Message bubble component optimized for UIMessage format from Agent component

import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Bot, Wrench, Image as ImageIcon, AlertCircle, Loader2, RefreshCw, Trash2, ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock, Copy, Check } from 'lucide-react';
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
import { CollapsibleAgentProgress } from './CollapsibleAgentProgress';
import { RichMediaSection } from './RichMediaSection';
import { extractMediaFromText, removeMediaMarkersFromText } from './utils/mediaExtractor';
import { GoalCard, type TaskStatusItem } from './FastAgentPanel.GoalCard';
import { ThoughtBubble } from './FastAgentPanel.ThoughtBubble';
import { CitationLink } from './FastAgentPanel.CitationLink';
import { DocumentActionGrid, extractDocumentActions, removeDocumentActionMarkers } from './DocumentActionCard';

interface UIMessageBubbleProps {
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
      <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 border border-gray-200 rounded">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <div className="text-sm text-gray-700">
          <div className="font-medium">Failed to load image</div>
          <div className="text-xs text-gray-500 mt-1">The file may be too large or unavailable</div>
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
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
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
    <div className="text-xs text-gray-600 mt-1 space-y-2">
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
          <h2 className="text-sm font-semibold text-gray-700 mt-3 mb-2">
            Images
            <span className="text-xs font-normal text-gray-500 ml-2">
              (scroll to see all)
            </span>
          </h2>
          <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ scrollbarWidth: 'thin' }}>
            {imageUrls.map((img, idx) => (
              <div key={idx} className="flex-shrink-0">
                <SafeImage
                  src={img.url}
                  alt={img.alt}
                  className="h-48 w-auto rounded-lg border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
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
              <h2 {...props} className="text-sm font-semibold text-gray-700 mt-3 mb-2" />
            ),
            // Style paragraphs
            p: ({ node, ...props }) => (
              <p {...props} className="text-xs text-gray-600 mb-2" />
            ),
            // Style videos
            video: ({ node, ...props }) => (
              <video
                {...props}
                className="max-w-full h-auto rounded-lg border border-gray-200 my-2"
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
        className="px-4 py-3 bg-gradient-to-r from-blue-50 to-white flex items-center gap-3 border-b border-gray-200 hover:from-blue-100 transition-colors"
      >
        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
          <ImageIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-medium text-gray-900 truncate">
            {fileName}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Text File</p>
        </div>
        <div className="text-xs text-gray-400">
          {isExpanded ? 'Collapse' : 'Expand'}
        </div>
      </button>
      {/* Text Preview */}
      {isExpanded && (
        <div className="bg-gray-50 p-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading file content...</span>
            </div>
          ) : error ? (
            <div className="text-sm text-red-600">
              {error}
            </div>
          ) : (
            <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto max-h-96 overflow-y-auto">
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
 * CollapsibleToolStep - Renders a single tool call as a collapsible step
 */
function CollapsibleToolStep({
  part,
  stepNumber,
  onCompanySelect,
  onPersonSelect,
  onEventSelect,
  onNewsSelect,
}: {
  part: ToolUIPart;
  stepNumber: number;
  onCompanySelect?: (company: CompanyOption) => void;
  onPersonSelect?: (person: PersonOption) => void;
  onEventSelect?: (event: EventOption) => void;
  onNewsSelect?: (article: NewsArticleOption) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasOutput = part.output !== undefined && part.output !== null;
  const toolName = part.type.replace('tool-', '');
  
  // Determine status based on part type
  const isComplete = part.type.startsWith('tool-result');
  const isCall = part.type === 'tool-call';
  const isError = part.type === 'tool-error';
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Collapsed Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
        {/* Expand/Collapse Icon */}
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
        )}
        
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : isError ? (
            <XCircle className="h-4 w-4 text-red-600" />
          ) : (
            <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
          )}
        </div>
        
        {/* Tool Name & Step Number */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Step {stepNumber}</span>
            <span className="text-xs text-gray-300">•</span>
            <span className="text-sm font-semibold text-gray-700">{toolName}</span>
          </div>
        </div>
        
        {/* Tool Icon */}
        <Wrench className="h-4 w-4 text-blue-600 flex-shrink-0" />
      </button>
      
      {/* Expanded Content - Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50">
          {/* Tool Arguments */}
          {(part as any).args && (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-600 mb-1">Input:</div>
              <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                {JSON.stringify((part as any).args, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Tool Output */}
          {hasOutput && (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Output:</div>
              <div className="bg-white p-3 rounded border border-gray-200">
                <ToolOutputRenderer
                  output={part.output}
                  onCompanySelect={onCompanySelect}
                  onPersonSelect={onPersonSelect}
                  onEventSelect={onEventSelect}
                  onNewsSelect={onNewsSelect}
                />
              </div>
            </div>
          )}
          
          {/* Error Message */}
          {isError && (part as any).error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="text-xs font-medium text-red-700 mb-1">Error:</div>
              <div className="text-xs text-red-600">{(part as any).error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * UIMessageBubble - Renders a UIMessage with smooth streaming animation
 * Handles all UIMessage part types: text, reasoning, tool calls, files, etc.
 * Supports hierarchical rendering with agent role badges
 */
export function UIMessageBubble({
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
}: UIMessageBubbleProps) {
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
          const toolName = (part as ToolUIPart).toolName;
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
  // Tool results contain raw output with HTML markers, but when agent synthesizes a response,
  // the media info is in the final text in plain format
  const extractedMedia = useMemo(() => {
    if (isUser) return { youtubeVideos: [], secDocuments: [], webSources: [], profiles: [], images: [] };

    // Debug: Log all parts to see what we have
    console.log('[UIMessageBubble] Message parts:', message.parts.map(p => ({
      type: p.type,
      hasResult: !!(p as any).result,
      toolName: (p as any).toolName,
      resultPreview: typeof (p as any).result === 'string' ? (p as any).result.substring(0, 100) : undefined
    })));

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

    // Keep tool media and text media separate for better UX
    // Tool media = comprehensive results from search tools
    // Text media = what the agent chose to mention in the answer
    const separatedMedia = {
      toolMedia,
      textMedia,
    };

    console.log('[UIMessageBubble] Extracted media:', {
      toolResultCount: toolResultParts.length,
      fromToolResults: {
        youtubeCount: toolMedia.youtubeVideos.length,
        secCount: toolMedia.secDocuments.length,
        webSourceCount: toolMedia.webSources.length,
        profileCount: toolMedia.profiles.length,
        imageCount: toolMedia.images.length,
      },
      fromFinalText: {
        youtubeCount: textMedia.youtubeVideos.length,
        secCount: textMedia.secDocuments.length,
        webSourceCount: textMedia.webSources.length,
        profileCount: textMedia.profiles.length,
        imageCount: textMedia.images.length,
      },
    });

    return separatedMedia;
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

  // Clean text by removing media markers and document action markers (for display purposes)
  const cleanedText = useMemo(() => {
    let cleaned = removeMediaMarkersFromText(visibleText || '');
    cleaned = removeDocumentActionMarkers(cleaned);
    return cleaned;
  }, [visibleText]);

  return (
    <div className={cn(
      "flex gap-4 mb-6",
      isUser ? "justify-end" : "justify-start",
      isChild && "ml-0" // Child messages already have margin from parent container
    )}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shadow-md ring-2 ring-white",
            roleConfig
              ? `bg-gradient-to-br from-${roleConfig.color}-400 to-${roleConfig.color}-600`
              : "bg-gradient-to-br from-purple-500 to-blue-500"
          )}>
            <Bot className="h-5 w-5 text-white" />
          </div>
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        "flex flex-col gap-3 max-w-[80%]",
        isUser && "items-end"
      )}>
        {/* Agent Role Badge (for specialized agents) */}
        {roleConfig && !isUser && (
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
            "bg-gradient-to-r shadow-sm",
            roleConfig.color === 'purple' && "from-purple-100 to-purple-200 text-purple-700",
            roleConfig.color === 'blue' && "from-blue-100 to-blue-200 text-blue-700",
            roleConfig.color === 'pink' && "from-pink-100 to-pink-200 text-pink-700",
            roleConfig.color === 'green' && "from-green-100 to-green-200 text-green-700",
            roleConfig.color === 'cyan' && "from-cyan-100 to-cyan-200 text-cyan-700"
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

        {/* Thought Bubble - Only show for parent/coordinator reasoning */}
        {!isUser && !isChild && visibleReasoning && (
          <ThoughtBubble 
            thought={visibleReasoning}
            isStreaming={message.status === 'streaming'}
          />
        )}

        {/* NEW PRESENTATION LAYER: Polished media display FIRST */}
        {/* Show media for all assistant messages that have extracted media */}
        {/* This ensures videos, sources, etc. are always visible inline */}
        {!isUser && (
          <RichMediaSection media={extractedMedia} showCitations={true} />
        )}

        {/* Document Actions - Show created/updated documents */}
        {!isUser && extractedDocuments.length > 0 && (
          <DocumentActionGrid
            documents={extractedDocuments}
            title="Documents"
            onDocumentSelect={onDocumentSelect}
          />
        )}

        {/* Collapsible Agent Progress Section */}
        {/* Collapsed by default so final answer is visible first */}
        {/* User can expand to see detailed agent progress and tool executions */}
        {!isUser && (
          <CollapsibleAgentProgress
            toolParts={toolParts}
            reasoning={visibleReasoning}
            isStreaming={message.status === 'streaming'}
            defaultExpanded={false}
            onCompanySelect={onCompanySelect}
            onPersonSelect={onPersonSelect}
            onEventSelect={onEventSelect}
            onNewsSelect={onNewsSelect}
          />
        )}

        {/* Entity Selection Cards (rendered from tool outputs) */}
        {toolParts.map((part, idx) => {
          if (part.type !== 'tool-result') return null;

          return (
            <div key={idx}>
              <ToolOutputRenderer
                output={(part as any).result}
                onCompanySelect={onCompanySelect}
                onPersonSelect={onPersonSelect}
                onEventSelect={onEventSelect}
                onNewsSelect={onNewsSelect}
              />
            </div>
          );
        })}

        {/* 3. Files (images, etc.) - Supporting media */}
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
            <div key={idx} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              {isImage ? (
                <SafeImage
                  src={fileUrl}
                  alt={fileName}
                  className="max-w-full h-auto"
                />
              ) : isPDF ? (
                <div className="flex flex-col">
                  {/* PDF Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-white flex items-center gap-3 border-b border-gray-200">
                    <div className="p-2 rounded-lg bg-red-100 text-red-600">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {fileName}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">PDF Document</p>
                    </div>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Open ↗
                    </a>
                  </div>
                  {/* PDF Preview Embed */}
                  <div className="bg-gray-100 p-2">
                    <iframe
                      src={fileUrl}
                      className="w-full h-96 border-0 rounded"
                      title={fileName}
                    />
                  </div>
                </div>
              ) : isVideo ? (
                <div className="flex flex-col">
                  {/* Video Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-white flex items-center gap-3 border-b border-gray-200">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {fileName}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">Video File</p>
                    </div>
                  </div>
                  {/* Video Preview */}
                  <div className="bg-black">
                    <video
                      src={fileUrl}
                      controls
                      className="w-full max-h-96"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              ) : isAudio ? (
                <div className="flex flex-col">
                  {/* Audio Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-white flex items-center gap-3 border-b border-gray-200">
                    <div className="p-2 rounded-lg bg-green-100 text-green-600">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {fileName}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">Audio File</p>
                    </div>
                  </div>
                  {/* Audio Preview */}
                  <div className="p-4 bg-gray-50">
                    <audio
                      src={fileUrl}
                      controls
                      className="w-full"
                    >
                      Your browser does not support the audio tag.
                    </audio>
                  </div>
                </div>
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
                  <div className="text-xs text-gray-400 group-hover:text-blue-600 transition-colors">
                    →
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 4. Main text content - THE ANSWER (at bottom for natural reading flow) */}
        {/* Use cleanedText for assistant messages to remove media markers, visibleText for user messages */}
        {/* ALWAYS show answer section for assistant messages, even if streaming (show placeholder) */}
        {!isUser || (cleanedText || visibleText) ? (
          <div
            className={cn(
              "rounded-xl px-5 py-4 shadow-sm",
              isUser
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-800 border border-gray-200",
              message.status === 'streaming' && !isUser && "bg-gradient-to-br from-green-50 to-white border-green-200 animate-pulse",
              message.status === 'failed' && "bg-red-50 border-red-300"
            )}
            title={!isUser && message.status !== 'streaming' ? "Use the Copy button below to copy this message" : undefined}
          >
            {/* Show placeholder while streaming and no text yet */}
            {!isUser && message.status === 'streaming' && !cleanedText && !visibleText ? (
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Generating answer...</span>
              </div>
            ) : (
              <ReactMarkdown
                components={{
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';

                    // Special handling for Mermaid diagrams
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

                    // Regular code blocks
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
                        "px-1 py-0.5 rounded text-sm font-mono",
                        isUser ? "bg-blue-700" : "bg-gray-100"
                      )} {...props}>
                        {children}
                      </code>
                    );
                  },
                  p({ children }) {
                    return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
                  },
                  ul({ children }) {
                    return <ul className="list-disc ml-5 mb-3 space-y-1">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal ml-5 mb-3 space-y-1">{children}</ol>;
                  },
                  li({ children }) {
                    return <li className="leading-relaxed">{children}</li>;
                  },
                  h1({ children }) {
                    return <h1 className="text-2xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className="text-xl font-bold mb-2 mt-3 first:mt-0">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-lg font-semibold mb-2 mt-3 first:mt-0">{children}</h3>;
                  },
                  blockquote({ children }) {
                    return <blockquote className="border-l-4 border-gray-300 pl-4 italic my-3">{children}</blockquote>;
                  },
                  a({ href, children }) {
                    return <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>;
                  },
                }}
              >
                {isUser ? (visibleText || '...') : (cleanedText || visibleText || '...')}
              </ReactMarkdown>
            )}
          </div>
        ) : null}

        {/* Status indicator and actions */}
        <div className="flex items-center gap-2">
          {message.status === 'streaming' && (
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Streaming...
            </div>
          )}
          
          {/* Action buttons for completed messages */}
          {message.status !== 'streaming' && visibleText && (
            <div className="flex items-center gap-1">
              {/* Copy button */}
              <button
                onClick={() => { void handleCopy(); }}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                title="Copy response"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </button>

              {/* Regenerate button for assistant messages */}
              {!isUser && onRegenerateMessage && (
                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="text-xs text-gray-500 hover:text-gray-700 disabled:text-gray-400 flex items-center gap-1 transition-colors"
                  title="Regenerate response"
                >
                  <RefreshCw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                  <span className="text-xs">{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
                </button>
              )}

              {/* Delete button */}
              {onDeleteMessage && (
                showDeleteConfirm ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleDelete}
                      className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors px-2 py-1 bg-red-50 rounded"
                      title="Confirm delete"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="text-xs">Confirm</span>
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
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

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md ring-2 ring-white">
            <User className="h-5 w-5 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

