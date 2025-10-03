import React, { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

/**
 * Visual LLM Validation Panel
 * 
 * UI for running and viewing Visual LLM validation workflows.
 * Compares GPT-5-mini vs Gemini 2.0 Flash for VR avatar quality assessment.
 */

interface VisualLLMPanelProps {
  className?: string;
}

export function VisualLLMPanel({ className = "" }: VisualLLMPanelProps) {
  const [timelineId, setTimelineId] = useState<Id<"agentTimelines"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("VR avatars virtual reality characters 3D full-body");
  const [imageCount, setImageCount] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const createTimeline = useMutation(api.agentTimelines.createTimeline);
  const runValidation = useAction(api.agents.visualLLMValidation.runVisualLLMValidation);
  const timeline = useQuery(
    api.agentTimelines.getTimeline,
    timelineId ? { timelineId } : "skip"
  );

  const handleRun = async () => {
    try {
      setIsRunning(true);
      setResults(null);

      // Create timeline
      const newTimelineId = await createTimeline({
        name: "Visual LLM Validation",
        description: "GPT-5-mini vs Gemini 2.0 Flash comparison",
        baseStartMs: Date.now(),
      });

      setTimelineId(newTimelineId);

      // Run validation
      const result = await runValidation({
        timelineId: newTimelineId,
        searchQuery,
        imageCount,
      });

      setResults(result);
    } catch (error) {
      console.error("Error running validation:", error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={`visual-llm-panel ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Visual LLM Validation</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Compare GPT-5-mini vs Gemini 2.0 Flash for VR avatar quality assessment
        </p>
      </div>

      {/* Configuration */}
      <div className="mb-6 p-4 bg-[var(--bg-secondary)] rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Configuration</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Search Query
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="VR avatars virtual reality characters..."
            disabled={isRunning}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Number of Images
          </label>
          <input
            type="number"
            value={imageCount}
            onChange={(e) => setImageCount(parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded-md"
            min={1}
            max={20}
            disabled={isRunning}
          />
        </div>

        <button
          onClick={handleRun}
          disabled={isRunning}
          className="w-full px-4 py-2 bg-[var(--accent-primary)] text-white rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {isRunning ? "Running..." : "Run Validation"}
        </button>
      </div>

      {/* Timeline Status */}
      {timeline && (
        <div className="mb-6 p-4 bg-[var(--bg-secondary)] rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Timeline Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Name:</span>
              <span className="text-sm font-medium">{timeline.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Status:</span>
              <span className="text-sm font-medium capitalize">{timeline.status || "running"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Created:</span>
              <span className="text-sm font-medium">
                {new Date(timeline.baseStartMs).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Results</h3>
          
          {/* Summary */}
          <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
            <div className="flex items-start gap-3">
              <div className={`mt-1 w-3 h-3 rounded-full ${results.success ? 'bg-green-500' : 'bg-red-500'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">
                  {results.success ? "✓ Validation Complete" : "✗ Validation Failed"}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {results.result}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Outputs */}
          {results.outputs && (
            <div className="space-y-4">
              {/* Model Comparison */}
              {results.outputs.modelComparison && (
                <ResultSection
                  title="Model Comparison"
                  data={JSON.parse(results.outputs.modelComparison)}
                  renderContent={(data) => (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-semibold text-green-800">
                          Best Model: {data.overallBestModel}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        {data.modelRankings.map((model: any, idx: number) => (
                          <div key={idx} className="p-3 border rounded">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">{model.modelName}</span>
                              <span className="text-sm bg-blue-100 px-2 py-1 rounded">
                                Score: {model.overallScore}/10
                              </span>
                            </div>
                            <div className="text-sm space-y-1">
                              <div>
                                <span className="text-green-600">✓ Strengths:</span>{" "}
                                {model.strengths.join(", ")}
                              </div>
                              <div>
                                <span className="text-orange-600">⚠ Weaknesses:</span>{" "}
                                {model.weaknesses.join(", ")}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm font-semibold mb-2">Task-Specific Recommendations:</p>
                        <ul className="text-sm space-y-1">
                          <li>• Redline Detection: {data.taskSpecificRecommendations.redlineDetection}</li>
                          <li>• Movement Assessment: {data.taskSpecificRecommendations.movementAssessment}</li>
                          <li>• Emotional Comfort: {data.taskSpecificRecommendations.emotionalComfort}</li>
                        </ul>
                      </div>

                      <div className="p-3 bg-gray-50 border rounded">
                        <p className="text-sm">
                          <span className="font-semibold">Usage Guidelines:</span> {data.usageGuidelines}
                        </p>
                        <p className="text-sm mt-2">
                          <span className="font-semibold">Cost-Effectiveness:</span> {data.costEffectiveness}
                        </p>
                      </div>
                    </div>
                  )}
                />
              )}

              {/* Statistical Analysis */}
              {results.outputs.statisticalAnalysis && (
                <ResultSection
                  title="Statistical Analysis"
                  data={JSON.parse(results.outputs.statisticalAnalysis)}
                  renderContent={(data) => (
                    <div className="space-y-3">
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                        <p className="text-sm font-semibold mb-2">Inter-Model Agreement:</p>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>Movement: {(data.agreement.movementMotion * 100).toFixed(0)}%</div>
                          <div>Visual: {(data.agreement.visualQuality * 100).toFixed(0)}%</div>
                          <div>Comfort: {(data.agreement.emotionalComfort * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(data.averages).map(([model, stats]: [string, any]) => (
                          <div key={model} className="p-3 border rounded">
                            <p className="text-sm font-semibold mb-2">{model}</p>
                            <div className="text-xs space-y-1">
                              <div>Movement: {stats.movementMotion.toFixed(1)}/5</div>
                              <div>Visual: {stats.visualQuality.toFixed(1)}/5</div>
                              <div>Comfort: {stats.emotionalComfort.toFixed(1)}/5</div>
                              <div>Confidence: {(stats.confidence * 100).toFixed(0)}%</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-sm text-[var(--text-secondary)] italic">
                        {data.summary}
                      </p>
                    </div>
                  )}
                />
              )}

              {/* Enhanced Prompts */}
              {results.outputs.enhancedPrompts && (
                <ResultSection
                  title="Enhanced Prompts"
                  data={JSON.parse(results.outputs.enhancedPrompts)}
                  renderContent={(data) => (
                    <div className="space-y-3">
                      {Object.entries(data).map(([model, prompt]: [string, any]) => (
                        <div key={model} className="p-3 border rounded">
                          <p className="text-sm font-semibold mb-2">{model}</p>
                          <p className="text-sm text-[var(--text-secondary)]">{prompt}</p>
                        </div>
                      ))}
                    </div>
                  )}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ResultSectionProps {
  title: string;
  data: any;
  renderContent: (data: any) => React.ReactNode;
}

function ResultSection({ title, data, renderContent }: ResultSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] flex justify-between items-center"
      >
        <span className="font-semibold">{title}</span>
        <span className="text-sm">{isExpanded ? "▼" : "▶"}</span>
      </button>
      {isExpanded && (
        <div className="p-4 bg-white">
          {renderContent(data)}
        </div>
      )}
    </div>
  );
}

