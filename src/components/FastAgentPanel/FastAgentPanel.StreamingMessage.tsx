// StreamingMessage component for FastAgentPanel
// Uses @convex-dev/persistent-text-streaming for real-time streaming

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useStream } from "@convex-dev/persistent-text-streaming/react";
import { StreamId } from "@convex-dev/persistent-text-streaming";
import { api } from "../../../convex/_generated/api";
import type { Message } from './types';

interface StreamingMessageProps {
  message: Message;
}

/**
 * StreamingMessage - Displays a message with real-time streaming support
 *
 * For messages with a streamId and isStreaming=true, this component
 * automatically subscribes to the stream and displays content as it arrives.
 */
export function StreamingMessage({ message }: StreamingMessageProps) {
  // Get Convex site URL for HTTP actions
  // Convert .convex.cloud to .convex.site for HTTP endpoints
  const convexApiUrl = import.meta.env.VITE_CONVEX_URL;
  const convexSiteUrl = convexApiUrl?.replace('.convex.cloud', '.convex.site') || window.location.origin;

  // Drive the stream when message is actively streaming
  const streamId = message.streamId as StreamId | undefined;
  const isDriven = Boolean(
    streamId && (message.status === 'streaming' || message.isStreaming === true)
  );

  const { text, status } = useStream(
    api.fastAgentPanelStreaming.getStreamBody,
    new URL(`${convexSiteUrl}/api/chat-stream`),
    isDriven,
    streamId
  );

  // Prefer streamed text when available; fall back to persisted message content
  const displayText = (text && text.length > 0) ? text : (message.content || "");
  const isActive = status === "streaming" || message.status === 'streaming';

  return (
    <div className="whitespace-pre-wrap break-words">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
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
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {displayText}
      </ReactMarkdown>
      {isActive && (
        <span className="inline-block w-2 h-5 bg-current opacity-75 animate-pulse ml-1" />
      )}
    </div>
  );
}
