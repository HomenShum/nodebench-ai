// src/components/FastAgentPanel/MermaidDiagram.tsx
// Renders Mermaid diagrams from code blocks

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Code2, Image as ImageIcon, Copy, Check } from 'lucide-react';

interface MermaidDiagramProps {
  code: string;
  id?: string;
}

// Initialize mermaid once
let mermaidInitialized = false;

export function MermaidDiagram({ code, id }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Initialize mermaid if not already done
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14,
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
        },
      });
      mermaidInitialized = true;
    }

    const renderDiagram = async () => {
      try {
        // Generate unique ID for this diagram
        const diagramId = id || `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        
        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(diagramId, code);
        setSvg(renderedSvg);
        setError('');
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      }
    };

    void renderDiagram();
  }, [code, id]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  if (error) {
    return (
      <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-sm font-medium text-red-800 mb-1">
          Failed to render Mermaid diagram
        </div>
        <div className="text-xs text-red-600 font-mono">
          {error}
        </div>
        <details className="mt-2">
          <summary className="text-xs text-red-700 cursor-pointer hover:underline">
            View code
          </summary>
          <pre className="mt-2 text-xs bg-white p-2 rounded border border-red-200 overflow-x-auto">
            {code}
          </pre>
        </details>
      </div>
    );
  }

  if (!svg && !error) {
    return (
      <div className="my-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
          <span>Rendering diagram...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header with toggle buttons */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="text-xs font-medium text-gray-600 flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            Mermaid Diagram
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Toggle buttons */}
          <button
            onClick={() => setShowCode(false)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              !showCode
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Show diagram"
          >
            <ImageIcon className="h-3 w-3" />
          </button>
          
          <button
            onClick={() => setShowCode(true)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              showCode
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Show code"
          >
            <Code2 className="h-3 w-3" />
          </button>
          
          {/* Copy button */}
          <button
            onClick={handleCopyCode}
            className="px-2 py-1 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors ml-1"
            title="Copy code"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {showCode ? (
          /* Code view */
          <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto font-mono">
            <code>{code}</code>
          </pre>
        ) : (
          /* Diagram view */
          <div
            ref={containerRef}
            className="overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
    </div>
  );
}
