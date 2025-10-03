import { useState } from 'react';
import React from 'react';

// Re-export components from AIChatPanel directory
export { AIChatPanelInput as Input } from '../../components/AIChatPanel/AIChatPanel.Input';
export { AIChatPanelMessages as Messages } from '../../components/AIChatPanel/AIChatPanel.Messages';
export { ContextPill } from '../../components/AIChatPanel/AIChatPanel.ContextPill';

// Thinking mode hook - persists state to localStorage
export function useThinkingMode() {
  const [thinkingMode, setThinkingModeState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('nb.thinkingMode');
      return stored === '1';
    } catch {
      return false;
    }
  });

  const setThinkingMode = (value: boolean) => {
    setThinkingModeState(value);
    try {
      localStorage.setItem('nb.thinkingMode', value ? '1' : '0');
    } catch {
      // Ignore storage errors
    }
  };

  return { thinkingMode, setThinkingMode };
}

// Expanded thinking hook - manages which messages have expanded thinking steps
export function useExpandedThinking() {
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set());

  const toggleThinking = (messageId: string) => {
    setExpandedThinking((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const resetThinking = () => {
    setExpandedThinking(new Set());
  };

  return { expandedThinking, toggleThinking, resetThinking };
}

// Render a thinking step
export function renderThinkingStep(step: any, index: number): React.ReactNode {
  const getStepIcon = (type: string) => {
    switch (type) {
      case 'thinking':
        return '🧠';
      case 'tool_call':
        return '🔧';
      case 'result':
        return '✅';
      default:
        return '📝';
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'thinking':
        return 'bg-purple-50 border-purple-200 text-purple-900';
      case 'tool_call':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'result':
        return 'bg-green-50 border-green-200 text-green-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  return (
    <div
      key={index}
      className={`p-2 rounded border text-xs ${getStepColor(step.type)}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-base">{getStepIcon(step.type)}</span>
        <div className="flex-1">
          <div className="font-medium capitalize">{step.type.replace('_', ' ')}</div>
          <div className="mt-1 whitespace-pre-wrap">{step.content}</div>
          {step.toolCall && (
            <div className="mt-2 p-2 bg-white/50 rounded text-[10px] font-mono">
              <div><strong>Tool:</strong> {step.toolCall.name}</div>
              {step.toolCall.args && (
                <div className="mt-1">
                  <strong>Args:</strong>
                  <pre className="mt-1 overflow-auto">{JSON.stringify(step.toolCall.args, null, 2)}</pre>
                </div>
              )}
              {step.toolCall.result && (
                <div className="mt-1">
                  <strong>Result:</strong>
                  <pre className="mt-1 overflow-auto">{JSON.stringify(step.toolCall.result, null, 2)}</pre>
                </div>
              )}
              {step.toolCall.error && (
                <div className="mt-1 text-red-600">
                  <strong>Error:</strong> {step.toolCall.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

