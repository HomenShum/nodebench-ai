/**
 * EntityGraph — Force-directed entity relationship visualization.
 *
 * Pure SVG, no external dependencies. Simple force simulation
 * positions nodes on mount, then renders static layout.
 * Nodes are colored by entity type, edges show relationships.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────── */

export interface GraphNode {
  id: string;
  label: string;
  type: "company" | "person" | "fund" | "product" | "initiative" | "competitor" | "partner" | "market signal" | "comparable" | "customer" | "design partner";
  description?: string;
  isPrimary?: boolean;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
}

interface EntityGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (nodeId: string, label: string) => void;
  width?: number;
  height?: number;
}

/* ── Color map ─────────────────────────────────────────────────────── */

const TYPE_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  company:        { fill: "#3b82f6", stroke: "#2563eb", text: "#93c5fd" },
  competitor:     { fill: "#ef4444", stroke: "#dc2626", text: "#fca5a5" },
  person:         { fill: "#22c55e", stroke: "#16a34a", text: "#86efac" },
  fund:           { fill: "#a855f7", stroke: "#9333ea", text: "#d8b4fe" },
  product:        { fill: "#f97316", stroke: "#ea580c", text: "#fdba74" },
  initiative:     { fill: "#06b6d4", stroke: "#0891b2", text: "#67e8f9" },
  partner:        { fill: "#14b8a6", stroke: "#0d9488", text: "#5eead4" },
  customer:       { fill: "#eab308", stroke: "#ca8a04", text: "#fde047" },
  comparable:     { fill: "#6366f1", stroke: "#4f46e5", text: "#a5b4fc" },
  "market signal": { fill: "#ec4899", stroke: "#db2777", text: "#f9a8d4" },
  "design partner": { fill: "#14b8a6", stroke: "#0d9488", text: "#5eead4" },
};

function getNodeColors(type: string) {
  return TYPE_COLORS[type] ?? TYPE_COLORS.company;
}

/* ── Force simulation ──────────────────────────────────────────────── */

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function runForceSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  iterations = 120,
): SimNode[] {
  const cx = width / 2;
  const cy = height / 2;

  // Initialize positions in a circle
  const simNodes: SimNode[] = nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const r = Math.min(width, height) * 0.3;
    return {
      ...n,
      x: n.isPrimary ? cx : cx + r * Math.cos(angle),
      y: n.isPrimary ? cy : cy + r * Math.sin(angle),
      vx: 0,
      vy: 0,
    };
  });

  const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;
    const damping = 0.85;

    // Repulsion (all pairs)
    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        const a = simNodes[i];
        const b = simNodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (800 * alpha) / (dist * dist);
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        a.vx -= dx;
        a.vy -= dy;
        b.vx += dx;
        b.vy += dy;
      }
    }

    // Attraction (edges)
    for (const edge of edges) {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (dist - 120) * 0.02 * alpha;
      dx = (dx / dist) * force;
      dy = (dy / dist) * force;
      a.vx += dx;
      a.vy += dy;
      b.vx -= dx;
      b.vy -= dy;
    }

    // Gravity toward center
    for (const n of simNodes) {
      n.vx += (cx - n.x) * 0.005 * alpha;
      n.vy += (cy - n.y) * 0.005 * alpha;
    }

    // Apply velocity
    for (const n of simNodes) {
      if (n.isPrimary) {
        n.x = cx;
        n.y = cy;
        n.vx = 0;
        n.vy = 0;
        continue;
      }
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
      // Bounds
      n.x = Math.max(50, Math.min(width - 50, n.x));
      n.y = Math.max(50, Math.min(height - 50, n.y));
    }
  }

  return simNodes;
}

/* ── Main Component ────────────────────────────────────────────────── */

