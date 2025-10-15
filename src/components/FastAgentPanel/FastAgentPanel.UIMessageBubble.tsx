// src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx
// Message bubble component optimized for UIMessage format from Agent component

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Bot, Wrench, Image as ImageIcon } from 'lucide-react';
import { useSmoothText, type UIMessage } from '@convex-dev/agent/react';
import { cn } from '@/lib/utils';
import type { FileUIPart, ToolUIPart } from 'ai';

interface UIMessageBubbleProps {
  message: UIMessage;
}

/**
 * Helper to extract and render images from tool output text
 */
function ToolOutputRenderer({ output }: { output: unknown }) {
  const outputText = typeof output === 'string' ? output : JSON.stringify(output, null, 2);

  // Extract image URLs from the output (format: "1. https://example.com/image.jpg")
  const imageUrlRegex = /^\d+\.\s+(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg))/gim;
  const imageMatches = outputText.matchAll(imageUrlRegex);
  const imageUrls = Array.from(imageMatches).map(match => match[1]);

  // Split output into sections
  const sections = outputText.split(/\n\n(?=Images:|Sources:)/);

  return (
    <div className="text-xs text-gray-600 mt-1 space-y-2">
      {sections.map((section, idx) => {
        // Check if this is the Images section
        if (section.startsWith('Images:')) {
          return (
            <div key={idx}>
              <div className="font-medium text-gray-700 mb-2">Images:</div>
              <div className="grid grid-cols-2 gap-2">
                {imageUrls.map((url, imgIdx) => (
                  <div key={imgIdx} className="rounded overflow-hidden border border-gray-200">
                    <img
                      src={url}
                      alt={`Search result ${imgIdx + 1}`}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // Fallback if image fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // Regular text section
        return (
          <pre key={idx} className="whitespace-pre-wrap font-mono text-xs">
            {section}
          </pre>
        );
      })}
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
                <img
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
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
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

