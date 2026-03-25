"use client";

/**
 * ToolGraph — Interactive force-directed graph of MCP tool relationships.
 *
 * Pure SVG, no D3 dependency. Nodes colored by domain (HSL hash), sized by
 * usage count, edges colored by type (nextTool/relatedTool/cooccurrence).
 * Glass card DNA styling, requestAnimationFrame physics simulation.
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from "react";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ToolGraphNode {
  id: string;
  domain: string;
  usageCount: number;
  lastUsed: string | null;
}

export interface ToolGraphEdge {
  source: string;
  target: string;
  type: "nextTool" | "relatedTool" | "cooccurrence";
  weight: number;
}

interface ToolGraphProps {
  nodes?: ToolGraphNode[];
  edges?: ToolGraphEdge[];
  stats?: {
    totalNodes: number;
    totalEdges: number;
    density: number;
    clusters: number;
  };
  width?: number;
  height?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const EDGE_COLORS: Record<ToolGraphEdge["type"], string> = {
  nextTool: "#d97757",
  relatedTool: "rgba(255,255,255,0.30)",
  cooccurrence: "#4ade80",
};

const EDGE_LABELS: Record<ToolGraphEdge["type"], string> = {
  nextTool: "Next Tool",
  relatedTool: "Related",
  cooccurrence: "Co-occurrence",
};

/** Deterministic HSL hue from domain string */
function domainHue(domain: string): number {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ((hash % 360) + 360) % 360;
}

function domainColor(domain: string): string {
  return `hsl(${domainHue(domain)}, 60%, 55%)`;
}

/** Clamp node radius: min 6, max 24, based on usageCount */
function nodeRadius(usageCount: number): number {
  return Math.max(6, Math.min(24, 6 + usageCount * 1.5));
}

// ═══════════════════════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════════════════════

function generateDemoData(): {
  nodes: ToolGraphNode[];
  edges: ToolGraphEdge[];
  stats: { totalNodes: number; totalEdges: number; density: number; clusters: number };
} {
  const domains = [
    "verification",
    "research",
    "founder",
    "progressive_discovery",
    "deep_sim",
    "session_memory",
    "web",
    "security",
  ];
  const demoNodes: ToolGraphNode[] = [];
  const demoEdges: ToolGraphEdge[] = [];
  const toolNames: string[] = [];

  const toolsByDomain: Record<string, string[]> = {
    verification: ["start_verification_cycle", "log_phase_findings", "log_gap", "resolve_gap"],
    research: ["web_search", "merge_research_results", "search_all_knowledge", "record_learning"],
    founder: ["founder_brief", "founder_daily_ops", "founder_local_synthesize", "get_daily_brief_summary"],
    progressive_discovery: ["discover_tools", "get_tool_quick_ref", "get_workflow_chain", "get_tool_graph"],
    deep_sim: ["run_deep_sim", "deep_sim_postmortem", "trajectory_score"],
    session_memory: ["save_session_note", "recall_session_notes", "get_session_timeline", "search_session_memory"],
    web: ["scrapling_crawl", "scrapling_extract", "scrapling_crawl_status"],
    security: ["run_security_audit", "check_dependencies", "scan_secrets"],
  };

  for (const [domain, tools] of Object.entries(toolsByDomain)) {
    for (const tool of tools) {
      toolNames.push(tool);
      demoNodes.push({
        id: tool,
        domain,
        usageCount: Math.floor(Math.random() * 12) + 1,
        lastUsed: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      });
    }
  }

  // Wire nextTool edges within domains
  for (const tools of Object.values(toolsByDomain)) {
    for (let i = 0; i < tools.length - 1; i++) {
      demoEdges.push({ source: tools[i], target: tools[i + 1], type: "nextTool", weight: 1.0 });
    }
  }

  // Wire relatedTool edges across domains
  const domainKeys = Object.keys(toolsByDomain);
  for (let d = 0; d < domainKeys.length - 1; d++) {
    const toolsA = toolsByDomain[domainKeys[d]];
    const toolsB = toolsByDomain[domainKeys[d + 1]];
    demoEdges.push({ source: toolsA[0], target: toolsB[0], type: "relatedTool", weight: 0.6 });
    if (toolsA.length > 1 && toolsB.length > 1) {
      demoEdges.push({ source: toolsA[1], target: toolsB[1], type: "relatedTool", weight: 0.5 });
    }
  }

  // Wire cooccurrence edges (random cross-domain)
  for (let i = 0; i < 20; i++) {
    const a = toolNames[Math.floor(Math.random() * toolNames.length)];
    const b = toolNames[Math.floor(Math.random() * toolNames.length)];
    if (a !== b) {
      demoEdges.push({ source: a, target: b, type: "cooccurrence", weight: 0.4 });
    }
  }

  return {
    nodes: demoNodes,
    edges: demoEdges,
    stats: {
      totalNodes: demoNodes.length,
      totalEdges: demoEdges.length,
      density: Math.round((demoEdges.length / (demoNodes.length * (demoNodes.length - 1))) * 1000) / 1000,
      clusters: domains.length,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PHYSICS SIMULATION
// ═══════════════════════════════════════════════════════════════════════════

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  domain: string;
  usageCount: number;
  lastUsed: string | null;
  radius: number;
}

function initSimNodes(
  nodes: ToolGraphNode[],
  width: number,
  height: number,
): SimNode[] {
  const cx = width / 2;
  const cy = height / 2;
  return nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const r = Math.min(width, height) * 0.3;
    return {
      id: n.id,
      x: cx + r * Math.cos(angle) + (Math.random() - 0.5) * 40,
      y: cy + r * Math.sin(angle) + (Math.random() - 0.5) * 40,
      vx: 0,
      vy: 0,
      domain: n.domain,
      usageCount: n.usageCount,
      lastUsed: n.lastUsed,
      radius: nodeRadius(n.usageCount),
    };
  });
}

