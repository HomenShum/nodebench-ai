import { useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  MarkerType,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AIChatPanelTurnDetails, type TurnDetails } from "./AIChatPanel.TurnDetails";
import { nodeTypes } from "../../features/chat/flow/nodeTypes";

interface FlowViewProps {
  // Display state
  activeTab: 'chat' | 'flow';
  flowReady: boolean;

  // Flow data
  nodes: Node[];
  edges: Edge[];

  // Flow handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  handleNodeClick: (event: React.MouseEvent, node: Node) => void;

  // Selection state
  selectedFlowNode: string | null;
  setSelectedFlowNode: (nodeId: string | null) => void;
  selectedTurnDetails: TurnDetails | null;
  setSelectedTurnDetails: React.Dispatch<React.SetStateAction<TurnDetails | null>>;
}

/**
 * Flow View Component
 * 
 * Displays the ReactFlow canvas with:
 * - Interactive node graph
 * - Background grid
 * - Zoom/pan controls
 * - Turn details overlay
 */
export function AIChatPanelFlowView({
  activeTab,
  flowReady,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  handleNodeClick,
  selectedFlowNode,
  setSelectedFlowNode,
  selectedTurnDetails,
  setSelectedTurnDetails,
}: FlowViewProps) {
  const reactFlowInstanceRef = useRef<any>(null);
  const flowContainerRef = useRef<HTMLDivElement | null>(null);

  // Only render when flow tab is active
  if (activeTab !== 'flow') {
    return null;
  }

  return (
    <div className="flex-1 p-3 overflow-hidden">
      <div 
        className="flow-canvas" 
        ref={flowContainerRef} 
        style={{ minHeight: 320, height: '100%', position: 'relative' }}
      >
        {flowReady ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onSelectionChange={(params) => {
              const first = params?.nodes && params.nodes.length > 0 ? params.nodes[0] : null;
              setSelectedFlowNode(first ? first.id : null);
            }}
            nodeTypes={nodeTypes}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance;
              // Ensure the initial view fits content
              setTimeout(() => instance.fitView({ padding: 0.2 }), 0);
            }}
            defaultEdgeOptions={{
              style: { strokeWidth: 2, stroke: '#94a3b8' },
              markerEnd: { type: MarkerType.ArrowClosed },
            }}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls position="bottom-right" />
          </ReactFlow>
        ) : (
          <div className="w-full h-[320px] flex items-center justify-center text-[var(--text-secondary)] text-xs border border-[var(--border-color)] rounded bg-[var(--bg-tertiary)]">
            Flow view will appear here
          </div>
        )}
        
        {/* Turn Details Overlay */}
        <AIChatPanelTurnDetails
          turnDetails={selectedTurnDetails}
          onClose={() => setSelectedTurnDetails(null)}
        />
      </div>
    </div>
  );
}

