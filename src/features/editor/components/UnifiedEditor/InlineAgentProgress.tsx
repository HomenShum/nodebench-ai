/**
 * InlineAgentProgress - Shows agent progress inline in the editor
 * Displays tool calls, reasoning, and delegation in a compact bubble
 */

import React, { useMemo } from 'react';
import { CheckCircle2, Clock, XCircle, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { UIMessage } from '@convex-dev/agent/react';

interface InlineAgentProgressProps {
  messages: UIMessage[];
  isStreaming: boolean;
  threadId: string | null;
  onViewInPanel?: () => void;
}

export function InlineAgentProgress({
  messages,
  isStreaming,
  threadId,
  onViewInPanel,
}: InlineAgentProgressProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  // Extract the latest assistant message
  const latestAssistant = useMemo(() => {
    const assistantMessages = messages.filter((msg) => msg.role === 'assistant');
    return assistantMessages[assistantMessages.length - 1];
  }, [messages]);

  if (!latestAssistant) {
    return (
      <div className="inline-agent-progress">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="h-4 w-4 animate-pulse" />
          <span>🤖 Thinking...</span>
          {onViewInPanel && threadId && (
            <button
              onClick={onViewInPanel}
              className="ml-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              View in Panel <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Extract tool calls and reasoning from parts
  const toolParts = latestAssistant.parts?.filter((p: any) =>
    p.type.startsWith('tool-')
  ) || [];

  const reasoningParts = latestAssistant.parts?.filter((p: any) =>
    p.type === 'reasoning'
  ) || [];

  const hasProgress = toolParts.length > 0 || reasoningParts.length > 0;

  if (!hasProgress && !isStreaming) {
    return null; // No progress to show
  }

  return (
    <div className="inline-agent-progress border border-gray-200 rounded-lg p-3 my-2 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span>🤖 Agent Progress</span>
          {isStreaming && <Clock className="h-4 w-4 animate-pulse text-blue-600" />}
        </button>

        {onViewInPanel && threadId && (
          <button
            onClick={onViewInPanel}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            View in Panel <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-2">
          {/* Reasoning */}
          {reasoningParts.length > 0 && (
            <div className="text-xs text-gray-600 italic">
              {reasoningParts.map((part: any, idx: number) => (
                <div key={idx}>{part.text}</div>
              ))}
            </div>
          )}

          {/* Tool Calls */}
          {toolParts.length > 0 && (
            <div className="space-y-1">
              {toolParts.map((part: any, idx: number) => {
                const isCall = part.type === 'tool-call';
                const isResult = part.type === 'tool-result';
                const isError = part.type === 'tool-error';

                let statusIcon;
                let statusColor;

                if (isResult) {
                  statusIcon = <CheckCircle2 className="h-3 w-3" />;
                  statusColor = 'text-green-600';
                } else if (isError) {
                  statusIcon = <XCircle className="h-3 w-3" />;
                  statusColor = 'text-red-600';
                } else {
                  statusIcon = <Clock className="h-3 w-3 animate-pulse" />;
                  statusColor = 'text-blue-600';
                }

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1 border border-gray-200"
                  >
                    <span className={statusColor}>{statusIcon}</span>
                    <span className="font-mono text-gray-700">
                      {part.toolName || 'Tool'}
                    </span>
                    {isResult && (
                      <span className="text-gray-500 truncate max-w-[200px]">
                        {typeof part.result === 'string'
                          ? part.result.substring(0, 50)
                          : 'Completed'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Status Message */}
          {isStreaming && (
            <div className="text-xs text-gray-500 italic">
              Agent is working...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