function tickSimulation(
  simNodes: SimNode[],
  edges: ToolGraphEdge[],
  width: number,
  height: number,
): void {
  const nodeIdx = new Map<string, number>();
  for (let i = 0; i < simNodes.length; i++) nodeIdx.set(simNodes[i].id, i);

  const REPULSION = 1200;
  const SPRING = 0.005;
  const SPRING_LENGTH = 100;
  const DAMPING = 0.88;
  const CENTER_GRAVITY = 0.002;
  const cx = width / 2;
  const cy = height / 2;

  // Repulsion (Barnes-Hut would be better but N<=100 so O(N^2) is fine)
  for (let i = 0; i < simNodes.length; i++) {
    for (let j = i + 1; j < simNodes.length; j++) {
      const a = simNodes[i];
      const b = simNodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) dist = 1;
      const force = REPULSION / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }
  }

  // Spring attraction along edges
  for (const e of edges) {
    const ai = nodeIdx.get(e.source);
    const bi = nodeIdx.get(e.target);
    if (ai === undefined || bi === undefined) continue;
    const a = simNodes[ai];
    const b = simNodes[bi];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) continue;
    const displacement = dist - SPRING_LENGTH;
    const force = SPRING * displacement * e.weight;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  }

  // Center gravity + velocity integration + boundary clamping
  for (const node of simNodes) {
    node.vx += (cx - node.x) * CENTER_GRAVITY;
    node.vy += (cy - node.y) * CENTER_GRAVITY;
    node.vx *= DAMPING;
    node.vy *= DAMPING;
    node.x += node.vx;
    node.y += node.vy;
    // Boundary clamping with padding
    const pad = node.radius + 4;
    if (node.x < pad) node.x = pad;
    if (node.x > width - pad) node.x = width - pad;
    if (node.y < pad) node.y = pad;
    if (node.y > height - pad) node.y = height - pad;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function ToolGraphInner({
  nodes: propNodes,
  edges: propEdges,
  stats: propStats,
  width = 800,
  height = 500,
}: ToolGraphProps) {
  const demo = useMemo(() => {
    if (propNodes && propNodes.length > 0) return null;
    return generateDemoData();
  }, [propNodes]);

  const nodes = propNodes && propNodes.length > 0 ? propNodes : demo!.nodes;
  const edges = propEdges && propEdges.length > 0 ? propEdges : demo!.edges;
  const stats = propStats ?? demo!.stats;

  const simRef = useRef<SimNode[]>([]);
  const frameRef = useRef<number>(0);
  const iterRef = useRef(0);
  const [, forceRender] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Init simulation nodes
  useEffect(() => {
    simRef.current = initSimNodes(nodes, width, height);
    iterRef.current = 0;
  }, [nodes, width, height]);

  // Animation loop
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      if (iterRef.current < 300) {
        tickSimulation(simRef.current, edges, width, height);
        iterRef.current++;
        forceRender((c) => c + 1);
      }
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, [edges, width, height]);

  // Node index for edge lookups
  const nodeIdx = useMemo(() => {
    const map = new Map<string, number>();
    simRef.current.forEach((n, i) => map.set(n.id, i));
    return map;
  }, [simRef.current.length]);

  // Connected edges/nodes for highlight
  const connectedNodes = useMemo(() => {
    const target = selectedNode ?? hoveredNode;
    if (!target) return new Set<string>();
    const connected = new Set<string>([target]);
    for (const e of edges) {
      if (e.source === target) connected.add(e.target);
      if (e.target === target) connected.add(e.source);
    }
    return connected;
  }, [selectedNode, hoveredNode, edges]);

  const activeHighlight = selectedNode ?? hoveredNode;

  // Drag handlers
  const handleMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.preventDefault();
      setDragNode(nodeId);
      setSelectedNode((prev) => (prev === nodeId ? null : nodeId));
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragNode || !svgRef.current) return;
      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const idx = simRef.current.findIndex((n) => n.id === dragNode);
      if (idx >= 0) {
        simRef.current[idx].x = x;
        simRef.current[idx].y = y;
        simRef.current[idx].vx = 0;
        simRef.current[idx].vy = 0;
        // Re-enable simulation for a bit
        if (iterRef.current >= 300) iterRef.current = 280;
        forceRender((c) => c + 1);
      }
    },
    [dragNode],
  );

  const handleMouseUp = useCallback(() => {
    setDragNode(null);
  }, []);

  // Tooltip node
  const tooltipNode = useMemo(() => {
    const target = hoveredNode ?? selectedNode;
    if (!target) return null;
    return simRef.current.find((n) => n.id === target) ?? null;
  }, [hoveredNode, selectedNode, simRef.current]);

  return (
    <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] backdrop-blur-md p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/50 font-medium">
          Tool Discovery Graph
        </h3>
        {selectedNode && (
          <button
            onClick={() => setSelectedNode(null)}
            className="text-[10px] text-white/40 hover:text-white/70 transition-colors"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 mb-3 text-[10px] text-white/40 font-mono">
        <span>
          Nodes{" "}
          <span className="text-white/70">{stats.totalNodes}</span>
        </span>
        <span>
          Edges{" "}
          <span className="text-white/70">{stats.totalEdges}</span>
        </span>
        <span>
          Density{" "}
          <span className="text-white/70">{stats.density.toFixed(3)}</span>
        </span>
        <span>
          Clusters{" "}
          <span className="text-white/70">{stats.clusters}</span>
        </span>
      </div>

      {/* SVG Canvas */}
      <div className="rounded-lg border border-white/[0.06] bg-black/30 overflow-hidden relative">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="w-full"
          style={{ maxHeight: height }}
          viewBox={`0 0 ${width} ${height}`}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Edges */}
          {edges.map((e, i) => {
            const ai = nodeIdx.get(e.source);
            const bi = nodeIdx.get(e.target);
            if (ai === undefined || bi === undefined) return null;
            const a = simRef.current[ai];
            const b = simRef.current[bi];
            if (!a || !b) return null;

            const isHighlighted =
              activeHighlight != null &&
              (e.source === activeHighlight || e.target === activeHighlight);
            const isDimmed = activeHighlight != null && !isHighlighted;

            return (
              <line
                key={`e-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={EDGE_COLORS[e.type]}
                strokeWidth={Math.max(0.5, e.weight * 2)}
                strokeOpacity={isDimmed ? 0.06 : isHighlighted ? 0.9 : 0.25}
              />
            );
          })}

          {/* Nodes */}
          {simRef.current.map((node) => {
            const isDimmed =
              activeHighlight != null && !connectedNodes.has(node.id);
            const isActive = node.id === activeHighlight;

            return (
              <g key={node.id}>
                {/* Glow ring on active */}
                {isActive && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius + 4}
                    fill="none"
                    stroke={domainColor(node.domain)}
                    strokeWidth={2}
                    strokeOpacity={0.5}
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius}
                  fill={domainColor(node.domain)}
                  fillOpacity={isDimmed ? 0.15 : 0.85}
                  stroke={domainColor(node.domain)}
                  strokeWidth={1}
                  strokeOpacity={isDimmed ? 0.1 : 0.4}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onMouseDown={(e) => handleMouseDown(node.id, e)}
                />
                {/* Label for larger or active nodes */}
                {(node.radius > 12 || isActive) && (
                  <text
                    x={node.x}
                    y={node.y + node.radius + 12}
                    textAnchor="middle"
                    fill="white"
                    fillOpacity={isDimmed ? 0.1 : 0.6}
                    fontSize={9}
                    fontFamily="JetBrains Mono, monospace"
                    pointerEvents="none"
                  >
                    {node.id.length > 20
                      ? node.id.slice(0, 18) + "..."
                      : node.id}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltipNode && (
          <div
            className="absolute pointer-events-none rounded-lg border border-white/[0.15] bg-black/80 backdrop-blur-md px-3 py-2 text-[11px] text-white/80 shadow-xl"
            style={{
              left: Math.min(tooltipNode.x + 16, width - 200),
              top: Math.max(tooltipNode.y - 60, 8),
              maxWidth: 220,
            }}
          >
            <div className="font-mono text-white/90 font-semibold mb-1 truncate">
              {tooltipNode.id}
            </div>
            <div className="flex gap-2 text-[10px] text-white/50">
              <span
                className="inline-block w-2 h-2 rounded-full mt-0.5 flex-shrink-0"
                style={{ backgroundColor: domainColor(tooltipNode.domain) }}
              />
              <span>{tooltipNode.domain}</span>
            </div>
            <div className="text-[10px] text-white/40 mt-1">
              Usage: {tooltipNode.usageCount} calls
            </div>
            {tooltipNode.lastUsed && (
              <div className="text-[10px] text-white/30">
                Last:{" "}
                {new Date(tooltipNode.lastUsed).toLocaleDateString()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-[10px] text-white/40">
        {(Object.keys(EDGE_COLORS) as ToolGraphEdge["type"][]).map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="inline-block w-4 h-[2px] rounded-full"
              style={{ backgroundColor: EDGE_COLORS[type] }}
            />
            <span>{EDGE_LABELS[type]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ToolGraph = memo(ToolGraphInner);
export default ToolGraph;