export const EntityGraph = memo(function EntityGraph({
  nodes,
  edges,
  onNodeClick,
  width = 700,
  height = 500,
}: EntityGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; type: string; desc?: string } | null>(null);

  const simNodes = useMemo(
    () => runForceSimulation(nodes, edges, width, height),
    [nodes, edges, width, height],
  );

  const nodeMap = useMemo(
    () => new Map(simNodes.map((n) => [n.id, n])),
    [simNodes],
  );

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-content-muted">
        <Search className="h-8 w-8 mb-3 opacity-40" />
        <p className="text-sm">Search for a company to see its relationship graph</p>
        <p className="text-xs mt-1">Competitors, investors, and partners will appear here</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-edge/40 bg-surface/50 overflow-hidden">
      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
        {Array.from(new Set(nodes.map((n) => n.type))).map((type) => {
          const colors = getNodeColors(type);
          return (
            <span key={type} className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm px-2 py-0.5 text-[10px]">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.fill }} />
              <span className="capitalize text-content-muted">{type}</span>
            </span>
          );
        })}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }}>
        {/* Edges */}
        {edges.map((e, i) => {
          const source = nodeMap.get(e.source);
          const target = nodeMap.get(e.target);
          if (!source || !target) return null;
          const isHovered = hoveredNode === e.source || hoveredNode === e.target;
          return (
            <g key={`edge-${i}`}>
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={isHovered ? "rgba(217,119,87,0.5)" : "rgba(255,255,255,0.08)"}
                strokeWidth={isHovered ? 2 : 1}
              />
              {/* Edge label */}
              <text
                x={(source.x + target.x) / 2}
                y={(source.y + target.y) / 2 - 4}
                textAnchor="middle"
                className="text-[8px] fill-content-muted/40 select-none pointer-events-none"
              >
                {e.relationship}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {simNodes.map((n) => {
          const colors = getNodeColors(n.type);
          const r = n.isPrimary ? 28 : 20;
          const isHovered = hoveredNode === n.id;
          return (
            <g
              key={n.id}
              className="cursor-pointer"
              onMouseEnter={() => {
                setHoveredNode(n.id);
                setTooltip({ x: n.x, y: n.y - r - 10, label: n.label, type: n.type, desc: n.description });
              }}
              onMouseLeave={() => {
                setHoveredNode(null);
                setTooltip(null);
              }}
              onClick={() => onNodeClick?.(n.id, n.label)}
            >
              {/* Glow ring for primary */}
              {n.isPrimary && (
                <circle cx={n.x} cy={n.y} r={r + 6} fill="none" stroke="#d97757" strokeWidth={2} opacity={0.3} />
              )}
              {/* Node circle */}
              <circle
                cx={n.x}
                cy={n.y}
                r={r}
                fill={isHovered ? colors.stroke : colors.fill}
                opacity={isHovered ? 1 : 0.8}
                stroke={n.isPrimary ? "#d97757" : colors.stroke}
                strokeWidth={n.isPrimary ? 2.5 : 1.5}
              />
              {/* Label */}
              <text
                x={n.x}
                y={n.y + r + 14}
                textAnchor="middle"
                className="text-[10px] font-medium select-none pointer-events-none"
                fill={isHovered ? "#e5e7eb" : "#9ca3af"}
              >
                {n.label.length > 16 ? n.label.slice(0, 14) + "..." : n.label}
              </text>
              {/* Type initial inside circle */}
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                className="text-[11px] font-bold select-none pointer-events-none"
                fill={colors.text}
              >
                {n.label.charAt(0).toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 rounded-lg border border-edge/40 bg-black/80 backdrop-blur-md px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${(tooltip.x / width) * 100}%`,
            top: `${(tooltip.y / height) * 100}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="font-medium text-content">{tooltip.label}</div>
          <div className="text-[10px] text-content-muted capitalize">{tooltip.type}</div>
          {tooltip.desc && <div className="mt-1 text-[10px] text-content-muted max-w-[200px]">{tooltip.desc}</div>}
        </div>
      )}
    </div>
  );
});

export default EntityGraph;
