/**
 * LiveThinking Component
 * 
 * Displays real-time thinking steps, tool calls, and sources during agent execution.
 * This is a lightweight component for FastAgentPanel to show streaming agent progress.
 */

import React from 'react';
import { Brain, Wrench, FileText, Loader2 } from 'lucide-react';
import type { ThinkingStep, ToolCall, Source } from './types';

interface LiveThinkingProps {
  thinkingSteps?: ThinkingStep[];
  toolCalls?: ToolCall[];
  sources?: Source[];
  isStreaming?: boolean;
}

export function LiveThinking({
  thinkingSteps = [],
  toolCalls = [],
  sources = [],
  isStreaming = false,
}: LiveThinkingProps) {
  const hasContent = thinkingSteps.length > 0 || toolCalls.length > 0 || sources.length > 0;

  if (!hasContent && !isStreaming) {
    return null;
  }

  return (
    <div className="live-thinking-container mt-3 space-y-2">
      {/* Thinking Steps */}
      {thinkingSteps.length > 0 && (
        <div className="thinking-steps space-y-1">
          {thinkingSteps.map((step, idx) => (
            <div
              key={idx}
              className="thinking-step flex items-start gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded px-2 py-1.5"
            >
              <Brain className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                {step.title && <div className="font-medium">{step.title}</div>}
                {step.content && <div className="opacity-80">{step.content}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tool Calls */}
      {toolCalls.length > 0 && (
        <div className="tool-calls space-y-1">
          {toolCalls.map((call, idx) => (
            <div
              key={idx}
              className="tool-call flex items-start gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded px-2 py-1.5"
            >
              <Wrench className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium">{call.name}</div>
                {call.status && (
                  <div className="opacity-80">
                    {call.status === 'running' && <span className="text-blue-500">Running...</span>}
                    {call.status === 'success' && <span className="text-green-500">Success</span>}
                    {call.status === 'error' && <span className="text-red-500">Error</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div className="sources space-y-1">
          {sources.map((source, idx) => (
            <div
              key={idx}
              className="source flex items-start gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded px-2 py-1.5"
            >
              <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium">{source.title || source.name}</div>
                {source.snippet && <div className="opacity-80 line-clamp-2">{source.snippet}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Streaming Indicator */}
      {isStreaming && (
        <div className="streaming-indicator flex items-center gap-2 text-xs text-[var(--text-secondary)] px-2 py-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}

