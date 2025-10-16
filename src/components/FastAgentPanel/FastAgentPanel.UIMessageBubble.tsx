// src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx
// Message bubble component optimized for UIMessage format from Agent component

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Bot, Wrench, Image as ImageIcon, AlertCircle, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useSmoothText, type UIMessage } from '@convex-dev/agent/react';
import { cn } from '@/lib/utils';
import type { FileUIPart, ToolUIPart } from 'ai';
import { YouTubeGallery, SECDocumentGallery, type YouTubeVideo, type SECDocument } from './MediaGallery';
import { MermaidDiagram } from './MermaidDiagram';
import { FileViewer, type FileViewerFile } from './FileViewer';

interface UIMessageBubbleProps {
  message: UIMessage;
  onMermaidRetry?: (error: string, code: string) => void;
  onRegenerateMessage?: () => void;
  onDeleteMessage?: () => void;
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
function ToolOutputRenderer({ output }: { output: unknown }) {
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

  // Remove gallery data markers from content
  let cleanedContent = outputText
    .replace(/<!-- YOUTUBE_GALLERY_DATA\n[\s\S]*?\n-->\n*/g, '')
    .replace(/<!-- SEC_GALLERY_DATA\n[\s\S]*?\n-->\n*/g, '');

  // Split content to separate images section from rest
  const parts = cleanedContent.split(/## Images\s*\n*/);
  const beforeImages = parts[0];
  const afterImages = parts[1]?.split(/##/);
  const restOfContent = afterImages ? '##' + afterImages.slice(1).join('##') : '';

  return (
    <div className="text-xs text-gray-600 mt-1 space-y-2">
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

// Agent role icons and labels
const agentRoleConfig = {
  coordinator: { icon: '🎯', label: 'Coordinator', color: 'purple' },
  documentAgent: { icon: '📄', label: 'Document Agent', color: 'blue' },
  mediaAgent: { icon: '🎥', label: 'Media Agent', color: 'pink' },
  secAgent: { icon: '📊', label: 'SEC Agent', color: 'green' },
  webAgent: { icon: '🌐', label: 'Web Agent', color: 'cyan' },
};

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
  isParent,
  isChild,
  agentRole,
}: UIMessageBubbleProps) {
  const isUser = message.role === 'user';
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isUser ? "justify-end" : "justify-start",
      isChild && "ml-0" // Child messages already have margin from parent container
    )}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            roleConfig
              ? `bg-gradient-to-br from-${roleConfig.color}-400 to-${roleConfig.color}-600`
              : "bg-gradient-to-br from-purple-500 to-blue-500"
          )}>
            <Bot className="h-4 w-4 text-white" />
          </div>
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        "flex flex-col gap-2 max-w-[80%]",
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

        {/* Reasoning (if any) */}
        {visibleReasoning && (
          <div className="text-xs text-gray-500 italic px-3 py-1 bg-gray-50 rounded-lg border border-gray-200">
            💭 {visibleReasoning}
          </div>
        )}

        {/* Tool Calls (if any) */}
        {toolParts.map((part, idx) => {
          const hasOutput = part.output !== undefined && part.output !== null;

          return (
            <div key={idx} className="text-sm px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-700 font-medium mb-1">
                <Wrench className="h-3 w-3" />
                {part.type.replace('tool-', '')}
              </div>
              {hasOutput && <ToolOutputRenderer output={part.output} />}
            </div>
          );
        })}

        {/* Files (images, etc.) */}
        {fileParts.map((part, idx) => {
          // FileUIPart has url and mimeType properties
          const fileUrl = (part as any).url || '';
          const mimeType = (part as any).mimeType || '';
          const fileName = (part as any).name || 'File';
          const isImage = mimeType.startsWith('image/');

          return (
            <div key={idx} className="rounded-lg overflow-hidden border border-gray-200">
              {isImage ? (
                <SafeImage
                  src={fileUrl}
                  alt={fileName}
                  className="max-w-full h-auto"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-gray-500" />
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {fileName}
                  </a>
                </div>
              )}
            </div>
          );
        })}

        {/* Main text content */}
        {visibleText && (
          <div className={cn(
            "rounded-lg px-4 py-2 shadow-sm whitespace-pre-wrap",
            isUser
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-800 border border-gray-200",
            message.status === 'streaming' && !isUser && "bg-green-50 border-green-200",
            message.status === 'failed' && "bg-red-50 border-red-200"
          )}>
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
                  return <p className="mb-2 last:mb-0">{children}</p>;
                },
                ul({ children }) {
                  return <ul className="list-disc list-inside mb-2">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal list-inside mb-2">{children}</ol>;
                },
              }}
            >
              {visibleText || '...'}
            </ReactMarkdown>
          </div>
        )}

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
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

