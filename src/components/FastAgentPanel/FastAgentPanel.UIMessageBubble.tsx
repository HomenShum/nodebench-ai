// src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx
// Message bubble component optimized for UIMessage format from Agent component

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Bot, Wrench, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import { useSmoothText, type UIMessage } from '@convex-dev/agent/react';
import { cn } from '@/lib/utils';
import type { FileUIPart, ToolUIPart } from 'ai';
import { MermaidDiagram } from './MermaidDiagram';

interface UIMessageBubbleProps {
  message: UIMessage;
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
 * Helper to render tool output with markdown support and gallery layout for images
 */
function ToolOutputRenderer({ output }: { output: unknown }) {
  const outputText = typeof output === 'string' ? output : JSON.stringify(output, null, 2);

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

  // Split content to separate images section from rest
  const parts = outputText.split(/## Images\s*\n*/);
  const beforeImages = parts[0];
  const afterImages = parts[1]?.split(/##/);
  const restOfContent = afterImages ? '##' + afterImages.slice(1).join('##') : '';

  return (
    <div className="text-xs text-gray-600 mt-1 space-y-2">
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
 * UIMessageBubble - Renders a UIMessage with smooth streaming animation
 * Handles all UIMessage part types: text, reasoning, tool calls, files, etc.
 */
export function UIMessageBubble({ message }: UIMessageBubbleProps) {
  const isUser = message.role === 'user';

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
      isUser ? "justify-end" : "justify-start"
    )}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        "flex flex-col gap-2 max-w-[80%]",
        isUser && "items-end"
      )}>
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
                    return (
                      <MermaidDiagram code={String(children).replace(/\n$/, '')} />
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

        {/* Status indicator */}
        {message.status === 'streaming' && (
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Streaming...
          </div>
        )}
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

