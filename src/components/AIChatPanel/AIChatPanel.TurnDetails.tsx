import React from 'react';
import { X, Brain, Wrench, FileText } from 'lucide-react';

interface ThinkingStep {
  type: string;
  content: string;
}

interface ToolCall {
  toolName: string;
  reasoning: string;
  success: boolean;
}

interface Artifact {
  title: string;
  type: string;
}

export interface TurnDetails {
  thinkingSteps?: ThinkingStep[];
  toolCalls?: ToolCall[];
  artifacts?: Artifact[];
  documentCreated?: { title?: string };
}

interface TurnDetailsProps {
  turnDetails: TurnDetails | null;
  onClose: () => void;
}

export const AIChatPanelTurnDetails: React.FC<TurnDetailsProps> = ({
  turnDetails,
  onClose,
}) => {
  if (!turnDetails) return null;

  return (
    <div className="absolute top-4 right-4 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-medium text-sm">Turn Details</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Thinking Steps */}
        {turnDetails.thinkingSteps && turnDetails.thinkingSteps.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Brain className="h-3 w-3" />
              Thinking Steps ({turnDetails.thinkingSteps.length})
            </h4>
            <div className="space-y-2">
              {turnDetails.thinkingSteps.map((step, index) => (
                <div key={index} className="p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                  <div className="font-medium text-purple-700">{step.type}</div>
                  <p className="text-gray-700 mt-1">{step.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tool Calls */}
        {turnDetails.toolCalls && turnDetails.toolCalls.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              Tool Calls ({turnDetails.toolCalls.length})
            </h4>
            <div className="space-y-2">
              {turnDetails.toolCalls.map((tool, index) => (
                <div key={index} className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                  <div className="font-medium text-blue-700">{tool.toolName}</div>
                  <p className="text-gray-700 mt-1">{tool.reasoning}</p>
                  {tool.success ? (
                    <div className="text-green-600 text-xs mt-1">✅ Success</div>
                  ) : (
                    <div className="text-red-600 text-xs mt-1">❌ Failed</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Artifacts */}
        {turnDetails.artifacts && turnDetails.artifacts.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Artifacts ({turnDetails.artifacts.length})
            </h4>
            <div className="space-y-2">
              {turnDetails.artifacts.map((artifact, index) => (
                <div key={index} className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                  <div className="font-medium text-green-700">{artifact.title}</div>
                  <div className="text-gray-600">{artifact.type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document Created */}
        {turnDetails.documentCreated && (
          <div className="p-2 bg-indigo-50 border border-indigo-200 rounded text-xs">
            <div className="font-medium text-indigo-700 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Document Created
            </div>
            <div className="text-gray-700 mt-1">
              {turnDetails.documentCreated.title || 'Untitled Document'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

